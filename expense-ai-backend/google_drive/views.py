import os
import json
import base64
import json as json_module
import tempfile
import uuid
from django.shortcuts import redirect
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.contrib.auth import get_user_model, login as auth_login
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import requests

from .models import GoogleDriveToken
from .utils import get_user_drive_credentials

# Only disable HTTPS check in local development
if settings.DEBUG:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

SCOPES = ['https://www.googleapis.com/auth/drive',
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
]

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8000')
N8N_AGENT_SECRET = os.environ.get('N8N_AGENT_SECRET', '')

OAUTH_REDIRECT_URI = os.environ.get(
    'OAUTH_REDIRECT_URI',
    f'{BACKEND_URL}/api/google/callback/'
)


def _is_n8n_request(request):
    """Check if the request is coming from n8n with the shared secret."""
    secret = (
        request.headers.get('X-Agent-Secret') or
        request.headers.get('X-N8N-Secret') or
        request.headers.get('X-n8n-secret')
    )
    return N8N_AGENT_SECRET and secret == N8N_AGENT_SECRET


def _get_n8n_credentials():
    """Get the first available stored Google Drive credentials for n8n use."""
    token = GoogleDriveToken.objects.first()
    if not token:
        return None
    from .utils import get_credentials_from_token
    return get_credentials_from_token(token)


def _get_client_secrets_file():
    creds_json = os.environ.get('GOOGLE_CREDENTIALS_JSON')
    if creds_json:
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(json.loads(creds_json), tmp)
        tmp.close()
        return tmp.name
    return settings.GOOGLE_CLIENT_SECRETS


def google_drive_auth(request):
    flow = Flow.from_client_secrets_file(
        _get_client_secrets_file(),
        scopes=SCOPES,
        redirect_uri=OAUTH_REDIRECT_URI,
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent',
    )
    # Store state only — no PKCE code_verifier
    request.session['google_oauth_state'] = state
    request.session.save()
    return redirect(authorization_url)


def _get_or_create_google_user(creds):
    id_token = creds.id_token
    if isinstance(id_token, str):
        try:
            payload_b64 = id_token.split('.')[1]
            payload_b64 += '=' * (4 - len(payload_b64) % 4)
            id_token = json_module.loads(base64.urlsafe_b64decode(payload_b64))
        except Exception as e:
            raise ValueError(f'Failed to decode id_token JWT: {e}')

    if not id_token or not isinstance(id_token, dict):
        raise ValueError(f'id_token missing or invalid after decode: {id_token}')

    email = id_token.get('email')
    if not email:
        raise ValueError('Email missing from id_token.')

    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()
    if user:
        return user

    base_username = (
        id_token.get('name')
        or email.split('@')[0]
        or f'user-{uuid.uuid4().hex[:8]}'
    )
    candidate = ''.join(ch if ch.isalnum() else '-' for ch in base_username.lower()).strip('-') or 'user'
    username = candidate
    suffix = 1
    while User.objects.filter(username=username).exists():
        suffix += 1
        username = f'{candidate}-{suffix}'

    import secrets
    user = User.objects.create_user(
        username=username,
        email=email,
        first_name=id_token.get('given_name', ''),
        last_name=id_token.get('family_name', ''),
        password=secrets.token_urlsafe(32),
    )
    return user

def oauth2callback(request):
    state = request.session.get('google_oauth_state') or request.GET.get('state')

    flow = Flow.from_client_secrets_file(
        _get_client_secrets_file(),
        scopes=SCOPES,
        redirect_uri=OAUTH_REDIRECT_URI,
        state=state,
        # NO code_verifier here — this was causing "Malformed auth code"
    )

    try:
        auth_response = request.build_absolute_uri()
        if not settings.DEBUG and auth_response.startswith('http://'):
            auth_response = 'https://' + auth_response[len('http://'):]
        flow.fetch_token(authorization_response=auth_response)
    except Exception as e:
        print(f"Token fetch failed: {e}")
        return redirect(f'{FRONTEND_URL}?error=auth_failed&reason={str(e)}')

    creds = flow.credentials

    try:
        user = request.user if request.user.is_authenticated else _get_or_create_google_user(creds)
        auth_login(request, user)
    except Exception as e:
        print(f"User creation/login failed: {e}")
        return redirect(f'{FRONTEND_URL}?error=user_failed&reason={str(e)}')

    try:
        token_defaults = {
            'access_token': creds.token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': ','.join(creds.scopes),
        }
        if creds.refresh_token:
            token_defaults['refresh_token'] = creds.refresh_token

        GoogleDriveToken.objects.update_or_create(
            user=user,
            defaults=token_defaults
        )
    except Exception as e:
        print(f"Token save failed: {e}")
        return redirect(f'{FRONTEND_URL}?error=token_save_failed')

    return redirect(f'{FRONTEND_URL}/drive?status=success')

def list_drive_files(request):
    # Allow n8n background worker to use stored credentials
    if _is_n8n_request(request):
        creds = _get_n8n_credentials()
        if not creds:
            return JsonResponse({'error': 'No stored Google credentials. A user must log in first.'}, status=401)
    else:
        creds = get_user_drive_credentials(request.user)
        if not creds:
            return JsonResponse({'error': 'Not authenticated'}, status=401)

    try:
        service = build('drive', 'v3', credentials=creds)

        def get_children(folder_id):
            results = service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="files(id, name, mimeType, size, modifiedTime, webViewLink)",
                pageSize=200,
                orderBy="folder,name"
            ).execute()
            items = results.get('files', [])
            for item in items:
                if item['mimeType'] == 'application/vnd.google-apps.folder':
                    item['children'] = get_children(item['id'])
            return items

        folders_result = service.files().list(
            q="mimeType='application/vnd.google-apps.folder' and name contains 'lifewood' and trashed=false",
            fields="files(id, name, mimeType, webViewLink)",
            pageSize=50,
            orderBy="name"
        ).execute()

        lifewood_folders = folders_result.get('files', [])
        for folder in lifewood_folders:
            folder['children'] = get_children(folder['id'])

        return JsonResponse(lifewood_folders, safe=False)

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        if settings.DEBUG:
            return JsonResponse({'error': str(e) or 'HttpError', 'traceback': tb}, status=500)
        return JsonResponse({'error': 'Internal server error'}, status=500)


def get_drive_file_content(request, file_id):
    # Allow n8n background worker to use stored credentials
    if _is_n8n_request(request):
        creds = _get_n8n_credentials()
        if not creds:
            return JsonResponse({'error': 'No stored Google credentials.'}, status=401)
    else:
        creds = get_user_drive_credentials(request.user)
        if not creds:
            return JsonResponse({'error': 'Not authenticated'}, status=401)

    try:
        service = build('drive', 'v3', credentials=creds)
        metadata = service.files().get(fileId=file_id, fields="id,name,mimeType").execute()
        mime_type = metadata.get('mimeType', 'application/octet-stream')

        if mime_type.startswith('application/vnd.google-apps'):
            return JsonResponse(
                {'error': 'Preview is only available for uploaded files, not Google-native documents.'},
                status=400,
            )

        content = service.files().get_media(fileId=file_id).execute()
        response = HttpResponse(content, content_type=mime_type)
        response['Content-Disposition'] = f'inline; filename="{metadata.get("name", file_id)}"'
        return response
    except Exception as e:
        if settings.DEBUG:
            return JsonResponse({'error': str(e)}, status=500)
        return JsonResponse({'error': 'Unable to load file content'}, status=500)


@csrf_exempt
@require_POST
def upload_drive_file(request, folder_id):
    creds = get_user_drive_credentials(request.user)
    if not creds:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'error': 'No file uploaded'}, status=400)

    temp_path = None

    try:
        service = build('drive', 'v3', credentials=creds)

        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name

        file_metadata = {
            'name': uploaded_file.name,
            'parents': [folder_id],
        }
        media = MediaFileUpload(
            temp_path,
            mimetype=uploaded_file.content_type or 'application/octet-stream',
            resumable=False,
        )

        created = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,name,mimeType,size,modifiedTime',
        ).execute()

        created['webViewLink'] = f'https://drive.google.com/file/d/{created["id"]}/view'
        return JsonResponse(created, status=201)
    except Exception as e:
        if settings.DEBUG:
            return JsonResponse({'error': str(e)}, status=500)
        return JsonResponse({'error': 'Unable to upload file'}, status=500)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@csrf_exempt
@require_POST
def delete_drive_file(request, file_id):
    creds = get_user_drive_credentials(request.user)
    if not creds:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    try:
        service = build('drive', 'v3', credentials=creds)
        service.files().delete(fileId=file_id).execute()
        return JsonResponse({'success': True})
    except Exception as e:
        if settings.DEBUG:
            return JsonResponse({'error': str(e)}, status=500)
        return JsonResponse({'error': 'Unable to delete file'}, status=500)
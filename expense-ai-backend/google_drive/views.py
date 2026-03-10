import os
from django.shortcuts import redirect
from django.http import JsonResponse
from django.conf import settings
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

from .models import GoogleDriveToken
from .utils import get_user_drive_credentials

# Allow OAuth over HTTP for local development only
if os.environ.get('DEBUG', 'False') == 'True':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

GOOGLE_CLIENT_SECRETS = getattr(
    settings,
    'GOOGLE_CLIENT_SECRETS',
    os.path.join(settings.BASE_DIR, 'expense_ai', 'credentials.json')
)
SCOPES = ['https://www.googleapis.com/auth/drive']

# Read from env so it works both locally and on Railway
BASE_URL = os.environ.get('BASE_URL', 'http://localhost:8000')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')


def google_drive_auth(request):
    """Step 1: Redirect user to Google Authorization page."""
    flow = Flow.from_client_secrets_file(
        GOOGLE_CLIENT_SECRETS,
        scopes=SCOPES,
        redirect_uri=f'{BASE_URL}/api/google/callback/'
    )

    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )

    request.session['code_verifier'] = flow.code_verifier
    request.session['state'] = state

    return redirect(authorization_url)


def oauth2callback(request):
    """Step 2: Handle the callback from Google and save tokens."""
    if not request.user.is_authenticated:
        return redirect(f'{BASE_URL}/admin/login/')

    saved_verifier = request.session.get('code_verifier')

    flow = Flow.from_client_secrets_file(
        GOOGLE_CLIENT_SECRETS,
        scopes=SCOPES,
        redirect_uri=f'{BASE_URL}/api/google/callback/',
        code_verifier=saved_verifier
    )

    try:
        flow.fetch_token(authorization_response=request.build_absolute_uri())
    except Exception as e:
        print(f"Token fetch failed: {e}")
        return redirect(f'{FRONTEND_URL}?error=auth_failed')

    creds = flow.credentials

    GoogleDriveToken.objects.update_or_create(
        user=request.user,
        defaults={
            'access_token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': ','.join(creds.scopes),
        }
    )

    return redirect(f'{FRONTEND_URL}/drive?status=success')


def list_drive_files(request):
    """Step 3: Fetch files from Drive using stored credentials."""
    creds = get_user_drive_credentials(request.user)

    if not creds:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    try:
        service = build('drive', 'v3', credentials=creds)
        results = service.files().list(
            pageSize=100,
            q="trashed=false",
            fields="files(id, name, mimeType, parents)"
        ).execute()
        return JsonResponse(results.get('files', []), safe=False)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()

        extra = None
        try:
            extra = getattr(e, 'content', None)
            if extra and isinstance(extra, (bytes, bytearray)):
                extra = extra.decode('utf-8', errors='replace')
        except Exception:
            extra = None

        if settings.DEBUG:
            payload = {'error': str(e) or 'HttpError', 'traceback': tb}
            if extra:
                payload['detail'] = extra
            return JsonResponse(payload, status=500)

        return JsonResponse({'error': 'Internal server error'}, status=500)
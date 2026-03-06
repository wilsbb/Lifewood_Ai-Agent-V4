import os
from django.shortcuts import redirect
from django.http import JsonResponse
from django.conf import settings
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

from .models import GoogleDriveToken
from .utils import get_user_drive_credentials

# Allow OAuth over HTTP for local development
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Configuration
GOOGLE_CLIENT_SECRETS = getattr(
    settings,
    'GOOGLE_CLIENT_SECRETS',
    os.path.join(settings.BASE_DIR, 'expense_ai', 'credentials.json')
)
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def google_drive_auth(request):
    """Step 1: Redirect user to Google Authorization page."""
    flow = Flow.from_client_secrets_file(
        GOOGLE_CLIENT_SECRETS,
        scopes=SCOPES,
        redirect_uri='http://localhost:8000/api/google/callback/'
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'  # Forces Google to provide a refresh_token
    )
    
    # Store verifier and state in session
    request.session['code_verifier'] = flow.code_verifier
    request.session['state'] = state
    
    return redirect(authorization_url)

def oauth2callback(request):
    """Step 2: Handle the callback from Google and save tokens."""
    if not request.user.is_authenticated:
        return redirect('http://localhost:8000/admin/login/')

    saved_verifier = request.session.get('code_verifier')
    
    flow = Flow.from_client_secrets_file(
        GOOGLE_CLIENT_SECRETS,
        scopes=SCOPES,
        redirect_uri='http://localhost:8000/api/google/callback/',
        code_verifier=saved_verifier
    )
    
    try:
        flow.fetch_token(authorization_response=request.build_absolute_uri())
    except Exception as e:
        print(f"Token fetch failed: {e}")
        return redirect('http://localhost:3000?error=auth_failed')

    creds = flow.credentials

    # Save or update tokens in the database
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

    return redirect('http://localhost:3000/drive?status=success')

def list_drive_files(request):
    """Step 3: Fetch files from Drive using stored credentials."""
    creds = get_user_drive_credentials(request.user)
    
    if not creds:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    try:
        service = build('drive', 'v3', credentials=creds)
        results = service.files().list(
            pageSize=10, 
            fields="files(id, name, mimeType)"
        ).execute()
        return JsonResponse(results.get('files', []), safe=False)
    except Exception as e:
        # Provide richer error information when DEBUG is enabled to help
        # during local development (traceback is included).
        import traceback
        tb = traceback.format_exc()

        # Some google api errors (HttpError) don't include a useful str(),
        # but expose a `.content` attribute with the response body.
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
# google_drive/utils.py
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from .models import GoogleDriveToken


def get_credentials_from_token(token_record):
    try:
        creds = Credentials(
            token=token_record.access_token,
            refresh_token=token_record.refresh_token,
            token_uri=token_record.token_uri,
            client_id=token_record.client_id,
            client_secret=token_record.client_secret,
            scopes=token_record.scopes.split(',')
        )
        # Only refresh if expired AND we have a refresh token
        # Do NOT always force-refresh — causes invalid_scope on old tokens
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            token_record.access_token = creds.token
            token_record.save()
        return creds
    except Exception as e:
        print(f"Error in get_credentials_from_token: {e}")
        return None


def _get_shared_token():
    """
    Returns the first available GoogleDriveToken in the DB.
    This is the token belonging to lifewoodph.finance@gmail.com,
    established once via the standard OAuth flow.
    """
    return GoogleDriveToken.objects.first()


def get_user_drive_credentials(user):
    """
    Returns Google credentials for the given user.

    Predefined admin users (AdminUserProfile.use_shared_google_drive=True)
    automatically use the shared lifewoodph.finance@gmail.com token — they
    never have to go through the OAuth flow themselves.
    """
    if not user or not user.is_authenticated:
        return None

    try:
        # ── Step 1: check for a personal token ────────────────────────────
        token_record = GoogleDriveToken.objects.filter(user=user).first()

        # ── Step 2: predefined admin fallback to shared token ──────────────
        if not token_record:
            try:
                profile = user.admin_profile
                if profile.use_shared_google_drive:
                    token_record = _get_shared_token()
            except Exception:
                pass  # user has no admin_profile — continue to None

        if not token_record:
            print(f"No GoogleDriveToken found for user: {user.username}")
            return None

        return get_credentials_from_token(token_record)

    except Exception as e:
        print(f"Error in get_user_drive_credentials: {e}")
        return None
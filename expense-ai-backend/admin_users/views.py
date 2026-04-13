import json
import logging

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET

from .models import AdminUserProfile

logger = logging.getLogger('admin_users')


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _user_payload(user) -> dict:
    """Build the serialised user dict returned to the frontend."""
    try:
        profile = user.admin_profile
        role = profile.role
        can_analytics = profile.can_access_analytics
        allowed = profile.allowed_pages
    except AdminUserProfile.DoesNotExist:
        role = 'admin'
        can_analytics = False
        allowed = ['/drive', '/dashboard']

    return {
        'id':                   user.id,
        'username':             user.username,
        'email':                user.email,
        'role':                 role,
        'can_access_analytics': can_analytics,
        'allowed_pages':        allowed,
    }


# ─────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────

@csrf_exempt
@require_POST
def login_view(request):
    """
    POST /api/users/login/
    Body: { "username": "...", "password": "..." }
    Returns user role and allowed pages so the frontend can route correctly.
    """
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    username = body.get('username', '').strip()
    password = body.get('password', '').strip()

    if not username or not password:
        return JsonResponse({'error': 'Username and password are required'}, status=400)

    user = authenticate(request, username=username, password=password)

    if user is None:
        logger.warning('Failed login attempt for username: %s', username)
        return JsonResponse({'error': 'Invalid credentials'}, status=401)

    if not user.is_active:
        return JsonResponse({'error': 'Account is disabled. Contact your administrator.'}, status=403)

    login(request, user)
    logger.info('User logged in: %s (%s)', username, user.id)

    return JsonResponse({'success': True, 'user': _user_payload(user)})


# ─────────────────────────────────────────────
# LOGOUT
# ─────────────────────────────────────────────

@csrf_exempt
@require_POST
def logout_view(request):
    """POST /api/users/logout/"""
    if request.user and request.user.is_authenticated:
        logger.info('User logged out: %s', request.user.username)
    logout(request)
    return JsonResponse({'success': True})


# ─────────────────────────────────────────────
# ME  (session validation + role refresh)
# ─────────────────────────────────────────────

@require_GET
def me_view(request):
    """
    GET /api/users/me/
    Returns current user info if the Django session is still valid.
    Frontend calls this on page load to validate the stored session.
    """
    if not request.user or not request.user.is_authenticated:
        return JsonResponse({'authenticated': False}, status=401)

    from google_drive.utils import get_user_drive_credentials
    drive_connected = get_user_drive_credentials(request.user) is not None

    payload = _user_payload(request.user)
    payload['drive_connected'] = drive_connected

    return JsonResponse({'authenticated': True, 'user': payload})
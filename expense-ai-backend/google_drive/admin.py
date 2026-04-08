# google_drive/admin.py
from django.contrib import admin
from .models import GoogleDriveToken

@admin.register(GoogleDriveToken)
class GoogleDriveTokenAdmin(admin.ModelAdmin):
    # This controls which columns you see in the list view
    list_display = ('user', 'has_refresh_token', 'created_at')
    readonly_fields = ('access_token', 'refresh_token', 'client_id', 'client_secret')

    def has_refresh_token(self, obj):
        return bool(obj.refresh_token)
    has_refresh_token.boolean = True
    has_refresh_token.short_description = 'Has Refresh Token?'
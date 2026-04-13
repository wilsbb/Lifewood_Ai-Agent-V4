from django.contrib import admin
from .models import AdminUserProfile


@admin.register(AdminUserProfile)
class AdminUserProfileAdmin(admin.ModelAdmin):
    list_display  = ('user', 'role', 'is_predefined', 'use_shared_google_drive', 'created_at')
    list_filter   = ('role', 'is_predefined', 'use_shared_google_drive')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
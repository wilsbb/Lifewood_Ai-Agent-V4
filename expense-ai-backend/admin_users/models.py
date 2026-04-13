# Create your models here.
from django.conf import settings
from django.db import models


class AdminUserProfile(models.Model):
    """
    Stores role and access config for Lifewood predefined admin accounts.
    Both predefined users auto-connect to the shared lifewoodph.finance@gmail.com
    Google Drive token — no manual OAuth required.
    """

    ROLE_CHOICES = [
        ('admin',       'Admin'),
        ('super_admin', 'Super Admin'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_profile',
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='admin')
    is_predefined = models.BooleanField(
        default=True,
        help_text='System-created predefined account (managed via create_predefined_users)',
    )
    use_shared_google_drive = models.BooleanField(
        default=True,
        help_text='When True, uses the shared lifewoodph.finance@gmail.com Drive token',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['user__username']
        verbose_name = 'Admin User Profile'
        verbose_name_plural = 'Admin User Profiles'

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

    # ── Convenience properties ─────────────────────────────────────────────

    @property
    def can_access_analytics(self) -> bool:
        return self.role == 'super_admin'

    @property
    def allowed_pages(self) -> list[str]:
        pages = ['/drive', '/dashboard']
        if self.role == 'super_admin':
            pages.append('/analytics')
        return pages
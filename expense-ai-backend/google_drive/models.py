from django.db import models
from django.conf import settings

class GoogleDriveToken(models.Model):
    # Change 'on_resolve' to 'on_delete' below
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_uri = models.CharField(max_length=255)
    client_id = models.CharField(max_length=255)
    client_secret = models.CharField(max_length=255)
    scopes = models.TextField()

    def __str__(self):
        return f"Tokens for {self.user.username}"
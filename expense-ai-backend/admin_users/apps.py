from django.apps import AppConfig


class AdminUsersConfig(AppConfig):
    name = 'admin_users'

    def ready(self):
        try:
            from django.contrib.auth import get_user_model
            from django.db.utils import OperationalError, ProgrammingError
            from .create_predefined_users import PREDEFINED_USERS
            from .models import AdminUserProfile

            User = get_user_model()
            for spec in PREDEFINED_USERS:
                user, created = User.objects.get_or_create(
                    username=spec['username'],
                    defaults={'email': spec['email'], 'is_active': True},
                )
                if not created:
                    user.email = spec['email']
                    user.is_active = True
                user.set_password(spec['password'])
                user.save()

                profile, _ = AdminUserProfile.objects.get_or_create(user=user)
                profile.role = spec['role']
                profile.is_predefined = True
                profile.use_shared_google_drive = True
                profile.save()
        except (ImportError, OperationalError, ProgrammingError):
            pass

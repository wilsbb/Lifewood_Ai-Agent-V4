from pathlib import Path

content = '''"""
Management command: create_predefined_users

Creates (or updates) the two Lifewood predefined accounts.
Safe to run multiple times — fully idempotent.

Usage:
    python manage.py create_predefined_users
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from admin_users.models import AdminUserProfile

User = get_user_model()

PREDEFINED_USERS = [
    {
        'username': 'lifewoodph.adminfinance',
        'password': '1234',
        'email':    'lifewoodph.finance@gmail.com',
        'role':     'admin',
    },
    {
        'username': 'lifewoodph.superadminfinance',
        'password': '12345',
        'email':    'lifewoodph.finance@gmail.com',
        'role':     'super_admin',
    },
]


def sync_predefined_users(force_password=True):
    for spec in PREDEFINED_USERS:
        user, created = User.objects.get_or_create(
            username=spec['username'],
            defaults={'email': spec['email'], 'is_active': True},
        )

        if not created:
            user.email = spec['email']
            user.is_active = True

        if created or force_password:
            user.set_password(spec['password'])

        user.save()

        profile, _ = AdminUserProfile.objects.get_or_create(user=user)
        profile.role = spec['role']
        profile.is_predefined = True
        profile.use_shared_google_drive = True
        profile.save()

        label = 'Created' if created else 'Updated'
        print(f'[{label}] {spec["role"].upper()}: {spec["username"]} (use_shared_google_drive=True)')


class Command(BaseCommand):
    help = 'Creates or updates the two Lifewood predefined admin accounts.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force-password',
            action='store_true',
            help='Always reset passwords even if the user already exists.',
        )

    def handle(self, *args, **options):
        force_pw = options.get('force_password', True)
        sync_predefined_users(force_password=force_pw)
        self.stdout.write(self.style.SUCCESS('\nPredefined users are ready.'))
'''

path = Path('admin_users/create_predefined_users.py')
path.write_text(content, encoding='utf-8')
print(f'Wrote {path}')

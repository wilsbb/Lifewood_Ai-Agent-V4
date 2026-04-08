from django.urls import path
from . import views

urlpatterns = [
    path('auth/', views.google_drive_auth, name='google_drive_auth'),
    path('callback/', views.oauth2callback, name='oauth2callback'),
    path('files/', views.list_drive_files, name='list_drive_files'),
    path('files/<str:file_id>/content/', views.get_drive_file_content, name='get_drive_file_content'),
    path('files/<str:file_id>/delete/', views.delete_drive_file, name='delete_drive_file'),
    path('folders/<str:folder_id>/upload/', views.upload_drive_file, name='upload_drive_file'),
]

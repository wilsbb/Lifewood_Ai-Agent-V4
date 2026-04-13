from django.urls import path
from . import views

urlpatterns = [
    path('login/',  views.login_view,  name='admin_users_login'),
    path('logout/', views.logout_view, name='admin_users_logout'),
    path('me/',     views.me_view,     name='admin_users_me'),
]
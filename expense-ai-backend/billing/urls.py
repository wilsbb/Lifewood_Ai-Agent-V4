from django.urls import path
from . import views

urlpatterns = [
    # Chat
    path('chat/message/', views.send_message, name='send_message'),
    path('chat/history/', views.get_conversation_history, name='conversation_history'),
    path('chat/conversations/', views.list_conversations, name='list_conversations'),

    # Receipts (called by n8n to save OCR results)
    path('receipts/save/', views.save_receipt, name='save_receipt'),
    path('receipts/', views.list_receipts, name='list_receipts'),
    path('receipts/<int:receipt_id>/', views.get_receipt, name='get_receipt'),

    # Analytics
    path('analytics/summary/', views.analytics_summary, name='analytics_summary'),
    path('analytics/trends/', views.analytics_trends, name='analytics_trends'),
    path('analytics/by-category/', views.analytics_by_category, name='analytics_by_category'),

    path('n8n/analytics/', views.n8n_analytics_proxy, name='n8n_analytics_proxy'),
]
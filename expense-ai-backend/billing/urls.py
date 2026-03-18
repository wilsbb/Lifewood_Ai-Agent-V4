from django.urls import path
from . import views

urlpatterns = [
    # ── Chat ──────────────────────────────────────────────────────────────
    path('chat/message/',       views.send_message,              name='send_message'),
    path('chat/history/',       views.get_conversation_history,  name='conversation_history'),
    path('chat/conversations/', views.list_conversations,        name='list_conversations'),

    # Memory endpoint — user-scoped, used by n8n agent and frontend
    path('chat/memory/',        views.chat_memory,               name='chat_memory'),

    # ── Receipts ──────────────────────────────────────────────────────────
    # Called by n8n to save OCR results
    path('receipts/save/',          views.save_receipt,            name='save_receipt'),
    path('receipts/',               views.list_receipts,           name='list_receipts'),
    path('receipts/<int:receipt_id>/', views.get_receipt,          name='get_receipt'),

    # Called by n8n OCR poller to know which files are already processed
    path('receipts/processed-ids/', views.list_processed_file_ids, name='processed_file_ids'),

    # ── Analytics ─────────────────────────────────────────────────────────
    path('analytics/summary/',     views.analytics_summary,     name='analytics_summary'),
    path('analytics/trends/',      views.analytics_trends,      name='analytics_trends'),
    path('analytics/by-category/', views.analytics_by_category, name='analytics_by_category'),

    # n8n proxy — single call that returns everything the agent needs
    path('n8n/analytics/',         views.n8n_analytics_proxy,   name='n8n_analytics_proxy'),
    path('receipts/process-ocr/', views.process_ocr, name='process_ocr'),
]
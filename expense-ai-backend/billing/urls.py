from django.urls import path
from . import views
from . import analytics_views

urlpatterns = [
    # ── Chat ──────────────────────────────────────────────────────────────
    path('chat/message/',           views.send_message,              name='send_message'),
    path('chat/history/',           views.get_conversation_history,  name='conversation_history'),
    path('chat/conversations/',     views.list_conversations,        name='list_conversations'),
    path('chat/memory/',            views.chat_memory,               name='chat_memory'),
    path('chat/upload-receipt/',    views.upload_receipt_via_chat,   name='upload_receipt_via_chat'),

    # ── Receipts ──────────────────────────────────────────────────────────
    path('receipts/save/',          views.save_receipt,              name='save_receipt'),
    path('receipts/processed-ids/', views.list_processed_file_ids,   name='processed_file_ids'),
    path('receipts/process-ocr/',   views.process_ocr,               name='process_ocr'),
    path('receipts/export/',        views.export_receipts_excel,     name='export_receipts_excel'),
    path('receipts/',               views.list_receipts,             name='list_receipts'),
    path('receipts/<int:receipt_id>/', views.get_receipt,            name='get_receipt'),

    # ── Core Analytics (existing) ──────────────────────────────────────────
    path('analytics/summary/',      views.analytics_summary,         name='analytics_summary'),
    path('analytics/trends/',       views.analytics_trends,          name='analytics_trends'),
    path('analytics/by-category/',  views.analytics_by_category,     name='analytics_by_category'),
    path('n8n/analytics/',          views.n8n_analytics_proxy,       name='n8n_analytics_proxy'),

    # ── Advanced Analytics Framework ──────────────────────────────────────
    path('analytics/executive/',    analytics_views.executive_summary,      name='executive_summary'),
    path('analytics/risk/',         analytics_views.risk_analytics,         name='risk_analytics'),
    path('analytics/performance/',  analytics_views.performance_analytics,  name='performance_analytics'),
    path('analytics/portfolio/',    analytics_views.portfolio_analytics,    name='portfolio_analytics'),
    path('analytics/cashflow/',     analytics_views.cashflow_analytics,     name='cashflow_analytics'),
    path('analytics/compliance/',   analytics_views.compliance_analytics,   name='compliance_analytics'),
]
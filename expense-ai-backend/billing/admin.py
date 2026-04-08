from django.contrib import admin
from import_export import resources
from import_export.admin import ImportExportModelAdmin

from .models import (
    Receipt, Conversation, ChatMessage,
    BudgetEntry, KPISnapshot, RiskFlag, ComplianceRecord
)

class ReceiptResource(resources.ModelResource):

    class Meta:
        model = Receipt
        # Only export these specific fields
        fields = (
            'id',
            'drive_file_name',
            'drive_folder_name',
            'business_name',
            'document_type',
            'vat_type',
            'expense_category',
            'tin',
            'receipt_number',
            'bir_permit_number',
            'expense_date',
            'description',
            'subtotal',
            'vat_amount',
            'total',
            'status',
        )
        export_order = fields  # preserve the order above

@admin.register(Receipt)
class ReceiptAdmin(ImportExportModelAdmin):
    resource_class = ReceiptResource

    list_display = (
        'drive_file_name', 'business_name', 'document_type',
        'expense_category', 'total', 'expense_date', 'status'
    )
    list_filter  = ('status', 'document_type', 'expense_category', 'vat_type')
    search_fields = ('business_name', 'tin', 'receipt_number', 'drive_file_name')
    readonly_fields = ('created_at', 'updated_at', 'ocr_processed_at')

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'created_at', 'updated_at')
    list_filter = ('user',)

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'role', 'created_at')
    list_filter = ('role', 'conversation')

# --- NEW ANALYTICS MODELS ---

@admin.register(BudgetEntry)
class BudgetEntryAdmin(admin.ModelAdmin):
    list_display = ('folder_name', 'year', 'month', 'budgeted_amount', 'user')
    list_filter = ('year', 'month', 'user')
    search_fields = ('folder_name',)

@admin.register(KPISnapshot)
class KPISnapshotAdmin(admin.ModelAdmin):
    list_display = ('date', 'total_spend', 'transaction_count', 'compliance_score')
    list_filter = ('date',)

@admin.register(RiskFlag)
class RiskFlagAdmin(admin.ModelAdmin):
    list_display = ('receipt', 'flag_type', 'severity', 'status', 'raised_at')
    list_filter = ('severity', 'status', 'flag_type')
    search_fields = ('detail', 'receipt__business_name')

@admin.register(ComplianceRecord)
class ComplianceRecordAdmin(admin.ModelAdmin):
    list_display = ('period_year', 'period_month', 'compliance_pct', 'total_receipts')
    list_filter = ('period_year', 'period_month')

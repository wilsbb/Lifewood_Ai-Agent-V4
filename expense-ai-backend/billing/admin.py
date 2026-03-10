from django.contrib import admin
from .models import Receipt, Conversation, ChatMessage


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('drive_file_name', 'business_name', 'document_type',
                    'expense_category', 'total', 'expense_date', 'status')
    list_filter = ('status', 'document_type', 'expense_category', 'vat_type')
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
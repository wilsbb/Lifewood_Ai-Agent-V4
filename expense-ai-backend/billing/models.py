from django.db import models
from django.conf import settings


class Receipt(models.Model):
    """Stores OCR-extracted data from a Google Drive receipt image."""

    # BIR document type classification
    DOCUMENT_TYPES = [
        ('invoice', 'Invoice'),
        ('official_receipt', 'Official Receipt'),
        ('sales_invoice', 'Sales Invoice (Old)'),
        ('delivery_receipt', 'Delivery Receipt'),
        ('collection_receipt', 'Collection Receipt'),
        ('acknowledgment_receipt', 'Acknowledgment Receipt'),
        ('charge_invoice', 'Charge Invoice'),
        ('cash_invoice', 'Cash Invoice'),
        ('debit_memo', 'Debit Memo'),
        ('credit_memo', 'Credit Memo'),
        ('job_order', 'Job Order'),
        ('purchase_order', 'Purchase Order'),
        ('billing_statement', 'Billing Statement'),
        ('statement_of_account', 'Statement of Account'),
        ('unknown', 'Unknown'),
    ]

    VAT_TYPES = [
        ('vat', 'VAT-Registered'),
        ('non_vat', 'Non-VAT'),
        ('zero_rated', 'Zero-Rated'),
        ('vat_exempt', 'VAT-Exempt'),
        ('unknown', 'Unknown'),
    ]

    EXPENSE_CATEGORIES = [
        ('office_supplies', 'Office Supplies'),
        ('meals_entertainment', 'Meals & Entertainment'),
        ('transportation', 'Transportation & Travel'),
        ('utilities', 'Utilities'),
        ('communication', 'Communication'),
        ('professional_fees', 'Professional Fees'),
        ('rent', 'Rent & Lease'),
        ('salaries', 'Salaries & Wages'),
        ('repairs_maintenance', 'Repairs & Maintenance'),
        ('taxes_licenses', 'Taxes & Licenses'),
        ('insurance', 'Insurance'),
        ('advertising', 'Advertising & Marketing'),
        ('miscellaneous', 'Miscellaneous'),
        ('uncategorized', 'Uncategorized'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending OCR'),
        ('processed', 'Processed'),
        ('failed', 'Failed'),
        ('needs_review', 'Needs Review'),
    ]

    # Ownership
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receipts',
    )

    # Google Drive reference
    drive_file_id = models.CharField(max_length=255, unique=True)
    drive_file_name = models.CharField(max_length=500)
    drive_folder_id = models.CharField(max_length=255, blank=True)
    drive_folder_name = models.CharField(max_length=500, blank=True)

    # OCR Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    ocr_raw_text = models.TextField(blank=True)
    ocr_processed_at = models.DateTimeField(null=True, blank=True)

    # BIR Classification
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPES, default='unknown')
    vat_type = models.CharField(max_length=20, choices=VAT_TYPES, default='unknown')
    expense_category = models.CharField(max_length=30, choices=EXPENSE_CATEGORIES, default='uncategorized')

    # Mandatory BIR Fields (extracted by OCR)
    business_name = models.CharField(max_length=500, blank=True)
    business_address = models.TextField(blank=True)
    tin = models.CharField(max_length=50, blank=True)  # XXX-XXX-XXX-XXX
    receipt_number = models.CharField(max_length=100, blank=True)
    bir_permit_number = models.CharField(max_length=100, blank=True)
    expense_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)

    # Buyer info (required if amount > ₱1,000)
    buyer_name = models.CharField(max_length=500, blank=True)
    buyer_tin = models.CharField(max_length=50, blank=True)

    # Amounts (stored in PHP centavos as integers to avoid float issues)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vatable_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_exempt_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    zero_rated_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Department / Employee info (filled in by user or agent)
    department = models.CharField(max_length=200, blank=True)
    employee_name = models.CharField(max_length=300, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-expense_date', '-created_at']

    def __str__(self):
        return f"{self.business_name or self.drive_file_name} — ₱{self.total} ({self.expense_date})"


class Conversation(models.Model):
    """A chat session between a user and the AI agent."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations',
    )
    title = models.CharField(max_length=300, blank=True)  # auto-generated from first message
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation #{self.id} — {self.user.username} ({self.created_at.date()})"


class ChatMessage(models.Model):
    """A single message in a conversation, from either the user or the AI agent."""

    ROLE_CHOICES = [
        ('user', 'User'),
        ('agent', 'Agent'),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()

    # Optional: link message to receipts it referenced
    referenced_receipts = models.ManyToManyField(
        Receipt,
        blank=True,
        related_name='chat_messages',
    )

    # Store any structured data the agent returned (analytics, charts, etc.)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role.upper()}] {self.content[:60]}..."
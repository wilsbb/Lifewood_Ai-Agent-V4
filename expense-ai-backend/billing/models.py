from django.db import models
from django.conf import settings


class Receipt(models.Model):
    """Stores OCR-extracted data from a Google Drive receipt image."""

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
    drive_file_id   = models.CharField(max_length=255, unique=True)
    drive_file_name = models.CharField(max_length=500)
    drive_folder_id = models.CharField(max_length=255, blank=True)
    drive_folder_name = models.CharField(max_length=500, blank=True)

    # OCR Status
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    ocr_raw_text      = models.TextField(blank=True)
    ocr_processed_at  = models.DateTimeField(null=True, blank=True)

    # BIR Classification
    document_type    = models.CharField(max_length=30, choices=DOCUMENT_TYPES, default='unknown')
    vat_type         = models.CharField(max_length=20, choices=VAT_TYPES, default='unknown')
    expense_category = models.CharField(max_length=30, choices=EXPENSE_CATEGORIES, default='uncategorized')

    # Mandatory BIR Fields
    business_name    = models.CharField(max_length=500, blank=True)
    business_address = models.TextField(blank=True)
    tin              = models.CharField(max_length=50, blank=True)
    receipt_number   = models.CharField(max_length=100, blank=True)
    bir_permit_number = models.CharField(max_length=100, blank=True)
    expense_date     = models.DateField(null=True, blank=True)
    description      = models.TextField(blank=True)

    # Buyer info
    buyer_name = models.CharField(max_length=500, blank=True)
    buyer_tin  = models.CharField(max_length=50, blank=True)

    # Amounts
    subtotal         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vatable_sales    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_exempt_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    zero_rated_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_amount       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total            = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Department / Employee
    department    = models.CharField(max_length=200, blank=True)
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
    title      = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation #{self.id} — {self.user.username} ({self.created_at.date()})"


class ChatMessage(models.Model):
    """A single message in a conversation."""

    ROLE_CHOICES = [
        ('user',  'User'),
        ('agent', 'Agent'),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role    = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()

    referenced_receipts = models.ManyToManyField(
        Receipt,
        blank=True,
        related_name='chat_messages',
    )

    metadata   = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role.upper()}] {self.content[:60]}..."


# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS FRAMEWORK MODELS
# ─────────────────────────────────────────────────────────────────────────────

class BudgetEntry(models.Model):
    """
    Monthly budget allocation per folder/category.
    Maps to drive_folder_name on Receipt so the analytics framework
    can compute budget vs actual spend and flag overruns.
    """

    PERIOD_CHOICES = [(str(m).zfill(2), str(m).zfill(2)) for m in range(1, 13)]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='budget_entries',
        null=True,
        blank=True,
    )
    year            = models.IntegerField()
    month           = models.CharField(max_length=2, choices=PERIOD_CHOICES)
    folder_name     = models.CharField(
        max_length=500,
        help_text='Must exactly match drive_folder_name on Receipt records',
    )
    budgeted_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes           = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering        = ['-year', '-month', 'folder_name']
        unique_together = [['user', 'year', 'month', 'folder_name']]

    def __str__(self):
        return f"{self.folder_name} — {self.year}/{self.month} — PHP {self.budgeted_amount}"


class KPISnapshot(models.Model):
    """
    Daily company-wide KPI snapshot.
    Enables fast time-series charts without re-aggregating all receipts.
    Populate via a management command or scheduled task.
    """

    date               = models.DateField(unique=True)
    total_spend        = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_vat          = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    transaction_count  = models.IntegerField(default=0)
    avg_transaction    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    compliance_score   = models.DecimalField(
        max_digits=5, decimal_places=2, default=100,
        help_text='Percentage of receipts with all mandatory BIR fields present',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"KPI {self.date} — spend PHP {self.total_spend}"


class RiskFlag(models.Model):
    """
    A risk event or compliance flag raised against a receipt.
    Created automatically by analytics views or manually by staff.
    """

    SEVERITY_CHOICES = [
        ('low',      'Low'),
        ('medium',   'Medium'),
        ('high',     'High'),
        ('critical', 'Critical'),
    ]
    FLAG_TYPES = [
        ('missing_tin',        'Missing TIN'),
        ('missing_receipt_no', 'Missing Receipt Number'),
        ('missing_bir_permit', 'Missing BIR Permit'),
        ('duplicate_receipt',  'Possible Duplicate Receipt'),
        ('amount_anomaly',     'Unusual Amount'),
        ('missing_date',       'Missing Expense Date'),
        ('unverified_vendor',  'Unverified Vendor'),
        ('over_budget',        'Over Budget'),
        ('vat_mismatch',       'VAT Calculation Mismatch'),
        ('other',              'Other'),
    ]
    STATUS_CHOICES = [
        ('open',     'Open'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
        ('waived',   'Waived'),
    ]

    receipt   = models.ForeignKey(
        Receipt,
        on_delete=models.CASCADE,
        related_name='risk_flags',
        null=True,
        blank=True,
    )
    flag_type   = models.CharField(max_length=30, choices=FLAG_TYPES)
    severity    = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    detail      = models.TextField(blank=True)
    raised_at   = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_risk_flags',
    )

    class Meta:
        ordering = ['-raised_at']

    def __str__(self):
        return f"[{self.severity.upper()}] {self.flag_type} — {self.receipt}"


class ComplianceRecord(models.Model):
    """
    Monthly BIR compliance summary, stored for audit trail purposes.
    One record per calendar month.
    """

    period_year          = models.IntegerField()
    period_month         = models.CharField(max_length=2)
    total_receipts       = models.IntegerField(default=0)
    compliant_receipts   = models.IntegerField(default=0)
    non_compliant        = models.IntegerField(default=0)
    compliance_pct       = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_vat_remittable = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes                = models.TextField(blank=True)
    generated_at         = models.DateTimeField(auto_now_add=True)
    generated_by         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering        = ['-period_year', '-period_month']
        unique_together = [['period_year', 'period_month']]

    def __str__(self):
        return f"Compliance {self.period_year}/{self.period_month} — {self.compliance_pct}%"
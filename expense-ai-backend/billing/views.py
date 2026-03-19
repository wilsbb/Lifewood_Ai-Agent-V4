import os
import json
import base64
import requests as http_requests
from datetime import datetime, timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Sum, Count, Avg, Min, Max, Q
from django.db.models.functions import TruncMonth
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.utils import timezone

from .models import Receipt, Conversation, ChatMessage

N8N_WEBHOOK_URL = os.environ.get('N8N_WEBHOOK_URL', '')


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def require_auth(func):
    """Returns 401 if user is not authenticated."""
    def wrapper(request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            return JsonResponse({'error': 'Not authenticated'}, status=401)
        return func(request, *args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


def _is_n8n_request(request):
    """Check if request is authenticated via X-Agent-Secret header."""
    agent_secret = os.environ.get('N8N_AGENT_SECRET', '')
    request_secret = request.headers.get('X-Agent-Secret', '')
    return bool(agent_secret and request_secret == agent_secret)


def _get_n8n_credentials():
    from google_drive.models import GoogleDriveToken
    from google_drive.utils import get_credentials_from_token
    token = GoogleDriveToken.objects.first()
    if not token:
        return None
    return get_credentials_from_token(token)


def parse_date_range(request):
    """
    Parses ?start=YYYY-MM-DD&end=YYYY-MM-DD from query params.
    Defaults to current month if not provided.
    """
    today = timezone.now().date()
    start_str = request.GET.get('start')
    end_str = request.GET.get('end')

    try:
        start = datetime.strptime(start_str, '%Y-%m-%d').date() if start_str else today.replace(day=1)
        end = datetime.strptime(end_str, '%Y-%m-%d').date() if end_str else today
    except ValueError:
        start = today.replace(day=1)
        end = today

    return start, end


def get_user_receipts(user):
    """
    Returns receipts belonging to this user OR receipts with no user assigned.
    This handles the case where OCR processed files without a user_id.
    """
    return Receipt.objects.filter(Q(user=user) | Q(user__isnull=True))


# ─────────────────────────────────────────────
# CHAT ENDPOINTS
# ─────────────────────────────────────────────

@csrf_exempt
@require_POST
@require_auth
def send_message(request):
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    user_message = body.get('message', '').strip()
    conversation_id = body.get('conversation_id')

    if not user_message:
        return JsonResponse({'error': 'Message cannot be empty'}, status=400)

    if conversation_id:
        try:
            conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        except Conversation.DoesNotExist:
            return JsonResponse({'error': 'Conversation not found'}, status=404)
    else:
        title = user_message[:60] + ('...' if len(user_message) > 60 else '')
        conversation = Conversation.objects.create(user=request.user, title=title)

    user_chat_message = ChatMessage.objects.create(
        conversation=conversation, role='user', content=user_message,
    )

    history = list(
        conversation.messages
        .exclude(id=user_chat_message.id)
        .values('role', 'content', 'created_at')
        .order_by('created_at')
    )
    formatted_history = [
        {'role': msg['role'], 'content': msg['content'], 'timestamp': msg['created_at'].isoformat()}
        for msg in history
    ]

    agent_reply = ''
    agent_metadata = {}

    if N8N_WEBHOOK_URL:
        try:
            n8n_payload = {
                'message': user_message,
                'conversation_id': conversation.id,
                'user_id': request.user.id,
                'user_email': request.user.email,
                'history': formatted_history,
            }
            n8n_response = http_requests.post(N8N_WEBHOOK_URL, json=n8n_payload, timeout=100)
            n8n_response.raise_for_status()
            n8n_data = n8n_response.json()
            agent_reply = n8n_data.get('reply', 'No response from agent.')
            agent_metadata = n8n_data.get('metadata', {})
        except Exception as e:
            print(f'n8n webhook error: {e}')
            agent_reply = 'I encountered an issue processing your request. Please try again in a moment.'
    else:
        agent_reply = 'AI agent is not configured yet. Please set the N8N_WEBHOOK_URL environment variable.'

    agent_chat_message = ChatMessage.objects.create(
        conversation=conversation, role='agent', content=agent_reply, metadata=agent_metadata,
    )
    conversation.save()

    return JsonResponse({
        'conversation_id': conversation.id,
        'user_message_id': user_chat_message.id,
        'agent_message_id': agent_chat_message.id,
        'reply': agent_reply,
        'metadata': agent_metadata,
    })


@require_GET
@require_auth
def get_conversation_history(request):
    conversation_id = request.GET.get('conversation_id')
    if not conversation_id:
        return JsonResponse({'error': 'conversation_id is required'}, status=400)

    try:
        conversation = Conversation.objects.get(id=conversation_id, user=request.user)
    except Conversation.DoesNotExist:
        return JsonResponse({'error': 'Conversation not found'}, status=404)

    messages = conversation.messages.all().values('id', 'role', 'content', 'metadata', 'created_at')
    return JsonResponse({
        'conversation_id': conversation.id,
        'title': conversation.title,
        'messages': [{**msg, 'created_at': msg['created_at'].isoformat()} for msg in messages],
    })


@require_GET
@require_auth
def list_conversations(request):
    conversations = (
        Conversation.objects
        .filter(user=request.user)
        .annotate(message_count=Count('messages'))
        .values('id', 'title', 'created_at', 'updated_at', 'message_count')
        .order_by('-updated_at')
    )
    return JsonResponse({
        'conversations': [
            {**conv, 'created_at': conv['created_at'].isoformat(), 'updated_at': conv['updated_at'].isoformat()}
            for conv in conversations
        ]
    })


# ─────────────────────────────────────────────
# MEMORY ENDPOINT
# ─────────────────────────────────────────────

@csrf_exempt
@require_GET
def chat_memory(request):
    if _is_n8n_request(request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user_id = request.GET.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'user_id is required for agent requests'}, status=400)
        user = User.objects.filter(id=user_id).first()
        if not user:
            return JsonResponse({'error': 'User not found'}, status=404)
    elif request.user and request.user.is_authenticated:
        user = request.user
    else:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    query = request.GET.get('query', '').strip()
    limit = min(int(request.GET.get('limit', 8)), 20)

    base_qs = (
        ChatMessage.objects
        .filter(conversation__user=user)
        .select_related('conversation')
        .order_by('-created_at')
    )
    if query:
        base_qs = base_qs.filter(Q(content__icontains=query))

    messages_page = base_qs[:limit]
    return JsonResponse({
        'user_id': user.id,
        'query': query,
        'memories': [
            {
                'id': m.id,
                'role': m.role,
                'content': m.content[:600] + ('...' if len(m.content) > 600 else ''),
                'conversation_id': m.conversation_id,
                'conversation_title': m.conversation.title,
                'created_at': m.created_at.isoformat(),
            }
            for m in messages_page
        ],
        'total_found': base_qs.count(),
    })


# ─────────────────────────────────────────────
# RECEIPT ENDPOINTS
# ─────────────────────────────────────────────

@csrf_exempt
@require_POST
def save_receipt(request):
    if not _is_n8n_request(request):
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    drive_file_id = body.get('drive_file_id')
    if not drive_file_id:
        return JsonResponse({'error': 'drive_file_id is required'}, status=400)

    from django.contrib.auth import get_user_model
    User = get_user_model()
    user = None
    user_id = body.get('user_id')
    if user_id:
        user = User.objects.filter(id=user_id).first()

    expense_date = None
    date_str = body.get('expense_date')
    if date_str:
        for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y'):
            try:
                expense_date = datetime.strptime(date_str, fmt).date()
                break
            except ValueError:
                continue

    receipt, created = Receipt.objects.update_or_create(
        drive_file_id=drive_file_id,
        defaults={
            'user': user,
            'drive_file_name': body.get('drive_file_name', ''),
            'drive_folder_id': body.get('drive_folder_id', ''),
            'drive_folder_name': body.get('drive_folder_name', ''),
            'status': body.get('status', 'processed'),
            'ocr_raw_text': body.get('ocr_raw_text', ''),
            'ocr_processed_at': timezone.now(),
            'document_type': body.get('document_type', 'unknown'),
            'vat_type': body.get('vat_type', 'unknown'),
            'expense_category': body.get('expense_category', 'uncategorized'),
            'business_name': body.get('business_name', ''),
            'business_address': body.get('business_address', ''),
            'tin': body.get('tin', ''),
            'receipt_number': body.get('receipt_number', ''),
            'bir_permit_number': body.get('bir_permit_number', ''),
            'expense_date': expense_date,
            'description': body.get('description', ''),
            'buyer_name': body.get('buyer_name', ''),
            'buyer_tin': body.get('buyer_tin', ''),
            'subtotal': Decimal(str(body.get('subtotal', 0))),
            'vatable_sales': Decimal(str(body.get('vatable_sales', 0))),
            'vat_exempt_sales': Decimal(str(body.get('vat_exempt_sales', 0))),
            'zero_rated_sales': Decimal(str(body.get('zero_rated_sales', 0))),
            'vat_amount': Decimal(str(body.get('vat_amount', 0))),
            'total': Decimal(str(body.get('total', 0))),
            'department': body.get('department', ''),
            'employee_name': body.get('employee_name', ''),
        }
    )

    return JsonResponse({
        'receipt_id': receipt.id,
        'created': created,
        'drive_file_id': receipt.drive_file_id,
    }, status=201 if created else 200)


@require_GET
def list_receipts(request):
    if _is_n8n_request(request):
        receipts = Receipt.objects.all()
    elif request.user and request.user.is_authenticated:
        # FIX: include receipts with no user (OCR-processed without user_id)
        receipts = get_user_receipts(request.user)
    else:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    category = request.GET.get('category')
    status = request.GET.get('status')
    start, end = parse_date_range(request)

    if category:
        receipts = receipts.filter(expense_category=category)
    if status:
        receipts = receipts.filter(status=status)
    if request.GET.get('start') or request.GET.get('end'):
        receipts = receipts.filter(expense_date__range=[start, end])

    data = receipts.values(
        'id', 'drive_file_id', 'drive_file_name', 'business_name',
        'document_type', 'expense_category', 'vat_type', 'status',
        'expense_date', 'total', 'vat_amount', 'department',
        'employee_name', 'receipt_number', 'tin', 'created_at',
        'bir_permit_number',
    )

    return JsonResponse({
        'receipts': [
            {
                **r,
                'expense_date': r['expense_date'].isoformat() if r['expense_date'] else None,
                'created_at': r['created_at'].isoformat(),
                'total': str(r['total']),
                'vat_amount': str(r['vat_amount']),
            }
            for r in data
        ],
        'total_count': receipts.count(),
    })


@require_GET
@require_auth
def get_receipt(request, receipt_id):
    try:
        # FIX: also allow access to receipts with no user
        receipt = Receipt.objects.get(
            Q(id=receipt_id) & (Q(user=request.user) | Q(user__isnull=True))
        )
    except Receipt.DoesNotExist:
        return JsonResponse({'error': 'Receipt not found'}, status=404)

    return JsonResponse({
        'id': receipt.id,
        'drive_file_id': receipt.drive_file_id,
        'drive_file_name': receipt.drive_file_name,
        'drive_folder_id': receipt.drive_folder_id,
        'drive_folder_name': receipt.drive_folder_name,
        'status': receipt.status,
        'ocr_raw_text': receipt.ocr_raw_text,
        'ocr_processed_at': receipt.ocr_processed_at.isoformat() if receipt.ocr_processed_at else None,
        'document_type': receipt.document_type,
        'vat_type': receipt.vat_type,
        'expense_category': receipt.expense_category,
        'business_name': receipt.business_name,
        'business_address': receipt.business_address,
        'tin': receipt.tin,
        'receipt_number': receipt.receipt_number,
        'bir_permit_number': receipt.bir_permit_number,
        'expense_date': receipt.expense_date.isoformat() if receipt.expense_date else None,
        'description': receipt.description,
        'buyer_name': receipt.buyer_name,
        'buyer_tin': receipt.buyer_tin,
        'subtotal': str(receipt.subtotal),
        'vatable_sales': str(receipt.vatable_sales),
        'vat_exempt_sales': str(receipt.vat_exempt_sales),
        'zero_rated_sales': str(receipt.zero_rated_sales),
        'vat_amount': str(receipt.vat_amount),
        'total': str(receipt.total),
        'department': receipt.department,
        'employee_name': receipt.employee_name,
        'created_at': receipt.created_at.isoformat(),
        'updated_at': receipt.updated_at.isoformat(),
    })


@require_GET
def list_processed_file_ids(request):
    if not _is_n8n_request(request):
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    file_ids = list(Receipt.objects.values_list('drive_file_id', flat=True))
    return JsonResponse({'processed_file_ids': file_ids, 'count': len(file_ids)})


# ─────────────────────────────────────────────
# ANALYTICS ENDPOINTS
# ─────────────────────────────────────────────

@require_GET
@require_auth
def analytics_summary(request):
    start, end = parse_date_range(request)
    user = request.user

    # FIX: include receipts with no user assigned
    base_qs = get_user_receipts(user).filter(
        status='processed',
        expense_date__range=[start, end],
    )

    duration = (end - start).days
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=max(duration, 1))

    prev_qs = get_user_receipts(user).filter(
        status='processed',
        expense_date__range=[prev_start, prev_end],
    )

    current_total = base_qs.aggregate(total=Sum('total'))['total'] or Decimal('0')
    prev_total = prev_qs.aggregate(total=Sum('total'))['total'] or Decimal('0')

    if prev_total > 0:
        change_pct = float((current_total - prev_total) / prev_total * 100)
    else:
        change_pct = 0.0

    summary = base_qs.aggregate(
        total_spend=Sum('total'),
        total_vat=Sum('vat_amount'),
        transaction_count=Count('id'),
        avg_transaction=Avg('total'),
        largest_transaction=Max('total'),
        smallest_transaction=Min('total'),
    )

    return JsonResponse({
        'period': {'start': start.isoformat(), 'end': end.isoformat()},
        'total_spend': str(summary['total_spend'] or 0),
        'total_vat': str(summary['total_vat'] or 0),
        'transaction_count': summary['transaction_count'] or 0,
        'avg_transaction': str(summary['avg_transaction'] or 0),
        'largest_transaction': str(summary['largest_transaction'] or 0),
        'smallest_transaction': str(summary['smallest_transaction'] or 0),
        'vs_previous_period': {
            'previous_total': str(prev_total),
            'change_amount': str(current_total - prev_total),
            'change_pct': round(change_pct, 2),
        },
    })


@require_GET
@require_auth
def analytics_by_category(request):
    start, end = parse_date_range(request)

    # FIX: include receipts with no user assigned
    base_qs = get_user_receipts(request.user).filter(
        status='processed',
        expense_date__range=[start, end],
    )

    grand_total = base_qs.aggregate(total=Sum('total'))['total'] or Decimal('1')

    categories = (
        base_qs
        .values('expense_category')
        .annotate(
            total_spend=Sum('total'),
            transaction_count=Count('id'),
            avg_spend=Avg('total'),
        )
        .order_by('-total_spend')
    )

    result = []
    for cat in categories:
        pct = float(cat['total_spend'] / grand_total * 100) if grand_total else 0
        result.append({
            'category': cat['expense_category'],
            'total_spend': str(cat['total_spend']),
            'transaction_count': cat['transaction_count'],
            'avg_spend': str(cat['avg_spend']),
            'percentage': round(pct, 2),
        })

    return JsonResponse({
        'period': {'start': start.isoformat(), 'end': end.isoformat()},
        'by_category': result,
    })


@require_GET
@require_auth
def analytics_trends(request):
    today = timezone.now().date()
    twelve_months_ago = today.replace(day=1) - timedelta(days=365)

    # FIX: include receipts with no user assigned
    base_qs = get_user_receipts(request.user).filter(
        status='processed',
        expense_date__gte=twelve_months_ago,
    )

    monthly = (
        base_qs
        .annotate(month=TruncMonth('expense_date'))
        .values('month')
        .annotate(
            total_spend=Sum('total'),
            total_vat=Sum('vat_amount'),
            transaction_count=Count('id'),
            avg_spend=Avg('total'),
        )
        .order_by('month')
    )

    from django.db.models.functions import ExtractWeekDay
    by_weekday = (
        base_qs
        .annotate(weekday=ExtractWeekDay('expense_date'))
        .values('weekday')
        .annotate(total_spend=Sum('total'), count=Count('id'))
        .order_by('weekday')
    )

    weekday_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    return JsonResponse({
        'monthly_trend': [
            {
                'month': row['month'].strftime('%Y-%m'),
                'total_spend': str(row['total_spend']),
                'total_vat': str(row['total_vat'] or 0),
                'transaction_count': row['transaction_count'],
                'avg_spend': str(row['avg_spend']),
            }
            for row in monthly
        ],
        'by_weekday': [
            {
                'weekday': weekday_names[row['weekday'] - 1],
                'total_spend': str(row['total_spend']),
                'transaction_count': row['count'],
            }
            for row in by_weekday
        ],
    })


# ─────────────────────────────────────────────
# N8N PROXY ENDPOINT
# ─────────────────────────────────────────────

@csrf_exempt
@require_POST
def n8n_analytics_proxy(request):
    if not _is_n8n_request(request):
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        body = {}

    user_id = body.get('user_id')
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user = User.objects.filter(id=user_id).first()

    if not user:
        return JsonResponse({'error': 'User not found'}, status=404)

    today = timezone.now().date()
    start = today.replace(day=1)

    # FIX: include receipts with no user assigned
    base_qs = get_user_receipts(user).filter(
        status='processed',
        expense_date__range=[start, today],
    )

    prev_end = start - timedelta(days=1)
    prev_start = prev_end.replace(day=1)
    prev_total = get_user_receipts(user).filter(
        status='processed',
        expense_date__range=[prev_start, prev_end],
    ).aggregate(total=Sum('total'))['total'] or Decimal('0')

    summary = base_qs.aggregate(
        total_spend=Sum('total'),
        total_vat=Sum('vat_amount'),
        transaction_count=Count('id'),
        avg_transaction=Avg('total'),
    )

    categories = list(
        base_qs
        .values('expense_category')
        .annotate(total=Sum('total'), count=Count('id'))
        .order_by('-total')
    )

    recent_receipts = list(
        get_user_receipts(user).filter(status='processed')
        .order_by('-expense_date')[:20]
        .values(
            'business_name', 'expense_category', 'document_type',
            'total', 'vat_amount', 'expense_date', 'description',
            'tin', 'receipt_number', 'vat_type', 'bir_permit_number',
        )
    )

    current_total = summary['total_spend'] or Decimal('0')
    change_pct = 0.0
    if prev_total > 0:
        change_pct = float((current_total - prev_total) / prev_total * 100)

    return JsonResponse({
        'summary': {
            'total_spend': str(current_total),
            'total_vat': str(summary['total_vat'] or 0),
            'transaction_count': summary['transaction_count'] or 0,
            'avg_transaction': str(summary['avg_transaction'] or 0),
            'period_start': start.isoformat(),
            'period_end': today.isoformat(),
            'vs_prev_month': {
                'previous_total': str(prev_total),
                'change_pct': round(change_pct, 2),
            },
        },
        'by_category': [
            {**c, 'total': str(c['total'])}
            for c in categories
        ],
        'recent_receipts': [
            {
                **r,
                'expense_date': r['expense_date'].isoformat() if r['expense_date'] else None,
                'total': str(r['total']),
                'vat_amount': str(r['vat_amount']),
            }
            for r in recent_receipts
        ],
    })


# ─────────────────────────────────────────────
# OCR ENDPOINT
# ─────────────────────────────────────────────

@csrf_exempt
def process_ocr(request):
    if not _is_n8n_request(request):
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'Invalid JSON body'}, status=400)

    file_id = data.get('file_id')
    folder_id = data.get('folder_id', '')
    folder_name = data.get('folder_name', '')
    file_name = data.get('file_name', '')

    if not file_id:
        return JsonResponse({'error': 'file_id is required'}, status=400)

    creds = _get_n8n_credentials()
    if not creds:
        return JsonResponse({'error': 'No stored Google credentials.'}, status=401)

    try:
        from googleapiclient.discovery import build
        service = build('drive', 'v3', credentials=creds)
        metadata = service.files().get(fileId=file_id, fields="id,name,mimeType").execute()
        mime_type = metadata.get('mimeType', 'image/jpeg')
        content = service.files().get_media(fileId=file_id).execute()
        base64_image = base64.b64encode(content).decode('utf-8')
    except Exception as e:
        return JsonResponse({'error': f'Failed to download file: {str(e)}'}, status=500)

    openrouter_key = os.environ.get('OPENROUTER_API_KEY')
    if not openrouter_key:
        return JsonResponse({'error': 'OPENROUTER_API_KEY not configured'}, status=500)

    ocr_prompt = """You are a BIR (Bureau of Internal Revenue) receipt OCR specialist for the Philippines. Extract all structured data from this receipt or invoice image.

Return ONLY a valid JSON object — no markdown, no explanation, no code fences. Use these exact field names:
{
  "document_type": "official_receipt|invoice|sales_invoice|delivery_receipt|collection_receipt|acknowledgment_receipt|charge_invoice|cash_invoice|debit_memo|credit_memo|job_order|purchase_order|billing_statement|statement_of_account|unknown",
  "vat_type": "vat|non_vat|zero_rated|vat_exempt|unknown",
  "expense_category": "office_supplies|meals_entertainment|transportation|utilities|communication|professional_fees|rent|salaries|repairs_maintenance|taxes_licenses|insurance|advertising|miscellaneous|uncategorized",
  "business_name": "",
  "business_address": "",
  "tin": "",
  "receipt_number": "",
  "bir_permit_number": "",
  "expense_date": "YYYY-MM-DD or empty string",
  "description": "brief description of what was purchased",
  "buyer_name": "",
  "buyer_tin": "",
  "subtotal": 0.00,
  "vatable_sales": 0.00,
  "vat_exempt_sales": 0.00,
  "zero_rated_sales": 0.00,
  "vat_amount": 0.00,
  "total": 0.00
}

Rules:
- All numeric fields must be numbers (not strings)
- Dates must be YYYY-MM-DD format or empty string if not found
- TIN format: XXX-XXX-XXX-XXX
- If a field is not found on the receipt, use empty string or 0
- For expense_category, infer from the business name and description
- Return ONLY the JSON object, nothing else"""

    try:
        response = http_requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={'Authorization': f'Bearer {openrouter_key}', 'Content-Type': 'application/json'},
            json={
                'model': 'openai/gpt-4o',
                'max_tokens': 1024,
                'messages': [{
                    'role': 'user',
                    'content': [
                        {'type': 'image_url', 'image_url': {'url': f'data:{mime_type};base64,{base64_image}', 'detail': 'high'}},
                        {'type': 'text', 'text': ocr_prompt}
                    ]
                }]
            },
            timeout=60
        )
        response.raise_for_status()
        reply = response.json()['choices'][0]['message']['content']
    except Exception as e:
        return JsonResponse({'error': f'OpenRouter call failed: {str(e)}'}, status=500)

    try:
        cleaned = reply.replace('```json', '').replace('```', '').strip()
        ocr_data = json.loads(cleaned)
    except Exception:
        ocr_data = {'document_type': 'unknown', 'vat_type': 'unknown', 'expense_category': 'uncategorized', 'business_name': '', 'total': 0}

    expense_date = None
    date_str = ocr_data.get('expense_date', '')
    if date_str:
        for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y'):
            try:
                expense_date = datetime.strptime(date_str, fmt).date()
                break
            except ValueError:
                continue

    Receipt.objects.update_or_create(
        drive_file_id=file_id,
        defaults={
            'drive_file_name':    file_name,
            'drive_folder_id':    folder_id,
            'drive_folder_name':  folder_name,
            'status':             'processed',
            'ocr_raw_text':       reply,
            'ocr_processed_at':   timezone.now(),
            'document_type':      ocr_data.get('document_type',     'unknown'),
            'vat_type':           ocr_data.get('vat_type',          'unknown'),
            'expense_category':   ocr_data.get('expense_category',  'uncategorized'),
            'business_name':      ocr_data.get('business_name',     ''),
            'business_address':   ocr_data.get('business_address',  ''),
            'tin':                ocr_data.get('tin',               ''),
            'receipt_number':     ocr_data.get('receipt_number',    ''),
            'bir_permit_number':  ocr_data.get('bir_permit_number', ''),
            'expense_date':       expense_date,
            'description':        ocr_data.get('description',       ''),
            'buyer_name':         ocr_data.get('buyer_name',        ''),
            'buyer_tin':          ocr_data.get('buyer_tin',         ''),
            'subtotal':           Decimal(str(ocr_data.get('subtotal',         0) or 0)),
            'vatable_sales':      Decimal(str(ocr_data.get('vatable_sales',    0) or 0)),
            'vat_exempt_sales':   Decimal(str(ocr_data.get('vat_exempt_sales', 0) or 0)),
            'zero_rated_sales':   Decimal(str(ocr_data.get('zero_rated_sales', 0) or 0)),
            'vat_amount':         Decimal(str(ocr_data.get('vat_amount',       0) or 0)),
            'total':              Decimal(str(ocr_data.get('total',            0) or 0)),
        }
    )

    return JsonResponse({'status': 'ok', 'file_id': file_id, 'file_name': file_name})
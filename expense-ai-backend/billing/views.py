import os
import json
import requests as http_requests
from datetime import datetime, timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Sum, Count, Avg, Min, Max
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
    """Simple decorator — returns 401 if user is not authenticated."""
    def wrapper(request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            return JsonResponse({'error': 'Not authenticated'}, status=401)
        return func(request, *args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


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


# ─────────────────────────────────────────────
# CHAT ENDPOINTS
# ─────────────────────────────────────────────

@csrf_exempt
@require_POST
@require_auth
def send_message(request):
    """
    Receives a chat message from the frontend, forwards it to n8n,
    saves both the user message and agent response to the database.

    POST /api/billing/chat/message/
    Body: {
        "message": "How much did we spend on meals this month?",
        "conversation_id": 1  (optional — omit to start a new conversation)
    }
    """
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    user_message = body.get('message', '').strip()
    conversation_id = body.get('conversation_id')

    if not user_message:
        return JsonResponse({'error': 'Message cannot be empty'}, status=400)

    # Get or create conversation
    if conversation_id:
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=request.user
            )
        except Conversation.DoesNotExist:
            return JsonResponse({'error': 'Conversation not found'}, status=404)
    else:
        # Auto-generate title from first 60 chars of first message
        title = user_message[:60] + ('...' if len(user_message) > 60 else '')
        conversation = Conversation.objects.create(
            user=request.user,
            title=title,
        )

    # Save user message
    user_chat_message = ChatMessage.objects.create(
        conversation=conversation,
        role='user',
        content=user_message,
    )

    # Build full conversation history to send to n8n for memory
    history = list(
        conversation.messages
        .exclude(id=user_chat_message.id)
        .values('role', 'content', 'created_at')
        .order_by('created_at')
    )

    # Format history for the agent
    formatted_history = [
        {
            'role': msg['role'],
            'content': msg['content'],
            'timestamp': msg['created_at'].isoformat(),
        }
        for msg in history
    ]

    # Forward to n8n
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

            n8n_response = http_requests.post(
                N8N_WEBHOOK_URL,
                json=n8n_payload,
                timeout=60,
            )
            n8n_response.raise_for_status()
            n8n_data = n8n_response.json()

            agent_reply = n8n_data.get('reply', 'No response from agent.')
            agent_metadata = n8n_data.get('metadata', {})

        except Exception as e:
            print(f'n8n webhook error: {e}')
            agent_reply = (
                'I encountered an issue processing your request. '
                'Please try again in a moment.'
            )
    else:
        agent_reply = (
            'AI agent is not configured yet. '
            'Please set the N8N_WEBHOOK_URL environment variable.'
        )

    # Save agent response
    agent_chat_message = ChatMessage.objects.create(
        conversation=conversation,
        role='agent',
        content=agent_reply,
        metadata=agent_metadata,
    )

    # Update conversation timestamp
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
    """
    Returns all messages for a specific conversation.

    GET /api/billing/chat/history/?conversation_id=1
    """
    conversation_id = request.GET.get('conversation_id')
    if not conversation_id:
        return JsonResponse({'error': 'conversation_id is required'}, status=400)

    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            user=request.user
        )
    except Conversation.DoesNotExist:
        return JsonResponse({'error': 'Conversation not found'}, status=404)

    messages = conversation.messages.all().values(
        'id', 'role', 'content', 'metadata', 'created_at'
    )

    return JsonResponse({
        'conversation_id': conversation.id,
        'title': conversation.title,
        'messages': [
            {
                **msg,
                'created_at': msg['created_at'].isoformat(),
            }
            for msg in messages
        ],
    })


@require_GET
@require_auth
def list_conversations(request):
    """
    Returns all conversations for the current user.

    GET /api/billing/chat/conversations/
    """
    conversations = (
        Conversation.objects
        .filter(user=request.user)
        .annotate(message_count=Count('messages'))
        .values('id', 'title', 'created_at', 'updated_at', 'message_count')
        .order_by('-updated_at')
    )

    return JsonResponse({
        'conversations': [
            {
                **conv,
                'created_at': conv['created_at'].isoformat(),
                'updated_at': conv['updated_at'].isoformat(),
            }
            for conv in conversations
        ]
    })


# ─────────────────────────────────────────────
# RECEIPT ENDPOINTS
# ─────────────────────────────────────────────

@csrf_exempt
@require_POST
def save_receipt(request):
    """
    Called by n8n after OCR processing to save extracted receipt data.
    Uses a shared secret for authentication instead of session cookies.

    POST /api/billing/receipts/save/
    Header: X-Agent-Secret: <N8N_AGENT_SECRET>
    Body: { receipt data }
    """
    agent_secret = os.environ.get('N8N_AGENT_SECRET', '')
    request_secret = request.headers.get('X-Agent-Secret', '')

    if agent_secret and request_secret != agent_secret:
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

    # Parse expense date
    expense_date = None
    date_str = body.get('expense_date')
    if date_str:
        try:
            expense_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            try:
                expense_date = datetime.strptime(date_str, '%m/%d/%Y').date()
            except ValueError:
                pass

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
@require_auth
def list_receipts(request):
    """
    Returns all receipts for the current user with optional filters.

    GET /api/billing/receipts/
    Query params: ?category=meals_entertainment&status=processed&start=2024-01-01&end=2024-12-31
    """
    receipts = Receipt.objects.filter(user=request.user)

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
            }
            for r in data
        ],
        'total_count': receipts.count(),
    })


@require_GET
@require_auth
def get_receipt(request, receipt_id):
    """
    Returns full detail for a single receipt.

    GET /api/billing/receipts/<id>/
    """
    try:
        receipt = Receipt.objects.get(id=receipt_id, user=request.user)
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


# ─────────────────────────────────────────────
# ANALYTICS ENDPOINTS
# ─────────────────────────────────────────────

@require_GET
@require_auth
def analytics_summary(request):
    """
    Returns high-level spending summary for the date range.

    GET /api/billing/analytics/summary/?start=2024-01-01&end=2024-12-31
    """
    start, end = parse_date_range(request)
    user = request.user

    base_qs = Receipt.objects.filter(
        user=user,
        status='processed',
        expense_date__range=[start, end],
    )

    # Previous period (same duration)
    duration = (end - start).days
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=duration)

    prev_qs = Receipt.objects.filter(
        user=user,
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
    """
    Returns spend broken down by expense category.

    GET /api/billing/analytics/by-category/?start=2024-01-01&end=2024-12-31
    """
    start, end = parse_date_range(request)

    base_qs = Receipt.objects.filter(
        user=request.user,
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
    """
    Returns monthly spending trend for the past 12 months.

    GET /api/billing/analytics/trends/
    """
    today = timezone.now().date()
    twelve_months_ago = today.replace(day=1) - timedelta(days=365)

    monthly = (
        Receipt.objects
        .filter(
            user=request.user,
            status='processed',
            expense_date__gte=twelve_months_ago,
        )
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
        Receipt.objects
        .filter(
            user=request.user,
            status='processed',
            expense_date__gte=twelve_months_ago,
        )
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
    """
    Allows n8n to fetch all analytics in one call using the agent secret
    instead of a session cookie — avoids expiry issues with long-running workflows.

    POST /api/billing/n8n/analytics/
    Header: X-Agent-Secret: <N8N_AGENT_SECRET>
    Body: { "user_id": 1 }
    """
    agent_secret = os.environ.get('N8N_AGENT_SECRET', '')
    request_secret = request.headers.get('X-Agent-Secret', '')

    if agent_secret and request_secret != agent_secret:
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

    base_qs = Receipt.objects.filter(
        user=user,
        status='processed',
        expense_date__range=[start, today],
    )

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
        Receipt.objects
        .filter(user=user, status='processed')
        .order_by('-expense_date')[:20]
        .values(
            'business_name', 'expense_category', 'document_type',
            'total', 'vat_amount', 'expense_date', 'description',
            'tin', 'receipt_number', 'vat_type',
        )
    )

    return JsonResponse({
        'summary': {
            'total_spend': str(summary['total_spend'] or 0),
            'total_vat': str(summary['total_vat'] or 0),
            'transaction_count': summary['transaction_count'] or 0,
            'avg_transaction': str(summary['avg_transaction'] or 0),
            'period_start': start.isoformat(),
            'period_end': today.isoformat(),
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
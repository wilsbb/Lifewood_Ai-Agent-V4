"""
billing/analytics_views.py

World-class financial analytics framework for Lifewood Data Technology.
Covers: Risk, Performance, Portfolio, Cash Flow, Compliance.

Wire into urls.py:
    from . import analytics_views
    path('analytics/risk/',        analytics_views.risk_analytics,        name='risk_analytics'),
    path('analytics/performance/', analytics_views.performance_analytics,  name='performance_analytics'),
    path('analytics/portfolio/',   analytics_views.portfolio_analytics,    name='portfolio_analytics'),
    path('analytics/cashflow/',    analytics_views.cashflow_analytics,     name='cashflow_analytics'),
    path('analytics/compliance/',  analytics_views.compliance_analytics,   name='compliance_analytics'),
    path('analytics/executive/',   analytics_views.executive_summary,      name='executive_summary'),
"""

import os
import json
from datetime import datetime, timedelta, date
from decimal import Decimal
from collections import defaultdict

from django.db.models import Sum, Count, Avg, Min, Max, Q, F, StdDev
from django.db.models.functions import TruncMonth, TruncWeek, ExtractMonth, ExtractYear
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt

from .models import Receipt, Conversation, ChatMessage


# ─────────────────────────────────────────────
# AUTH HELPER
# ─────────────────────────────────────────────

def require_auth(func):
    def wrapper(request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            return JsonResponse({'error': 'Not authenticated'}, status=401)
        return func(request, *args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


def get_user_receipts(user):
    from django.db.models import Q
    return Receipt.objects.filter(Q(user=user) | Q(user__isnull=True))


def _parse_range(request):
    today = timezone.now().date()
    try:
        start = datetime.strptime(request.GET.get('start', ''), '%Y-%m-%d').date()
    except ValueError:
        start = today.replace(day=1)
    try:
        end = datetime.strptime(request.GET.get('end', ''), '%Y-%m-%d').date()
    except ValueError:
        end = today
    return start, end


def _to_float(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


# ─────────────────────────────────────────────────────────────────────────────
# 1. RISK ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@require_GET
@require_auth
def risk_analytics(request):
    start, end = _parse_range(request)
    qs = get_user_receipts(request.user).filter(status='processed')
    period_qs  = qs.filter(expense_date__range=[start, end])
    total      = period_qs.count()

    missing_tin        = period_qs.filter(Q(tin='')          | Q(tin__isnull=True)).count()
    missing_receipt_no = period_qs.filter(Q(receipt_number='') | Q(receipt_number__isnull=True)).count()
    missing_bir_permit = period_qs.filter(Q(bir_permit_number='') | Q(bir_permit_number__isnull=True)).count()
    missing_date       = period_qs.filter(expense_date__isnull=True).count()
    missing_business   = period_qs.filter(Q(business_name='') | Q(business_name__isnull=True)).count()

    compliant = period_qs.exclude(
        Q(tin='') | Q(tin__isnull=True) |
        Q(receipt_number='') | Q(receipt_number__isnull=True) |
        Q(bir_permit_number='') | Q(bir_permit_number__isnull=True)
    ).count()

    compliance_pct = round((compliant / total * 100), 2) if total > 0 else 100.0
    risk_score     = round(100 - compliance_pct, 2)

    # Vendor concentration risk
    vendor_totals = list(
        period_qs.exclude(business_name='')
        .values('business_name')
        .annotate(spend=Sum('total'), count=Count('id'))
        .order_by('-spend')[:10]
    )
    grand_total = period_qs.aggregate(t=Sum('total'))['t'] or Decimal('1')
    top_vendor_pct = round(float(vendor_totals[0]['spend'] / grand_total * 100), 2) if vendor_totals else 0.0

    # Amount anomaly detection (z-score based)
    stats = period_qs.aggregate(
        avg=Avg('total'), std=StdDev('total'), mn=Min('total'), mx=Max('total')
    )
    avg_amount = _to_float(stats['avg'])
    std_amount = _to_float(stats['std'])
    anomalous  = []
    if std_amount > 0:
        threshold = avg_amount + 2.5 * std_amount
        outliers = period_qs.filter(total__gt=threshold).values(
            'id', 'business_name', 'total', 'expense_date', 'drive_folder_name'
        )[:20]
        for r in outliers:
            z = (float(r['total']) - avg_amount) / std_amount
            anomalous.append({
                'id':            r['id'],
                'business_name': r['business_name'],
                'total':         str(r['total']),
                'expense_date':  r['expense_date'].isoformat() if r['expense_date'] else None,
                'folder':        r['drive_folder_name'],
                'z_score':       round(z, 2),
            })

    # Category concentration
    category_dist = list(
        period_qs.values('drive_folder_name')
        .annotate(spend=Sum('total'), count=Count('id'))
        .order_by('-spend')
    )
    category_risk = []
    for c in category_dist:
        pct = round(float(c['spend'] / grand_total * 100), 2) if grand_total else 0
        category_risk.append({
            'folder':       c['drive_folder_name'] or 'Uncategorized',
            'total':        str(c['spend']),
            'count':        c['count'],
            'pct_of_spend': pct,
            'risk_level':   'high' if pct > 40 else 'medium' if pct > 25 else 'low',
        })

    # Budget overrun detection
    budget_alerts = []
    try:
        from .models import BudgetEntry
        month_str = str(start.month).zfill(2)
        budgets   = BudgetEntry.objects.filter(
            year=start.year, month=month_str
        ).values('folder_name', 'budgeted_amount')
        for b in budgets:
            actual_qs = period_qs.filter(drive_folder_name__iexact=b['folder_name'])
            actual    = actual_qs.aggregate(t=Sum('total'))['t'] or Decimal('0')
            if actual > b['budgeted_amount']:
                overrun = actual - b['budgeted_amount']
                budget_alerts.append({
                    'folder':      b['folder_name'],
                    'budgeted':    str(b['budgeted_amount']),
                    'actual':      str(actual),
                    'overrun':     str(overrun),
                    'overrun_pct': round(float(overrun / b['budgeted_amount'] * 100), 2),
                })
    except Exception:
        pass

    return JsonResponse({
        'period': {'start': start.isoformat(), 'end': end.isoformat()},
        'summary': {
            'total_receipts':   total,
            'compliant':        compliant,
            'non_compliant':    total - compliant,
            'compliance_pct':   compliance_pct,
            'risk_score':       risk_score,
            'risk_level':       'critical' if risk_score > 40 else 'high' if risk_score > 20 else 'medium' if risk_score > 5 else 'low',
        },
        'missing_fields': {
            'tin':            missing_tin,
            'receipt_number': missing_receipt_no,
            'bir_permit':     missing_bir_permit,
            'expense_date':   missing_date,
            'business_name':  missing_business,
        },
        'amount_stats': {
            'average':   round(avg_amount, 2),
            'std_dev':   round(std_amount, 2),
            'min':       str(stats['mn'] or 0),
            'max':       str(stats['mx'] or 0),
            'anomaly_threshold': round(avg_amount + 2.5 * std_amount, 2) if std_amount else None,
        },
        'anomalous_transactions': anomalous,
        'vendor_concentration': {
            'top_vendors':    [{**v, 'total': str(v['spend'])} for v in vendor_totals],
            'top_vendor_pct': top_vendor_pct,
            'risk_level':     'high' if top_vendor_pct > 50 else 'medium' if top_vendor_pct > 30 else 'low',
        },
        'category_risk':  category_risk,
        'budget_alerts':  budget_alerts,
    })


# ─────────────────────────────────────────────────────────────────────────────
# 2. PERFORMANCE ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@require_GET
@require_auth
def performance_analytics(request):
    today = timezone.now().date()
    start, end = _parse_range(request)
    qs = get_user_receipts(request.user).filter(status='processed')

    # Receipt processing velocity
    duration_days = max((end - start).days, 1)
    period_count  = qs.filter(expense_date__range=[start, end]).count()
    receipts_per_day = round(period_count / duration_days, 2)

    # Weekly processing volume (last 12 weeks)
    twelve_weeks_ago = today - timedelta(weeks=12)
    weekly = list(
        qs.filter(expense_date__gte=twelve_weeks_ago)
        .annotate(week=TruncWeek('expense_date'))
        .values('week')
        # FIX: renamed total -> week_spend to avoid Django 6 alias conflict
        .annotate(count=Count('id'), week_spend=Sum('total'))
        .order_by('week')
    )

    # Spend efficiency: MoM change per folder
    current_month_start = today.replace(day=1)
    prev_month_end      = current_month_start - timedelta(days=1)
    prev_month_start    = prev_month_end.replace(day=1)

    current_by_folder = {
        r['drive_folder_name']: _to_float(r['folder_spend'])
        for r in qs.filter(expense_date__range=[current_month_start, today])
        .values('drive_folder_name')
        # FIX: renamed total -> folder_spend
        .annotate(folder_spend=Sum('total'))
    }
    prev_by_folder = {
        r['drive_folder_name']: _to_float(r['folder_spend'])
        for r in qs.filter(expense_date__range=[prev_month_start, prev_month_end])
        .values('drive_folder_name')
        # FIX: renamed total -> folder_spend
        .annotate(folder_spend=Sum('total'))
    }

    all_folders = set(list(current_by_folder.keys()) + list(prev_by_folder.keys()))
    folder_performance = []
    for f in sorted(all_folders):
        curr = current_by_folder.get(f, 0)
        prev = prev_by_folder.get(f, 0)
        change = round((curr - prev) / prev * 100, 2) if prev > 0 else None
        folder_performance.append({
            'folder':         f or 'Uncategorized',
            'current_month':  round(curr, 2),
            'previous_month': round(prev, 2),
            'change_pct':     change,
            'trend':          'up' if change and change > 5 else 'down' if change and change < -5 else 'stable',
        })

    # Weekday spending pattern
    from django.db.models.functions import ExtractWeekDay
    weekday_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    weekday_data  = list(
        qs.filter(expense_date__gte=today - timedelta(days=90))
        .annotate(wd=ExtractWeekDay('expense_date'))
        .values('wd')
        # FIX: renamed total -> day_spend
        .annotate(day_spend=Sum('total'), count=Count('id'))
        .order_by('wd')
    )
    weekday_spend = [
        {'day': weekday_names[r['wd'] - 1], 'total': str(r['day_spend']), 'count': r['count']}
        for r in weekday_data
    ]

    # OCR quality proxy
    all_receipts   = get_user_receipts(request.user)
    total_all      = all_receipts.count()
    needs_review   = all_receipts.filter(status='needs_review').count()
    failed         = all_receipts.filter(status='failed').count()
    processed_ok   = all_receipts.filter(status='processed').count()
    ocr_success_rate = round(processed_ok / total_all * 100, 2) if total_all > 0 else 0

    # Top month by spend
    monthly_top = list(
        qs.annotate(month=TruncMonth('expense_date'))
        .values('month')
        # FIX: renamed total -> month_spend
        .annotate(month_spend=Sum('total'), count=Count('id'))
        .exclude(month=None)
        .order_by('-month_spend')[:3]
    )

    return JsonResponse({
        'period': {'start': start.isoformat(), 'end': end.isoformat()},
        'processing_velocity': {
            'receipts_in_period': period_count,
            'duration_days':      duration_days,
            'receipts_per_day':   receipts_per_day,
            'weekly_volume': [
                {
                    'week':  r['week'].strftime('%Y-%m-%d'),
                    'count': r['count'],
                    'total': str(r['week_spend']),
                }
                for r in weekly
            ],
        },
        'ocr_quality': {
            'total':            total_all,
            'processed':        processed_ok,
            'needs_review':     needs_review,
            'failed':           failed,
            'success_rate_pct': ocr_success_rate,
        },
        'folder_mom_performance': folder_performance,
        'weekday_pattern':        weekday_spend,
        'peak_months': [
            {
                'month': r['month'].strftime('%Y-%m') if r['month'] else None,
                'total': str(r['month_spend']),
                'count': r['count'],
            }
            for r in monthly_top
        ],
    })


# ─────────────────────────────────────────────────────────────────────────────
# 3. PORTFOLIO ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@require_GET
@require_auth
def portfolio_analytics(request):
    start, end = _parse_range(request)
    qs = get_user_receipts(request.user).filter(status='processed')
    period_qs = qs.filter(expense_date__range=[start, end])

    grand_total = period_qs.aggregate(t=Sum('total'))['t'] or Decimal('1')
    grand_vat   = period_qs.aggregate(v=Sum('vat_amount'))['v'] or Decimal('0')

    # Folder portfolio
    # FIX: renamed total -> folder_total, avg -> folder_avg to avoid Django 6 conflicts
    folders = list(
        period_qs.values('drive_folder_name')
        .annotate(
            folder_total =Sum('total'),
            vat          =Sum('vat_amount'),
            count        =Count('id'),
            folder_avg   =Avg('total'),
            vendors      =Count('business_name', distinct=True),
        )
        .order_by('-folder_total')
    )

    # Previous period for growth calculation
    duration     = max((end - start).days, 1)
    prev_end     = start - timedelta(days=1)
    prev_start   = prev_end - timedelta(days=duration)
    prev_folder_totals = {
        r['drive_folder_name']: _to_float(r['prev_spend'])
        for r in qs.filter(expense_date__range=[prev_start, prev_end])
        .values('drive_folder_name')
        # FIX: renamed total -> prev_spend
        .annotate(prev_spend=Sum('total'))
    }

    portfolio = []
    for f in folders:
        folder_name = f['drive_folder_name'] or 'Uncategorized'
        pct         = round(float(f['folder_total'] / grand_total * 100), 2)
        prev_total  = prev_folder_totals.get(f['drive_folder_name'], 0)
        growth      = round((float(f['folder_total']) - prev_total) / prev_total * 100, 2) if prev_total > 0 else None
        vat_rate    = round(float(f['vat']) / float(f['folder_total']) * 100, 2) if float(f['folder_total']) > 0 else 0
        portfolio.append({
            'folder':           folder_name,
            'total':            str(f['folder_total']),
            'vat':              str(f['vat']),
            'count':            f['count'],
            'avg_transaction':  str(round(_to_float(f['folder_avg']), 2)),
            'unique_vendors':   f['vendors'],
            'pct_of_portfolio': pct,
            'growth_pct':       growth,
            'vat_rate_pct':     vat_rate,
        })

    # VAT portfolio
    vat_by_type = list(
        period_qs.values('vat_type')
        .annotate(vat_total=Sum('total'), vat=Sum('vat_amount'), count=Count('id'))
        .order_by('-vat_total')
    )

    # Document type mix
    doc_mix = list(
        period_qs.values('document_type')
        .annotate(count=Count('id'), doc_total=Sum('total'))
        .order_by('-count')
    )

    # Vendor diversity (Herfindahl-Hirschman Index)
    vendor_shares = list(
        period_qs.exclude(business_name='')
        .values('business_name').annotate(v_spend=Sum('total'))
    )
    hhi = sum(
        (float(v['v_spend']) / float(grand_total) * 100) ** 2
        for v in vendor_shares
    ) if vendor_shares else 0
    diversity = 'high' if hhi < 1500 else 'medium' if hhi < 2500 else 'low'

    return JsonResponse({
        'period': {'start': start.isoformat(), 'end': end.isoformat()},
        'portfolio_summary': {
            'total_spend':      str(grand_total),
            'total_vat':        str(grand_vat),
            'total_folders':    len(portfolio),
            'total_vendors':    period_qs.exclude(business_name='').values('business_name').distinct().count(),
            'total_receipts':   period_qs.count(),
            'hhi_score':        round(hhi, 2),
            'vendor_diversity': diversity,
        },
        'folder_portfolio': portfolio,
        'vat_breakdown': [
            {**v, 'total': str(v['vat_total']), 'vat': str(v['vat'])}
            for v in vat_by_type
        ],
        'document_type_mix': [
            {**d, 'total': str(d['doc_total'])}
            for d in doc_mix
        ],
    })


# ─────────────────────────────────────────────────────────────────────────────
# 4. CASH FLOW & LIQUIDITY ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@require_GET
@require_auth
def cashflow_analytics(request):
    today = timezone.now().date()
    qs    = get_user_receipts(request.user).filter(status='processed')

    # 12-month monthly cash outflow
    twelve_months_ago = (today.replace(day=1) - timedelta(days=365))
    monthly = list(
        qs.filter(expense_date__gte=twelve_months_ago)
        .annotate(month=TruncMonth('expense_date'))
        .values('month')
        .annotate(outflow=Sum('total'), vat=Sum('vat_amount'), count=Count('id'))
        .order_by('month')
    )

    monthly_series = [
        {
            'month':   r['month'].strftime('%Y-%m'),
            'outflow': _to_float(r['outflow']),
            'vat':     _to_float(r['vat']),
            'count':   r['count'],
        }
        for r in monthly
    ]

    # Rolling window totals
    def rolling(days):
        return _to_float(
            qs.filter(expense_date__gte=today - timedelta(days=days))
            .aggregate(t=Sum('total'))['t'] or 0
        )

    roll_30  = rolling(30)
    roll_60  = rolling(60)
    roll_90  = rolling(90)
    roll_180 = rolling(180)

    burn_rate_30d  = round(roll_30  / 30,  2)
    burn_rate_90d  = round(roll_90  / 90,  2)
    burn_rate_180d = round(roll_180 / 180, 2)

    # Next-month projection (simple linear regression on last 6 months)
    recent_months = monthly_series[-6:] if len(monthly_series) >= 6 else monthly_series
    projection    = None
    if len(recent_months) >= 3:
        vals   = [m['outflow'] for m in recent_months]
        n      = len(vals)
        xs     = list(range(n))
        x_mean = sum(xs) / n
        y_mean = sum(vals) / n
        denom  = sum((x - x_mean) ** 2 for x in xs)
        if denom > 0:
            slope     = sum((xs[i] - x_mean) * (vals[i] - y_mean) for i in range(n)) / denom
            intercept = y_mean - slope * x_mean
            projection = round(intercept + slope * n, 2)

    # Largest single-day outlays
    daily_top = list(
        qs.filter(expense_date__gte=today - timedelta(days=90))
        .values('expense_date')
        .annotate(day_total=Sum('total'), count=Count('id'))
        .order_by('-day_total')[:10]
    )

    # VAT obligation schedule (monthly)
    vat_schedule = [
        {
            'month':            m['month'],
            'vat_payable':      m['vat'],
            'is_current_month': m['month'] == today.strftime('%Y-%m'),
        }
        for m in monthly_series[-12:]
    ]

    # Current month status
    current_month_start = today.replace(day=1)
    current_outflow     = _to_float(
        qs.filter(expense_date__range=[current_month_start, today])
        .aggregate(t=Sum('total'))['t'] or 0
    )
    days_elapsed = (today - current_month_start).days + 1
    days_in_month = (
        current_month_start.replace(month=current_month_start.month % 12 + 1, day=1)
        if current_month_start.month < 12
        else current_month_start.replace(year=current_month_start.year + 1, month=1, day=1)
    ) - current_month_start
    month_projected = round(current_outflow / days_elapsed * days_in_month.days, 2) if days_elapsed > 0 else 0

    return JsonResponse({
        'rolling_windows': {
            '30d':  round(roll_30,  2),
            '60d':  round(roll_60,  2),
            '90d':  round(roll_90,  2),
            '180d': round(roll_180, 2),
        },
        'burn_rate': {
            '30d_daily':  burn_rate_30d,
            '90d_daily':  burn_rate_90d,
            '180d_daily': burn_rate_180d,
        },
        'monthly_trend':   monthly_series,
        'current_month': {
            'outflow_to_date':      round(current_outflow, 2),
            'days_elapsed':         days_elapsed,
            'projected_full_month': month_projected,
        },
        'next_month_projection': projection,
        'top_spending_days': [
            {
                'date':  r['expense_date'].isoformat(),
                'total': str(r['day_total']),
                'count': r['count'],
            }
            for r in daily_top
        ],
        'vat_obligation_schedule': vat_schedule,
    })


# ─────────────────────────────────────────────────────────────────────────────
# 5. COMPLIANCE ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@require_GET
@require_auth
def compliance_analytics(request):
    start, end = _parse_range(request)
    qs         = get_user_receipts(request.user).filter(status='processed')
    period_qs  = qs.filter(expense_date__range=[start, end])
    total      = period_qs.count()

    MANDATORY_FIELDS = {
        'tin':              Q(tin='') | Q(tin__isnull=True),
        'receipt_number':   Q(receipt_number='') | Q(receipt_number__isnull=True),
        'bir_permit':       Q(bir_permit_number='') | Q(bir_permit_number__isnull=True),
        'business_name':    Q(business_name='') | Q(business_name__isnull=True),
        'business_address': Q(business_address='') | Q(business_address__isnull=True),
        'expense_date':     Q(expense_date__isnull=True),
    }

    field_completion = {}
    for field, missing_q in MANDATORY_FIELDS.items():
        missing = period_qs.filter(missing_q).count()
        present = total - missing
        field_completion[field] = {
            'present':  present,
            'missing':  missing,
            'rate_pct': round(present / total * 100, 2) if total > 0 else 0,
        }

    fully_compliant = period_qs.exclude(
        Q(tin='') | Q(tin__isnull=True) |
        Q(receipt_number='') | Q(receipt_number__isnull=True) |
        Q(bir_permit_number='') | Q(bir_permit_number__isnull=True) |
        Q(business_name='') | Q(business_name__isnull=True)
    ).count()

    compliance_score = round(fully_compliant / total * 100, 2) if total > 0 else 100.0

    # Monthly compliance trend
    twelve_months_ago = timezone.now().date().replace(day=1) - timedelta(days=365)
    monthly_compliance = []
    monthly_qs = list(
        qs.filter(expense_date__gte=twelve_months_ago)
        .annotate(month=TruncMonth('expense_date'))
        .values('month')
        .annotate(total_count=Count('id'))
        .order_by('month')
    )
    for m in monthly_qs:
        m_start = m['month'].date() if hasattr(m['month'], 'date') else m['month']
        m_end   = (m_start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        m_qs    = qs.filter(expense_date__range=[m_start, m_end])
        m_compliant = m_qs.exclude(
            Q(tin='') | Q(tin__isnull=True) |
            Q(receipt_number='') | Q(receipt_number__isnull=True) |
            Q(bir_permit_number='') | Q(bir_permit_number__isnull=True)
        ).count()
        m_total = m['total_count']
        monthly_compliance.append({
            'month':          m['month'].strftime('%Y-%m'),
            'total':          m_total,
            'compliant':      m_compliant,
            'compliance_pct': round(m_compliant / m_total * 100, 2) if m_total > 0 else 100.0,
        })

    # VAT compliance breakdown
    vat_breakdown = list(
        period_qs.values('vat_type')
        .annotate(count=Count('id'), vat_total=Sum('total'), vat=Sum('vat_amount'))
        .order_by('-count')
    )

    # Receipts needing immediate attention
    critical = list(
        period_qs.filter(
            Q(tin='') | Q(tin__isnull=True) |
            Q(receipt_number='') | Q(receipt_number__isnull=True)
        )
        .values('id', 'business_name', 'total', 'expense_date',
                'drive_folder_name', 'tin', 'receipt_number', 'bir_permit_number')
        .order_by('-total')[:20]
    )

    vat_remittable = period_qs.filter(vat_type='vat').aggregate(v=Sum('vat_amount'))['v'] or 0

    return JsonResponse({
        'period':           {'start': start.isoformat(), 'end': end.isoformat()},
        'compliance_score': compliance_score,
        'summary': {
            'total':           total,
            'fully_compliant': fully_compliant,
            'non_compliant':   total - fully_compliant,
            'vat_remittable':  str(vat_remittable),
        },
        'field_completion':  field_completion,
        'monthly_trend':     monthly_compliance,
        'vat_breakdown': [
            {**v, 'total': str(v['vat_total']), 'vat': str(v['vat'])}
            for v in vat_breakdown
        ],
        'critical_receipts': [
            {
                **r,
                'total':        str(r['total']),
                'expense_date': r['expense_date'].isoformat() if r['expense_date'] else None,
                'missing': [
                    f for f, v in [
                        ('TIN', r['tin']),
                        ('Receipt No.', r['receipt_number']),
                        ('BIR Permit', r['bir_permit_number']),
                    ] if not v
                ],
            }
            for r in critical
        ],
    })


# ─────────────────────────────────────────────────────────────────────────────
# 6. EXECUTIVE SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

@require_GET
@require_auth
def executive_summary(request):
    today       = timezone.now().date()
    month_start = today.replace(day=1)
    qs          = get_user_receipts(request.user).filter(status='processed')

    curr     = qs.filter(expense_date__range=[month_start, today])

    # FIX: renamed total -> total_spend to avoid Django 6 conflict with Avg('total')
    curr_agg = curr.aggregate(
        total_spend=Sum('total'),
        vat=Sum('vat_amount'),
        count=Count('id'),
        avg=Avg('total'),
    )

    prev_end   = month_start - timedelta(days=1)
    prev_start = prev_end.replace(day=1)
    prev_agg   = qs.filter(expense_date__range=[prev_start, prev_end]).aggregate(
        t=Sum('total')
    )

    curr_total = _to_float(curr_agg['total_spend'])   # FIX: use total_spend key
    prev_total = _to_float(prev_agg['t'])
    mom_change = round((curr_total - prev_total) / prev_total * 100, 2) if prev_total > 0 else 0

    total_count = curr.count()
    compliant   = curr.exclude(
        Q(tin='') | Q(tin__isnull=True) |
        Q(receipt_number='') | Q(receipt_number__isnull=True) |
        Q(bir_permit_number='') | Q(bir_permit_number__isnull=True)
    ).count()
    compliance_score = round(compliant / total_count * 100, 2) if total_count > 0 else 100.0

    missing_critical = curr.filter(
        Q(tin='') | Q(tin__isnull=True)
    ).count()

    # 6-month sparkline
    six_months_ago = (month_start - timedelta(days=180))
    sparkline = list(
        qs.filter(expense_date__gte=six_months_ago)
        .annotate(m=TruncMonth('expense_date'))
        .values('m')
        .annotate(spark_total=Sum('total'))
        .order_by('m')
    )

    top_folder = (
        curr.exclude(drive_folder_name='')
        .values('drive_folder_name')
        .annotate(f_total=Sum('total'))
        .order_by('-f_total')
        .first()
    )

    return JsonResponse({
        'as_of': today.isoformat(),
        'kpi_cards': [
            {
                'id':     'total_spend',
                'label':  'Total Spend (MTD)',
                'value':  round(curr_total, 2),
                'format': 'currency',
                'change': mom_change,
                'trend':  'up' if mom_change > 0 else 'down',
                'alert':  mom_change > 20,
            },
            {
                'id':     'vat_paid',
                'label':  'VAT Paid (MTD)',
                'value':  round(_to_float(curr_agg['vat']), 2),
                'format': 'currency',
                'change': None,
                'trend':  'neutral',
                'alert':  False,
            },
            {
                'id':     'transactions',
                'label':  'Transactions (MTD)',
                'value':  curr_agg['count'] or 0,
                'format': 'integer',
                'change': None,
                'trend':  'neutral',
                'alert':  False,
            },
            {
                'id':     'compliance_score',
                'label':  'BIR Compliance Score',
                'value':  compliance_score,
                'format': 'percentage',
                'change': None,
                'trend':  'up' if compliance_score >= 90 else 'down',
                'alert':  compliance_score < 80,
            },
            {
                'id':     'risk_alerts',
                'label':  'Open Risk Alerts',
                'value':  missing_critical,
                'format': 'integer',
                'change': None,
                'trend':  'neutral',
                'alert':  missing_critical > 0,
            },
            {
                'id':     'avg_transaction',
                'label':  'Avg. Transaction',
                'value':  round(_to_float(curr_agg['avg']), 2),
                'format': 'currency',
                'change': None,
                'trend':  'neutral',
                'alert':  False,
            },
        ],
        'spend_sparkline': [
            {'month': r['m'].strftime('%Y-%m'), 'total': _to_float(r['spark_total'])}
            for r in sparkline
        ],
        'top_folder_this_month': {
            'name':  top_folder['drive_folder_name'] if top_folder else None,
            'total': str(top_folder['f_total']) if top_folder else '0',
        },
        'prev_month_total': round(prev_total, 2),
    })
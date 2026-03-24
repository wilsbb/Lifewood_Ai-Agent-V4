const normalizeBaseUrl = (url = '') => url.trim().replace(/\/+$/, '');
const isLocalHost = (hostname = '') => hostname === 'localhost' || hostname === '127.0.0.1';

export const API_ENDPOINTS = {
  local: process.env.NEXT_PUBLIC_LOCAL_API_URL || 'http://localhost:8000',
  remote: process.env.NEXT_PUBLIC_REMOTE_API_URL || 'https://expense-ai-backend-eip2.onrender.com',
};

export function getApiBaseUrl() {
  const explicit = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  if (explicit) return explicit;

  if (typeof window !== 'undefined') {
    return normalizeBaseUrl(
      isLocalHost(window.location.hostname) ? API_ENDPOINTS.local : API_ENDPOINTS.remote
    );
  }

  return normalizeBaseUrl(process.env.NODE_ENV === 'development' ? API_ENDPOINTS.local : API_ENDPOINTS.remote);
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ── Date helpers ───────────────────────────────────────────────────────────
function getDateRange(period = 'month') {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const end = fmt(today);

  let start;
  if (period === 'year') {
    start = `${today.getFullYear()}-01-01`;
  } else if (period === 'quarter') {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 3);
    start = fmt(d);
  } else {
    // month (default)
    start = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
  }

  return { start, end };
}

// ── Analytics ──────────────────────────────────────────────────────────────
export const fetchSummary = (period = 'month') => {
  const { start, end } = getDateRange(period);
  return apiFetch(`/api/billing/analytics/summary/?start=${start}&end=${end}`);
};

export const fetchCategories = (period = 'month') => {
  const { start, end } = getDateRange(period);
  return apiFetch(`/api/billing/analytics/by-category/?start=${start}&end=${end}`);
};

export const fetchTrends = () => apiFetch('/api/billing/analytics/trends/');

// ── Receipts ───────────────────────────────────────────────────────────────
export const fetchReceipts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/billing/receipts/${qs ? '?' + qs : ''}`);
};

// ── Chat ───────────────────────────────────────────────────────────────────
export const fetchConversations = () => apiFetch('/api/billing/chat/conversations/');

export const fetchHistory = (conversationId) =>
  apiFetch(`/api/billing/chat/history/?conversation_id=${conversationId}`);

export const sendMessage = (message, conversationId, history = [], opts = {}) =>
  apiFetch('/api/billing/chat/message/', {
    method: 'POST',
    body: JSON.stringify({ message, conversation_id: conversationId, history }),
    signal: opts.signal,
  });

// ── Helpers ────────────────────────────────────────────────────────────────
export const formatPeso = (value) => {
  const num = parseFloat(value) || 0;
  return 'PHP ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const CATEGORY_LABELS = {
  office_supplies: 'Office Supplies',
  meals_entertainment: 'Meals & Entertainment',
  transportation: 'Transportation',
  utilities: 'Utilities',
  communication: 'Communication',
  professional_fees: 'Professional Fees',
  rent: 'Rent',
  salaries: 'Salaries',
  repairs_maintenance: 'Repairs & Maintenance',
  taxes_licenses: 'Taxes & Licenses',
  insurance: 'Insurance',
  advertising: 'Advertising',
  miscellaneous: 'Miscellaneous',
  uncategorized: 'Uncategorized',
};

export const CATEGORY_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f97316', '#06b6d4', '#a3e635', '#fb7185',
  '#c084fc', '#34d399', '#fbbf24', '#60a5fa',
];

// BIR compliance checks on a receipt object
export const getComplianceIssues = (receipts = []) => {
  const issues = [];
  receipts.forEach((r) => {
    const missing = [];
    if (!r.tin)            missing.push('TIN');
    if (!r.receipt_number) missing.push('Receipt No.');
    if (!r.bir_permit_number) missing.push('BIR Permit No.');
    if (!r.business_name)  missing.push('Business Name');
    if (missing.length > 0) {
      issues.push({
        id: r.id,
        business: r.business_name || 'Unknown',
        date: r.expense_date,
        total: r.total,
        missing,
        severity: missing.length >= 3 ? 'high' : missing.length === 2 ? 'medium' : 'low',
      });
    }
  });
  return issues;
};

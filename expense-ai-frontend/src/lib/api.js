const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lifewoodai-agent-v4-production.up.railway.app';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ── Analytics ──────────────────────────────────────────────────────────────
export const fetchSummary    = ()       => apiFetch('/api/billing/analytics/summary/');
export const fetchCategories = ()       => apiFetch('/api/billing/analytics/by-category/');
export const fetchTrends     = ()       => apiFetch('/api/billing/analytics/trends/');

// ── Receipts ───────────────────────────────────────────────────────────────
export const fetchReceipts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/billing/receipts/${qs ? '?' + qs : ''}`);
};

// ── Chat ───────────────────────────────────────────────────────────────────
export const fetchConversations = () => apiFetch('/api/billing/chat/conversations/');

export const fetchHistory = (conversationId) =>
  apiFetch(`/api/billing/chat/history/?conversation_id=${conversationId}`);

export const sendMessage = (message, conversationId, history = []) =>
  apiFetch('/api/billing/chat/message/', {
    method: 'POST',
    body: JSON.stringify({ message, conversation_id: conversationId, history }),
  });

// ── Helpers ────────────────────────────────────────────────────────────────
export const formatPeso = (value) => {
  const num = parseFloat(value) || 0;
  return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
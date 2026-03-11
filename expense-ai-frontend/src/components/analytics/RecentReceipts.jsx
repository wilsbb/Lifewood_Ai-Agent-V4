import { useState } from 'react';
import { CATEGORY_LABELS, formatPeso } from '../../lib/api';

const cardStyle = {
  background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
  border: '1px solid #1f2937',
  borderRadius: '12px',
  padding: '24px',
};

const titleStyle = {
  fontFamily: "'Syne', sans-serif",
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#6b7280',
};

const VAT_BADGE = {
  vat:        { bg: '#064e3b', color: '#34d399', label: 'VAT' },
  non_vat:    { bg: '#1e1b4b', color: '#a78bfa', label: 'Non-VAT' },
  zero_rated: { bg: '#0c2a4a', color: '#60a5fa', label: 'Zero-Rated' },
  vat_exempt: { bg: '#2d1b0e', color: '#fb923c', label: 'Exempt' },
  unknown:    { bg: '#1f2937', color: '#9ca3af', label: '—' },
};

function Badge({ type }) {
  const b = VAT_BADGE[type] || VAT_BADGE.unknown;
  return (
    <span style={{
      background: b.bg,
      color: b.color,
      padding: '2px 8px',
      borderRadius: '20px',
      fontFamily: "'Syne', sans-serif",
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    }}>
      {b.label}
    </span>
  );
}

const COLS = [
  { key: 'expense_date',     label: 'Date' },
  { key: 'business_name',    label: 'Merchant' },
  { key: 'expense_category', label: 'Category' },
  { key: 'vat_type',         label: 'VAT' },
  { key: 'total',            label: 'Amount' },
];

export default function RecentReceipts({ receipts, loading }) {
  const [sortKey, setSortKey]   = useState('expense_date');
  const [sortDir, setSortDir]   = useState('desc');
  const [search,  setSearch]    = useState('');

  const handleSort = (key) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = (receipts || [])
    .filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (r.business_name || '').toLowerCase().includes(q) ||
        (r.expense_category || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'total') { va = parseFloat(va); vb = parseFloat(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={titleStyle}>Recent Receipts</div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search merchant, category…"
          style={{
            background: '#0a0e1a',
            border: '1px solid #1f2937',
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#f9fafb',
            fontFamily: "'Syne', sans-serif",
            fontSize: '12px',
            outline: 'none',
            width: '220px',
          }}
        />
      </div>

      {loading ? (
        <div style={{ height: '200px', background: '#1f2937', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => handleSort(c.key)}
                    style={{
                      textAlign: c.key === 'total' ? 'right' : 'left',
                      padding: '8px 12px',
                      fontFamily: "'Syne', sans-serif",
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: sortKey === c.key ? '#f59e0b' : '#4b5563',
                      cursor: 'pointer',
                      userSelect: 'none',
                      borderBottom: '1px solid #1f2937',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#4b5563', fontFamily: "'Syne', sans-serif", fontSize: '13px' }}>
                    {search ? 'No matching receipts' : 'No receipts yet'}
                  </td>
                </tr>
              ) : filtered.map((r, i) => (
                <tr
                  key={r.id || i}
                  style={{ borderBottom: '1px solid #111827' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {r.expense_date || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#f9fafb', fontWeight: 500 }}>
                      {r.business_name || 'Unknown'}
                    </div>
                    {r.description && (
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {r.description.slice(0, 50)}{r.description.length > 50 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: "'Syne', sans-serif", fontSize: '11px', color: '#9ca3af' }}>
                    {CATEGORY_LABELS[r.expense_category] || r.expense_category || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge type={r.vat_type} />
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>
                    {formatPeso(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
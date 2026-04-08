'use client';

import { useState } from 'react';
import { CATEGORY_LABELS, formatPeso } from '../../lib/api';

const cardStyle = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: 'var(--glass-shadow)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const titleStyle = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--lw-muted)',
};

const VAT_BADGE = {
  vat:        { bg: 'rgba(4,98,65,0.12)', color: '#046241', label: 'VAT' },
  non_vat:    { bg: 'rgba(193,113,16,0.12)', color: '#C17110', label: 'Non-VAT' },
  zero_rated: { bg: 'rgba(255,179,71,0.2)', color: '#C17110', label: 'Zero Rated' },
  vat_exempt: { bg: 'rgba(112,142,124,0.2)', color: '#133020', label: 'Exempt' },
  unknown:    { bg: 'rgba(112,142,124,0.12)', color: '#708E7C', label: '-' },
};

function Badge({ type }) {
  const b = VAT_BADGE[type] || VAT_BADGE.unknown;
  return (
    <span style={{
      background: b.bg,
      color: b.color,
      padding: '2px 8px',
      borderRadius: '20px',
      fontFamily: "'Manrope', sans-serif",
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
          placeholder="Search merchant, category..."
          style={{
            background: 'var(--lw-surface-alt)',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            padding: '7px 12px',
            color: 'var(--lw-text)',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '12px',
            outline: 'none',
            width: '100%',
            maxWidth: '220px',
          }}
        />
      </div>

      {loading ? (
        <div style={{ height: '200px', background: 'var(--lw-sea-salt)', borderRadius: '10px', animation: 'pulse 1.5s infinite' }} />
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
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: sortKey === c.key ? 'var(--lw-accent-deep)' : 'var(--lw-muted)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      borderBottom: '1px solid var(--lw-border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.label} {sortKey === c.key ? (sortDir === 'asc' ? 'ASC' : 'DESC') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--lw-muted)', fontFamily: "'Manrope', sans-serif", fontSize: '13px' }}>
                    {search ? 'No matching receipts' : 'No receipts yet'}
                  </td>
                </tr>
              ) : filtered.map((r, i) => (
                <tr
                  key={r.id || i}
                  style={{ borderBottom: '1px solid var(--lw-border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--lw-sea-salt)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontFamily: "'Manrope', sans-serif", fontSize: '12px', color: 'var(--lw-muted)', whiteSpace: 'nowrap' }}>
                    {r.expense_date || '-'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '13px', color: 'var(--lw-text)', fontWeight: 600 }}>
                      {r.business_name || 'Unknown'}
                    </div>
                    {r.description && (
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: 'var(--lw-muted)', marginTop: '2px' }}>
                        {r.description.slice(0, 50)}{r.description.length > 50 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: 'var(--lw-muted)' }}>
                    {CATEGORY_LABELS[r.expense_category] || r.expense_category || '-'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge type={r.vat_type} />
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'Manrope', sans-serif", fontSize: '13px', fontWeight: 700, color: 'var(--lw-accent-deep)', whiteSpace: 'nowrap' }}>
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

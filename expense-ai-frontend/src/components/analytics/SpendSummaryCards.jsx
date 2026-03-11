import { formatPeso } from '../../lib/api';

const cardStyle = {
  background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
  border: '1px solid #1f2937',
  borderRadius: '12px',
  padding: '24px',
  position: 'relative',
  overflow: 'hidden',
};

const accentLine = (color) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '3px',
  background: color,
  borderRadius: '12px 12px 0 0',
});

const labelStyle = {
  fontFamily: "'Syne', sans-serif",
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#6b7280',
  marginBottom: '8px',
};

const valueStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '28px',
  fontWeight: 700,
  color: '#f9fafb',
  lineHeight: 1.1,
};

const subStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '12px',
  marginTop: '8px',
};

export default function SpendSummaryCards({ summary, loading }) {
  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ ...cardStyle, animation: 'pulse 1.5s infinite' }}>
          <div style={{ height: '60px', background: '#1f2937', borderRadius: '8px' }} />
        </div>
      ))}
    </div>
  );

  const totalSpend      = parseFloat(summary?.total_spend || 0);
  const prevSpend       = parseFloat(summary?.prev_total_spend || 0);
  const totalVat        = parseFloat(summary?.total_vat || 0);
  const txCount         = summary?.transaction_count || 0;
  const avgTx           = parseFloat(summary?.avg_transaction || 0);
  const pctChange = summary?.vs_previous_period?.change_pct ?? null;
  const changeColor = pctChange === null ? '#9ca3af' : pctChange <= 0 ? '#10b981' : '#ef4444';
  const changeLabel = pctChange === null ? '—' : `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}% vs last month`;

  const cards = [
    {
      label: 'Total Spend',
      value: formatPeso(totalSpend),
      sub: <span style={{ color: changeColor }}>{changeLabel}</span>,
      accent: '#f59e0b',
      icon: '₱',
    },
    {
      label: 'VAT Paid',
      value: formatPeso(totalVat),
      sub: <span style={{ color: '#9ca3af' }}>
        {totalSpend > 0 ? ((totalVat / totalSpend) * 100).toFixed(1) : '0'}% of total spend
      </span>,
      accent: '#3b82f6',
      icon: '%',
    },
    {
      label: 'Transactions',
      value: txCount.toLocaleString(),
      sub: <span style={{ color: '#9ca3af' }}>receipts processed</span>,
      accent: '#10b981',
      icon: '#',
    },
    {
      label: 'Avg. Transaction',
      value: formatPeso(avgTx),
      sub: <span style={{ color: '#9ca3af' }}>
        {summary?.period_start ? `${summary.period_start} – ${summary.period_end}` : 'this period'}
      </span>,
      accent: '#8b5cf6',
      icon: '~',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {cards.map((c) => (
        <div key={c.label} style={cardStyle}>
          <div style={accentLine(c.accent)} />
          <div style={labelStyle}>{c.label}</div>
          <div style={valueStyle}>{c.value}</div>
          <div style={{ ...subStyle, color: '#9ca3af' }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
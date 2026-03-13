'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPeso } from '../../lib/api';

const cardStyle = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: '16px',
  padding: '22px',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: 'var(--glass-shadow)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const accentLine = (color) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '3px',
  background: color,
  borderRadius: '16px 16px 0 0',
});

const labelStyle = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--lw-muted)',
  marginBottom: '10px',
};

const valueStyle = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '26px',
  fontWeight: 700,
  color: 'var(--lw-text)',
  lineHeight: 1.1,
};

const subStyle = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '12px',
  marginTop: '8px',
  color: 'var(--lw-muted)',
};

function useCountUp(value, duration = 900) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = startRef.current || 0;
    const to = Number.isFinite(value) ? value : 0;
    const delta = to - from;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + delta * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startRef.current = to;
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return display;
}

export default function SpendSummaryCards({ summary, loading }) {
  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ ...cardStyle, animation: 'pulse 1.5s infinite' }}>
          <div style={{ height: '60px', background: 'var(--lw-sea-salt)', borderRadius: '8px' }} />
        </div>
      ))}
    </div>
  );

  const totalSpend      = parseFloat(summary?.total_spend || 0);
  const totalVat        = parseFloat(summary?.total_vat || 0);
  const txCount         = summary?.transaction_count || 0;
  const avgTx           = parseFloat(summary?.avg_transaction || 0);
  const pctChange = summary?.vs_previous_period?.change_pct ?? null;
  const changeColor = pctChange === null ? 'var(--lw-muted)' : pctChange <= 0 ? '#046241' : '#C17110';
  const changeLabel = pctChange === null ? 'n/a' : `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}% vs last month`;

  const animTotalSpend = useCountUp(totalSpend);
  const animTotalVat = useCountUp(totalVat);
  const animTxCount = useCountUp(txCount);
  const animAvgTx = useCountUp(avgTx);

  const cards = [
    {
      label: 'Total Spend',
      value: formatPeso(animTotalSpend),
      sub: <span style={{ color: changeColor }}>{changeLabel}</span>,
      accent: 'var(--lw-accent)',
    },
    {
      label: 'VAT Paid',
      value: formatPeso(animTotalVat),
      sub: <span style={{ color: 'var(--lw-muted)' }}>
        {totalSpend > 0 ? ((totalVat / totalSpend) * 100).toFixed(1) : '0'}% of total spend
      </span>,
      accent: 'var(--lw-green)',
    },
    {
      label: 'Transactions',
      value: Math.round(animTxCount).toLocaleString(),
      sub: <span style={{ color: 'var(--lw-muted)' }}>receipts processed</span>,
      accent: 'var(--lw-earth)',
    },
    {
      label: 'Avg. Transaction',
      value: formatPeso(animAvgTx),
      sub: <span style={{ color: 'var(--lw-muted)' }}>
        {summary?.period_start ? `${summary.period_start} - ${summary.period_end}` : 'this period'}
      </span>,
      accent: 'var(--lw-dark)',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {cards.map((c) => (
        <div key={c.label} style={cardStyle}>
          <div style={accentLine(c.accent)} />
          <div style={labelStyle}>{c.label}</div>
          <div style={valueStyle}>{c.value}</div>
          <div style={subStyle}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}


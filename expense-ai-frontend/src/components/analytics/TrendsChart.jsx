import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatPeso } from '../../lib/api';

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
  marginBottom: '20px',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '8px',
      padding: '10px 14px',
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
          color: p.color,
          fontWeight: 600,
        }}>
          {formatPeso(p.value)}
        </div>
      ))}
    </div>
  );
};

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function TrendsChart({ trends, loading }) {
  if (loading) return (
    <div style={cardStyle}>
      <div style={titleStyle}>Monthly Trends</div>
      <div style={{ height: '220px', background: '#1f2937', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  const monthly = trends?.monthly_trend || [];
  const data = monthly.map((m) => {
    const [year, month] = (m.month || '2026-01').split('-');
    return {
      month: MONTH_ABBR[(parseInt(month) || 1) - 1],
      total: parseFloat(m.total_spend || 0),
      vat: 0, // not returned per-month by the API — remove the VAT area or add to Django
    };
  });

  if (data.length === 0) return (
    <div style={cardStyle}>
      <div style={titleStyle}>Monthly Trends</div>
      <div style={{ textAlign: 'center', color: '#4b5563', padding: '60px 0', fontFamily: "'Syne', sans-serif", fontSize: '13px' }}>
        No trend data yet
      </div>
    </div>
  );

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={titleStyle}>Monthly Trends</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {[
            { label: 'Total Spend', color: '#f59e0b' },
            { label: 'VAT',         color: '#3b82f6' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '24px', height: '2px', background: l.color, borderRadius: '2px' }} />
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '10px', color: '#6b7280', letterSpacing: '0.08em' }}>
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradVat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#6b7280', fontSize: 11, fontFamily: "'Syne', sans-serif" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `₱${(v/1000).toFixed(0)}k` : `₱${v}`}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} fill="url(#gradTotal)" dot={false} />
          <Area type="monotone" dataKey="vat"   stroke="#3b82f6" strokeWidth={2} fill="url(#gradVat)"   dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
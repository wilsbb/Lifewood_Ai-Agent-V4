import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatPeso } from '../../lib/api';

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
  marginBottom: '20px',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--glass-bg-strong)',
      border: '1px solid var(--glass-border)',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: 'var(--glass-shadow)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: 'var(--lw-muted)', marginBottom: '6px' }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{
          fontFamily: "'Manrope', sans-serif",
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
      <div style={{ height: '220px', background: 'var(--lw-sea-salt)', borderRadius: '10px', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  const monthly = trends?.monthly_trend || [];
  const data = monthly.map((m) => {
    const [year, month] = (m.month || '2026-01').split('-');
    return {
      month: MONTH_ABBR[(parseInt(month, 10) || 1) - 1],
      total: parseFloat(m.total_spend || 0),
      vat: 0,
    };
  });

  if (data.length === 0) return (
    <div style={cardStyle}>
      <div style={titleStyle}>Monthly Trends</div>
      <div style={{ textAlign: 'center', color: 'var(--lw-muted)', padding: '60px 0', fontFamily: "'Manrope', sans-serif", fontSize: '13px' }}>
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
            { label: 'Total Spend', color: '#FFB347' },
            { label: 'VAT',         color: '#046241' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '24px', height: '2px', background: l.color, borderRadius: '2px' }} />
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px', color: 'var(--lw-muted)', letterSpacing: '0.08em' }}>
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
              <stop offset="5%"  stopColor="#FFB347" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#FFB347" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradVat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#046241" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#046241" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(4,98,65,0.2)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--lw-muted)', fontSize: 11, fontFamily: "'Manrope', sans-serif" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--lw-muted)', fontSize: 10, fontFamily: "'Manrope', sans-serif" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `PHP ${(v/1000).toFixed(0)}k` : `PHP ${v}`}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="total" stroke="#FFB347" strokeWidth={2} fill="url(#gradTotal)" dot={false} />
          <Area type="monotone" dataKey="vat"   stroke="#046241" strokeWidth={2} fill="url(#gradVat)"   dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

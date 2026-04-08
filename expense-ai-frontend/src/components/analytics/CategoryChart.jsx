import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CATEGORY_LABELS, formatPeso } from '../../lib/api';

const BRAND_COLORS = [
  '#FFB347',
  '#FFC370',
  '#F4D0A4',
  '#C17110',
  '#E89131',
  '#046241',
  '#708E7C',
  '#9CAFA4',
  '#133020',
];

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

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: 'var(--glass-bg-strong)',
      border: '1px solid var(--glass-border)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontFamily: "'Manrope', sans-serif",
      fontSize: '12px',
      color: 'var(--lw-text)',
      boxShadow: 'var(--glass-shadow)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <div style={{ color: d.payload.fill, fontWeight: 700, marginBottom: '4px' }}>{d.name}</div>
      <div>{formatPeso(d.value)}</div>
      <div style={{ color: 'var(--lw-muted)' }}>{d.payload.count} receipt{d.payload.count !== 1 ? 's' : ''}</div>
    </div>
  );
};

const CustomLegend = ({ data }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
    {data.map((entry, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: entry.fill, flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: '11px',
          color: 'var(--lw-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '140px',
        }}>
          {entry.name}
        </span>
        <span style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: '11px',
          color: 'var(--lw-text)',
          fontWeight: 700,
          marginLeft: 'auto',
        }}>
          {entry.pct}%
        </span>
      </div>
    ))}
  </div>
);

export default function CategoryChart({ categories, loading }) {
  if (loading) return (
    <div style={cardStyle}>
      <div style={titleStyle}>Spend by Category</div>
      <div style={{ height: '260px', background: 'var(--lw-sea-salt)', borderRadius: '10px', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  // FIX: use total_spend (the correct field from the API) consistently
  const grandTotal = (categories || []).reduce((s, c) => s + parseFloat(c.total_spend || 0), 0);

  const data = (categories || [])
    .map((c, i) => ({
      name: CATEGORY_LABELS[c.category] || c.category,
      value: parseFloat(c.total_spend || 0),
      count: c.transaction_count || 0,
      fill: BRAND_COLORS[i % BRAND_COLORS.length],
      pct: grandTotal > 0
        ? ((parseFloat(c.total_spend || 0) / grandTotal) * 100).toFixed(1)
        : '0.0',
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (data.length === 0) return (
    <div style={cardStyle}>
      <div style={titleStyle}>Spend by Category</div>
      <div style={{ textAlign: 'center', color: 'var(--lw-muted)', padding: '60px 0', fontFamily: "'Manrope', sans-serif", fontSize: '13px' }}>
        No category data yet
      </div>
    </div>
  );

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>Spend by Category</div>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ flex: '0 0 200px', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CustomLegend data={data} />
        </div>
      </div>
    </div>
  );
}
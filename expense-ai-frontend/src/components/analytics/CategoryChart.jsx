import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CATEGORY_LABELS, CATEGORY_COLORS, formatPeso } from '../../lib/api';

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

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '8px',
      padding: '10px 14px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: '#f9fafb',
    }}>
      <div style={{ color: d.payload.fill, fontWeight: 700, marginBottom: '4px' }}>{d.name}</div>
      <div>{formatPeso(d.value)}</div>
      <div style={{ color: '#9ca3af' }}>{d.payload.count} receipt{d.payload.count !== 1 ? 's' : ''}</div>
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
          fontFamily: "'Syne', sans-serif",
          fontSize: '11px',
          color: '#9ca3af',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '120px',
        }}>
          {entry.name}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: '#f9fafb',
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
      <div style={{ height: '260px', background: '#1f2937', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  const total = categories?.reduce((s, c) => s + parseFloat(c.total || 0), 0) || 0;

  const data = (categories || [])
    .map((c, i) => ({
      name: CATEGORY_LABELS[c.category] || c.category,
      value: parseFloat(c.total_spend || 0),
      count: c.transaction_count || 0,
      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      pct: total > 0 ? ((parseFloat(c.total) / total) * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (data.length === 0) return (
    <div style={cardStyle}>
      <div style={titleStyle}>Spend by Category</div>
      <div style={{ textAlign: 'center', color: '#4b5563', padding: '60px 0', fontFamily: "'Syne', sans-serif", fontSize: '13px' }}>
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
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lifewoodai-agent-v4-production.up.railway.app';
const LOGO_URL = 'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png?width=1519&height=429';

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  green:    '#046241',
  greenDk:  '#133020',
  accent:   '#FFB347',
  amber:    '#C17110',
  paper:    '#F5EEDB',
  white:    '#FFFFFF',
  muted:    '#708E7C',
  border:   'rgba(19,48,32,0.10)',
  red:      '#DC2626',
  blue:     '#2563EB',
  purple:   '#7C3AED',
  PALETTE:  ['#FFB347','#046241','#C17110','#133020','#708E7C','#FFC370','#9CAFA4','#E89131','#F4D0A4'],
};

const card = {
  background:     'rgba(255,255,255,0.88)',
  border:         `1px solid ${T.border}`,
  borderRadius:   '18px',
  boxShadow:      '0 8px 24px rgba(19,48,32,0.08)',
  backdropFilter: 'blur(12px)',
  padding:        '24px',
};

const label = {
  fontFamily:    "'Manrope', sans-serif",
  fontSize:      '10px',
  fontWeight:    700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color:         T.muted,
};

function php(v) {
  const n = parseFloat(v) || 0;
  return 'PHP ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(v) { return `${parseFloat(v || 0).toFixed(1)}%`; }

// ── API helper ─────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const r = await fetch(`${BASE_URL}${path}`, { credentials: 'include' });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

// ── Sub-components ─────────────────────────────────────────────────────────
function Skeleton({ h = 120 }) {
  return (
    <div style={{
      height: h, borderRadius: 12,
      background: 'linear-gradient(90deg, rgba(19,48,32,0.06) 25%, rgba(19,48,32,0.03) 50%, rgba(19,48,32,0.06) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function SectionHeader({ title, subtitle, icon }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <h2 style={{ margin: 0, fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: T.greenDk, letterSpacing: '-0.02em' }}>
          {title}
        </h2>
      </div>
      {subtitle && <p style={{ margin: '4px 0 0 28px', fontFamily: "'Manrope', sans-serif", fontSize: 12, color: T.muted }}>{subtitle}</p>}
    </div>
  );
}

function KPICard({ id, label: lbl, value, format, change, trend, alert: isAlert, loading }) {
  const formatted = format === 'currency' ? php(value)
    : format === 'percentage' ? pct(value)
    : (value ?? 0).toLocaleString();

  const alertColor = isAlert ? T.red : T.green;
  const accentLine = {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    borderRadius: '18px 18px 0 0',
    background: isAlert
      ? `linear-gradient(90deg, ${T.red}, rgba(220,38,38,0.4))`
      : `linear-gradient(90deg, ${T.green}, ${T.accent})`,
  };

  return (
    <div style={{ ...card, position: 'relative', overflow: 'hidden', minHeight: 110 }}>
      <div style={accentLine} />
      {loading ? <Skeleton h={70} /> : (
        <>
          <div style={{ ...label, marginBottom: 10 }}>{lbl}</div>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 26, fontWeight: 700, color: T.greenDk, lineHeight: 1.1 }}>
            {formatted}
          </div>
          {change != null && (
            <div style={{ marginTop: 8, fontFamily: "'Manrope', sans-serif", fontSize: 12, color: change > 0 ? T.red : T.green, fontWeight: 600 }}>
              {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% vs last month
            </div>
          )}
          {isAlert && (
            <div style={{
              position: 'absolute', top: 14, right: 14,
              width: 8, height: 8, borderRadius: '50%',
              background: T.red, boxShadow: `0 0 0 3px rgba(220,38,38,0.2)`,
            }} />
          )}
        </>
      )}
    </div>
  );
}

function RiskGauge({ score, loading }) {
  const color = score > 40 ? T.red : score > 20 ? T.amber : score > 5 ? '#F59E0B' : T.green;
  const level = score > 40 ? 'CRITICAL' : score > 20 ? 'HIGH' : score > 5 ? 'MEDIUM' : 'LOW';
  const rotation = -135 + (score / 100) * 270;

  return (
    <div style={{ ...card }}>
      <div style={label}>Risk Score</div>
      {loading ? <Skeleton h={160} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
          <div style={{ position: 'relative', width: 160, height: 90 }}>
            {/* Arc background */}
            <svg viewBox="0 0 160 90" style={{ width: '100%' }}>
              <path d="M 16 80 A 64 64 0 0 1 144 80" fill="none" stroke="rgba(19,48,32,0.08)" strokeWidth="14" strokeLinecap="round"/>
              <path d="M 16 80 A 64 64 0 0 1 144 80" fill="none" stroke={color} strokeWidth="14"
                strokeLinecap="round" strokeDasharray={`${(score / 100) * 201} 201`} opacity="0.85"/>
            </svg>
            {/* Needle */}
            <div style={{
              position: 'absolute', bottom: 0, left: '50%',
              transformOrigin: 'bottom center',
              transform: `translateX(-50%) rotate(${rotation}deg)`,
              width: 2, height: 56,
              background: color, borderRadius: 2,
              transition: 'transform 1s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
            <div style={{
              position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
              width: 12, height: 12, borderRadius: '50%', background: color,
            }} />
          </div>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 32, fontWeight: 800, color, marginTop: 8 }}>
            {score.toFixed(1)}
          </div>
          <div style={{
            marginTop: 4, padding: '3px 12px', borderRadius: 20,
            background: `${color}18`, border: `1px solid ${color}40`,
            fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700, color,
          }}>
            {level} RISK
          </div>
        </div>
      )}
    </div>
  );
}

function ComplianceRadar({ fieldCompletion, loading }) {
  if (loading) return <div style={card}><Skeleton h={240} /></div>;
  const data = Object.entries(fieldCompletion || {}).map(([k, v]) => ({
    field: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    rate:  v.rate_pct,
  }));
  return (
    <div style={card}>
      <div style={label}>BIR Field Completion Rates</div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(19,48,32,0.1)" />
          <PolarAngleAxis dataKey="field" tick={{ fontSize: 10, fontFamily: "'Manrope', sans-serif", fill: T.muted }} />
          <Radar name="Completion %" dataKey="rate" stroke={T.green} fill={T.green} fillOpacity={0.2} strokeWidth={2} />
          <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SpendTrendChart({ data, loading }) {
  if (loading) return <div style={card}><Skeleton h={220} /></div>;
  return (
    <div style={card}>
      <div style={label}>12-Month Cash Outflow Trend</div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={T.accent} stopOpacity={0.3} />
              <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradVat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={T.green} stopOpacity={0.25} />
              <stop offset="95%" stopColor={T.green} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,48,32,0.07)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false}
            tickFormatter={v => v >= 1000 ? `₱${(v/1000).toFixed(0)}k` : `₱${v}`} width={56} />
          <Tooltip
            formatter={(v, n) => [php(v), n === 'outflow' ? 'Outflow' : 'VAT']}
            contentStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, borderRadius: 10, border: `1px solid ${T.border}` }}
          />
          <Area type="monotone" dataKey="outflow" stroke={T.accent} strokeWidth={2} fill="url(#gradSpend)" name="outflow" />
          <Area type="monotone" dataKey="vat"     stroke={T.green} strokeWidth={2} fill="url(#gradVat)"   name="vat" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PortfolioTreemap({ folders, loading }) {
  if (loading) return <div style={card}><Skeleton h={240} /></div>;
  const total = folders.reduce((s, f) => s + parseFloat(f.total), 0);
  return (
    <div style={card}>
      <div style={label}>Portfolio Distribution by Folder</div>
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(folders || []).slice(0, 12).map((f, i) => {
          const pctVal = parseFloat(f.pct_of_portfolio);
          const minW   = Math.max(pctVal * 2.8, 60);
          return (
            <div key={i} style={{
              minWidth: minW,
              flex:     `${pctVal} 0 auto`,
              background: T.PALETTE[i % T.PALETTE.length] + '22',
              border:     `1px solid ${T.PALETTE[i % T.PALETTE.length]}55`,
              borderLeft: `3px solid ${T.PALETTE[i % T.PALETTE.length]}`,
              borderRadius: 10,
              padding: '10px 12px',
              cursor: 'default',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            title={`${f.folder}\n${php(f.total)}\n${f.count} receipts`}
            >
              <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 700, color: T.greenDk, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.folder}
              </div>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: T.amber, fontWeight: 700, marginTop: 4 }}>
                {pct(f.pct_of_portfolio)}
              </div>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: T.muted, marginTop: 2 }}>
                {php(f.total)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnomalyTable({ items, loading }) {
  if (loading) return <div style={card}><Skeleton h={160} /></div>;
  if (!items?.length) return (
    <div style={{ ...card, textAlign: 'center', color: T.muted, fontFamily: "'Manrope', sans-serif", fontSize: 13, padding: '32px 24px' }}>
      ✓ No anomalous transactions detected
    </div>
  );
  return (
    <div style={card}>
      <div style={{ ...label, marginBottom: 14, color: T.red }}>⚠ Anomalous Transactions (Z-score &gt; 2.5σ)</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Manrope', sans-serif", fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(220,38,38,0.06)' }}>
              {['Date', 'Business', 'Folder', 'Amount', 'Z-Score'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: T.muted, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '9px 12px', color: T.muted }}>{r.expense_date || '—'}</td>
                <td style={{ padding: '9px 12px', fontWeight: 600, color: T.greenDk }}>{r.business_name || '—'}</td>
                <td style={{ padding: '9px 12px', color: T.muted }}>{r.folder || '—'}</td>
                <td style={{ padding: '9px 12px', color: T.amber, fontWeight: 700, textAlign: 'right' }}>{php(r.total)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20,
                    background: r.z_score > 4 ? 'rgba(220,38,38,0.12)' : 'rgba(193,113,16,0.12)',
                    color:      r.z_score > 4 ? T.red : T.amber,
                    fontWeight: 700,
                  }}>
                    {r.z_score}σ
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BurnRateCards({ burnRate, rolling, projection, loading }) {
  const items = [
    { label: '30-Day Daily Burn', value: php(burnRate?.['30d_daily']),     sub: `${php(rolling?.['30d'])} total` },
    { label: '90-Day Daily Burn', value: php(burnRate?.['90d_daily']),     sub: `${php(rolling?.['90d'])} total` },
    { label: '6-Mo Daily Burn',   value: php(burnRate?.['180d_daily']),    sub: `${php(rolling?.['180d'])} total` },
    { label: 'Next Month (Est.)', value: projection ? php(projection) : '—', sub: 'Linear projection' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {items.map((it, i) => (
        <div key={i} style={{ ...card, padding: 16 }}>
          {loading ? <Skeleton h={60} /> : (
            <>
              <div style={label}>{it.label}</div>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 20, fontWeight: 700, color: T.greenDk, marginTop: 8 }}>{it.value}</div>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: T.muted, marginTop: 4 }}>{it.sub}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function MissingFieldsBar({ fields, loading }) {
  if (loading) return <Skeleton h={140} />;
  const data = Object.entries(fields || {}).map(([k, v]) => ({
    name:    k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    missing: v.missing,
    present: v.present,
    rate:    v.rate_pct,
  })).sort((a, b) => b.missing - a.missing);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,48,32,0.07)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: T.muted, fontFamily: "'Manrope', sans-serif" }} axisLine={false} tickLine={false} width={96} />
        <Tooltip
          formatter={(v, n) => [v, n === 'missing' ? 'Missing' : 'Present']}
          contentStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, borderRadius: 10 }}
        />
        <Bar dataKey="present" fill={T.green}  opacity={0.7} radius={[0,4,4,0]} stackId="a" />
        <Bar dataKey="missing" fill={T.red}    opacity={0.7} radius={[0,4,4,0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function NavTab({ label, active, onClick, alert }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px',
      borderRadius: 10,
      border: active ? `1px solid ${T.green}` : '1px solid transparent',
      background: active ? T.green : 'transparent',
      color: active ? '#fff' : T.muted,
      fontFamily: "'Manrope', sans-serif",
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.15s',
      position: 'relative',
    }}>
      {label}
      {alert && !active && (
        <span style={{
          position: 'absolute', top: 5, right: 5,
          width: 6, height: 6, borderRadius: '50%', background: T.red,
        }} />
      )}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
const TABS = ['Executive', 'Risk', 'Cash Flow', 'Portfolio', 'Compliance', 'Performance'];

export default function AnalyticsDashboard() {
  const [activeTab,   setActiveTab]   = useState('Executive');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const [executive,    setExecutive]    = useState(null);
  const [risk,         setRisk]         = useState(null);
  const [cashflow,     setCashflow]     = useState(null);
  const [portfolio,    setPortfolio]    = useState(null);
  const [compliance,   setCompliance]   = useState(null);
  const [performance,  setPerformance]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ex, ri, cf, po, co, pe] = await Promise.all([
        apiFetch('/api/billing/analytics/executive/'),
        apiFetch('/api/billing/analytics/risk/'),
        apiFetch('/api/billing/analytics/cashflow/'),
        apiFetch('/api/billing/analytics/portfolio/'),
        apiFetch('/api/billing/analytics/compliance/'),
        apiFetch('/api/billing/analytics/performance/'),
      ]);
      setExecutive(ex);   setRisk(ri);        setCashflow(cf);
      setPortfolio(po);   setCompliance(co);  setPerformance(pe);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasRiskAlert      = risk?.summary?.risk_level === 'high' || risk?.summary?.risk_level === 'critical';
  const hasComplianceAlert = compliance && compliance.compliance_score < 80;

  return (
    <div style={{
      minHeight: '100vh',
      background: T.paper,
      backgroundImage: `
        radial-gradient(ellipse 60% 40% at 10% -5%, rgba(255,179,71,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 70% 50% at 90% 110%, rgba(4,98,65,0.14) 0%, transparent 55%)
      `,
      fontFamily: "'Manrope', sans-serif",
    }}>
      {/* ── Navbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        padding: '0 32px',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 0 rgba(19,48,32,0.06), 0 4px 16px rgba(19,48,32,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={LOGO_URL} alt="Lifewood" style={{ height: 32 }} />
          </a>
          <div style={{ width: 1, height: 24, background: T.border }} />
          <div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 800, color: T.greenDk }}>Financial Analytics</div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: T.muted }}>
              {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}` : 'Loading…'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="/dashboard" style={{
            padding: '7px 16px', borderRadius: 10,
            background: T.greenDk, color: '#fff',
            fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 700,
            textDecoration: 'none',
          }}>
            ← Expense Dashboard
          </a>
          <button onClick={load} disabled={loading} style={{
            padding: '7px 16px', borderRadius: 10,
            background: loading ? 'rgba(19,48,32,0.08)' : T.accent,
            color: loading ? T.muted : T.greenDk,
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 700,
            transition: 'all 0.15s',
          }}>
            {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
          </button>
        </div>
      </nav>

      {/* ── Tab nav ── */}
      <div style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${T.border}`,
        padding: '12px 32px',
        display: 'flex', gap: 6, overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <NavTab
            key={tab}
            label={tab}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            alert={(tab === 'Risk' && hasRiskAlert) || (tab === 'Compliance' && hasComplianceAlert)}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 28px 80px' }}>

        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 20,
            fontFamily: "'Manrope', sans-serif", fontSize: 13, color: T.red,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>⚠ Could not load analytics: {error}</span>
            <button onClick={load} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', fontSize: 12 }}>Retry</button>
          </div>
        )}

        {/* ══════════════════════════════════════════ EXECUTIVE ══ */}
        {activeTab === 'Executive' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionHeader title="Executive Summary" subtitle="Real-time KPIs and company financial health at a glance" icon="📊" />

            {/* KPI grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {(executive?.kpi_cards || Array(6).fill({})).map((kpi, i) => (
                <KPICard key={i} {...kpi} loading={loading} />
              ))}
            </div>

            {/* Sparkline + top folder */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
              <div style={card}>
                <div style={label}>6-Month Spend Sparkline</div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={executive?.spend_sparkline || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.accent} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={v => [php(v), 'Spend']} contentStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, borderRadius: 10 }} />
                    <Area type="monotone" dataKey="total" stroke={T.accent} strokeWidth={2.5} fill="url(#execGrad)" dot={{ r: 3, fill: T.accent }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ ...card, flex: 1 }}>
                  <div style={label}>Top Folder This Month</div>
                  {loading ? <Skeleton h={50} /> : (
                    <>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 800, color: T.greenDk, marginTop: 10 }}>
                        {executive?.top_folder_this_month?.name || '—'}
                      </div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, color: T.amber, fontWeight: 700, marginTop: 4 }}>
                        {php(executive?.top_folder_this_month?.total)}
                      </div>
                    </>
                  )}
                </div>
                <div style={{ ...card, flex: 1 }}>
                  <div style={label}>Prev Month Total</div>
                  {loading ? <Skeleton h={50} /> : (
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 700, color: T.muted, marginTop: 10 }}>
                      {php(executive?.prev_month_total)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════ RISK ══ */}
        {activeTab === 'Risk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionHeader title="Risk Analytics" subtitle="BIR compliance risk, anomaly detection, vendor concentration, and budget overruns" icon="⚠️" />

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 14 }}>
              <RiskGauge score={risk?.summary?.risk_score || 0} loading={loading} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Total Receipts',   value: risk?.summary?.total_receipts  || 0, fmt: 'integer' },
                  { label: 'Compliant',         value: risk?.summary?.compliant       || 0, fmt: 'integer' },
                  { label: 'Non-Compliant',     value: risk?.summary?.non_compliant   || 0, fmt: 'integer', alert: (risk?.summary?.non_compliant || 0) > 0 },
                  { label: 'Missing TIN',       value: risk?.missing_fields?.tin      || 0, fmt: 'integer', alert: (risk?.missing_fields?.tin || 0) > 0 },
                  { label: 'Missing Receipt #', value: risk?.missing_fields?.receipt_number || 0, fmt: 'integer', alert: (risk?.missing_fields?.receipt_number || 0) > 0 },
                  { label: 'Missing BIR Permit',value: risk?.missing_fields?.bir_permit || 0, fmt: 'integer', alert: (risk?.missing_fields?.bir_permit || 0) > 0 },
                ].map((item, i) => (
                  <div key={i} style={{ ...card, padding: 16 }}>
                    {loading ? <Skeleton h={50} /> : (
                      <>
                        <div style={label}>{item.label}</div>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 22, fontWeight: 700, color: item.alert ? T.red : T.greenDk, marginTop: 8 }}>
                          {item.value.toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Amount stats */}
            {!loading && risk?.amount_stats && (
              <div style={{ ...card }}>
                <div style={label}>Statistical Distribution of Transaction Amounts</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 16 }}>
                  {[
                    { label: 'Average',           value: php(risk.amount_stats.average) },
                    { label: 'Std Deviation',     value: php(risk.amount_stats.std_dev) },
                    { label: 'Minimum',           value: php(risk.amount_stats.min) },
                    { label: 'Maximum',           value: php(risk.amount_stats.max) },
                  ].map((s, i) => (
                    <div key={i}>
                      <div style={label}>{s.label}</div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 700, color: T.greenDk, marginTop: 4 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {risk.amount_stats.anomaly_threshold && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(220,38,38,0.06)', borderRadius: 10, fontFamily: "'Manrope', sans-serif", fontSize: 12, color: T.red }}>
                    ⚠ Anomaly threshold: {php(risk.amount_stats.anomaly_threshold)} (avg + 2.5σ)
                  </div>
                )}
              </div>
            )}

            <AnomalyTable items={risk?.anomalous_transactions || []} loading={loading} />

            {/* Category risk */}
            {!loading && risk?.category_risk?.length > 0 && (
              <div style={card}>
                <div style={label}>Category Concentration Risk</div>
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {risk.category_risk.map((c, i) => {
                    const barColor = c.risk_level === 'high' ? T.red : c.risk_level === 'medium' ? T.amber : T.green;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, width: 180, flexShrink: 0, color: T.greenDk, fontWeight: 600 }}>
                          {c.folder}
                        </div>
                        <div style={{ flex: 1, height: 8, background: 'rgba(19,48,32,0.08)', borderRadius: 4 }}>
                          <div style={{ height: '100%', width: `${c.pct_of_spend}%`, background: barColor, borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, width: 48, textAlign: 'right', color: barColor, fontWeight: 700 }}>
                          {c.pct_of_spend}%
                        </div>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${barColor}18`, color: barColor, fontWeight: 700, fontFamily: "'Manrope', sans-serif" }}>
                          {c.risk_level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Budget alerts */}
            {!loading && risk?.budget_alerts?.length > 0 && (
              <div style={{ ...card, borderLeft: `3px solid ${T.red}` }}>
                <div style={{ ...label, color: T.red, marginBottom: 12 }}>🚨 Budget Overrun Alerts</div>
                {risk.budget_alerts.map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < risk.budget_alerts.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                    <div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, color: T.greenDk }}>{b.folder}</div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: T.muted, marginTop: 2 }}>Budget: {php(b.budgeted)} · Actual: {php(b.actual)}</div>
                    </div>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: T.red }}>
                      +{b.overrun_pct}% over
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════ CASH FLOW ══ */}
        {activeTab === 'Cash Flow' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionHeader title="Cash Flow & Liquidity" subtitle="Rolling outflow windows, burn rate, monthly trend, and next-month projections" icon="💵" />

            <BurnRateCards
              burnRate={cashflow?.burn_rate}
              rolling={cashflow?.rolling_windows}
              projection={cashflow?.next_month_projection}
              loading={loading}
            />

            <SpendTrendChart data={cashflow?.monthly_trend || []} loading={loading} />

            {/* Current month status */}
            {!loading && cashflow?.current_month && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {[
                  { label: 'Spend To Date',        value: php(cashflow.current_month.outflow_to_date) },
                  { label: 'Days Elapsed',          value: cashflow.current_month.days_elapsed + ' days' },
                  { label: 'Projected Full Month',  value: php(cashflow.current_month.projected_full_month) },
                ].map((item, i) => (
                  <div key={i} style={{ ...card, padding: 16 }}>
                    <div style={label}>{item.label}</div>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 22, fontWeight: 700, color: T.greenDk, marginTop: 8 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* VAT obligation schedule */}
            {!loading && cashflow?.vat_obligation_schedule?.length > 0 && (
              <div style={card}>
                <div style={label}>VAT Obligation Schedule (Monthly)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={cashflow.vat_obligation_schedule} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,48,32,0.07)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false}
                      tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} width={48} />
                    <Tooltip formatter={v => [php(v), 'VAT']} contentStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, borderRadius: 10 }} />
                    <Bar dataKey="vat_payable" fill={T.green} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top spending days */}
            {!loading && cashflow?.top_spending_days?.length > 0 && (
              <div style={card}>
                <div style={label}>Highest Single-Day Outlays (Last 90 Days)</div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cashflow.top_spending_days.slice(0, 8).map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: T.muted, width: 100, flexShrink: 0 }}>{d.date}</div>
                      <div style={{ flex: 1, height: 6, background: 'rgba(19,48,32,0.06)', borderRadius: 3 }}>
                        <div style={{
                          height: '100%',
                          width: `${(parseFloat(d.total) / parseFloat(cashflow.top_spending_days[0].total)) * 100}%`,
                          background: T.accent, borderRadius: 3,
                        }} />
                      </div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, color: T.amber, width: 120, textAlign: 'right' }}>{php(d.total)}</div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: T.muted, width: 60, textAlign: 'right' }}>{d.count} receipts</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════ PORTFOLIO ══ */}
        {activeTab === 'Portfolio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionHeader title="Portfolio Analytics" subtitle="Expense folder portfolio distribution, VAT breakdown, vendor diversity, and growth analysis" icon="📁" />

            {/* Summary cards */}
            {!loading && portfolio?.portfolio_summary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Total Spend',       value: php(portfolio.portfolio_summary.total_spend) },
                  { label: 'Total VAT',          value: php(portfolio.portfolio_summary.total_vat) },
                  { label: 'Active Folders',     value: portfolio.portfolio_summary.total_folders },
                  { label: 'Unique Vendors',     value: portfolio.portfolio_summary.total_vendors },
                  { label: 'Total Receipts',     value: portfolio.portfolio_summary.total_receipts },
                  { label: 'Vendor Diversity',   value: portfolio.portfolio_summary.vendor_diversity?.toUpperCase() },
                ].map((s, i) => (
                  <div key={i} style={{ ...card, padding: 16 }}>
                    <div style={label}>{s.label}</div>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 700, color: T.greenDk, marginTop: 8 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            <PortfolioTreemap folders={portfolio?.folder_portfolio || []} loading={loading} />

            {/* Folder performance table */}
            {!loading && portfolio?.folder_portfolio?.length > 0 && (
              <div style={card}>
                <div style={label}>Folder Portfolio Breakdown</div>
                <div style={{ overflowX: 'auto', marginTop: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Manrope', sans-serif", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Folder', 'Total Spend', 'VAT', 'Receipts', 'Avg Tx', 'Vendors', 'Share', 'Growth', 'VAT Rate'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: T.muted, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.folder_portfolio.map((f, i) => (
                        <tr key={i}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(19,48,32,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          style={{ borderBottom: `1px solid ${T.border}` }}
                        >
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: T.greenDk }}>{f.folder}</td>
                          <td style={{ padding: '10px 12px', color: T.amber, fontWeight: 700 }}>{php(f.total)}</td>
                          <td style={{ padding: '10px 12px', color: T.muted }}>{php(f.vat)}</td>
                          <td style={{ padding: '10px 12px', color: T.muted }}>{f.count}</td>
                          <td style={{ padding: '10px 12px', color: T.muted }}>{php(f.avg_transaction)}</td>
                          <td style={{ padding: '10px 12px', color: T.muted }}>{f.unique_vendors}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 48, height: 4, background: 'rgba(19,48,32,0.08)', borderRadius: 2 }}>
                                <div style={{ height: '100%', width: `${f.pct_of_portfolio}%`, background: T.PALETTE[i % T.PALETTE.length], borderRadius: 2 }} />
                              </div>
                              <span style={{ color: T.muted }}>{f.pct_of_portfolio}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', color: f.growth_pct > 0 ? T.red : f.growth_pct < 0 ? T.green : T.muted, fontWeight: 700 }}>
                            {f.growth_pct != null ? `${f.growth_pct > 0 ? '+' : ''}${f.growth_pct}%` : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', color: T.muted }}>{f.vat_rate_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VAT breakdown pie */}
            {!loading && portfolio?.vat_breakdown?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={card}>
                  <div style={label}>VAT Type Distribution</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={portfolio.vat_breakdown} dataKey="count" nameKey="vat_type" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                        {portfolio.vat_breakdown.map((_, i) => <Cell key={i} fill={T.PALETTE[i % T.PALETTE.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v + ' receipts', n]} contentStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, borderRadius: 10 }} />
                      <Legend wrapperStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={card}>
                  <div style={label}>Document Type Mix</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={portfolio.document_type_mix} dataKey="count" nameKey="document_type" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                        {(portfolio.document_type_mix || []).map((_, i) => <Cell key={i} fill={T.PALETTE[i % T.PALETTE.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v + ' receipts', n]} contentStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, borderRadius: 10 }} />
                      <Legend wrapperStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════ COMPLIANCE ══ */}
        {activeTab === 'Compliance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionHeader title="BIR Compliance Reporting" subtitle="Philippine Bureau of Internal Revenue compliance tracking, field completion, and monthly audit trail" icon="📋" />

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 14 }}>
              {/* Score dial */}
              <div style={{ ...card, textAlign: 'center' }}>
                <div style={label}>Compliance Score</div>
                <div style={{ position: 'relative', display: 'inline-block', marginTop: 20 }}>
                  <svg viewBox="0 0 120 120" width={140} height={140}>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(19,48,32,0.08)" strokeWidth="12" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={compliance?.compliance_score >= 90 ? T.green : compliance?.compliance_score >= 70 ? T.amber : T.red}
                      strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={`${((compliance?.compliance_score || 0) / 100) * 314} 314`}
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                    <text x="60" y="58" textAnchor="middle" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 22, fontWeight: 800, fill: T.greenDk }}>
                      {loading ? '…' : `${(compliance?.compliance_score || 0).toFixed(0)}%`}
                    </text>
                    <text x="60" y="74" textAnchor="middle" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 9, fill: T.muted }}>
                      COMPLIANT
                    </text>
                  </svg>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 700, color: T.green }}>{compliance?.summary?.fully_compliant || 0}</div>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: T.muted }}>Compliant</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 700, color: T.red }}>{compliance?.summary?.non_compliant || 0}</div>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: T.muted }}>Issues</div>
                  </div>
                </div>
              </div>

              <ComplianceRadar fieldCompletion={compliance?.field_completion} loading={loading} />
            </div>

            {/* Missing fields bar */}
            <div style={card}>
              <div style={label}>BIR Field Completion (Stacked)</div>
              <MissingFieldsBar fields={compliance?.field_completion} loading={loading} />
            </div>

            {/* Monthly trend */}
            {!loading && compliance?.monthly_trend?.length > 0 && (
              <div style={card}>
                <div style={label}>Monthly Compliance Trend</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={compliance.monthly_trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.green} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,48,32,0.07)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={40} />
                    <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Compliance']} contentStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, borderRadius: 10 }} />
                    <Area type="monotone" dataKey="compliance_pct" stroke={T.green} strokeWidth={2} fill="url(#compGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Critical receipts */}
            {!loading && compliance?.critical_receipts?.length > 0 && (
              <div style={{ ...card, borderLeft: `3px solid ${T.red}` }}>
                <div style={{ ...label, color: T.red, marginBottom: 14 }}>🚨 Receipts Requiring Immediate BIR Attention</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Manrope', sans-serif", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Date', 'Business', 'Folder', 'Amount', 'Missing Fields'].map(h => (
                          <th key={h} style={{ padding: '7px 12px', textAlign: 'left', color: T.muted, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compliance.critical_receipts.map((r, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '9px 12px', color: T.muted }}>{r.expense_date || '—'}</td>
                          <td style={{ padding: '9px 12px', fontWeight: 600, color: T.greenDk }}>{r.business_name || 'Unknown'}</td>
                          <td style={{ padding: '9px 12px', color: T.muted }}>{r.drive_folder_name || '—'}</td>
                          <td style={{ padding: '9px 12px', color: T.amber, fontWeight: 700 }}>{php(r.total)}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {(r.missing || []).map((m, j) => (
                                <span key={j} style={{ padding: '2px 7px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', color: T.red, fontSize: 10, fontWeight: 700 }}>{m}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════ PERFORMANCE ══ */}
        {activeTab === 'Performance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionHeader title="Performance Analytics" subtitle="Processing velocity, OCR quality, folder month-over-month trends, and spending patterns" icon="📈" />

            {/* OCR + velocity KPIs */}
            {!loading && performance && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Receipts/Day',      value: performance.processing_velocity?.receipts_per_day || 0 },
                  { label: 'OCR Success Rate',   value: `${performance.ocr_quality?.success_rate_pct || 0}%` },
                  { label: 'Total Processed',    value: performance.ocr_quality?.processed || 0 },
                  { label: 'Needs Review',       value: performance.ocr_quality?.needs_review || 0 },
                  { label: 'Failed OCR',         value: performance.ocr_quality?.failed || 0 },
                  { label: 'Period Receipts',    value: performance.processing_velocity?.receipts_in_period || 0 },
                ].map((s, i) => (
                  <div key={i} style={{ ...card, padding: 16 }}>
                    <div style={label}>{s.label}</div>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 20, fontWeight: 700, color: T.greenDk, marginTop: 8 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Weekly volume bar */}
            {!loading && performance?.processing_velocity?.weekly_volume?.length > 0 && (
              <div style={card}>
                <div style={label}>Weekly Receipt Volume (Last 12 Weeks)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={performance.processing_velocity.weekly_volume} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,48,32,0.07)" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v, n) => [n === 'count' ? v + ' receipts' : php(v), n === 'count' ? 'Count' : 'Total']} contentStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, borderRadius: 10 }} />
                    <Bar dataKey="count" fill={T.green} radius={[4,4,0,0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Folder MoM */}
            {!loading && performance?.folder_mom_performance?.length > 0 && (
              <div style={card}>
                <div style={label}>Folder Month-over-Month Performance</div>
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {performance.folder_mom_performance.map((f, i) => {
                    const trendColor = f.trend === 'up' ? T.red : f.trend === 'down' ? T.green : T.muted;
                    const trendIcon  = f.trend === 'up' ? '▲' : f.trend === 'down' ? '▼' : '→';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: T.greenDk, width: 180, flexShrink: 0 }}>{f.folder}</div>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: T.muted, width: 100 }}>Prev: {php(f.previous_month)}</div>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 700, color: T.amber, flex: 1 }}>Curr: {php(f.current_month)}</div>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, color: trendColor, width: 80, textAlign: 'right' }}>
                          {trendIcon} {f.change_pct != null ? `${Math.abs(f.change_pct).toFixed(1)}%` : 'New'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Weekday pattern */}
            {!loading && performance?.weekday_pattern?.length > 0 && (
              <div style={card}>
                <div style={label}>Spending by Day of Week (Last 90 Days)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={performance.weekday_pattern} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,48,32,0.07)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false}
                      tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} width={48} />
                    <Tooltip formatter={(v, n) => [php(v), 'Spend']} contentStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, borderRadius: 10 }} />
                    <Bar dataKey="total" fill={T.accent} radius={[4,4,0,0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: ${T.paper}; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(4,98,65,0.18); border-radius: 3px; }
      `}</style>
    </div>
  );
}
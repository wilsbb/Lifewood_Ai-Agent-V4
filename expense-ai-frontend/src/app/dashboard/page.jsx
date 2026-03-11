'use client'; // Remove this line if using Next.js pages/ router instead of app/

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import SpendSummaryCards from '../../components/analytics/SpendSummaryCards';
import CategoryChart     from '../../components/analytics/CategoryChart';
import TrendsChart       from '../../components/analytics/TrendsChart';
import RecentReceipts    from '../../components/analytics/RecentReceipts';
import ComplianceAlerts  from '../../components/analytics/ComplianceAlerts';
import ChatPanel         from '../../components/chat/ChatPanel';
import {
  fetchSummary, fetchCategories, fetchTrends, fetchReceipts,
} from '../../lib/api';

// ── Layout constants ─────────────────────────────────────────────────────────
const PAGE = {
  minHeight: '100vh',
  background: '#050810',
  backgroundImage: `
    radial-gradient(ellipse 80% 50% at 20% -10%, rgba(245,158,11,0.06) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 110%, rgba(59,130,246,0.05) 0%, transparent 60%),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 39px,
      rgba(255,255,255,0.015) 39px,
      rgba(255,255,255,0.015) 40px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 39px,
      rgba(255,255,255,0.015) 39px,
      rgba(255,255,255,0.015) 40px
    )
  `,
  fontFamily: "'Syne', sans-serif",
  color: '#f9fafb',
};

const NAVBAR = {
  borderBottom: '1px solid #111827',
  background: 'rgba(5,8,16,0.8)',
  backdropFilter: 'blur(12px)',
  padding: '0 32px',
  height: '60px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const CONTENT = {
  maxWidth: '1280px',
  margin: '0 auto',
  padding: '32px 32px 120px',
};

// ── Period selector ───────────────────────────────────────────────────────────
const PERIODS = [
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: 'quarter' },
  { label: 'This Year', value: 'year' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [summary,    setSummary]    = useState(null);
  const [categories, setCategories] = useState([]);
  const [trends,     setTrends]     = useState(null);
  const [receipts,   setReceipts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [period,     setPeriod]     = useState('month');
  const [convId,     setConvId]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c, t, r] = await Promise.all([
        fetchSummary(),
        fetchCategories(),
        fetchTrends(),
        fetchReceipts({ limit: 50 }),
      ]);
      setSummary(s);
      setCategories(c.by_category || []);
      setTrends(t);
      setReceipts(r.receipts || r || []);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <>
      <Head>
        <title>Lifewood · Expense Dashboard</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div style={PAGE}>
        {/* Navbar */}
        <nav style={NAVBAR}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}>
              🌿
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Lifewood
            </span>
            <span style={{
              background: '#1f2937',
              color: '#9ca3af',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '20px',
            }}>
              Expense AI
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Period selector */}
            <div style={{ display: 'flex', gap: '4px', background: '#111827', borderRadius: '8px', padding: '3px' }}>
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: period === p.value ? '#1f2937' : 'transparent',
                    color: period === p.value ? '#f9fafb' : '#6b7280',
                    fontFamily: "'Syne', sans-serif",
                    fontSize: '12px',
                    fontWeight: period === p.value ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={load}
              disabled={loading}
              title={lastRefresh ? `Last refreshed: ${lastRefresh.toLocaleTimeString()}` : 'Refresh'}
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#9ca3af',
                fontFamily: "'Syne', sans-serif",
                fontSize: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.color = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            >
              <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↻</span>
              Refresh
            </button>
          </div>
        </nav>

        {/* Content */}
        <main style={CONTENT}>
          {/* Page title */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '28px',
              fontWeight: 800,
              color: '#f9fafb',
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              Expense Dashboard
            </h1>
            <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>
              {lastRefresh
                ? `Updated ${lastRefresh.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`
                : 'Loading data…'
              }
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '20px',
              fontFamily: "'Syne', sans-serif",
              fontSize: '13px',
              color: '#f87171',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>⚠️ Could not load data: {error}</span>
              <button
                onClick={load}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* KPI Cards */}
          <section style={{ marginBottom: '20px' }}>
            <SpendSummaryCards summary={summary} loading={loading} />
          </section>

          {/* Charts row */}
          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <CategoryChart categories={categories} loading={loading} />
            <TrendsChart   trends={trends}         loading={loading} />
          </section>

          {/* Compliance + Receipts */}
          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '16px',
          }}>
            <ComplianceAlerts receipts={receipts} loading={loading} />
            <RecentReceipts   receipts={receipts} loading={loading} />
          </section>
        </main>
      </div>

      {/* Floating AI Chat */}
      <ChatPanel
        conversationId={convId}
        onConversationCreate={setConvId}
      />

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #050810; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 2px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </>
  );
}
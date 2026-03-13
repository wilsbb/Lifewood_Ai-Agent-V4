'use client';

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

const LOGO_URL =
  'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png?width=1519&height=429';

const PAGE = {
  minHeight: '100vh',
  background: 'var(--lw-paper)',
  backgroundImage: `
    radial-gradient(ellipse 70% 45% at 18% -8%, rgba(255,179,71,0.22) 0%, transparent 62%),
    radial-gradient(ellipse 80% 55% at 88% 110%, rgba(4,98,65,0.18) 0%, transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 35%)
  `,
  fontFamily: "'Manrope', sans-serif",
  color: 'var(--lw-text)',
};

const NAVBAR = {
  borderBottom: '1px solid var(--lw-border)',
  background: 'var(--glass-bg-strong)',
  backdropFilter: 'blur(10px)',
  padding: 'var(--lw-navbar-padding)',
  minHeight: 'var(--lw-navbar-height)',
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
  padding: 'var(--lw-content-padding)',
};

const PERIODS = [
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: 'quarter' },
  { label: 'This Year', value: 'year' },
];

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

  useEffect(() => {
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <>
      <Head>
        <title>Lifewood - Expense Dashboard</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div style={PAGE}>
        <nav style={NAVBAR} className="lw-navbar">
          <div className="lw-navbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img alt="Lifewood" src={LOGO_URL} style={{ height: '36px', width: 'auto' }} />
          </div>

          <div style={{
            position: 'var(--lw-center-pos)',
            left: 'var(--lw-center-left)',
            transform: 'var(--lw-center-transform)',
            background: 'var(--lw-dark)',
            color: 'var(--lw-paper)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            padding: '6px 14px',
            borderRadius: '999px',
          }} className="lw-navbar-center">
            Expense AI
          </div>

          <div className="lw-navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a className="lw-back" href="/drive">
              Back to Drive
            </a>
            <div style={{
              display: 'flex',
              gap: '4px',
              background: 'var(--lw-surface)',
              borderRadius: '999px',
              padding: '4px',
              border: '1px solid var(--lw-border)',
            }}>
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    border: 'none',
                    background: period === p.value ? 'var(--lw-accent)' : 'transparent',
                    color: period === p.value ? 'var(--lw-dark)' : 'var(--lw-muted)',
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: '12px',
                    fontWeight: period === p.value ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              className="lw-refresh"
              onClick={load}
              disabled={loading}
              title={lastRefresh ? `Last refreshed: ${lastRefresh.toLocaleTimeString()}` : 'Refresh'}
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z" />
                <path
                  fillRule="evenodd"
                  d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"
                />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </nav>

        <main style={CONTENT}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--lw-text)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              Expense Dashboard
            </h1>
            <p style={{ color: 'var(--lw-muted)', fontSize: '13px', marginTop: '6px', marginBottom: 0 }}>
              {lastRefresh
                ? `Updated ${lastRefresh.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`
                : 'Loading data...'
              }
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(193,113,16,0.12)',
              border: '1px solid rgba(193,113,16,0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              fontFamily: "'Manrope', sans-serif",
              fontSize: '13px',
              color: 'var(--lw-text)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>Could not load data: {error}</span>
              <button
                onClick={load}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--lw-text)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '12px',
                }}
              >
                Retry
              </button>
            </div>
          )}

          <section style={{ marginBottom: '20px' }}>
            <SpendSummaryCards summary={summary} loading={loading} />
          </section>

          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--lw-card-min), 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <CategoryChart categories={categories} loading={loading} />
            <TrendsChart   trends={trends}         loading={loading} />
          </section>

          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--lw-card-min), 1fr))',
            gap: '16px',
          }}>
            <ComplianceAlerts receipts={receipts} loading={loading} />
            <RecentReceipts   receipts={receipts} loading={loading} />
          </section>
        </main>
      </div>

      <ChatPanel
        conversationId={convId}
        onConversationCreate={setConvId}
      />

      <style>{`
        :root {
          --lw-paper: #f5eedb;
          --lw-white: #ffffff;
          --lw-sea-salt: #F9F7F7;
          --lw-dark: #133020;
          --lw-green: #046241;
          --lw-accent: #FFB347;
          --lw-accent-deep: #C17110;
          --lw-earth: #FFC370;
          --lw-border: rgba(19,48,32,0.12);
          --lw-muted: #708E7C;
          --lw-text: #133020;
          --lw-surface: rgba(255,255,255,0.86);
          --lw-surface-alt: rgba(255,255,255,0.7);
          --lw-shadow-soft: 0 18px 40px rgba(19,48,32,0.12);
          --glass-bg: linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.62) 100%);
          --glass-bg-strong: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.82) 100%);
          --glass-border: rgba(255,255,255,0.65);
          --glass-shadow: 0 18px 45px rgba(19,48,32,0.16);
          --glass-highlight: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%);
          --lw-navbar-padding: 0 32px;
          --lw-navbar-height: 64px;
          --lw-content-padding: 32px 32px 120px;
          --lw-center-pos: absolute;
          --lw-center-left: 50%;
          --lw-center-transform: translateX(-50%);
          --lw-card-min: 340px;
          --lw-chat-width: 380px;
          --lw-chat-height: 580px;
          --lw-chat-right: 28px;
          --lw-chat-bottom: 96px;
          --lw-fab-right: 28px;
          --lw-fab-bottom: 28px;
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--lw-paper); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(4,98,65,0.2); border-radius: 3px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .lw-refresh {
          color: var(--lw-white);
          background-color: var(--lw-dark);
          font-weight: 600;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          line-height: 1.5rem;
          padding: 0.45rem 1rem;
          cursor: pointer;
          text-align: center;
          display: inline-flex;
          align-items: center;
          border: none;
          gap: 0.75rem;
          transition: background-color 0.15s ease, transform 0.15s ease;
          box-shadow: 0 10px 18px rgba(19,48,32,0.16);
        }
        .lw-refresh:hover {
          background-color: var(--lw-green);
        }
        .lw-refresh:active {
          transform: translateY(1px);
        }
        .lw-refresh svg {
          display: inline;
          width: 1rem;
          height: 1rem;
          color: var(--lw-white);
        }
        .lw-refresh:focus svg {
          animation: spin_357 0.5s linear;
        }
        .lw-refresh:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @keyframes spin_357 {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .lw-back {
          color: var(--lw-text);
          background: var(--lw-white);
          font-weight: 600;
          border-radius: 0.6rem;
          font-size: 0.8rem;
          line-height: 1.5rem;
          padding: 0.45rem 0.9rem;
          border: 1px solid var(--lw-border);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: background-color 0.15s ease, border-color 0.15s ease;
          box-shadow: 0 6px 14px rgba(19,48,32,0.08);
        }
        .lw-back:hover {
          background: var(--lw-surface-alt);
          border-color: rgba(19,48,32,0.2);
        }

        @media (max-width: 900px) {
          :root {
            --lw-navbar-padding: 12px 16px;
            --lw-navbar-height: 72px;
            --lw-content-padding: 20px 16px 96px;
            --lw-center-pos: static;
            --lw-center-left: auto;
            --lw-center-transform: none;
            --lw-card-min: 280px;
            --lw-chat-width: 320px;
            --lw-chat-height: 520px;
            --lw-chat-right: 16px;
            --lw-chat-bottom: 84px;
            --lw-fab-right: 16px;
            --lw-fab-bottom: 16px;
          }
          .lw-navbar {
            flex-wrap: wrap;
            gap: 10px;
            align-items: flex-start;
          }
          .lw-navbar-left {
            width: 100%;
            justify-content: center;
          }
          .lw-navbar-center {
            order: 3;
            width: 100%;
            text-align: center;
            margin-top: 4px;
          }
          .lw-navbar-actions {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
          }
        }

        @media (max-width: 600px) {
          .lw-navbar-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .lw-navbar-actions > div {
            width: 100%;
            justify-content: center;
          }
          :root {
            --lw-card-min: 240px;
            --lw-chat-width: calc(100vw - 32px);
            --lw-chat-height: 70vh;
            --lw-chat-right: 16px;
            --lw-chat-bottom: 84px;
          }
        }
      `}</style>
    </>
  );
}

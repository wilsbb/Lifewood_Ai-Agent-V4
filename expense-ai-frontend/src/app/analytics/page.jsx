'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard';
import { ADMIN_AUTH_KEY } from '../../lib/adminAnalytics';
import { getStoredSession } from '../../lib/auth';

export default function AnalyticsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ── Gate 1: super_admin role (new role-based auth) ─────────────────
    const session = getStoredSession();
    if (session?.canAccessAnalytics || session?.role === 'super_admin') {
      setReady(true);
      return;
    }

    // ── Gate 2: legacy secret-phrase admin session (kept for compatibility)
    try {
      if (window.sessionStorage.getItem(ADMIN_AUTH_KEY) === '1') {
        setReady(true);
        return;
      }
    } catch {}

    // ── No valid access — redirect ──────────────────────────────────────
    router.replace('/dashboard');
  }, [router]);

  if (!ready) return null;

  return <AnalyticsDashboard />;
}
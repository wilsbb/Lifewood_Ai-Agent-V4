'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard';
import { getStoredSession } from '../../lib/auth';

export default function AnalyticsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getStoredSession();

    if (!session) {
      router.replace('/');
      return;
    }

    if (session.canAccessAnalytics || session.role === 'super_admin') {
      setReady(true);
      return;
    }

    router.replace('/dashboard');
  }, [router]);

  if (!ready) return null;

  return <AnalyticsDashboard />;
}

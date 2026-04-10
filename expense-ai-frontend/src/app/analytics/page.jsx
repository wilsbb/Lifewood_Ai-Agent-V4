'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard';
import { ADMIN_AUTH_KEY } from '../../lib/adminAnalytics';

export default function AnalyticsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(ADMIN_AUTH_KEY) !== '1') {
        router.replace('/dashboard');
        return;
      }
    } catch {
      router.replace('/dashboard');
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) return null;

  return <AnalyticsDashboard />;
}

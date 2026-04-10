'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLoginCard from '../../components/admin/AdminLoginCard';
import {
  ADMIN_AUTH_KEY,
  buildAdminSession,
  getStoredAdminProfileName,
  persistAdminSession,
  validateAdminCredentials,
} from '../../lib/adminAnalytics';

const shellStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '32px',
  background: '#f5eedb',
  backgroundImage: `
    radial-gradient(ellipse 70% 45% at 18% -8%, rgba(255,179,71,0.22) 0%, transparent 62%),
    radial-gradient(ellipse 80% 55% at 88% 110%, rgba(4,98,65,0.18) 0%, transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 35%)
  `,
  color: '#133020',
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    try {
      if (window.sessionStorage.getItem(ADMIN_AUTH_KEY) === '1') {
        router.replace('/analytics');
      }
    } catch {}
  }, [router]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateAdminCredentials(email, password)) {
      setError('Invalid admin credentials.');
      return;
    }

    try {
      persistAdminSession(window.sessionStorage, buildAdminSession({
        email: email.trim().toLowerCase(),
        displayName: getStoredAdminProfileName(window.localStorage),
      }));
    } catch {}

    router.replace('/analytics');
  };

  if (!ready) {
    return <main style={shellStyle} />;
  }

  return (
    <main style={shellStyle}>
      <AdminLoginCard
        email={email}
        password={password}
        error={error}
        submitLabel="Login"
        onEmailChange={(event) => {
          setEmail(event.target.value);
          if (error) setError('');
        }}
        onPasswordChange={(event) => {
          setPassword(event.target.value);
          if (error) setError('');
        }}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

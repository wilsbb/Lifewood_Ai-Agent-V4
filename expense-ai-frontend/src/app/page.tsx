'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import styles from './page.module.css';
import { getApiBaseUrl } from '../lib/api';
import { getStoredSession, storeSession, type UserSession } from '../lib/auth';

const LOGO_URL =
  'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png';

export default function HomePage() {
  const router = useRouter();
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [checking,  setChecking]  = useState(true); // initial session check

  // ── If already logged in, skip straight to /drive ────────────────────────
  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      router.replace('/drive');
    } else {
      setChecking(false);
    }
  }, [router]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('Enter both username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/users/login/`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.');
        return;
      }

      const session: UserSession = {
        id:                 data.user.id,
        username:           data.user.username,
        email:              data.user.email,
        role:               data.user.role,
        canAccessAnalytics: data.user.can_access_analytics,
        allowedPages:       data.user.allowed_pages,
      };

      storeSession(session);
      router.push('/drive');

    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't flash the form while checking for an existing session
  if (checking) {
    return <main className={styles.shell} />;
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.logoWrap}>
          <img alt="Lifewood" className={styles.logo} src={LOGO_URL} />
        </div>

        <div className={styles.content}>
          <span className={styles.kicker}>Finance workspace</span>
          <h1 className={styles.heading}>fAInance</h1>
          <p className={styles.desc}>
            Enter your credentials to open the Lifewood Finance workspace.
          </p>

          <form className={styles.loginForm} onSubmit={handleLogin}>
            <label className={styles.field}>
              <span>Username</span>
              <input
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect="off"
                className={styles.input}
                disabled={loading}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter username"
                spellCheck="false"
                type="text"
                value={username}
              />
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <input
                autoComplete="current-password"
                className={styles.input}
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter password"
                type="password"
                value={password}
              />
            </label>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                disabled={loading}
                type="submit"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <Shield size={14} />
            <span>Secure employee access</span>
          </div>
          <span>&copy; {new Date().getFullYear()} Lifewood</span>
        </div>
      </section>
    </main>
  );
}
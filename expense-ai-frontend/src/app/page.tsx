'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import styles from './page.module.css';

const LOGO_URL =
  'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('Enter both username and password.');
      return;
    }

    setError('');
    router.push('/drive');
  };

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
            Enter your username and password to open Lifewood review workspace.
          </p>

          <form className={styles.loginForm} onSubmit={handleLogin}>
            <label className={styles.field}>
              <span>Username</span>
              <input
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect="off"
                className={styles.input}
                onChange={(event) => {
                  setUsername(event.target.value);
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
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter password"
                type="password"
                value={password}
              />
            </label>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <button className={styles.primaryButton} type="submit">
                Sign In
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

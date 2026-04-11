'use client';

import { useState } from 'react';

const styles = {
  card: {
    width: 'min(100%, 560px)',
    borderRadius: '28px',
    padding: '40px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.82) 100%)',
    border: '1px solid rgba(19,48,32,0.12)',
    boxShadow: '0 18px 45px rgba(19,48,32,0.16)',
    backdropFilter: 'blur(16px)',
    color: '#133020',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '-8px',
    marginBottom: '8px',
  },
  logo: {
    height: '26px',
    width: 'auto',
    display: 'block',
  },
  title: {
    margin: '0 0 24px',
    fontSize: 'clamp(33px, 4.6vw, 46px)',
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#173726',
    textShadow: '0 1px 0 rgba(255,255,255,0.85), 0 2px 10px rgba(19,48,32,0.18)',
  },
  form: {
    display: 'grid',
    gap: '18px',
  },
  label: {
    display: 'grid',
    gap: '10px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#046241',
  },
  input: {
    width: '100%',
    borderRadius: '16px',
    border: '1px solid rgba(19,48,32,0.12)',
    background: 'rgba(255,255,255,0.86)',
    color: '#133020',
    padding: '16px 18px',
    fontSize: '15px',
    outline: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 6px 16px rgba(19,48,32,0.08)',
  },
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
    borderRadius: '16px',
    border: '1px solid rgba(19,48,32,0.12)',
    background: 'rgba(255,255,255,0.86)',
    color: '#133020',
    padding: '16px 56px 16px 18px',
    fontSize: '15px',
    outline: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 6px 16px rgba(19,48,32,0.08)',
  },
  toggleButton: {
    position: 'absolute',
    top: '50%',
    right: '14px',
    transform: 'translateY(-50%)',
    display: 'grid',
    placeItems: 'center',
    width: '28px',
    height: '28px',
    padding: 0,
    border: '0',
    background: 'transparent',
    color: '#046241',
    cursor: 'pointer',
  },
  error: {
    margin: 0,
    color: '#C17110',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: '16px',
    border: '1px solid rgba(19,48,32,0.12)',
    background: 'rgba(255,255,255,0.88)',
    color: '#133020',
    fontWeight: 700,
    fontSize: '16px',
    padding: '16px 20px',
    cursor: 'pointer',
  },
  primaryButton: {
    flex: 1,
    borderRadius: '16px',
    border: '0',
    background: '#133020',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '16px',
    padding: '16px 20px',
    cursor: 'pointer',
    boxShadow: '0 10px 18px rgba(19,48,32,0.16)',
  },
};

const LOGO_URL = 'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png?width=1519&height=429';

export default function AdminLoginCard({
  email,
  password,
  error,
  title = 'ADMIN ACCESS',
  submitLabel = 'Login',
  showCancel = false,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onCancel,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section style={styles.card}>
      <div style={styles.logoWrap}>
        <img alt="Lifewood" src={LOGO_URL} style={styles.logo} />
      </div>
      <h1 style={styles.title}>{title}</h1>
      <form onSubmit={onSubmit} style={styles.form}>
        <label style={styles.label}>
          Username
          <input
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            value={email}
            onChange={onEmailChange}
            style={styles.input}
            type="email"
            placeholder="Enter email"
          />
        </label>

        <label style={styles.label}>
          Password
          <div style={styles.passwordWrap}>
            <input
              autoComplete="current-password"
              value={password}
              onChange={onPasswordChange}
              style={styles.passwordInput}
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              style={styles.toggleButton}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.92-2.6 2.61-4.82 4.83-6.32" />
                  <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
                  <path d="M1 1l22 22" />
                  <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.8 11.8 0 0 1-2.16 3.19" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        {error ? <p style={styles.error}>{error}</p> : null}

        <div style={styles.actions}>
          {showCancel ? (
            <button type="button" onClick={onCancel} style={styles.secondaryButton}>
              Cancel
            </button>
          ) : null}
          <button type="submit" style={styles.primaryButton}>
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

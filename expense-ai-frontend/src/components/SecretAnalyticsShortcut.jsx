'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLoginCard from './admin/AdminLoginCard';
import {
  buildAdminSession,
  getStoredAdminProfileName,
  getStoredAdminSecretPhrase,
  persistAdminSession,
  validateAdminCredentials,
} from '../lib/adminAnalytics';

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select'
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: '32px',
  background: 'rgba(19,48,32,0.24)',
  backdropFilter: 'blur(8px)',
  zIndex: 300,
};

export default function SecretAnalyticsShortcut() {
  const router = useRouter();
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const cardRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeyDown = (event) => {
      if (open && event.key === 'Escape') {
        setOpen(false);
        setPassword('');
        setError('');
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.isComposing || event.defaultPrevented) return;
      if (isEditableTarget(event.target)) return;

      let char = '';
      if (event.key === ' ') {
        char = ' ';
      } else if (event.key.length === 1) {
        char = event.key.toLowerCase();
      } else {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 1200) {
        bufferRef.current = '';
      }

      const secretPhrase = getStoredAdminSecretPhrase(window.localStorage);
      lastKeyTimeRef.current = now;
      bufferRef.current = `${bufferRef.current}${char}`.slice(-Math.max(24, secretPhrase.length));

      if (bufferRef.current.endsWith(secretPhrase)) {
        bufferRef.current = '';
        setEmail('');
        setPassword('');
        setError('');
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!cardRef.current?.contains(event.target)) {
        setOpen(false);
        setPassword('');
        setError('');
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

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

    setOpen(false);
    setPassword('');
    setError('');
    router.replace('/analytics');
  };

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div ref={cardRef}>
        <AdminLoginCard
          email={email}
          password={password}
          error={error}
          submitLabel="Login"
          showCancel
          onEmailChange={(event) => {
            setEmail(event.target.value);
            if (error) setError('');
          }}
          onPasswordChange={(event) => {
            setPassword(event.target.value);
            if (error) setError('');
          }}
          onSubmit={handleSubmit}
          onCancel={() => {
            setOpen(false);
            setPassword('');
            setError('');
          }}
        />
      </div>
    </div>
  );
}

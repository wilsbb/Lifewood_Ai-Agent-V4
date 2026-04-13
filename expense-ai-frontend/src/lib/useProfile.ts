import { useEffect, useState, useCallback, useRef } from 'react';
import { getStoredSession, type UserSession } from './auth';
import { getApiBaseUrl } from './api';

const DISPLAY_NAME_KEY = 'lw-display-name';

function getInitials(value: string): string {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'U';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function useProfile() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const syncListenerRef = useRef<(() => void) | null>(null);

  // Initialize session and display name on mount
  useEffect(() => {
    const currentSession = getStoredSession();
    setSession(currentSession);

    if (!currentSession) return;

    const storedName = typeof window !== 'undefined' 
      ? window.localStorage.getItem(DISPLAY_NAME_KEY)?.trim()
      : undefined;
    const nextName = storedName || currentSession.username;
    setDisplayName(nextName);
    setDisplayNameInput(nextName);
  }, []);

  // Listen for storage changes across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DISPLAY_NAME_KEY && e.newValue) {
        setDisplayName(e.newValue);
        setDisplayNameInput(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSaveDisplayName = useCallback(() => {
    if (!session) return;

    const nextValue = displayNameInput.trim() || session.username;
    setSaving(true);

    try {
      window.localStorage.setItem(DISPLAY_NAME_KEY, nextValue);
      setDisplayName(nextValue);
      return true;
    } catch (e) {
      console.error('Failed to save display name:', e);
      return false;
    } finally {
      setSaving(false);
    }
  }, [displayNameInput, session]);

  const handleSignOut = useCallback(async () => {
    try {
      const { clearSession } = await import('./auth');
      await fetch(`${getApiBaseUrl()}/api/users/logout/`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
      clearSession();
      return true;
    } catch (e) {
      console.error('Sign out failed:', e);
      return false;
    }
  }, []);

  const roleLabel = (() => {
    if (!session) return 'User';
    return session.role === 'super_admin' ? 'Super Admin' : 'Admin';
  })();

  const initials = getInitials(displayName || session?.username || '');

  return {
    session,
    displayName,
    displayNameInput,
    setDisplayNameInput,
    handleSaveDisplayName,
    handleSignOut,
    saving,
    roleLabel,
    initials,
  };
}

export { DISPLAY_NAME_KEY };

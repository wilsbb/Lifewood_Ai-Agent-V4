/**
 * auth.ts
 * Lightweight client-side auth utilities.
 *
 * Stores the user session in localStorage after a successful login.
 * The actual authentication is enforced server-side via Django session cookies —
 * localStorage is only used for routing decisions on the frontend.
 */

export type UserRole = 'admin' | 'super_admin';

export interface UserSession {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  canAccessAnalytics: boolean;
  allowedPages: string[];
}

const SESSION_KEY = 'lw-fin-session';

// ── Read / Write ──────────────────────────────────────────────────────────

export function getStoredSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserSession>;
    if (!parsed?.username || !parsed?.role) return null;
    return parsed as UserSession;
  } catch {
    return null;
  }
}

export function storeSession(session: UserSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

// ── Convenience checks ────────────────────────────────────────────────────

export function isAuthenticated(): boolean {
  return Boolean(getStoredSession()?.username);
}

export function isSuperAdmin(): boolean {
  return getStoredSession()?.role === 'super_admin';
}

export function canAccessPage(page: string): boolean {
  const session = getStoredSession();
  if (!session) return false;
  return session.allowedPages?.includes(page) ?? false;
}

// ── Server-side session validation ────────────────────────────────────────

/**
 * Calls /api/users/me/ to verify the Django session cookie is still valid.
 * Returns the refreshed session if valid, null if not.
 */
export async function validateSession(apiBase: string): Promise<UserSession | null> {
  try {
    const res = await fetch(`${apiBase}/api/users/me/`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.authenticated || !data.user) return null;
    const session: UserSession = {
      id:                 data.user.id,
      username:           data.user.username,
      email:              data.user.email,
      role:               data.user.role,
      canAccessAnalytics: data.user.can_access_analytics,
      allowedPages:       data.user.allowed_pages,
    };
    storeSession(session);   // keep localStorage in sync
    return session;
  } catch {
    return null;
  }
}

/**
 * Calls /api/users/logout/ and clears the local session.
 */
export async function signOut(apiBase: string): Promise<void> {
  try {
    await fetch(`${apiBase}/api/users/logout/`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {}
  clearSession();
}
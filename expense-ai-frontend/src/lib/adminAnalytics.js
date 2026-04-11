export const ADMIN_AUTH_KEY = 'lw-admin-analytics-auth';
export const ADMIN_SESSION_KEY = 'lw-admin-analytics-session';
export const ADMIN_PROFILE_NAME_KEY = 'lw-admin-analytics-profile-name';
export const ADMIN_SECRET_PHRASE_KEY = 'lw-admin-analytics-secret-phrase';

export const DEFAULT_ADMIN_EMAIL = 'railysungahid@gmail.com';
export const DEFAULT_ADMIN_PASSWORD = 'adminrai123';
export const DEFAULT_ADMIN_PROFILE_NAME = 'Admin User';
export const DEFAULT_ADMIN_ROLE = 'Admin';
export const DEFAULT_ADMIN_SECRET_PHRASE = 'lifewood';

const LEGACY_DEFAULT_ADMIN_SECRET_PHRASES = ['ms lyn', 'lifewood admin'];

export function normalizeSecretPhrase(value = '') {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function getStoredAdminSecretPhrase(storage) {
  const normalizedValue = normalizeSecretPhrase(storage?.getItem?.(ADMIN_SECRET_PHRASE_KEY));

  if (!normalizedValue || LEGACY_DEFAULT_ADMIN_SECRET_PHRASES.includes(normalizedValue)) {
    return DEFAULT_ADMIN_SECRET_PHRASE;
  }

  return normalizedValue;
}

export function getStoredAdminProfileName(storage) {
  const savedValue = storage?.getItem?.(ADMIN_PROFILE_NAME_KEY)?.trim();
  return savedValue || DEFAULT_ADMIN_PROFILE_NAME;
}

export function buildAdminSession({
  email = DEFAULT_ADMIN_EMAIL,
  displayName = DEFAULT_ADMIN_PROFILE_NAME,
  role = DEFAULT_ADMIN_ROLE,
  lastLogin = new Date().toISOString(),
} = {}) {
  return { email, displayName, role, lastLogin };
}

export function persistAdminSession(storage, session = buildAdminSession()) {
  storage?.setItem?.(ADMIN_AUTH_KEY, '1');
  storage?.setItem?.(ADMIN_SESSION_KEY, JSON.stringify(buildAdminSession(session)));
}

export function readAdminSession(storage) {
  const rawValue = storage?.getItem?.(ADMIN_SESSION_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') return null;
    return buildAdminSession(parsed);
  } catch {
    return null;
  }
}

export function validateAdminCredentials(email, password) {
  return normalizeSecretPhrase(email) === normalizeSecretPhrase(DEFAULT_ADMIN_EMAIL)
    && password === DEFAULT_ADMIN_PASSWORD;
}

export function getAdminInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'AU';
  return parts.map((part) => part[0].toUpperCase()).join('');
}

export function formatAdminLastLogin(value) {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  const datePart = date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${datePart} at ${timePart}`;
}

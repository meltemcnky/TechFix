// Centralized Administrator Authentication & Session Management Service

// SHA-256 hash of master admin access code "admin12345"
// Generated using standard SHA-256 algorithm:
// SHA256("admin12345") = 41e5653fc7aeb894026d6bb7b2db7f65902b454945fa8fd65a6327047b5277fb
const EXPECTED_ADMIN_HASH = 
  (import.meta as any).env?.VITE_ADMIN_HASH || 
  '41e5653fc7aeb894026d6bb7b2db7f65902b454945fa8fd65a6327047b5277fb';

const SESSION_KEY = 'techfix_admin_session_token';
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 Hours Session Lifetime

interface AdminSession {
  token: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Compute SHA-256 hash of a string using Web Crypto API
 */
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify provided access code against secure SHA-256 hash
 */
export async function verifyAdminAccessCode(inputCode: string): Promise<boolean> {
  if (!inputCode || typeof inputCode !== 'string') return false;
  const inputHash = await sha256(inputCode.trim());
  return inputHash === EXPECTED_ADMIN_HASH;
}

/**
 * Create an authenticated admin session upon successful code verification
 */
export async function loginAdmin(accessCode: string): Promise<boolean> {
  const isValid = await verifyAdminAccessCode(accessCode);
  if (!isValid) return false;

  const now = Date.now();
  const session: AdminSession = {
    token: `tfx_sess_${now}_${Math.random().toString(36).substring(2, 15)}`,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return true;
}

/**
 * Check whether an active, valid administrator session exists
 */
export function isAuthenticatedAdmin(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;

    const session: AdminSession = JSON.parse(raw);
    if (!session || !session.token || !session.expiresAt) return false;

    if (Date.now() > session.expiresAt) {
      logoutAdmin();
      return false;
    }

    return true;
  } catch (err) {
    logoutAdmin();
    return false;
  }
}

/**
 * Revoke administrator session (Logout)
 */
export function logoutAdmin(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Enforce administrator authorization for backend/storage data mutation calls
 */
export function requireAdminAuth(): void {
  if (!isAuthenticatedAdmin()) {
    throw new Error('UNAUTHORIZED_ACCESS: Valid administrator session required to perform this action.');
  }
}

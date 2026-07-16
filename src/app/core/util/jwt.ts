import { JwtClaims } from '../models/auth.models';
import { Role } from '../models/enums';

/** Decode a JWT payload without verifying the signature (client-side only). */
export function decodeJwt(token: string | null | undefined): JwtClaims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

/** True if the token is missing or past its `exp`. */
export function isTokenExpired(token: string | null | undefined, skewSeconds = 10): boolean {
  const claims = decodeJwt(token);
  if (!claims?.exp) return true;
  return Date.now() / 1000 >= claims.exp - skewSeconds;
}

const VALID_ROLES: Role[] = ['BUYER', 'SELLER', 'MANAGER', 'OPERATOR', 'ADMIN'];

/**
 * Best-effort role extraction. NOTE: the Agro Trade access token currently
 * carries no role claim (only `sub`), so this usually returns null. See the
 * contract-gaps TODO — the app falls back to a stored/default role.
 */
export function roleFromClaims(claims: JwtClaims | null): Role | null {
  if (!claims) return null;
  const candidates: unknown[] = [
    claims.role,
    ...(Array.isArray(claims.roles) ? claims.roles : []),
    ...(Array.isArray(claims.authorities) ? claims.authorities : []),
  ];
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const normalized = c.replace(/^ROLE_/, '') as Role;
    if (VALID_ROLES.includes(normalized)) return normalized;
  }
  return null;
}

export function usernameFromToken(token: string | null | undefined): string | null {
  return decodeJwt(token)?.sub ?? null;
}

/**
 * Numeric backend user id from the token's `userId` claim, or null if it's
 * absent / non-numeric. NEVER falls back to `sub` (that's the username, e.g.
 * "grisha1") — the Socket.IO / chat backend parses this as a Long.
 */
export function userIdFromToken(token: string | null | undefined): number | null {
  const claims = decodeJwt(token);
  if (!claims) return null;
  const raw = claims.userId ?? claims['id'] ?? claims['uid'] ?? claims['user_id'];
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

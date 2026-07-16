import { Injectable } from '@angular/core';
import { Role } from '../models/enums';

const ACCESS_KEY = 'at_access_token';
const REFRESH_KEY = 'at_refresh_token';
const ROLE_KEY = 'at_role';

/** Thin localStorage wrapper for tokens + best-effort role. */
@Injectable({ providedIn: 'root' })
export class TokenService {
  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  get role(): Role | null {
    return localStorage.getItem(ROLE_KEY) as Role | null;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }

  setRole(role: Role | null): void {
    if (role) localStorage.setItem(ROLE_KEY, role);
    else localStorage.removeItem(ROLE_KEY);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLE_KEY);
  }
}

import { computed, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { API } from '../api-paths';
import { TokenService } from './token.service';
import { decodeJwt, roleFromClaims, usernameFromToken, userIdFromToken } from '../util/jwt';
import { Role } from '../models/enums';
import {
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResendCodeRequest,
  ResendCodeResponse,
  TokenPair,
  VerifyRequest,
  VerifyResponse,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private tokens = inject(TokenService);

  private readonly accessTokenSig = signal<string | null>(this.tokens.accessToken);
  private readonly roleSig = signal<Role | null>(this.resolveRole());

  readonly isAuthenticated = computed(() => !!this.accessTokenSig());
  readonly role = this.roleSig.asReadonly();
  readonly username = computed(() => usernameFromToken(this.accessTokenSig()));
  readonly userId = computed(() => userIdFromToken(this.accessTokenSig()));

  private resolveRole(): Role | null {
    // JWT carries no role today; fall back to stored value (default at register: BUYER).
    return roleFromClaims(decodeJwt(this.tokens.accessToken)) ?? this.tokens.role;
  }

  register(body: RegisterRequest): Observable<{ success: boolean; message: string }> {
    return this.http
      .post<RegisterResponse>(`${API.agro}/auth/register`, body)
      .pipe(map((r) => r.registerDto));
  }

  verify(body: VerifyRequest): Observable<{ success: boolean; message: string }> {
    return this.http
      .post<VerifyResponse>(`${API.agro}/auth/verify`, body)
      .pipe(map((r) => r.verifyDto));
  }

  resendCode(body: ResendCodeRequest): Observable<{ message: string; username: string }> {
    return this.http
      .post<ResendCodeResponse>(`${API.agro}/auth/resend-code`, body)
      .pipe(map((r) => r.resendCodeDto));
  }

  login(body: LoginRequest): Observable<TokenPair> {
    return this.http.post<LoginResponse>(`${API.agro}/auth/login`, body).pipe(
      map((r) => r.loginDto),
      tap((pair) => this.applyTokens(pair)),
    );
  }

  /** Used by the error interceptor. Refresh token endpoint is public. */
  refresh(): Observable<TokenPair> {
    const refreshToken = this.tokens.refreshToken ?? '';
    const body: RefreshRequest = { refreshToken };
    return this.http.post<RefreshResponse>(`${API.authToken}/refresh`, body).pipe(
      map((r) => r.refreshTokenDto),
      tap((pair) => this.applyTokens(pair)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API.agro}/auth/logout`, {}).pipe(
      tap({
        next: () => this.clearSession(),
        error: () => this.clearSession(),
      }),
    );
  }

  clearSession(): void {
    this.tokens.clear();
    this.accessTokenSig.set(null);
    this.roleSig.set(null);
  }

  private applyTokens(pair: TokenPair): void {
    this.tokens.setTokens(pair.accessToken, pair.refreshToken);
    // Role comes only from a real source: the JWT claim, or the last stored
    // value. No hardcoded default — an unknown role stays null and the UI hides
    // role-gated elements rather than pretending the user is a BUYER.
    const role = roleFromClaims(decodeJwt(pair.accessToken)) ?? this.tokens.role;
    this.tokens.setRole(role);
    this.accessTokenSig.set(pair.accessToken);
    this.roleSig.set(role);
  }
}

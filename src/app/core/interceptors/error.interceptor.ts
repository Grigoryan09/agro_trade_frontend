import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  filter,
  finalize,
  Observable,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { AppError } from '../models/api.models';
import { isTokenExpired } from '../util/jwt';

// Single-flight refresh shared across concurrent 401s.
let refreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

function isRefreshCall(url: string): boolean {
  return url.includes('/auth/token/');
}
function isAuthCall(url: string): boolean {
  return url.includes('/api/v1/auth/');
}

/** Map any backend error shape to a normalized AppError on the thrown error. */
function normalize(err: HttpErrorResponse): AppError {
  const body = err.error ?? {};
  let fieldErrors: Record<string, string> | undefined;
  if (Array.isArray(body.details)) {
    fieldErrors = {};
    for (const d of body.details) {
      if (d?.field) fieldErrors[d.field] = d.message;
    }
  }
  const message =
    body.message ||
    (err.status === 0 ? 'Сервер недоступен. Проверьте подключение.' : err.message) ||
    'Произошла ошибка';
  return {
    status: err.status,
    message,
    errorCode: body.errorCode ?? body.code,
    fieldErrors,
  };
}

function retryWithToken(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  token: string,
): Observable<HttpEvent<unknown>> {
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const tokens = inject(TokenService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      const appError = normalize(err);

      const isExpired403 = err.status === 403 && isTokenExpired(tokens.accessToken);
      const shouldRefresh = err.status === 401 || isExpired403;

      if (!shouldRefresh || isRefreshCall(req.url) || isAuthCall(req.url)) {
        (err as { appError?: AppError }).appError = appError;
        return throwError(() => err);
      }

      // No refresh token -> straight to login.
      if (!tokens.refreshToken) {
        auth.clearSession();
        router.navigate(['/auth/login']);
        (err as { appError?: AppError }).appError = appError;
        return throwError(() => err);
      }

      if (refreshing) {
        // Wait for the in-flight refresh, then retry.
        return refreshedToken$.pipe(
          filter((t): t is string => t !== null),
          take(1),
          switchMap((t) => retryWithToken(req, next, t)),
        );
      }

      refreshing = true;
      refreshedToken$.next(null);

      return auth.refresh().pipe(
        switchMap((pair) => {
          refreshedToken$.next(pair.accessToken);
          return retryWithToken(req, next, pair.accessToken);
        }),
        catchError((refreshErr) => {
          auth.clearSession();
          router.navigate(['/auth/login']);
          return throwError(() => refreshErr);
        }),
        finalize(() => {
          refreshing = false;
        }),
      );
    }),
  );
};

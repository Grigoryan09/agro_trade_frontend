import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';

/** Public paths that must NOT receive an Authorization header. */
function isPublic(url: string): boolean {
  return url.includes('/api/v1/auth/') || url.includes('/auth/token/');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const token = tokens.accessToken;

  if (!token || isPublic(req.url)) {
    return next(req);
  }

  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};

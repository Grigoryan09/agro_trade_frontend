import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/enums';

/**
 * Restrict a route to specific roles. Reads roles from `route.data.roles`.
 * NOTE: role is best-effort (backend exposes no role claim); see contract gaps.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const allowed = (route.data?.['roles'] as Role[] | undefined) ?? [];
  if (allowed.length === 0) return true;

  const role = auth.role();
  if (role && allowed.includes(role)) return true;

  return router.createUrlTree(['/forbidden']);
};

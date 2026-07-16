import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ADMIN_ROLES } from './core/models/enums';

/**
 * Routes for the STANDALONE admin host (bootstrapped by `main.admin.ts`,
 * served on its own port). Only auth screens + the admin dashboard exist here;
 * the buyer/seller/operator storefront lives in the separate main app.
 */
export const adminRoutes: Routes = [
  // Auth (public, no shell) — an admin still authenticates through the same flow.
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/verify',
    loadComponent: () => import('./features/auth/verify.component').then((m) => m.VerifyComponent),
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/forbidden.component').then((m) => m.ForbiddenComponent),
  },

  // Everything else requires an authenticated ADMIN.
  {
    path: '',
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_ROLES },
    loadComponent: () =>
      import('./layout/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.AdminComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];

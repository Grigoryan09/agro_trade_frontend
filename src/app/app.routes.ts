import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

// NOTE: the /admin section is NOT part of this app. It ships as a separate host
// (build target `agro_trade_admin`, served on its own port) — see app.admin.routes.ts.
export const routes: Routes = [
  // Auth (public, no shell)
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'auth/verify',
    loadComponent: () => import('./features/auth/verify.component').then((m) => m.VerifyComponent),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/forbidden.component').then((m) => m.ForbiddenComponent),
  },

  // Authenticated area, wrapped in the poле.рф-style shell
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products.component').then((m) => m.ProductsComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/orders/orders.component').then((m) => m.OrdersComponent),
      },
      {
        path: 'finance',
        loadComponent: () =>
          import('./features/finance/finance.component').then((m) => m.FinanceComponent),
      },
      {
        path: 'news',
        loadComponent: () => import('./features/news/news.component').then((m) => m.NewsComponent),
      },
      {
        path: 'news/:id',
        loadComponent: () =>
          import('./features/news/article.component').then((m) => m.ArticleComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];

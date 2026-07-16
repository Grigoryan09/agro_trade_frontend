import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ToastHostComponent } from '../shared/toast-host.component';
import { ConfirmHostComponent } from '../shared/confirm-host.component';
import { RoleBadgeComponent } from '../shared/role-badge.component';

/**
 * Slim shell for the SEPARATE admin host (build target `agro_trade_admin`,
 * served on its own port). Deliberately carries NO buyer/seller/operator
 * navigation — the admin app is isolated from the main storefront per spec.
 * Provides only a header (logo + who-am-I + logout) and the global toast/confirm
 * hosts that the admin screen relies on.
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastHostComponent, ConfirmHostComponent, RoleBadgeComponent],
  template: `
    <header class="admin-header">
      <div class="bar-inner">
        <span class="logo">
          <span class="logo-mark">🛠️</span>
          <span class="logo-text">Agro&nbsp;Trade · Админ</span>
        </span>
        <span class="spacer"></span>
        @if (auth.isAuthenticated()) {
          <span class="who">{{ auth.username() }}</span>
          <app-role-badge [role]="auth.role()" />
          <button class="logout" (click)="logout()">Выход</button>
        }
      </div>
    </header>

    <main class="admin-main">
      <router-outlet />
    </main>

    <app-toast-host />
    <app-confirm-host />
  `,
  styles: [
    `
      .admin-header {
        position: sticky;
        top: 0;
        z-index: 50;
        background: #1e262b;
        color: #e7ecef;
        border-bottom: 2px solid var(--green-500, #3f9c35);
      }
      .bar-inner {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 24px;
        height: 56px;
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .logo { display: inline-flex; align-items: center; gap: 8px; }
      .logo-mark {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: var(--green-500, #3f9c35);
        font-size: 1.05rem;
      }
      .logo-text { font-weight: 700; font-size: 1.02rem; }
      .spacer { flex: 1; }
      .who { color: #c6cdd1; font-size: 0.9rem; }
      .logout {
        background: none;
        border: 1px solid #46525a;
        color: #e7ecef;
        border-radius: 8px;
        padding: 6px 12px;
        cursor: pointer;
        font: inherit;
      }
      .logout:hover { background: #2a343a; }
      .admin-main { max-width: 1280px; margin: 0 auto; padding: 24px; }
    `,
  ],
})
export class AdminShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
    });
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { RoleBadgeComponent } from '../shared/role-badge.component';

/** Temporary landing for authenticated users until the §12.4 screens are built. */
@Component({
  selector: 'app-home-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RoleBadgeComponent],
  template: `
    <div class="container stack">
      <div class="row">
        <h1>Agro Trade</h1>
        <span class="spacer"></span>
        <app-role-badge [role]="auth.role()" />
        <span class="muted">{{ auth.username() }}</span>
        <button class="btn btn-secondary btn-sm" (click)="logout()">Выйти</button>
      </div>
      <div class="card">
        <h2>Каркас готов ✅</h2>
        <p class="muted">
          Авторизация, интерсепторы (Bearer + refresh), guard'ы и экраны
          входа/регистрации/подтверждения работают. Основные экраны (каталог заявок, профиль,
          товары, заказы, новости, чаты, финансирование, договоры) — следующий шаг (§12.3–12.5).
        </p>
      </div>
    </div>
  `,
})
export class HomePlaceholderComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
    });
  }
}

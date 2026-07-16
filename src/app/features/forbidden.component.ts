import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="state">
        <div class="state-icon">🚫</div>
        <h2>Доступ запрещён</h2>
        <p class="muted">У вашей роли нет прав на этот раздел.</p>
        <a class="btn btn-primary" routerLink="/offers">На главную</a>
      </div>
    </div>
  `,
})
export class ForbiddenComponent {}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';

/** Modal confirm dialog driven by ConfirmService. Place once in the app shell. */
@Component({
  selector: 'app-confirm-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.current(); as c) {
      <div class="confirm-backdrop" (click)="confirm.answer(false)">
        <div class="confirm card" (click)="$event.stopPropagation()">
          <h3 class="confirm-title">{{ c.title }}</h3>
          <p class="confirm-msg">{{ c.message }}</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" type="button" (click)="confirm.answer(false)">
              {{ c.cancelText ?? 'Отмена' }}
            </button>
            <button
              class="btn"
              [class.btn-danger]="c.danger"
              [class.btn-primary]="!c.danger"
              type="button"
              (click)="confirm.answer(true)"
            >
              {{ c.confirmText ?? 'Подтвердить' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .confirm-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(20, 26, 23, 0.45);
        z-index: 150;
        display: grid;
        place-items: center;
        padding: 20px;
        animation: fade 0.15s ease;
      }
      .confirm { max-width: 420px; width: 100%; }
      .confirm-title { margin: 0 0 8px; }
      .confirm-msg { margin: 0 0 20px; color: var(--text-muted); }
      .confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }
      @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    `,
  ],
})
export class ConfirmHostComponent {
  confirm = inject(ConfirmService);
}
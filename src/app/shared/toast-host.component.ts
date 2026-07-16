import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Fixed bottom-right stack of toasts. Place once in the app shell. */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class.success]="t.kind === 'success'" [class.error]="t.kind === 'error'">
          <span>{{ t.text }}</span>
          <button class="toast-x" type="button" (click)="toasts.dismiss(t.id)" aria-label="Закрыть">
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 200;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 360px;
      }
      .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: var(--radius-sm);
        background: #1e262b;
        color: #fff;
        box-shadow: var(--shadow-lg);
        font-size: 0.9rem;
        animation: toast-in 0.18s ease;
      }
      .toast.success { background: var(--green-600, #1f8a4c); }
      .toast.error { background: #c0392b; }
      .toast-x {
        margin-left: auto;
        background: none;
        border: 0;
        color: inherit;
        cursor: pointer;
        opacity: 0.8;
        font-size: 0.85rem;
      }
      .toast-x:hover { opacity: 1; }
      @keyframes toast-in {
        from { transform: translateY(8px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `,
  ],
})
export class ToastHostComponent {
  toasts = inject(ToastService);
}
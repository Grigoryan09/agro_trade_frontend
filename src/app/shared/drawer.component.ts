import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Right-side sliding panel. Used for chat, order creation and admin forms. */
@Component({
  selector: 'app-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="drawer-backdrop" (click)="close.emit()"></div>
      <aside class="drawer" [class.wide]="wide()">
        <header class="drawer-head">
          <h3 class="drawer-title">{{ title() }}</h3>
          <button class="drawer-x" type="button" (click)="close.emit()" aria-label="Закрыть">
            ✕
          </button>
        </header>
        <div class="drawer-body">
          <ng-content />
        </div>
      </aside>
    }
  `,
  styles: [
    `
      .drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(20, 26, 23, 0.4);
        z-index: 100;
        animation: fade 0.15s ease;
      }
      .drawer {
        position: fixed;
        top: 0;
        right: 0;
        height: 100vh;
        width: 420px;
        max-width: 92vw;
        background: var(--surface);
        box-shadow: var(--shadow-lg);
        z-index: 101;
        display: flex;
        flex-direction: column;
        animation: slide 0.18s ease;
      }
      .drawer.wide { width: 560px; }
      .drawer-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 18px 20px;
        border-bottom: 1px solid var(--border);
      }
      .drawer-title { margin: 0; font-size: 1.1rem; }
      .drawer-x {
        margin-left: auto;
        background: none;
        border: 0;
        font-size: 1.1rem;
        cursor: pointer;
        color: var(--text-muted);
      }
      .drawer-body { padding: 20px; overflow-y: auto; flex: 1; }
      @keyframes slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
      @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    `,
  ],
})
export class DrawerComponent {
  open = input.required<boolean>();
  title = input<string>('');
  wide = input<boolean>(false);
  close = output<void>();
}

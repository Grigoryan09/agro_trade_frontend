import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-wrap">
      <div class="auth-card card">
        <div class="auth-brand">
          <span class="leaf">🌿</span>
          <span class="brand-name">Agro Trade</span>
        </div>
        <h1 class="auth-title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="muted auth-subtitle">{{ subtitle() }}</p>
        }
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      .auth-wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: radial-gradient(circle at 30% 20%, var(--green-100), var(--bg) 60%);
      }
      .auth-card {
        width: 100%;
        max-width: 420px;
        box-shadow: var(--shadow-lg);
        padding: 32px;
      }
      .auth-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 20px;
      }
      .leaf { font-size: 1.6rem; }
      .brand-name { font-weight: 700; font-size: 1.2rem; color: var(--green-700); }
      .auth-title { font-size: 1.4rem; margin-bottom: 4px; }
      .auth-subtitle { margin-top: 0; margin-bottom: 20px; }
    `,
  ],
})
export class AuthShellComponent {
  title = input.required<string>();
  subtitle = input<string>('');
}

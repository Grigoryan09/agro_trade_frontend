import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ChatSocketService } from '../chat/chat-socket.service';
import { ChatLauncherService } from '../chat/chat-launcher.service';
import { ChatWindowComponent } from '../chat/chat-window.component';
import { ChatListComponent } from '../chat/chat-list.component';
import { DrawerComponent } from '../shared/drawer.component';
import { ToastHostComponent } from '../shared/toast-host.component';
import { ConfirmHostComponent } from '../shared/confirm-host.component';
import { RoleBadgeComponent } from '../shared/role-badge.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { path: '/products', label: 'Урожай', icon: '🌾' },
  { path: '/orders', label: 'Закупки', icon: '📦' },
  { path: '/finance', label: 'Кредиты и лизинг', icon: '💳' },
  { path: '/news', label: 'Журнал', icon: '📰' },
];

/** poле.рф-style two-bar header wrapping all authenticated screens. No "Чаты" item. */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    DrawerComponent,
    ChatWindowComponent,
    ChatListComponent,
    ToastHostComponent,
    ConfirmHostComponent,
    RoleBadgeComponent,
  ],
  template: `
    <header class="shell-header">
      <!-- Dark utility bar -->
      <div class="utility-bar">
        <div class="bar-inner">
          <span class="region">📍 Россия</span>
          <a class="util-link" href="tel:+78001234567">8 800 123-45-67</a>
          <a class="util-link" href="#">Задать вопрос</a>
          <span class="spacer"></span>
          @if (auth.isAuthenticated()) {
            <button class="icon-btn as-button" type="button" title="Мои чаты" (click)="openChats()">
              💬
              @if (unread() > 0) {
                <span class="unread-dot">{{ unread() }}</span>
              }
            </button>
            <span class="user-id">
              <a class="util-link" routerLink="/profile">{{ auth.username() }}</a>
              @if (auth.role(); as r) {
                <span class="role-sep" aria-hidden="true">·</span>
                <app-role-badge [role]="r" />
              }
            </span>
            <button class="util-link as-button" (click)="logout()">Выход</button>
          } @else {
            <a class="util-link" routerLink="/auth/login">Вход</a>
            <a class="util-link accent" routerLink="/auth/register">Регистрация</a>
          }
        </div>
      </div>

      <!-- White nav bar -->
      <div class="nav-bar">
        <div class="bar-inner">
          <a class="logo" routerLink="/">
            <span class="logo-mark">🌿</span>
            <span class="logo-text">Agro&nbsp;Trade</span>
          </a>
          <nav class="nav">
            @for (item of nav; track item.path) {
              <a
                class="nav-link"
                [routerLink]="item.path"
                routerLinkActive="active"
              >
                <span class="nav-icon">{{ item.icon }}</span>{{ item.label }}
              </a>
            }
          </nav>
        </div>
      </div>
    </header>

    <main class="shell-main">
      <router-outlet />
    </main>

    <!-- Chats list drawer opened from the header 💬 button -->
    <app-drawer [open]="showChats()" title="Мои чаты" (close)="showChats.set(false)">
      @if (showChats()) {
        <app-chat-list (selected)="showChats.set(false)" />
      }
    </app-drawer>

    <!-- Single contextual chat drawer for the whole app (§6) -->
    <app-drawer
      [open]="!!chat.context()"
      [title]="chat.context()?.title ?? 'Чат'"
      (close)="chat.close()"
    >
      @if (chat.context()) {
        <app-chat-window />
      }
    </app-drawer>

    <!-- Global toast + confirm hosts -->
    <app-toast-host />
    <app-confirm-host />
  `,
  styles: [
    `
      .shell-header { position: sticky; top: 0; z-index: 50; }
      .bar-inner {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 24px;
        display: flex;
        align-items: center;
        gap: 18px;
      }
      .utility-bar { background: #1e262b; color: #c6cdd1; font-size: 0.82rem; }
      .utility-bar .bar-inner { height: 38px; }
      .region { font-weight: 600; }
      .util-link { color: #c6cdd1; text-decoration: none; }
      .util-link:hover { color: #fff; text-decoration: none; }
      .util-link.accent { color: var(--green-300); font-weight: 600; }
      .as-button { background: none; border: 0; cursor: pointer; font: inherit; padding: 0; }
      .user-id { display: inline-flex; align-items: center; gap: 8px; }
      .role-sep { color: #7a848a; user-select: none; }
      .spacer { flex: 1; }
      .icon-btn {
        position: relative;
        background: none;
        border: 0;
        cursor: pointer;
        font-size: 1.05rem;
        line-height: 1;
      }
      .unread-dot {
        position: absolute;
        top: -8px;
        right: -8px;
        background: var(--green-500);
        color: #fff;
        border-radius: 999px;
        font-size: 0.62rem;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        display: grid;
        place-items: center;
        font-weight: 700;
      }

      .nav-bar {
        background: #fff;
        border-bottom: 1px solid var(--border);
      }
      .nav-bar .bar-inner { height: 64px; }
      .logo { display: flex; align-items: center; gap: 8px; }
      .logo:hover { text-decoration: none; }
      .logo-mark {
        background: var(--green-500);
        color: #fff;
        width: 34px;
        height: 34px;
        border-radius: 9px;
        display: grid;
        place-items: center;
        font-size: 1.1rem;
      }
      .logo-text { font-weight: 700; color: var(--green-700); font-size: 1.05rem; }
      .nav { display: flex; gap: 6px; margin-left: 24px; }
      .nav-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 999px;
        color: var(--gray-700);
        font-weight: 600;
        font-size: 0.92rem;
      }
      .nav-link:hover { background: var(--gray-100); text-decoration: none; }
      .nav-link.active { background: var(--green-100); color: var(--green-700); }
      .nav-icon { font-size: 0.95rem; }

      .shell-main { min-height: calc(100vh - 102px); }

      @media (max-width: 720px) {
        .nav-link span:not(.nav-icon) { display: none; }
        .util-link { font-size: 0.78rem; }
      }
    `,
  ],
})
export class AppShellComponent {
  auth = inject(AuthService);
  chat = inject(ChatLauncherService);
  private socket = inject(ChatSocketService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly nav = NAV;
  readonly showChats = signal(false);
  readonly unread = signal(0);

  constructor() {
    effect(() => {
      const id = this.auth.userId();
      if (this.auth.isAuthenticated() && id != null) {
        this.socket.connect(id);
      }
    });

    this.socket.newMessageNotification$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((m) => {
        if (m.chatId != null && m.chatId === this.chat.activeChatId()) return;
        this.unread.update((n) => n + 1);
      });
  }

  openChats(): void {
    this.unread.set(0);
    this.showChats.set(true);
  }

  logout(): void {
    this.socket.disconnect();
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
    });
  }
}

import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { ChatService } from './chat.service';
import { ChatSocketService } from './chat-socket.service';
import { ChatRegistryService } from './chat-registry.service';
import { ChatLauncherService } from './chat-launcher.service';
import { ChatParty, ChatSummary } from './chat.models';
import { CHAT_DELETE_ROLES, ROLE_LABEL } from '../core/models/enums';
import { HasRoleDirective } from '../core/directives/has-role.directive';
import { AppError } from '../core/models/api.models';
import { appErrorOf } from '../core/util/format';

interface ChatRow {
  chatId: number;
  title: string;
  lastActivity?: string;
  parties: ChatParty[];
}

@Component({
  selector: 'app-chat-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, HasRoleDirective],
  template: `
    @if (loading()) {
      <div class="skeleton" style="height:56px; margin-bottom:8px"></div>
      <div class="skeleton" style="height:56px"></div>
    } @else {
      @if (error()) {
        <div class="alert alert-error" style="margin-bottom:10px">{{ error()!.message }}</div>
      }
      @for (c of rows(); track c.chatId) {
        <div class="chat-row">
          <button class="chat-main" type="button" (click)="open(c)">
            <span class="chat-title">{{ c.title }}</span>
            @if (c.lastActivity) {
              <span class="chat-sub">{{ c.lastActivity | date: 'dd.MM.yyyy HH:mm' }}</span>
            }
          </button>
          <button
            *appHasRole="CHAT_DELETE_ROLES"
            class="chat-del"
            type="button"
            title="Удалить чат"
            (click)="remove(c)"
          >
            ✕
          </button>
        </div>
      } @empty {
        <div class="muted text-center" style="padding:24px">
          У вас пока нет чатов. Начните чат из карточки товара или заказа.
        </div>
      }
    }
  `,
  styles: [
    `
      .chat-row {
        display: flex;
        align-items: stretch;
        gap: 8px;
        width: 100%;
        border: 1px solid var(--border);
        background: var(--surface);
        border-radius: 12px;
        margin-bottom: 8px;
      }
      .chat-row:hover { background: var(--gray-100); }
      .chat-main {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        flex: 1;
        text-align: left;
        border: none;
        background: none;
        padding: 12px 14px;
        cursor: pointer;
        font: inherit;
      }
      .chat-title { font-weight: 600; }
      .chat-sub { font-size: 0.82rem; color: var(--text-muted); }
      .chat-del {
        align-self: center;
        border: none;
        background: none;
        padding: 0 14px;
        cursor: pointer;
        font-size: 1rem;
        color: var(--text-muted);
      }
      .chat-del:hover { color: var(--red-600, #dc2626); }
    `,
  ],
})
export class ChatListComponent {
  private auth = inject(AuthService);
  private chatSvc = inject(ChatService);
  private socket = inject(ChatSocketService);
  private registry = inject(ChatRegistryService);
  private launcher = inject(ChatLauncherService);

  protected readonly CHAT_DELETE_ROLES = CHAT_DELETE_ROLES;

  readonly selected = output<void>();
  readonly rows = signal<ChatRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<AppError | null>(null);

  constructor() {
    const me = this.auth.userId();
    if (me == null) {
      this.loading.set(false);
      return;
    }
    this.socket.connect(me);
    this.registry.load(me);
    this.load(me);
  }

  private load(me: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.chatSvc.myChats(me).subscribe({
      next: (chats) => {
        this.rows.set(chats.map((c) => this.toRow(c, me)));
        this.loading.set(false);
      },
      error: (err) => {
        this.rows.set(this.fallbackRows());
        this.error.set(appErrorOf(err, 'Не удалось загрузить чаты'));
        this.loading.set(false);
      },
    });
  }

  private toRow(c: ChatSummary, me: number): ChatRow {
    const others = (c.members ?? [])
      .map((m) => m.userId)
      .filter((id): id is number => id != null && id !== me);
    const parties = others
      .map((id) => this.registry.party(id))
      .filter((p): p is ChatParty => !!p);
    return {
      chatId: c.id,
      title: this.titleFor(c.id, others),
      lastActivity: c.lastActivity,
      parties,
    };
  }

  private titleFor(chatId: number, others: number[]): string {
    const labels = others.map((id) => this.labelFor(id)).filter((x): x is string => !!x);
    if (labels.length) return labels.join(', ');
    const entry = this.registry.entries().find((e) => e.chatId === chatId);
    return entry?.name || `Чат №${chatId}`;
  }

  private labelFor(userId: number): string | null {
    const p = this.registry.party(userId);
    if (!p) return null;
    const display = p.name || p.username;
    return display ? `${display} · ${ROLE_LABEL[p.role]}` : ROLE_LABEL[p.role];
  }

  private fallbackRows(): ChatRow[] {
    return this.registry.entries().map((e) => ({
      chatId: e.chatId,
      title: e.name || `Чат №${e.chatId}`,
      lastActivity: e.lastActivity,
      parties: e.parties ?? [],
    }));
  }

  open(c: ChatRow): void {
    this.launcher.open({ chatId: c.chatId, title: c.title, parties: c.parties });
    this.selected.emit();
  }

  remove(c: ChatRow): void {
    if (!confirm(`Удалить чат «${c.title}»?`)) return;
    this.chatSvc.deleteChat(c.chatId).subscribe({
      next: () => {
        this.registry.forget(c.chatId);
        this.rows.update((list) => list.filter((r) => r.chatId !== c.chatId));
      },
      error: (err) => this.error.set(appErrorOf(err, 'Не удалось удалить чат')),
    });
  }
}

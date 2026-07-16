import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ChatService } from './chat.service';
import { ChatSocketService } from './chat-socket.service';
import { ChatRegistryService } from './chat-registry.service';
import { ChatLauncherService, ChatContext, orderParties } from './chat-launcher.service';
import { ChatDetail, ChatMessage, ChatParty } from './chat.models';
import { ROLE_LABEL } from '../core/models/enums';
import { AuthService } from '../core/services/auth.service';
import { OrderService } from '../core/services/order.service';
import { userIdFromToken } from '../core/util/jwt';
import { TokenService } from '../core/services/token.service';
import { AppError } from '../core/models/api.models';
import { appErrorOf } from '../core/util/format';

/** A usable backend id: a finite positive number (rejects undefined/null/NaN/0). */
function isValidId(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function mergeParties(base: ChatParty[], extra: ChatParty[]): ChatParty[] {
  const byId = new Map<number, ChatParty>();
  for (const p of base) byId.set(p.userId, p);
  for (const p of extra) {
    const prev = byId.get(p.userId);
    if (!prev || (!prev.name && p.name)) byId.set(p.userId, p);
  }
  return Array.from(byId.values());
}

/**
 * Contextual chat window (rendered inside the shell's drawer). Reacts to
 * ChatLauncherService.context. There is no chat list — chat always opens from a
 * product or an order (§6).
 */
@Component({
  selector: 'app-chat-window',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="chat">
      @if (loading()) {
        <div class="skeleton" style="height:60px; margin-bottom:8px"></div>
        <div class="skeleton" style="height:60px"></div>
      } @else if (error()) {
        <div class="alert alert-error">{{ error()!.message }}</div>
      } @else {
        <div class="messages" #scroll>
          @for (m of messages(); track m.id) {
            <div class="msg" [class.mine]="isMine(m)">
              @if (!isMine(m)) {
                <div class="sender">{{ senderLabel(m) }}</div>
              }
              @if (editingId() === m.id) {
                <div class="edit">
                  <input
                    class="input"
                    [(ngModel)]="editDraft"
                    [ngModelOptions]="{ standalone: true }"
                    autocomplete="off"
                    (keydown.escape)="cancelEdit()"
                  />
                  <div class="edit-actions">
                    <button
                      class="btn btn-primary"
                      type="button"
                      [disabled]="!editDraft.trim() || savingEdit()"
                      (click)="saveEdit(m)"
                    >
                      Сохранить
                    </button>
                    <button class="btn" type="button" (click)="cancelEdit()">Отмена</button>
                  </div>
                </div>
              } @else {
                @if (docLink(m); as doc) {
                  <a class="bubble doc" [href]="doc.url" target="_blank" rel="noopener" download>
                    📄 {{ doc.name }}
                  </a>
                } @else {
                  <div class="bubble">{{ m.message }}</div>
                }
                <div class="meta">
                  @if (isMine(m)) {
                    <span>{{ statusLabel(m.status) }}</span>
                    <button class="link" type="button" (click)="startEdit(m)">Изменить</button>
                    <button class="link" type="button" (click)="removeMessage(m)">Удалить</button>
                  }
                </div>
              }
            </div>
          } @empty {
            <div class="muted text-center" style="padding:24px">Сообщений пока нет</div>
          }
        </div>
      }

      <form class="composer" (ngSubmit)="send()">
        <input
          class="input"
          placeholder="Сообщение…"
          [(ngModel)]="draft"
          name="draft"
          [disabled]="loading() || sending()"
          autocomplete="off"
        />
        <button class="btn btn-primary" type="submit" [disabled]="!draft.trim() || sending()">↑</button>
      </form>
    </div>
  `,
  styles: [
    `
      .chat { display: flex; flex-direction: column; height: 100%; }
      .messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 8px; }
      .msg { display: flex; flex-direction: column; align-items: flex-start; max-width: 80%; }
      .msg.mine { align-self: flex-end; align-items: flex-end; }
      .bubble { background: var(--gray-100); padding: 8px 12px; border-radius: 12px; }
      .msg.mine .bubble { background: var(--green-100); color: var(--green-700); }
      .bubble.doc { display: inline-block; text-decoration: none; color: var(--green-700); font-weight: 600; cursor: pointer; }
      .bubble.doc:hover { text-decoration: underline; }
      .sender { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); margin-bottom: 2px; }
      .meta { display: flex; align-items: center; gap: 8px; font-size: 0.68rem; color: var(--text-muted); margin-top: 2px; min-height: 0.9rem; }
      .link { border: none; background: none; padding: 0; font: inherit; font-size: 0.68rem; color: var(--text-muted); cursor: pointer; text-decoration: underline; }
      .link:hover { color: var(--green-700); }
      .edit { display: flex; flex-direction: column; gap: 6px; width: 100%; }
      .edit .input { width: 100%; }
      .edit-actions { display: flex; gap: 6px; }
      .composer { display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid var(--border); }
      .composer .input { flex: 1; }
    `,
  ],
})
export class ChatWindowComponent {
  private chatSvc = inject(ChatService);
  private socket = inject(ChatSocketService);
  private registry = inject(ChatRegistryService);
  private launcher = inject(ChatLauncherService);
  private orders = inject(OrderService);
  private auth = inject(AuthService);
  private tokens = inject(TokenService);
  private destroyRef = inject(DestroyRef);

  chat = signal<ChatDetail | null>(null);
  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  error = signal<AppError | null>(null);
  sending = signal(false);
  draft = '';
  editingId = signal<number | null>(null);
  editDraft = '';
  savingEdit = signal(false);

  private currentChatId: number | null = null;
  private myId: number | null = null;
  parties = signal<ChatParty[]>([]);

  constructor() {
    this.socket.newMessage$
      .pipe(takeUntilDestroyed())
      .subscribe((m) => this.appendIncoming(m, false));

    this.socket.newMessageNotification$
      .pipe(takeUntilDestroyed())
      .subscribe((m) => this.appendIncoming(m, true));

    this.socket.messageDelivered$.pipe(takeUntilDestroyed()).subscribe(({ messageId }) => {
      this.messages.update((list) =>
        list.map((x) => (x.id === messageId && x.status === 'SENT' ? { ...x, status: 'DELIVERED' } : x)),
      );
    });

    this.socket.messagesRead$.pipe(takeUntilDestroyed()).subscribe(({ messageIds }) => {
      const ids = new Set(messageIds ?? []);
      this.messages.update((list) =>
        list.map((x) => (ids.has(x.id) ? { ...x, status: 'READ' } : x)),
      );
    });

    this.socket.messageUpdated$.pipe(takeUntilDestroyed()).subscribe((m) => {
      if (m?.id != null) this.applyUpdated(m);
    });

    this.socket.messageDeleted$
      .pipe(takeUntilDestroyed())
      .subscribe(({ messageId }) => this.applyDeleted(messageId));

    this.socket.chatArchived$.pipe(takeUntilDestroyed()).subscribe(({ chatId }) => {
      if (chatId === this.currentChatId) {
        this.messages.set([]);
        this.error.set({ status: 0, message: 'Чат был удалён.' });
      }
    });

    this.socket.connected$.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.currentChatId != null) {
        this.socket.joinChat(this.currentChatId);
        this.socket.markRead(this.currentChatId);
      }
    });

    effect(() => {
      const ctx = this.launcher.context();
      if (!ctx) {
        this.teardown();
        return;
      }
      this.openFromContext(ctx);
    });

    this.destroyRef.onDestroy(() => this.teardown());
  }

  private openFromContext(ctx: ChatContext): void {
    const me = this.resolveMyId(ctx);
    if (me == null) {
      this.error.set({ status: 0, message: 'Не удалось определить ваш id пользователя.' });
      return;
    }
    this.myId = me;
    this.registry.load(me);
    this.parties.set(ctx.parties ?? []);
    this.socket.connect(me);
    this.loading.set(true);
    this.error.set(null);
    this.socket
      .whenConnected()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (isValidId(ctx.chatId)) {
          this.openChat(ctx.chatId);
          return;
        }
        if (ctx.orderId != null) {
          this.loading.set(false);
          this.error.set({ status: 0, message: 'Чат по этому заказу ещё не готов.' });
          return;
        }
        const participants = this.participantsFrom(ctx, me);
        if (participants.length >= 2) {
          this.createAndOpen(participants);
        } else {
          this.loading.set(false);
          this.error.set({ status: 0, message: 'Недостаточно данных для открытия чата.' });
        }
      });
  }

  private resolveMyId(ctx: ChatContext): number | null {
    const fromToken = userIdFromToken(this.tokens.accessToken);
    if (fromToken != null) return fromToken;
    const role = this.auth.role();
    if (role === 'BUYER' && isValidId(ctx.buyerId)) return ctx.buyerId;
    if (role === 'SELLER' && isValidId(ctx.sellerId)) return ctx.sellerId;
    if (role === 'MANAGER' && isValidId(ctx.managerId)) return ctx.managerId;
    return null;
  }

  private participantsFrom(ctx: ChatContext, me: number): number[] {
    const parties = [ctx.buyerId, ctx.sellerId, ctx.managerId].filter(isValidId);
    if (parties.length >= 2) return Array.from(new Set(parties));
    return isValidId(ctx.sellerId) ? Array.from(new Set([me, ctx.sellerId])) : [];
  }

  private createAndOpen(participants: number[]): void {
    const chatType = participants.length > 2 ? 'GROUP' : 'ONE_TO_ONE';
    this.chatSvc.createChat({ userIds: participants, chatType }).subscribe({
      next: (chat) => {
        if (!isValidId(chat?.id)) {
          this.loading.set(false);
          this.error.set({ status: 0, message: 'Чат создан, но сервер не вернул его id.' });
          return;
        }
        this.openChat(chat.id);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(appErrorOf(err, 'Не удалось создать чат'));
      },
    });
  }

  private openChat(chatId: number): void {
    if (!isValidId(chatId)) {
      this.error.set({ status: 0, message: 'Некорректный id чата.' });
      return;
    }
    if (this.currentChatId === chatId && this.chat()) {
      this.loading.set(false);
      return;
    }
    this.teardown();
    this.currentChatId = chatId;
    this.launcher.activeChatId.set(chatId);
    this.loading.set(true);
    this.error.set(null);
    this.chatSvc.getChat(chatId).subscribe({
      next: (chat) => {
        this.chat.set(chat);
        const ctx = this.launcher.context();
        const storedEntry = this.registry.entries().find((e) => e.chatId === chatId);
        const ctxParties = ctx?.parties ?? [];
        const stored = storedEntry?.parties ?? [];
        const resolved = mergeParties(mergeParties(this.parties(), ctxParties), stored);
        this.parties.set(resolved);
        this.registry.rememberParties(resolved);
        const orderId = ctx?.orderId ?? storedEntry?.orderId;
        this.registry.remember({
          chatId,
          name: ctx?.title,
          type: chat.chatType,
          lastActivity: chat.lastActivity ?? new Date().toISOString(),
          parties: resolved.length ? resolved : undefined,
          orderId,
        });
        if (isValidId(orderId)) this.seedPartiesFromOrder(orderId);
        // Page<ChatMessage> arrives newest-first; show oldest-first.
        this.messages.set([...(chat.messages?.content ?? [])].reverse());
        this.loading.set(false);
        this.socket
          .whenConnected()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.socket.joinChat(chatId);
            this.socket.markRead(chatId);
          });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(appErrorOf(err, 'Не удалось загрузить чат'));
      },
    });
  }

  private appendIncoming(m: ChatMessage, strictChat: boolean): void {
    if (strictChat ? m.chatId !== this.currentChatId : m.chatId != null && m.chatId !== this.currentChatId) {
      return;
    }
    this.messages.update((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
    if (!this.isMine(m)) this.socket.markDelivered(m.id);
  }

  private myMemberId(): number | undefined {
    const members = this.chat()?.members ?? [];
    const mine = members.find((m) => m.userId === this.myId);
    return mine?.id;
  }

  private seedPartiesFromOrder(orderId: number): void {
    this.orders
      .byId(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          const parties = order ? orderParties(order) : [];
          if (!parties.length) return;
          const merged = mergeParties(this.parties(), parties);
          this.parties.set(merged);
          this.registry.rememberParties(merged);
        },
        error: () => {},
      });
  }

  senderLabel(m: ChatMessage): string {
    const uid = m.userId ?? m.senderUserId;
    if (uid == null) return 'Участник';
    const party = this.parties().find((p) => p.userId === uid) ?? this.registry.party(uid);
    if (party) {
      const display = party.name || party.username;
      return display ? `${display} · ${ROLE_LABEL[party.role]}` : ROLE_LABEL[party.role];
    }
    return 'Участник';
  }

  send(): void {
    const text = this.draft.trim();
    const chatId = this.currentChatId;
    const memberId = this.myMemberId();
    if (!text || chatId == null || memberId == null) {
      if (memberId == null) this.error.set({ status: 0, message: 'memberId недоступен (контракт чата).' });
      return;
    }
    this.sending.set(true);
    this.socket.sendMessage({ chatId, memberId, message: text }).subscribe({
      next: (saved) => {
        this.messages.update((list) =>
          list.some((x) => x.id === saved.id) ? list : [...list, saved],
        );
        this.draft = '';
        this.sending.set(false);
      },
      error: () => {
        this.sending.set(false);
        this.error.set({ status: 0, message: 'Сообщение не отправлено' });
      },
    });
  }

  startEdit(m: ChatMessage): void {
    if (!this.isMine(m)) return;
    this.editingId.set(m.id);
    this.editDraft = m.message;
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft = '';
  }

  saveEdit(m: ChatMessage): void {
    const text = this.editDraft.trim();
    if (!text || !this.isMine(m) || this.savingEdit()) return;
    this.savingEdit.set(true);
    this.chatSvc.editMessage(m.id, text).subscribe({
      next: (updated) => {
        this.applyUpdated({ ...m, ...updated, message: updated?.message ?? text });
        this.savingEdit.set(false);
        this.cancelEdit();
      },
      error: () => {
        this.savingEdit.set(false);
        this.error.set({ status: 0, message: 'Не удалось изменить сообщение' });
      },
    });
  }

  removeMessage(m: ChatMessage): void {
    if (!this.isMine(m)) return;
    this.chatSvc.deleteMessage(m.id).subscribe({
      next: () => this.applyDeleted(m.id),
      error: () => this.error.set({ status: 0, message: 'Не удалось удалить сообщение' }),
    });
  }

  private applyUpdated(m: ChatMessage): void {
    this.messages.update((list) => list.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
  }

  private applyDeleted(messageId: number): void {
    this.messages.update((list) => list.filter((x) => x.id !== messageId));
    if (this.editingId() === messageId) this.cancelEdit();
  }

  isMine(m: ChatMessage): boolean {
    if (this.myId == null) return false;
    if (m.userId != null) return m.userId === this.myId;
    if (m.senderUserId != null) return m.senderUserId === this.myId;
    return m.memberId === this.myMemberId();
  }

  statusLabel(s: ChatMessage['status']): string {
    return s === 'READ' ? 'Прочитано' : s === 'DELIVERED' ? 'Доставлено' : 'Отправлено';
  }

  /** A document message carries "<fileName>\n<downloadUrl>"; render it as a download link. */
  docLink(m: ChatMessage): { name: string; url: string } | null {
    const text = m.message ?? '';
    const match = text.match(/https?:\/\/\S+/);
    if (!match) return null;
    const url = match[0];
    const name = text.replace(url, '').trim() || 'Документ';
    return { name, url };
  }

  private teardown(): void {
    if (this.currentChatId != null) this.socket.leaveChat(this.currentChatId);
    this.currentChatId = null;
    this.launcher.activeChatId.set(null);
    this.chat.set(null);
    this.messages.set([]);
  }
}

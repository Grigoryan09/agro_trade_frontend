import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/services/auth.service';
import { OrderService } from '../core/services/order.service';
import { ORDER_MANAGE_ROLES } from '../core/models/enums';
import { ChatSocketService } from './chat-socket.service';
import { orderParties } from './chat-launcher.service';
import { ChatParty, ChatRegistryEntry } from './chat.models';

function isValidId(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

@Injectable({ providedIn: 'root' })
export class ChatRegistryService {
  private auth = inject(AuthService);
  private orders = inject(OrderService);
  private socket = inject(ChatSocketService);

  private readonly entriesSig = signal<ChatRegistryEntry[]>([]);
  readonly entries = this.entriesSig.asReadonly();
  private readonly directorySig = signal<Record<number, ChatParty>>({});
  private loadedFor: number | null = null;
  private seededOrdersFor: number | null = null;

  constructor() {
    this.socket.chatOpened$.pipe(takeUntilDestroyed()).subscribe((e) =>
      this.remember({
        chatId: e.chatId,
        name: e.name,
        type: e.type,
        lastActivity: new Date().toISOString(),
      }),
    );
  }

  load(userId: number): void {
    if (!isValidId(userId)) return;
    this.seedPartiesFromOrders(userId);
    if (this.loadedFor === userId) return;
    this.loadedFor = userId;
    this.entriesSig.set(this.read(userId));
    this.directorySig.set(this.readDirectory(userId));
  }

  private seedPartiesFromOrders(userId: number): void {
    if (this.seededOrdersFor === userId) return;
    this.seededOrdersFor = userId;
    const role = this.auth.role();
    const source$ =
      role && ORDER_MANAGE_ROLES.includes(role)
        ? this.orders.list({ size: 100 })
        : this.orders.mine({ size: 100 });
    source$.subscribe({
      next: (items) => {
        for (const o of items) this.rememberParties(orderParties(o));
      },
      error: () => {
        this.seededOrdersFor = null;
      },
    });
  }

  rememberParties(parties: ChatParty[] | undefined): void {
    if (!parties?.length) return;
    const userId = this.auth.userId();
    if (!isValidId(userId)) return;
    if (this.loadedFor !== userId) this.load(userId);

    this.directorySig.update((dir) => {
      const next = { ...dir };
      for (const p of parties) {
        if (!isValidId(p.userId)) continue;
        const prev = next[p.userId];
        if (!prev || (!prev.name && p.name) || (!prev.username && p.username)) {
          next[p.userId] = { ...prev, ...p };
        }
      }
      return next;
    });
    this.writeDirectory(userId);
  }

  party(userId: number | null | undefined): ChatParty | undefined {
    if (!isValidId(userId)) return undefined;
    return this.directorySig()[userId];
  }

  remember(entry: ChatRegistryEntry): void {
    const userId = this.auth.userId();
    if (!isValidId(userId) || !isValidId(entry.chatId)) return;
    if (this.loadedFor !== userId) this.load(userId);
    this.rememberParties(entry.parties);

    this.entriesSig.update((list) => {
      const prev = list.find((e) => e.chatId === entry.chatId);
      const merged: ChatRegistryEntry = {
        chatId: entry.chatId,
        name: entry.name ?? prev?.name,
        type: entry.type ?? prev?.type,
        lastActivity: entry.lastActivity ?? prev?.lastActivity,
        parties: entry.parties ?? prev?.parties,
        orderId: entry.orderId ?? prev?.orderId,
      };
      const rest = list.filter((e) => e.chatId !== entry.chatId);
      return [merged, ...rest].sort(byLastActivityDesc);
    });
    this.write(userId);
  }

  forget(chatId: number): void {
    const userId = this.auth.userId();
    if (!isValidId(userId) || !isValidId(chatId)) return;
    if (this.loadedFor !== userId) this.load(userId);
    this.entriesSig.update((list) => list.filter((e) => e.chatId !== chatId));
    this.write(userId);
  }

  private read(userId: number): ChatRegistryEntry[] {
    try {
      const raw = localStorage.getItem(this.storageKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ChatRegistryEntry[];
      return Array.isArray(parsed)
        ? parsed.filter((e) => isValidId(e?.chatId)).sort(byLastActivityDesc)
        : [];
    } catch {
      return [];
    }
  }

  private write(userId: number): void {
    try {
      localStorage.setItem(this.storageKey(userId), JSON.stringify(this.entriesSig()));
    } catch {
      void 0;
    }
  }

  private readDirectory(userId: number): Record<number, ChatParty> {
    try {
      const raw = localStorage.getItem(this.directoryKey(userId));
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<number, ChatParty>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeDirectory(userId: number): void {
    try {
      localStorage.setItem(this.directoryKey(userId), JSON.stringify(this.directorySig()));
    } catch {
      void 0;
    }
  }

  private storageKey(userId: number): string {
    return `agro.chats.${userId}`;
  }

  private directoryKey(userId: number): string {
    return `agro.parties.${userId}`;
  }
}

function byLastActivityDesc(a: ChatRegistryEntry, b: ChatRegistryEntry): number {
  return (b.lastActivity ?? '').localeCompare(a.lastActivity ?? '');
}

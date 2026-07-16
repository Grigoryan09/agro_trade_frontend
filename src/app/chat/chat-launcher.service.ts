import { Injectable, signal } from '@angular/core';
import { OrderDetails } from '../core/models/order.models';
import { Role } from '../core/models/enums';
import { ChatParty } from './chat.models';

export type { ChatParty } from './chat.models';

/** Context that opens a chat (from a product card or an order). */
export interface ChatContext {
  /** The other participant (seller) user id, when starting a chat from a product. */
  sellerId?: number;
  sellerName?: string;
  /** Order parties, when starting a chat from an order. */
  buyerId?: number;
  managerId?: number;
  /** Existing chat id (e.g. an order's auto-created chat), when known. */
  chatId?: number;
  /** Order id this chat belongs to, for labelling. */
  orderId?: number;
  title?: string;
  /** userId → identity map, so a GROUP chat can label each sender. */
  parties?: ChatParty[];
}

/**
 * Bridges "contact seller" / "order chat" buttons across screens to the single
 * chat drawer rendered in the app shell. Chat is contextual — there is no chat
 * list page (§6).
 */
@Injectable({ providedIn: 'root' })
export class ChatLauncherService {
  readonly context = signal<ChatContext | null>(null);
  readonly activeChatId = signal<number | null>(null);

  open(ctx: ChatContext): void {
    this.context.set(ctx);
  }

  close(): void {
    this.context.set(null);
  }
}

function numericId(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function partyName(info: { name?: string; surname?: string } | undefined): string {
  const full = [info?.name, info?.surname].filter(Boolean).join(' ').trim();
  return full;
}

export function orderParties(o: OrderDetails): ChatParty[] {
  const rows: { id?: number; role: Role; name: string; username?: string }[] = [
    { id: numericId(o.buyerDetailsDto?.buyerId), role: 'BUYER', name: partyName(o.buyerDetailsDto?.baseUserInfoDto), username: o.buyerDetailsDto?.baseUserInfoDto?.username },
    { id: numericId(o.sellerDetailsDto?.sellerId), role: 'SELLER', name: partyName(o.sellerDetailsDto?.baseUserInfoDto), username: o.sellerDetailsDto?.baseUserInfoDto?.username },
    { id: numericId(o.managerDetailsDto?.managerId), role: 'MANAGER', name: partyName(o.managerDetailsDto?.baseUserInfoDto), username: o.managerDetailsDto?.baseUserInfoDto?.username },
  ];
  return rows
    .filter((r): r is { id: number; role: Role; name: string; username?: string } => r.id != null)
    .map((r) => ({ userId: r.id, role: r.role, name: r.name, username: r.username }));
}

export function orderChatContext(o: OrderDetails): ChatContext {
  return {
    chatId: o.chatId,
    orderId: o.id,
    buyerId: numericId(o.buyerDetailsDto?.buyerId),
    sellerId: numericId(o.sellerDetailsDto?.sellerId),
    managerId: numericId(o.managerDetailsDto?.managerId),
    title: `Чат по заказу №${o.id ?? ''}`,
    parties: orderParties(o),
  };
}

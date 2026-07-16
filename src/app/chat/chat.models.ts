import { Page } from '../core/models/api.models';
import { ChatStatus, ChatType, MessageStatus, Role } from '../core/models/enums';

export interface ChatParty {
  userId: number;
  role: Role;
  name: string;
  username?: string;
}

export interface ChatMember {
  id?: number; // memberId (≠ userId) — NOT reliably returned today; see CONTRACT-GAPS #4
  userId?: number;
  username?: string;
}

export interface ChatMessage {
  id: number;
  userId?: number;
  chatId?: number;
  memberId?: number;
  senderUserId?: number;
  message: string;
  status: MessageStatus;
  createdDate?: string;
  updatedDate?: string;
}

export interface ChatDetail {
  id: number;
  chatType: ChatType;
  chatStatus: ChatStatus;
  lastActivity?: string;
  members: ChatMember[];
  messages: Page<ChatMessage>;
}

export interface ChatSummary {
  id: number;
  chatType: ChatType;
  chatStatus: ChatStatus;
  lastActivity?: string;
  members: ChatMember[];
}

export interface CreateChatRequest {
  userIds: number[];
  chatType: ChatType;
}

export interface ChatDetailResponse {
  chatDetailDto: ChatDetail;
}

export interface UserChatsDto {
  chats: Page<ChatSummary>;
}

export interface UserChatsResponse {
  userChatsDto: UserChatsDto;
}

export interface ChatOpenedEvent {
  chatId: number;
  type?: ChatType;
  name?: string;
  firstMessage?: string;
}

export interface ChatRegistryEntry {
  chatId: number;
  name?: string;
  type?: ChatType;
  lastActivity?: string;
  parties?: ChatParty[];
  orderId?: number;
}

// ---- Socket payloads ----
export interface SendMessagePayload {
  chatId: number;
  memberId: number;
  message: string;
}
export interface NewMessageEvent extends ChatMessage {}
export interface MessagesReadEvent {
  chatId: number;
}
export interface MessagesReadBroadcast {
  userId: number;
  messageIds: number[];
}
export interface MessageDeliveredEvent {
  messageId: number;
}
export interface MessageUpdatedEvent extends ChatMessage {}
export interface MessageDeletedEvent {
  messageId: number;
}
export interface ChatArchivedEvent {
  chatId: number;
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, map, Observable, Subject, take } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import {
  ChatArchivedEvent,
  ChatOpenedEvent,
  MessageDeletedEvent,
  MessageDeliveredEvent,
  MessagesReadBroadcast,
  MessageUpdatedEvent,
  NewMessageEvent,
  SendMessagePayload,
} from './chat.models';

/**
 * Socket.IO client (port 9093, not proxied — see environment.socketUrl).
 * Connect once per session with the numeric userId in the handshake query.
 */
@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private socket?: Socket;
  private readonly connectedState$ = new BehaviorSubject<boolean>(false);

  readonly newMessage$ = new Subject<NewMessageEvent>();
  readonly newMessageNotification$ = new Subject<NewMessageEvent>();
  readonly chatOpened$ = new Subject<ChatOpenedEvent>();
  readonly messageDelivered$ = new Subject<MessageDeliveredEvent>();
  readonly messagesRead$ = new Subject<MessagesReadBroadcast>();
  readonly messageUpdated$ = new Subject<MessageUpdatedEvent>();
  readonly messageDeleted$ = new Subject<MessageDeletedEvent>();
  readonly chatArchived$ = new Subject<ChatArchivedEvent>();
  readonly connected$ = new Subject<void>();
  readonly error$ = new Subject<unknown>();

  /**
   * Idempotent: connect once with the current numeric user id. The value is a
   * Long on the backend; we send it as its decimal string in the query.
   */
  connect(userId: number): void {
    if (this.socket) return;
    this.socket = io(environment.socketUrl, {
      query: { userId: String(userId) },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.connectedState$.next(true);
      this.connected$.next();
    });
    this.socket.on('disconnect', () => this.connectedState$.next(false));

    this.socket.on('new_message', (m: NewMessageEvent) => this.newMessage$.next(m));
    this.socket.on('new_message_notification', (m: NewMessageEvent) =>
      this.newMessageNotification$.next(m),
    );
    this.socket.on('chat_opened', (p: ChatOpenedEvent) => {
      this.chatOpened$.next(p);
      this.socket?.emit('chat_opened_ack', { chatId: p.chatId });
    });
    this.socket.on('message_delivered', (p: MessageDeliveredEvent) =>
      this.messageDelivered$.next(p),
    );
    this.socket.on('messages_read', (p: MessagesReadBroadcast) => this.messagesRead$.next(p));
    this.socket.on('message_updated', (m: MessageUpdatedEvent) => this.messageUpdated$.next(m));
    this.socket.on('message_deleted', (p: MessageDeletedEvent) => this.messageDeleted$.next(p));
    this.socket.on('chat_archived', (p: ChatArchivedEvent) => this.chatArchived$.next(p));
    this.socket.on('error', (e: unknown) => this.error$.next(e));
  }

  whenConnected(): Observable<void> {
    return this.connectedState$.pipe(
      filter((c) => c),
      take(1),
      map(() => undefined),
    );
  }

  joinChat(chatId: number): void {
    this.socket?.emit('join_chat', chatId); // emitted as a bare number
  }
  leaveChat(chatId: number): void {
    this.socket?.emit('leave_chat', chatId);
  }
  markRead(chatId: number): void {
    this.socket?.emit('messages_read', { chatId });
  }
  markDelivered(messageId: number): void {
    this.socket?.emit('message_delivered', { messageId });
  }

  /** Send with ack; resolves to the persisted message echoed by the server. */
  sendMessage(payload: SendMessagePayload): Observable<NewMessageEvent> {
    return new Observable((sub) => {
      if (!this.socket) {
        sub.error(new Error('Socket not connected'));
        return;
      }
      this.socket.emit('send_message', payload, (ack: NewMessageEvent) => {
        sub.next(ack);
        sub.complete();
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.connectedState$.next(false);
  }
}

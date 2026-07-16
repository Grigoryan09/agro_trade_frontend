import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { API } from '../core/api-paths';
import { ChatDetail, ChatDetailResponse, ChatMessage, ChatSummary, CreateChatRequest, UserChatsResponse } from './chat.models';
import { PageQuery } from '../core/models/api.models';
import { pageParams } from '../core/util/http-params';

/** Chat REST. Socket.IO traffic lives in ChatSocketService. */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);

  createChat(body: CreateChatRequest): Observable<ChatDetail> {
    return this.http.post<ChatDetailResponse>(API.chat, body).pipe(map((r) => r.chatDetailDto));
  }

  myChats(userId: number, q: PageQuery = { size: 100 }): Observable<ChatSummary[]> {
    const params = pageParams(q).set('userId', String(userId));
    return this.http.get<UserChatsResponse>(API.chat, { params }).pipe(map((r) => r.userChatsDto.chats.content ?? []));
  }

  /** Messages come back as a Spring Page (default sort createdDate,desc). */
  getChat(id: number, q: PageQuery = { size: 200, sort: 'createdDate,desc' }): Observable<ChatDetail> {
    if (typeof id !== 'number' || !Number.isFinite(id) || id <= 0) {
      return throwError(() => new Error(`getChat: invalid id=${id}`));
    }
    return this.http
      .get<ChatDetailResponse>(`${API.chat}/${id}`, { params: pageParams(q) })
      .pipe(map((r) => r.chatDetailDto));
  }

  editMessage(messageId: number, message: string): Observable<ChatMessage> {
    return this.http.put<ChatMessage>(`${API.chat}/messages/${messageId}`, { message });
  }

  deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${API.chat}/messages/${messageId}`);
  }

  deleteChat(chatId: number): Observable<void> {
    return this.http.delete<void>(`${API.chat}/${chatId}`);
  }
}




import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../api-paths';
import { PageQuery } from '../models/api.models';
import { pageParams } from '../util/http-params';
import { CreateNewsRequest, News, NewsResponse } from '../models/news.models';

@Injectable({ providedIn: 'root' })
export class NewsService {
  private http = inject(HttpClient);
  private base = `${API.agro}/news`;

  list(q: PageQuery = {}): Observable<News[]> {
    return this.http
      .get<NewsResponse>(this.base, { params: pageParams(q) })
      .pipe(map((r) => r.baseNewsInfoDto ?? []));
  }

  mine(q: PageQuery = {}): Observable<News[]> {
    return this.http
      .get<NewsResponse>(`${this.base}/my`, { params: pageParams(q) })
      .pipe(map((r) => r.baseNewsInfoDto ?? []));
  }

  byId(id: number): Observable<News | undefined> {
    return this.http.get<NewsResponse>(`${this.base}/${id}`).pipe(map((r) => r.baseNewsInfoDto?.[0]));
  }

  create(body: CreateNewsRequest): Observable<News[]> {
    return this.http.post<NewsResponse>(this.base, body).pipe(map((r) => r.baseNewsInfoDto ?? []));
  }

  update(id: number, body: CreateNewsRequest): Observable<News[]> {
    return this.http
      .put<NewsResponse>(`${this.base}/${id}`, body)
      .pipe(map((r) => r.baseNewsInfoDto ?? []));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

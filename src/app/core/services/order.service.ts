import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../api-paths';
import { PageQuery } from '../models/api.models';
import { pageParams } from '../util/http-params';
import {
  CreateOrderRequest,
  OrderDetails,
  OrderDetailsResponse,
  UpdateOrderStatusRequest,
} from '../models/order.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private base = `${API.agro}/order`;

  list(q: PageQuery = {}): Observable<OrderDetails[]> {
    return this.http
      .get<OrderDetailsResponse>(this.base, { params: pageParams(q) })
      .pipe(map((r) => r.orderDetailsDto ?? []));
  }

  mine(q: PageQuery = {}): Observable<OrderDetails[]> {
    return this.http
      .get<OrderDetailsResponse>(`${this.base}/my`, { params: pageParams(q) })
      .pipe(map((r) => r.orderDetailsDto ?? []));
  }

  byId(id: number): Observable<OrderDetails | undefined> {
    return this.http
      .get<OrderDetailsResponse>(`${this.base}/${id}`)
      .pipe(map((r) => r.orderDetailsDto?.[0]));
  }

  create(body: CreateOrderRequest): Observable<OrderDetails[]> {
    return this.http
      .post<OrderDetailsResponse>(this.base, body)
      .pipe(map((r) => r.orderDetailsDto ?? []));
  }

  updateStatus(id: number, body: UpdateOrderStatusRequest): Observable<OrderDetails[]> {
    return this.http
      .put<OrderDetailsResponse>(`${this.base}/${id}`, body)
      .pipe(map((r) => r.orderDetailsDto ?? []));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

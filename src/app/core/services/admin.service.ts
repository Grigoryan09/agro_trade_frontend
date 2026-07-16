import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../api-paths';
import { PageQuery } from '../models/api.models';
import { pageParams } from '../util/http-params';
import { OrderStatus, Role } from '../models/enums';
import { OrderDetails, OrderDetailsResponse } from '../models/order.models';
import { ProductInfo, ProductInfoResponse } from '../models/product.models';
import { News, NewsResponse } from '../models/news.models';
import {
  OrganizationDetails,
  OrganizationDetailsResponse,
  PassportInfo,
  PassportInfoResponse,
} from '../models/user.models';
import {
  UpdateUserRolesRequest,
  UpdateUserStatusRequest,
  UserForAdmin,

  UserForAdminResponse,
} from '../models/admin.models';
/**
 * ADMIN-only oversight API (`/admin/**`). Every response is unwrapped from its
 * single camelCase wrapper field; lists and single entities both arrive as an
 * array inside the wrapper.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${API.agro}/admin`;

  // ---- Orders / transactions ----
  listOrders(opts: { orderStatus?: OrderStatus } & PageQuery = {}): Observable<OrderDetails[]> {
    let params = pageParams(opts);
    if (opts.orderStatus) params = params.set('orderStatus', opts.orderStatus);
    return this.http
      .get<OrderDetailsResponse>(`${this.base}/orders`, { params })
      .pipe(map((r) => r.orderDetailsDto ?? []));
  }

  deleteOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/orders/${id}`);
  }

  // ---- Users ----
  listUsers(opts: { role?: Role; search?: string } & PageQuery = {}): Observable<UserForAdmin[]> {
    let params = pageParams(opts);
    if (opts.role) params = params.set('role', opts.role);
    if (opts.search) params = params.set('search', opts.search);
    return this.http
      .get<UserForAdminResponse>(`${this.base}/users`, { params })
      .pipe(map((r) => r.userForAdminDto ?? []));
  }

  getUser(id: number): Observable<UserForAdmin | undefined> {
    return this.http
      .get<UserForAdminResponse>(`${this.base}/users/${id}`)
      .pipe(map((r) => r.userForAdminDto?.[0]));
  }

  updateUserRoles(id: number, body: UpdateUserRolesRequest): Observable<UserForAdmin | undefined> {
    return this.http
      .put<UserForAdminResponse>(`${this.base}/users/${id}/roles`, body)
      .pipe(map((r) => r.userForAdminDto?.[0]));
  }

  updateUserStatus(id: number, body: UpdateUserStatusRequest): Observable<UserForAdmin | undefined> {
    return this.http
      .put<UserForAdminResponse>(`${this.base}/users/${id}/status`, body)
      .pipe(map((r) => r.userForAdminDto?.[0]));
  }

  /** PII — only fetch on explicit user action. */
  getUserPassport(id: number): Observable<PassportInfo[]> {
    return this.http
      .get<PassportInfoResponse>(`${this.base}/users/${id}/passport`)
      .pipe(map((r) => r.passportInfoDto ?? []));
  }

  // ---- Products (oversight) ----
  listProducts(q: PageQuery = {}): Observable<ProductInfo[]> {
    return this.http
      .get<ProductInfoResponse>(`${this.base}/products`, { params: pageParams(q) })
      .pipe(map((r) => (r.productInfoDto ?? []).filter((p) => p.status !== 'DELETED')));
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/products/${id}`);
  }

  // ---- News (oversight; hard delete) ----
  listNews(q: PageQuery = {}): Observable<News[]> {
    return this.http
      .get<NewsResponse>(`${this.base}/news`, { params: pageParams(q) })
      .pipe(map((r) => r.baseNewsInfoDto ?? []));
  }

  deleteNews(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/news/${id}`);
  }

  // ---- Organizations (oversight) ----
  listOrganizations(q: PageQuery = {}): Observable<OrganizationDetails[]> {
    return this.http
      .get<OrganizationDetailsResponse>(`${this.base}/organizations`, { params: pageParams(q) })
      .pipe(map((r) => r.organizationDetailsDto ?? []));
  }
}

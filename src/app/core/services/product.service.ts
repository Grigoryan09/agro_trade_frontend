import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../api-paths';
import { PageQuery } from '../models/api.models';
import { pageParams } from '../util/http-params';
import {
  CreateProductRequest,
  ProductInfo,
  ProductInfoResponse,
  UpdateProductRequest,
} from '../models/product.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private base = `${API.agro}/products`;

  categories(): Observable<string[]> {
    return this.http
      .get<{ categories: string[] }>(`${this.base}/categories`)
      .pipe(map((r) => r.categories ?? []));
  }

  list(q: PageQuery = {}): Observable<ProductInfo[]> {
    return this.http
      .get<ProductInfoResponse>(this.base, { params: pageParams(q) })
      .pipe(map((r) => (r.productInfoDto ?? []).filter((p) => p.status !== 'DELETED')));
  }

  mine(q: PageQuery = {}): Observable<ProductInfo[]> {
    return this.http
      .get<ProductInfoResponse>(`${this.base}/my`, { params: pageParams(q) })
      .pipe(map((r) => (r.productInfoDto ?? []).filter((p) => p.status !== 'DELETED')));
  }

  byId(id: number): Observable<ProductInfo | undefined> {
    return this.http
      .get<ProductInfoResponse>(`${this.base}/${id}`)
      .pipe(map((r) => r.productInfoDto?.filter((p) => p.status !== 'DELETED')[0]));
  }

  create(body: CreateProductRequest): Observable<ProductInfo[]> {
    return this.http
      .post<ProductInfoResponse>(this.base, body)
      .pipe(map((r) => r.productInfoDto ?? []));
  }

  update(id: number, body: UpdateProductRequest): Observable<ProductInfo[]> {
    return this.http
      .put<ProductInfoResponse>(`${this.base}/${id}`, body)
      .pipe(map((r) => r.productInfoDto ?? []));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

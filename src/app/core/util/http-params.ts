import { HttpParams } from '@angular/common/http';
import { PageQuery } from '../models/api.models';

/** Build Spring Pageable params (page, size, sort=field,dir). */
export function pageParams(q: PageQuery = {}): HttpParams {
  let params = new HttpParams();
  if (q.page != null) params = params.set('page', q.page);
  if (q.size != null) params = params.set('size', q.size);
  if (q.sort) params = params.set('sort', q.sort);
  return params;
}

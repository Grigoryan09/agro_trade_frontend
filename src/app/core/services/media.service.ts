import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../api-paths';
import { EntityType } from '../models/enums';
import { Media, MediaListResponse } from '../models/media.models';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private http = inject(HttpClient);

  /**
   * Upload files for an entity. The field name must be exactly `files`;
   * do NOT set Content-Type manually (the browser sets the multipart boundary).
   */
  upload(entityType: EntityType, entityId: number, files: File[]): Observable<Media[]> {
    const form = new FormData();
    for (const file of files) form.append('files', file);
    return this.http
      .post<MediaListResponse>(`${API.agro}/media/${entityType}/${entityId}`, form)
      .pipe(map((r) => r.mediaDtoList ?? []));
  }
}

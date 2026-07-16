import { EntityType } from './enums';

export interface Media {
  id?: number;
  url: string; // absolute
  entityType?: EntityType;
  entityId?: number;
  fileName?: string;
}

export interface MediaListResponse {
  mediaDtoList: Media[];
}

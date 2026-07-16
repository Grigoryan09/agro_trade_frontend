import { Media } from './media.models';

export interface News {
  id: number;
  title: string;
  context: string;
  createdAt?: string;
  authorName?: string;
  media?: Media[];
  mediaUrls?: string[];
}

export interface CreateNewsRequest {
  title: string; // 3..255
  context: string; // 10..5000
}

export interface NewsResponse {
  baseNewsInfoDto: News[];
}

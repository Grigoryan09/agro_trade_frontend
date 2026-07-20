import { News } from '../models/news.models';
import { resolveMediaUrl } from './media-url';

export function newsImageUrls(n: News): string[] {
  const fromMedia = (n.media ?? []).map((m) => m.url).filter((u): u is string => !!u);
  const raw = fromMedia.length ? fromMedia : (n.mediaUrls ?? []).filter((u): u is string => !!u);
  return raw.map((u) => resolveMediaUrl(u)).filter((u): u is string => !!u);
}

export function newsThumbUrl(n: News): string | null {
  return newsImageUrls(n)[0] ?? null;
}

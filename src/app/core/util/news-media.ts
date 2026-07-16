import { News } from '../models/news.models';

export function newsImageUrls(n: News): string[] {
  const fromMedia = (n.media ?? []).map((m) => m.url).filter((u): u is string => !!u);
  if (fromMedia.length) return fromMedia;
  return (n.mediaUrls ?? []).filter((u): u is string => !!u);
}

export function newsThumbUrl(n: News): string | null {
  return newsImageUrls(n)[0] ?? null;
}
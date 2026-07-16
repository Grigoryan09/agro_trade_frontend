import { environment } from '../../../environments/environment';
import { Media } from '../models/media.models';

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const base = (environment.apiBaseUrl ?? '').replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function firstMediaUrl(media: Media[] | null | undefined): string | null {
  const raw = (media ?? []).find((m) => !!m.url)?.url;
  return resolveMediaUrl(raw);
}
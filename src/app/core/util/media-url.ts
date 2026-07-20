import { environment } from '../../../environments/environment';
import { Media } from '../models/media.models';

/**
 * The backend builds media URLs from its *own* host/port, so in Docker they come
 * back pointing at a container-internal address the browser cannot reach
 * (`http://agro_trade-web-1:8080/media/x.jpg`). Locally the same code happens to
 * emit `http://localhost:8080/...`, which works only because dev shares a host.
 *
 * So we keep just the path and serve it same-origin, where nginx routes `/media/`
 * to the API. `data:`/`blob:` URLs are local previews and pass through untouched.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const base = (environment.apiBaseUrl ?? '').replace(/\/$/, '');
  let path = url;

  if (/^(https?:)?\/\//i.test(url)) {
    try {
      path = new URL(url, window.location.origin).pathname;
    } catch {
      return url;
    }
  }

  if (!path.startsWith('/')) path = `/${path}`;
  return `${base}${path}`;
}

export function firstMediaUrl(media: Media[] | null | undefined): string | null {
  const raw = (media ?? []).find((m) => !!m.url)?.url;
  return resolveMediaUrl(raw);
}

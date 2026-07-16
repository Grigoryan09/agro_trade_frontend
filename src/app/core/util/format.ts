/** Shared display formatters (RU locale). */

const RUB = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  return RUB.format(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** appErrorOf — pull the normalized AppError attached by the error interceptor. */
import { AppError } from '../models/api.models';
export function appErrorOf(err: unknown, fallback = 'Произошла ошибка'): AppError {
  const e = (err as { appError?: AppError }).appError;
  return e ?? { status: 0, message: fallback };
}

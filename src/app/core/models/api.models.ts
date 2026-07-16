/**
 * Spring `Page<T>` shape. Chat returns a full page (with totalPages).
 * Agro Trade lists return only `content` (no totalElements/totalPages) — see PageLite.
 */
export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number; // current page index
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

/** Agro Trade "optimistic" page: no totals, only the rows. */
export interface PageLite<T> {
  content: T[];
}

export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string; // 'field,dir'
}

/** Agro Trade business error. */
export interface ApiBusinessError {
  status: number;
  message: string;
  errorCode: string;
  timestamp: string;
}

/** Validation error (400) — Agro Trade & Document. */
export interface ApiValidationError {
  status: number;
  message: string;
  path?: string;
  details: { field: string; message: string }[];
}

/** Document/Banking 500 generator error. */
export interface ApiGeneratorError {
  code: string;
  message: string;
}

/** Normalized error surfaced to UI components. */
export interface AppError {
  status: number;
  message: string;
  errorCode?: string;
  fieldErrors?: Record<string, string>;
}

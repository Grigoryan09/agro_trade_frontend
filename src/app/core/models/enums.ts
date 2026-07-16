export type Role = 'BUYER' | 'SELLER' | 'MANAGER' | 'OPERATOR' | 'ADMIN';

// NOTE: backend typo preserved on purpose — lowercase 'l' in FEMAlE.
export type Gender = 'MALE' | 'FEMAlE';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELED' | 'DELETED';
export type ProductStatus = 'AVAILABLE' | 'OUT_OF_STOCK' | 'DELETED';
export type CategoryProduct = 'SEEDS';
export type EntityType = 'USER' | 'NEWS' | 'PRODUCT';

// Banking
export type OfferType = 'CREDIT' | 'LEASING';
export type TermUnit = 'MONTHS' | 'YEARS';
export type DocumentStatus = 'PENDING' | 'COMPLETED';

// Chat
export type ChatType = 'ONE_TO_ONE' | 'GROUP';
export type ChatStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Мужской' },
  { value: 'FEMAlE', label: 'Женский' },
];

export const CATEGORY_LABEL: Record<string, string> = {
  SEEDS: 'Семена',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category;
}

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'CANCELED',
  'DELETED',
];

/** All assignable roles (for admin role-editing & filters). */
export const ROLES: Role[] = ['BUYER', 'SELLER', 'MANAGER', 'OPERATOR', 'ADMIN'];

export const ROLE_LABEL: Record<Role, string> = {
  BUYER: 'Покупатель',
  SELLER: 'Продавец',
  MANAGER: 'Менеджер',
  OPERATOR: 'Оператор',
  ADMIN: 'Администратор',
};

/**
 * Role → badge color class. Single source for role coloring; the classes
 * themselves live in styles.css (`.badge-green`, `.badge-blue`, …).
 */
export const ROLE_BADGE_CLASS: Record<Role, string> = {
  BUYER: 'badge-green',
  SELLER: 'badge-blue',
  MANAGER: 'badge-yellow',
  OPERATOR: 'badge-gray',
  ADMIN: 'badge-red',
};

/** Roles that unlock the Admin section. */
export const ADMIN_ROLES: Role[] = ['ADMIN'];

/**
 * Roles allowed to create/edit/delete news. Backend permits OPERATOR or ADMIN.
 * For operators-only, change this to ['OPERATOR'] — single source of truth.
 */
export const NEWS_WRITE_ROLES: Role[] = ['OPERATOR', 'ADMIN'];

/**
 * Roles allowed to manage orders (status changes etc.) in the UI.
 * NOTE: the backend does not gate order endpoints by role today — this is a
 * UI-only assumption. Single source of truth to avoid scattered string checks.
 */
export const ORDER_MANAGE_ROLES: Role[] = ['MANAGER', 'ADMIN'];

export const ORDER_SELLER_MANAGE_ROLES: Role[] = ['SELLER'];

export const CHAT_DELETE_ROLES: Role[] = ['MANAGER', 'BUYER', 'SELLER'];

/**
 * Roles allowed to create/edit products in the UI. BUYER and MANAGER are
 * excluded by requirement; ADMIN kept since it was previously ungated.
 * NOTE: the backend does not gate product create by role — this is UI-only.
 */
export const PRODUCT_CREATE_ROLES: Role[] = ['SELLER', 'ADMIN'];

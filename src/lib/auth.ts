import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'delivery' | 'customer' | 'unknown';

const validRoles = new Set<UserRole>(['admin', 'delivery', 'customer', 'unknown']);

function normalizeRole(role?: unknown): UserRole {
  if (typeof role !== 'string') return 'unknown';
  const r = role.toLowerCase() as UserRole;
  return validRoles.has(r) ? r : 'unknown';
}

const legacyRoleByEmail: Record<string, UserRole> = {
  'adm@terrafort.com': 'admin',
  'user@terrafort.com': 'delivery',
  'cliente@terrafort.com': 'customer',
};

export function getUserRoleFromUser(user?: User | null): UserRole {
  if (!user) return 'unknown';

  const appRole = normalizeRole((user.app_metadata as Record<string, unknown> | undefined)?.role);
  if (appRole !== 'unknown') return appRole;

  const userRole = normalizeRole((user.user_metadata as Record<string, unknown> | undefined)?.role);
  if (userRole !== 'unknown') return userRole;

  return legacyRoleByEmail[(user.email || '').toLowerCase()] || 'unknown';
}

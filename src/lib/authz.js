const DEFAULT_ADMIN_EMAILS = ['ramasaniluckyn@gmail.com'];

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const configuredAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => normalizeEmail(email))
  .filter(Boolean);

export const ADMIN_EMAILS = Array.from(
  new Set([...DEFAULT_ADMIN_EMAILS, ...configuredAdminEmails])
);

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

export function getEffectiveRole(user, profileRole) {
  if (isAdminEmail(user?.email)) return 'admin';
  return profileRole || 'user';
}

export function isAllowedRole(user, profile, allowedRoles = []) {
  if (!allowedRoles?.length) return true;
  return allowedRoles.includes(getEffectiveRole(user, profile?.role));
}

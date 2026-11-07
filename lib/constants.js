// lib/constants.js

export const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  'nitinbhagatxyz@gmail.com'
).toLowerCase().trim();

/**
 * Validates whether an email matches the authorized administrator email.
 */
export function isEmailAdmin(email) {
  if (!email || typeof email !== 'string') return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL;
}

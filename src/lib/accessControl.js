export const ADMIN_EMAIL_ALLOWLIST = new Set([
  'rayen@bahroun.com',
  'ahmedmidonajjar@gmail.com',
]);

export function canAccessAdmin(user) {
  if (!user) return false;
  const email = String(user.email || '').toLowerCase();
  return user.role === 'ADMIN' || ADMIN_EMAIL_ALLOWLIST.has(email);
}


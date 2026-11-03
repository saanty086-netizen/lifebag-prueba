/* La interfaz refleja permisos. Firestore debe hacerlos cumplir con firestore.rules. */
export const ADMIN_EMAILS = ['saanty086@gmail.com', 'lifebag11@gmail.com'];
export function isAdmin(user) {
  return !!user && user.emailVerified === true && ADMIN_EMAILS.includes((user.email || '').toLowerCase());
}
export function hasAccess(user, profile) {
  return !!user && (isAdmin(user) || profile?.estado === 'aprobado');
}
export function canEdit(user, profile, area) {
  return isAdmin(user) || (hasAccess(user, profile) && profile?.permisos?.[area] === true);
}
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
export function normalizePhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) digits = '549' + digits;
  else if (digits.startsWith('54') && digits.length === 12) digits = '549' + digits.slice(2);
  return digits;
}

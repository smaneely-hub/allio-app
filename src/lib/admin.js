const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean)

const FALLBACK_ADMIN_EMAILS = ['smaneely@gmail.com']

const EFFECTIVE_ADMIN_EMAILS = Array.from(new Set([...ADMIN_EMAILS, ...FALLBACK_ADMIN_EMAILS]))

export function isAdminEmail(email) {
  if (!email) return false
  return EFFECTIVE_ADMIN_EMAILS.includes(String(email).trim().toLowerCase())
}

export function getAdminAccessReason(user) {
  if (!user) return 'You need to sign in to access admin tools.'
  if (!user.email) return 'This account does not have an email address we can verify for admin access.'
  if (!EFFECTIVE_ADMIN_EMAILS.length) return 'Admin access is not configured yet. Add VITE_ADMIN_EMAILS to enable the admin scaffold.'
  return 'This account is signed in, but it is not on the current admin allowlist.'
}

export function getAdminScaffoldStatus() {
  return {
    configuredAdmins: EFFECTIVE_ADMIN_EMAILS.length,
    mode: ADMIN_EMAILS.length ? 'allowlist-ui-env-plus-fallback' : 'allowlist-ui-fallback',
  }
}

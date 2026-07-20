export function timeLeftLabel(expiresAt) {
  if (!expiresAt) return ''
  const msLeft = expiresAt * 1000 - Date.now()
  if (msLeft <= 0) return 'Expired'
  const hours = msLeft / (1000 * 60 * 60)
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m left`
  if (hours < 24) return `${Math.round(hours)}h left`
  return `${Math.round(hours / 24)}d left`
}

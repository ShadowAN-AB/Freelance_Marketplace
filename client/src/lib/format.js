export function inr(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatRelative(value) {
  if (!value) return '—'
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function formatDue(value) {
  if (!value) return '—'
  const days = Math.round((new Date(value).getTime() - Date.now()) / 86400000)
  if (days < 0) return `overdue ${Math.abs(days)}d`
  if (days === 0) return 'due today'
  if (days < 14) return `due in ${days}d`
  return `due ${formatDate(value)}`
}

export function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback
}

export function pricingLabel(project) {
  if (project?.pricingType === 'hourly') return 'Hourly'
  const n = project?.milestones?.length || 0
  if (n >= 2) return `Fixed · ${n} milestones`
  return 'Fixed price'
}

export function skillMatchPercent(projectSkills = [], freelancerSkills = []) {
  const required = [...new Set(projectSkills.map((s) => String(s).toLowerCase().trim()).filter(Boolean))]
  const have = new Set(freelancerSkills.map((s) => String(s).toLowerCase().trim()))
  if (!required.length) return 0
  const matched = required.filter((s) => have.has(s)).length
  return Math.round((100 * matched) / required.length)
}

export const CATEGORIES = [
  'Web Development',
  'Mobile',
  'UI/UX',
  'Data',
  'Writing',
  'Marketing',
  'Other',
]

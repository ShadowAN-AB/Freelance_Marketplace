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

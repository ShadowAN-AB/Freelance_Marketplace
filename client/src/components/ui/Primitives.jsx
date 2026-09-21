export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary:
      'bg-coral text-white shadow-[0_8px_0_#c4321c] hover:-translate-y-0.5 hover:bg-[#ff6a50] active:translate-y-0 active:shadow-[0_4px_0_#c4321c]',
    ghost: 'border-2 border-ink bg-white hover:bg-saffron',
    danger: 'bg-danger text-white hover:opacity-90',
  }
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[15px] font-bold transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-muted">{label}</span>
      {children}
    </label>
  )
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-xl border-2 border-line bg-white px-3 py-2.5 outline-none focus:border-teal ${className}`}
      {...props}
    />
  )
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full rounded-xl border-2 border-line bg-white px-3 py-2.5 outline-none focus:border-teal ${className}`}
      {...props}
    />
  )
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-paper-2 text-ink',
    teal: 'bg-teal text-white',
    gold: 'bg-saffron text-ink',
    danger: 'bg-coral text-white',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const tone =
    status === 'open' || status === 'accepted' || status === 'released' || status === 'completed' || status === 'available'
      ? 'teal'
      : status === 'pending' || status === 'held' || status === 'in_progress' || status === 'active' || status === 'busy'
        ? 'gold'
        : 'danger'
  return <Badge tone={tone}>{String(status).replaceAll('_', ' ')}</Badge>
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-coral/40 bg-white/80 p-10 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mt-2 text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Spinner() {
  return <p className="p-8 font-semibold text-teal">Loading…</p>
}

export function ErrorText({ error }) {
  if (!error) return null
  return <p className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-semibold text-danger">{error}</p>
}

export function Avatar({ user, size = 'md' }) {
  const dim = size === 'lg' ? 'h-16 w-16 text-xl' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${dim} rounded-full object-cover ring-2 ring-saffron`} />
  }
  const letters = (user?.name || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <span className={`${dim} inline-flex items-center justify-center rounded-full bg-gradient-to-br from-teal to-teal-2 text-white font-bold`}>
      {letters}
    </span>
  )
}

const CATEGORY_TONES = [
  'bg-teal/15 text-teal',
  'bg-coral/15 text-coral',
  'bg-saffron/40 text-ink',
]

export function SkillChip({ children, index = 0 }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CATEGORY_TONES[index % CATEGORY_TONES.length]}`}>
      {children}
    </span>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-teal text-paper hover:bg-teal-2',
    ghost: 'border border-line bg-transparent hover:bg-paper-2',
    danger: 'bg-danger text-white hover:opacity-90',
  }
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-[15px] font-semibold disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-muted">{label}</span>
      {children}
    </label>
  )
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-md border border-line bg-white px-3 py-2 outline-none focus:border-teal ${className}`}
      {...props}
    />
  )
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full rounded-md border border-line bg-white px-3 py-2 outline-none focus:border-teal ${className}`}
      {...props}
    />
  )
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-paper-2 text-ink',
    teal: 'bg-teal/10 text-teal',
    gold: 'bg-gold/15 text-gold',
    danger: 'bg-danger/10 text-danger',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tones[tone]}`}>
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
    <div className="rounded-xl border border-dashed border-line bg-white/60 p-10 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mt-2 text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Spinner() {
  return <p className="p-8 text-muted">Loading…</p>
}

export function ErrorText({ error }) {
  if (!error) return null
  return <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
}

export function Avatar({ user, size = 'md' }) {
  const dim = size === 'lg' ? 'h-16 w-16 text-xl' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${dim} rounded-full object-cover`} />
  }
  const letters = (user?.name || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <span className={`${dim} inline-flex items-center justify-center rounded-full bg-teal text-paper font-semibold`}>
      {letters}
    </span>
  )
}

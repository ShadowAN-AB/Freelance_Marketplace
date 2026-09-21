import { Link, NavLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export function PublicNav() {
  const { user, logout } = useAuth()
  return (
    <header className="sticky top-0 z-20 border-b-2 border-ink/10 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-display text-2xl">
          Freelance<span className="text-coral">Hub</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-bold">
          <Link to="/projects" className="hover:text-coral">
            Projects
          </Link>
          <Link to="/freelancers" className="hover:text-teal">
            Talent
          </Link>
          {user ? (
            <>
              <Link to={user.role === 'admin' ? '/admin' : '/app/dashboard'}>Dashboard</Link>
              <button onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="rounded-full bg-coral px-4 py-1.5 text-white shadow-[0_4px_0_#c4321c]">
                Join
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export function PublicLayout({ children }) {
  return (
    <div className="min-h-svh">
      <PublicNav />
      {children}
      <footer className="border-t-2 border-ink/10 px-4 py-8 text-center text-sm text-muted">
        FreelanceHub demo · password <span className="font-bold text-ink">Password123!</span> ·{' '}
        <Link to="/login" className="font-semibold text-teal">
          viva logins
        </Link>
      </footer>
    </div>
  )
}

const links = {
  freelancer: [
    ['Dashboard', '/app/dashboard'],
    ['Browse', '/projects'],
    ['Proposals', '/app/proposals'],
    ['Active work', '/app/work'],
    ['Saved', '/app/saved'],
    ['Messages', '/app/messages'],
    ['Notifications', '/app/notifications'],
    ['Earnings', '/app/earnings'],
    ['Profile', '/app/profile'],
    ['Settings', '/app/settings'],
  ],
  client: [
    ['Dashboard', '/app/dashboard'],
    ['Post project', '/app/projects/new'],
    ['My projects', '/app/projects'],
    ['Messages', '/app/messages'],
    ['Notifications', '/app/notifications'],
    ['Active work', '/app/work'],
    ['Saved', '/app/saved'],
    ['Payments', '/app/earnings'],
    ['Profile', '/app/profile'],
    ['Settings', '/app/settings'],
  ],
  admin: [
    ['Analytics', '/admin'],
    ['Users', '/admin/users'],
    ['Projects', '/admin/projects'],
    ['Reports', '/admin/reports'],
    ['Contracts', '/admin/contracts'],
    ['Audit', '/admin/audit'],
  ],
}

export function AppShell({ children }) {
  const { user, logout } = useAuth()
  const items = links[user.role] || links.client
  const unread = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => (await api.get('/conversations/unread-count')).data,
    refetchInterval: 20000,
    enabled: user.role !== 'admin',
  })
  const alerts = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
    refetchInterval: 20000,
  })
  return (
    <div className="min-h-svh md:grid md:grid-cols-[250px_1fr]">
      <aside className="border-b-2 border-ink/10 bg-ink text-white md:border-b-0 md:border-r-0">
        <div className="px-5 py-6">
          <Link to="/" className="font-display text-2xl">
            Freelance<span className="text-saffron">Hub</span>
          </Link>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-2">{user.role}</p>
        </div>
        <nav className="flex gap-3 overflow-x-auto px-4 pb-4 md:block md:space-y-1 md:overflow-visible">
          {items.map(([label, href]) => (
            <NavLink
              key={href}
              to={href}
              end={href === '/app/dashboard' || href === '/admin' || href === '/app/projects'}
              className={({ isActive }) =>
                `flex items-center rounded-full px-3 py-2 text-sm font-bold ${isActive ? 'bg-coral text-white' : 'text-white/80 hover:bg-white/10'}`
              }
            >
              {label}
              {href === '/app/messages' && unread.data?.unread ? (
                <span
                  className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] text-white"
                  aria-live="polite"
                  aria-label={`${unread.data.unread} unread conversations`}
                >
                  {unread.data.unread}
                </span>
              ) : null}
              {href === '/app/notifications' && alerts.data?.unread ? (
                <CountBadge count={alerts.data.unread} />
              ) : null}
            </NavLink>
          ))}
          <button onClick={logout} className="block w-full rounded-full px-3 py-2 text-left text-sm font-bold text-white/50">
            Log out
          </button>
        </nav>
      </aside>
      <div>
        <Topbar alertCount={alerts.data?.unread || 0} />
        {!user.emailVerified ? (
          <div className="mx-4 mt-4 rounded-2xl border-2 border-saffron bg-saffron/30 px-4 py-3 text-sm font-semibold md:mx-8">
            Verify your email to post, propose, hire, and chat.{' '}
            <Link to="/app/settings" className="text-teal">Resend from Settings</Link>
          </div>
        ) : null}
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  )
}

function CountBadge({ count }) {
  if (!count) return null
  return (
    <span
      className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] text-white"
      aria-live="polite"
      aria-label={`${count} unread alerts`}
    >
      {count}
    </span>
  )
}

function Topbar({ alertCount = 0 }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
    refetchInterval: 20000,
  })
  const mark = useMutation({
    mutationFn: () => api.patch('/notifications/read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  return (
    <div className="flex items-center justify-between border-b-2 border-ink/10 px-4 py-3 md:px-8">
      <p className="text-sm font-semibold">
        Signed in as <span className="text-coral">{user.name}</span>
      </p>
      <details className="relative">
        <summary className="flex cursor-pointer list-none items-center rounded-full bg-saffron px-4 py-1.5 text-sm font-bold outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-coral">
          Alerts
          <CountBadge count={alertCount || data?.unread || 0} />
        </summary>
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-2xl border-2 border-ink/10 bg-white p-3 shadow-[8px_8px_0_rgba(28,18,8,0.12)]">
          <div className="mb-2 flex justify-between">
            <span className="text-sm font-bold">Notifications</span>
            <button className="text-xs font-bold text-coral" onClick={() => mark.mutate()}>
              Mark read
            </button>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {(data?.data || []).slice(0, 8).map((n) => (
              <Link key={n._id} to={n.link || '/app/dashboard'} className="block rounded-xl bg-paper p-2 text-sm">
                <strong>{n.title}</strong>
                <p className="text-muted">{n.body}</p>
              </Link>
            ))}
            {!data?.data?.length ? <p className="text-sm text-muted">No notifications yet.</p> : null}
          </div>
          <Link to="/app/notifications" className="mt-2 block text-center text-sm font-bold text-teal">
            See all
          </Link>
        </div>
      </details>
    </div>
  )
}

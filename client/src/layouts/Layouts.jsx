import { Link, NavLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export function PublicNav() {
  const { user, logout } = useAuth()
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-display text-2xl">
          FreelanceHub
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link to="/projects">Projects</Link>
          <Link to="/freelancers">Talent</Link>
          {user ? (
            <>
              <Link to={user.role === 'admin' ? '/admin' : '/app/dashboard'}>Dashboard</Link>
              <button onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="rounded-md bg-teal px-3 py-1.5 text-paper">
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
    </div>
  )
}

const links = {
  freelancer: [
    ['Dashboard', '/app/dashboard'],
    ['Browse', '/projects'],
    ['Proposals', '/app/proposals'],
    ['Active work', '/app/work'],
    ['Messages', '/app/messages'],
    ['Earnings', '/app/earnings'],
    ['Profile', '/app/profile'],
    ['Settings', '/app/settings'],
  ],
  client: [
    ['Dashboard', '/app/dashboard'],
    ['Post project', '/app/projects/new'],
    ['My projects', '/app/projects'],
    ['Messages', '/app/messages'],
    ['Active work', '/app/work'],
    ['Profile', '/app/profile'],
    ['Settings', '/app/settings'],
  ],
  admin: [
    ['Analytics', '/admin'],
    ['Users', '/admin/users'],
    ['Projects', '/admin/projects'],
    ['Reports', '/admin/reports'],
  ],
}

export function AppShell({ children }) {
  const { user, logout } = useAuth()
  const items = links[user.role] || links.client
  return (
    <div className="min-h-svh md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-white md:border-b-0 md:border-r">
        <div className="px-5 py-5">
          <Link to="/" className="font-display text-2xl">
            FreelanceHub
          </Link>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{user.role}</p>
        </div>
        <nav className="flex gap-3 overflow-x-auto px-4 pb-4 md:block md:space-y-1 md:overflow-visible">
          {items.map(([label, href]) => (
            <NavLink
              key={href}
              to={href}
              end={href === '/app/dashboard' || href === '/admin' || href === '/app/projects'}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-paper-2 text-teal' : 'text-ink hover:bg-paper'}`
              }
            >
              {label}
            </NavLink>
          ))}
          <button onClick={logout} className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-muted">
            Log out
          </button>
        </nav>
      </aside>
      <div>
        <Topbar />
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  )
}

function Topbar() {
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
    <div className="flex items-center justify-between border-b border-line px-4 py-3 md:px-8">
      <p className="text-sm text-muted">Signed in as {user.name}</p>
      <details className="relative">
        <summary className="cursor-pointer list-none rounded-md border border-line px-3 py-1.5 text-sm font-semibold">
          Alerts {data?.unread ? `(${data.unread})` : ''}
        </summary>
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-line bg-white p-3 shadow-sm">
          <div className="mb-2 flex justify-between">
            <span className="text-sm font-semibold">Notifications</span>
            <button className="text-xs text-teal" onClick={() => mark.mutate()}>
              Mark read
            </button>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {(data?.data || []).slice(0, 8).map((n) => (
              <Link key={n._id} to={n.link || '/app/dashboard'} className="block rounded-md bg-paper p-2 text-sm">
                <strong>{n.title}</strong>
                <p className="text-muted">{n.body}</p>
              </Link>
            ))}
            {!data?.data?.length ? <p className="text-sm text-muted">No notifications yet.</p> : null}
          </div>
        </div>
      </details>
    </div>
  )
}

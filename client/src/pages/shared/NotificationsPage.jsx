import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { EmptyState, Spinner } from '../../components/ui/Primitives'
import { formatRelative } from '../../lib/format'

const FILTERS = [
  ['', 'All'],
  ['hire', 'Hire'],
  ['chat', 'Chat'],
  ['money', 'Money'],
  ['other', 'Other'],
]

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const type = params.get('type') || ''
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', type],
    queryFn: async () => (await api.get('/notifications', { params: { type: type || undefined } })).data,
  })
  const list = data?.data || []
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Notifications</h1>
        {list.some((n) => !n.read) ? (
          <button
            type="button"
            className="rounded-full border-2 border-ink/10 bg-white px-3 py-1 text-sm font-bold"
            onClick={() => api.patch('/notifications/read').then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))}
          >
            Mark all read
          </button>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map(([id, label]) => (
          <button
            key={id || 'all'}
            type="button"
            onClick={() => setParams(id ? { type: id } : {})}
            className={`rounded-full px-3 py-1 text-sm font-bold ${type === id ? 'bg-coral text-white' : 'border-2 border-ink/10 bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {isLoading ? <Spinner /> : null}
      <ul className="mt-6 space-y-2">
        {list.map((n) => (
          <li key={n._id}>
            <Link
              to={n.link || '/app/dashboard'}
              onClick={() => {
                if (!n.read) {
                  api.patch(`/notifications/${n._id}/read`).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))
                }
              }}
              className={`block rounded-2xl border-2 p-4 ${n.read ? 'border-ink/10 bg-white' : 'border-coral/40 bg-coral/5'}`}
            >
              <p className="font-semibold">{n.title}</p>
              <p className="text-sm text-muted">{n.body}</p>
              <p className="mt-1 text-xs text-muted">{formatRelative(n.createdAt)}</p>
            </Link>
          </li>
        ))}
      </ul>
      {!isLoading && !list.length ? (
        <div className="mt-8">
          <EmptyState title="No notifications" body="Hires, messages, and escrow updates land here." />
        </div>
      ) : null}
    </div>
  )
}

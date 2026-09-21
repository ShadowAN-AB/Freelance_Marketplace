import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr } from '../../lib/format'

export default function AdminContractsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-contracts'],
    queryFn: async () => (await api.get('/admin/contracts', { params: { limit: 50 } })).data,
  })
  if (isLoading) return <Spinner />
  return (
    <div>
      <h1 className="font-display text-4xl">Contracts & escrow</h1>
      <ul className="mt-6 space-y-3">
        {(data?.data || []).map((c) => (
          <li key={c._id} className="rounded-2xl border-2 border-ink/10 bg-white p-4">
            <div className="flex justify-between gap-3">
              <p className="font-semibold">{c.projectId?.title}</p>
              <StatusBadge status={c.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {c.clientId?.name} → {c.freelancerId?.name} · {inr(c.amount)}
            </p>
            <p className="mt-1 text-sm">Escrow: {c.payment?.status || '—'}</p>
            {c.disputeReason ? <p className="mt-2 text-sm">{c.disputeReason}</p> : null}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm">
        <Link className="text-teal" to="/admin/audit">
          View audit log
        </Link>
      </p>
    </div>
  )
}

export function AdminAuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => (await api.get('/admin/audit', { params: { limit: 50 } })).data,
  })
  if (isLoading) return <Spinner />
  return (
    <div>
      <h1 className="font-display text-4xl">Audit log</h1>
      <p className="mt-2 text-sm text-muted">Impersonation is disabled. Blocks, reports, and skill verification are recorded here.</p>
      <ul className="mt-6 space-y-2">
        {(data?.data || []).map((row) => (
          <li key={row._id} className="rounded-2xl border-2 border-ink/10 bg-white p-4 text-sm">
            <p className="font-semibold">{row.action}</p>
            <p className="text-muted">
              {row.actorId?.name || 'system'} · {row.targetType} {row.targetId}
            </p>
          </li>
        ))}
        {!data?.data?.length ? <p className="text-muted">No audit events yet.</p> : null}
      </ul>
    </div>
  )
}

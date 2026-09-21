import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { EmptyState, Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr } from '../../lib/format'

export default function EarningsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['payments-me'],
    queryFn: async () => (await api.get('/payments/me')).data,
  })
  if (isLoading) return <Spinner />
  return (
    <div>
      <h1 className="font-display text-4xl">Earnings</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Released</p>
          <p className="font-display mt-2 text-4xl">{inr(data?.totalReleased)}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Held in escrow</p>
          <p className="font-display mt-2 text-4xl">{inr(data?.totalHeld)}</p>
        </div>
      </div>
      {!data?.data?.length ? <div className="mt-8"><EmptyState title="No ledger yet" body="Accepted work appears here as held, then released." /></div> : null}
      <ul className="mt-6 space-y-3">
        {(data?.data || []).map((p) => (
          <li key={p._id} className="flex items-center justify-between rounded-xl border border-line bg-white p-4">
            <div>
              <p className="font-semibold">{p.contractId?.projectId?.title || 'Contract'}</p>
              <p className="text-sm text-muted">{inr(p.amount)}</p>
            </div>
            <StatusBadge status={p.status} />
          </li>
        ))}
      </ul>
    </div>
  )
}

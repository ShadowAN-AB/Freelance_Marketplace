import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Button, EmptyState, Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'

async function downloadLedger() {
  const res = await api.get('/payments/me.csv', { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = 'freelancehub-ledger.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function EarningsPage() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['payments-me'],
    queryFn: async () => (await api.get('/payments/me')).data,
  })
  if (isLoading) return <Spinner />
  const isClient = user?.role === 'client'
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">{isClient ? 'Payments' : 'Earnings'}</h1>
        <Button variant="ghost" type="button" onClick={downloadLedger}>
          Download CSV
        </Button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-teal to-teal-2 p-5 text-white shadow-[6px_6px_0_rgba(28,18,8,0.12)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">Released</p>
          <p className="font-display mt-2 text-4xl">{inr(data?.totalReleased)}</p>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-saffron to-[#ffd56a] p-5 text-ink shadow-[6px_6px_0_rgba(28,18,8,0.12)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">Held in escrow</p>
          <p className="font-display mt-2 text-4xl">{inr(data?.totalHeld)}</p>
        </div>
      </div>
      {!data?.data?.length ? <div className="mt-8"><EmptyState title="No ledger yet" body={isClient ? 'Hired work appears here as held escrow, then released.' : 'Accepted work appears here as held, then released.'} /></div> : null}
      <ul className="mt-6 space-y-3">
        {(data?.data || []).map((p) => {
          const contractId = p.contractId?._id || p.contractId
          return (
            <li key={p._id} className="flex items-center justify-between rounded-2xl border-2 border-ink/10 bg-white p-4">
              <div>
                <p className="font-semibold">{p.contractId?.projectId?.title || 'Contract'}</p>
                <p className="text-sm text-muted">{inr(p.amount)}</p>
                {contractId ? (
                  <Link to={`/app/work/${contractId}/invoice`} className="mt-1 inline-block text-sm font-bold text-teal">
                    Invoice
                  </Link>
                ) : null}
              </div>
              <StatusBadge status={p.status} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

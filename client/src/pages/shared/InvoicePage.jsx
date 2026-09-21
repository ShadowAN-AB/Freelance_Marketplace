import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Spinner } from '../../components/ui/Primitives'
import { formatDate, inr } from '../../lib/format'

export default function InvoicePage() {
  const { id } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => (await api.get(`/contracts/${id}/invoice`)).data,
  })
  if (isLoading) return <Spinner />
  const inv = data?.invoice
  if (!inv) return <p className="p-8">Invoice not found.</p>
  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:shadow-none">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">FreelanceHub invoice</p>
          <h1 className="font-display mt-2 text-4xl">{inv.projectTitle}</h1>
        </div>
        <button type="button" className="rounded-full bg-coral px-4 py-2 text-sm font-bold text-white print:hidden" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <p className="mt-4 text-sm text-muted">
        {inv.client?.name} → {inv.freelancer?.name}
      </p>
      <p className="text-sm text-muted">Started {formatDate(inv.startDate)} · {inv.status}</p>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="py-2">Item</th>
            <th className="py-2">Status</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(inv.lineItems || []).map((row, i) => (
            <tr key={i} className="border-b border-line/70">
              <td className="py-2">{row.label}</td>
              <td className="py-2">{row.status}</td>
              <td className="py-2 text-right">{inr(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-6 grid grid-cols-2 gap-2 text-sm">
        <dt>Held</dt><dd className="text-right">{inr(inv.held)}</dd>
        <dt>Released</dt><dd className="text-right">{inr(inv.released)}</dd>
        <dt>Refunded</dt><dd className="text-right">{inr(inv.refunded)}</dd>
        <dt className="font-bold">Cap / total</dt><dd className="text-right font-bold">{inr(inv.amount)}</dd>
      </dl>
      <p className="mt-8 print:hidden">
        <Link to="/app/work" className="font-bold text-teal">Back to work</Link>
      </p>
    </div>
  )
}

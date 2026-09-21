import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { Button, EmptyState, Field, Spinner, StatusBadge, Textarea } from '../../components/ui/Primitives'
import { inr, errorMessage } from '../../lib/format'

export default function WorkPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['contracts-me'],
    queryFn: async () => (await api.get('/contracts/me')).data,
  })
  if (isLoading) return <Spinner />
  const list = data?.data || []
  return (
    <div>
      <h1 className="font-display text-4xl">{user.role === 'client' ? 'Hired work' : 'Active work'}</h1>
      {!list.length ? <div className="mt-8"><EmptyState title="No contracts" body="Hire or get hired to see work here." /></div> : null}
      <ul className="mt-6 space-y-4">
        {list.map((c) => (
          <ContractCard key={c._id} contract={c} onChange={() => qc.invalidateQueries({ queryKey: ['contracts-me'] })} />
        ))}
      </ul>
    </div>
  )
}

function ContractCard({ contract, onChange }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const detail = useQuery({
    queryKey: ['contract', contract._id],
    queryFn: async () => (await api.get(`/contracts/${contract._id}`)).data,
  })
  const submit = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/submit-work`),
    onSuccess: onChange,
  })
  const complete = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/complete`),
    onSuccess: onChange,
  })
  const review = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/reviews`, { rating, comment }),
    onSuccess: onChange,
    onError: (err) => setError(errorMessage(err)),
  })
  const payment = detail.data?.payment
  const alreadyReviewed = (detail.data?.reviews || []).some((r) => r.reviewerId === user._id || r.reviewerId?._id === user._id)
  return (
    <li className="rounded-xl border border-line bg-white p-5">
      <div className="flex justify-between gap-3">
        <h2 className="font-display text-2xl">{contract.projectId?.title}</h2>
        <StatusBadge status={contract.status} />
      </div>
      <p className="mt-2 text-muted">
        {contract.clientId?.name} · {contract.freelancerId?.name} · {inr(contract.amount)}
      </p>
      {payment ? <p className="mt-1 text-sm">Escrow: {payment.status}</p> : null}
      {user.role === 'freelancer' && contract.status === 'active' && !contract.workSubmittedAt ? (
        <Button className="mt-4" onClick={() => submit.mutate()}>Submit work</Button>
      ) : null}
      {contract.workSubmittedAt && contract.status === 'active' ? <p className="mt-2 text-teal">Work submitted. Waiting for client approval.</p> : null}
      {user.role === 'client' && contract.status === 'active' && contract.workSubmittedAt ? (
        <Button className="mt-4" onClick={() => complete.mutate()}>Approve & release payment</Button>
      ) : null}
      {contract.status === 'completed' && !alreadyReviewed ? (
        <form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); review.mutate() }}>
          <p className="font-semibold">Leave a review</p>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Field label="Rating">
            <select className="rounded-md border border-line px-3 py-2" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
            </select>
          </Field>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} required />
          <Button>Publish review</Button>
        </form>
      ) : null}
    </li>
  )
}

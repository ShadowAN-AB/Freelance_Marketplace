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
          <ContractCard
            key={c._id}
            contract={c}
            onChange={() => {
              qc.invalidateQueries({ queryKey: ['contracts-me'] })
              qc.invalidateQueries({ queryKey: ['contract', c._id] })
            }}
          />
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
  const [files, setFiles] = useState([])
  const [revisionNote, setRevisionNote] = useState('')
  const [showRevision, setShowRevision] = useState(false)
  const detail = useQuery({
    queryKey: ['contract', contract._id],
    queryFn: async () => (await api.get(`/contracts/${contract._id}`)).data,
  })
  const live = detail.data?.contract || contract
  const submit = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      for (const file of files) fd.append('files', file)
      return api.post(`/contracts/${contract._id}/submit-work`, fd)
    },
    onSuccess: () => {
      setFiles([])
      onChange()
    },
    onError: (err) => setError(errorMessage(err)),
  })
  const complete = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/complete`),
    onSuccess: onChange,
    onError: (err) => setError(errorMessage(err)),
  })
  const revise = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/request-revision`, { note: revisionNote }),
    onSuccess: () => {
      setShowRevision(false)
      setRevisionNote('')
      onChange()
    },
    onError: (err) => setError(errorMessage(err)),
  })
  const review = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/reviews`, { rating, comment }),
    onSuccess: onChange,
    onError: (err) => setError(errorMessage(err)),
  })
  const payment = detail.data?.payment
  const alreadyReviewed = (detail.data?.reviews || []).some((r) => r.reviewerId === user._id || r.reviewerId?._id === user._id)
  const deliverables = live.deliverables || []
  const submitted = Boolean(live.workSubmittedAt)
  return (
    <li className="rounded-2xl border-2 border-ink/10 bg-white p-5">
      <div className="flex justify-between gap-3">
        <h2 className="font-display text-2xl">{live.projectId?.title}</h2>
        <StatusBadge status={live.status} />
      </div>
      <p className="mt-2 text-muted">
        {live.clientId?.name} · {live.freelancerId?.name} · {inr(live.amount)}
      </p>
      {payment ? <p className="mt-1 text-sm">Escrow: {payment.status}</p> : null}
      {live.revisionCount ? <p className="mt-1 text-sm text-muted">Revisions requested: {live.revisionCount}</p> : null}
      {live.revisionNote && live.status === 'active' && !submitted ? (
        <p className="mt-3 rounded-xl bg-saffron/40 p-3 text-sm">
          <strong>Revision requested: </strong>
          {live.revisionNote}
        </p>
      ) : null}
      {deliverables.length ? (
        <div className="mt-3">
          <p className="text-sm font-bold">Deliverables</p>
          <ul className="mt-1 space-y-1">
            {deliverables.map((file) => (
              <li key={file.url}>
                <a className="text-sm font-semibold text-teal" href={file.url} download={file.originalName} target="_blank" rel="noreferrer">
                  {file.originalName}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {user.role === 'freelancer' && live.status === 'active' && !submitted ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            submit.mutate()
          }}
        >
          <Field label="Attach files (PDF, ZIP, PNG, JPEG, WebP · 8MB)">
            <input
              type="file"
              multiple
              accept=".pdf,.zip,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </Field>
          <Button disabled={submit.isPending}>{submit.isPending ? 'Submitting…' : 'Submit work'}</Button>
        </form>
      ) : null}
      {submitted && live.status === 'active' ? <p className="mt-2 text-teal">Work submitted. Waiting for client approval.</p> : null}
      {user.role === 'client' && live.status === 'active' && submitted ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => complete.mutate()} disabled={complete.isPending}>Approve & release payment</Button>
          <Button variant="ghost" onClick={() => setShowRevision((v) => !v)}>Request revision</Button>
        </div>
      ) : null}
      {showRevision && user.role === 'client' ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            revise.mutate()
          }}
        >
          <Field label="What needs to change?">
            <Textarea rows={3} value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} required minLength={8} />
          </Field>
          <Button disabled={revise.isPending}>Send revision request</Button>
        </form>
      ) : null}
      {live.status === 'completed' && !alreadyReviewed ? (
        <form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); review.mutate() }}>
          <p className="font-semibold">Leave a review</p>
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

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../services/api'
import { Button, EmptyState, Field, Input, Spinner, StatusBadge, Textarea } from '../../components/ui/Primitives'
import { formatDate, inr, errorMessage } from '../../lib/format'

function activityItems(contract, payment) {
  const items = []
  if (contract.startDate) items.push({ at: contract.startDate, label: 'Hired' })
  for (const m of contract.milestones || []) {
    if (m.workSubmittedAt) items.push({ at: m.workSubmittedAt, label: `Submitted · ${m.title}` })
    if (m.revisionNote) items.push({ at: m.workSubmittedAt || contract.updatedAt, label: `Revision · ${m.title}` })
    if (m.releasedAt) items.push({ at: m.releasedAt, label: `Released · ${m.title}` })
  }
  for (const t of contract.timeEntries || []) {
    if (t.status === 'approved') items.push({ at: t.reviewedAt || t.date, label: `Approved ${t.hours}h` })
  }
  if (contract.cancelledAt) items.push({ at: contract.cancelledAt, label: 'Cancelled' })
  if (contract.completedAt) items.push({ at: contract.completedAt, label: 'Completed' })
  if (payment?.releasedAt && !items.some((i) => i.label === 'Completed')) {
    items.push({ at: payment.releasedAt, label: 'Escrow released' })
  }
  return items.sort((a, b) => new Date(a.at) - new Date(b.at))
}

function escrowLabel(payment) {
  if (!payment) return ''
  const released = payment.releasedAmount || (payment.status === 'released' ? payment.amount : 0)
  if (released > 0 && released < payment.amount) return `partial · ${inr(released)} / ${inr(payment.amount)}`
  return `${payment.status} · ${inr(released)} / ${inr(payment.amount)}`
}

export default function WorkPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['contracts-me'],
    queryFn: async () => (await api.get('/contracts/me', { params: { limit: 50 } })).data,
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
  const toast = useToast()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [files, setFiles] = useState([])
  const [revisionNote, setRevisionNote] = useState('')
  const [showRevision, setShowRevision] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [hours, setHours] = useState('1')
  const [timeNote, setTimeNote] = useState('')
  const [timeDate, setTimeDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [milestoneFiles, setMilestoneFiles] = useState({})
  const detail = useQuery({
    queryKey: ['contract', contract._id],
    queryFn: async () => (await api.get(`/contracts/${contract._id}`)).data,
  })
  const live = detail.data?.contract || contract
  const milestones = live.milestones || []
  const multi = milestones.length > 1
  const submit = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      for (const file of files) fd.append('files', file)
      return api.post(`/contracts/${contract._id}/submit-work`, fd)
    },
    onSuccess: () => {
      setFiles([])
      toast.push('Work submitted')
      onChange()
    },
    onError: (err) => setError(errorMessage(err)),
  })
  const complete = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/complete`),
    onSuccess: () => {
      toast.push('Payment released')
      onChange()
    },
    onError: (err) => setError(errorMessage(err)),
  })
  const revise = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/request-revision`, { note: revisionNote }),
    onSuccess: () => {
      setShowRevision(false)
      setRevisionNote('')
      toast.push('Revision requested')
      onChange()
    },
    onError: (err) => setError(errorMessage(err)),
  })
  const cancel = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/cancel`, { reason: cancelReason }),
    onSuccess: () => {
      setShowCancel(false)
      toast.push('Contract cancelled and escrow refunded')
      onChange()
    },
    onError: (err) => setError(errorMessage(err)),
  })
  const review = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/reviews`, { rating, comment }),
    onSuccess: onChange,
    onError: (err) => setError(errorMessage(err)),
  })
  const logTime = useMutation({
    mutationFn: () => api.post(`/contracts/${contract._id}/time-entries`, { hours: Number(hours), note: timeNote, date: timeDate }),
    onSuccess: () => {
      setTimeNote('')
      toast.push('Hours logged')
      onChange()
    },
    onError: (err) => setError(errorMessage(err)),
  })
  const payment = detail.data?.payment
  const alreadyReviewed = (detail.data?.reviews || []).some((r) => r.reviewerId === user._id || r.reviewerId?._id === user._id)
  const deliverables = live.deliverables || []
  const submitted = Boolean(live.workSubmittedAt)
  const hourly = live.pricingType === 'hourly'

  async function submitSlice(mid) {
    const fd = new FormData()
    for (const file of milestoneFiles[mid] || []) fd.append('files', file)
    try {
      await api.post(`/contracts/${contract._id}/milestones/${mid}/submit-work`, fd)
      toast.push('Slice submitted')
      onChange()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function releaseSlice(mid) {
    try {
      await api.post(`/contracts/${contract._id}/milestones/${mid}/release`)
      toast.push('Slice released')
      onChange()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function reviseSlice(mid) {
    try {
      await api.post(`/contracts/${contract._id}/milestones/${mid}/request-revision`, { note: revisionNote || 'Please revise this slice.' })
      setRevisionNote('')
      toast.push('Revision requested')
      onChange()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function reviewTime(tid, approve) {
    try {
      await api.post(`/contracts/${contract._id}/time-entries/${tid}/${approve ? 'approve' : 'reject'}`)
      toast.push(approve ? 'Hours approved' : 'Hours rejected')
      onChange()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <li className="rounded-2xl border-2 border-ink/10 bg-white p-5">
      <div className="flex justify-between gap-3">
        <h2 className="font-display text-2xl">{live.projectId?.title}</h2>
        <StatusBadge status={live.status} />
      </div>
      <p className="mt-2 text-muted">
        {live.clientId?.name} · {live.freelancerId?.name} · {inr(live.amount)}
        {hourly ? ` · ${inr(live.hourlyRate)}/hr cap` : ''}
      </p>
      {payment ? <p className="mt-1 text-sm">Escrow: {escrowLabel(payment)}</p> : null}
      {live.status === 'completed' || live.status === 'cancelled' ? (
        <Link to={`/app/work/${live._id}/invoice`} className="mt-2 inline-block text-sm font-bold text-teal">Invoice</Link>
      ) : null}
      {live.revisionCount ? <p className="mt-1 text-sm text-muted">Revisions requested: {live.revisionCount}</p> : null}
      {live.revisionNote && live.status === 'active' && !submitted && !multi ? (
        <p className="mt-3 rounded-xl bg-saffron/40 p-3 text-sm">
          <strong>Revision requested: </strong>
          {live.revisionNote}
        </p>
      ) : null}
      {milestones.length ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-bold">Milestones</p>
          {milestones.map((m) => (
            <div key={m._id} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{m.title} · {inr(m.amount)}</p>
                <StatusBadge status={m.status} />
              </div>
              {m.revisionNote && m.status === 'pending' ? (
                <p className="mt-2 text-sm">Revision: {m.revisionNote}</p>
              ) : null}
              {(m.deliverables || []).map((file) => (
                <a key={file.url} className="mt-1 block text-sm font-semibold text-teal" href={file.url} target="_blank" rel="noreferrer">
                  {file.originalName}
                </a>
              ))}
              {user.role === 'freelancer' && live.status === 'active' && m.status !== 'released' ? (
                <div className="mt-2 space-y-2">
                  <input type="file" multiple accept=".pdf,.zip,.png,.jpg,.jpeg,.webp" onChange={(e) => setMilestoneFiles((prev) => ({ ...prev, [m._id]: Array.from(e.target.files || []) }))} />
                  <Button type="button" onClick={() => submitSlice(m._id)}>Submit this slice</Button>
                </div>
              ) : null}
              {user.role === 'client' && live.status === 'active' && m.status === 'submitted' ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => releaseSlice(m._id)}>Release this slice</Button>
                  <Button variant="ghost" type="button" onClick={() => reviseSlice(m._id)}>Request revision</Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {hourly ? (
        <div className="mt-4 rounded-xl border border-line p-3">
          <p className="text-sm font-bold">Time entries</p>
          <ul className="mt-2 space-y-1 text-sm">
            {(live.timeEntries || []).map((t) => (
              <li key={t._id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{formatDate(t.date)} · {t.hours}h · {t.note || '—'} · {t.status}</span>
                {user.role === 'client' && live.status === 'active' && t.status === 'pending' ? (
                  <span className="flex gap-2">
                    <button type="button" className="font-bold text-teal" onClick={() => reviewTime(t._id, true)}>Approve</button>
                    <button type="button" className="font-bold text-danger" onClick={() => reviewTime(t._id, false)}>Reject</button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {user.role === 'freelancer' && live.status === 'active' ? (
            <form className="mt-3 grid gap-2 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); logTime.mutate() }}>
              <Input type="number" min="0.25" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
              <Input type="date" value={timeDate} onChange={(e) => setTimeDate(e.target.value)} />
              <Input placeholder="Note" value={timeNote} onChange={(e) => setTimeNote(e.target.value)} />
              <Button disabled={logTime.isPending}>Log hours</Button>
            </form>
          ) : null}
        </div>
      ) : null}
      {deliverables.length && !multi ? (
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
      <div className="mt-4 border-l-4 border-teal/40 pl-3">
        <p className="text-sm font-bold">Activity</p>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {activityItems(live, payment).map((item, i) => (
            <li key={`${item.label}-${i}`}>{formatDate(item.at)} · {item.label}</li>
          ))}
        </ul>
      </div>
      {live.status === 'cancelled' && live.disputeReason ? (
        <p className="mt-3 rounded-xl bg-coral/10 p-3 text-sm">
          <strong>Cancelled: </strong>
          {live.disputeReason}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {user.role === 'freelancer' && live.status === 'active' && !submitted && !multi && !hourly ? (
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
      {submitted && live.status === 'active' && !multi ? <p className="mt-2 text-teal">Work submitted. Waiting for client approval.</p> : null}
      {user.role === 'client' && live.status === 'active' && (hourly || (submitted && !multi) || (multi && milestones.every((m) => m.status === 'released' || m.status === 'submitted'))) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => complete.mutate()} disabled={complete.isPending}>
            {hourly ? 'Confirm & close' : 'Approve & release payment'}
          </Button>
          {!hourly && submitted && !multi ? (
            <Button variant="ghost" onClick={() => setShowRevision((v) => !v)}>Request revision</Button>
          ) : null}
        </div>
      ) : null}
      {live.status === 'active' ? (
        <div className="mt-3">
          <Button variant="ghost" onClick={() => setShowCancel((v) => !v)}>Cancel & refund escrow</Button>
        </div>
      ) : null}
      {showCancel ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            cancel.mutate()
          }}
        >
          <Field label="Why are you cancelling?">
            <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} required minLength={8} />
          </Field>
          <Button variant="danger" disabled={cancel.isPending}>Confirm cancel</Button>
        </form>
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

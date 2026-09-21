import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button, ErrorText, Field, Input, Textarea } from './ui/Primitives'
import { errorMessage } from '../lib/format'
import api from '../services/api'

export function ReportControl({ targetType, targetId }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  if (!user || user.role === 'admin') return null
  if (targetType === 'user' && user._id === targetId) return null

  async function submit(e) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await api.post('/reports', { targetType, targetId, reason, details })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="text-sm font-bold text-muted hover:text-coral" onClick={() => setOpen(true)}>
        Report {targetType === 'user' ? 'user' : 'project'}
      </button>
    )
  }

  return (
    <div className="mt-4 rounded-2xl border-2 border-ink/10 bg-white p-4">
      <p className="font-bold">Report {targetType}</p>
      {done ? (
        <p className="mt-2 text-sm text-teal">Thanks. Moderators will review this report.</p>
      ) : (
        <form className="mt-3 space-y-3" onSubmit={submit}>
          <ErrorText error={error} />
          <Field label="Reason">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={80} required />
          </Field>
          <Field label="Details">
            <Textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
          </Field>
          <div className="flex gap-2">
            <Button disabled={pending}>{pending ? 'Sending…' : 'Submit report'}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  )
}

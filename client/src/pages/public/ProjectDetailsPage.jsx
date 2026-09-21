import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { Button, ErrorText, Field, Spinner, StatusBadge, Textarea, Input } from '../../components/ui/Primitives'
import { inr, formatDate, errorMessage } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { ReportControl } from '../../components/ReportControl'
import api from '../../services/api'

export default function ProjectDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [form, setForm] = useState({ coverLetter: '', bidAmount: '', estimatedDays: '' })
  const [error, setError] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => (await api.get(`/projects/${id}`)).data,
  })
  const propose = useMutation({
    mutationFn: () =>
      api.post(`/projects/${id}/proposals`, {
        coverLetter: form.coverLetter,
        bidAmount: Number(form.bidAmount),
        estimatedDays: Number(form.estimatedDays),
      }),
    onSuccess: () => {
      setError('')
      qc.invalidateQueries({ queryKey: ['project', id] })
      alert('Proposal sent')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  if (isLoading) return <PublicLayout><Spinner /></PublicLayout>
  const project = data?.project
  if (!project) return <PublicLayout><p className="p-8">Project not found.</p></PublicLayout>
  const isOwner = user && project.clientId?._id === user._id

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{project.category}</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="font-display text-4xl">{project.title}</h1>
          <div className="flex items-center gap-2">
            {user?.role === 'freelancer' ? <SaveProjectToggle projectId={id} /> : null}
            <StatusBadge status={project.status} />
          </div>
        </div>
        <p className="mt-3 text-muted">
          Posted by {project.clientId?.name} · due {formatDate(project.deadline)}
        </p>
        <p className="mt-6 whitespace-pre-wrap leading-relaxed">{project.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.skills.map((s) => (
            <span key={s} className="rounded-full bg-teal/15 px-3 py-1 text-sm font-bold text-teal">{s}</span>
          ))}
        </div>
        <p className="mt-6 font-semibold">
          {inr(project.budgetMin)} – {inr(project.budgetMax)}
        </p>
        {isOwner ? (
          <Link to={`/app/projects/${id}/proposals`} className="mt-6 inline-block text-teal font-semibold">
            Review proposals →
          </Link>
        ) : null}
        {user?.role === 'freelancer' && project.status === 'open' ? (
          <form
            className="mt-10 space-y-3 rounded-2xl border-2 border-ink/10 bg-white p-5"
            onSubmit={(e) => {
              e.preventDefault()
              propose.mutate()
            }}
          >
            <h2 className="font-display text-2xl">Submit a proposal</h2>
            <ErrorText error={error} />
            <Field label="Cover letter">
              <Textarea rows={5} value={form.coverLetter} onChange={(e) => setForm({ ...form, coverLetter: e.target.value })} required />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Bid (INR)">
                <Input type="number" value={form.bidAmount} onChange={(e) => setForm({ ...form, bidAmount: e.target.value })} required />
              </Field>
              <Field label="Estimated days">
                <Input type="number" value={form.estimatedDays} onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })} required />
              </Field>
            </div>
            <Button disabled={propose.isPending}>Send proposal</Button>
          </form>
        ) : null}
        {!user ? (
          <p className="mt-8">
            <Link className="text-teal" to="/login">Log in</Link> as a freelancer to propose.
          </p>
        ) : null}
        <div className="mt-10">
          <ReportControl targetType="project" targetId={id} />
        </div>
      </div>
    </PublicLayout>
  )
}

function SaveProjectToggle({ projectId }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['saved-me'],
    queryFn: async () => (await api.get('/users/me/saved')).data,
  })
  const saved = (data?.projects || []).some((p) => p._id === projectId)
  const toggle = useMutation({
    mutationFn: () =>
      saved
        ? api.delete(`/users/me/saved-projects/${projectId}`)
        : api.post(`/users/me/saved-projects/${projectId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-me'] }),
  })
  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${saved ? 'border-coral bg-coral text-white' : 'border-ink/20 bg-white'}`}
    >
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}

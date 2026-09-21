import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { Button, ErrorText, Field, Spinner, StatusBadge, Textarea, Input } from '../../components/ui/Primitives'
import { inr, formatDate, errorMessage } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
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
          <StatusBadge status={project.status} />
        </div>
        <p className="mt-3 text-muted">
          Posted by {project.clientId?.name} · due {formatDate(project.deadline)}
        </p>
        <p className="mt-6 whitespace-pre-wrap leading-relaxed">{project.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.skills.map((s) => (
            <span key={s} className="rounded-full bg-paper-2 px-3 py-1 text-sm">{s}</span>
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
            className="mt-10 space-y-3 rounded-xl border border-line bg-white p-5"
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
      </div>
    </PublicLayout>
  )
}

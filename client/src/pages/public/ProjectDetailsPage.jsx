import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { Button, ErrorText, Field, Spinner, StatusBadge, Textarea, Input } from '../../components/ui/Primitives'
import { inr, formatDue, errorMessage, pricingLabel } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ReportControl } from '../../components/ReportControl'
import api from '../../services/api'

export default function ProjectDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
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
      toast.push('Proposal sent')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  if (isLoading) {
    return (
      <PublicLayout>
        <Spinner />
      </PublicLayout>
    )
  }
  const project = data?.project
  if (!project) {
    return (
      <PublicLayout>
        <p className="p-8">Project not found.</p>
      </PublicLayout>
    )
  }
  const isOwner = user && project.clientId?._id === user._id
  const myProposal = data?.myProposal
  const canBid = user?.role === 'freelancer' && project.status === 'open' && (!myProposal || myProposal.status === 'withdrawn')

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
          Posted by{' '}
          {project.clientId?._id ? (
            <Link className="font-semibold text-teal" to={`/clients/${project.clientId._id}`}>
              {project.clientId?.clientProfile?.companyName || project.clientId?.name}
            </Link>
          ) : (
            project.clientId?.name
          )}{' '}
          · {formatDue(project.deadline)}
        </p>
        <p className="mt-6 whitespace-pre-wrap leading-relaxed">{project.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.skills.map((s) => (
            <span key={s} className="rounded-full bg-teal/15 px-3 py-1 text-sm font-bold text-teal">
              {s}
            </span>
          ))}
        </div>
        <p className="mt-6 font-semibold">
          {pricingLabel(project)} · {inr(project.budgetMin)} – {inr(project.budgetMax)}
        </p>
        {project.pricingType === 'hourly' ? (
          <p className="mt-2 text-sm text-muted">Hourly work. Escrow holds the max budget as a cap until hours are approved.</p>
        ) : null}
        {project.pricingType !== 'hourly' && project.milestones?.length >= 2 ? (
          <div className="mt-6 overflow-hidden rounded-2xl border-2 border-ink/10 bg-white">
            <p className="border-b-2 border-ink/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Planned milestones
            </p>
            <ul>
              {project.milestones.map((m) => (
                <li key={m._id || m.title} className="flex items-center justify-between border-b border-ink/5 px-4 py-3 last:border-0">
                  <span className="font-semibold">{m.title}</span>
                  <span className="font-bold text-teal">{inr(m.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {isOwner ? (
          <Link to={`/app/projects/${id}/proposals`} className="mt-6 inline-block font-semibold text-teal">
            Review proposals →
          </Link>
        ) : null}
        {myProposal && user?.role === 'freelancer' ? (
          <div className="mt-8 rounded-2xl border-2 border-ink/10 bg-white p-5">
            <h2 className="font-display text-2xl">Your proposal</h2>
            <p className="mt-2">
              Status: <StatusBadge status={myProposal.status} />
            </p>
            <p className="mt-2 font-semibold">
              {inr(myProposal.bidAmount)} · {myProposal.estimatedDays} days
            </p>
            <p className="mt-2 whitespace-pre-wrap text-muted">{myProposal.coverLetter}</p>
            {myProposal.status === 'withdrawn' ? (
              <p className="mt-3 text-sm text-muted">You withdrew this bid. You can submit a new one below.</p>
            ) : null}
          </div>
        ) : null}
        {canBid ? (
          <form
            className="mt-10 space-y-3 rounded-2xl border-2 border-ink/10 bg-white p-5"
            onSubmit={(e) => {
              e.preventDefault()
              propose.mutate()
            }}
          >
            <h2 className="font-display text-2xl">{myProposal?.status === 'withdrawn' ? 'Submit a new proposal' : 'Submit a proposal'}</h2>
            <ErrorText error={error} />
            <Field label={`Cover letter (${form.coverLetter.length}/4000)`}>
              <Textarea
                rows={5}
                maxLength={4000}
                value={form.coverLetter}
                onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                required
              />
            </Field>
            {project.budgetMax && Number(form.bidAmount) > project.budgetMax ? (
              <p className="text-sm font-bold text-danger">This bid is above the {inr(project.budgetMax)} max budget.</p>
            ) : null}
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
            <Link className="text-teal" to="/login">
              Log in
            </Link>{' '}
            as a freelancer to propose.
          </p>
        ) : null}
        <div className="mt-10">
          <ReportControl targetType="project" targetId={id} />
        </div>
        <SimilarProjects projectId={id} />
      </div>
    </PublicLayout>
  )
}

function SimilarProjects({ projectId }) {
  const { data } = useQuery({
    queryKey: ['similar-projects', projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}/similar`)).data,
  })
  const list = data?.data || []
  if (!list.length) return null
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl">Similar open work</h2>
      <ul className="mt-4 space-y-3">
        {list.map((p) => (
          <li key={p._id}>
            <Link to={`/projects/${p._id}`} className="block rounded-2xl border-2 border-ink/10 bg-white p-4 hover:border-teal">
              <p className="font-display text-xl">{p.title}</p>
              <p className="text-sm text-muted">
                {p.category} · {inr(p.budgetMin)} – {inr(p.budgetMax)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
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
      saved ? api.delete(`/users/me/saved-projects/${projectId}`) : api.post(`/users/me/saved-projects/${projectId}`),
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

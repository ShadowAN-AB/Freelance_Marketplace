import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { Avatar, Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr, errorMessage } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ReportControl } from '../../components/ReportControl'
import api from '../../services/api'

export default function FreelancerProfilePage() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => (await api.get(`/users/${id}`)).data,
  })
  const reviews = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => (await api.get(`/users/${id}/reviews`)).data,
  })
  if (isLoading) return <PublicLayout><Spinner /></PublicLayout>
  const user = data?.user
  if (!user) return <PublicLayout><p className="p-8">Not found.</p></PublicLayout>
  const fp = user.freelancerProfile || {}
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar user={user} size="lg" />
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">{fp.title || 'Freelancer'}</p>
              <h1 className="font-display text-4xl">{user.name}</h1>
              <p className="text-muted">{user.location}</p>
            </div>
          </div>
          {me?.role === 'client' ? (
            <div className="flex flex-col items-end gap-2">
              <SaveTalentToggle freelancerId={id} />
              <InviteToBid freelancerId={id} />
            </div>
          ) : null}
        </div>
        <p className="mt-6 leading-relaxed">{user.bio}</p>
        <p className="mt-4 font-semibold">
          {user.avgRating ? `${user.avgRating} ★ (${user.reviewCount})` : 'No reviews yet'}
          {fp.hourlyRate ? ` · ${inr(fp.hourlyRate)}/hr` : ''}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(fp.skills || []).map((s) => (
            <span key={s} className="rounded-full bg-coral/15 px-3 py-1 text-sm font-bold text-coral">
              {s}
              {(fp.verifiedSkills || []).includes(s) ? ' ✓' : ''}
            </span>
          ))}
        </div>
        {fp.availability ? <div className="mt-4"><StatusBadge status={fp.availability} /></div> : null}
        <h2 className="font-display mt-10 text-3xl">Portfolio</h2>
        <ul className="mt-3 space-y-2">
          {(fp.portfolio || []).map((item) => (
            <li key={item._id || item.title} className="rounded-lg border border-line bg-white p-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />
              ) : null}
              <a href={item.url || '#'} className="font-semibold">
                {item.title}
              </a>
            </li>
          ))}
          {!fp.portfolio?.length ? <p className="text-muted">No portfolio items yet.</p> : null}
        </ul>
        <h2 className="font-display mt-10 text-3xl">Reviews</h2>
        <ul className="mt-3 space-y-3">
          {(reviews.data?.data || []).map((r) => (
            <li key={r._id} className="rounded-lg border border-line bg-white p-4">
              <p className="font-semibold">{r.rating} ★ · {r.reviewerId?.name}</p>
              <p className="mt-1 text-muted">{r.comment}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <ReportControl targetType="user" targetId={id} />
        </div>
      </div>
    </PublicLayout>
  )
}

function InviteToBid({ freelancerId }) {
  const toast = useToast()
  const { data } = useQuery({
    queryKey: ['my-projects'],
    queryFn: async () => (await api.get('/projects', { params: { mine: 'true', limit: 50 } })).data,
  })
  const open = (data?.data || []).filter((p) => p.status === 'open')
  const [projectId, setProjectId] = useState('')
  const invite = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/invites`, { freelancerId }),
    onSuccess: () => toast.push('Invite sent'),
    onError: (err) => toast.push(errorMessage(err)),
  })
  if (!open.length) return null
  return (
    <form
      className="flex flex-col items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (projectId) invite.mutate()
      }}
    >
      <select className="rounded-md border border-line px-2 py-1 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
        <option value="">Invite to bid…</option>
        {open.map((p) => (
          <option key={p._id} value={p._id}>{p.title}</option>
        ))}
      </select>
      <button type="submit" className="rounded-full border-2 border-ink/20 bg-white px-3 py-1 text-sm font-bold" disabled={invite.isPending}>
        {invite.isSuccess ? 'Invited' : 'Send invite'}
      </button>
    </form>
  )
}

function SaveTalentToggle({ freelancerId }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['saved-me'],
    queryFn: async () => (await api.get('/users/me/saved')).data,
  })
  const saved = (data?.talent || []).some((f) => f._id === freelancerId)
  const toggle = useMutation({
    mutationFn: () =>
      saved
        ? api.delete(`/users/me/saved-talent/${freelancerId}`)
        : api.post(`/users/me/saved-talent/${freelancerId}`),
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

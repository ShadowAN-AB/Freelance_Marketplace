import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { Avatar, Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr } from '../../lib/format'
import api from '../../services/api'

export default function FreelancerProfilePage() {
  const { id } = useParams()
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
        <div className="flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">{fp.title || 'Freelancer'}</p>
            <h1 className="font-display text-4xl">{user.name}</h1>
            <p className="text-muted">{user.location}</p>
          </div>
        </div>
        <p className="mt-6 leading-relaxed">{user.bio}</p>
        <p className="mt-4 font-semibold">
          {user.avgRating ? `${user.avgRating} ★ (${user.reviewCount})` : 'No reviews yet'}
          {fp.hourlyRate ? ` · ${inr(fp.hourlyRate)}/hr` : ''}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(fp.skills || []).map((s) => (
            <span key={s} className="rounded-full bg-paper-2 px-3 py-1 text-sm">{s}</span>
          ))}
        </div>
        {fp.availability ? <div className="mt-4"><StatusBadge status={fp.availability} /></div> : null}
        <h2 className="font-display mt-10 text-3xl">Portfolio</h2>
        <ul className="mt-3 space-y-2">
          {(fp.portfolio || []).map((item) => (
            <li key={item._id || item.title} className="rounded-lg border border-line bg-white p-3">
              <a href={item.url || '#'} className="font-semibold">{item.title}</a>
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
      </div>
    </PublicLayout>
  )
}

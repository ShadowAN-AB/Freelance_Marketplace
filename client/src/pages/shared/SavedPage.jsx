import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { EmptyState, Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr } from '../../lib/format'

export default function SavedPage() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['saved-me'],
    queryFn: async () => (await api.get('/users/me/saved')).data,
  })
  if (isLoading) return <Spinner />
  const projects = data?.projects || []
  const talent = data?.talent || []
  const isFreelancer = user.role === 'freelancer'
  const isClient = user.role === 'client'

  return (
    <div>
      <h1 className="font-display text-4xl">Saved</h1>
      <p className="mt-2 text-muted">
        {isFreelancer ? 'Projects you bookmarked to bid on later.' : null}
        {isClient ? 'Talent you bookmarked to hire later.' : null}
      </p>

      {isFreelancer ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl">Saved projects</h2>
          {!projects.length ? (
            <div className="mt-4">
              <EmptyState title="No saved projects" body="Bookmark an open project from its details page." />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {projects.map((p) => (
                <li key={p._id} className="rounded-2xl border-2 border-ink/10 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/projects/${p._id}`} className="font-display text-2xl hover:text-coral">
                      {p.title}
                    </Link>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {p.clientId?.name} · {inr(p.budgetMin)} – {inr(p.budgetMax)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {isClient ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl">Saved talent</h2>
          {!talent.length ? (
            <div className="mt-4">
              <EmptyState title="No saved talent" body="Bookmark a freelancer from their public profile." />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {talent.map((f) => (
                <li key={f._id} className="rounded-2xl border-2 border-ink/10 bg-white p-5">
                  <Link to={`/freelancers/${f._id}`} className="font-display text-2xl hover:text-teal">
                    {f.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {f.freelancerProfile?.title || 'Freelancer'}
                    {f.avgRating ? ` · ${f.avgRating} ★` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}

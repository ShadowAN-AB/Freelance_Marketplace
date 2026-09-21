import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { formatDate, inr } from '../../lib/format'
import { EmptyState, Spinner } from '../../components/ui/Primitives'
import { ProjectCard, FreelancerCard } from '../../components/project/Cards'

function dueSoon(date) {
  if (!date) return false
  const t = new Date(date).getTime()
  const now = Date.now()
  return t >= now && t <= now + 7 * 24 * 60 * 60 * 1000
}

export default function DashboardPage() {
  const { user } = useAuth()
  if (user.role === 'freelancer') return <FreelancerDash />
  if (user.role === 'client') return <ClientDash />
  return null
}

function Stat({ label, value, tone = 'teal' }) {
  const tones = {
    teal: 'from-teal to-teal-2 text-white',
    coral: 'from-coral to-[#ff7a63] text-white',
    gold: 'from-saffron to-[#ffd56a] text-ink',
  }
  return (
    <div className={`rounded-3xl bg-gradient-to-br p-5 shadow-[6px_6px_0_rgba(28,18,8,0.12)] ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="font-display mt-2 text-3xl">{value}</p>
    </div>
  )
}

function SavedSearchWidget() {
  const { data } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: async () => (await api.get('/users/me/saved-searches')).data,
  })
  const searches = data?.data || []
  if (!searches.length) return null
  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl">Saved searches</h2>
      <ul className="mt-3 space-y-2">
        {searches.slice(0, 6).map((s) => {
          const href =
            s.kind === 'talent'
              ? `/freelancers?${new URLSearchParams({
                  q: s.q || '',
                  minRate: s.minRate != null ? String(s.minRate) : '',
                  maxRate: s.maxRate != null ? String(s.maxRate) : '',
                })}`
              : `/projects?${new URLSearchParams({
                  q: s.q || '',
                  category: s.category || '',
                  dueSoon: s.dueSoon ? '1' : '',
                })}`
          return (
            <li key={s._id}>
              <Link to={href} className="font-semibold text-teal">
                {s.name}
              </Link>
              <span className="ml-2 text-sm text-muted">{s.kind === 'talent' ? 'Talent' : 'Projects'}</span>
            </li>
          )
        })}
      </ul>
      {searches.map((s) => (
        <LiveSearchPreview key={s._id} search={s} />
      ))}
    </section>
  )
}

function LiveSearchPreview({ search }) {
  const talent = search.kind === 'talent'
  const { data } = useQuery({
    queryKey: ['saved-search-live', search._id],
    queryFn: async () =>
      talent
        ? (
            await api.get('/freelancers', {
              params: {
                q: search.q || undefined,
                minRate: search.minRate || undefined,
                maxRate: search.maxRate || undefined,
                limit: 2,
              },
            })
          ).data
        : (
            await api.get('/projects', {
              params: {
                q: search.q || undefined,
                category: search.category || undefined,
                dueSoon: search.dueSoon || undefined,
                status: 'open',
                limit: 2,
              },
            })
          ).data,
  })
  const rows = data?.data || []
  if (!rows.length) return null
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {rows.map((row) =>
        talent ? <FreelancerCard key={row._id} user={row} /> : <ProjectCard key={row._id} project={row} />
      )}
    </div>
  )
}

function FreelancerDash() {
  const proposals = useQuery({ queryKey: ['proposals-me'], queryFn: async () => (await api.get('/proposals/me')).data })
  const contracts = useQuery({ queryKey: ['contracts-me'], queryFn: async () => (await api.get('/contracts/me')).data })
  const payments = useQuery({ queryKey: ['payments-me'], queryFn: async () => (await api.get('/payments/me')).data })
  const rec = useQuery({ queryKey: ['recommended'], queryFn: async () => (await api.get('/projects/recommended')).data })
  if (proposals.isLoading) return <Spinner />
  const all = proposals.data?.data || []
  const active = (contracts.data?.data || []).filter((c) => c.status === 'active')
  const reminders = active.filter((c) => dueSoon(c.projectId?.deadline))
  return (
    <div>
      <h1 className="font-display text-4xl">Your desk</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Proposals" value={all.length} tone="teal" />
        <Stat label="Active projects" value={active.length} tone="coral" />
        <Stat label="Earnings released" value={inr(payments.data?.totalReleased)} tone="gold" />
      </div>
      {!all.length ? (
        <div className="mt-8">
          <EmptyState
            title="No proposals yet"
            body="Browse open briefs and send your first bid."
            action={<Link to="/projects" className="font-bold text-teal">Browse projects</Link>}
          />
        </div>
      ) : null}
      {reminders.length ? (
        <section className="mt-10">
          <h2 className="font-display text-3xl">Due in 7 days</h2>
          <ul className="mt-3 space-y-2">
            {reminders.map((c) => (
              <li key={c._id} className="rounded-2xl border-2 border-saffron/50 bg-white p-4">
                <Link to="/app/work" className="font-display text-2xl">{c.projectId?.title}</Link>
                <p className="text-sm text-muted">Deadline {formatDate(c.projectId?.deadline)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <h2 className="font-display mt-10 text-3xl">Recommended for your skills</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(rec.data?.data || []).slice(0, 4).map((row) => (
          <div key={row.project._id}>
            <p className="mb-1 text-xs text-teal">{row.score}% match · missing {row.missing.join(', ') || 'none'}</p>
            <ProjectCard project={row.project} />
          </div>
        ))}
      </div>
      <SavedSearchWidget />
      <p className="mt-6 text-sm">
        <Link className="text-teal" to="/app/proposals">See all proposals →</Link>
      </p>
    </div>
  )
}

function ClientDash() {
  const projects = useQuery({
    queryKey: ['my-projects'],
    queryFn: async () => (await api.get('/projects', { params: { mine: 'true', limit: 50 } })).data,
  })
  const payments = useQuery({ queryKey: ['payments-me'], queryFn: async () => (await api.get('/payments/me')).data })
  if (projects.isLoading) return <Spinner />
  const list = projects.data?.data || []
  const reminders = list.filter((p) => (p.status === 'open' || p.status === 'in_progress') && dueSoon(p.deadline))
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Your hiring desk</h1>
        <Link to="/app/projects/new" className="rounded-full bg-coral px-4 py-2 font-bold text-white shadow-[0_5px_0_#c4321c]">
          Post a project
        </Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Projects" value={list.length} tone="teal" />
        <Stat label="Active" value={list.filter((p) => p.status === 'in_progress').length} tone="coral" />
        <Stat label="Spend released" value={inr(payments.data?.totalReleased)} tone="gold" />
      </div>
      {!list.length ? (
        <div className="mt-8">
          <EmptyState
            title="No projects yet"
            body="Post a brief to start receiving proposals."
            action={<Link to="/app/projects/new" className="font-bold text-teal">Post a project</Link>}
          />
        </div>
      ) : null}
      {reminders.length ? (
        <section className="mt-10">
          <h2 className="font-display text-3xl">Due in 7 days</h2>
          <ul className="mt-3 space-y-2">
            {reminders.map((p) => (
              <li key={p._id} className="rounded-2xl border-2 border-saffron/50 bg-white p-4">
                <Link to={`/projects/${p._id}`} className="font-display text-2xl">{p.title}</Link>
                <p className="text-sm text-muted">Deadline {formatDate(p.deadline)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {list.slice(0, 4).map((p) => (
          <ProjectCard key={p._id} project={p} />
        ))}
      </div>
      <SavedSearchWidget />
    </div>
  )
}

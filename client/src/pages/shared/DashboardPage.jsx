import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { inr } from '../../lib/format'
import { Spinner } from '../../components/ui/Primitives'
import { ProjectCard } from '../../components/project/Cards'

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

function FreelancerDash() {
  const proposals = useQuery({ queryKey: ['proposals-me'], queryFn: async () => (await api.get('/proposals/me')).data })
  const contracts = useQuery({ queryKey: ['contracts-me'], queryFn: async () => (await api.get('/contracts/me')).data })
  const payments = useQuery({ queryKey: ['payments-me'], queryFn: async () => (await api.get('/payments/me')).data })
  const rec = useQuery({ queryKey: ['recommended'], queryFn: async () => (await api.get('/projects/recommended')).data })
  if (proposals.isLoading) return <Spinner />
  const all = proposals.data?.data || []
  const active = (contracts.data?.data || []).filter((c) => c.status === 'active')
  const done = (contracts.data?.data || []).filter((c) => c.status === 'completed')
  return (
    <div>
      <h1 className="font-display text-4xl">Your desk</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Proposals" value={all.length} tone="teal" />
        <Stat label="Active projects" value={active.length} tone="coral" />
        <Stat label="Earnings released" value={inr(payments.data?.totalReleased)} tone="gold" />
      </div>
      <h2 className="font-display mt-10 text-3xl">Recommended for your skills</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(rec.data?.data || []).slice(0, 4).map((row) => (
          <div key={row.project._id}>
            <p className="mb-1 text-xs text-teal">{row.score}% match · missing {row.missing.join(', ') || 'none'}</p>
            <ProjectCard project={row.project} />
          </div>
        ))}
      </div>
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
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {list.slice(0, 4).map((p) => (
          <ProjectCard key={p._id} project={p} />
        ))}
      </div>
    </div>
  )
}

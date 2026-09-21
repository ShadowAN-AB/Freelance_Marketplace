import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { EmptyState, Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr, pricingLabel } from '../../lib/format'

export default function MyProjectsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('all')
  const { data, isLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: async () => (await api.get('/projects', { params: { mine: 'true', limit: 50 } })).data,
  })
  const contracts = useQuery({
    queryKey: ['contracts-me'],
    queryFn: async () => (await api.get('/contracts/me', { params: { limit: 50 } })).data,
  })
  const cancel = useMutation({
    mutationFn: (id) => api.post(`/projects/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-projects'] }),
  })
  const duplicate = useMutation({
    mutationFn: (id) => api.post(`/projects/${id}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-projects'] }),
  })
  if (isLoading) return <Spinner />
  const all = data?.data || []
  const list = all.filter((p) => {
    if (status === 'all') return true
    if (status === 'done') return p.status === 'completed' || p.status === 'cancelled' || p.status === 'closed'
    return p.status === status
  })
  const contractByProject = Object.fromEntries(
    (contracts.data?.data || []).map((c) => [c.projectId?._id || c.projectId, c._id])
  )
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">My projects</h1>
        <Link to="/app/projects/new" className="rounded-full bg-coral px-4 py-2 font-bold text-white shadow-[0_5px_0_#c4321c]">New</Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ['all', 'All'],
          ['open', 'Open'],
          ['in_progress', 'In progress'],
          ['done', 'Done'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatus(id)}
            className={`rounded-full px-3 py-1 text-sm font-bold ${status === id ? 'bg-coral text-white' : 'border-2 border-ink/10 bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {!list.length ? <div className="mt-8"><EmptyState title="No projects yet" body="Post a brief to start receiving proposals." action={<Link to="/app/projects/new" className="text-teal">Post a project</Link>} /></div> : null}
      <ul className="mt-6 space-y-3">
        {list.map((p) => (
          <li key={p._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-white p-4">
            <div>
              <Link to={`/projects/${p._id}`} className="font-display text-2xl">{p.title}</Link>
              <p className="text-sm text-muted">
                {pricingLabel(p)} · {inr(p.budgetMin)} – {inr(p.budgetMax)}
                {p.status === 'open' ? ` · ${p.proposalCount || 0} pending bid${p.proposalCount === 1 ? '' : 's'}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={p.status} />
              <button className="text-sm font-semibold" type="button" onClick={() => duplicate.mutate(p._id)}>Duplicate</button>
              {p.status === 'in_progress' && contractByProject[p._id] ? (
                <Link to={`/app/work/${contractByProject[p._id]}`} className="text-sm font-semibold text-teal">Active work</Link>
              ) : null}
              {p.status === 'open' ? (
                <>
                  <Link to={`/app/projects/${p._id}/proposals`} className="text-sm font-semibold text-teal">Proposals</Link>
                  <Link to={`/app/projects/${p._id}/edit`} className="text-sm font-semibold">Edit</Link>
                  <button className="text-sm text-danger" onClick={() => cancel.mutate(p._id)}>Cancel</button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { EmptyState, Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr } from '../../lib/format'

export default function MyProjectsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: async () => (await api.get('/projects', { params: { mine: 'true', limit: 50 } })).data,
  })
  const cancel = useMutation({
    mutationFn: (id) => api.post(`/projects/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-projects'] }),
  })
  if (isLoading) return <Spinner />
  const list = data?.data || []
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">My projects</h1>
        <Link to="/app/projects/new" className="rounded-full bg-coral px-4 py-2 font-bold text-white shadow-[0_5px_0_#c4321c]">New</Link>
      </div>
      {!list.length ? <div className="mt-8"><EmptyState title="No projects yet" body="Post a brief to start receiving proposals." action={<Link to="/app/projects/new" className="text-teal">Post a project</Link>} /></div> : null}
      <ul className="mt-6 space-y-3">
        {list.map((p) => (
          <li key={p._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-white p-4">
            <div>
              <Link to={`/projects/${p._id}`} className="font-display text-2xl">{p.title}</Link>
              <p className="text-sm text-muted">{inr(p.budgetMin)} – {inr(p.budgetMax)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={p.status} />
              {p.status === 'open' ? (
                <>
                  <Link to={`/app/projects/${p._id}/proposals`} className="text-sm font-semibold text-teal">Proposals</Link>
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

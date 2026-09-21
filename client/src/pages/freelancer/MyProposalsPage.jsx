import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { EmptyState, Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr } from '../../lib/format'
import { MessageButton } from '../../components/MessageButton'

export default function MyProposalsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['proposals-me'],
    queryFn: async () => (await api.get('/proposals/me')).data,
  })
  const withdraw = useMutation({
    mutationFn: (id) => api.post(`/proposals/${id}/withdraw`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals-me'] }),
  })
  if (isLoading) return <Spinner />
  const list = data?.data || []
  return (
    <div>
      <h1 className="font-display text-4xl">My proposals</h1>
      {!list.length ? <div className="mt-8"><EmptyState title="No proposals yet" body="Browse open projects and send a bid." action={<Link to="/projects" className="text-teal">Browse projects</Link>} /></div> : null}
      <ul className="mt-6 space-y-3">
        {list.map((p) => (
          <li key={p._id} className="rounded-2xl border-2 border-ink/10 bg-white p-4">
            <div className="flex justify-between gap-3">
              <Link to={`/projects/${p.projectId?._id}`} className="font-display text-2xl">{p.projectId?.title}</Link>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-2 text-sm">{inr(p.bidAmount)} · {p.estimatedDays} days</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {p.status === 'pending' || p.status === 'accepted' ? (
                <MessageButton projectId={p.projectId} userId={p.projectId?.clientId} label="Message client" />
              ) : null}
              {p.status === 'pending' ? (
                <button className="text-sm text-danger" onClick={() => withdraw.mutate(p._id)}>Withdraw</button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

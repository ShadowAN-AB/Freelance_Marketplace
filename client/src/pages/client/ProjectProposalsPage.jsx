import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Button, EmptyState, Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr } from '../../lib/format'

export default function ProjectProposalsPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['project-proposals', id],
    queryFn: async () => (await api.get(`/projects/${id}/proposals`)).data,
  })
  const matches = useQuery({
    queryKey: ['matches', id],
    queryFn: async () => (await api.get(`/projects/${id}/matches`)).data,
  })
  const accept = useMutation({
    mutationFn: (pid) => api.post(`/proposals/${pid}/accept`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-proposals', id] }),
  })
  const reject = useMutation({
    mutationFn: (pid) => api.post(`/proposals/${pid}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-proposals', id] }),
  })
  if (isLoading) return <Spinner />
  const list = data?.data || []
  return (
    <div>
      <h1 className="font-display text-4xl">Proposals</h1>
      {!list.length ? <div className="mt-8"><EmptyState title="No proposals yet" body="Share the project or wait for talent to bid." /></div> : null}
      <ul className="mt-6 space-y-4">
        {list.map((p) => (
          <li key={p._id} className="rounded-xl border border-line bg-white p-5">
            <div className="flex justify-between gap-3">
              <Link to={`/freelancers/${p.freelancerId?._id}`} className="font-display text-2xl">
                {p.freelancerId?.name}
              </Link>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-2 text-muted">{p.coverLetter}</p>
            <p className="mt-3 font-semibold">{inr(p.bidAmount)} · {p.estimatedDays} days</p>
            {p.status === 'pending' ? (
              <div className="mt-4 flex gap-2">
                <Button onClick={() => accept.mutate(p._id)}>Accept & hold escrow</Button>
                <Button variant="ghost" onClick={() => reject.mutate(p._id)}>Reject</Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <h2 className="font-display mt-10 text-3xl">Skill matches</h2>
      <ul className="mt-3 space-y-2">
        {(matches.data?.data || []).slice(0, 6).map((row) => (
          <li key={row.freelancer._id} className="flex justify-between rounded-lg border border-line bg-white px-4 py-2">
            <Link to={`/freelancers/${row.freelancer._id}`}>{row.freelancer.name}</Link>
            <span className="text-teal">{row.score}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

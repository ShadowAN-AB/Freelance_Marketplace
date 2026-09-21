import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Button, EmptyState, Spinner, StatusBadge } from '../../components/ui/Primitives'
import { inr, skillMatchPercent } from '../../lib/format'
import { MessageButton } from '../../components/MessageButton'

export default function ProjectProposalsPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [sort, setSort] = useState('shortlist')
  const { data, isLoading } = useQuery({
    queryKey: ['project-proposals', id],
    queryFn: async () => (await api.get(`/projects/${id}/proposals`)).data,
  })
  const project = useQuery({
    queryKey: ['project', id],
    queryFn: async () => (await api.get(`/projects/${id}`)).data,
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
  const shortlist = useMutation({
    mutationFn: (pid) => api.post(`/proposals/${pid}/shortlist`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-proposals', id] }),
  })
  if (isLoading) return <Spinner />
  const skills = project.data?.project?.skills || []
  const budgetMax = project.data?.project?.budgetMax
  const list = [...(data?.data || [])].sort((a, b) => {
    if (sort === 'bid') return a.bidAmount - b.bidAmount
    if (sort === 'days') return a.estimatedDays - b.estimatedDays
    if (sort === 'match') {
      return (
        skillMatchPercent(skills, b.freelancerId?.freelancerProfile?.skills) -
        skillMatchPercent(skills, a.freelancerId?.freelancerProfile?.skills)
      )
    }
    return Number(!!b.shortlisted) - Number(!!a.shortlisted)
  })
  return (
    <div>
      <h1 className="font-display text-4xl">Proposals</h1>
      <p className="mt-2 text-sm text-muted">Compare bids, then read cover letters below.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ['shortlist', 'Shortlist first'],
          ['bid', 'Lowest bid'],
          ['days', 'Fastest'],
          ['match', 'Best skill match'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSort(id)}
            className={`rounded-full px-3 py-1 text-sm font-bold ${sort === id ? 'bg-coral text-white' : 'border-2 border-ink/10 bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border-2 border-ink/10 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Bid</th>
                <th className="px-3 py-2">Days</th>
                <th className="px-3 py-2">Rating</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">Shortlist</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id} className="border-b border-line/70">
                  <td className="px-3 py-2 font-semibold">
                    <Link to={`/freelancers/${p.freelancerId?._id}`}>{p.freelancerId?.name}</Link>
                  </td>
                  <td className="px-3 py-2">
                    {inr(p.bidAmount)}
                    {budgetMax != null && p.bidAmount > budgetMax ? (
                      <span className="ml-1 text-xs font-bold text-danger">over budget</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{p.estimatedDays}</td>
                  <td className="px-3 py-2">{p.freelancerId?.avgRating ? `${p.freelancerId.avgRating}★` : '—'}</td>
                  <td className="px-3 py-2">{skillMatchPercent(skills, p.freelancerId?.freelancerProfile?.skills)}%</td>
                  <td className="px-3 py-2">
                    {p.status === 'pending' ? (
                      <button
                        type="button"
                        aria-label={p.shortlisted ? 'Remove from shortlist' : 'Shortlist proposal'}
                        onClick={() => shortlist.mutate(p._id)}
                        className={`text-xl ${p.shortlisted ? 'text-saffron' : 'text-ink/20'}`}
                      >
                        ★
                      </button>
                    ) : p.shortlisted ? (
                      <span className="text-xl text-saffron">★</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-2">
                    {p.status === 'pending' ? (
                      <div className="flex flex-col items-start gap-1">
                        <Button onClick={() => accept.mutate(p._id)}>Accept</Button>
                        <Button variant="ghost" onClick={() => reject.mutate(p._id)}>Reject</Button>
                        <MessageButton projectId={id} userId={p.freelancerId} />
                      </div>
                    ) : (
                      <MessageButton projectId={id} userId={p.freelancerId} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-8"><EmptyState title="No proposals yet" body="Share the project or wait for talent to bid." /></div>
      )}
      <ul className="mt-6 space-y-4">
        {list.map((p) => (
          <li key={p._id} className="rounded-2xl border-2 border-ink/10 bg-white p-5">
            <div className="flex justify-between gap-3">
              <div className="flex items-center gap-2">
                {p.status === 'pending' ? (
                  <button
                    type="button"
                    aria-label={p.shortlisted ? 'Remove from shortlist' : 'Shortlist proposal'}
                    onClick={() => shortlist.mutate(p._id)}
                    className={`text-2xl ${p.shortlisted ? 'text-saffron' : 'text-ink/20'}`}
                  >
                    ★
                  </button>
                ) : p.shortlisted ? (
                  <span className="text-2xl text-saffron">★</span>
                ) : null}
                <Link to={`/freelancers/${p.freelancerId?._id}`} className="font-display text-2xl">
                  {p.freelancerId?.name}
                </Link>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-2 text-muted">{p.coverLetter}</p>
            <p className="mt-3 font-semibold">
              {inr(p.bidAmount)} · {p.estimatedDays} days
              {budgetMax != null && p.bidAmount > budgetMax ? (
                <span className="ml-2 text-sm font-bold text-danger">Over the {inr(budgetMax)} max</span>
              ) : null}
            </p>
            {p.status === 'pending' ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={() => accept.mutate(p._id)}>Accept & hold escrow</Button>
                <Button variant="ghost" onClick={() => reject.mutate(p._id)}>Reject</Button>
                <MessageButton projectId={id} userId={p.freelancerId} />
              </div>
            ) : (
              <div className="mt-3">
                <MessageButton projectId={id} userId={p.freelancerId} />
              </div>
            )}
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

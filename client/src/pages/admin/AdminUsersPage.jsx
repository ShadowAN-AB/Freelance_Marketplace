import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Input, Spinner, StatusBadge } from '../../components/ui/Primitives'

export default function AdminUsersPage() {
  const [q, setQ] = useState('')
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', q],
    queryFn: async () => (await api.get('/admin/users', { params: { q: q || undefined, limit: 50 } })).data,
  })
  const block = useMutation({
    mutationFn: ({ id, blocked }) => api.patch(`/admin/users/${id}/block`, { blocked }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const verify = useMutation({
    mutationFn: ({ id, skills }) => api.patch(`/admin/users/${id}/verify-skills`, { skills }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  if (isLoading) return <Spinner />
  return (
    <div>
      <h1 className="font-display text-4xl">Users</h1>
      <div className="mt-4 max-w-sm">
        <Input placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="mt-6 space-y-2">
        {(data?.data || []).map((u) => (
          <li key={u._id} className="flex items-center justify-between rounded-2xl border-2 border-ink/10 bg-white p-4">
            <div>
              <p className="font-semibold">{u.name} · {u.role}</p>
              <p className="text-sm text-muted">{u.email}</p>
            </div>
            <div className="flex items-center gap-3">
              {u.isBlocked ? <StatusBadge status="blocked" /> : null}
              {u.role !== 'admin' ? (
                <button className="text-sm text-teal" onClick={() => block.mutate({ id: u._id, blocked: !u.isBlocked })}>
                  {u.isBlocked ? 'Unblock' : 'Block'}
                </button>
              ) : null}
              {u.role === 'freelancer' ? (
                <button
                  className="text-sm"
                  onClick={() => {
                    const skills = window.prompt('Verified skills (comma separated)', (u.freelancerProfile?.verifiedSkills || []).join(', '))
                    if (skills == null) return
                    verify.mutate({
                      id: u._id,
                      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }}
                >
                  Verify skills
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

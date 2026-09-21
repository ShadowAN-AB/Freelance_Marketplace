import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Spinner, StatusBadge } from '../../components/ui/Primitives'

export default function AdminReportsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => (await api.get('/admin/reports')).data,
  })
  const update = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/reports/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  })
  if (isLoading) return <Spinner />
  return (
    <div>
      <h1 className="font-display text-4xl">Reports</h1>
      <ul className="mt-6 space-y-3">
        {(data?.data || []).map((r) => (
          <li key={r._id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex justify-between">
              <p className="font-semibold">{r.reason} · {r.targetType}</p>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-2 text-muted">{r.details}</p>
            <p className="mt-1 text-xs">by {r.reporterId?.name}</p>
            {r.status === 'open' ? (
              <div className="mt-3 flex gap-3 text-sm">
                <button className="text-teal" onClick={() => update.mutate({ id: r._id, status: 'reviewed' })}>Mark reviewed</button>
                <button onClick={() => update.mutate({ id: r._id, status: 'dismissed' })}>Dismiss</button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Spinner, StatusBadge } from '../../components/ui/Primitives'

export default function AdminProjectsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: async () => (await api.get('/admin/projects', { params: { limit: 50 } })).data,
  })
  if (isLoading) return <Spinner />
  return (
    <div>
      <h1 className="font-display text-4xl">Projects</h1>
      <ul className="mt-6 space-y-2">
        {(data?.data || []).map((p) => (
          <li key={p._id} className="flex items-center justify-between rounded-xl border border-line bg-white p-4">
            <Link to={`/projects/${p._id}`} className="font-semibold">{p.title}</Link>
            <StatusBadge status={p.status} />
          </li>
        ))}
      </ul>
    </div>
  )
}

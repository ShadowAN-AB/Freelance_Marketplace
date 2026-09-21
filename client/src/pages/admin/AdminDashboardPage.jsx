import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../../services/api'
import { Spinner } from '../../components/ui/Primitives'

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get('/admin/stats')).data,
  })
  if (isLoading) return <Spinner />
  const projectChart = Object.entries(data?.projects || {}).map(([name, count]) => ({ name, count }))
  return (
    <div>
      <h1 className="font-display text-4xl">Platform pulse</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="Users" value={data?.userCount} />
        <Stat label="Projects" value={data?.projectCount} />
        <Stat label="Proposals" value={data?.applications} />
        <Stat label="Freelancers" value={data?.users?.freelancer || 0} />
      </div>
      <div className="mt-8 rounded-xl border border-line bg-white p-4">
        <p className="mb-3 text-sm font-semibold">Projects by status</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectChart}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0f5c57" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="font-display mt-2 text-3xl">{value}</p>
    </div>
  )
}

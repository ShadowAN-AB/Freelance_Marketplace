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
        <Stat label="Users" value={data?.userCount} tone="teal" />
        <Stat label="Projects" value={data?.projectCount} tone="coral" />
        <Stat label="Proposals" value={data?.applications} tone="gold" />
        <Stat label="Freelancers" value={data?.users?.freelancer || 0} tone="teal" />
      </div>
      <div className="mt-8 rounded-3xl border-2 border-ink/10 bg-white p-4 shadow-[6px_6px_0_rgba(28,18,8,0.12)]">
        <p className="mb-3 text-sm font-bold">Projects by status</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectChart}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#ff4d2e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
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

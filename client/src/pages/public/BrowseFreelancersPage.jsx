import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { FreelancerCard } from '../../components/project/Cards'
import { EmptyState, Input, Spinner } from '../../components/ui/Primitives'
import api from '../../services/api'
import { SaveSearchButton } from '../../components/SaveSearchButton'

export default function BrowseFreelancersPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const minRate = params.get('minRate') || ''
  const maxRate = params.get('maxRate') || ''
  const { data, isLoading } = useQuery({
    queryKey: ['freelancers', q, minRate, maxRate],
    queryFn: async () =>
      (
        await api.get('/freelancers', {
          params: {
            q: q || undefined,
            minRate: minRate || undefined,
            maxRate: maxRate || undefined,
          },
        })
      ).data,
  })

  function update(patch) {
    const merged = { q, minRate, maxRate, ...patch }
    const sp = new URLSearchParams()
    Object.entries(merged).forEach(([k, v]) => {
      if (v) sp.set(k, String(v))
    })
    setParams(sp)
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-4xl">Talent</h1>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div className="grid flex-1 gap-3 md:grid-cols-3">
          <Input placeholder="Search name or skill" value={q} onChange={(e) => update({ q: e.target.value })} />
          <Input type="number" placeholder="Min hourly rate" value={minRate} onChange={(e) => update({ minRate: e.target.value })} />
          <Input type="number" placeholder="Max hourly rate" value={maxRate} onChange={(e) => update({ maxRate: e.target.value })} />
          </div>
          <SaveSearchButton kind="talent" params={{ q, minRate, maxRate }} />
        </div>
        {isLoading ? <Spinner /> : null}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(data?.data || []).map((u) => (
            <FreelancerCard key={u._id} user={u} />
          ))}
        </div>
        {!isLoading && !data?.data?.length ? (
          <EmptyState title="No freelancers yet" body="Seed the database or register a freelancer account." />
        ) : null}
      </div>
    </PublicLayout>
  )
}

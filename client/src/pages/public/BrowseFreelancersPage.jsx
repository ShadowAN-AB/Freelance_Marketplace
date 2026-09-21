import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { FreelancerCard } from '../../components/project/Cards'
import { EmptyState, Input, Spinner } from '../../components/ui/Primitives'
import api from '../../services/api'

export default function BrowseFreelancersPage() {
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['freelancers', q],
    queryFn: async () => (await api.get('/freelancers', { params: { q: q || undefined } })).data,
  })
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-4xl">Talent</h1>
        <div className="mt-6 max-w-md">
          <Input placeholder="Search name or skill" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {isLoading ? <Spinner /> : null}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(data?.data || []).map((u) => (
            <FreelancerCard key={u._id} user={u} />
          ))}
        </div>
        {!isLoading && !data?.data?.length ? <EmptyState title="No freelancers yet" body="Seed the database or register a freelancer account." /> : null}
      </div>
    </PublicLayout>
  )
}

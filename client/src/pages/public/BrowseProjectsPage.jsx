import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { ProjectCard } from '../../components/project/Cards'
import { EmptyState, Input, Spinner } from '../../components/ui/Primitives'
import { CATEGORIES } from '../../lib/format'
import api from '../../services/api'

export default function BrowseProjectsPage() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['projects', q, category, page],
    queryFn: async () =>
      (await api.get('/projects', { params: { q: q || undefined, category: category || undefined, page, status: 'open' } })).data,
  })

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-4xl">Open projects</h1>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Input placeholder="Search title or brief" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
          <select className="rounded-md border border-line bg-white px-3 py-2" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {isLoading ? <Spinner /> : null}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(data?.data || []).map((p) => (
            <ProjectCard key={p._id} project={p} />
          ))}
        </div>
        {!isLoading && !data?.data?.length ? (
          <EmptyState title="No open projects" body="Try another search, or check back after a client posts." />
        ) : null}
        {data?.pages > 1 ? (
          <div className="mt-6 flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Prev</button>
            <span>
              {page} / {data.pages}
            </span>
            <button disabled={page >= data.pages} onClick={() => setPage((n) => n + 1)}>Next</button>
          </div>
        ) : null}
      </div>
    </PublicLayout>
  )
}

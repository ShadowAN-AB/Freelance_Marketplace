import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { ProjectCard } from '../../components/project/Cards'
import { EmptyState, Input, Spinner } from '../../components/ui/Primitives'
import { CATEGORIES } from '../../lib/format'
import api from '../../services/api'
import { SaveSearchButton } from '../../components/SaveSearchButton'

export default function BrowseProjectsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const dueSoon = params.get('dueSoon') === '1'
  const page = Number(params.get('page') || 1)
  const { data, isLoading } = useQuery({
    queryKey: ['projects', q, category, dueSoon, page],
    queryFn: async () =>
      (
        await api.get('/projects', {
          params: {
            q: q || undefined,
            category: category || undefined,
            dueSoon: dueSoon || undefined,
            page,
            status: 'open',
          },
        })
      ).data,
  })

  function update(next) {
    const merged = { q, category, dueSoon: dueSoon ? '1' : '', page: String(page), ...next }
    const sp = new URLSearchParams()
    Object.entries(merged).forEach(([k, v]) => {
      if (v) sp.set(k, String(v))
    })
    setParams(sp)
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-4xl">Open projects</h1>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div className="grid flex-1 gap-3 md:grid-cols-3">
          <Input
            placeholder="Search title or brief"
            value={q}
            onChange={(e) => update({ q: e.target.value, page: '1' })}
          />
          <select
            className="rounded-xl border-2 border-line bg-white px-3 py-2.5"
            value={category}
            onChange={(e) => update({ category: e.target.value, page: '1' })}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-xl border-2 border-line bg-white px-3 py-2.5 text-sm font-bold">
            <input type="checkbox" checked={dueSoon} onChange={(e) => update({ dueSoon: e.target.checked ? '1' : '', page: '1' })} />
            Due in 7 days
          </label>
          </div>
          <SaveSearchButton kind="projects" params={{ q, category, dueSoon }} />
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
            <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
              Prev
            </button>
            <span>
              {page} / {data.pages}
            </span>
            <button disabled={page >= data.pages} onClick={() => update({ page: String(page + 1) })}>
              Next
            </button>
          </div>
        ) : null}
      </div>
    </PublicLayout>
  )
}

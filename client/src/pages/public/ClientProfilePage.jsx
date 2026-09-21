import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { Avatar, Spinner } from '../../components/ui/Primitives'
import { ProjectCard } from '../../components/project/Cards'
import { ReportControl } from '../../components/ReportControl'
import api from '../../services/api'

export default function ClientProfilePage() {
  const { id } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => (await api.get(`/users/${id}`)).data,
  })
  const projects = useQuery({
    queryKey: ['client-projects', id],
    queryFn: async () => (await api.get('/projects', { params: { clientId: id, status: 'all' } })).data,
  })
  if (isLoading) {
    return (
      <PublicLayout>
        <Spinner />
      </PublicLayout>
    )
  }
  const user = data?.user
  if (!user || user.role !== 'client') {
    return (
      <PublicLayout>
        <p className="p-8">Client not found.</p>
      </PublicLayout>
    )
  }
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">{user.clientProfile?.companyName || 'Client'}</p>
            <h1 className="font-display text-4xl">{user.name}</h1>
            <p className="text-muted">{user.location}</p>
          </div>
        </div>
        <p className="mt-6 leading-relaxed">{user.bio}</p>
        <p className="mt-4 text-sm font-semibold">
          {user.avgRating ? `${user.avgRating} ★ (${user.reviewCount})` : 'No reviews yet'}
        </p>
        <h2 className="font-display mt-10 text-3xl">Projects</h2>
        <div className="mt-4 grid gap-4">
          {(projects.data?.data || []).map((p) => (
            <ProjectCard key={p._id} project={p} />
          ))}
        </div>
        <div className="mt-10">
          <ReportControl targetType="user" targetId={id} />
        </div>
        <p className="mt-6 text-sm">
          <Link className="text-teal" to="/projects">
            Browse more projects
          </Link>
        </p>
      </div>
    </PublicLayout>
  )
}

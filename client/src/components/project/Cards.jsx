import { Link } from 'react-router-dom'
import { inr, formatDate } from '../../lib/format'
import { StatusBadge } from '../ui/Primitives'

export function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project._id}`} className="block rounded-xl border border-line bg-white p-5 hover:border-teal">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{project.category}</p>
        <StatusBadge status={project.status} />
      </div>
      <h3 className="font-display mt-2 text-2xl leading-tight">{project.title}</h3>
      <p className="mt-2 line-clamp-2 text-muted">{project.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(project.skills || []).slice(0, 5).map((s) => (
          <span key={s} className="rounded-full bg-paper-2 px-2 py-0.5 text-xs">
            {s}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold">
        {inr(project.budgetMin)} – {inr(project.budgetMax)} · due {formatDate(project.deadline)}
      </p>
    </Link>
  )
}

export function FreelancerCard({ user }) {
  return (
    <Link to={`/freelancers/${user._id}`} className="block rounded-xl border border-line bg-white p-5 hover:border-teal">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{user.freelancerProfile?.title || 'Freelancer'}</p>
      <h3 className="font-display mt-1 text-2xl">{user.name}</h3>
      <p className="mt-2 line-clamp-2 text-muted">{user.bio || 'No bio yet.'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(user.freelancerProfile?.skills || []).slice(0, 5).map((s) => (
          <span key={s} className="rounded-full bg-paper-2 px-2 py-0.5 text-xs">
            {s}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm">
        {user.avgRating ? `${user.avgRating} ★ · ${user.reviewCount} reviews` : 'New on FreelanceHub'}
        {user.freelancerProfile?.hourlyRate ? ` · ${user.freelancerProfile.hourlyRate}/hr` : ''}
      </p>
    </Link>
  )
}

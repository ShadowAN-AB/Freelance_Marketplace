import { Link } from 'react-router-dom'
import { inr, formatDate } from '../../lib/format'
import { SkillChip, StatusBadge } from '../ui/Primitives'

export function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project._id}`}
      className="block rounded-3xl border-2 border-ink/10 bg-white p-5 shadow-[6px_6px_0_rgba(28,18,8,0.12)] transition hover:-translate-y-1 hover:border-coral hover:shadow-[8px_8px_0_rgba(255,77,46,0.25)]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">{project.category}</p>
        <StatusBadge status={project.status} />
      </div>
      <h3 className="font-display mt-2 text-2xl leading-tight">{project.title}</h3>
      <p className="mt-2 line-clamp-2 text-muted">{project.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(project.skills || []).slice(0, 5).map((s, i) => (
          <SkillChip key={s} index={i}>
            {s}
          </SkillChip>
        ))}
      </div>
      <p className="mt-4 text-sm font-bold text-teal">
        {inr(project.budgetMin)} – {inr(project.budgetMax)} · due {formatDate(project.deadline)}
      </p>
    </Link>
  )
}

export function FreelancerCard({ user }) {
  return (
    <Link
      to={`/freelancers/${user._id}`}
      className="block rounded-3xl border-2 border-ink/10 bg-white p-5 shadow-[6px_6px_0_rgba(28,18,8,0.12)] transition hover:-translate-y-1 hover:border-teal hover:shadow-[8px_8px_0_rgba(0,133,111,0.25)]"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">{user.freelancerProfile?.title || 'Freelancer'}</p>
      <h3 className="font-display mt-1 text-2xl">{user.name}</h3>
      <p className="mt-2 line-clamp-2 text-muted">{user.bio || 'No bio yet.'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(user.freelancerProfile?.skills || []).slice(0, 5).map((s, i) => (
          <SkillChip key={s} index={i}>
            {s}
          </SkillChip>
        ))}
      </div>
      <p className="mt-4 text-sm font-bold">
        {user.avgRating ? `${user.avgRating} ★ · ${user.reviewCount} reviews` : 'New on FreelanceHub'}
        {user.freelancerProfile?.hourlyRate ? ` · ${user.freelancerProfile.hourlyRate}/hr` : ''}
      </p>
    </Link>
  )
}

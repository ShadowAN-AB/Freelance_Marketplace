import { Link } from 'react-router-dom'
import { inr, formatDate, pricingLabel } from '../../lib/format'
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
      <p className="mt-2 inline-flex rounded-full bg-teal/12 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-teal">
        {pricingLabel(project)}
      </p>
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
        {project.proposalCount != null ? ` · ${project.proposalCount} bid${project.proposalCount === 1 ? '' : 's'}` : ''}
      </p>
      {project.clientId?.clientProfile?.companyName || project.clientId?.name ? (
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
          {project.clientId?.clientProfile?.companyName || project.clientId?.name}
        </p>
      ) : null}
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
            {(user.freelancerProfile?.verifiedSkills || []).includes(s) ? ' ✓' : ''}
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

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PublicLayout } from '../../layouts/Layouts'
import { Button } from '../../components/ui/Primitives'
import { inr } from '../../lib/format'
import api from '../../services/api'

export default function HomePage() {
  const stats = useQuery({
    queryKey: ['marketplace-stats'],
    queryFn: async () => (await api.get('/stats')).data,
  })
  const s = stats.data || {}
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <p className="inline-flex rounded-full bg-saffron px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-ink">
          A hiring desk, not a feed
        </p>
        <h1 className="font-display mt-5 max-w-3xl text-5xl leading-[1.02] md:text-7xl">
          Find the right person.{' '}
          <span className="text-teal">Finish the work.</span>{' '}
          <span className="text-coral">Pay when it is done.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          FreelanceHub is a marketplace for clients and independent talent. Post a project, review proposals, chat in the open, and release simulated escrow when the job is complete.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register">
            <Button>Create an account</Button>
          </Link>
          <Link to="/projects">
            <Button variant="ghost">Browse open projects</Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost">Viva demo login</Button>
          </Link>
        </div>
        <dl className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Open projects" value={s.openProjects ?? '—'} />
          <Stat label="Freelancers" value={s.freelancers ?? '—'} />
          <Stat label="Jobs completed" value={s.completedContracts ?? '—'} />
          <Stat label="Escrow held" value={s.escrowHeld != null ? inr(s.escrowHeld) : '—'} />
        </dl>
      </section>
      <section className="border-t-2 border-ink/10 bg-white/70">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
          {[
            ['01', 'Post with a budget', 'Clients describe the work, skills, and a rupee range. Split a fixed job into 2–3 milestones, or cap an hourly desk.', 'bg-teal text-white'],
            ['02', 'Propose once', 'Freelancers send one bid per project. Clients hire. Everyone else is released.', 'bg-coral text-white'],
            ['03', 'Hold, then release', 'Funds sit in simulated escrow. Release the whole job, one milestone, or approved hours.', 'bg-saffron text-ink'],
          ].map(([n, title, body, tone]) => (
            <div key={n} className={`rounded-3xl p-6 shadow-[8px_8px_0_rgba(28,18,8,0.15)] ${tone}`}>
              <p className="text-xs font-bold tracking-[0.2em] opacity-80">{n}</p>
              <h2 className="font-display mt-2 text-3xl">{title}</h2>
              <p className="mt-2 opacity-90">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-4xl">Five-minute viva beat</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Password for every seeded account is <code className="rounded-md bg-saffron px-1.5 py-0.5 font-bold">Password123!</code>
        </p>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ['Priya (client)', 'priya@freelancehub.dev — Active work: release Scan MVP, then approve 4h on the hourly desk.'],
            ['Aisha (talent)', 'aisha@freelancehub.dev — pending bid on the logistics dashboard plus the inventory contract.'],
            ['Arjun (client)', 'arjun@freelancehub.dev — completed SEO job with a review already on file.'],
            ['Admin', 'admin@freelancehub.dev — contracts, escrow column, reports, and the audit log.'],
          ].map(([title, body]) => (
            <li key={title} className="rounded-3xl border-2 border-ink/10 bg-white p-5">
              <p className="font-display text-2xl">{title}</p>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </PublicLayout>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-3xl border-2 border-ink/10 bg-white p-4 shadow-[5px_5px_0_rgba(28,18,8,0.1)]">
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="font-display mt-1 text-3xl">{value}</dd>
    </div>
  )
}

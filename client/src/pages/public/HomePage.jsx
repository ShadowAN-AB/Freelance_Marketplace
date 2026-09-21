import { Link } from 'react-router-dom'
import { PublicLayout } from '../../layouts/Layouts'
import { Button } from '../../components/ui/Primitives'

export default function HomePage() {
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
        </div>
      </section>
      <section className="border-t-2 border-ink/10 bg-white/70">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
          {[
            ['01', 'Post with a budget', 'Clients describe the work, skills, and a rupee range. No mystery RFPs.', 'bg-teal text-white'],
            ['02', 'Propose once', 'Freelancers send one bid per project. Clients hire. Everyone else is released.', 'bg-coral text-white'],
            ['03', 'Hold, then release', 'Funds sit in simulated escrow until the client accepts the submitted work.', 'bg-saffron text-ink'],
          ].map(([n, title, body, tone]) => (
            <div key={n} className={`rounded-3xl p-6 shadow-[8px_8px_0_rgba(28,18,8,0.15)] ${tone}`}>
              <p className="text-xs font-bold tracking-[0.2em] opacity-80">{n}</p>
              <h2 className="font-display mt-2 text-3xl">{title}</h2>
              <p className="mt-2 opacity-90">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}

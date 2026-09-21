import { Link } from 'react-router-dom'
import { PublicLayout } from '../layouts/Layouts'
import { Button } from '../components/ui/Primitives'

export default function HomePage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-[0.2em] text-teal">A hiring desk, not a feed</p>
        <h1 className="font-display mt-4 max-w-3xl text-5xl leading-[1.05] md:text-7xl">
          Find the right person. Finish the work. Pay when it is done.
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
      <section className="border-t border-line bg-white/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
          {[
            ['01', 'Post with a budget', 'Clients describe the work, skills, and a rupee range. No mystery RFPs.'],
            ['02', 'Propose once', 'Freelancers send one bid per project. Clients hire. Everyone else is released.'],
            ['03', 'Hold, then release', 'Funds sit in simulated escrow until the client accepts the submitted work.'],
          ].map(([n, title, body]) => (
            <div key={n}>
              <p className="text-xs tracking-[0.2em] text-teal">{n}</p>
              <h2 className="font-display mt-2 text-3xl">{title}</h2>
              <p className="mt-2 text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}

import { Link } from 'react-router-dom'
import { PublicLayout } from '../../layouts/Layouts'
import { Button } from '../../components/ui/Primitives'

export default function NotFoundPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">404</p>
        <h1 className="font-display mt-3 text-5xl">Page not found</h1>
        <p className="mt-4 text-muted">That page is not on FreelanceHub. Head back to open projects or sign in.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/">
            <Button>Home</Button>
          </Link>
          <Link to="/projects">
            <Button variant="ghost">Browse projects</Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}

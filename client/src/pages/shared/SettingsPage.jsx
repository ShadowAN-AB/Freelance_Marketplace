import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Primitives'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  return (
    <div className="max-w-lg">
      <h1 className="font-display text-4xl">Settings</h1>
      <p className="mt-4 text-muted">Signed in as {user.email}. Admin accounts are seeded, not self-registered.</p>
      <div className="mt-6">
        <Button variant="danger" onClick={logout}>Log out</Button>
      </div>
    </div>
  )
}

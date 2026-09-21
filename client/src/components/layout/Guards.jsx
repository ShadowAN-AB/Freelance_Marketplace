import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="p-10 text-muted">Loading session…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

export function RoleRoute({ roles, children }) {
  const { user } = useAuth()
  if (!roles.includes(user.role)) return <Navigate to="/app/dashboard" replace />
  return children
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-10 text-muted">Loading session…</div>
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/app/dashboard'} replace />
  return children
}

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * Wraps a route to require authentication.
 * Unauthenticated users are sent to /login with the attempted path as state.
 *
 * @param {{ children: React.ReactNode, role?: string }} props
 */
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // While restoring the session from the cookie, show nothing to avoid flicker.
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="size-7 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Optional: guard a specific role.
  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  return children
}

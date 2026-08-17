import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.estado === 'pendiente') return <Navigate to="/pendiente" replace />
  if (allowedRoles && !allowedRoles.includes(profile.rol)) {
    return <Navigate to={
      profile.rol === 'super_admin' || profile.rol === 'admin' ? '/admin' :
      profile.rol === 'staff' ? '/staff' : '/dashboard'
    } replace />
  }
  return children
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-base-400 text-sm font-medium tracking-widest uppercase">Cargando...</p>
      </div>
    </div>
  )
}

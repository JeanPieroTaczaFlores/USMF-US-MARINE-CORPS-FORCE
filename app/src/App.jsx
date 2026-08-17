import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Pending from './pages/auth/Pending'
import Recover from './pages/auth/Recover'

import AdminPanel from './pages/admin/AdminPanel'
import StaffPanel from './pages/staff/StaffPanel'
import Dashboard from './pages/client/Dashboard'
import Tienda from './pages/public/Tienda'
import Opiniones from './pages/public/Opiniones'
import Misiones from './pages/public/Misiones'
import Landing from './pages/public/Landing'

function RoleRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  if (profile.estado === 'pendiente') return <Navigate to="/pendiente" replace />
  return <Navigate to={
    profile.rol === 'super_admin' || profile.rol === 'admin' ? '/admin' :
    profile.rol === 'staff' ? '/staff' : '/dashboard'
  } replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/app">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pendiente" element={<Pending />} />
          <Route path="/recuperar" element={<Recover />} />
          <Route path="/redirect" element={<RoleRedirect />} />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <AdminPanel />
            </ProtectedRoute>
          } />

          <Route path="/staff" element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffPanel />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'staff', 'usuario']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/tienda" element={<Tienda />} />
          <Route path="/opiniones" element={<Opiniones />} />
          <Route path="/misiones" element={<Misiones />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

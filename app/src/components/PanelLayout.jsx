import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function PanelLayout({ children, title }) {
  const { profile } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-base-950">
      <header className="sticky top-0 z-50 border-b border-base-700/50 bg-base-900/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <span className="font-display text-sm font-semibold tracking-[0.15em] uppercase text-base-100">
              USMCF
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-base-400 hidden sm:block">
              {profile?.nombre} <span className="text-accent ml-1">({profile?.rol?.toUpperCase()})</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium tracking-wider uppercase text-base-400 border border-base-600 rounded-lg hover:border-danger/50 hover:text-danger transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-[0.08em] uppercase text-base-100 mb-6">
          {title}
        </h1>
        {children}
      </main>
    </div>
  )
}

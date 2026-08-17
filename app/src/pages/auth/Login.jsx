import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Completa todos los campos.'); return }
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message.includes('Invalid') ? 'Correo o contraseña incorrectos.' : authError.message)
      setLoading(false)
      return
    }

    await refreshProfile()
    setLoading(false)
    navigate('/redirect', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950 px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <span className="font-display text-xl font-bold tracking-[0.15em] uppercase text-base-100">USMCF</span>
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-[0.05em] uppercase text-base-100 mb-2">INICIAR SESIÓN</h1>
          <p className="text-sm text-base-400">Accede a tu panel de la facción</p>
        </div>

        <div className="bg-base-800/40 border border-base-700/40 rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-danger-muted border border-danger-border text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200 placeholder-base-500 focus:outline-none focus:border-accent/40 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200 placeholder-base-500 focus:outline-none focus:border-accent/40 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:bg-accent-hover text-base-950 font-semibold text-sm tracking-wider uppercase rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? <div className="w-4 h-4 border-2 border-base-950 border-t-transparent rounded-full animate-spin" /> : <>INICIAR SESIÓN <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <Link to="/recuperar" className="text-base-400 hover:text-accent transition-colors">¿Olvidaste tu contraseña?</Link>
            <Link to="/register" className="text-base-400 hover:text-accent transition-colors">¿No tienes cuenta? <span className="text-accent">Regístrate</span></Link>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Shield, Mail, Lock, User, Gamepad2, ArrowRight } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ nombre: '', roblox: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function update(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.nombre || !form.roblox || !form.email || !form.password || !form.confirm) {
      setError('Completa todos los campos.'); return
    }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (!/[A-Z]/.test(form.password)) { setError('Debe contener al menos una mayúscula.'); return }
    if (!/[0-9]/.test(form.password)) { setError('Debe contener al menos un número.'); return }
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden.'); return }

    setLoading(true)
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { nombre: form.nombre, roblox: form.roblox } }
    })

    if (authError) {
      setError(authError.message.includes('already') ? 'Este correo ya está registrado.' : authError.message)
      setLoading(false)
      return
    }

    navigate('/pendiente')
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
          <h1 className="font-display text-2xl font-semibold tracking-[0.05em] uppercase text-base-100 mb-2">CREAR CUENTA</h1>
          <p className="text-sm text-base-400">Únete a la Marine Corps Force</p>
        </div>

        <div className="bg-base-800/40 border border-base-700/40 rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-danger-muted border border-danger-border text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'nombre', label: 'Nombre completo', icon: User, type: 'text', placeholder: 'Tu nombre' },
              { key: 'roblox', label: 'Usuario de Roblox', icon: Gamepad2, type: 'text', placeholder: 'Tu usuario de Roblox' },
              { key: 'email', label: 'Correo Electrónico', icon: Mail, type: 'email', placeholder: 'tu@correo.com' },
              { key: 'password', label: 'Contraseña', icon: Lock, type: 'password', placeholder: 'Mínimo 8 caracteres' },
              { key: 'confirm', label: 'Confirmar Contraseña', icon: Lock, type: 'password', placeholder: 'Repite tu contraseña' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1.5">{field.label}</label>
                <div className="relative">
                  <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
                  <input
                    type={field.type} value={form[field.key]} onChange={e => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full pl-10 pr-4 py-2.5 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200 placeholder-base-500 focus:outline-none focus:border-accent/40 transition-colors"
                  />
                </div>
              </div>
            ))}

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:bg-accent-hover text-base-950 font-semibold text-sm tracking-wider uppercase rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? <div className="w-4 h-4 border-2 border-base-950 border-t-transparent rounded-full animate-spin" /> : <>REGISTRARME <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-5 text-center text-xs">
            <Link to="/login" className="text-base-400 hover:text-accent transition-colors">¿Ya tienes cuenta? <span className="text-accent">Inicia sesión</span></Link>
          </div>
        </div>
      </div>
    </div>
  )
}

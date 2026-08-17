import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Shield, MessageSquare, Send } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Opiniones() {
  const { profile } = useAuth()
  const [text, setText] = useState('')
  const [opinions, setOpinions] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useState(() => { loadOpinions() }, [])

  async function loadOpinions() {
    const { data } = await supabase.from('opiniones').select('*').order('created_at', { ascending: false }).limit(20)
    setOpinions(data || [])
  }

  async function submit() {
    setError(''); setSuccess('')
    if (!text || text.trim().length < 5) { setError('Escribe al menos 5 caracteres.'); return }
    if (!profile) { setError('Inicia sesión para enviar opiniones.'); return }
    setLoading(true)
    const { error: err } = await supabase.from('opiniones').insert({ contenido: text.trim(), usuario_id: profile.id })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess('¡Opinión enviada! Gracias por tu feedback.')
    setText('')
    loadOpinions()
  }

  return (
    <div className="min-h-screen bg-base-950">
      <nav className="sticky top-0 z-50 border-b border-base-700/50 bg-base-900/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/app/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <span className="font-display text-sm font-semibold tracking-[0.15em] uppercase text-base-100">USMCF</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/app/" className="text-xs text-base-400 hover:text-accent transition-colors tracking-wider uppercase">INICIO</Link>
            <Link to="/app/tienda" className="text-xs text-base-400 hover:text-accent transition-colors tracking-wider uppercase">TIENDA</Link>
            <Link to="/app/opiniones" className="text-xs text-accent font-semibold tracking-wider uppercase">OPINIONES</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-[700px] mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-5 h-5 text-accent" />
          <h1 className="font-display text-xl font-semibold tracking-[0.08em] uppercase text-base-100">OPINIONES</h1>
        </div>

        <div className="bg-base-800/40 border border-base-700/40 rounded-2xl p-6 mb-8">
          {error && <div className="mb-4 px-4 py-3 rounded-lg bg-danger-muted border border-danger-border text-danger text-sm">{error}</div>}
          {success && <div className="mb-4 px-4 py-3 rounded-lg bg-success-muted border border-success/20 text-success text-sm">{success}</div>}

          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Comparte tu opinión sobre la facción..."
            rows={4}
            className="w-full px-4 py-3 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200 placeholder-base-500 focus:outline-none focus:border-accent/40 transition-colors resize-none mb-3"
          />
          <button
            onClick={submit} disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-base-950 font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? <div className="w-4 h-4 border-2 border-base-950 border-t-transparent rounded-full animate-spin" /> : <>ENVIAR <Send className="w-3.5 h-3.5" /></>}
          </button>
        </div>

        <div className="space-y-3">
          {opinions.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-8 h-8 text-base-600 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-base-400">No hay opiniones aún. Sé el primero.</p>
            </div>
          ) : opinions.map(o => (
            <div key={o.id} className="p-4 bg-base-800/30 border border-base-700/20 rounded-xl">
              <p className="text-sm text-base-200 leading-relaxed">"{o.contenido}"</p>
              <p className="text-xs text-base-500 mt-2">{new Date(o.created_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

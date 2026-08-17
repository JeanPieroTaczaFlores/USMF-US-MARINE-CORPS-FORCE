import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Shield, Target, Calendar, Coins, Star } from 'lucide-react'

export default function Misiones() {
  const { profile } = useAuth()
  const [missions, setMissions] = useState([])

  useEffect(() => { loadMissions() }, [])

  async function loadMissions() {
    const { data } = await supabase.from('misiones').select('*').in('estado', ['activa', 'programada']).order('fecha', { ascending: true })
    setMissions(data || [])
  }

  async function joinMission(id) {
    if (!profile) { alert('Inicia sesión para inscribirte.'); return }
    const { error } = await supabase.from('misiones_participantes').insert({ mision_id: id, usuario_id: profile.id, recompensa_pagada: false })
    if (error) { alert(error.message); return }
    alert('¡Inscrito exitosamente!')
    loadMissions()
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
            <Link to="/app/opiniones" className="text-xs text-base-400 hover:text-accent transition-colors tracking-wider uppercase">OPINIONES</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Target className="w-5 h-5 text-accent" />
          <h1 className="font-display text-xl font-semibold tracking-[0.08em] uppercase text-base-100">MISIONES DISPONIBLES</h1>
        </div>

        {missions.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-10 h-10 text-base-600 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-sm text-base-400">No hay misiones disponibles ahora.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {missions.map(m => (
              <div key={m.id} className="bg-base-800/40 border border-base-700/30 rounded-xl p-5 hover:border-accent/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-base-100 uppercase tracking-wider">{m.titulo}</h3>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded border ${
                    m.estado === 'activa' ? 'bg-accent-muted text-accent border-accent-border' : 'bg-base-700/30 text-base-400 border-base-600/40'
                  }`}>{m.estado}</span>
                </div>
                <p className="text-xs text-base-400 leading-relaxed mb-4">{m.descripcion}</p>
                <div className="flex items-center gap-4 text-xs text-base-500 mb-4">
                  {m.fecha && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(m.fecha).toLocaleDateString('es-PE')}</span>}
                  <span className="flex items-center gap-1 text-[#c9a227]"><Star className="w-3 h-3" />{m.recompensa_puntos} pts</span>
                  <span className="flex items-center gap-1 text-success"><Coins className="w-3 h-3" />{m.recompensa_dinero} coins</span>
                </div>
                <button
                  onClick={() => joinMission(m.id)}
                  className="w-full py-2 bg-accent hover:bg-accent-hover text-base-950 font-semibold text-[11px] tracking-wider uppercase rounded-lg transition-colors cursor-pointer"
                >
                  INSCRIBIRSE
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

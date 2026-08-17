import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PanelLayout from '../../components/PanelLayout'
import { Badge, EmptyState } from '../../components/ui'
import { getSalario, RANGOS } from '../../lib/ranks'
import { Shield, Coins, Star, Gamepad2, Award, Clock, Wallet, History, Target, ShoppingBag } from 'lucide-react'

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth()
  const [missions, setMissions] = useState([])
  const [inventory, setInventory] = useState([])
  const [history, setHistory] = useState([])
  const [salaryLoading, setSalaryLoading] = useState(false)
  const [salaryMsg, setSalaryMsg] = useState('')

  useEffect(() => {
    if (!profile) return
    loadData()
  }, [profile])

  async function loadData() {
    const [m, inv, tx] = await Promise.all([
      supabase.from('misiones_participantes').select('*, misiones(*)').eq('usuario_id', profile.id),
      supabase.from('compras').select('*, tienda_items(*)').eq('usuario_id', profile.id).order('fecha', { ascending: false }),
      supabase.from('movimientos').select('*').eq('usuario_id', profile.id).order('fecha', { ascending: false }).limit(15),
    ])
    setMissions(m.data || [])
    setInventory(inv.data || [])
    setHistory(tx.data || [])
  }

  async function paySalary() {
    setSalaryLoading(true)
    setSalaryMsg('')

    if (profile.ultimo_cobro_salario) {
      const last = new Date(profile.ultimo_cobro_salario).getTime()
      const now = Date.now()
      const diff = now - last
      const weekMs = 7 * 24 * 60 * 60 * 1000
      if (diff < weekMs) {
        const days = Math.ceil((weekMs - diff) / (24 * 60 * 60 * 1000))
        setSalaryMsg(`Puedes cobrar en ${days} día(s).`)
        setSalaryLoading(false)
        return
      }
    }

    const salario = getSalario(profile.rango)
    const { error } = await supabase.from('usuarios').update({
      dinero: profile.dinero + salario,
      ultimo_cobro_salario: new Date().toISOString()
    }).eq('id', profile.id)

    if (!error) {
      await supabase.from('movimientos').insert({
        usuario_id: profile.id, tipo: 'salario', monto: salario, moneda: 'coins', descripcion: `Salario semanal - ${profile.rango}`
      })
      await refreshProfile()
      setSalaryMsg(`Cobraste ${salario} coins.`)
      loadData()
    }
    setSalaryLoading(false)
  }

  const salario = getSalario(profile?.rango)
  const nextSalary = profile?.ultimo_cobro_salario
    ? Math.max(0, 7 - Math.floor((Date.now() - new Date(profile.ultimo_cobro_salario).getTime()) / (24 * 60 * 60 * 1000)))
    : 0

  return (
    <PanelLayout title="MI PANEL">
      <p className="text-base-400 text-sm mb-6">Bienvenido, <span className="text-base-200 font-medium">{profile?.nombre}</span></p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="bg-base-800/40 border border-base-700/40 rounded-xl p-5 border-l-4 border-l-accent">
          <div className="flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-accent" /><span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400">RANGO</span></div>
          <div className="font-display text-xl font-semibold text-base-100">{profile?.rango}</div>
          <div className="text-xs text-base-500 mt-1">Salario: {salario} coins/sem</div>
        </div>
        <div className="bg-base-800/40 border border-base-700/40 rounded-xl p-5 border-l-4 border-l-[#c9a227]">
          <div className="flex items-center gap-2 mb-2"><Coins className="w-4 h-4 text-[#c9a227]" /><span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400">DINERO</span></div>
          <div className="font-display text-xl font-semibold text-base-100">{(profile?.dinero || 0).toLocaleString()} <span className="text-sm text-base-400">coins</span></div>
        </div>
        <div className="bg-base-800/40 border border-base-700/40 rounded-xl p-5 border-l-4 border-l-success">
          <div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-success" /><span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400">PUNTOS</span></div>
          <div className="font-display text-xl font-semibold text-base-100">{(profile?.puntos || 0).toLocaleString()}</div>
        </div>
        <div className="bg-base-800/40 border border-base-700/40 rounded-xl p-5 border-l-4 border-l-base-500">
          <div className="flex items-center gap-2 mb-2"><Gamepad2 className="w-4 h-4 text-base-400" /><span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400">ROBLOX</span></div>
          <div className="font-display text-lg font-semibold text-base-100">{profile?.usuario_roblox}</div>
          <div className="text-xs text-base-500 mt-1">Rol: {profile?.rol}</div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-accent mb-3 border-l-3 border-l-accent pl-3">SALARIO SEMANAL</h2>
        <div className="bg-base-800/40 border border-base-700/40 rounded-xl p-5 max-w-md">
          <p className="text-sm text-base-400 mb-3">Cobra tu salario semanal según tu rango actual.</p>
          <button
            onClick={paySalary} disabled={salaryLoading || nextSalary > 0}
            className="w-full py-2.5 border-2 border-[#c9a227] bg-[#c9a227]/10 text-[#c9a227] font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors hover:bg-[#c9a227] hover:text-base-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {salaryLoading ? 'PROCESANDO...' : nextSalary > 0 ? `DISPONIBLE EN ${nextSalary} DÍA(S)` : 'COBRAR SALARIO'}
          </button>
          {salaryMsg && <p className="mt-2 text-xs text-base-300">{salaryMsg}</p>}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-accent mb-3 border-l-3 border-l-accent pl-3">MIS MISIONES</h2>
        {missions.length === 0 ? (
          <EmptyState icon={Target} title="No estás inscrito en ninguna misión" description={<Link to="/misiones" className="text-accent hover:underline">Ver misiones disponibles</Link>} />
        ) : (
          <div className="space-y-2">
            {missions.map(mp => {
              const m = mp.misiones
              if (!m) return null
              return (
                <div key={mp.id} className="flex items-center justify-between p-4 bg-base-800/40 border border-base-700/30 rounded-xl">
                  <div>
                    <span className="text-sm font-medium text-base-200">{m.titulo}</span>
                    <span className="text-xs text-base-500 ml-3">{m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE') : ''}</span>
                  </div>
                  <Badge variant={m.estado === 'activa' ? 'accent' : m.estado === 'terminada' ? 'success' : 'default'}>{m.estado}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-accent mb-3 border-l-3 border-l-accent pl-3">MI INVENTARIO</h2>
        {inventory.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Aún no has comprado nada" description={<Link to="/tienda" className="text-accent hover:underline">Ir a la tienda</Link>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inventory.map(inv => (
              <div key={inv.id} className="p-4 bg-base-800/40 border border-base-700/30 rounded-xl">
                <div className="text-sm font-medium text-base-200">{inv.tienda_items?.nombre}</div>
                <div className="text-xs text-base-500 mt-1">Comprado: {new Date(inv.fecha).toLocaleDateString('es-PE')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-accent mb-3 border-l-3 border-l-accent pl-3">HISTORIAL</h2>
        {history.length === 0 ? (
          <EmptyState icon={History} title="Sin movimientos aún" />
        ) : (
          <div className="space-y-0 max-w-2xl">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between py-3 border-b border-base-700/20">
                <span className="text-sm text-base-300">{h.descripcion}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${h.monto > 0 ? 'text-success' : 'text-danger'}`}>
                    {h.monto > 0 ? '+' : ''}{h.monto} {h.moneda === 'coins' ? 'coins' : 'pts'}
                  </span>
                  <span className="text-xs text-base-500">{new Date(h.fecha).toLocaleDateString('es-PE')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelLayout>
  )
}

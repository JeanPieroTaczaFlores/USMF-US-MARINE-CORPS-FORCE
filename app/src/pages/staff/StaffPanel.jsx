import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PanelLayout from '../../components/PanelLayout'
import { StatCard, Badge, Tabs, SearchInput, EmptyState } from '../../components/ui'
import { Users, Clock, Target, MessageSquare } from 'lucide-react'

export default function StaffPanel() {
  const [tab, setTab] = useState('solicitudes')
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [missions, setMissions] = useState([])
  const [opinions, setOpinions] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [u, m, o] = await Promise.all([
      supabase.from('usuarios').select('*').order('created_at', { ascending: false }),
      supabase.from('misiones').select('*').order('created_at', { ascending: false }),
      supabase.from('opiniones').select('*').order('created_at', { ascending: false }),
    ])
    const allUsers = u.data || []
    setUsers(allUsers)
    setStats({
      total: allUsers.length,
      pendientes: allUsers.filter(u => u.estado === 'pendiente').length,
      misiones: (m.data || []).length,
    })
    setRequests(allUsers.filter(u => u.estado === 'pendiente'))
    setMissions(m.data || [])
    setOpinions(o.data || [])
  }

  const tabList = [
    { id: 'solicitudes', label: 'SOLICITUDES', count: stats.pendientes },
    { id: 'usuarios', label: 'USUARIOS', count: stats.total },
    { id: 'misiones', label: 'MISIONES', count: stats.misiones },
    { id: 'opiniones', label: 'OPINIONES' },
  ]

  const filteredUsers = search
    ? users.filter(u => (u.nombre + u.usuario_roblox + u.rango).toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <PanelLayout title="PANEL DE STAFF">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Usuarios" value={stats.total ?? '—'} icon={Users} />
        <StatCard label="Pendientes" value={stats.pendientes ?? '—'} icon={Clock} />
        <StatCard label="Misiones" value={stats.misiones ?? '—'} icon={Target} />
      </div>

      <Tabs tabs={tabList} active={tab} onChange={setTab} />

      {tab === 'solicitudes' && (
        <div>
          {requests.length === 0 ? (
            <EmptyState icon={Clock} title="No hay solicitudes pendientes" description="Todas las solicitudes han sido procesadas." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-base-700/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-700/40">
                    {['NOMBRE', 'ROBLOX', 'EMAIL', 'FECHA', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 bg-base-800/30">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(u => (
                    <tr key={u.id} className="border-b border-base-700/20 hover:bg-base-800/30 transition-colors">
                      <td className="px-4 py-3 text-base-200">{u.nombre}</td>
                      <td className="px-4 py-3 text-base-300">{u.usuario_roblox}</td>
                      <td className="px-4 py-3 text-base-400">{u.email}</td>
                      <td className="px-4 py-3 text-base-400 text-xs">{new Date(u.created_at).toLocaleDateString('es-PE')}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={async () => { await supabase.from('usuarios').update({ estado: 'activo', rango: 'Soldado', dinero: 500, puntos: 100 }).eq('id', u.id); loadAll() }} className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase bg-success-muted text-success border border-success/20 rounded-md hover:bg-success hover:text-white transition-colors cursor-pointer">APROBAR</button>
                          <button onClick={async () => { if (confirm('Rechazar?')) { await supabase.from('usuarios').delete().eq('id', u.id); loadAll() } }} className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase bg-danger-muted text-danger border border-danger-border rounded-md hover:bg-danger hover:text-white transition-colors cursor-pointer">RECHAZAR</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'usuarios' && (
        <div>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar..." />
          <div className="mt-4 overflow-x-auto rounded-xl border border-base-700/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-700/40">
                  {['NOMBRE', 'ROBLOX', 'RANGO', 'PTS', 'COINS', 'ROL', 'ESTADO', 'ACTIVIDAD'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 bg-base-800/30">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const isRecent = u.last_login && (Date.now() - new Date(u.last_login).getTime() < 3600000)
                  const activityColor = !u.last_login ? 'text-danger' : isRecent ? 'text-success' : 'text-base-400'
                  return (
                    <tr key={u.id} className="border-b border-base-700/20 hover:bg-base-800/30 transition-colors">
                      <td className="px-4 py-3 text-base-200">{u.nombre}</td>
                      <td className="px-4 py-3 text-base-300">{u.usuario_roblox}</td>
                      <td className="px-4 py-3 text-base-300">{u.rango}</td>
                      <td className="px-4 py-3 text-base-300 text-xs">{u.puntos}</td>
                      <td className="px-4 py-3 text-base-300 text-xs">{u.dinero}</td>
                      <td className="px-4 py-3"><Badge variant={u.rol === 'staff' ? 'warning' : 'default'}>{u.rol}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={u.estado === 'activo' ? 'success' : 'danger'}>{u.estado}</Badge></td>
                      <td className={`px-4 py-3 text-xs ${activityColor}`}>{!u.last_login ? 'Nunca' : timeAgo(u.last_login)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'misiones' && (
        <div className="overflow-x-auto rounded-xl border border-base-700/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-700/40">
                {['TÍTULO', 'FECHA', 'PTS', 'COINS', 'ESTADO'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 bg-base-800/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {missions.map(m => (
                <tr key={m.id} className="border-b border-base-700/20 hover:bg-base-800/30 transition-colors">
                  <td className="px-4 py-3 text-base-200">{m.titulo}</td>
                  <td className="px-4 py-3 text-base-400 text-xs">{m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE') : '—'}</td>
                  <td className="px-4 py-3 text-base-300 text-xs">{m.recompensa_puntos}</td>
                  <td className="px-4 py-3 text-base-300 text-xs">{m.recompensa_dinero}</td>
                  <td className="px-4 py-3"><Badge variant={m.estado === 'activa' ? 'accent' : m.estado === 'terminada' ? 'success' : 'default'}>{m.estado}</Badge></td>
                </tr>
              ))}
              {missions.length === 0 && <tr><td colSpan={5}><EmptyState icon={Target} title="No hay misiones" /></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'opiniones' && (
        <div>
          {opinions.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No hay opiniones" />
          ) : (
            <div className="space-y-3">
              {opinions.map(o => (
                <div key={o.id} className="p-4 bg-base-800/40 border border-base-700/30 rounded-xl">
                  <p className="text-sm text-base-200 leading-relaxed">"{o.contenido}"</p>
                  <p className="text-xs text-base-500 mt-1">{new Date(o.fecha).toLocaleDateString('es-PE')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PanelLayout>
  )
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

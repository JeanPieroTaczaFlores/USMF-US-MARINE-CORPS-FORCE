import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PanelLayout from '../../components/PanelLayout'
import { StatCard, Badge, Tabs, SearchInput, EmptyState } from '../../components/ui'
import { Users, Clock, CheckCircle, Target, ShoppingBag, MessageSquare, Plus, Pencil, Gift, Trash2, X, ChevronRight } from 'lucide-react'

export default function AdminPanel() {
  const [tab, setTab] = useState('usuarios')
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [missions, setMissions] = useState([])
  const [shopItems, setShopItems] = useState([])
  const [opinions, setOpinions] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [u, m, s, o] = await Promise.all([
      supabase.from('usuarios').select('*').order('created_at', { ascending: false }),
      supabase.from('misiones').select('*').order('created_at', { ascending: false }),
      supabase.from('tienda_items').select('*').order('created_at', { ascending: false }),
      supabase.from('opiniones').select('*').order('created_at', { ascending: false }),
    ])
    const allUsers = u.data || []
    setUsers(allUsers)
    setStats({
      total: allUsers.length,
      pendientes: allUsers.filter(u => u.estado === 'pendiente').length,
      activos: allUsers.filter(u => u.estado === 'activo').length,
      misiones: (m.data || []).length,
      items: (s.data || []).length,
      opiniones: (o.data || []).length,
    })
    setRequests(allUsers.filter(u => u.estado === 'pendiente'))
    setMissions(m.data || [])
    setShopItems(s.data || [])
    setOpinions(o.data || [])
  }

  const tabList = [
    { id: 'usuarios', label: 'USUARIOS', count: stats.total },
    { id: 'solicitudes', label: 'SOLICITUDES', count: stats.pendientes },
    { id: 'misiones', label: 'MISIONES', count: stats.misiones },
    { id: 'tienda', label: 'TIENDA', count: stats.items },
    { id: 'opiniones', label: 'OPINIONES', count: stats.opiniones },
  ]

  const filteredUsers = search
    ? users.filter(u => (u.nombre + u.usuario_roblox + u.rango).toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <PanelLayout title="PANEL DE ADMINISTRACIÓN">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Usuarios" value={stats.total ?? '—'} icon={Users} />
        <StatCard label="Pendientes" value={stats.pendientes ?? '—'} icon={Clock} />
        <StatCard label="Activos" value={stats.activos ?? '—'} icon={CheckCircle} />
        <StatCard label="Misiones" value={stats.misiones ?? '—'} icon={Target} />
        <StatCard label="Items" value={stats.items ?? '—'} icon={ShoppingBag} />
        <StatCard label="Opiniones" value={stats.opiniones ?? '—'} icon={MessageSquare} />
      </div>

      <Tabs tabs={tabList} active={tab} onChange={setTab} />

      {tab === 'usuarios' && (
        <div>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, usuario o rango..." />
          <div className="mt-4 overflow-x-auto rounded-xl border border-base-700/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-700/40">
                  {['NOMBRE', 'ROBLOX', 'RANGO', 'PTS', 'COINS', 'ROL', 'ESTADO', 'ACTIVIDAD', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 bg-base-800/30">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <UserRow key={u.id} user={u} onRefresh={loadAll} />
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={9}><EmptyState icon={Users} title="No se encontraron usuarios" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'solicitudes' && (
        <div>
          {requests.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No hay solicitudes pendientes" description="Todas las solicitudes han sido procesadas." />
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
                          <button onClick={() => approve(u.id)} className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase bg-success-muted text-success border border-success/20 rounded-md hover:bg-success hover:text-white transition-colors cursor-pointer">APROBAR</button>
                          <button onClick={() => reject(u.id)} className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase bg-danger-muted text-danger border border-danger-border rounded-md hover:bg-danger hover:text-white transition-colors cursor-pointer">RECHAZAR</button>
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

      {tab === 'misiones' && <MisionesTab missions={missions} onRefresh={loadAll} />}
      {tab === 'tienda' && <TiendaTab items={shopItems} onRefresh={loadAll} />}
      {tab === 'opiniones' && (
        <div>
          {opinions.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No hay opiniones" />
          ) : (
            <div className="space-y-3">
              {opinions.map(o => (
                <div key={o.id} className="flex items-start justify-between gap-4 p-4 bg-base-800/40 border border-base-700/30 rounded-xl">
                  <div>
                    <p className="text-sm text-base-200 leading-relaxed">"{o.contenido}"</p>
                    <p className="text-xs text-base-500 mt-1">{new Date(o.fecha).toLocaleDateString('es-PE')}</p>
                  </div>
                  <button onClick={() => deleteOpinion(o.id)} className="shrink-0 p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PanelLayout>
  )
}

function UserRow({ user: u, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [rango, setRango] = useState(u.rango)
  const [rol, setRol] = useState(u.rol)

  const roleVariant = u.rol === 'super_admin' || u.rol === 'admin' ? 'danger' : u.rol === 'staff' ? 'warning' : 'default'
  const stateVariant = u.estado === 'activo' ? 'success' : u.estado === 'pendiente' ? 'warning' : 'danger'
  const isRecent = u.last_login && (Date.now() - new Date(u.last_login).getTime() < 3600000)
  const activityColor = !u.last_login ? 'text-danger' : isRecent ? 'text-success' : 'text-base-400'

  async function save() {
    await supabase.from('usuarios').update({ rango, rol }).eq('id', u.id)
    setEditing(false)
    onRefresh()
  }

  async function grant() {
    const pts = parseInt(prompt('Puntos a dar:')) || 0
    const money = parseInt(prompt('Dinero a dar:')) || 0
    const razon = prompt('Razón:') || 'Asignado por admin'
    if (pts || money) {
      const { dinero, puntos } = u
      await supabase.from('usuarios').update({ puntos: (puntos || 0) + pts, dinero: (dinero || 0) + money }).eq('id', u.id)
      await supabase.from('movimientos').insert({ usuario_id: u.id, tipo: 'ingreso', monto: pts || money, moneda: pts ? 'puntos' : 'coins', descripcion: razon })
      onRefresh()
    }
  }

  return (
    <tr className="border-b border-base-700/20 hover:bg-base-800/30 transition-colors">
      <td className="px-4 py-3 text-base-200 font-medium">{u.nombre}</td>
      <td className="px-4 py-3 text-base-300">{u.usuario_roblox}</td>
      <td className="px-4 py-3">
        {editing ? <input value={rango} onChange={e => setRango(e.target.value)} className="w-32 px-2 py-1 bg-base-900 border border-base-600 rounded text-xs text-base-200" /> : <span className="text-base-300">{u.rango}</span>}
      </td>
      <td className="px-4 py-3 text-base-300 text-xs">{u.puntos}</td>
      <td className="px-4 py-3 text-base-300 text-xs">{u.dinero}</td>
      <td className="px-4 py-3">
        {editing ? (
          <select value={rol} onChange={e => setRol(e.target.value)} className="px-2 py-1 bg-base-900 border border-base-600 rounded text-xs text-base-200">
            <option value="usuario">usuario</option>
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
        ) : <Badge variant={roleVariant}>{u.rol}</Badge>}
      </td>
      <td className="px-4 py-3"><Badge variant={stateVariant}>{u.estado}</Badge></td>
      <td className={`px-4 py-3 text-xs ${activityColor}`}>{!u.last_login ? 'Nunca' : timeAgo(u.last_login)}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {editing ? (
            <button onClick={save} className="px-2 py-1 text-[10px] font-semibold uppercase bg-accent text-base-950 rounded cursor-pointer">OK</button>
          ) : (
            <button onClick={() => setEditing(true)} className="p-1.5 text-base-500 hover:text-accent transition-colors cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
          )}
          <button onClick={grant} className="p-1.5 text-base-500 hover:text-accent transition-colors cursor-pointer"><Gift className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
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

function MisionesTab({ missions, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha: '', recompensa_puntos: 0, recompensa_dinero: 0 })

  async function create() {
    if (!form.titulo) return
    await supabase.from('misiones').insert({ ...form, estado: 'programada' })
    setShowCreate(false)
    setForm({ titulo: '', descripcion: '', fecha: '', recompensa_puntos: 0, recompensa_dinero: 0 })
    onRefresh()
  }

  async function finish(id) {
    if (!confirm('Terminar misión y pagar recompensas a todos los inscritos?')) return
    const { data: participants } = await supabase.from('misiones_participantes').select('usuario_id').eq('mision_id', id).eq('recompensa_pagada', false)
    if (participants?.length) {
      for (const p of participants) {
        const { data: mission } = await supabase.from('misiones').select('recompensa_puntos, recompensa_dinero').eq('id', id).single()
        if (mission) {
          const { data: user } = await supabase.from('usuarios').select('puntos, dinero').eq('id', p.usuario_id).single()
          if (user) {
            await supabase.from('usuarios').update({ puntos: user.puntos + mission.recompensa_puntos, dinero: user.dinero + mission.recompensa_dinero }).eq('id', p.usuario_id)
            await supabase.from('movimientos').insert([
              { usuario_id: p.usuario_id, tipo: 'recompensa', monto: mission.recompensa_puntos, moneda: 'puntos', descripcion: `Recompensa: ${form.titulo || 'Misión'}` },
              { usuario_id: p.usuario_id, tipo: 'recompensa', monto: mission.recompensa_dinero, moneda: 'coins', descripcion: `Recompensa: ${form.titulo || 'Misión'}` },
            ])
          }
          await supabase.from('misiones_participantes').update({ recompensa_pagada: true }).eq('mision_id', id).eq('usuario_id', p.usuario_id)
        }
      }
    }
    await supabase.from('misiones').update({ estado: 'terminada' }).eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <button onClick={() => setShowCreate(true)} className="mb-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent hover:text-base-950 transition-colors cursor-pointer">
        <Plus className="w-3.5 h-3.5" /> NUEVA MISIÓN
      </button>

      {showCreate && (
        <div className="mb-6 p-5 bg-base-800/40 border border-base-700/40 rounded-xl space-y-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-base-200 uppercase tracking-wider">Crear Misión</span>
            <button onClick={() => setShowCreate(false)} className="text-base-500 hover:text-base-200 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título" className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción" className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          <input type="datetime-local" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: new Date(e.target.value).toISOString() }))} className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.recompensa_puntos} onChange={e => setForm(f => ({ ...f, recompensa_puntos: parseInt(e.target.value) || 0 }))} placeholder="Puntos" className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
            <input type="number" value={form.recompensa_dinero} onChange={e => setForm(f => ({ ...f, recompensa_dinero: parseInt(e.target.value) || 0 }))} placeholder="Coins" className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          </div>
          <button onClick={create} className="px-4 py-2 bg-accent text-base-950 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer">CREAR</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-base-700/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700/40">
              {['TÍTULO', 'FECHA', 'PTS', 'COINS', 'ESTADO', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 bg-base-800/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {missions.map(m => {
              const variant = m.estado === 'activa' ? 'accent' : m.estado === 'terminada' ? 'success' : 'default'
              return (
                <tr key={m.id} className="border-b border-base-700/20 hover:bg-base-800/30 transition-colors">
                  <td className="px-4 py-3 text-base-200 font-medium">{m.titulo}</td>
                  <td className="px-4 py-3 text-base-400 text-xs">{m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE') : '—'}</td>
                  <td className="px-4 py-3 text-base-300 text-xs">{m.recompensa_puntos}</td>
                  <td className="px-4 py-3 text-base-300 text-xs">{m.recompensa_dinero}</td>
                  <td className="px-4 py-3"><Badge variant={variant}>{m.estado}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {m.estado !== 'terminada' && (
                        <button onClick={() => finish(m.id)} className="px-2 py-1 text-[10px] font-semibold uppercase bg-success-muted text-success border border-success/20 rounded cursor-pointer hover:bg-success hover:text-white">TERMINAR</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {missions.length === 0 && <tr><td colSpan={6}><EmptyState icon={Target} title="No hay misiones" /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TiendaTab({ items, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ nombre: '', descripcion: '', tipo: 'general', imagen_url: '', precio_coins: 0, precio_puntos: 0, stock: -1 })

  async function create() {
    if (!form.nombre) return
    await supabase.from('tienda_items').insert({ ...form, disponible: true })
    setShowCreate(false)
    setForm({ nombre: '', descripcion: '', tipo: 'general', imagen_url: '', precio_coins: 0, precio_puntos: 0, stock: -1 })
    onRefresh()
  }

  async function toggleDisponible(id, current) {
    await supabase.from('tienda_items').update({ disponible: !current }).eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <button onClick={() => setShowCreate(true)} className="mb-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent hover:text-base-950 transition-colors cursor-pointer">
        <Plus className="w-3.5 h-3.5" /> NUEVO ITEM
      </button>

      {showCreate && (
        <div className="mb-6 p-5 bg-base-800/40 border border-base-700/40 rounded-xl space-y-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-base-200 uppercase tracking-wider">Crear Item</span>
            <button onClick={() => setShowCreate(false)} className="text-base-500 hover:text-base-200 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del item" className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción" className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          <input value={form.imagen_url} onChange={e => setForm(f => ({ ...f, imagen_url: e.target.value }))} placeholder="URL de imagen" className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          {form.imagen_url && <img src={form.imagen_url} alt="preview" className="w-20 h-20 object-cover rounded-lg border border-base-700/40" onError={e => e.target.style.display = 'none'} />}
          <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200">
            <option value="arma">Arma</option>
            <option value="skin">Skin</option>
            <option value="rango">Rango</option>
            <option value="general">General</option>
          </select>
          <div className="grid grid-cols-3 gap-3">
            <input type="number" value={form.precio_coins} onChange={e => setForm(f => ({ ...f, precio_coins: parseInt(e.target.value) || 0 }))} placeholder="Precio coins" className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
            <input type="number" value={form.precio_puntos} onChange={e => setForm(f => ({ ...f, precio_puntos: parseInt(e.target.value) || 0 }))} placeholder="Precio puntos" className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
            <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) }))} placeholder="Stock (-1=∞)" className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          </div>
          <button onClick={create} className="px-4 py-2 bg-accent text-base-950 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer">CREAR</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-base-700/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700/40">
              {['IMG', 'NOMBRE', 'TIPO', 'COINS', 'PTS', 'STOCK', 'VISIBLE', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 bg-base-800/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-b border-base-700/20 hover:bg-base-800/30 transition-colors">
                <td className="px-4 py-3">
                  {it.imagen_url ? <img src={it.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-base-700/40" /> : <span className="text-base-600 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-base-200 font-medium">{it.nombre}</td>
                <td className="px-4 py-3"><Badge>{it.tipo}</Badge></td>
                <td className="px-4 py-3 text-base-300 text-xs">{it.precio_coins}</td>
                <td className="px-4 py-3 text-base-300 text-xs">{it.precio_puntos}</td>
                <td className="px-4 py-3 text-base-300 text-xs">{it.stock >= 0 ? it.stock : '∞'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleDisponible(it.id, it.disponible)} className={`px-2 py-1 text-[10px] font-semibold uppercase rounded cursor-pointer transition-colors ${it.disponible ? 'bg-success-muted text-success border border-success/20 hover:bg-success hover:text-white' : 'bg-base-700/30 text-base-500 border border-base-600/40'}`}>
                    {it.disponible ? 'SÍ' : 'NO'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => { if (confirm('Eliminar item?')) { supabase.from('tienda_items').delete().eq('id', it.id).then(onRefresh) } }} className="p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={8}><EmptyState icon={ShoppingBag} title="No hay items en la tienda" /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

async function approve(id) {
  await supabase.from('usuarios').update({ estado: 'activo', rango: 'Soldado', dinero: 500, puntos: 100 }).eq('id', id)
  window.location.reload()
}

async function reject(id) {
  if (!confirm('¿Rechazar este usuario?')) return
  await supabase.from('usuarios').delete().eq('id', id)
  window.location.reload()
}

async function deleteOpinion(id) {
  if (!confirm('¿Eliminar opinión?')) return
  await supabase.from('opiniones').delete().eq('id', id)
  window.location.reload()
}

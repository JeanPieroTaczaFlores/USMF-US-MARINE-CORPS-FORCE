import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PanelLayout from '../../components/PanelLayout'
import { StatCard, Badge, Tabs, SearchInput, EmptyState } from '../../components/ui'
import { Users, Clock, CheckCircle, Target, ShoppingBag, MessageSquare, Plus, Pencil, Gift, Trash2, X, Save, Shield, Crown, UserCog, Coins } from 'lucide-react'

export default function AdminPanel() {
  const [tab, setTab] = useState('usuarios')
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [missions, setMissions] = useState([])
  const [shopItems, setShopItems] = useState([])
  const [opinions, setOpinions] = useState([])
  const [roles, setRoles] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [u, m, s, o, r] = await Promise.all([
      supabase.from('usuarios').select('*').order('created_at', { ascending: false }),
      supabase.from('misiones').select('*').order('created_at', { ascending: false }),
      supabase.from('tienda_items').select('*').order('created_at', { ascending: false }),
      supabase.from('opiniones').select('*, usuarios(nombre, usuario_roblox, puntos, dinero)').order('created_at', { ascending: false }),
      supabase.from('roles').select('*').order('created_at', { ascending: false }),
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
    setRoles(r.data || [])
  }

  const tabList = [
    { id: 'usuarios', label: 'USUARIOS', count: stats.total },
    { id: 'solicitudes', label: 'SOLICITUDES', count: stats.pendientes },
    { id: 'misiones', label: 'MISIONES', count: stats.misiones },
    { id: 'tienda', label: 'TIENDA', count: stats.items },
    { id: 'opiniones', label: 'OPINIONES', count: stats.opiniones },
    { id: 'roles', label: 'ROLES', count: roles.length },
  ]

  const filteredUsers = search
    ? users.filter(u => (u.nombre + u.usuario_roblox + u.rango + u.rol + u.email).toLowerCase().includes(search.toLowerCase()))
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

      {tab === 'usuarios' && <UsuariosTab users={filteredUsers} search={search} setSearch={setSearch} onRefresh={loadAll} roles={roles} />}
      {tab === 'solicitudes' && <SolicitudesTab requests={requests} onRefresh={loadAll} />}
      {tab === 'misiones' && <MisionesTab missions={missions} onRefresh={loadAll} />}
      {tab === 'tienda' && <TiendaTab items={shopItems} onRefresh={loadAll} />}
      {tab === 'opiniones' && <OpinionesTab opinions={opinions} onRefresh={loadAll} />}
      {tab === 'roles' && <RolesTab roles={roles} onRefresh={loadAll} />}
    </PanelLayout>
  )
}

function UsuariosTab({ users, search, setSearch, onRefresh, roles }) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [grantingUser, setGrantingUser] = useState(null)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, usuario, rango o rol..." />
        <button onClick={() => setShowCreate(true)} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent hover:text-base-950 transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> NUEVO USUARIO
        </button>
      </div>

      {showCreate && <CreateUserForm onDone={() => { setShowCreate(false); onRefresh() }} roles={roles} />}

      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={() => { setEditingUser(null); onRefresh() }} roles={roles} />}

      {grantingUser && <GrantResourcesModal user={grantingUser} onClose={() => setGrantingUser(null)} onSaved={() => { setGrantingUser(null); onRefresh() }} />}

      <div className="overflow-x-auto rounded-xl border border-base-700/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700/40">
              {['NOMBRE', 'ROBLOX', 'RANGO', 'PUNTOS', 'DINERO', 'ROL', 'ESTADO', 'ACTIVIDAD', 'ACCIONES'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 bg-base-800/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <UserRow key={u.id} user={u} onRefresh={onRefresh} onEdit={() => setEditingUser(u)} onGrant={() => setGrantingUser(u)} roles={roles} />
            ))}
            {users.length === 0 && (
              <tr><td colSpan={9}><EmptyState icon={Users} title="No se encontraron usuarios" /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreateUserForm({ onDone, roles }) {
  const [form, setForm] = useState({ nombre: '', roblox: '', email: '', password: '', rango: 'Soldado', rol: 'usuario', puntos: 0, dinero: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function create() {
    if (!form.nombre || !form.email || !form.password) { setError('Nombre, email y contraseña son obligatorios.'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.admin.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true,
      options: { data: { nombre: form.nombre, roblox: form.roblox || 'SinUsuario' } }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('usuarios').update({
        nombre: form.nombre,
        usuario_roblox: form.roblox || 'SinUsuario',
        rango: form.rango,
        rol: form.rol,
        estado: 'activo',
        puntos: form.puntos,
        dinero: form.dinero,
      }).eq('auth_id', data.user.id)
    }

    setLoading(false)
    onDone()
  }

  return (
    <div className="mb-6 p-5 bg-base-800/40 border border-accent/20 rounded-xl space-y-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-base-200 uppercase tracking-wider">Crear Nuevo Usuario</span>
        <button onClick={onDone} className="text-base-500 hover:text-base-200 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      {error && <div className="px-3 py-2 rounded-lg bg-danger-muted border border-danger-border text-danger text-xs">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={form.nombre} onChange={e => update('nombre', e.target.value)} placeholder="Nombre completo *" className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
        <input value={form.roblox} onChange={e => update('roblox', e.target.value)} placeholder="Usuario Roblox" className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
        <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="Email *" className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
        <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Contraseña *" className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <select value={form.rango} onChange={e => update('rango', e.target.value)} className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200">
          {RANGOS_LIST.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
        </select>
        <select value={form.rol} onChange={e => update('rol', e.target.value)} className="px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200">
          <option value="usuario">USUARIO</option>
          <option value="staff">STAFF</option>
          <option value="admin">ADMIN</option>
          <option value="super_admin">SUPER ADMIN</option>
        </select>
        <input type="number" value={form.puntos} onChange={e => update('puntos', parseInt(e.target.value) || 0)} placeholder="Puntos" className="px-3 py-2 bg-base-900 border border-accent/30 rounded-lg text-sm text-accent" />
        <input type="number" value={form.dinero} onChange={e => update('dinero', parseInt(e.target.value) || 0)} placeholder="Dinero" className="px-3 py-2 bg-base-900 border border-success/30 rounded-lg text-sm text-success" />
      </div>
      <button onClick={create} disabled={loading} className="px-5 py-2 bg-accent text-base-950 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer disabled:opacity-50">
        {loading ? 'CREANDO...' : 'CREAR USUARIO'}
      </button>
    </div>
  )
}

function EditUserModal({ user, onClose, onSaved, roles }) {
  const [form, setForm] = useState({
    nombre: user.nombre || '',
    usuario_roblox: user.usuario_roblox || '',
    rango: user.rango || 'Soldado',
    puntos: user.puntos || 0,
    dinero: user.dinero || 0,
    rol: user.rol || 'usuario',
    estado: user.estado || 'activo',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function save() {
    if (!form.nombre) { setError('El nombre es obligatorio.'); return }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('usuarios').update({
      nombre: form.nombre,
      usuario_roblox: form.usuario_roblox,
      rango: form.rango,
      puntos: parseInt(form.puntos) || 0,
      dinero: parseInt(form.dinero) || 0,
      rol: form.rol,
      estado: form.estado,
    }).eq('id', user.id)

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-base-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-base-900 border border-base-700/60 rounded-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-accent" />
            <span className="text-sm font-semibold text-base-100 uppercase tracking-wider">Editar Usuario</span>
          </div>
          <button onClick={onClose} className="text-base-500 hover:text-base-200 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="px-3 py-2 rounded-lg bg-danger-muted border border-danger-border text-danger text-xs">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Nombre</label>
            <input value={form.nombre} onChange={e => update('nombre', e.target.value)} className="w-full px-3 py-2 bg-base-800 border border-base-700/50 rounded-lg text-sm text-base-200" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Roblox</label>
            <input value={form.usuario_roblox} onChange={e => update('usuario_roblox', e.target.value)} className="w-full px-3 py-2 bg-base-800 border border-base-700/50 rounded-lg text-sm text-base-200" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Rango</label>
          <select value={form.rango} onChange={e => update('rango', e.target.value)} className="w-full px-3 py-2 bg-base-800 border border-base-700/50 rounded-lg text-sm text-base-200">
            {RANGOS_LIST.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Puntos</label>
            <input type="number" value={form.puntos} onChange={e => update('puntos', e.target.value)} className="w-full px-3 py-2 bg-base-800 border border-accent/30 rounded-lg text-sm text-accent font-semibold" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Dinero (Coins)</label>
            <input type="number" value={form.dinero} onChange={e => update('dinero', e.target.value)} className="w-full px-3 py-2 bg-base-800 border border-success/30 rounded-lg text-sm text-success font-semibold" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Rol</label>
            <select value={form.rol} onChange={e => update('rol', e.target.value)} className="w-full px-3 py-2 bg-base-800 border border-base-700/50 rounded-lg text-sm text-base-200">
              <option value="usuario">USUARIO</option>
              <option value="staff">STAFF</option>
              <option value="admin">ADMIN</option>
              <option value="super_admin">SUPER ADMIN</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Estado</label>
            <select value={form.estado} onChange={e => update('estado', e.target.value)} className="w-full px-3 py-2 bg-base-800 border border-base-700/50 rounded-lg text-sm text-base-200">
              <option value="activo">ACTIVO</option>
              <option value="pendiente">PENDIENTE</option>
              <option value="baneado">BANEADO</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={save} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-accent text-base-950 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-base-700/50 text-base-400 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer hover:text-base-200">CANCELAR</button>
        </div>
      </div>
    </div>
  )
}

function GrantResourcesModal({ user, onClose, onSaved }) {
  const [puntos, setPuntos] = useState(0)
  const [dinero, setDinero] = useState(0)
  const [razon, setRazon] = useState('')
  const [loading, setLoading] = useState(false)

  async function grant() {
    const pts = parseInt(puntos) || 0
    const money = parseInt(dinero) || 0
    if (!pts && !money) return
    setLoading(true)

    await supabase.from('usuarios').update({
      puntos: (user.puntos || 0) + pts,
      dinero: (user.dinero || 0) + money,
    }).eq('id', user.id)

    if (pts) {
      await supabase.from('movimientos').insert({
        usuario_id: user.id, tipo: 'ingreso', monto: pts, moneda: 'puntos',
        descripcion: razon || 'Asignado por admin',
      })
    }
    if (money) {
      await supabase.from('movimientos').insert({
        usuario_id: user.id, tipo: 'ingreso', monto: money, moneda: 'coins',
        descripcion: razon || 'Asignado por admin',
      })
    }

    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-base-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-base-900 border border-base-700/60 rounded-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-success" />
            <span className="text-sm font-semibold text-base-100 uppercase tracking-wider">Dar Recursos</span>
          </div>
          <button onClick={onClose} className="text-base-500 hover:text-base-200 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-3 bg-base-800/50 rounded-lg border border-base-700/40">
          <p className="text-xs text-base-400 uppercase tracking-wider">Destinatario</p>
          <p className="text-sm text-base-100 font-medium">{user.nombre} <span className="text-base-400">({user.usuario_roblox})</span></p>
          <div className="flex gap-4 mt-1">
            <span className="text-xs text-accent">Pts: {user.puntos || 0}</span>
            <span className="text-xs text-success">Coins: {user.dinero || 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Puntos a dar</label>
            <input type="number" value={puntos} onChange={e => setPuntos(e.target.value)} className="w-full px-3 py-2 bg-base-800 border border-accent/30 rounded-lg text-sm text-accent font-semibold" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Coins a dar</label>
            <input type="number" value={dinero} onChange={e => setDinero(e.target.value)} className="w-full px-3 py-2 bg-base-800 border border-success/30 rounded-lg text-sm text-success font-semibold" />
          </div>
        </div>

        <input value={razon} onChange={e => setRazon(e.target.value)} placeholder="Razón (opcional)" className="w-full px-3 py-2 bg-base-800 border border-base-700/50 rounded-lg text-sm text-base-200" />

        <div className="flex gap-2 pt-1">
          <button onClick={grant} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-success text-white font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer disabled:opacity-50">
            <Gift className="w-3.5 h-3.5" /> {loading ? 'ENVIANDO...' : 'ENVIAR RECURSOS'}
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-base-700/50 text-base-400 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer hover:text-base-200">CANCELAR</button>
        </div>
      </div>
    </div>
  )
}

function UserRow({ user: u, onRefresh, onEdit, onGrant }) {
  async function remove() {
    if (!confirm(`¿Eliminar usuario ${u.nombre}? Esto borra su cuenta permanentemente.`)) return
    await supabase.from('usuarios').delete().eq('id', u.id)
    onRefresh()
  }

  const roleVariant = u.rol === 'super_admin' || u.rol === 'admin' ? 'danger' : u.rol === 'staff' ? 'warning' : 'default'
  const stateVariant = u.estado === 'activo' ? 'success' : u.estado === 'pendiente' ? 'warning' : 'danger'
  const isRecent = u.last_login && (Date.now() - new Date(u.last_login).getTime() < 3600000)
  const activityColor = !u.last_login ? 'text-danger' : isRecent ? 'text-success' : 'text-base-400'

  return (
    <tr className="border-b border-base-700/20 hover:bg-base-800/30 transition-colors">
      <td className="px-4 py-3 text-base-200 font-medium">{u.nombre}</td>
      <td className="px-4 py-3 text-base-300">{u.usuario_roblox}</td>
      <td className="px-4 py-3 text-base-300 text-xs">{u.rango}</td>
      <td className="px-4 py-3 text-accent text-xs font-semibold">{u.puntos || 0}</td>
      <td className="px-4 py-3 text-success text-xs font-semibold">{u.dinero || 0}</td>
      <td className="px-4 py-3"><Badge variant={roleVariant}>{u.rol}</Badge></td>
      <td className="px-4 py-3"><Badge variant={stateVariant}>{u.estado}</Badge></td>
      <td className={`px-4 py-3 text-xs ${activityColor}`}>{!u.last_login ? 'Nunca' : timeAgo(u.last_login)}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button onClick={onEdit} title="Editar" className="p-1.5 text-base-500 hover:text-accent transition-colors cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onGrant} title="Dar recursos" className="p-1.5 text-base-500 hover:text-success transition-colors cursor-pointer"><Gift className="w-3.5 h-3.5" /></button>
          <button onClick={remove} title="Eliminar" className="p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
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

function RolesTab({ roles, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ nombre: '', descripcion: '', color: 'default' })

  async function createRole() {
    if (!form.nombre) return
    await supabase.from('roles').insert({ nombre: form.nombre, descripcion: form.descripcion, color: form.color })
    setForm({ nombre: '', descripcion: '', color: 'default' })
    setShowCreate(false)
    onRefresh()
  }

  async function removeRole(id, nombre) {
    if (!confirm(`¿Eliminar el rol "${nombre}"?`)) return
    await supabase.from('roles').delete().eq('id', id)
    onRefresh()
  }

  const COLORS = ['default', 'accent', 'success', 'warning', 'danger']

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-base-400">Gestiona los tipos de rol disponibles en el sistema. Los roles se asignan a los usuarios desde la pestaña de USUARIOS.</p>
        <button onClick={() => setShowCreate(true)} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent hover:text-base-950 transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> NUEVO ROL
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-5 bg-base-800/40 border border-accent/20 rounded-xl space-y-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-base-200 uppercase tracking-wider">Crear Rol</span>
            <button onClick={() => setShowCreate(false)} className="text-base-500 hover:text-base-200 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del rol" className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción" className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`px-3 py-1 text-xs font-semibold uppercase rounded border cursor-pointer transition-colors ${form.color === c ? 'ring-2 ring-accent' : ''} ${c === 'default' ? 'bg-base-600/30 text-base-300 border-base-600/40' : c === 'accent' ? 'bg-accent-muted text-accent border-accent-border' : c === 'success' ? 'bg-success-muted text-success border-success/20' : c === 'warning' ? 'bg-warning-muted text-warning border-warning/20' : 'bg-danger-muted text-danger border-danger-border'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button onClick={createRole} className="px-5 py-2 bg-accent text-base-950 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer">CREAR ROL</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-base-700/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700/40">
              {['NOMBRE', 'DESCRIPCIÓN', 'COLOR', 'FECHA', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 bg-base-800/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id} className="border-b border-base-700/20 hover:bg-base-800/30 transition-colors">
                <td className="px-4 py-3 text-base-200 font-medium">{r.nombre}</td>
                <td className="px-4 py-3 text-base-400 text-xs">{r.descripcion || '—'}</td>
                <td className="px-4 py-3"><Badge variant={r.color || 'default'}>{r.color || 'default'}</Badge></td>
                <td className="px-4 py-3 text-base-400 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString('es-PE') : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => removeRole(r.id, r.nombre)} title="Eliminar rol" className="p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
            {roles.length === 0 && <tr><td colSpan={5}><EmptyState icon={Shield} title="No hay roles personalizados" description="Los roles por defecto son: USUARIO, STAFF, ADMIN, SUPER ADMIN" /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SolicitudesTab({ requests, onRefresh }) {
  async function approve(id) {
    await supabase.from('usuarios').update({ estado: 'activo', rango: 'Soldado', dinero: 500, puntos: 100 }).eq('id', id)
    onRefresh()
  }

  async function reject(id) {
    if (!confirm('¿Rechazar este usuario?')) return
    await supabase.from('usuarios').delete().eq('id', id)
    onRefresh()
  }

  if (requests.length === 0) return <EmptyState icon={CheckCircle} title="No hay solicitudes pendientes" description="Todas las solicitudes han sido procesadas." />

  return (
    <div className="overflow-x-auto rounded-xl border border-base-700/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-base-700/40">
            {['NOMBRE', 'ROBLOX', 'EMAIL', 'PUNTOS', 'DINERO', 'FECHA', ''].map(h => (
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
              <td className="px-4 py-3 text-accent text-xs font-semibold">{u.puntos || 0}</td>
              <td className="px-4 py-3 text-success text-xs font-semibold">{u.dinero || 0}</td>
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
  )
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

  async function finish(id, titulo) {
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
              { usuario_id: p.usuario_id, tipo: 'recompensa', monto: mission.recompensa_puntos, moneda: 'puntos', descripcion: `Recompensa: ${titulo}` },
              { usuario_id: p.usuario_id, tipo: 'recompensa', monto: mission.recompensa_dinero, moneda: 'coins', descripcion: `Recompensa: ${titulo}` },
            ])
          }
          await supabase.from('misiones_participantes').update({ recompensa_pagada: true }).eq('mision_id', id).eq('usuario_id', p.usuario_id)
        }
      }
    }
    await supabase.from('misiones').update({ estado: 'terminada' }).eq('id', id)
    onRefresh()
  }

  async function remove(id) {
    if (!confirm('¿Eliminar esta misión?')) return
    await supabase.from('misiones').delete().eq('id', id)
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
          <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título de la misión" className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción" className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          <input type="datetime-local" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: new Date(e.target.value).toISOString() }))} className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Puntos</label>
              <input type="number" value={form.recompensa_puntos} onChange={e => setForm(f => ({ ...f, recompensa_puntos: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Dinero (Coins)</label>
              <input type="number" value={form.recompensa_dinero} onChange={e => setForm(f => ({ ...f, recompensa_dinero: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
            </div>
          </div>
          <button onClick={create} className="px-5 py-2 bg-accent text-base-950 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer">CREAR MISIÓN</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-base-700/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700/40">
              {['TÍTULO', 'FECHA', 'PUNTOS', 'DINERO', 'ESTADO', ''].map(h => (
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
                  <td className="px-4 py-3 text-accent text-xs font-semibold">{m.recompensa_puntos}</td>
                  <td className="px-4 py-3 text-success text-xs font-semibold">{m.recompensa_dinero}</td>
                  <td className="px-4 py-3"><Badge variant={variant}>{m.estado}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {m.estado !== 'terminada' && (
                        <button onClick={() => finish(m.id, m.titulo)} className="px-2 py-1 text-[10px] font-semibold uppercase bg-success-muted text-success border border-success/20 rounded cursor-pointer hover:bg-success hover:text-white">TERMINAR</button>
                      )}
                      <button onClick={() => remove(m.id)} className="p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
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
            <div>
              <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Precio Dinero</label>
              <input type="number" value={form.precio_coins} onChange={e => setForm(f => ({ ...f, precio_coins: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Precio Puntos</label>
              <input type="number" value={form.precio_puntos} onChange={e => setForm(f => ({ ...f, precio_puntos: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1">Stock (-1 = infinito)</label>
              <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) }))} className="w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200" />
            </div>
          </div>
          <button onClick={create} className="px-5 py-2 bg-accent text-base-950 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer">CREAR ITEM</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-base-700/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700/40">
              {['IMG', 'NOMBRE', 'TIPO', 'DINERO', 'PUNTOS', 'STOCK', 'VISIBLE', ''].map(h => (
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
                <td className="px-4 py-3 text-success text-xs font-semibold">{it.precio_coins}</td>
                <td className="px-4 py-3 text-accent text-xs font-semibold">{it.precio_puntos}</td>
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

function OpinionesTab({ opinions, onRefresh }) {
  async function remove(id) {
    if (!confirm('¿Eliminar opinión?')) return
    await supabase.from('opiniones').delete().eq('id', id)
    onRefresh()
  }

  if (opinions.length === 0) return <EmptyState icon={MessageSquare} title="No hay opiniones" />

  return (
    <div className="overflow-x-auto rounded-xl border border-base-700/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-base-700/40">
            {['AUTOR', 'ROBLOX', 'PUNTOS', 'DINERO', 'OPINIÓN', 'FECHA', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 bg-base-800/30">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {opinions.map(o => (
            <tr key={o.id} className="border-b border-base-700/20 hover:bg-base-800/30 transition-colors">
              <td className="px-4 py-3 text-base-200 font-medium">{o.usuarios?.nombre || '—'}</td>
              <td className="px-4 py-3 text-base-400 text-xs">{o.usuarios?.usuario_roblox || '—'}</td>
              <td className="px-4 py-3 text-accent text-xs font-semibold">{o.usuarios?.puntos ?? 0}</td>
              <td className="px-4 py-3 text-success text-xs font-semibold">{o.usuarios?.dinero ?? 0}</td>
              <td className="px-4 py-3 text-base-300 text-xs max-w-[300px] truncate">"{o.contenido}"</td>
              <td className="px-4 py-3 text-base-400 text-xs">{new Date(o.created_at).toLocaleDateString('es-PE')}</td>
              <td className="px-4 py-3">
                <button onClick={() => remove(o.id)} className="p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const RANGOS_LIST = [
  "Soldado", "Soldado 1ra Clase", "Cabo", "Cabo de Escuadra",
  "Sargento de Escuadra", "Sargento de Pelotón", "Sargento de Compañía",
  "Sargento Mayor de 3ra Clase", "Sargento Mayor de 2da Clase",
  "Sargento Mayor de 1ra Clase", "Sargento Mayor", "Sargento Mayor Command",
  "Teniente 2do", "Teniente 1ro", "Capitán", "Mayor",
  "Teniente Coronel", "Coronel", "General de Brigada", "General de División",
  "Teniente General", "General",
]

export const RANGOS = [
  { nombre: "Soldado", salario: 80, orden: 1 },
  { nombre: "Soldado 1ra Clase", salario: 120, orden: 2 },
  { nombre: "Cabo", salario: 160, orden: 3 },
  { nombre: "Cabo de Escuadra", salario: 200, orden: 4 },
  { nombre: "Sargento de Escuadra", salario: 280, orden: 5 },
  { nombre: "Sargento de Pelotón", salario: 360, orden: 6 },
  { nombre: "Sargento de Compañía", salario: 440, orden: 7 },
  { nombre: "Sargento Mayor de 3ra Clase", salario: 520, orden: 8 },
  { nombre: "Sargento Mayor de 2da Clase", salario: 600, orden: 9 },
  { nombre: "Sargento Mayor de 1ra Clase", salario: 700, orden: 10 },
  { nombre: "Sargento Mayor", salario: 800, orden: 11 },
  { nombre: "Sargento Mayor Command", salario: 900, orden: 12 },
  { nombre: "Teniente 2do", salario: 1000, orden: 13 },
  { nombre: "Teniente 1ro", salario: 1100, orden: 14 },
  { nombre: "Capitán", salario: 1250, orden: 15 },
  { nombre: "Mayor", salario: 1400, orden: 16 },
  { nombre: "Teniente Coronel", salario: 1600, orden: 17 },
  { nombre: "Coronel", salario: 1800, orden: 18 },
  { nombre: "General de Brigada", salario: 2000, orden: 19 },
  { nombre: "General de División", salario: 2200, orden: 20 },
  { nombre: "Teniente General", salario: 2400, orden: 21 },
  { nombre: "General", salario: 2600, orden: 22 },
]

export function getSalario(rango) {
  const found = RANGOS.find(r => r.nombre === rango)
  return found ? found.salario : 80
}

export function timeAgo(dateStr) {
  if (!dateStr) return 'Nunca'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  return `${months}m`
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

export function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export function formatMoney(n) {
  return n.toLocaleString('es-PE')
}

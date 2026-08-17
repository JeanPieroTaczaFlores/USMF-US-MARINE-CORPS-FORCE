import { Shield, Crosshair, Shirt, Award, ShoppingBag, Clock, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const categories = [
  {
    icon: Crosshair,
    title: 'ARMAS',
    desc: 'Armas exclusivas para misiones y entrenamiento táctico.',
    items: ['Rifles M4A1', 'Sniper M110', 'Escopeta M590', 'Pistola M17'],
  },
  {
    icon: Shirt,
    title: 'SKINS',
    desc: 'Skins únicas para tu personaje y equipo visual.',
    items: ['Camuflaje Forest', 'Ghillie Suit', 'Urban Stealth', 'Desert Ops'],
  },
  {
    icon: Award,
    title: 'RANGOS',
    desc: 'Insignias y rangos especiales para distinguirte.',
    items: ['Insignia Elite', 'Placa MARSOC', 'Badge Recon', 'Pin Honor'],
  },
]

export default function Tienda() {
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
            <Link to="/app/tienda" className="text-xs text-accent font-semibold tracking-wider uppercase">TIENDA</Link>
            <Link to="/app/opiniones" className="text-xs text-base-400 hover:text-accent transition-colors tracking-wider uppercase">OPINIONES</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-[1000px] mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingBag className="w-5 h-5 text-accent" />
          <h1 className="font-display text-xl font-semibold tracking-[0.08em] uppercase text-base-100">TIENDA USMCF</h1>
        </div>
        <p className="text-sm text-base-400 mb-10 ml-8">Equipamiento y items exclusivos para miembros de la facción.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {categories.map(cat => (
            <div key={cat.title} className="bg-base-800/40 border border-base-700/30 rounded-xl p-6 hover:border-accent/20 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <cat.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display text-sm font-semibold tracking-[0.12em] uppercase text-base-100 mb-1">{cat.title}</h3>
              <p className="text-xs text-base-500 leading-relaxed mb-4">{cat.desc}</p>
              <ul className="space-y-1.5">
                {cat.items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-xs text-base-400">
                    <div className="w-1 h-1 rounded-full bg-accent/50 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-base-800/30 border border-base-700/30 rounded-xl p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-base-700/30 border border-base-600/30 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-base-500" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-accent">PRÓXIMAMENTE</span>
          </div>
          <h2 className="font-display text-lg font-semibold tracking-[0.05em] uppercase text-base-100 mb-2">LA TIENDA ESTÁ EN CONSTRUCCIÓN</h2>
          <p className="text-sm text-base-400 max-w-md mx-auto leading-relaxed">
            El equipo está trabajando para traerte los mejores items y equipamiento.
            Estará disponible muy pronto.
          </p>
          <div className="mt-5 w-full max-w-xs mx-auto">
            <div className="flex items-center justify-between text-[10px] text-base-500 mb-1.5">
              <span className="tracking-wider uppercase">Progreso</span>
              <span className="text-accent font-semibold">40%</span>
            </div>
            <div className="w-full h-1.5 bg-base-700/40 rounded-full overflow-hidden">
              <div className="h-full w-[40%] bg-accent rounded-full" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

import { Shield, Crosshair, Shirt, Award } from 'lucide-react'

export default function Tienda() {
  return (
    <div className="min-h-screen bg-base-950">
      <nav className="sticky top-0 z-50 border-b border-base-700/50 bg-base-900/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <span className="font-display text-sm font-semibold tracking-[0.15em] uppercase text-base-100">USMCF</span>
          </div>
          <a href="/" className="text-xs text-base-400 hover:text-accent transition-colors tracking-wider uppercase">INICIO</a>
        </div>
      </nav>

      <main className="max-w-[800px] mx-auto px-4 py-16 text-center">
        <div className="mb-12">
          <div className="w-20 h-20 rounded-2xl bg-base-800/50 border border-base-700/40 flex items-center justify-center mx-auto mb-6 animate-[float_3s_ease-in-out_infinite]">
            <Shield className="w-10 h-10 text-accent/40" />
          </div>
          <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-accent mb-2">PRÓXIMAMENTE</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[0.03em] uppercase text-base-100 mb-3">MUY PRONTO</h1>
          <p className="text-base-400 text-sm max-w-md mx-auto leading-relaxed">
            Estamos preparando la tienda oficial de USMCF con los mejores items, armas, skins y más.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { icon: Crosshair, title: 'ARMAS', desc: 'Armas exclusivas para misiones' },
            { icon: Shirt, title: 'SKINS', desc: 'Skins únicas para tu personaje' },
            { icon: Award, title: 'RANGOS', desc: 'Rangos especiales e insignias' },
          ].map(f => (
            <div key={f.title} className="p-5 bg-base-800/40 border border-base-700/30 rounded-xl transition-colors hover:border-accent/20">
              <f.icon className="w-8 h-8 text-base-500 mx-auto mb-3" strokeWidth={1.5} />
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-200 mb-1">{f.title}</div>
              <div className="text-xs text-base-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="p-5 bg-base-800/30 border border-base-700/30 rounded-xl text-left">
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-3">PROGRESO DE DESARROLLO</div>
          <div className="w-full h-2 bg-base-700/40 rounded-full overflow-hidden">
            <div className="h-full w-[40%] bg-gradient-to-r from-accent to-[#c9a227] rounded-full animate-[pulse_2s_ease-in-out_infinite]" />
          </div>
          <p className="text-xs text-base-500 mt-2">El equipo está trabajando duro. ¡No te lo pierdas!</p>
        </div>
      </main>
    </div>
  )
}

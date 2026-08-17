import { Link } from 'react-router-dom'
import { Shield, ArrowRight } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-base-950 flex items-center justify-center px-4">
      <div className="text-center max-w-xl">
        <Link to="/" className="inline-flex items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-accent" />
          </div>
        </Link>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[0.05em] uppercase text-base-100 mb-4">
          US MARINE CORPS FORCE
        </h1>
        <p className="text-base-400 text-lg mb-10 leading-relaxed">
          "Siempre fiel. Siempre leales. Un marino, una misión, una causa."
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-base-950 font-semibold text-sm tracking-wider uppercase rounded-xl transition-colors"
          >
            INICIAR SESIÓN <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 border border-base-600 text-base-300 hover:border-accent/40 hover:text-accent font-semibold text-sm tracking-wider uppercase rounded-xl transition-colors"
          >
            REGÍSTRATE
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { title: 'MISIONES', desc: 'Opera en equipos tácticos' },
            { title: 'TIENDA', desc: 'Equipamiento exclusivo' },
            { title: 'RANGOS', desc: 'Sistema jerárquico real' },
          ].map(f => (
            <div key={f.title} className="p-4 bg-base-800/30 border border-base-700/30 rounded-xl">
              <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-accent mb-1">{f.title}</div>
              <div className="text-xs text-base-400">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

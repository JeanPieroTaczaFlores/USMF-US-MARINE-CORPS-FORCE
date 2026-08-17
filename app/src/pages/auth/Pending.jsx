import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

export default function Pending() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950 px-4">
      <div className="w-full max-w-[420px]">
        <div className="bg-base-800/40 border border-base-700/40 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-warning-muted border border-warning/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <h1 className="font-display text-xl font-semibold tracking-[0.05em] uppercase text-base-100 mb-3">
            SOLICITUD PENDIENTE
          </h1>
          <p className="text-sm text-base-400 leading-relaxed mb-6">
            Tu cuenta está esperando la aprobación de un administrador o staff. Te notificaremos cuando seas aceptado.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/login"
              className="px-4 py-2.5 text-xs font-semibold tracking-wider uppercase text-base-300 border border-base-600 rounded-lg hover:border-accent/40 hover:text-accent transition-colors"
            >
              Volver al inicio de sesión
            </Link>
            <Link to="/" className="text-xs text-base-500 hover:text-base-300 transition-colors">
              Volver al sitio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { Coffee, UtensilsCrossed, ArrowLeft, Home, Sparkles, AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Background Ambience Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 backdrop-blur-2xl shadow-2xl text-center space-y-6">
        {/* Restaurant Icon Badge */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-violet-600/20 border border-amber-500/30 animate-pulse"></div>
          <div className="relative w-20 h-20 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center shadow-xl">
            <Coffee className="w-10 h-10 text-amber-400" />
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 404 Headline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wide uppercase">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Error 404 • Fuera de Menú</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ¡Esta mesa no está en nuestra carta!
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Parece que la página o receta que estás buscando se ha esfumado como el aroma de un buen espresso, fue trasladada o no se encuentra disponible.
          </p>
        </div>

        {/* Interactive Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Ir al Panel Principal</span>
          </Link>

          <Link
            href="/pos"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all cursor-pointer"
          >
            <Coffee className="w-4 h-4 text-amber-400" />
            <span>Terminal de Cobro (POS)</span>
          </Link>
        </div>

        {/* Footer brand touch */}
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500/60" />
          <span>PosCafé • Sistema Gastronómico Inteligente</span>
        </div>
      </div>
    </div>
  )
}

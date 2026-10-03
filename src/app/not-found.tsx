import Link from 'next/link'
import { Coffee, UtensilsCrossed, Home, Sparkles, AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F3E9DC] text-[#5E3023] flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-[#C08552] selection:text-white">
      {/* Warm Ambient Coffee Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#C08552]/15 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-[#5E3023]/10 rounded-full blur-[110px]"></div>
      </div>

      <div className="relative w-full max-w-lg bg-white/95 border border-[#E6D5C3] rounded-3xl p-8 sm:p-10 backdrop-blur-xl shadow-2xl shadow-[#5E3023]/15 text-center space-y-6">
        {/* Restaurant Icon Badge */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#5E3023] to-[#7A3E2D] flex items-center justify-center shadow-lg shadow-[#5E3023]/25 transform hover:scale-105 transition-transform duration-300">
            <Coffee className="w-10 h-10 text-[#F3E9DC]" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[#C08552] border-2 border-white flex items-center justify-center text-white shadow-md">
            <UtensilsCrossed className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 404 Headline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#C08552]/15 border border-[#C08552]/30 text-[#C08552] text-xs font-bold tracking-wide uppercase">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Error 404 • Fuera de Menú</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#5E3023] tracking-tight">
            ¡Esta mesa no está en nuestra carta!
          </h1>

          <p className="text-sm text-[#895737] leading-relaxed max-w-md mx-auto font-medium">
            Parece que la página o receta que estás buscando se ha esfumado como el aroma de un buen espresso recién servido, fue trasladada o no se encuentra disponible.
          </p>
        </div>

        {/* Interactive Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#5E3023] hover:bg-[#472218] text-[#F3E9DC] font-bold text-xs shadow-lg shadow-[#5E3023]/25 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Ir al Panel Principal</span>
          </Link>

          <Link
            href="/pos"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FDFBF9] hover:bg-[#F3E9DC] text-[#5E3023] font-bold text-xs border border-[#DECEBD] hover:border-[#C08552] shadow-xs transition-all cursor-pointer"
          >
            <Coffee className="w-4 h-4 text-[#C08552]" />
            <span>Terminal de Cobro (POS)</span>
          </Link>
        </div>

        {/* Footer brand touch */}
        <div className="pt-4 border-t border-[#E6D5C3]/80 text-[11px] text-[#A88C7D] font-medium flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#C08552]" />
          <span>PosCafé • Sistema Gastronómico Inteligente</span>
        </div>
      </div>
    </div>
  )
}

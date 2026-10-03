'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck,
  KeyRound,
  Store,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  User,
  Coffee,
  RotateCcw,
} from 'lucide-react'

export default function LogoutPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionCleared, setSessionCleared] = useState(false)

  // Asegurar que la cookie de sesión se destruya al entrar a esta pantalla
  useEffect(() => {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(() => setSessionCleared(true))
      .catch(() => setSessionCleared(true))
  }, [])

  // Teclado numérico táctil
  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setPin('')
    } else if (val === 'DEL') {
      setPin((prev) => prev.slice(0, -1))
    } else {
      if (pin.length < 6) {
        setPin((prev) => prev + val)
      }
    }
  }

  // Soporte de teclado físico (teclas 0-9, Backspace, Escape, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) setPin((prev) => prev + e.key)
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1))
      } else if (e.key === 'Escape') {
        setPin('')
      } else if (e.key === 'Enter' && pin.length >= 4) {
        handleUnlockWithPin()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pin])

  // Desbloqueo inmediato con PIN
  const handleUnlockWithPin = async (overridePin?: string) => {
    const pinToSubmit = overridePin || pin
    if (!pinToSubmit || pinToSubmit.length < 4) {
      setError('Ingresa al menos 4 dígitos de tu PIN')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToSubmit }),
      })

      const result = await res.json()

      if (!result.success) {
        setError(result.error?.message || 'PIN inválido o no reconocido')
        setLoading(false)
        setPin('')
        return
      }

      // Redirigir según los permisos del usuario
      if (result.data?.user?.permissions?.canAccessPOS) {
        router.push('/pos')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Error al conectar con el servidor')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-black">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Header de Cierre */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 mb-1">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            Terminal Bloqueada
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">Sesión Finalizada</h1>
          <p className="text-xs text-slate-400 max-w-xs">
            Tu sesión ha sido cerrada correctamente. La terminal está lista para el siguiente
            operador.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium animate-shake">
            {error}
          </div>
        )}

        {/* Sección de Reingreso Rápido con PIN */}
        <div className="space-y-4 pt-1">
          <div className="text-center">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Relevo Rápido / Ingreso con PIN
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cajero o mesero: ingresa tu PIN para continuar
            </p>
          </div>

          {/* PIN Dots Display */}
          <div className="flex justify-center items-center gap-3 py-2 bg-slate-950/80 rounded-2xl border border-slate-800">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  pin.length > idx
                    ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-400/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleKeypadPress(val)}
                className={`h-12 rounded-xl text-base font-bold transition-all cursor-pointer ${
                  val === 'C'
                    ? 'bg-slate-800/60 hover:bg-slate-800 text-red-400 text-xs'
                    : val === 'DEL'
                    ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 text-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-white active:scale-95 shadow-sm'
                }`}
              >
                {val === 'DEL' ? '⌫' : val}
              </button>
            ))}
          </div>

          {/* Botón Desbloquear */}
          <button
            type="button"
            onClick={() => handleUnlockWithPin()}
            disabled={loading || pin.length < 4}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Desbloquear Terminal</span>
              </>
            )}
          </button>

          {/* Demo Quick PINs */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[10px] text-slate-500">Prueba rápida:</span>
            <button
              type="button"
              onClick={() => {
                setPin('1234')
                handleUnlockWithPin('1234')
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-[11px] text-amber-400 border border-slate-700 transition-all cursor-pointer"
            >
              Cajero (1234)
            </button>
            <button
              type="button"
              onClick={() => {
                setPin('4321')
                handleUnlockWithPin('4321')
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-[11px] text-violet-400 border border-slate-700 transition-all cursor-pointer"
            >
              Mesero (4321)
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="relative border-t border-slate-800">
          <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-slate-900 px-3 text-[10px] uppercase tracking-wider text-slate-500">
            o acceder con credenciales
          </span>
        </div>

        {/* Action Links */}
        <div className="space-y-2">
          <Link
            href="/login"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-violet-400" />
              Iniciar sesión con Correo y Contraseña
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

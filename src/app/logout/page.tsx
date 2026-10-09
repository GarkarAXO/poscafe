'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  KeyRound,
  Store,
  Lock,
  ArrowRight,
  Loader2,
  Coffee,
  CheckCircle2,
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

      // Redirigir según el rol y permisos específicos del usuario
      const user = result.data?.user
      const userRoles: string[] = user?.roleCodes || []
      const permissions = user?.permissions || {}
      const isOwnerOrAdmin =
        userRoles.includes('ADMIN') ||
        userRoles.includes('BRANCH_MANAGER') ||
        userRoles.includes('SUPERADMIN')
      const hasManagementPermission =
        permissions.canManageSettings ||
        permissions.canManageUsers ||
        permissions.canManageCatalog ||
        permissions.canViewReports ||
        permissions.canManageInventory

      // 1. Los meseros operan estrictamente en la Comandera de Mesas
      if (userRoles.includes('WAITER') && !isOwnerOrAdmin) {
        router.push('/comandera')
        return
      }

      // 2. Personal de cocina / barra
      if (userRoles.includes('CHEF') || userRoles.includes('KITCHEN')) {
        router.push('/kds')
        return
      }

      // 3. Administradores o personal con permisos de gestión
      if (isOwnerOrAdmin || hasManagementPermission) {
        router.push('/dashboard')
        return
      }

      // 4. Cajeros o usuarios habilitados para Terminal POS
      if (permissions.canAccessPOS || userRoles.includes('CASHIER')) {
        router.push('/pos')
        return
      }

      // 5. Por defecto
      router.push('/login')
    } catch {
      setError('Error al conectar con el servidor')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F3E9DC] text-[#5E3023] flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-[#C08552] selection:text-white">
      {/* Warm Ambient Coffee Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#C08552]/15 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-[#5E3023]/10 rounded-full blur-[110px]"></div>
      </div>

      <div className="relative w-full max-w-md bg-white/95 border border-[#E6D5C3] rounded-3xl p-7 sm:p-9 backdrop-blur-xl shadow-2xl shadow-[#5E3023]/15 space-y-6">
        {/* Header de Cierre */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5E3023] to-[#7A3E2D] flex items-center justify-center shadow-lg shadow-[#5E3023]/25 mb-1 transform hover:scale-105 transition-transform duration-300">
            <Coffee className="w-8 h-8 text-[#F3E9DC]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C08552]/15 border border-[#C08552]/30 text-[#C08552] text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Turno Concluido • Terminal en Pausa</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#5E3023]">
            ¡Hasta Pronto!
          </h1>
          <p className="text-xs text-[#895737] max-w-xs font-medium">
            Tu sesión ha sido cerrada correctamente. La terminal está lista para el siguiente turno.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Sección de Reingreso Rápido con PIN */}
        <div className="space-y-4 pt-1">
          <div className="text-center">
            <span className="text-xs font-bold text-[#5E3023] uppercase tracking-wider">
              Relevo Rápido / Ingreso con PIN
            </span>
            <p className="text-[11px] text-[#895737] mt-0.5 font-medium">
              Cajero o mesero: ingresa tu PIN para retomar turno
            </p>
          </div>

          {/* PIN Dots Display */}
          <div className="flex justify-center items-center gap-3.5 py-3 bg-[#FDFBF9] rounded-2xl border border-[#DECEBD]">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  pin.length > idx
                    ? 'bg-[#C08552] scale-125 shadow-sm shadow-[#C08552]/40'
                    : 'bg-[#E6D7C8]'
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
                className={`h-12 rounded-xl text-base font-bold transition-all shadow-xs cursor-pointer ${
                  val === 'C'
                    ? 'bg-[#FDFBF9] hover:bg-rose-50 border border-[#DECEBD] text-rose-600 text-xs'
                    : val === 'DEL'
                    ? 'bg-[#FDFBF9] hover:bg-[#F3E9DC] border border-[#DECEBD] text-[#895737] text-xs'
                    : 'bg-[#FDFBF9] hover:bg-[#F3E9DC] active:bg-[#E6D5C3] border border-[#DECEBD] text-[#5E3023] active:scale-95'
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
            className="w-full py-3 rounded-xl bg-[#C08552] hover:bg-[#A96F3F] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C08552]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Desbloquear Terminal</span>
              </>
            )}
          </button>
        </div>

        {/* Separator */}
        <div className="relative border-t border-[#E6D5C3]">
          <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-white px-3 text-[10px] uppercase font-bold tracking-wider text-[#A88C7D]">
            o volver a administración
          </span>
        </div>

        {/* Action Links */}
        <div>
          <Link
            href="/login"
            className="w-full py-3 px-4 rounded-xl bg-[#FDFBF9] hover:bg-[#F3E9DC] text-[#5E3023] text-xs font-bold border border-[#DECEBD] hover:border-[#C08552] flex items-center justify-between transition-all shadow-xs"
          >
            <span className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#C08552]" />
              Iniciar sesión con Correo y Contraseña
            </span>
            <ArrowRight className="w-4 h-4 text-[#5E3023]" />
          </Link>
        </div>
      </div>
    </div>
  )
}

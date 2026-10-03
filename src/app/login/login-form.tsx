'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Coffee, ShieldCheck, KeyRound, Store, ArrowRight, Loader2, Sparkles } from 'lucide-react'

type LoginMode = 'tenant' | 'pin'

export default function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('tenant')

  // Form states
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // PIN keypad helper
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

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let endpoint = '/api/auth/login'
      let payload: Record<string, any> = {}

      if (mode === 'tenant') {
        endpoint = '/api/auth/login'
        payload = { login, password }
      } else if (mode === 'pin') {
        endpoint = '/api/auth/pin'
        payload = { pin }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!result.success) {
        setError(result.error?.message || 'Error de autenticación')
        setLoading(false)
        return
      }

      // Redirección inteligente según el rol y permisos
      if (mode === 'pin') {
        const userRoles = result.data?.user?.roleCodes || []
        if (userRoles.includes('WAITER')) {
          router.push('/comandera')
        } else {
          router.push('/pos')
        }
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch {
      setError('Error de conexión con el servidor')
      setLoading(false)
    }
  }

  // Botones de prueba rápida con datos de la semilla
  const fillDemo = (type: 'owner' | 'cashier' | 'waiter') => {
    setError(null)
    if (type === 'owner') {
      setMode('tenant')
      setLogin('propietario@cafearoma.demo')
      setPassword('Owner2026!')
    } else if (type === 'cashier') {
      setMode('pin')
      setPin('1234')
    } else if (type === 'waiter') {
      setMode('pin')
      setPin('4321')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-violet-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-amber-500 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-3">
            <Coffee className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            PosCafé <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium">SaaS Multi-tenant</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Plataforma POS e inventarios multisucursal</p>
        </div>

        {/* Mode Selector Tabs (2 tabs: Negocio vs Terminal PIN) */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-1 rounded-xl mb-6 border border-slate-800/80 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('tenant')
              setError(null)
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all cursor-pointer ${
              mode === 'tenant'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Negocio / Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('pin')
              setError(null)
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all cursor-pointer ${
              mode === 'pin'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Terminal PIN</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Form: Negocio (Dueño / Gerente / Empleado con contraseña) */}
        {mode === 'tenant' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Correo o Usuario</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="propietario@cafearoma.demo"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ingresar al Dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Form: Terminal PIN */}
        {mode === 'pin' && (
          <div className="space-y-4">
            <div className="text-center">
              <label className="block text-xs font-medium text-slate-300 mb-2">Ingresa tu PIN de 4 dígitos</label>
              <div className="flex justify-center gap-3 my-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold transition-all ${
                      pin.length > idx
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-slate-800 bg-slate-950/60 text-slate-600'
                    }`}
                  >
                    {pin.length > idx ? '•' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleKeypadPress(val)}
                  className="py-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-sm font-semibold text-white transition-all active:scale-95 cursor-pointer"
                >
                  {val === 'DEL' ? '⌫' : val}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading || pin.length < 4}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar a Terminal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Demo Fast Access Buttons */}
        <div className="mt-8 pt-5 border-t border-slate-800/80">
          <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Accesos de prueba de la cafetería:
          </p>

          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => fillDemo('owner')}
              className="px-2 py-1.5 rounded-lg bg-slate-950/60 hover:bg-violet-950/40 border border-slate-800 hover:border-violet-500/50 text-slate-300 text-left transition-all cursor-pointer"
            >
              👑 <strong className="text-violet-400">Dueño</strong>
              <span className="block text-[10px] text-slate-500">Rodrigo</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('cashier')}
              className="px-2 py-1.5 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 text-slate-300 text-left transition-all cursor-pointer"
            >
              💳 <strong className="text-amber-400">Cajero</strong>
              <span className="block text-[10px] text-slate-500">PIN 1234</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('waiter')}
              className="px-2 py-1.5 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 text-slate-300 text-left transition-all cursor-pointer"
            >
              🍽️ <strong className="text-amber-400">Mesero</strong>
              <span className="block text-[10px] text-slate-500">PIN 4321</span>
            </button>
          </div>
        </div>

        {/* Discreet link to Platform Master Console */}
        <div className="mt-5 pt-3 border-t border-slate-800/50 text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>¿Administrador SaaS? Ingresar al Master Console</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

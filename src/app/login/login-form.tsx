'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, KeyRound, Store, ArrowRight, Loader2, Sparkles, User, Lock } from 'lucide-react'

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
        setError(result.error?.message || 'Credenciales no válidas')
        setLoading(false)
        return
      }

      // Redirección según rol y permisos
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
    <div className="min-h-screen bg-[#F3E9DC] text-[#5E3023] flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-[#C08552] selection:text-white">
      {/* Warm Ambient Coffee Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#C08552]/15 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-[#5E3023]/10 rounded-full blur-[110px]"></div>
      </div>

      <div className="relative w-full max-w-md bg-white/95 border border-[#E6D5C3] rounded-3xl p-7 sm:p-9 backdrop-blur-xl shadow-2xl shadow-[#5E3023]/15">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5E3023] to-[#7A3E2D] flex items-center justify-center shadow-lg shadow-[#5E3023]/25 mb-3.5 transform hover:scale-105 transition-transform duration-300">
            <Coffee className="w-8 h-8 text-[#F3E9DC]" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#C08552]/15 border border-[#C08552]/30 text-xs font-semibold text-[#C08552] mb-1.5">
            <span>Cafetería & Punto de Venta</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#5E3023]">
            PosCafé
          </h1>
          <p className="text-xs text-[#895737] mt-1 font-medium">
            Sistema artesanal de comandas, cobro e inventario
          </p>
        </div>

        {/* Mode Selector Tabs (Crema, Caramelo, Espresso) */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#F3E9DC]/70 p-1.5 rounded-2xl mb-6 border border-[#E6D5C3] text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('tenant')
              setError(null)
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
              mode === 'tenant'
                ? 'bg-[#5E3023] text-[#F3E9DC] shadow-md shadow-[#5E3023]/25 font-bold'
                : 'text-[#895737] hover:text-[#5E3023] hover:bg-white/60'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Administración</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('pin')
              setError(null)
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
              mode === 'pin'
                ? 'bg-[#C08552] text-white shadow-md shadow-[#C08552]/30 font-bold'
                : 'text-[#895737] hover:text-[#5E3023] hover:bg-white/60'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Terminal PIN</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Form: Modo Administración (Dueño / Gerente / Empleado con contraseña) */}
        {mode === 'tenant' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#5E3023] mb-1.5">
                Correo o Usuario
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="propietario@cafearoma.demo"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FDFBF9] border border-[#DECEBD] text-sm text-[#3D1E16] placeholder-[#A88C7D] focus:outline-none focus:border-[#C08552] focus:ring-2 focus:ring-[#C08552]/20 transition-all font-medium"
                />
                <User className="w-4 h-4 text-[#A88C7D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5E3023] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FDFBF9] border border-[#DECEBD] text-sm text-[#3D1E16] placeholder-[#A88C7D] focus:outline-none focus:border-[#C08552] focus:ring-2 focus:ring-[#C08552]/20 transition-all font-medium"
                />
                <Lock className="w-4 h-4 text-[#A88C7D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#5E3023] hover:bg-[#472218] text-[#F3E9DC] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#5E3023]/25 transition-all disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#F3E9DC]" /> : 'Ingresar a Cafetería'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Form: Terminal PIN (Cajeros y Meseros) */}
        {mode === 'pin' && (
          <div className="space-y-4">
            <div className="text-center">
              <label className="block text-xs font-bold text-[#5E3023] mb-2">
                Ingresa tu PIN de 4 dígitos
              </label>
              <div className="flex justify-center gap-3 my-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-lg font-bold transition-all ${
                      pin.length > idx
                        ? 'border-[#C08552] bg-[#C08552]/15 text-[#5E3023] shadow-md shadow-[#C08552]/20'
                        : 'border-[#DECEBD] bg-[#FDFBF9] text-[#A88C7D]'
                    }`}
                  >
                    {pin.length > idx ? '•' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Keypad táctil cálido */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleKeypadPress(val)}
                  className="py-3 rounded-xl bg-[#FDFBF9] hover:bg-[#F3E9DC] active:bg-[#E6D5C3] border border-[#DECEBD] text-sm font-bold text-[#5E3023] transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {val === 'DEL' ? '⌫' : val}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading || pin.length < 4}
              className="w-full py-3 px-4 rounded-xl bg-[#C08552] hover:bg-[#A96F3F] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C08552]/30 transition-all disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar a Terminal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Demo Fast Access Buttons */}
        <div className="mt-8 pt-5 border-t border-[#E6D5C3]/80">
          <p className="text-[11px] font-bold text-[#895737] flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C08552]" />
            Accesos rápidos de demostración:
          </p>

          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => fillDemo('owner')}
              className="px-2.5 py-2 rounded-xl bg-[#FDFBF9] hover:bg-[#F3E9DC] border border-[#DECEBD] hover:border-[#C08552] text-[#5E3023] text-left transition-all shadow-xs cursor-pointer"
            >
              👑 <strong className="text-[#5E3023]">Dueño</strong>
              <span className="block text-[10px] text-[#895737]">Rodrigo</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('cashier')}
              className="px-2.5 py-2 rounded-xl bg-[#FDFBF9] hover:bg-[#F3E9DC] border border-[#DECEBD] hover:border-[#C08552] text-[#5E3023] text-left transition-all shadow-xs cursor-pointer"
            >
              💳 <strong className="text-[#C08552]">Cajero</strong>
              <span className="block text-[10px] text-[#895737]">PIN 1234</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('waiter')}
              className="px-2.5 py-2 rounded-xl bg-[#FDFBF9] hover:bg-[#F3E9DC] border border-[#DECEBD] hover:border-[#C08552] text-[#5E3023] text-left transition-all shadow-xs cursor-pointer"
            >
              🍽️ <strong className="text-[#C08552]">Mesero</strong>
              <span className="block text-[10px] text-[#895737]">PIN 4321</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

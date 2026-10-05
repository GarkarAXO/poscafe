'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, KeyRound, Store, ArrowRight, Loader2, User, Lock, Eye, EyeOff, Laptop, Sparkles } from 'lucide-react'
import { getTerminalDeviceConfig, TerminalDeviceConfig } from '@/lib/terminal-device'

type LoginMode = 'tenant' | 'pin'

export default function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('tenant')
  const [deviceConfig, setDeviceConfig] = useState<TerminalDeviceConfig | null>(null)

  // Pantalla de Bienvenida
  const [welcomeUser, setWelcomeUser] = useState<{
    name: string
    gender: string
    roleName?: string
    targetUrl: string
  } | null>(null)

  // Form states
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detectar si este dispositivo físico está configurado como terminal de una sucursal
  useEffect(() => {
    const config = getTerminalDeviceConfig()
    if (config) {
      setDeviceConfig(config)
      setMode('pin')
    }
  }, [])

  useEffect(() => {
    if (welcomeUser) {
      const timer = setTimeout(() => {
        router.push(welcomeUser.targetUrl)
        router.refresh()
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [welcomeUser, router])

  // Soporte de teclado físico de escritorio en modo PIN (teclas 0-9, Backspace, Enter, Esc)
  useEffect(() => {
    if (mode !== 'pin') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) {
          const next = pin + e.key
          setPin(next)
          if (next.length === 4) {
            handleQuickSubmit(next)
          }
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1))
      } else if (e.key === 'Escape') {
        setPin('')
      } else if (e.key === 'Enter' && pin.length >= 4) {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, pin, deviceConfig])

  // PIN keypad helper (táctil para pantallas touch)
  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setPin('')
    } else if (val === 'DEL') {
      setPin((prev) => prev.slice(0, -1))
    } else {
      if (pin.length < 6) {
        const next = pin + val
        setPin(next)
        if (next.length === 4) {
          handleQuickSubmit(next)
        }
      }
    }
  }

  const handleQuickSubmit = async (pinValue: string) => {
    setError(null)
    setLoading(true)

    try {
      const payload: Record<string, any> = { pin: pinValue }
      if (deviceConfig?.branchId) {
        payload.branch_id = deviceConfig.branchId
      }

      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!result.success) {
        setError(result.error?.message || 'PIN no autorizado')
        setLoading(false)
        setPin('')
        return
      }

      const user = result.data?.user
      const userRoles = user?.roleCodes || []
      const targetUrl = userRoles.includes('WAITER') ? '/comandera' : '/pos'
      const roleName = userRoles.includes('WAITER') ? 'Comandera de Mesas' : 'Terminal POS'

      setLoading(false)
      setWelcomeUser({
        name: user?.name || 'Colaborador',
        gender: user?.gender || 'MALE',
        roleName,
        targetUrl,
      })
    } catch {
      setError('Error de conexión con el servidor')
      setLoading(false)
    }
  }

  // Submit Handler general
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
        payload = {
          pin,
          ...(deviceConfig?.branchId ? { branch_id: deviceConfig.branchId } : {}),
        }
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
      const user = result.data?.user
      const userRoles = user?.roleCodes || []
      const perms = user?.permissions || {}
      const isOwnerOrAdmin =
        userRoles.includes('ADMIN') ||
        userRoles.includes('BRANCH_MANAGER') ||
        userRoles.includes('SUPERADMIN')
      const hasManagementPermission =
        perms.canManageSettings ||
        perms.canManageUsers ||
        perms.canManageCatalog ||
        perms.canViewReports ||
        perms.canManageInventory

      let targetUrl = '/dashboard'
      let roleName = 'Panel de Administración'

      if (mode === 'pin') {
        if (userRoles.includes('WAITER')) {
          targetUrl = '/comandera'
          roleName = 'Comandera de Mesas'
        } else {
          targetUrl = '/pos'
          roleName = 'Terminal POS'
        }
      } else {
        if (!isOwnerOrAdmin && !hasManagementPermission) {
          if (userRoles.includes('WAITER')) {
            targetUrl = '/comandera'
            roleName = 'Comandera de Mesas'
          } else if (perms.canAccessPOS || userRoles.includes('CASHIER')) {
            targetUrl = '/pos'
            roleName = 'Terminal POS'
          }
        }
      }

      setLoading(false)
      setWelcomeUser({
        name: user?.name || 'Colaborador',
        gender: user?.gender || 'MALE',
        roleName,
        targetUrl,
      })
    } catch {
      setError('Error de conexión con el servidor')
      setLoading(false)
    }
  }

  // Pantalla de Bienvenida Intermedia al Iniciar Sesión
  if (welcomeUser) {
    const isFemale = welcomeUser.gender === 'FEMALE'
    return (
      <div className="min-h-screen bg-[#14100E] flex items-center justify-center p-4 relative overflow-hidden select-none">
        {/* Glows de ambientación */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C08552]/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-[#5E3023]/25 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#251E1B]/95 border border-[#3E2723] rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl relative z-10 animate-in zoom-in-95 fade-in duration-300">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#5E3023] to-[#C08552] text-white flex items-center justify-center mx-auto shadow-xl shadow-[#C08552]/30 animate-bounce duration-1000">
            <Coffee className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#C08552]/20 border border-[#C08552]/40 text-[#DECEBD]">
              <Sparkles className="w-3.5 h-3.5 text-[#C08552]" />
              <span>{welcomeUser.roleName || 'Sesión Iniciada'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isFemale ? '¡Bienvenida,' : '¡Bienvenido,'} {welcomeUser.name}!
            </h1>

            <p className="text-xs sm:text-sm text-[#A88C7D] font-medium leading-relaxed">
              Preparando tu espacio de trabajo y sincronizando órdenes...
            </p>
          </div>

          <div className="pt-2 flex flex-col items-center gap-3">
            <div className="w-full max-w-xs bg-black/40 h-2 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div className="bg-[#C08552] h-full rounded-full animate-pulse w-full" />
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#DECEBD]">
              <Loader2 className="w-4 h-4 animate-spin text-[#C08552]" />
              <span>Accediendo...</span>
            </div>
          </div>
        </div>
      </div>
    )
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
        <div className="flex flex-col items-center text-center mb-6">
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

        {/* Banner de Dispositivo Fijo Vinculado */}
        {deviceConfig && (
          <div className="mb-5 p-3 rounded-2xl bg-[#C08552]/10 border border-[#C08552]/30 flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#C08552] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#5E3023]">
                  {deviceConfig.terminalName || 'Terminal de Cobro'}
                </p>
                <p className="text-[11px] text-[#895737]">
                  Sucursal fija: <strong className="text-[#5E3023]">{deviceConfig.branchName}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/pos')}
              className="px-3 py-1.5 rounded-xl bg-[#5E3023] hover:bg-[#472218] text-[#F3E9DC] text-[11px] font-bold shrink-0 transition-all cursor-pointer shadow-xs"
            >
              Abrir POS
            </button>
          </div>
        )}

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

        {/* Form: Modo Administración (Dueño / Gerente con contraseña) */}
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
                  placeholder="usuario@cafeteria.com"
                  required
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#FDFBF9] border border-[#DECEBD] text-sm text-[#3D1E16] placeholder-[#A88C7D] focus:outline-none focus:border-[#C08552] focus:ring-2 focus:ring-[#C08552]/20 transition-all font-medium"
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#FDFBF9] border border-[#DECEBD] text-sm text-[#3D1E16] placeholder-[#A88C7D] focus:outline-none focus:border-[#C08552] focus:ring-2 focus:ring-[#C08552]/20 transition-all font-medium"
                />
                <Lock className="w-4 h-4 text-[#A88C7D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A88C7D] hover:text-[#5E3023] p-1.5 transition-colors cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#5E3023] hover:bg-[#472218] text-[#F3E9DC] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#5E3023]/25 transition-all disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#F3E9DC]" /> : 'Ingresar a Cafetería'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Form: Terminal PIN (Cajeros y Meseros con pantalla Touch o Teclado Escritorio) */}
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
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl font-bold transition-all ${
                      pin.length > idx
                        ? 'border-[#C08552] bg-[#C08552]/15 text-[#5E3023] shadow-md shadow-[#C08552]/20'
                        : 'border-[#DECEBD] bg-[#FDFBF9] text-[#A88C7D]'
                    }`}
                  >
                    {pin.length > idx ? '•' : ''}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#895737] font-medium">
                {deviceConfig
                  ? `Vinculado a: ${deviceConfig.branchName}`
                  : 'Puedes usar la pantalla táctil o el teclado físico'}
              </p>
            </div>

            {/* Keypad táctil optimizado para Touch (botones amplios h-14) */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleKeypadPress(val)}
                  className="h-14 rounded-2xl bg-[#FDFBF9] hover:bg-[#F3E9DC] active:bg-[#E6D5C3] border border-[#DECEBD] text-lg font-bold text-[#5E3023] transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center select-none"
                >
                  {val === 'DEL' ? '⌫' : val}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading || pin.length < 4}
              className="w-full py-3.5 px-4 rounded-xl bg-[#C08552] hover:bg-[#A96F3F] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C08552]/30 transition-all disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar a Terminal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

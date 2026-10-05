'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  MonitorPlay,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Coffee,
  UtensilsCrossed,
  ArrowLeft,
  Loader2,
  History,
  Sparkles,
  Flame,
  CheckCheck,
  ShieldAlert,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { isLightColor, getStatusBadgeStyles } from '@/lib/theme-utils'

interface KdsItem {
  id: string
  productName: string
  variantName: string
  categoryName: string
  quantity: number
  notes: string | null
  modifiers?: string[]
  kitchenStatus: 'PENDING' | 'COOKING' | 'READY' | 'SERVED'
  createdAt: string
}

interface KdsOrder {
  id: string
  orderNumber: string
  customerName: string | null
  orderType: string
  status: string
  notes: string | null
  openedAt: string
  elapsedMinutes: number
  table: { id: string; name: string; areaName: string } | null
  waiter: { id: string; name: string } | null
  items: KdsItem[]
}

export default function KdsPage() {
  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [view, setView] = useState<'active' | 'history'>('active')
  const [stationFilter, setStationFilter] = useState<'ALL' | 'BAR' | 'KITCHEN'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [branchesCount, setBranchesCount] = useState(1)
  const [activeBranch, setActiveBranch] = useState<{
    id?: string
    name?: string
    logoUrl?: string | null
    isotypeUrl?: string | null
    bgColor?: string | null
    primaryColor?: string | null
    secondaryColor?: string | null
    buttonColor?: string | null
  } | null>(null)

  const prevOrderCountRef = useRef<number>(0)

  // Validar permisos y cargar datos de sucursal para temas
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.user) {
          const u = res.data.user
          if (u.activeBranch) {
            setActiveBranch(u.activeBranch)
          }
          if (u.branches) {
            setBranchesCount(u.branches.length)
          }

          const isStrictWaiter =
            u.roleCodes?.includes('WAITER') &&
            !u.roleCodes?.includes('ADMIN') &&
            !u.roleCodes?.includes('SUPERADMIN') &&
            !u.roleCodes?.includes('BRANCH_MANAGER') &&
            !u.roleCodes?.includes('CHEF') &&
            !u.roleCodes?.includes('KITCHEN') &&
            !u.permissions?.canManageInventory

          if (isStrictWaiter) {
            setAccessDenied(true)
            notify.warning('Acceso de Cocina', 'Los meseros operan desde la Comandera de Mesas.')
            setTimeout(() => {
              window.location.href = '/comandera'
            }, 2200)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Sincronización en caliente del tema y colores
  useEffect(() => {
    const handleThemeUpdate = (e: any) => {
      const detail = e.detail
      if (!detail) return
      if (!detail.branchId || detail.branchId === activeBranch?.id) {
        setActiveBranch((prev: any) => (prev ? { ...prev, ...detail } : prev))
      }
    }
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'poscafe_theme_event' && e.newValue) {
        try {
          const detail = JSON.parse(e.newValue)
          if (!detail.branchId || detail.branchId === activeBranch?.id) {
            setActiveBranch((prev: any) => (prev ? { ...prev, ...detail } : prev))
          }
        } catch {}
      }
    }
    window.addEventListener('poscafe:theme-updated', handleThemeUpdate)
    window.addEventListener('storage', handleStorageUpdate)
    return () => {
      window.removeEventListener('poscafe:theme-updated', handleThemeUpdate)
      window.removeEventListener('storage', handleStorageUpdate)
    }
  }, [activeBranch?.id])

  // Sintetizador de audio para alerta de nueva comanda (Web Audio API nativo)
  const playNewOrderBeep = () => {
    if (!soundEnabled) return
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      const ctx = new AudioContextClass()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.35)
    } catch {
      // Ignorar restricciones de audio del navegador
    }
  }

  // Cargar órdenes KDS
  const fetchKdsOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch(`/api/kds/orders?view=${view}`).then((r) => r.json())

      if (res.success) {
        setOrders(res.data)
        // Detectar si entraron nuevas órdenes para sonar alerta
        if (
          view === 'active' &&
          prevOrderCountRef.current > 0 &&
          res.data.length > prevOrderCountRef.current
        ) {
          playNewOrderBeep()
        }
        prevOrderCountRef.current = res.data.length
      } else {
        setError(res.error?.message || 'Error al obtener comandas de cocina')
      }
    } catch {
      setError('Error de comunicación con el servidor')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Reloj en tiempo real y montaje en cliente
  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Polling automático cada 4 segundos y sincronización instantánea al enfocar pestaña
  useEffect(() => {
    fetchKdsOrders()
    const interval = setInterval(() => fetchKdsOrders(true), 4000)

    const handleFocus = () => fetchKdsOrders(true)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchKdsOrders(true)
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [view])

  // Cambiar estado individual de un platillo
  const handleToggleItemStatus = async (itemId: string, currentStatus: string) => {
    let nextStatus = 'COOKING'
    if (currentStatus === 'PENDING') nextStatus = 'COOKING'
    else if (currentStatus === 'COOKING') nextStatus = 'READY'
    else if (currentStatus === 'READY') nextStatus = 'SERVED'

    try {
      // Optimistic update local
      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: order.items.map((it) =>
            it.id === itemId ? { ...it, kitchenStatus: nextStatus as any } : it
          ),
        }))
      )

      await fetch(`/api/kds/items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
    } catch {
      fetchKdsOrders(true)
    }
  }

  // Bump de orden completa (Marcar todo Listo / Despachar)
  const handleBumpOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/kds/orders/${orderId}/bump`, {
        method: 'POST',
      }).then((r) => r.json())

      if (res.success) {
        fetchKdsOrders(true)
      }
    } catch {
      fetchKdsOrders(true)
    }
  }

  // Alternar pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Filtrado de ítems según estación de trabajo
  const filterOrderItems = (items: KdsItem[]) => {
    if (stationFilter === 'ALL') return items
    if (stationFilter === 'BAR') {
      return items.filter((it) => {
        const cat = it.categoryName.toLowerCase()
        const prod = it.productName.toLowerCase()
        return (
          cat.includes('café') ||
          cat.includes('bebida') ||
          prod.includes('café') ||
          prod.includes('latte') ||
          prod.includes('té')
        )
      })
    }
    if (stationFilter === 'KITCHEN') {
      return items.filter((it) => {
        const cat = it.categoryName.toLowerCase()
        const prod = it.productName.toLowerCase()
        return !(
          cat.includes('café') ||
          cat.includes('bebida') ||
          prod.includes('café') ||
          prod.includes('latte') ||
          prod.includes('té')
        )
      })
    }
    return items
  }

  // Conteo de métricas en pantalla
  const totalActiveItems = orders.flatMap((o) => o.items).length
  const totalReadyItems = orders
    .flatMap((o) => o.items)
    .filter((it) => it.kitchenStatus === 'READY').length
  const totalPendingItems = totalActiveItems - totalReadyItems

  if (accessDenied) {
    return (
      <div className="h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Vista Exclusiva de Cocina y Barra</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Los meseros toman pedidos y marchan comandas desde la Comandera de Piso. Esta pantalla está reservada para el personal de producción.
        </p>
        <Link
          href="/comandera"
          className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Ir a Comandera de Mesas</span>
        </Link>
      </div>
    )
  }

  const themeBg = activeBranch?.bgColor || '#0D0B0A'
  const themePrimary = activeBranch?.primaryColor || '#C08552'
  const themeSecondary = activeBranch?.secondaryColor || '#5E3023'
  const themeButton = activeBranch?.buttonColor || '#C08552'
  const isLight = isLightColor(themeBg)
  const isLightButton = isLightColor(themeButton)
  const logoUrl = activeBranch?.logoUrl
  const isotypeUrl = activeBranch?.isotypeUrl

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden font-sans relative selection:bg-[#C08552] selection:text-white ${
        isLight ? 'text-[#2B1712]' : 'text-slate-100'
      }`}
      style={{ backgroundColor: themeBg }}
    >
      {/* Resplandores cálidos de ambiente con colores de la BD */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{ backgroundColor: themePrimary, opacity: isLight ? 0.08 : 0.12 }}
        />
        <div
          className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full blur-[130px]"
          style={{ backgroundColor: themeSecondary, opacity: isLight ? 0.06 : 0.1 }}
        />
      </div>

      {/* Top Header KDS */}
      <header
        className="border-b px-4 py-2.5 flex items-center justify-between shrink-0 z-20 backdrop-blur-md shadow-sm"
        style={{
          backgroundColor: isLight ? '#FFFFFFE6' : `${themeBg}F2`,
          borderColor: isLight ? '#DECEBD' : `${themeSecondary}60`,
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1 cursor-pointer"
            style={
              isLight
                ? {
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DECEBD',
                    color: '#5E3023',
                  }
                : {
                    backgroundColor: `${themeSecondary}40`,
                    borderColor: `${themeSecondary}70`,
                    color: '#DECEBD',
                  }
            }
            title="Volver al Dashboard"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: themePrimary }} />
          </Link>

          {/* Isologo / Isotipo de la Sucursal (libre y sin encerrar) */}
          {isotypeUrl || logoUrl ? (
            <img
              src={isotypeUrl || logoUrl || ''}
              alt={activeBranch?.name || 'Isologo'}
              className="h-8 sm:h-9 w-auto max-w-[44px] object-contain drop-shadow-md select-none transition-transform hover:scale-105"
              onError={(e) => {
                ;(e.target as any).style.display = 'none'
              }}
            />
          ) : (
            <MonitorPlay className="w-6 h-6 shrink-0" style={{ color: themePrimary }} />
          )}

          <div>
            <h1 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              <span>KDS • Pantalla de Cocina y Barra</span>
              {branchesCount > 1 && activeBranch?.name && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold border hidden sm:inline-block"
                  style={{
                    backgroundColor: `${themePrimary}${isLight ? '15' : '20'}`,
                    borderColor: `${themePrimary}${isLight ? '35' : '40'}`,
                    color: isLight ? '#5E3023' : themePrimary,
                  }}
                >
                  {activeBranch.name}
                </span>
              )}
            </h1>
            <p suppressHydrationWarning className={`text-[11px] font-mono ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
              {mounted
                ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '--:--:--'}
            </p>
          </div>
        </div>

        {/* Station Filter Pills */}
        <div
          className="hidden md:flex items-center p-1 rounded-xl border text-xs"
          style={
            isLight
              ? { backgroundColor: '#F3E9DC', borderColor: '#DECEBD' }
              : {
                  backgroundColor: `${themeSecondary}30`,
                  borderColor: `${themeSecondary}60`,
                }
          }
        >
          <button
            type="button"
            onClick={() => setStationFilter('ALL')}
            className="px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer"
            style={
              stationFilter === 'ALL'
                ? { backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF', boxShadow: `0 2px 8px ${themeButton}40` }
                : { color: isLight ? '#5E3023' : '#DECEBD' }
            }
          >
            Todo el Menú
          </button>
          <button
            type="button"
            onClick={() => setStationFilter('BAR')}
            className="px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer"
            style={
              stationFilter === 'BAR'
                ? { backgroundColor: '#C08552', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(192, 133, 82, 0.4)' }
                : { color: isLight ? '#5E3023' : '#DECEBD' }
            }
          >
            ☕ Barra / Bebidas
          </button>
          <button
            type="button"
            onClick={() => setStationFilter('KITCHEN')}
            className="px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer"
            style={
              stationFilter === 'KITCHEN'
                ? { backgroundColor: '#E06A3B', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(224, 106, 59, 0.4)' }
                : { color: isLight ? '#5E3023' : '#DECEBD' }
            }
          >
            🍳 Cocina / Alimentos
          </button>
        </div>

        {/* Status Counters & Tools */}
        <div className="flex items-center gap-2.5">
          {view === 'active' && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span
                className={`px-2.5 py-1 rounded-lg font-mono border ${
                  isLight
                    ? 'bg-white border-[#DECEBD] text-[#5E3023]'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {orders.length} comandas
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg font-mono font-bold border ${
                  isLight
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                {totalReadyItems} listos
              </span>
            </div>
          )}

          {/* Toggle Activo vs Historial */}
          <div
            className={`flex p-1 rounded-xl border text-xs ${
              isLight
                ? 'bg-[#F3E9DC] border-[#DECEBD]'
                : 'bg-slate-950 border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setView('active')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                view === 'active'
                  ? isLight
                    ? 'bg-white text-[#2B1712] shadow-xs'
                    : 'bg-slate-800 text-white font-bold'
                  : isLight
                  ? 'text-[#895737] hover:text-[#5E3023]'
                  : 'text-slate-400'
              }`}
            >
              En Curso
            </button>
            <button
              type="button"
              onClick={() => setView('history')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                view === 'history'
                  ? isLight
                    ? 'bg-white text-[#2B1712] shadow-xs'
                    : 'bg-slate-800 text-white font-bold'
                  : isLight
                  ? 'text-[#895737] hover:text-[#5E3023]'
                  : 'text-slate-400'
              }`}
            >
              Historial
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
              soundEnabled
                ? isLight
                  ? 'bg-white border-[#DECEBD] text-[#5E3023]'
                  : 'bg-slate-800 border-slate-700 text-slate-200'
                : isLight
                ? 'bg-[#E6D5C3]/50 border-[#DECEBD] text-[#A88C7D]'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Silenciar alertas' : 'Activar sonido de nuevas comandas'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" style={{ color: themePrimary }} />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-[#F3E9DC] border-[#DECEBD] text-[#5E3023]'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Ir a Comandera */}
          <Link
            href="/comandera"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hidden lg:flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] border-[#DECEBD] text-[#5E3023]'
                : 'bg-violet-600/20 hover:bg-violet-600/30 border-violet-500/30 text-violet-300'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Comandera</span>
          </Link>
        </div>
      </header>

      {/* Main KDS Grid Canvas */}
      <main className="flex-1 p-4 overflow-x-auto overflow-y-hidden">
        {loading && orders.length === 0 ? (
          <div
            className={`h-full flex flex-col items-center justify-center gap-3 ${
              isLight ? 'text-[#7A5A43]' : 'text-slate-400'
            }`}
          >
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: themePrimary }} />
            <p className="text-xs">Sincronizando monitor de comandas...</p>
          </div>
        ) : orders.length === 0 ? (
          <div
            className={`h-full flex flex-col items-center justify-center gap-3 ${
              isLight ? 'text-[#895737]' : 'text-slate-500'
            }`}
          >
            <CheckCircle
              className={`w-12 h-12 stroke-[1.5] ${isLight ? 'text-[#DECEBD]' : 'text-slate-700'}`}
            />
            <div className="text-center">
              <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-slate-300'}`}>
                ¡Cocina al Día!
              </h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-[#895737]' : 'text-slate-500'}`}>
                {view === 'active'
                  ? 'No hay comandas pendientes de preparación en este momento.'
                  : 'No hay órdenes despachadas en el historial reciente.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex gap-4 overflow-x-auto pb-2 items-start">
            {orders.map((order) => {
              const visibleItems = filterOrderItems(order.items)
              if (visibleItems.length === 0 && stationFilter !== 'ALL') return null

              const elapsed = order.elapsedMinutes
              const isUrgent = elapsed >= 12
              const isWarning = elapsed >= 6 && elapsed < 12

              const allReady = visibleItems.every(
                (it) => it.kitchenStatus === 'READY' || it.kitchenStatus === 'SERVED'
              )

              const cardBg = isUrgent
                ? isLight
                  ? '#FEF2F2'
                  : '#2a0a0b'
                : isWarning
                ? isLight
                  ? '#FFFBEB'
                  : '#261609'
                : isLight
                ? '#FFFFFF'
                : `${themeSecondary}25`

              const cardBorder = isUrgent
                ? '#EF4444'
                : isWarning
                ? '#F59E0B'
                : isLight
                ? '#DECEBD'
                : `${themeSecondary}60`

              const headerBg = isUrgent
                ? isLight
                  ? '#FEE2E2'
                  : '#ef444425'
                : isWarning
                ? isLight
                  ? '#FEF3C7'
                  : '#f59e0b20'
                : isLight
                ? '#F8F4EE'
                : `${themeSecondary}40`

              const headerBorder = isUrgent
                ? isLight
                  ? '#FCA5A5'
                  : '#ef444440'
                : isWarning
                ? isLight
                  ? '#FCD34D'
                  : '#f59e0b40'
                : isLight
                ? '#DECEBD'
                : `${themeSecondary}70`

              return (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                  }}
                  className={`w-80 shrink-0 h-full max-h-[85vh] flex flex-col rounded-3xl border shadow-xl overflow-hidden transition-all ${
                    isUrgent
                      ? 'shadow-red-500/15 animate-pulse'
                      : isWarning
                      ? 'shadow-amber-500/15'
                      : ''
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className="p-3.5 border-b shrink-0 flex items-start justify-between"
                    style={{
                      backgroundColor: headerBg,
                      borderColor: headerBorder,
                    }}
                  >
                    <div>
                      {/* Mesa o Para Llevar */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-base font-black block tracking-tight ${
                            isLight ? 'text-[#2B1712]' : 'text-white'
                          }`}
                        >
                          {order.table ? order.table.name.toUpperCase() : '🛍️ PARA LLEVAR'}
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                          style={{
                            backgroundColor: `${themePrimary}${isLight ? '15' : '20'}`,
                            borderColor: `${themePrimary}${isLight ? '35' : '50'}`,
                            color: isLight ? '#5E3023' : themePrimary,
                          }}
                        >
                          {visibleItems.length} {visibleItems.length === 1 ? 'artículo' : 'artículos'}
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 text-[11px] mt-0.5 ${
                          isLight ? 'text-[#7A5A43]' : 'text-slate-300'
                        }`}
                      >
                        <span className={`font-mono font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                          {order.orderNumber}
                        </span>
                        {order.waiter && <span>• Atiende: {order.waiter.name}</span>}
                      </div>
                      {order.customerName && (
                        <span
                          className={`text-[10px] font-bold block mt-0.5 ${
                            isLight ? 'text-amber-900' : 'text-amber-200'
                          }`}
                        >
                          👤 Cliente: {order.customerName}
                        </span>
                      )}
                    </div>

                    {/* Timer Badge */}
                    <div
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1 shrink-0 ${
                        isUrgent
                          ? 'bg-red-600 text-white'
                          : isWarning
                          ? isLight
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : 'bg-amber-500 text-slate-950'
                          : isLight
                          ? 'bg-[#F3E9DC] text-[#5E3023] border border-[#DECEBD]'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsed}m</span>
                    </div>
                  </div>

                  {/* Notas de la orden si existen */}
                  {order.notes && (
                    <div
                      className={`px-3.5 py-1.5 border-b text-[10px] shrink-0 font-medium italic ${
                        isLight
                          ? 'bg-amber-50 border-amber-200 text-amber-950'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      }`}
                    >
                      Nota comanda: {order.notes}
                    </div>
                  )}

                  {/* Lista de Platillos (Scrollable) */}
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                    {visibleItems.map((item) => {
                      const isReady = item.kitchenStatus === 'READY'
                      const isCooking = item.kitchenStatus === 'COOKING'
                      const isServed = item.kitchenStatus === 'SERVED'

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItemStatus(item.id, item.kitchenStatus)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer active:scale-98 select-none ${
                            isReady
                              ? isLight
                                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
                                : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                              : isCooking
                              ? isLight
                                ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
                                : 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                              : isServed
                              ? isLight
                                ? 'bg-black/5 border-black/5 opacity-50 line-through text-slate-500'
                                : 'bg-black/30 border-white/5 opacity-50 line-through text-slate-400'
                              : isLight
                              ? 'bg-[#FDFBF9] hover:bg-[#F3E9DC]/40 border-[#E6D5C3] hover:border-[#C08552] text-[#2B1712]'
                              : 'hover:border-white/20'
                          }`}
                          style={
                            !isReady && !isCooking && !isServed && !isLight
                              ? {
                                  backgroundColor: `${themeBg}B0`,
                                  borderColor: `${themeSecondary}50`,
                                }
                              : {}
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span
                                className={`text-sm font-bold block ${
                                  isLight ? 'text-[#2B1712]' : 'text-white'
                                }`}
                              >
                                <span
                                  className="font-mono text-base mr-1.5 font-black"
                                  style={{ color: themePrimary }}
                                >
                                  {item.quantity}x
                                </span>
                                {item.productName}
                              </span>
                              <span
                                className={`text-[10px] block ${
                                  isLight ? 'text-[#7A5A43]' : 'text-slate-400'
                                }`}
                              >
                                {item.variantName}
                              </span>

                              {/* Modificadores / Extras / Sabores seleccionados */}
                              {item.modifiers && item.modifiers.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {item.modifiers.map((modName, idx) => (
                                    <span
                                      key={idx}
                                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${
                                        isLight
                                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                                          : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                      }`}
                                    >
                                      + {modName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Badge de Estado del Platillo */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                                isReady
                                  ? isLight
                                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                    : 'bg-emerald-500 text-slate-950 border-transparent'
                                  : isCooking
                                  ? isLight
                                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                                    : 'bg-amber-500 text-slate-950 border-transparent'
                                  : isServed
                                  ? isLight
                                    ? 'bg-slate-200 text-slate-700 border-slate-300'
                                    : 'bg-slate-800 text-slate-400 border-transparent'
                                  : isLight
                                  ? 'bg-[#EDE0D4] text-[#5E3023] border-[#DECEBD]'
                                  : 'bg-slate-800 text-slate-400 border-transparent'
                              }`}
                            >
                              {isReady ? '✓ LISTO' : isCooking ? '🍳 MARCHANDO' : '⏳ PENDIENTE'}
                            </span>
                          </div>

                          {/* Notas de preparación y Alertas de Alergias destacadas */}
                          {item.notes && (
                            <div
                              className={`mt-2 p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border ${
                                item.notes.toUpperCase().includes('ALERGIA') || item.notes.toUpperCase().includes('ALÉRGICO')
                                  ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse font-black'
                                  : isLight
                                  ? 'bg-amber-100 border-amber-300 text-amber-950'
                                  : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                              }`}
                            >
                              <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${
                                item.notes.toUpperCase().includes('ALERGIA') ? 'text-red-400' : 'text-amber-500'
                              }`} />
                              <span>{item.notes}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Ticket Bottom Bump Action */}
                  <div
                    className={`p-3 border-t shrink-0 ${
                      isLight ? 'border-[#DECEBD] bg-[#FAF6F0]' : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleBumpOrder(order.id)}
                      style={
                        !allReady
                          ? { backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' }
                          : undefined
                      }
                      className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                        allReady
                          ? isLight
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/25'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                          : 'hover:opacity-90'
                      }`}
                    >
                      {allReady ? (
                        <>
                          <CheckCheck className="w-4 h-4" />
                          <span>✓ Despachar / Servir Comanda</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>⚡ Marcar Todo como LISTO</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

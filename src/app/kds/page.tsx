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

interface KdsItem {
  id: string
  productName: string
  variantName: string
  categoryName: string
  quantity: number
  notes: string | null
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
  const [accessDenied, setAccessDenied] = useState(false)

  const prevOrderCountRef = useRef<number>(0)

  // Validar permisos: Meseros no tienen acceso a KDS
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.user) {
          const u = res.data.user
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

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Polling automático cada 4 segundos
  useEffect(() => {
    fetchKdsOrders()
    const interval = setInterval(() => fetchKdsOrders(true), 4000)
    return () => clearInterval(interval)
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

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Top Header KDS */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs flex items-center gap-1"
            title="Volver al Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            <MonitorPlay className="w-5 h-5" />
          </div>

          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              KDS • Pantalla de Cocina y Barra
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold animate-pulse">
                EN VIVO
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Station Filter Pills */}
        <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setStationFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              stationFilter === 'ALL'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todo el Menú
          </button>
          <button
            type="button"
            onClick={() => setStationFilter('BAR')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              stationFilter === 'BAR'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ☕ Barra / Bebidas
          </button>
          <button
            type="button"
            onClick={() => setStationFilter('KITCHEN')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              stationFilter === 'KITCHEN'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🍳 Cocina / Alimentos
          </button>
        </div>

        {/* Status Counters & Tools */}
        <div className="flex items-center gap-2.5">
          {view === 'active' && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono">
                {orders.length} comandas
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                {totalReadyItems} listos
              </span>
            </div>
          )}

          {/* Toggle Activo vs Historial */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setView('active')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                view === 'active' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
              }`}
            >
              En Curso
            </button>
            <button
              type="button"
              onClick={() => setView('history')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                view === 'history' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
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
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Silenciar alertas' : 'Activar sonido de nuevas comandas'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all cursor-pointer"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Ir a Comandera */}
          <Link
            href="/comandera"
            className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-xs text-violet-300 font-semibold transition-all hidden lg:flex items-center gap-1.5"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Comandera</span>
          </Link>
        </div>
      </header>

      {/* Main KDS Grid Canvas */}
      <main className="flex-1 p-4 overflow-x-auto overflow-y-hidden">
        {loading && orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-xs">Sincronizando monitor de comandas...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
            <CheckCircle className="w-12 h-12 text-slate-700 stroke-[1.5]" />
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-300">¡Cocina al Día!</h3>
              <p className="text-xs text-slate-500 mt-1">
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

              const allReady = visibleItems.every((it) => it.kitchenStatus === 'READY' || it.kitchenStatus === 'SERVED')

              return (
                <div
                  key={order.id}
                  className={`w-80 shrink-0 h-full max-h-[85vh] flex flex-col rounded-3xl border bg-slate-900 shadow-xl overflow-hidden transition-all ${
                    isUrgent
                      ? 'border-red-500/80 shadow-red-500/10 animate-pulse'
                      : isWarning
                      ? 'border-amber-500/60'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`p-3.5 border-b shrink-0 flex items-start justify-between ${
                      isUrgent
                        ? 'bg-red-500/20 border-red-500/30'
                        : isWarning
                        ? 'bg-amber-500/15 border-amber-500/30'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Mesa o Para Llevar */}
                      <span className="text-base font-black text-white block tracking-tight">
                        {order.table ? order.table.name.toUpperCase() : '🛍️ PARA LLEVAR'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono text-slate-300 font-bold">
                          {order.orderNumber}
                        </span>
                        {order.waiter && (
                          <span>• {order.waiter.name}</span>
                        )}
                      </div>
                      {order.customerName && (
                        <span className="text-[10px] text-amber-300 font-medium block">
                          Cliente: {order.customerName}
                        </span>
                      )}
                    </div>

                    {/* Timer Badge */}
                    <div
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1 shrink-0 ${
                        isUrgent
                          ? 'bg-red-500 text-white'
                          : isWarning
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsed}m</span>
                    </div>
                  </div>

                  {/* Notas de la orden si existen */}
                  {order.notes && (
                    <div className="px-3.5 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[10px] text-amber-300 italic shrink-0">
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
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                              : isCooking
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                              : isServed
                              ? 'bg-slate-950/40 border-slate-850 opacity-50 line-through'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-sm font-bold text-white block">
                                <span className="text-amber-400 font-mono text-base mr-1.5">
                                  {item.quantity}x
                                </span>
                                {item.productName}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {item.variantName}
                              </span>
                            </div>

                            {/* Badge de Estado del Platillo */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isReady
                                  ? 'bg-emerald-500 text-slate-950'
                                  : isCooking
                                  ? 'bg-amber-500 text-slate-950'
                                  : isServed
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {isReady ? '✓ LISTO' : isCooking ? '🍳 MARCHANDO' : '⏳ PENDIENTE'}
                            </span>
                          </div>

                          {/* Notas de preparación destacadas */}
                          {item.notes && (
                            <div className="mt-2 p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                              <span>{item.notes}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Ticket Bottom Bump Action */}
                  <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleBumpOrder(order.id)}
                      className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                        allReady
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
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

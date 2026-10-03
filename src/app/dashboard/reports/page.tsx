'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  ArrowLeft,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  Store,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react'

interface SalesMetrics {
  totalSales: number
  ordersCount: number
  avgTicket: number
  paymentMethodsSummary: Record<string, number>
}

interface TopProduct {
  name: string
  quantity: number
  total: number
}

interface CashCut {
  id: string
  branchName: string
  registerName: string
  cashierName: string
  status: string
  openedAt: string
  closedAt: string | null
  openingBalance: number
  expectedBalance: number | null
  closingBalance: number | null
  difference: number | null
  notes: string | null
}

interface RecentOrder {
  id: string
  orderNumber: string
  branchName: string
  tableName: string
  orderType: string
  total: number
  waiterName: string
  createdAt: string
}

export default function ReportsPage() {
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedRange, setSelectedRange] = useState<string>('today')

  const [metrics, setMetrics] = useState<SalesMetrics | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [cashCuts, setCashCuts] = useState<CashCut[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches').then((r) => r.json())
      if (res.success) {
        setBranches(res.data.branches)
      }
    } catch {
      // Ignorar
    }
  }

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (selectedBranch) params.set('branchId', selectedBranch)
      if (selectedRange) params.set('range', selectedRange)

      const res = await fetch(`/api/reports/sales?${params.toString()}`).then((r) => r.json())

      if (res.success) {
        setMetrics(res.data.metrics)
        setTopProducts(res.data.topProducts)
        setCashCuts(res.data.cashCuts)
        setRecentOrders(res.data.recentOrders)
      } else {
        setError(res.error?.message || 'Error al obtener reportes')
      }
    } catch {
      setError('Error de comunicación con el servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    fetchReports()
  }, [selectedBranch, selectedRange])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="h-5 w-px bg-slate-800"></div>
          <div>
            <h1 className="font-bold text-base text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Reporte de Ventas y Arqueos de Caja
            </h1>
            <p className="text-xs text-slate-400">Auditoría en tiempo real, cortes Z y métodos de cobro</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2">
          {/* Branch filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Date range filter */}
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="today">Ventas de Hoy</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="all">Todo el Histórico</option>
          </select>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full p-6 sm:p-8 space-y-6 transition-all duration-300">
        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs">Consolidando métricas y arqueos...</p>
          </div>
        )}

        {!loading && metrics && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Ventas Totales</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  ${metrics.totalSales.toFixed(2)} MXN
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Ingresos netos en el período</p>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Órdenes Pagadas</span>
                  <ShoppingCart className="w-4 h-4 text-violet-400" />
                </div>
                <p className="text-2xl font-bold text-white">{metrics.ordersCount}</p>
                <p className="text-[11px] text-slate-500 mt-1">Transacciones procesadas</p>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Ticket Promedio</span>
                  <Receipt className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  ${metrics.avgTicket.toFixed(2)} MXN
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Gasto medio por cliente</p>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Cortes de Caja Registrados</span>
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-2xl font-bold text-white">{cashCuts.length}</p>
                <p className="text-[11px] text-slate-500 mt-1">Sesiones de arqueo</p>
              </div>
            </div>

            {/* Split Row: Payment Methods & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-violet-400" /> Ventas por Método de Pago
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 font-medium">Efectivo</span>
                    </div>
                    <strong className="text-white text-sm">
                      ${(metrics.paymentMethodsSummary.CASH || 0).toFixed(2)} MXN
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-300 font-medium">Tarjeta de Débito</span>
                    </div>
                    <strong className="text-white text-sm">
                      ${(metrics.paymentMethodsSummary.CARD_DEBIT || 0).toFixed(2)} MXN
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-violet-400" />
                      <span className="text-slate-300 font-medium">Tarjeta de Crédito</span>
                    </div>
                    <strong className="text-white text-sm">
                      ${(metrics.paymentMethodsSummary.CARD_CREDIT || 0).toFixed(2)} MXN
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span className="text-slate-300 font-medium">Transferencia / QR</span>
                    </div>
                    <strong className="text-white text-sm">
                      ${((metrics.paymentMethodsSummary.TRANSFER || 0) + (metrics.paymentMethodsSummary.QR || 0)).toFixed(2)} MXN
                    </strong>
                  </div>
                </div>
              </div>

              {/* Top Selling Products */}
              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Productos Más Vendidos
                </h3>

                {topProducts.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No hay productos vendidos en este período.
                  </div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {topProducts.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-950/60 border border-slate-850 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[11px]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-white block">{p.name}</span>
                            <span className="text-[11px] text-slate-400">{p.quantity} porciones vendidas</span>
                          </div>
                        </div>

                        <strong className="text-white font-bold">${p.total.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cash Cuts / Arqueos History */}
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" /> Historial de Arqueos y Cortes de Caja (Corte Z)
              </h3>
              <p className="text-xs text-slate-400">
                Auditoría de aperturas, cierres y descuadres entre efectivo esperado y contado físico.
              </p>

              {cashCuts.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No hay sesiones de caja registradas en el período seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">Sucursal / Caja</th>
                        <th className="p-3">Cajero</th>
                        <th className="p-3">Apertura</th>
                        <th className="p-3">Cierre</th>
                        <th className="p-3">Fondo Inicial</th>
                        <th className="p-3">Efectivo Esperado</th>
                        <th className="p-3">Efectivo Contado</th>
                        <th className="p-3">Diferencia</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {cashCuts.map((cut) => {
                        const isClosed = cut.status === 'CLOSED'
                        const diff = cut.difference ?? 0

                        return (
                          <tr key={cut.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3">
                              <strong className="text-white block">{cut.branchName}</strong>
                              <span className="text-[11px] text-slate-400">{cut.registerName}</span>
                            </td>
                            <td className="p-3 font-medium text-slate-200">{cut.cashierName}</td>
                            <td className="p-3 text-slate-400">
                              {new Date(cut.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-3 text-slate-400">
                              {cut.closedAt
                                ? new Date(cut.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </td>
                            <td className="p-3">${cut.openingBalance.toFixed(2)}</td>
                            <td className="p-3 font-semibold text-white">
                              {cut.expectedBalance !== null ? `$${cut.expectedBalance.toFixed(2)}` : '—'}
                            </td>
                            <td className="p-3 font-bold text-amber-400">
                              {cut.closingBalance !== null ? `$${cut.closingBalance.toFixed(2)}` : '—'}
                            </td>
                            <td className="p-3">
                              {cut.difference !== null ? (
                                <span
                                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                    Math.abs(diff) < 0.01
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : diff > 0
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-red-500/10 text-red-400'
                                  }`}
                                >
                                  {diff >= 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-3">
                              {isClosed ? (
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
                                  Cerrada
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                                  Abierta (En turno)
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Orders List */}
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Órdenes Procesadas Recientemente
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Folio</th>
                      <th className="p-3">Sucursal</th>
                      <th className="p-3">Ubicación</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Atendió</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-white">{o.orderNumber}</td>
                        <td className="p-3 text-slate-300">{o.branchName}</td>
                        <td className="p-3 text-slate-400">{o.tableName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px]">
                            {o.orderType === 'DINE_IN' ? 'Comedor' : 'Para Llevar'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{o.waiterName}</td>
                        <td className="p-3 font-bold text-amber-400">${o.total.toFixed(2)} MXN</td>
                        <td className="p-3 text-slate-500">
                          {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

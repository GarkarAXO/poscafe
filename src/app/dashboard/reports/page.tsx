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

import { notify } from '@/lib/notify'
import { useDashboardTheme } from '@/context/dashboard-theme-context'

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
  const { isLight, buttonColor, primaryColor, classes } = useDashboardTheme()
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
    <div className="flex-1 flex flex-col w-full">
      {/* Top Navbar */}
      <header className={`px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b ${classes.header}`}>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium border ${classes.buttonGhost}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className={`h-5 w-px ${isLight ? 'bg-[#DECEBD]' : 'bg-white/10'}`} />
          <div>
            <h1 className={`font-bold text-base flex items-center gap-2 ${classes.textMain}`}>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Reporte de Ventas y Arqueos de Caja
            </h1>
            <p className={`text-xs ${classes.textMuted}`}>Auditoría en tiempo real, cortes Z y métodos de cobro</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2">
          {/* Branch filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${classes.input}`}
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
            className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${classes.input}`}
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
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className={`py-20 flex flex-col items-center justify-center space-y-3 ${classes.textMuted}`}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: buttonColor }} />
            <p className="text-xs">Consolidando métricas y arqueos...</p>
          </div>
        )}

        {!loading && metrics && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
                <div className={`flex items-center justify-between mb-2 ${classes.textMuted}`}>
                  <span className="text-xs font-medium">Ventas Totales</span>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  ${metrics.totalSales.toFixed(2)} MXN
                </p>
                <p className={`text-[11px] mt-1 ${classes.textSub}`}>Ingresos netos en el período</p>
              </div>

              <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
                <div className={`flex items-center justify-between mb-2 ${classes.textMuted}`}>
                  <span className="text-xs font-medium">Órdenes Pagadas</span>
                  <ShoppingCart className="w-4 h-4" style={{ color: buttonColor }} />
                </div>
                <p className={`text-2xl font-extrabold ${classes.textMain}`}>{metrics.ordersCount}</p>
                <p className={`text-[11px] mt-1 ${classes.textSub}`}>Transacciones procesadas</p>
              </div>

              <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
                <div className={`flex items-center justify-between mb-2 ${classes.textMuted}`}>
                  <span className="text-xs font-medium">Ticket Promedio</span>
                  <Receipt className="w-4 h-4 text-amber-500" />
                </div>
                <p className={`text-2xl font-extrabold ${classes.textMain}`}>
                  ${metrics.avgTicket.toFixed(2)} MXN
                </p>
                <p className={`text-[11px] mt-1 ${classes.textSub}`}>Gasto medio por cliente</p>
              </div>

              <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
                <div className={`flex items-center justify-between mb-2 ${classes.textMuted}`}>
                  <span className="text-xs font-medium">Cortes de Caja</span>
                  <CheckCircle className="w-4 h-4 text-cyan-500" />
                </div>
                <p className={`text-2xl font-extrabold ${classes.textMain}`}>{cashCuts.length}</p>
                <p className={`text-[11px] mt-1 ${classes.textSub}`}>Sesiones de arqueo</p>
              </div>
            </div>

            {/* Split Row: Payment Methods & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <div className={`p-6 rounded-3xl border space-y-4 ${classes.card}`}>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${classes.textMain}`}>
                  <CreditCard className="w-4 h-4" style={{ color: buttonColor }} /> Ventas por Método de Pago
                </h3>

                <div className="space-y-3 text-xs">
                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${classes.subCard}`}>
                    <div className="flex items-center gap-2.5">
                      <Banknote className="w-4 h-4 text-emerald-500" />
                      <span className={`font-medium ${classes.textMain}`}>Efectivo</span>
                    </div>
                    <strong className={`text-sm font-mono ${classes.textMain}`}>
                      ${(metrics.paymentMethodsSummary.CASH || 0).toFixed(2)} MXN
                    </strong>
                  </div>

                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${classes.subCard}`}>
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-cyan-500" />
                      <span className={`font-medium ${classes.textMain}`}>Tarjeta de Débito</span>
                    </div>
                    <strong className={`text-sm font-mono ${classes.textMain}`}>
                      ${(metrics.paymentMethodsSummary.CARD_DEBIT || 0).toFixed(2)} MXN
                    </strong>
                  </div>

                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${classes.subCard}`}>
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-violet-500" />
                      <span className={`font-medium ${classes.textMain}`}>Tarjeta de Crédito</span>
                    </div>
                    <strong className={`text-sm font-mono ${classes.textMain}`}>
                      ${(metrics.paymentMethodsSummary.CARD_CREDIT || 0).toFixed(2)} MXN
                    </strong>
                  </div>

                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${classes.subCard}`}>
                    <div className="flex items-center gap-2.5">
                      <QrCode className="w-4 h-4 text-amber-500" />
                      <span className={`font-medium ${classes.textMain}`}>Transferencia / QR</span>
                    </div>
                    <strong className={`text-sm font-mono ${classes.textMain}`}>
                      ${((metrics.paymentMethodsSummary.TRANSFER || 0) + (metrics.paymentMethodsSummary.QR || 0)).toFixed(2)} MXN
                    </strong>
                  </div>
                </div>
              </div>

              {/* Top Selling Products */}
              <div className={`p-6 rounded-3xl border space-y-4 ${classes.card}`}>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${classes.textMain}`}>
                  <Sparkles className="w-4 h-4 text-amber-500" /> Productos Más Vendidos
                </h3>

                {topProducts.length === 0 ? (
                  <div className={`py-12 text-center text-xs ${classes.textMuted}`}>
                    No hay productos vendidos en este período.
                  </div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {topProducts.map((p, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex items-center justify-between ${classes.subCard}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-6 h-6 rounded-full font-bold flex items-center justify-center text-[11px]"
                            style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <span className={`font-semibold block ${classes.textMain}`}>{p.name}</span>
                            <span className={`text-[11px] ${classes.textMuted}`}>{p.quantity} porciones vendidas</span>
                          </div>
                        </div>

                        <strong className={`font-bold ${classes.textMain}`}>${p.total.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cash Cuts / Arqueos History */}
            <div className={`p-6 rounded-3xl border space-y-4 ${classes.card}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${classes.textMain}`}>
                <Banknote className="w-4 h-4 text-emerald-500" /> Historial de Arqueos y Cortes de Caja (Corte Z)
              </h3>
              <p className={`text-xs ${classes.textMuted}`}>
                Auditoría de aperturas, cierres y descuadres entre efectivo esperado y contado físico.
              </p>

              {cashCuts.length === 0 ? (
                <div className={`py-8 text-center text-xs ${classes.textMuted}`}>
                  No hay sesiones de caja registradas en el período seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className={`uppercase font-bold text-[10px] border-b ${classes.tableHeader}`}>
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
                    <tbody className="divide-y divide-inherit">
                      {cashCuts.map((cut) => {
                        const isClosed = cut.status === 'CLOSED'
                        const diff = cut.difference ?? 0

                        return (
                          <tr key={cut.id} className={`transition-colors ${classes.tableRow}`}>
                            <td className="p-3">
                              <strong className={`block ${classes.textMain}`}>{cut.branchName}</strong>
                              <span className={`text-[11px] ${classes.textMuted}`}>{cut.registerName}</span>
                            </td>
                            <td className={`p-3 font-medium ${classes.textMain}`}>{cut.cashierName}</td>
                            <td className={`p-3 ${classes.textMuted}`}>
                              {new Date(cut.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className={`p-3 ${classes.textMuted}`}>
                              {cut.closedAt
                                ? new Date(cut.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </td>
                            <td className={`p-3 font-mono ${classes.textMain}`}>${cut.openingBalance.toFixed(2)}</td>
                            <td className={`p-3 font-semibold font-mono ${classes.textMain}`}>
                              {cut.expectedBalance !== null ? `$${cut.expectedBalance.toFixed(2)}` : '—'}
                            </td>
                            <td className="p-3 font-bold font-mono text-amber-600 dark:text-amber-400">
                              {cut.closingBalance !== null ? `$${cut.closingBalance.toFixed(2)}` : '—'}
                            </td>
                            <td className="p-3">
                              {cut.difference !== null ? (
                                <span
                                  className={`font-bold px-2 py-0.5 rounded text-[11px] font-mono ${
                                    Math.abs(diff) < 0.01
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : diff > 0
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
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
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${classes.badge}`}>
                                  Cerrada
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
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
            <div className={`p-6 rounded-3xl border space-y-4 ${classes.card}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${classes.textMain}`}>
                <Clock className="w-4 h-4 text-cyan-500" /> Órdenes Procesadas Recientemente
              </h3>

              <div className="overflow-x-auto rounded-2xl border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className={`uppercase font-bold text-[10px] border-b ${classes.tableHeader}`}>
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
                  <tbody className="divide-y divide-inherit">
                    {recentOrders.map((o) => (
                      <tr key={o.id} className={`transition-colors ${classes.tableRow}`}>
                        <td className={`p-3 font-mono font-bold ${classes.textMain}`}>{o.orderNumber}</td>
                        <td className={`p-3 ${classes.textMain}`}>{o.branchName}</td>
                        <td className={`p-3 ${classes.textMuted}`}>{o.tableName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${classes.badge}`}>
                            {o.orderType === 'DINE_IN' ? 'Comedor' : 'Para Llevar'}
                          </span>
                        </td>
                        <td className={`p-3 ${classes.textMuted}`}>{o.waiterName}</td>
                        <td className="p-3 font-bold font-mono text-amber-600 dark:text-amber-400">${o.total.toFixed(2)} MXN</td>
                        <td className={`p-3 ${classes.textSub}`}>
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

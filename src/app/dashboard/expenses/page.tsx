'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Receipt,
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  Store,
  DollarSign,
  TrendingDown,
  PieChart,
  FileText,
  Trash2,
  Loader2,
  X,
  Layers,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Tag,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { useDashboardTheme } from '@/context/dashboard-theme-context'
import ModalPortal from '@/components/modal-portal'

interface ExpenseItem {
  id: string
  branchId: string
  branchName: string
  branchCode: string
  categoryId: string
  categoryName: string
  amount: number
  notes: string | null
  receiptUrl: string | null
  expensedAt: string
  createdAt: string
}

interface ExpenseCategory {
  id: string
  name: string
  _count?: { expenses: number }
}

interface ExpenseMetrics {
  totalExpenses: number
  count: number
  averageExpense: number
  topCategory: { name: string; total: number; count: number } | null
  byCategory: Array<{ name: string; total: number; count: number }>
}

interface BranchOption {
  id: string
  name: string
  code: string
}

export default function ExpensesDashboardPage() {
  const { isLight, buttonColor, primaryColor, classes } = useDashboardTheme()

  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [metrics, setMetrics] = useState<ExpenseMetrics | null>(null)

  // Filtros
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedRange, setSelectedRange] = useState<string>('month')
  const [search, setSearch] = useState<string>('')

  // Modal Nuevo Gasto
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    branchId: '',
    categoryId: '',
    amount: '',
    notes: '',
    receiptUrl: '',
    expensedAt: new Date().toISOString().split('T')[0],
  })

  // Modal Categorías
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [submittingCategory, setSubmittingCategory] = useState(false)

  // Cargar Sucursales
  const loadBranches = async () => {
    try {
      const res = await fetch('/api/branches').then((r) => r.json())
      if (res.success && Array.isArray(res.data?.branches)) {
        setBranches(res.data.branches)
        if (res.data.branches.length > 0 && !form.branchId) {
          setForm((prev) => ({ ...prev, branchId: res.data.branches[0].id }))
        }
      }
    } catch {
      // Silencioso
    }
  }

  // Cargar Categorías
  const loadCategories = async () => {
    try {
      const res = await fetch('/api/expenses/categories').then((r) => r.json())
      if (res.success && Array.isArray(res.data?.categories)) {
        setCategories(res.data.categories)
        if (res.data.categories.length > 0 && !form.categoryId) {
          setForm((prev) => ({ ...prev, categoryId: res.data.categories[0].id }))
        }
      }
    } catch {
      // Silencioso
    }
  }

  // Cargar Gastos y Métricas
  const loadExpenses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedBranch) params.set('branchId', selectedBranch)
      if (selectedCategory) params.set('categoryId', selectedCategory)
      if (selectedRange) params.set('range', selectedRange)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/expenses?${params.toString()}`).then((r) => r.json())
      if (res.success) {
        setExpenses(res.data.expenses || [])
        setMetrics(res.data.metrics || null)
      } else {
        notify.error('Error al cargar gastos', res.error?.message)
      }
    } catch {
      notify.error('Error de red', 'No se pudieron consultar los gastos operativos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBranches()
    loadCategories()
  }, [])

  useEffect(() => {
    loadExpenses()
  }, [selectedBranch, selectedCategory, selectedRange])

  // Buscar al presionar Enter o limpiar
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadExpenses()
  }

  // Guardar nuevo gasto
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.branchId) {
      notify.warning('Sucursal requerida', 'Selecciona la sucursal del gasto')
      return
    }
    if (!form.categoryId) {
      notify.warning('Categoría requerida', 'Selecciona una categoría de gasto')
      return
    }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) {
      notify.warning('Importe inválido', 'Ingresa un monto numérico mayor a cero')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()

      if (json.success) {
        notify.success('Gasto registrado', `Se registró el gasto por $${amt.toFixed(2)} correctamente`)
        setShowModal(false)
        setForm((prev) => ({
          ...prev,
          amount: '',
          notes: '',
          receiptUrl: '',
          expensedAt: new Date().toISOString().split('T')[0],
        }))
        loadExpenses()
        loadCategories() // Actualizar conteos
      } else {
        notify.error('Error al registrar', json.error?.message)
      }
    } catch {
      notify.error('Error de conexión', 'No se pudo comunicar con el servidor')
    } finally {
      setSubmitting(false)
    }
  }

  // Guardar nueva categoría
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) {
      notify.warning('Nombre requerido', 'Ingresa el nombre de la nueva categoría')
      return
    }

    setSubmittingCategory(true)
    try {
      const res = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
      const json = await res.json()

      if (json.success) {
        notify.success('Categoría creada', `"${newCategoryName.trim()}" lista para usarse`)
        setNewCategoryName('')
        await loadCategories()
        if (json.data?.category?.id) {
          setForm((prev) => ({ ...prev, categoryId: json.data.category.id }))
        }
      } else {
        notify.error('Error al crear categoría', json.error?.message)
      }
    } catch {
      notify.error('Error de red', 'Falla al conectar con el servidor')
    } finally {
      setSubmittingCategory(false)
    }
  }

  // Eliminar gasto
  const handleDeleteExpense = (exp: ExpenseItem) => {
    notify.action({
      title: `¿Eliminar gasto de $${exp.amount.toFixed(2)}?`,
      description: `Se anulará el registro de "${exp.categoryName}" (${exp.notes || 'Sin nota'}). Esta acción no se puede deshacer.`,
      buttonText: 'Confirmar Eliminación',
      onAction: async () => {
        try {
          const res = await fetch(`/api/expenses?id=${exp.id}`, { method: 'DELETE' })
          const json = await res.json()
          if (json.success) {
            notify.success('Gasto eliminado', json.message)
            loadExpenses()
          } else {
            notify.error('Error al eliminar', json.error?.message)
          }
        } catch {
          notify.error('Error de conexión', 'No fue posible eliminar el registro')
        }
      },
    })
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen">
      {/* Top Navbar estandarizado con retorno al Dashboard */}
      <header className={`border-b pl-14 sm:pl-16 lg:pl-6 pr-4 sm:pr-6 py-3.5 sm:py-4 flex items-center justify-between sticky top-0 z-30 transition-colors backdrop-blur-md ${classes.header}`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            href="/dashboard"
            className={`hidden lg:inline-flex p-2 rounded-xl border transition-all items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0 active:scale-95 touch-manipulation select-none ${classes.buttonGhost}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className={`hidden lg:block h-5 w-px border-l ${classes.divider} shrink-0`}></div>

          <div className="min-w-0">
            <h1 className={`font-bold text-sm sm:text-base flex items-center gap-1.5 truncate ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" style={{ color: buttonColor }} />
              <span className="inline sm:hidden">Gastos</span>
              <span className="hidden sm:inline">Gastos Operativos</span>
            </h1>
            <p className={`text-[11px] sm:text-xs truncate hidden sm:block ${classes.textMuted}`}>
              Control de rentas, luz, agua, insumos de limpieza y servicios de cafetería
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation text-white"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Categorías</span>
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: buttonColor }}
            className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:opacity-95 active:scale-95 touch-manipulation text-white"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Gasto</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Cards (Squircle / Double-Bezel) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
            <div className={`flex items-center justify-between mb-2 font-medium ${classes.textMuted}`}>
              <span className="text-xs">Gastos del Periodo</span>
              <DollarSign className="w-4 h-4 text-rose-500" />
            </div>
            <p className={`text-2xl font-black ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              ${(metrics?.totalExpenses || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs mt-1 font-medium ${classes.textSub}`}>
              Total acumulado en el rango seleccionado
            </p>
          </div>

          <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
            <div className={`flex items-center justify-between mb-2 font-medium ${classes.textMuted}`}>
              <span className="text-xs">Promedio por Gasto</span>
              <TrendingDown className="w-4 h-4 text-amber-500" />
            </div>
            <p className={`text-2xl font-black ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              ${(metrics?.averageExpense || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs mt-1 font-medium ${classes.textSub}`}>
              Importe medio de cada comprobante
            </p>
          </div>

          <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
            <div className={`flex items-center justify-between mb-2 font-medium ${classes.textMuted}`}>
              <span className="text-xs">Mayor Rubro de Gasto</span>
              <PieChart className="w-4 h-4 text-purple-500" />
            </div>
            <p className={`text-xl font-black truncate ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              {metrics?.topCategory?.name || 'Sin registros'}
            </p>
            <p className={`text-xs mt-1 font-medium ${classes.textSub}`}>
              {metrics?.topCategory ? `$${metrics.topCategory.total.toFixed(2)} (${metrics.topCategory.count} pagos)` : 'Aún no hay datos'}
            </p>
          </div>

          <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
            <div className={`flex items-center justify-between mb-2 font-medium ${classes.textMuted}`}>
              <span className="text-xs">Comprobantes Registrados</span>
              <FileText className="w-4 h-4 text-emerald-500" />
            </div>
            <p className={`text-2xl font-black ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              {metrics?.count || 0}
            </p>
            <p className={`text-xs mt-1 font-medium ${classes.textSub}`}>
              Facturas o notas archivadas
            </p>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className={`p-4 sm:p-5 rounded-3xl border space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3 ${classes.card}`}>
          {/* Buscador */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${classes.textMuted}`} />
            <input
              type="text"
              placeholder="Buscar por notas, folio o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${classes.input}`}
            />
          </form>

          {/* Selectores */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sucursal */}
            {branches.length > 1 && (
              <div className="relative">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className={`px-3 py-2.5 rounded-xl border text-xs focus:outline-none appearance-none pr-8 cursor-pointer ${classes.input}`}
                >
                  <option value="">Todas las Sedes</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <Store className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${classes.textMuted}`} />
              </div>
            )}

            {/* Categoría */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`px-3 py-2.5 rounded-xl border text-xs focus:outline-none appearance-none pr-8 cursor-pointer ${classes.input}`}
              >
                <option value="">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Tag className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${classes.textMuted}`} />
            </div>

            {/* Periodo */}
            <div className="relative">
              <select
                value={selectedRange}
                onChange={(e) => setSelectedRange(e.target.value)}
                className={`px-3 py-2.5 rounded-xl border text-xs focus:outline-none appearance-none pr-8 cursor-pointer ${classes.input}`}
              >
                <option value="today">Hoy</option>
                <option value="7days">Últimos 7 días</option>
                <option value="month">Este Mes</option>
                <option value="all">Todo el Historial</option>
              </select>
              <Calendar className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${classes.textMuted}`} />
            </div>
          </div>
        </div>

        {/* Lista / Tabla de Gastos */}
        <div className={`rounded-3xl border overflow-hidden shadow-sm ${classes.card}`}>
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className={`text-xs ${classes.textMuted}`}>Cargando gastos operativos...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                No hay gastos registrados en este periodo
              </h3>
              <p className={`text-xs max-w-sm mx-auto ${classes.textMuted}`}>
                Registra rentas, pagos de servicios, mantenimientos o compras de limpieza para controlar tus finanzas.
              </p>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                style={{ backgroundColor: buttonColor }}
                className="px-4 py-2 rounded-xl text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer hover:opacity-95"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primer Gasto</span>
              </button>
            </div>
          ) : (
            <>
              {/* Tabla para Escritorio (lg y superior) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-bold uppercase tracking-wider text-[10px] ${classes.tableHeader}`}>
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Sucursal</th>
                      <th className="py-3 px-4">Notas / Folio</th>
                      <th className="py-3 px-4 text-right">Importe</th>
                      <th className="py-3 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${classes.divider}`}>
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                        <td className={`py-3.5 px-4 font-mono whitespace-nowrap ${classes.textMuted}`}>
                          {new Date(exp.expensedAt).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-bold">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${classes.badge}`}>
                            {exp.categoryName}
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 font-medium ${classes.textMain}`}>
                          {exp.branchName}
                        </td>
                        <td className={`py-3.5 px-4 max-w-xs truncate ${classes.textMuted}`}>
                          {exp.notes || <span className="italic opacity-50">Sin descripción</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-sm text-rose-500 font-mono">
                          -${exp.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp)}
                            title="Eliminar gasto"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Móvil y Tablet en Tarjetas (< lg) */}
              <div className="block lg:hidden p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {expenses.map((exp) => (
                  <div key={exp.id} className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${classes.subCard}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border mb-1 ${classes.badge}`}>
                          {exp.categoryName}
                        </span>
                        <p className={`text-xs font-semibold ${classes.textMain}`}>
                          {exp.branchName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-rose-500 font-mono">
                          -${exp.amount.toFixed(2)}
                        </p>
                        <p className={`text-[10px] font-mono ${classes.textMuted}`}>
                          {new Date(exp.expensedAt).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>

                    {exp.notes && (
                      <p className={`text-xs bg-black/10 dark:bg-white/5 p-2 rounded-xl text-slate-600 dark:text-slate-300`}>
                        {exp.notes}
                      </p>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp)}
                        className="text-xs text-rose-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar registro</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* MODAL REGISTRAR NUEVO GASTO */}
      {showModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false)
            }}
          >
            <div className={`w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border my-auto ${classes.modalContent}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
                    style={{ backgroundColor: buttonColor }}
                  >
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                      Registrar Gasto Operativo
                    </h3>
                    <p className={`text-[11px] ${classes.textMuted}`}>
                      Control financiero de salidas de efectivo o banco
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer ${classes.buttonGhost}`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
                {/* Importe y Fecha */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={`font-bold block ${classes.textMain}`}>Monto / Importe ($) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        required
                        className={`w-full pl-7 pr-3 py-2 rounded-xl border focus:outline-none font-bold text-sm ${classes.input}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={`font-bold block ${classes.textMain}`}>Fecha del Gasto *</label>
                    <input
                      type="date"
                      value={form.expensedAt}
                      onChange={(e) => setForm({ ...form, expensedAt: e.target.value })}
                      required
                      className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                    />
                  </div>
                </div>

                {/* Sucursal */}
                <div className="space-y-1">
                  <label className={`font-bold block ${classes.textMain}`}>Sucursal Responsable *</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    required
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Categoría */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`font-bold block ${classes.textMain}`}>Rubro o Categoría *</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      style={{ color: buttonColor }}
                      className="text-[10px] hover:underline font-bold cursor-pointer"
                    >
                      + Nueva Categoría
                    </button>
                  </div>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    required
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notas o Folio */}
                <div className="space-y-1">
                  <label className={`font-bold block ${classes.textMain}`}>Notas / Folio / Factura</label>
                  <input
                    type="text"
                    placeholder="Ej. Recibo de luz CFE marzo, Folio F-8923..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>

                <div className={`pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t ${classes.divider}`}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`w-full sm:w-auto px-4 py-2 rounded-xl font-bold cursor-pointer text-center justify-center ${classes.buttonGhost}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ backgroundColor: buttonColor }}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl font-bold text-white flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Registrar Gasto</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL GESTIÓN DE CATEGORÍAS */}
      {showCategoryModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCategoryModal(false)
            }}
          >
            <div className={`w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border my-auto ${classes.modalContent}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
                    style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                      Categorías de Gastos
                    </h3>
                    <p className={`text-[11px] ${classes.textMuted}`}>
                      Clasificación para análisis contable
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer ${classes.buttonGhost}`}
                >
                  ✕
                </button>
              </div>

              {/* Formulario Nueva Categoría */}
              <form onSubmit={handleSaveCategory} className="flex gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Nueva categoría (ej. Mantenimiento de Cafetera)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                  className={`flex-1 px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                />
                <button
                  type="submit"
                  disabled={submittingCategory}
                  style={{ backgroundColor: buttonColor }}
                  className="px-3 py-2 rounded-xl font-bold text-white shrink-0 shadow-xs cursor-pointer flex items-center gap-1"
                >
                  {submittingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Agregar</span>
                </button>
              </form>

              {/* Lista de Categorías Existentes */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                <span className={`text-[11px] font-semibold block ${classes.textMuted}`}>
                  Categorías disponibles ({categories.length}):
                </span>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${classes.subCard}`}
                    >
                      <span className={`font-semibold ${classes.textMain}`}>{c.name}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${classes.badge}`}>
                        {c._count?.expenses || 0} gastos
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`pt-2 flex justify-end border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${classes.buttonGhost}`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

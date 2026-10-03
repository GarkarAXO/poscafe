'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Boxes,
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Scale,
  Truck,
  Coffee,
  ArrowRight,
  TrendingDown,
  Loader2,
  X,
  Layers,
  Sparkles,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  HelpCircle,
  Info,
  Calculator,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { UNIT_DEFINITIONS, formatUnitName, formatUnitSymbol, formatUnitFull } from '@/lib/units'

interface Presentation {
  id: string
  name: string
  factorToBase: number
  cost: number | null
}

interface WarehouseStock {
  id: string
  warehouseId: string
  quantity: number
  currentStock: number
  warehouse: {
    id: string
    name: string
    branchId: string
  }
}

interface InventoryItem {
  id: string
  sku: string | null
  name: string
  baseUnit: string
  costPerUnit: number
  reorderPoint: number | null
  optimalStock: number | null
  yieldLossFactor: number
  active: boolean
  presentations: Presentation[]
  warehouseStock: WarehouseStock[]
}

export default function InventoryDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [filterUnit, setFilterUnit] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW' | 'OK' | 'OUT'>('ALL')
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Modal nuevo insumo
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    baseUnit: 'GRAM',
    costPerUnit: '',
    reorderPoint: '',
    optimalStock: '',
    presentationName: '',
    presentationFactor: '',
    presentationCost: '',
  })

  // Modal editar insumo y ajuste de stock
  const [showEditModal, setShowEditModal] = useState(false)
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    sku: '',
    baseUnit: 'GRAM',
    costPerUnit: '',
    reorderPoint: '',
    optimalStock: '',
    yieldLossFactor: '0',
    active: true,
    newStockQuantity: '', // Corrección manual opcional de stock
  })

  const loadInventory = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/inventory/items').then((r) => r.json())
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data)
      } else {
        notify.error('Error al cargar inventario', res.error?.message)
      }
    } catch {
      notify.error('Error de conexión', 'No se pudo obtener el inventario de insumos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  // Guardar nuevo insumo
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      notify.warning('Campo requerido', 'Ingresa el nombre del insumo')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()

      if (json.success) {
        notify.success('Insumo registrado', `"${form.name}" se agregó al inventario base`)
        setShowModal(false)
        setForm({
          name: '',
          sku: '',
          baseUnit: 'GRAM',
          costPerUnit: '',
          reorderPoint: '',
          optimalStock: '',
          presentationName: '',
          presentationFactor: '',
          presentationCost: '',
        })
        loadInventory()
      } else {
        notify.error('Error al guardar', json.error?.message || 'No se pudo crear el insumo')
      }
    } catch {
      notify.error('Error de red', 'Falla al conectar con el servidor')
    } finally {
      setSubmitting(false)
    }
  }

  // Abrir modal de edición
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item)
    const currentTotalStock = item.warehouseStock.reduce(
      (acc, ws) => acc + (Number((ws as any).quantity ?? ws.currentStock) || 0),
      0
    )

    setEditForm({
      id: item.id,
      name: item.name,
      sku: item.sku || '',
      baseUnit: item.baseUnit,
      costPerUnit: item.costPerUnit !== null ? item.costPerUnit.toString() : '0',
      reorderPoint: item.reorderPoint !== null ? item.reorderPoint.toString() : '',
      optimalStock: item.optimalStock !== null ? item.optimalStock.toString() : '',
      yieldLossFactor: item.yieldLossFactor !== null ? item.yieldLossFactor.toString() : '0',
      active: item.active ?? true,
      newStockQuantity: currentTotalStock.toString(),
    })
    setShowEditModal(true)
  }

  // Guardar edición de insumo
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.name.trim()) {
      notify.warning('Campo requerido', 'Ingresa el nombre del insumo')
      return
    }

    setSubmittingEdit(true)
    try {
      const res = await fetch('/api/inventory/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const json = await res.json()

      if (json.success) {
        notify.success('Insumo actualizado', `Los datos de "${editForm.name}" fueron guardados correctamente`)
        setShowEditModal(false)
        loadInventory()
      } else {
        notify.error('Error al actualizar', json.error?.message || 'No se pudo actualizar el insumo')
      }
    } catch {
      notify.error('Error de red', 'Falla al conectar con el servidor')
    } finally {
      setSubmittingEdit(false)
    }
  }

  // Alternar Activo / Inactivo rápidamente
  const handleToggleActive = async (item: InventoryItem) => {
    const nextState = !item.active
    try {
      const res = await fetch('/api/inventory/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, active: nextState }),
      })
      const json = await res.json()
      if (json.success) {
        notify.success(
          nextState ? 'Insumo Reactivado' : 'Insumo Inactivo',
          `"${item.name}" ahora está ${nextState ? 'activo para compras y recetas' : 'inactivo / descontinuado'}`
        )
        loadInventory()
      } else {
        notify.error('Error al cambiar estado', json.error?.message)
      }
    } catch {
      notify.error('Error de red', 'Falla de conexión')
    }
  }

  // Archivar / Eliminar insumo
  const handleDeleteItem = (item: InventoryItem) => {
    notify.action({
      title: `¿Archivar ${item.name}?`,
      description: 'El insumo se marcará como inactivo y no se mostrará en los recetarios activos.',
      buttonText: 'Confirmar y Archivar',
      onAction: async () => {
        try {
          const res = await fetch(`/api/inventory/items?id=${item.id}`, { method: 'DELETE' })
          const json = await res.json()
          if (json.success) {
            notify.success('Insumo archivado', json.message)
            loadInventory()
          } else {
            notify.error('Error al archivar', json.error?.message)
          }
        } catch {
          notify.error('Error de red', 'No se pudo comunicar con el servidor')
        }
      },
    })
  }

  // Cálculo de KPIs seguros (sin NaN)
  const totalItems = items.length
  let lowStockCount = 0
  let outOfStockCount = 0
  let totalInventoryValue = 0

  items.forEach((item) => {
    const totalStock = item.warehouseStock.reduce(
      (acc, ws) => acc + (Number((ws as any).quantity ?? ws.currentStock) || 0),
      0
    )
    const cost = Number(item.costPerUnit) || 0
    totalInventoryValue += totalStock * cost

    if (totalStock <= 0) {
      outOfStockCount++
    } else if (item.reorderPoint && totalStock <= Number(item.reorderPoint)) {
      lowStockCount++
    }
  })

  // Filtrado de la tabla
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))

    const matchUnit = filterUnit === 'ALL' || item.baseUnit === filterUnit

    const matchActive =
      filterActive === 'ALL' ||
      (filterActive === 'ACTIVE' && item.active) ||
      (filterActive === 'INACTIVE' && !item.active)

    const totalStock = item.warehouseStock.reduce(
      (acc, ws) => acc + (Number((ws as any).quantity ?? ws.currentStock) || 0),
      0
    )
    let status = 'OK'
    if (totalStock <= 0) status = 'OUT'
    else if (item.reorderPoint && totalStock <= Number(item.reorderPoint)) status = 'LOW'

    const matchStatus = filterStatus === 'ALL' || filterStatus === status

    return matchSearch && matchUnit && matchActive && matchStatus
  })

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto font-sans">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Inventario de Insumos y Materias Primas
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-semibold">
              Control de Stock
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Materias primas en unidades base (gramos, mililitros, piezas) que alimentan compras y recetarios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/purchases"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>+ Cargar Compra o Ticket</span>
          </Link>

          <Link
            href="/dashboard/catalog"
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Coffee className="w-4 h-4 text-amber-400" />
            <span>Recetarios</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-violet-400" />
            <span>Alta Manual</span>
          </button>
        </div>
      </div>

      {/* Cadena Operativa: Banner Explicativo del Flujo */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-violet-950/40 via-slate-900/60 to-indigo-950/40 border border-violet-500/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <strong className="text-white block font-semibold">Monitor de Existencias y Auditoría de Stock</strong>
            <span className="text-slate-400">
              Tus materias primas se alimentan automáticamente al capturar tus compras y tickets (sin tener que crearlas por duplicado). Al vender en caja, se descuentan en tiempo real según el recetario.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-medium text-slate-300 overflow-x-auto pb-1 md:pb-0">
          <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 flex items-center gap-1">
            1. Insumos Base
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 flex items-center gap-1">
            2. Compras
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 flex items-center gap-1">
            3. Recetarios
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-violet-400 flex items-center gap-1">
            4. Venta POS
          </span>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Insumos en Catálogo</span>
            <Boxes className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{totalItems}</p>
          <span className="text-[11px] text-slate-500">Materias primas registradas</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Punto de Reorden</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-amber-400">{lowStockCount}</p>
            <span className="text-[11px] text-slate-400">insumos por agotarse</span>
          </div>
          <span className="text-[11px] text-slate-500">Requieren orden de compra</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sin Existencias</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-rose-400">{outOfStockCount}</p>
            <span className="text-[11px] text-slate-400">en ceros</span>
          </div>
          <span className="text-[11px] text-slate-500">Afecta recetas activas</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Valor Estimado Stock</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">
            ${totalInventoryValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">Valuado al costo unitario base</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar insumo por nombre o SKU..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Activo / Inactivo */}
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">Todos (Activos e Inactivos)</option>
            <option value="ACTIVE">Solo Activos (En uso)</option>
            <option value="INACTIVE">Solo Inactivos (Descontinuados)</option>
          </select>

          {/* Filtro Unidad Base */}
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">Todas las Unidades Base</option>
            {Object.values(UNIT_DEFINITIONS).map((u) => (
              <option key={u.code} value={u.code}>
                {u.label} ({u.symbol})
              </option>
            ))}
          </select>

          {/* Filtro Estado de Existencias */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="OK">En Stock Normal</option>
            <option value="LOW">Alerta: Stock Bajo</option>
            <option value="OUT">Agotados (Cero)</option>
          </select>
        </div>
      </div>

      {/* Tabla de Insumos y Existencias */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">SKU / Insumo</th>
                <th className="p-4">Unidad Base</th>
                <th className="p-4">Costo Base ($ MXN)</th>
                <th className="p-4">Stock en Almacenes</th>
                <th className="p-4">Punto Reorden</th>
                <th className="p-4">Presentación Compra</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-400" />
                    Cargando inventario de insumos...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No se encontraron insumos que coincidan con la búsqueda o filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const totalStock = item.warehouseStock.reduce(
                    (acc, ws) => acc + (Number((ws as any).quantity ?? ws.currentStock) || 0),
                    0
                  )
                  const unitLabel = formatUnitFull(item.baseUnit)
                  const unitSymbol = formatUnitSymbol(item.baseUnit)
                  const isOutOfStock = totalStock <= 0
                  const isLowStock = Boolean(item.reorderPoint && totalStock <= Number(item.reorderPoint))

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        !item.active ? 'opacity-55 bg-slate-950/40' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500 block">
                            {item.sku || 'SIN-SKU'}
                          </span>
                          {!item.active && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              Descontinuado
                            </span>
                          )}
                        </div>
                        <strong className="text-white text-xs block mt-0.5">{item.name}</strong>
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px] font-semibold">
                          {unitLabel}
                        </span>
                      </td>

                      <td className="p-4 font-mono font-medium text-slate-200">
                        ${Number(item.costPerUnit).toFixed(4)} <span className="text-slate-500 text-[10px]">/{unitSymbol}</span>
                      </td>

                      <td className="p-4">
                        {item.warehouseStock.length === 0 ? (
                          <span className="text-slate-500 font-mono">0 {unitSymbol}</span>
                        ) : (
                          <div className="space-y-0.5">
                            <strong className="text-white font-mono text-xs block">
                              {totalStock.toLocaleString('es-MX')} {unitSymbol}
                            </strong>
                            <div className="text-[10px] text-slate-400 space-x-1.5">
                              {item.warehouseStock.map((ws) => {
                                const stockVal = Number((ws as any).quantity ?? ws.currentStock) || 0
                                return (
                                  <span key={ws.id} className="inline-block">
                                    {ws.warehouse?.name || 'Almacén'}: {stockVal.toLocaleString('es-MX')}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="p-4 font-mono text-slate-400">
                        {item.reorderPoint ? `${Number(item.reorderPoint).toLocaleString('es-MX')} ${unitSymbol}` : '—'}
                      </td>

                      <td className="p-4">
                        {item.presentations.length > 0 ? (
                          <div className="space-y-0.5">
                            {item.presentations.map((pr) => (
                              <span key={pr.id} className="block text-slate-300 text-[11px]">
                                {pr.name} <span className="text-slate-500 font-mono text-[10px]">({pr.factorToBase} {unitSymbol})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Unitaria</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {!item.active ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold inline-flex items-center gap-1">
                            Inactivo
                          </span>
                        ) : isOutOfStock ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Stock Bajo
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> En Stock
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Editar registro y stock */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-all cursor-pointer"
                            title="Editar insumo o corregir existencias"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Activar / Desactivar rápido */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              item.active
                                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                            }`}
                            title={item.active ? 'Desactivar insumo (no se comprará ni usará)' : 'Reactivar insumo'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Archivar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                            title="Archivar insumo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Nuevo Insumo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Nuevo Insumo / Materia Prima</h3>
                  <p className="text-xs text-slate-400">Registra el insumo definiendo su unidad base indivisible para recetas e inventario</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-5 text-xs">
              {/* Bloque 1: Identificación del Insumo */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60">
                  <span className="w-5 h-5 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-[11px] font-bold">1</span>
                  <h4 className="font-semibold text-slate-200 text-xs">Identificación del Insumo</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-slate-300 font-semibold">
                      Nombre del Insumo <span className="text-violet-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej: Café de Grano Mezcla Espresso, Leche Entera"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-slate-300 font-semibold">SKU / Código</label>
                      <span className="text-[10px] text-slate-500">Opcional</span>
                    </div>
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      placeholder="Ej: INS-001"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bloque 2: Unidad de Medida Base y Costos */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60">
                  <span className="w-5 h-5 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-[11px] font-bold">2</span>
                  <h4 className="font-semibold text-slate-200 text-xs">Unidad Base y Parámetros de Stock</h4>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">
                    Unidad de Medida Base <span className="text-violet-400">*</span>
                  </label>
                  <select
                    value={form.baseUnit}
                    onChange={(e) => setForm({ ...form, baseUnit: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium text-xs cursor-pointer"
                  >
                    {Object.values(UNIT_DEFINITIONS).map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label} ({u.symbol}) — {u.desc}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <Info className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                    <span>Es la unidad indivisible con la que se descuenta en recetas (ej: gramos para café, mililitros para leche, piezas para panes).</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">Costo Unitario Base</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">$</span>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={form.costPerUnit}
                        onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
                        placeholder="0.0000"
                        className="w-full pl-8 pr-16 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono text-xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                        / {formatUnitSymbol(form.baseUnit)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Costo estimado por cada {formatUnitName(form.baseUnit)} ({formatUnitSymbol(form.baseUnit)})
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">Punto de Reorden (Mínimo)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.reorderPoint}
                        onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
                        placeholder="Sin alerta"
                        className="w-full pl-3.5 pr-16 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono text-xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                        {formatUnitSymbol(form.baseUnit)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Alerta cuando las existencias totales bajen de este nivel
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloque 3: Presentación Comercial de Compra (Opcional) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px] font-bold">3</span>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-400" />
                      <h4 className="font-semibold text-slate-200 text-xs">Presentación de Compra Habitual</h4>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">Opcional</span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Si compras este insumo en cajas, bidones o bultos, configúralo aquí para que al recibir compras se convierta automáticamente a tu unidad base.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Nombre de la Presentación</label>
                  <input
                    type="text"
                    value={form.presentationName}
                    onChange={(e) => setForm({ ...form, presentationName: e.target.value })}
                    placeholder="Ej: Caja x 12 Litros, Costal de 25 kg, Garrafa de 5L"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">Contenido por Presentación</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.presentationFactor}
                        onChange={(e) => setForm({ ...form, presentationFactor: e.target.value })}
                        placeholder="Ej: 12000 si son 12 L en ml"
                        className="w-full pl-3.5 pr-16 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                        {formatUnitSymbol(form.baseUnit)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">Costo Estimado del Empaque</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.presentationCost}
                        onChange={(e) => setForm({ ...form, presentationCost: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-8 pr-16 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                        MXN
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calculadora en vivo de costo unitario */}
                {Number(form.presentationFactor) > 0 && Number(form.presentationCost) > 0 && (
                  <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 text-amber-300">
                      <Calculator className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Costo calculado por {formatUnitName(form.baseUnit)}:{' '}
                        <strong className="font-mono font-bold text-amber-200">
                          ${(Number(form.presentationCost) / Number(form.presentationFactor)).toFixed(4)} MXN
                        </strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          costPerUnit: (Number(form.presentationCost) / Number(form.presentationFactor)).toFixed(4),
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>⚡ Usar como Costo Base</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Insumo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Insumo y Corrección de Stock */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Editar Insumo / Materia Prima</h3>
                  <p className="text-xs text-slate-400">Modifica datos del insumo, estado activo/inactivo o corrige existencias de stock</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5 text-xs">
              {/* Tarjeta de Estado Activo / Inactivo */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4">
                <div>
                  <strong className="text-white block font-semibold text-xs">Estado en Catálogo</strong>
                  <span className="text-[11px] text-slate-400">
                    {editForm.active
                      ? 'Activo: Disponible para compras y para descontar en recetas vendibles.'
                      : 'Inactivo / Descontinuado: No se comprará ni estará disponible para nuevas recetas.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, active: !editForm.active })}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 ${
                    editForm.active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{editForm.active ? 'Activo' : 'Inactivo'}</span>
                </button>
              </div>

              {/* Tarjeta: Datos Generales */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                <h4 className="font-semibold text-slate-200 text-xs pb-1 border-b border-slate-800/60">
                  Identificación del Insumo
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-slate-300 font-semibold">
                      Nombre del Insumo <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">SKU / Código</label>
                    <input
                      type="text"
                      value={editForm.sku}
                      onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Tarjeta: Unidad Base y Parámetros */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                <h4 className="font-semibold text-slate-200 text-xs pb-1 border-b border-slate-800/60">
                  Unidad de Medida Base y Costos
                </h4>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Unidad Base</label>
                  <select
                    value={editForm.baseUnit}
                    onChange={(e) => setEditForm({ ...editForm, baseUnit: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-xs cursor-pointer"
                  >
                    {Object.values(UNIT_DEFINITIONS).map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label} ({u.symbol}) — {u.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">Costo Unitario Base</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">$</span>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={editForm.costPerUnit}
                        onChange={(e) => setEditForm({ ...editForm, costPerUnit: e.target.value })}
                        className="w-full pl-8 pr-16 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                        / {formatUnitSymbol(editForm.baseUnit)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">Punto de Reorden (Mínimo)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Sin alerta"
                        value={editForm.reorderPoint}
                        onChange={(e) => setEditForm({ ...editForm, reorderPoint: e.target.value })}
                        className="w-full pl-3.5 pr-16 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                        {formatUnitSymbol(editForm.baseUnit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Corrección Directa de Stock */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <RefreshCw className="w-4 h-4 flex-shrink-0" />
                  <strong className="text-xs font-semibold">Corregir / Ajustar Existencias Actuales en Almacén</strong>
                </div>
                <p className="text-[11px] text-slate-300">
                  Si hubo un error de captura o configuración inicial (como existencias en &ldquo;NaN&rdquo; o diferencias físicas), ingresa aquí la cantidad real comprobada para corregirla automáticamente.
                </p>

                <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-full sm:w-56 relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editForm.newStockQuantity}
                      onChange={(e) => setEditForm({ ...editForm, newStockQuantity: e.target.value })}
                      placeholder="0"
                      className="w-full pl-3.5 pr-16 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-300 font-mono font-bold text-sm focus:outline-none focus:border-amber-500 text-center"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-900 text-amber-400 text-[11px] font-mono font-semibold">
                      {formatUnitSymbol(editForm.baseUnit)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Ajustará el stock en el almacén principal automáticamente creando un movimiento de corrección.
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

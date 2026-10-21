'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Boxes,
  Package,
  Plus,
  ArrowLeft,
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
  AlertOctagon,
  History,
  Calendar,
  DollarSign,
  MoreVertical,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { UNIT_DEFINITIONS, formatUnitName, formatUnitSymbol, formatUnitFull } from '@/lib/units'
import { useDashboardTheme } from '@/context/dashboard-theme-context'
import ModalPortal from '@/components/modal-portal'

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
  const { isLight, buttonColor, primaryColor, contrastTextButton, classes } = useDashboardTheme()
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

  // Modal de Merma / Desperdicio
  const [showWasteModal, setShowWasteModal] = useState(false)
  const [selectedWasteItemId, setSelectedWasteItemId] = useState('')
  const [wasteQuantity, setWasteQuantity] = useState('')
  const [wasteReason, setWasteReason] = useState('Derrame o Accidente')
  const [wasteNotes, setWasteNotes] = useState('')
  const [submittingWaste, setSubmittingWaste] = useState(false)

  // Modal de Historial de Mermas
  const [showWasteHistoryModal, setShowWasteHistoryModal] = useState(false)
  const [wasteHistory, setWasteHistory] = useState<Array<{
    id: string
    itemId: string
    itemName: string
    itemSku: string
    baseUnit: string
    warehouseName: string
    quantity: number
    unitCost: number
    totalCost: number
    reason: string
    createdAt: string
  }>>([])
  const [loadingWasteHistory, setLoadingWasteHistory] = useState(false)

  const openWasteModal = (item?: InventoryItem) => {
    if (item) {
      setSelectedWasteItemId(item.id)
    } else if (items.length > 0) {
      setSelectedWasteItemId(items[0].id)
    }
    setWasteQuantity('')
    setWasteReason('Derrame o Accidente')
    setWasteNotes('')
    setShowWasteModal(true)
  }

  const openWasteHistory = async () => {
    setShowWasteHistoryModal(true)
    setLoadingWasteHistory(true)
    try {
      const res = await fetch('/api/inventory/waste?limit=50').then((r) => r.json())
      if (res.success && Array.isArray(res.data)) {
        setWasteHistory(res.data)
      }
    } catch {
      notify.error('Error', 'No se pudo cargar el historial de mermas')
    } finally {
      setLoadingWasteHistory(false)
    }
  }

  // Menú de opciones secundarias en móviles (Cargar compra, Historial de merma, Recetarios)
  const [showMoreActions, setShowMoreActions] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreActions(false)
      }
    }
    if (showMoreActions) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showMoreActions])

  const handleSaveWaste = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetItem = items.find((i) => i.id === selectedWasteItemId)
    if (!targetItem) {
      notify.error('Error', 'Selecciona un insumo')
      return
    }
    const qty = Number(wasteQuantity)
    if (!qty || isNaN(qty) || qty <= 0) {
      notify.error('Cantidad inválida', 'La cantidad debe ser mayor a 0')
      return
    }

    setSubmittingWaste(true)
    try {
      const res = await fetch('/api/inventory/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: targetItem.id,
          quantity: qty,
          reason: wasteReason,
          notes: wasteNotes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        notify.success('Merma registrada', json.message)
        setShowWasteModal(false)
        setWasteQuantity('')
        setWasteNotes('')
        loadInventory()
      } else {
        notify.error('Error al registrar merma', json.error?.message)
      }
    } catch {
      notify.error('Error de conexión', 'No se pudo comunicar con el servidor')
    } finally {
      setSubmittingWaste(false)
    }
  }

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

  // Bloquear scroll de la página de fondo cuando cualquier modal esté abierto
  useEffect(() => {
    const isAnyModalOpen =
      showModal || (showEditModal && !!editingItem) || showWasteModal || showWasteHistoryModal
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showModal, showEditModal, editingItem, showWasteModal, showWasteHistoryModal])

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
    <div className={`flex-1 flex flex-col w-full max-w-full overflow-x-hidden ${classes.textMain}`}>
      {/* Top Navbar */}
      <header className={`border-b pl-14 sm:pl-16 lg:pl-6 pr-4 sm:pr-6 py-3.5 sm:py-4 flex items-center justify-between sticky top-0 z-30 transition-colors backdrop-blur-md ${classes.header}`}>
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            href="/dashboard"
            className={`hidden lg:inline-flex p-2 rounded-xl border transition-all items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0 active:scale-95 touch-manipulation select-none ${classes.buttonGhost}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className={`hidden lg:block h-5 w-px border-l ${classes.divider} shrink-0`}></div>

          <div className="min-w-0">
            <h1 className={`font-bold text-sm sm:text-base flex items-center gap-2 truncate ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              <Boxes className="w-5 h-5 shrink-0" style={{ color: buttonColor }} />
              <span className="lg:hidden">Inventario</span>
              <span className="hidden lg:inline truncate">Inventario de Insumos y Materias Primas</span>
            </h1>
            <p className={`text-xs truncate hidden lg:block ${classes.textMuted}`}>
              Existencias en almacenes, compras automáticas y alertas de stock
            </p>
          </div>
        </div>

        {/* Botonera Desktop (>= 1024px) */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/purchases"
            style={{ backgroundColor: buttonColor, color: contrastTextButton }}
            className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:opacity-95 active:scale-95 touch-manipulation"
          >
            <Truck className="w-4 h-4" />
            <span>Cargar Compra</span>
          </Link>

          <Link
            href="/dashboard/catalog"
            className={`px-3 py-2 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${classes.buttonGhost}`}
          >
            <Coffee className="w-4 h-4 text-amber-500" />
            <span>Recetarios</span>
          </Link>

          <button
            type="button"
            onClick={() => openWasteModal()}
            className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
            title="Registrar merma o desperdicio de materia prima"
          >
            <AlertOctagon className="w-4 h-4 text-rose-500" />
            <span>Merma</span>
          </button>

          <button
            type="button"
            onClick={openWasteHistory}
            className={`px-3 py-2 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation ${classes.buttonGhost}`}
            title="Consultar historial de mermas registradas"
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>Historial</span>
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className={`px-3 py-2 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation ${classes.buttonGhost}`}
          >
            <Plus className="w-4 h-4" style={{ color: buttonColor }} />
            <span>Alta Manual</span>
          </button>
        </div>

        {/* Botonera Móvil / Tablet (< 1024px) */}
        <div className="flex lg:hidden items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => openWasteModal()}
            className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation"
            title="Registrar merma"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Merma</span>
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className={`px-2.5 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation ${classes.buttonGhost}`}
            title="Alta de insumo"
          >
            <Plus className="w-3.5 h-3.5" style={{ color: buttonColor }} />
            <span className="hidden sm:inline">Alta</span>
          </button>

          {/* Menú de 3 puntos desplegable */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreActions(!showMoreActions)}
              className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 touch-manipulation flex items-center justify-center ${showMoreActions ? (isLight ? 'bg-amber-100/70 border-amber-300' : 'bg-white/10 border-white/20') : classes.buttonGhost}`}
              aria-label="Más opciones de inventario"
              title="Más acciones"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreActions && (
              <div
                className={`absolute right-0 top-full mt-2 w-56 rounded-2xl border shadow-2xl z-50 py-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 ${
                  isLight
                    ? 'bg-[#FDFBF7] border-[#E6D5C3] text-[#2B1712]'
                    : 'bg-[#18120F] border-[#3E2723] text-white'
                }`}
              >
                <Link
                  href="/dashboard/purchases"
                  onClick={() => setShowMoreActions(false)}
                  className={`px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2.5 transition-colors ${classes.buttonGhost} border-0 rounded-none w-full text-left`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                  >
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-bold">Cargar Compra</span>
                    <span className={`text-[10px] block truncate ${classes.textMuted}`}>Registrar compras y stock</span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActions(false)
                    openWasteHistory()
                  }}
                  className={`px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2.5 transition-colors ${classes.buttonGhost} border-0 rounded-none w-full text-left`}
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-500/10 text-slate-400 flex items-center justify-center shrink-0">
                    <History className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-bold">Historial de Mermas</span>
                    <span className={`text-[10px] block truncate ${classes.textMuted}`}>Consultar bajas previas</span>
                  </div>
                </button>

                <Link
                  href="/dashboard/catalog"
                  onClick={() => setShowMoreActions(false)}
                  className={`px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2.5 transition-colors ${classes.buttonGhost} border-0 rounded-none w-full text-left`}
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Coffee className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-bold">Recetarios</span>
                    <span className={`text-[10px] block truncate ${classes.textMuted}`}>Fichas técnicas y subrecetas</span>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Cadena Operativa: Banner Explicativo del Flujo */}
      <div className={`p-4 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${classes.card}`}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <strong className={`block font-semibold ${classes.textMain}`}>Monitor de Existencias y Auditoría de Stock</strong>
            <span className={classes.textMuted}>
              Tus materias primas se alimentan automáticamente al capturar tus compras y tickets (sin tener que crearlas por duplicado). Al vender en caja, se descuentan en tiempo real según el recetario.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-medium overflow-x-auto pb-1 md:pb-0">
          <span className={`px-2.5 py-1 rounded-xl border text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 ${classes.subCard}`}>
            1. Insumos Base
          </span>
          <ArrowRight className={`w-3.5 h-3.5 opacity-50 ${classes.textSub}`} />
          <span className={`px-2.5 py-1 rounded-xl border text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1 ${classes.subCard}`}>
            2. Compras
          </span>
          <ArrowRight className={`w-3.5 h-3.5 opacity-50 ${classes.textSub}`} />
          <span className={`px-2.5 py-1 rounded-xl border text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 ${classes.subCard}`}>
            3. Recetarios
          </span>
          <ArrowRight className={`w-3.5 h-3.5 opacity-50 ${classes.textSub}`} />
          <span className={`px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1 ${classes.subCard}`} style={{ color: buttonColor }}>
            4. Venta POS
          </span>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-3xl border shadow-sm ${classes.card}`}>
          <div className={`flex items-center justify-between mb-2 ${classes.textMuted}`}>
            <span className="text-xs font-semibold uppercase tracking-wider">Insumos en Catálogo</span>
            <Boxes className="w-4 h-4" style={{ color: buttonColor }} />
          </div>
          <p className={`text-2xl font-extrabold ${classes.textMain}`}>{totalItems}</p>
          <span className={`text-[11px] ${classes.textSub}`}>Materias primas registradas</span>
        </div>

        <div className={`p-5 rounded-3xl border shadow-sm ${classes.card}`}>
          <div className={`flex items-center justify-between mb-2 ${classes.textMuted}`}>
            <span className="text-xs font-semibold uppercase tracking-wider">Punto de Reorden</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{lowStockCount}</p>
            <span className={`text-[11px] ${classes.textMuted}`}>insumos por agotarse</span>
          </div>
          <span className={`text-[11px] ${classes.textSub}`}>Requieren orden de compra</span>
        </div>

        <div className={`p-5 rounded-3xl border shadow-sm ${classes.card}`}>
          <div className={`flex items-center justify-between mb-2 ${classes.textMuted}`}>
            <span className="text-xs font-semibold uppercase tracking-wider">Sin Existencias</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{outOfStockCount}</p>
            <span className={`text-[11px] ${classes.textMuted}`}>en ceros</span>
          </div>
          <span className={`text-[11px] ${classes.textSub}`}>Afecta recetas activas</span>
        </div>

        <div className={`p-5 rounded-3xl border shadow-sm ${classes.card}`}>
          <div className={`flex items-center justify-between mb-2 ${classes.textMuted}`}>
            <span className="text-xs font-semibold uppercase tracking-wider">Valor Estimado Stock</span>
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ${totalInventoryValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className={`text-[11px] ${classes.textSub}`}>Valuado al costo unitario base</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border ${classes.card}`}>
        <div className="relative flex-1">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${classes.textSub}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar insumo por nombre o SKU..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Activo / Inactivo */}
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as any)}
            className={`px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
          >
            <option value="ALL">Todos (Activos e Inactivos)</option>
            <option value="ACTIVE">Solo Activos (En uso)</option>
            <option value="INACTIVE">Solo Inactivos (Descontinuados)</option>
          </select>

          {/* Filtro Unidad Base */}
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
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
            className={`px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
          >
            <option value="ALL">Todos los Estados</option>
            <option value="OK">En Stock Normal</option>
            <option value="LOW">Alerta: Stock Bajo</option>
            <option value="OUT">Agotados (Cero)</option>
          </select>
        </div>
      </div>

      {/* Vista de Insumos y Existencias: Tabla en Desktop / Tarjetas en Móvil */}
      <div className={`rounded-3xl border overflow-hidden shadow-lg ${classes.card}`}>
        {/* Tabla Desktop (lg y superior: >= 1024px) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className={`w-full text-left text-xs ${classes.textMain}`}>
            <thead className={`uppercase font-semibold text-[10px] border-b ${classes.tableHeader}`}>
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
            <tbody className={`divide-y ${isLight ? 'divide-[#E6D5C3]/60' : 'divide-white/5'}`}>
              {loading ? (
                <tr>
                  <td colSpan={8} className={`p-8 text-center ${classes.textMuted}`}>
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: buttonColor }} />
                    Cargando inventario de insumos...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`p-8 text-center ${classes.textMuted}`}>
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
                      className={`transition-colors ${classes.tableRow} ${
                        !item.active ? 'opacity-55' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-[10px] block ${classes.textSub}`}>
                            {item.sku || 'SIN-SKU'}
                          </span>
                          {!item.active && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${classes.badge}`}>
                              Descontinuado
                            </span>
                          )}
                        </div>
                        <strong className={`text-xs block mt-0.5 ${classes.textMain}`}>{item.name}</strong>
                      </td>

                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-lg border font-mono text-[11px] font-semibold ${classes.badge}`}>
                          {unitLabel}
                        </span>
                      </td>

                      <td
                        className={`p-4 font-mono font-medium ${classes.textMuted}`}
                        title={`Costo matemático exacto: $${Number(item.costPerUnit)} MXN / ${unitSymbol}`}
                      >
                        ${Number(item.costPerUnit).toFixed(2)} <span className={`text-[10px] ${classes.textSub}`}>/{unitSymbol}</span>
                      </td>

                      <td className="p-4">
                        {item.warehouseStock.length === 0 ? (
                          <span className={`font-mono ${classes.textSub}`}>0 {unitSymbol}</span>
                        ) : (
                          <div className="space-y-0.5">
                            <strong className={`font-mono text-xs block ${classes.textMain}`}>
                              {totalStock.toLocaleString('es-MX')} {unitSymbol}
                            </strong>
                            <div className={`text-[10px] space-x-1.5 ${classes.textSub}`}>
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

                      <td className={`p-4 font-mono ${classes.textSub}`}>
                        {item.reorderPoint ? `${Number(item.reorderPoint).toLocaleString('es-MX')} ${unitSymbol}` : '—'}
                      </td>

                      <td className="p-4">
                        {item.presentations.length > 0 ? (
                          <div className="space-y-0.5">
                            {item.presentations.map((pr) => (
                              <span key={pr.id} className={`block text-[11px] ${classes.textMuted}`}>
                                {pr.name} <span className={`font-mono text-[10px] ${classes.textSub}`}>({pr.factorToBase} {unitSymbol})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={`text-[11px] ${classes.textSub}`}>Unitaria</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {!item.active ? (
                          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold inline-flex items-center gap-1 ${classes.badge}`}>
                            Inactivo
                          </span>
                        ) : isOutOfStock ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Stock Bajo
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> En Stock
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Registrar Merma directa */}
                          <button
                            type="button"
                            onClick={() => openWasteModal(item)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all cursor-pointer"
                            title="Registrar merma o desperdicio de este insumo"
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar registro y stock */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className={`p-1.5 rounded-lg border text-amber-600 dark:text-amber-400 transition-all cursor-pointer ${classes.buttonGhost}`}
                            title="Editar insumo o corregir existencias"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Activar / Desactivar rápido */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${classes.buttonGhost} ${
                              item.active
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400'
                            }`}
                            title={item.active ? 'Desactivar insumo (no se comprará ni usará)' : 'Reactivar insumo'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Archivar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all cursor-pointer"
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

        {/* Tarjetas Móvil y Tablet (< lg: < 1024px) */}
        <div className="block lg:hidden">
          {loading ? (
            <div className={`p-8 text-center ${classes.textMuted}`}>
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: buttonColor }} />
              Cargando inventario de insumos...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className={`p-8 text-center text-xs ${classes.textMuted}`}>
              No se encontraron insumos que coincidan con la búsqueda o filtro seleccionado.
            </div>
          ) : (
            <div className="p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredItems.map((item) => {
                const totalStock = item.warehouseStock.reduce(
                  (acc, ws) => acc + (Number((ws as any).quantity ?? ws.currentStock) || 0),
                  0
                )
                const unitLabel = formatUnitFull(item.baseUnit)
                const unitSymbol = formatUnitSymbol(item.baseUnit)
                const isOutOfStock = totalStock <= 0
                const isLowStock = Boolean(item.reorderPoint && totalStock <= Number(item.reorderPoint))

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border space-y-3 transition-colors ${classes.subCard} ${classes.tableRow} ${
                      !item.active ? 'opacity-60' : ''
                    }`}
                  >
                  {/* Encabezado de la tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${classes.badge}`}>
                          {item.sku || 'SIN-SKU'}
                        </span>
                        {!item.active && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${classes.badge}`}>
                            Descontinuado
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-lg border font-mono text-[10px] font-semibold ${classes.badge}`}>
                          {unitLabel}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold truncate ${classes.textMain}`}>
                        {item.name}
                      </h4>
                    </div>

                    {/* Estado badge */}
                    <div className="shrink-0">
                      {!item.active ? (
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold inline-flex items-center gap-1 ${classes.badge}`}>
                          Inactivo
                        </span>
                      ) : isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Agotado
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Stock Bajo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> En Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Métricas clave en grid */}
                  <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs ${isLight ? 'bg-amber-50/40 border-[#E6D5C3]/70' : 'bg-black/20 border-white/5'}`}>
                    <div>
                      <span className={`text-[10px] block uppercase font-medium ${classes.textSub}`}>Stock Total</span>
                      <strong className={`text-xs font-mono font-bold ${classes.textMain}`}>
                        {totalStock.toLocaleString('es-MX')} {unitSymbol}
                      </strong>
                      {item.warehouseStock.length > 1 && (
                        <div className={`text-[9px] mt-0.5 space-y-0.5 ${classes.textSub}`}>
                          {item.warehouseStock.map((ws) => {
                            const stockVal = Number((ws as any).quantity ?? ws.currentStock) || 0
                            return (
                              <div key={ws.id} className="truncate">
                                {ws.warehouse?.name || 'Alm'}: {stockVal.toLocaleString('es-MX')}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className={`text-[10px] block uppercase font-medium ${classes.textSub}`}>Costo Unitario</span>
                      <strong className={`text-xs font-mono font-medium ${classes.textMuted}`}>
                        ${Number(item.costPerUnit).toFixed(2)} <span className={`text-[10px] ${classes.textSub}`}>/{unitSymbol}</span>
                      </strong>
                      <div className={`text-[9px] mt-0.5 ${classes.textSub}`}>
                        Reorden: {item.reorderPoint ? `${Number(item.reorderPoint).toLocaleString('es-MX')} ${unitSymbol}` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Presentaciones de compra si existen */}
                  {item.presentations.length > 0 && (
                    <div className={`text-[11px] flex items-center gap-1.5 flex-wrap ${classes.textSub}`}>
                      <span className="font-semibold text-[10px]">Presentaciones:</span>
                      {item.presentations.map((pr) => (
                        <span key={pr.id} className={`px-1.5 py-0.5 rounded border text-[10px] ${classes.badge}`}>
                          {pr.name} ({pr.factorToBase} {unitSymbol})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Barra de Acciones Móviles */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-inherit">
                    <button
                      type="button"
                      onClick={() => openWasteModal(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs font-medium inline-flex items-center gap-1.5 transition-all"
                    >
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Merma</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className={`px-2.5 py-1.5 rounded-xl border text-amber-600 dark:text-amber-400 text-xs font-medium inline-flex items-center gap-1.5 transition-all ${classes.buttonGhost}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`p-1.5 rounded-xl border text-xs transition-all ${classes.buttonGhost} ${
                        item.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                      title={item.active ? 'Desactivar' : 'Reactivar'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs transition-all"
                      title="Archivar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Registrar Nuevo Insumo */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border shadow-2xl flex flex-col p-6 sm:p-7 space-y-6 my-auto ${classes.modalContent}`}>
              {/* Header del Modal */}
              <div className={`flex items-center justify-between border-b pb-4 ${classes.divider}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-bold ${classes.textMain}`}>Nuevo Insumo / Materia Prima</h3>
                  <p className={`text-xs ${classes.textMuted}`}>Registra el insumo definiendo su unidad base indivisible para recetas e inventario</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold transition-colors cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-5 text-xs">
              {/* Bloque 1: Identificación del Insumo */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${classes.subCard}`}>
                <div className={`flex items-center gap-2 pb-1 border-b ${classes.divider}`}>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                  >
                    1
                  </span>
                  <h4 className={`font-semibold text-xs ${classes.textMain}`}>Identificación del Insumo</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className={`block font-semibold ${classes.textMuted}`}>
                      Nombre del Insumo <span style={{ color: buttonColor }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej: Café Mezcla Espresso, Leche Entera, Vaso Térmico 12oz, Tapa Domo..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border font-medium text-xs focus:outline-none ${classes.input}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className={`block font-semibold ${classes.textMuted}`}>SKU / Código</label>
                      <span className={`text-[10px] ${classes.textSub}`}>Opcional</span>
                    </div>
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      placeholder="Ej: INS-001"
                      className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                    />
                  </div>
                </div>
              </div>

              {/* Bloque 2: Unidad de Medida Base y Costos */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${classes.subCard}`}>
                <div className={`flex items-center gap-2 pb-1 border-b ${classes.divider}`}>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                  >
                    2
                  </span>
                  <h4 className={`font-semibold text-xs ${classes.textMain}`}>Unidad Base y Parámetros de Stock</h4>
                </div>

                <div className="space-y-1.5">
                  <label className={`block font-semibold ${classes.textMuted}`}>
                    Unidad de Medida Base <span style={{ color: buttonColor }}>*</span>
                  </label>
                  <select
                    value={form.baseUnit}
                    onChange={(e) => setForm({ ...form, baseUnit: e.target.value })}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-medium text-xs focus:outline-none cursor-pointer ${classes.input}`}
                  >
                    {Object.values(UNIT_DEFINITIONS).map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label} ({u.symbol}) — {u.desc}
                      </option>
                    ))}
                  </select>
                  <p className={`text-[11px] flex items-center gap-1.5 pt-0.5 ${classes.textSub}`}>
                    <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: buttonColor }} />
                    <span>Es la unidad con la que se descuenta en recetas (ej: gramos para café, ml para leche, piezas para vasos, tapas, charolas o bolsas).</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className={`block font-semibold ${classes.textMuted}`}>Costo Unitario Base</label>
                    <div className="relative">
                      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-xs ${classes.textSub}`}>$</span>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={form.costPerUnit}
                        onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
                        placeholder="0.0000"
                        className={`w-full pl-8 pr-16 py-2.5 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border text-[10px] font-mono ${classes.badge}`}>
                        / {formatUnitSymbol(form.baseUnit)}
                      </span>
                    </div>
                    <span className={`text-[10px] block ${classes.textSub}`}>
                      Costo estimado por cada {formatUnitName(form.baseUnit)} ({formatUnitSymbol(form.baseUnit)})
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`block font-semibold ${classes.textMuted}`}>Punto de Reorden (Mínimo)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.reorderPoint}
                        onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
                        placeholder="Sin alerta"
                        className={`w-full pl-3.5 pr-16 py-2.5 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border text-[10px] font-mono ${classes.badge}`}>
                        {formatUnitSymbol(form.baseUnit)}
                      </span>
                    </div>
                    <span className={`text-[10px] block ${classes.textSub}`}>
                      Alerta cuando las existencias totales bajen de este nivel
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloque 3: Presentación Comercial de Compra (Opcional) */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${classes.subCard}`}>
                <div className={`flex items-center justify-between pb-1 border-b ${classes.divider}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                    >
                      3
                    </span>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-500" />
                      <h4 className={`font-semibold text-xs ${classes.textMain}`}>Presentación de Compra Habitual</h4>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${classes.badge}`}>Opcional</span>
                </div>

                <p className={`text-[11px] ${classes.textMuted}`}>
                  Si compras este insumo en cajas, paquetes o bultos, configúralo aquí para que al recibir compras se convierta automáticamente a piezas, gramos o mililitros.
                </p>

                <div className="space-y-1.5">
                  <label className={`block font-semibold ${classes.textMuted}`}>Nombre de la Presentación</label>
                  <input
                    type="text"
                    value={form.presentationName}
                    onChange={(e) => setForm({ ...form, presentationName: e.target.value })}
                    placeholder="Ej: Caja x 1,000 Vasos, Manga x 50 Tapas, Costal de 25 kg, Caja x 12 L"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={`block font-semibold ${classes.textMuted}`}>Contenido por Presentación</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.presentationFactor}
                        onChange={(e) => setForm({ ...form, presentationFactor: e.target.value })}
                        placeholder="Ej: 12000 si son 12 L en ml"
                        className={`w-full pl-3.5 pr-16 py-2.5 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border text-[10px] font-mono ${classes.badge}`}>
                        {formatUnitSymbol(form.baseUnit)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`block font-semibold ${classes.textMuted}`}>Costo Estimado del Empaque</label>
                    <div className="relative">
                      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-xs ${classes.textSub}`}>$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.presentationCost}
                        onChange={(e) => setForm({ ...form, presentationCost: e.target.value })}
                        placeholder="0.00"
                        className={`w-full pl-8 pr-16 py-2.5 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border text-[10px] font-mono ${classes.badge}`}>
                        MXN
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calculadora en vivo de costo unitario */}
                {Number(form.presentationFactor) > 0 && Number(form.presentationCost) > 0 && (
                  <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <Calculator className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Costo calculado por {formatUnitName(form.baseUnit)}:{' '}
                        <strong className="font-mono font-bold text-amber-800 dark:text-amber-200">
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
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>⚡ Usar como Costo Base</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className={`flex items-center justify-end gap-3 pt-3 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2.5 rounded-xl border font-semibold text-xs transition-colors cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 hover:opacity-95"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Insumo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* Modal Editar Insumo y Corrección de Stock */}
      {showEditModal && editingItem && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className={`w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl border shadow-2xl flex flex-col p-6 sm:p-7 space-y-6 my-auto ${classes.modalContent}`}>
              {/* Header del Modal */}
              <div className={`flex items-center justify-between border-b pb-4 ${classes.divider}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-bold ${classes.textMain}`}>Editar Insumo / Materia Prima</h3>
                  <p className={`text-xs ${classes.textMuted}`}>Modifica datos del insumo, estado activo/inactivo o corrige existencias de stock</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold transition-colors cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5 text-xs">
              {/* Tarjeta de Estado Activo / Inactivo */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${classes.subCard}`}>
                <div>
                  <strong className={`block font-semibold text-xs ${classes.textMain}`}>Estado en Catálogo</strong>
                  <span className={`text-[11px] ${classes.textMuted}`}>
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
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{editForm.active ? 'Activo' : 'Inactivo'}</span>
                </button>
              </div>

              {/* Tarjeta: Datos Generales */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${classes.subCard}`}>
                <h4 className={`font-semibold text-xs pb-1 border-b ${classes.textMain} ${classes.divider}`}>
                  Identificación del Insumo
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className={`block font-semibold ${classes.textMuted}`}>
                      Nombre del Insumo <span style={{ color: buttonColor }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border font-medium text-xs focus:outline-none ${classes.input}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`block font-semibold ${classes.textMuted}`}>SKU / Código</label>
                    <input
                      type="text"
                      value={editForm.sku}
                      onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                    />
                  </div>
                </div>
              </div>

              {/* Tarjeta: Unidad Base y Parámetros */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${classes.subCard}`}>
                <h4 className={`font-semibold text-xs pb-1 border-b ${classes.textMain} ${classes.divider}`}>
                  Unidad de Medida Base y Costos
                </h4>

                <div className="space-y-1.5">
                  <label className={`block font-semibold ${classes.textMuted}`}>Unidad Base</label>
                  <select
                    value={editForm.baseUnit}
                    onChange={(e) => setEditForm({ ...editForm, baseUnit: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-medium text-xs focus:outline-none cursor-pointer ${classes.input}`}
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
                    <label className={`block font-semibold ${classes.textMuted}`}>Costo Unitario Base</label>
                    <div className="relative">
                      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-xs ${classes.textSub}`}>$</span>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={editForm.costPerUnit}
                        onChange={(e) => setEditForm({ ...editForm, costPerUnit: e.target.value })}
                        className={`w-full pl-8 pr-16 py-2.5 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border text-[10px] font-mono ${classes.badge}`}>
                        / {formatUnitSymbol(editForm.baseUnit)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`block font-semibold ${classes.textMuted}`}>Punto de Reorden (Mínimo)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Sin alerta"
                        value={editForm.reorderPoint}
                        onChange={(e) => setEditForm({ ...editForm, reorderPoint: e.target.value })}
                        className={`w-full pl-3.5 pr-16 py-2.5 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border text-[10px] font-mono ${classes.badge}`}>
                        {formatUnitSymbol(editForm.baseUnit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Corrección Directa de Stock */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <RefreshCw className="w-4 h-4 flex-shrink-0" />
                  <strong className="text-xs font-semibold">Corregir / Ajustar Existencias Actuales en Almacén</strong>
                </div>
                <p className={`text-[11px] ${classes.textMuted}`}>
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
                      className={`w-full pl-3.5 pr-16 py-2.5 rounded-xl border font-mono font-bold text-sm focus:outline-none text-center ${classes.input}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-mono font-semibold">
                      {formatUnitSymbol(editForm.baseUnit)}
                    </span>
                  </div>
                  <span className={`text-[11px] ${classes.textSub}`}>
                    Ajustará el stock en el almacén principal automáticamente creando un movimiento de corrección.
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className={`flex items-center justify-end gap-3 pt-3 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2.5 rounded-xl border font-semibold text-xs transition-colors cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submittingEdit}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 hover:opacity-95"
                >
                  {submittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* MODAL REGISTRAR MERMA / DESPERDICIO */}
      {showWasteModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className={`w-full max-w-lg rounded-3xl border shadow-2xl flex flex-col p-6 sm:p-7 space-y-5 my-auto ${classes.modalContent}`}>
              {/* Header */}
              <div className={`flex items-center justify-between border-b pb-4 ${classes.divider}`}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${classes.textMain}`}>Registrar Merma / Desperdicio</h3>
                    <p className={`text-xs ${classes.textMuted}`}>Deduce del inventario producto vencido, derrames o calibración</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWasteModal(false)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold transition-colors cursor-pointer ${classes.buttonGhost}`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveWaste} className="space-y-4 text-xs">
                {/* Selector de Insumo */}
                <div className="space-y-1.5">
                  <label className={`block font-semibold ${classes.textMuted}`}>
                    Insumo / Materia Prima <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedWasteItemId}
                    onChange={(e) => setSelectedWasteItemId(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${classes.input}`}
                  >
                    {items.map((i) => {
                      const totalStock = i.warehouseStock.reduce(
                        (acc, ws) => acc + (Number((ws as any).quantity ?? ws.currentStock) || 0),
                        0
                      )
                      return (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.sku || 'SIN-SKU'}) — Stock: {totalStock.toLocaleString('es-MX')} {formatUnitSymbol(i.baseUnit)}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Motivo de la Merma */}
                <div className="space-y-1.5">
                  <label className={`block font-semibold ${classes.textMuted}`}>
                    Motivo / Causa del Desperdicio <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      'Calibración de Molino / Espresso',
                      'Caducidad o Descomposición',
                      'Derrame o Accidente',
                      'Empaque / Insumo Dañado',
                      'Error en Barra / Preparación',
                      'Degustación / Muestra',
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setWasteReason(reason)}
                        className={`p-2 rounded-xl border text-[11px] font-medium text-left transition-all cursor-pointer ${
                          wasteReason === reason
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold'
                            : `${classes.buttonGhost}`
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cantidad Desperdiciada y Costo Estimado */}
                {(() => {
                  const currentItem = items.find((i) => i.id === selectedWasteItemId)
                  const unitSymbol = currentItem ? formatUnitSymbol(currentItem.baseUnit) : ''
                  const costPerUnit = currentItem ? Number(currentItem.costPerUnit) : 0
                  const totalEstimatedCost = (Number(wasteQuantity) || 0) * costPerUnit

                  return (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className={`block font-semibold ${classes.textMuted}`}>
                          Cantidad a Deducir de Almacén <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0.000001"
                            required
                            value={wasteQuantity}
                            onChange={(e) => setWasteQuantity(e.target.value)}
                            placeholder="Ej: 50, 200, 1..."
                            className={`w-full pl-3.5 pr-16 py-2.5 rounded-xl border font-mono font-bold text-sm focus:outline-none ${classes.input}`}
                          />
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold ${classes.badge}`}>
                            {unitSymbol}
                          </span>
                        </div>
                      </div>

                      {/* Estimación de Impacto en Costo */}
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold block">
                            Pérdida Económica Estimada
                          </span>
                          <span className={`text-[10px] ${classes.textMuted}`}>
                            Costo de reposición: ${costPerUnit.toFixed(2)} MXN / {unitSymbol}
                          </span>
                        </div>
                        <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                          ${totalEstimatedCost.toFixed(2)} MXN
                        </span>
                      </div>
                    </div>
                  )
                })()}

                {/* Notas adicionales */}
                <div className="space-y-1.5">
                  <label className={`block font-medium ${classes.textMuted}`}>
                    Observaciones o Justificación (Opcional)
                  </label>
                  <input
                    type="text"
                    value={wasteNotes}
                    onChange={(e) => setWasteNotes(e.target.value)}
                    placeholder="Ej: Se cayó el galón al reponer, fecha de caducidad superada..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                  />
                </div>

                {/* Botones de acción */}
                <div className={`flex items-center justify-end gap-3 pt-3 border-t ${classes.divider}`}>
                  <button
                    type="button"
                    onClick={() => setShowWasteModal(false)}
                    className={`px-4 py-2.5 rounded-xl border font-semibold text-xs transition-colors cursor-pointer ${classes.buttonGhost}`}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={submittingWaste || !wasteQuantity || Number(wasteQuantity) <= 0}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingWaste ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <AlertOctagon className="w-3.5 h-3.5" />
                    )}
                    <span>Registrar Merma</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL HISTORIAL DE MERMAS */}
      {showWasteHistoryModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl flex flex-col p-6 sm:p-7 space-y-5 my-auto ${classes.modalContent}`}>
              <div className={`flex items-center justify-between border-b pb-4 ${classes.divider}`}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${classes.textMain}`}>Historial de Mermas y Desperdicios</h3>
                    <p className={`text-xs ${classes.textMuted}`}>Auditoría de salidas por caducidad, calibración y derrames</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWasteHistoryModal(false)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold transition-colors cursor-pointer ${classes.buttonGhost}`}
                >
                  ✕
                </button>
              </div>

              {loadingWasteHistory ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs">Cargando registros de merma...</span>
                </div>
              ) : wasteHistory.length === 0 ? (
                <div className={`py-12 text-center text-xs ${classes.textMuted}`}>
                  No se han registrado mermas o desperdicios en este periodo.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {wasteHistory.map((w) => (
                    <div
                      key={w.id}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${classes.subCard}`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20">
                            -{w.quantity} {formatUnitSymbol(w.baseUnit)}
                          </span>
                          <strong className={`truncate font-semibold ${classes.textMain}`}>
                            {w.itemName}
                          </strong>
                        </div>
                        <p className={`text-[11px] ${classes.textMuted}`}>
                          {w.reason}
                        </p>
                        <span className={`text-[10px] ${classes.textSub}`}>
                          {new Date(w.createdAt).toLocaleString('es-MX', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">Costo estimado:</span>
                        <strong className="text-sm font-mono text-rose-600 dark:text-rose-400 font-bold">
                          -${w.totalCost.toFixed(2)} MXN
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={`flex justify-end pt-3 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowWasteHistoryModal(false)}
                  className={`px-4 py-2.5 rounded-xl border font-semibold text-xs transition-colors cursor-pointer ${classes.buttonGhost}`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      </main>
    </div>
  )
}

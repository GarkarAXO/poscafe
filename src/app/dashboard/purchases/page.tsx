'use client'

import { useState, useEffect } from 'react'
import {
  Truck,
  Plus,
  Search,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  Package,
  Layers,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit2,
  Eye,
  X,
  Loader2,
  ArrowRight,
  TrendingUp,
  Receipt,
  Phone,
  Mail,
  User,
  ShieldAlert,
  ShoppingBag,
  Boxes,
  Sparkles,
  Calculator,
  HelpCircle,
  Tag,
  PlusCircle,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { UNIT_DEFINITIONS, formatUnitName, formatUnitSymbol, formatUnitFull } from '@/lib/units'
import { generateSkuFromName } from '@/lib/sku'
import { useDashboardTheme } from '@/context/dashboard-theme-context'

interface Supplier {
  id: string
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  taxId: string | null
  active: boolean
  _count?: { purchases: number }
}

interface PurchaseItemPreview {
  id: string
  itemName: string
  baseUnit: string
  presentationName: string | null
  quantityBought: number
  unitCost: number
  subtotal: number
  quantityBaseCalculated: number
}

interface Purchase {
  id: string
  invoiceNumber: string
  purchasedAt: string
  status: string
  entryType: 'SUPPLIER' | 'EMERGENCY_STORE' | 'INITIAL_STOCK'
  total: number
  notes: string | null
  supplier: { id: string; name: string; phone: string | null; contact: string | null } | null
  branch: { id: string; name: string; code: string }
  itemsCount: number
  items: PurchaseItemPreview[]
}

interface InventoryItemOption {
  id: string
  name: string
  sku: string | null
  baseUnit: string
  costPerUnit: number
  presentations: Array<{ id: string; name: string; factorToBase: number }>
}

interface WarehouseOption {
  id: string
  name: string
  isDefault: boolean
}

interface PurchaseFormItem {
  isNewItem: boolean
  inventoryItemId: string
  newItemName: string
  baseUnit: string
  sku: string
  inventoryPresentationId: string
  quantityBought: string
  unitCost: string
  totalCostInput: string
  calcMode: 'UNIT' | 'TOTAL'
}

export default function PurchasesPage() {
  const {
    isLight,
    buttonColor,
    primaryColor,
    secondaryColor,
    contrastTextButton,
    contrastTextPrimary,
    classes,
  } = useDashboardTheme()

  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases')
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItemOption[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])

  // Filtros
  const [searchPurchase, setSearchPurchase] = useState('')
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('ALL')
  const [selectedEntryTypeFilter, setSelectedEntryTypeFilter] = useState('ALL')
  const [searchSupplier, setSearchSupplier] = useState('')

  // Modales
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditPurchaseModal, setShowEditPurchaseModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)

  // Formulario Proveedor
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    taxId: '',
  })
  const [savingSupplier, setSavingSupplier] = useState(false)

  // Formulario Compra / Entrada de Inventario
  const [purchaseForm, setPurchaseForm] = useState<{
    entryType: 'SUPPLIER' | 'EMERGENCY_STORE' | 'INITIAL_STOCK'
    supplierId: string
    invoiceNumber: string
    purchasedAt: string
    warehouseId: string
    notes: string
    items: PurchaseFormItem[]
  }>({
    entryType: 'SUPPLIER',
    supplierId: '',
    invoiceNumber: '',
    purchasedAt: new Date().toISOString().slice(0, 10),
    warehouseId: '',
    notes: '',
    items: [
      {
        isNewItem: false,
        inventoryItemId: '',
        newItemName: '',
        baseUnit: 'KG',
        sku: '',
        inventoryPresentationId: '',
        quantityBought: '1',
        unitCost: '',
        totalCostInput: '',
        calcMode: 'UNIT',
      },
    ],
  })
  const [savingPurchase, setSavingPurchase] = useState(false)

  // Formulario Editar Compra
  const [editPurchaseForm, setEditPurchaseForm] = useState({
    invoiceNumber: '',
    supplierId: '',
    notes: '',
    purchasedAt: '',
    entryType: 'SUPPLIER' as 'SUPPLIER' | 'EMERGENCY_STORE' | 'INITIAL_STOCK',
  })
  const [savingEditPurchase, setSavingEditPurchase] = useState(false)

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true)
      const [resPurchases, resSuppliers, resInv, resWarehouses] = await Promise.all([
        fetch('/api/purchases').then((r) => r.json()),
        fetch('/api/suppliers').then((r) => r.json()),
        fetch('/api/inventory/items').then((r) => r.json()),
        fetch('/api/warehouses').then((r) => r.json()),
      ])

      if (resPurchases.success) setPurchases(resPurchases.data)
      if (resSuppliers.success) setSuppliers(resSuppliers.data)
      if (resInv.success) setInventoryItems(resInv.data)
      if (resWarehouses.success) setWarehouses(resWarehouses.data)
    } catch {
      notify.error('Error de conexión', 'No se pudieron sincronizar compras y proveedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Métricas
  const totalPurchasesMonth = purchases
    .filter((p) => p.status === 'COMPLETED')
    .reduce((acc, curr) => acc + curr.total, 0)
  const activeSuppliersCount = suppliers.filter((s) => s.active).length
  const completedPurchasesCount = purchases.filter((p) => p.status === 'COMPLETED').length

  // Manejo de Formulario Proveedor
  const handleOpenNewSupplier = () => {
    setEditingSupplier(null)
    setSupplierForm({ name: '', contact: '', phone: '', email: '', taxId: '' })
    setShowSupplierModal(true)
  }

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup)
    setSupplierForm({
      name: sup.name,
      contact: sup.contact || '',
      phone: sup.phone || '',
      email: sup.email || '',
      taxId: sup.taxId || '',
    })
    setShowSupplierModal(true)
  }

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierForm.name.trim()) {
      notify.warning('Nombre requerido', 'Ingresa el nombre comercial del proveedor')
      return
    }

    setSavingSupplier(true)
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers'
      const method = editingSupplier ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm),
      })
      const json = await res.json()

      if (json.success) {
        setShowSupplierModal(false)
        notify.success(
          editingSupplier ? 'Proveedor actualizado' : 'Proveedor creado',
          `${supplierForm.name} ha sido guardado exitosamente`
        )
        loadData()
      } else {
        notify.error('Error al guardar', json.error?.message || 'No se pudo guardar el proveedor')
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible comunicar con el servidor')
    } finally {
      setSavingSupplier(false)
    }
  }

  const handleDeleteSupplier = (sup: Supplier) => {
    notify.action({
      title: `¿Eliminar ${sup.name}?`,
      description: 'Si tiene compras asociadas se desactivará; de lo contrario se eliminará.',
      buttonText: 'Confirmar Eliminación',
      onAction: async () => {
        try {
          const res = await fetch(`/api/suppliers/${sup.id}`, { method: 'DELETE' })
          const json = await res.json()
          if (json.success) {
            notify.success('Proveedor procesado', json.message)
            loadData()
          } else {
            notify.error('Error', json.error?.message || 'No se pudo eliminar')
          }
        } catch {
          notify.error('Error', 'Falla de conexión')
        }
      },
    })
  }

  // Manejo de Formulario de Compra
  const handleOpenNewPurchase = (type: 'SUPPLIER' | 'EMERGENCY_STORE' | 'INITIAL_STOCK' = 'SUPPLIER') => {
    const defaultWarehouse = warehouses.find((w) => w.isDefault) || warehouses[0]
    const initialItem = inventoryItems[0]

    let defaultInvoice = ''
    let defaultNotes = ''
    if (type === 'INITIAL_STOCK') {
      defaultInvoice = `INI-${Date.now().toString().slice(-4)}`
      defaultNotes = 'Carga de saldo inicial de existencias para arranque de operaciones'
    } else if (type === 'EMERGENCY_STORE') {
      defaultInvoice = `TDA-${Date.now().toString().slice(-4)}`
      defaultNotes = 'Compra rápida de mostrador / tiendita para abastecer turno'
    }

    setPurchaseForm({
      entryType: type,
      supplierId: type === 'SUPPLIER' ? suppliers[0]?.id || '' : '',
      invoiceNumber: defaultInvoice,
      purchasedAt: new Date().toISOString().slice(0, 10),
      warehouseId: defaultWarehouse?.id || '',
      notes: defaultNotes,
      items: [
        {
          isNewItem: false,
          inventoryItemId: initialItem?.id || '',
          newItemName: '',
          baseUnit: 'KG',
          sku: '',
          inventoryPresentationId: '',
          quantityBought: '1',
          unitCost: initialItem?.costPerUnit ? initialItem.costPerUnit.toString() : '0',
          totalCostInput: initialItem?.costPerUnit ? initialItem.costPerUnit.toString() : '0',
          calcMode: 'UNIT',
        },
      ],
    })
    setShowPurchaseModal(true)
  }

  const handleAddItemRow = (asNew: boolean = false) => {
    const defaultItem = inventoryItems[0]
    setPurchaseForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          isNewItem: asNew,
          inventoryItemId: asNew ? '' : defaultItem?.id || '',
          newItemName: '',
          baseUnit: 'KG',
          sku: '',
          inventoryPresentationId: '',
          quantityBought: '1',
          unitCost: !asNew && defaultItem?.costPerUnit ? defaultItem.costPerUnit.toString() : '0',
          totalCostInput: !asNew && defaultItem?.costPerUnit ? defaultItem.costPerUnit.toString() : '0',
          calcMode: 'UNIT',
        },
      ],
    }))
  }

  const handleRemoveItemRow = (index: number) => {
    if (purchaseForm.items.length <= 1) return
    setPurchaseForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  // Calculadora interactiva por renglón
  const handleItemChange = (index: number, field: string, value: any) => {
    setPurchaseForm((prev) => {
      const nextItems = [...prev.items]
      const current = { ...nextItems[index] }

      if (field === 'isNewItem') {
        const isNew = value === true || value === 'true'
        current.isNewItem = isNew
        if (isNew) {
          current.inventoryItemId = ''
          current.inventoryPresentationId = ''
          if (current.newItemName) {
            current.sku = generateSkuFromName(current.newItemName)
          }
        } else {
          current.inventoryItemId = inventoryItems[0]?.id || ''
          const itemObj = inventoryItems[0]
          const cost = itemObj?.costPerUnit ? Number(itemObj.costPerUnit) : 0
          current.unitCost = cost.toString()
          const qty = Number(current.quantityBought) || 1
          current.totalCostInput = (qty * cost).toFixed(2)
        }
      } else if (field === 'newItemName') {
        current.newItemName = value
        // Autogenerar SKU a partir de fragmentos del nombre si no hay SKU personalizado
        current.sku = generateSkuFromName(value)
      } else if (field === 'sku') {
        current.sku = (value || '').toUpperCase()
      } else if (field === 'baseUnit') {
        current.baseUnit = value
      } else if (field === 'inventoryItemId') {
        current.inventoryItemId = value
        current.inventoryPresentationId = ''
        const itemObj = inventoryItems.find((it) => it.id === value)
        const cost = itemObj?.costPerUnit ? Number(itemObj.costPerUnit) : 0
        current.unitCost = cost.toString()
        const qty = Number(current.quantityBought) || 1
        current.totalCostInput = (qty * cost).toFixed(2)
      } else if (field === 'inventoryPresentationId') {
        current.inventoryPresentationId = value
      } else if (field === 'calcMode') {
        current.calcMode = value as 'UNIT' | 'TOTAL'
      } else if (field === 'quantityBought') {
        current.quantityBought = value
        const qty = Number(value) || 1
        if (current.calcMode === 'TOTAL') {
          const tot = Number(current.totalCostInput) || 0
          current.unitCost = qty > 0 ? (tot / qty).toFixed(4) : '0'
        } else {
          const u = Number(current.unitCost) || 0
          current.totalCostInput = (qty * u).toFixed(2)
        }
      } else if (field === 'unitCost') {
        current.unitCost = value
        const qty = Number(current.quantityBought) || 1
        const u = Number(value) || 0
        current.totalCostInput = (qty * u).toFixed(2)
      } else if (field === 'totalCostInput') {
        current.totalCostInput = value
        const qty = Number(current.quantityBought) || 1
        const tot = Number(value) || 0
        current.unitCost = qty > 0 ? (tot / qty).toFixed(4) : '0'
      }

      nextItems[index] = current
      return { ...prev, items: nextItems }
    })
  }

  // Calcular total proyectado de la compra en el formulario
  const calculatedTotal = purchaseForm.items.reduce((acc, it) => {
    const q = Number(it.quantityBought) || 0
    const c = Number(it.unitCost) || 0
    return acc + q * c
  }, 0)

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault()

    const hasInvalidItem = purchaseForm.items.some((it) => {
      if (it.isNewItem) {
        return !it.newItemName.trim()
      }
      return !it.inventoryItemId
    })

    if (hasInvalidItem) {
      notify.warning(
        'Insumo requerido',
        'Indica el nombre del insumo nuevo o selecciona uno existente en cada renglón'
      )
      return
    }

    if (
      purchaseForm.items.some(
        (it) => Number(it.quantityBought) <= 0 || Number(it.unitCost) < 0
      )
    ) {
      notify.warning(
        'Valores inválidos',
        'La cantidad y el costo deben ser números válidos mayores a cero'
      )
      return
    }

    setSavingPurchase(true)
    try {
      const payload = {
        entryType: purchaseForm.entryType,
        supplierId:
          purchaseForm.entryType === 'SUPPLIER'
            ? purchaseForm.supplierId || undefined
            : undefined,
        invoiceNumber: purchaseForm.invoiceNumber.trim() || undefined,
        purchasedAt: purchaseForm.purchasedAt,
        warehouseId: purchaseForm.warehouseId || undefined,
        notes: purchaseForm.notes.trim() || undefined,
        items: purchaseForm.items.map((it) => ({
          inventoryItemId: it.isNewItem ? undefined : it.inventoryItemId,
          isNewItem: it.isNewItem,
          newItemName: it.isNewItem ? it.newItemName.trim() : undefined,
          baseUnit: it.isNewItem ? it.baseUnit : undefined,
          sku: it.isNewItem ? it.sku.trim() : undefined,
          inventoryPresentationId:
            !it.isNewItem && it.inventoryPresentationId
              ? it.inventoryPresentationId
              : undefined,
          quantityBought: Number(it.quantityBought),
          unitCost: Number(it.unitCost),
        })),
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        setShowPurchaseModal(false)
        notify.success(
          'Entrada Registrada',
          json.message || 'Se incrementó el stock en almacén exitosamente'
        )
        loadData()
      } else {
        notify.error('Error al registrar', json.error?.message || 'No se pudo guardar la compra')
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible comunicar con el servidor')
    } finally {
      setSavingPurchase(false)
    }
  }

  // Manejo de Edición de Compra
  const handleOpenEditPurchase = (p: Purchase) => {
    setEditingPurchase(p)
    setEditPurchaseForm({
      invoiceNumber: p.invoiceNumber === 'S/N' ? '' : p.invoiceNumber,
      supplierId: p.supplier?.id || '',
      notes: p.notes || '',
      purchasedAt: p.purchasedAt ? new Date(p.purchasedAt).toISOString().slice(0, 10) : '',
      entryType: p.entryType || 'SUPPLIER',
    })
    setShowEditPurchaseModal(true)
  }

  const handleSaveEditPurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPurchase) return

    setSavingEditPurchase(true)
    try {
      const res = await fetch(`/api/purchases/${editingPurchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPurchaseForm),
      })
      const json = await res.json()

      if (json.success) {
        setShowEditPurchaseModal(false)
        notify.success('Entrada actualizada', 'Los datos del registro han sido guardados')
        loadData()
      } else {
        notify.error('Error al actualizar', json.error?.message || 'No se pudo guardar los cambios')
      }
    } catch {
      notify.error('Error de conexión', 'Falla de comunicación con el servidor')
    } finally {
      setSavingEditPurchase(false)
    }
  }

  // Cancelar compra y revertir stock
  const handleCancelPurchase = (p: Purchase) => {
    notify.action({
      title: `¿Cancelar compra ${p.invoiceNumber}?`,
      description: `Se descontarán del inventario los insumos que entraron por un valor de $${p.total.toFixed(2)} MXN.`,
      buttonText: 'Confirmar Cancelación y Reversión',
      onAction: async () => {
        try {
          const res = await fetch(`/api/purchases/${p.id}`, { method: 'DELETE' })
          const json = await res.json()
          if (json.success) {
            notify.success('Compra cancelada', json.message)
            loadData()
          } else {
            notify.error('Error al cancelar', json.error?.message || 'No se pudo cancelar')
          }
        } catch {
          notify.error('Error de conexión', 'No fue posible comunicar con el servidor')
        }
      },
    })
  }

  // Filtrado de Compras
  const filteredPurchases = purchases.filter((p) => {
    const matchesSupplier =
      selectedSupplierFilter === 'ALL' || p.supplier?.id === selectedSupplierFilter
    const matchesEntryType =
      selectedEntryTypeFilter === 'ALL' || p.entryType === selectedEntryTypeFilter
    const matchesSearch =
      p.invoiceNumber.toLowerCase().includes(searchPurchase.toLowerCase()) ||
      (p.supplier?.name && p.supplier.name.toLowerCase().includes(searchPurchase.toLowerCase())) ||
      p.items.some((it) => it.itemName.toLowerCase().includes(searchPurchase.toLowerCase()))
    return matchesSupplier && matchesEntryType && matchesSearch
  })

  // Filtrado de Proveedores
  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchSupplier.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contact && s.contact.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.taxId && s.taxId.toLowerCase().includes(q))
    )
  })

  if (loading) {
    return (
      <div className={`p-8 flex flex-col items-center justify-center min-h-[60vh] gap-3 ${classes.textMuted}`}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: buttonColor }} />
        <p className="text-sm">Cargando compras, entradas de almacén y proveedores...</p>
      </div>
    )
  }

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${classes.textMain}`}>
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2.5 ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
            <Truck className="w-6 h-6" style={{ color: buttonColor }} />
            Compras
          </h1>
          <p className={`text-xs mt-1 ${classes.textMuted}`}>
            Carga de tickets y facturas de compra, abastecimiento directo al inventario y directorio de proveedores
          </p>
        </div>

        {/* Botones de acción rápida */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'purchases' ? (
            <>
              {/* Carga de Stock Inicial */}
              <button
                type="button"
                onClick={() => handleOpenNewPurchase('INITIAL_STOCK')}
                className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border ${classes.buttonGhost}`}
                title="Cargar saldo inicial de materias primas para arrancar operaciones"
              >
                <Boxes className="w-4 h-4 text-violet-400" />
                <span>Cargar Stock Inicial</span>
              </button>

              {/* Compra Rápida de Tiendita */}
              <button
                type="button"
                onClick={() => handleOpenNewPurchase('EMERGENCY_STORE')}
                className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
                title="Compra de emergencia en tiendita o minisúper para sacar pedidos"
              >
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>Compra Tiendita / Caja Chica</span>
              </button>

              {/* Compra Formal a Proveedor */}
              <button
                type="button"
                onClick={() => handleOpenNewPurchase('SUPPLIER')}
                style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                className="px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-black/10 transition-all cursor-pointer hover:opacity-95"
              >
                <Plus className="w-4 h-4" />
                <span>Compra a Proveedor</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleOpenNewSupplier}
              style={{ backgroundColor: buttonColor, color: contrastTextButton }}
              className="px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-black/10 transition-all cursor-pointer hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Proveedor</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-3xl border flex items-center justify-between shadow-sm ${classes.card}`}>
          <div>
            <span className={`text-xs block font-medium ${classes.textMuted}`}>Inversión en Insumos</span>
            <strong className={`text-xl font-black font-mono ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
              ${totalPurchasesMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </strong>
          </div>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
            style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
          >
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-4 rounded-3xl border flex items-center justify-between shadow-sm ${classes.card}`}>
          <div>
            <span className={`text-xs block font-medium ${classes.textMuted}`}>Entradas Completadas</span>
            <strong className={`text-xl font-bold font-mono ${classes.textMain}`}>
              {completedPurchasesCount} entradas
            </strong>
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
            isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-4 rounded-3xl border flex items-center justify-between shadow-sm ${classes.card}`}>
          <div>
            <span className={`text-xs block font-medium ${classes.textMuted}`}>Proveedores Registrados</span>
            <strong className={`text-xl font-bold font-mono ${classes.textMain}`}>
              {activeSuppliersCount} activos
            </strong>
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
            isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/10 text-blue-400'
          }`}>
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className={`flex gap-4 border-b text-xs ${classes.divider}`}>
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          style={activeTab === 'purchases' ? { borderColor: buttonColor, color: buttonColor } : undefined}
          className={`pb-3 font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'purchases'
              ? 'border-b-2'
              : `${classes.textMuted} hover:${classes.textMain}`
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Compras y Tickets ({purchases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          style={activeTab === 'suppliers' ? { borderColor: buttonColor, color: buttonColor } : undefined}
          className={`pb-3 font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'suppliers'
              ? 'border-b-2'
              : `${classes.textMuted} hover:${classes.textMain}`
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Directorio de Proveedores ({suppliers.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: HISTORIAL DE COMPRAS Y ENTRADAS */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border ${classes.card}`}>
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute left-3 top-2.5 ${classes.textMuted}`} />
              <input
                type="text"
                placeholder="Buscar por folio, proveedor o insumo..."
                value={searchPurchase}
                onChange={(e) => setSearchPurchase(e.target.value)}
                className={`w-full pl-9 pr-4 py-1.5 rounded-xl border text-xs focus:outline-none ${classes.input}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por tipo de entrada */}
              <select
                value={selectedEntryTypeFilter}
                onChange={(e) => setSelectedEntryTypeFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${classes.input}`}
              >
                <option value="ALL">Todos los tipos de entrada</option>
                <option value="SUPPLIER">🏢 Compra a Proveedor</option>
                <option value="EMERGENCY_STORE">🏪 Tiendita / Caja Chica</option>
                <option value="INITIAL_STOCK">📦 Stock Inicial / Apertura</option>
              </select>

              {/* Filtro por proveedor */}
              <select
                value={selectedSupplierFilter}
                onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${classes.input}`}
              >
                <option value="ALL">Todos los proveedores</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de Compras */}
          <div className={`rounded-3xl border overflow-hidden shadow-sm ${classes.card}`}>
            {filteredPurchases.length === 0 ? (
              <div className={`p-12 text-center text-xs space-y-2 ${classes.textMuted}`}>
                <Truck className="w-10 h-10 opacity-40 mx-auto" />
                <p className={`font-semibold ${classes.textMain}`}>No se encontraron entradas registradas</p>
                <p>Usa los botones superiores para registrar compras a proveedores, tiendita o cargar tu stock inicial.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b uppercase font-semibold text-[10px] tracking-wider ${classes.tableHeader}`}>
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Tipo de Entrada</th>
                      <th className="py-3 px-4">Folio / Factura</th>
                      <th className="py-3 px-4">Proveedor / Origen</th>
                      <th className="py-3 px-4">Insumos Ingresados</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${classes.divider}`}>
                    {filteredPurchases.map((purchase) => {
                      const isCancelled = purchase.status === 'CANCELLED'

                      let typeBadge = (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit ${
                          isLight
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          <Building2 className="w-3 h-3" />
                          <span>Proveedor</span>
                        </span>
                      )
                      if (purchase.entryType === 'EMERGENCY_STORE') {
                        typeBadge = (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit ${
                            isLight
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            <ShoppingBag className="w-3 h-3" />
                            <span>Tiendita / Urgencia</span>
                          </span>
                        )
                      } else if (purchase.entryType === 'INITIAL_STOCK') {
                        typeBadge = (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit ${
                            isLight
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                          }`}>
                            <Boxes className="w-3 h-3" />
                            <span>Stock Inicial</span>
                          </span>
                        )
                      }

                      return (
                        <tr
                          key={purchase.id}
                          className={`transition-colors ${classes.tableRow} ${
                            isCancelled ? 'opacity-50' : ''
                          }`}
                        >
                          <td className={`py-3.5 px-4 font-mono ${classes.textMuted}`}>
                            {new Date(purchase.purchasedAt).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            {typeBadge}
                          </td>

                          <td className={`py-3.5 px-4 font-bold ${classes.textMain}`}>
                            {purchase.invoiceNumber}
                          </td>

                          <td className="py-3.5 px-4">
                            {purchase.supplier ? (
                              <div>
                                <span className={`font-semibold block ${classes.textMain}`}>{purchase.supplier.name}</span>
                                {purchase.supplier.contact && (
                                  <span className={`text-[10px] ${classes.textMuted}`}>{purchase.supplier.contact}</span>
                                )}
                              </div>
                            ) : (
                              <span className={`italic ${classes.textMuted}`}>
                                {purchase.entryType === 'INITIAL_STOCK'
                                  ? 'Inventario de Apertura'
                                  : 'Compra de Mostrador / Sin proveedor'}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5 max-w-xs">
                              {purchase.items.slice(0, 2).map((it) => (
                                <span key={it.id} className={`text-[11px] truncate ${classes.textMuted}`}>
                                  • {it.itemName} ({it.quantityBought} {it.presentationName || formatUnitName(it.baseUnit)})
                                </span>
                              ))}
                              {purchase.items.length > 2 && (
                                <span className={`text-[10px] font-semibold ${isLight ? 'text-amber-800' : 'text-amber-400/80'}`}>
                                  +{purchase.items.length - 2} insumos más...
                                </span>
                              )}
                            </div>
                          </td>

                          <td className={`py-3.5 px-4 font-mono font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                            ${purchase.total.toFixed(2)} MXN
                          </td>

                          <td className="py-3.5 px-4">
                            {isCancelled ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isLight
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                Cancelada / Revertida
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isLight
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                Aplicada en Almacén
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Ver detalle */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPurchase(purchase)
                                  setShowDetailModal(true)
                                }}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${classes.buttonGhost}`}
                                title="Ver desglose completo de insumos"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Editar datos (si no está cancelada) */}
                              {!isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPurchase(purchase)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${classes.buttonGhost}`}
                                  title="Editar folio, notas o proveedor"
                                >
                                  <Edit2 className="w-3.5 h-3.5" style={{ color: buttonColor }} />
                                </button>
                              )}

                              {/* Cancelar / Revertir (si no está cancelada) */}
                              {!isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelPurchase(purchase)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isLight
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                                  }`}
                                  title="Cancelar y revertir existencias del almacén"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: DIRECTORIO DE PROVEEDORES */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border ${classes.card}`}>
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute left-3 top-2.5 ${classes.textMuted}`} />
              <input
                type="text"
                placeholder="Buscar por nombre, contacto, teléfono o RFC..."
                value={searchSupplier}
                onChange={(e) => setSearchSupplier(e.target.value)}
                className={`w-full pl-9 pr-4 py-1.5 rounded-xl border text-xs focus:outline-none ${classes.input}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.length === 0 ? (
              <div className={`col-span-full p-12 text-center text-xs space-y-2 ${classes.textMuted}`}>
                <Building2 className="w-10 h-10 opacity-40 mx-auto" />
                <p className={`font-semibold ${classes.textMain}`}>No se encontraron proveedores</p>
                <p>Haz clic en "Nuevo Proveedor" para dar de alta distribuidores de café e insumos.</p>
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className={`p-4 rounded-3xl border transition-all flex flex-col justify-between space-y-3 ${classes.card} ${
                    supplier.active ? 'shadow-sm' : 'opacity-60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-bold text-base ${classes.textMain}`}>{supplier.name}</h3>
                        {supplier.taxId && (
                          <span className={`text-[10px] font-mono ${isLight ? 'text-amber-800' : 'text-amber-400/90'}`}>
                            RFC: {supplier.taxId}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          supplier.active
                            ? isLight
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : `${classes.badge}`
                        }`}
                      >
                        {supplier.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className={`text-xs space-y-1 pt-1 ${classes.textMuted}`}>
                      {supplier.contact && (
                        <p className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 opacity-60" />
                          <span>{supplier.contact}</span>
                        </p>
                      )}
                      {supplier.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 opacity-60" />
                          <span>{supplier.phone}</span>
                        </p>
                      )}
                      {supplier.email && (
                        <p className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 opacity-60" />
                          <span className="truncate">{supplier.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between pt-2 border-t text-xs ${classes.divider}`}>
                    <span className={`text-[11px] ${classes.textMuted}`}>
                      {supplier._count?.purchases || 0} compras registradas
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSupplier(supplier)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${classes.buttonGhost}`}
                        title="Editar proveedor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSupplier(supplier)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isLight
                            ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                        }`}
                        title="Eliminar o desactivar proveedor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR COMPRA / ENTRADA */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`w-full max-w-4xl max-h-[94vh] rounded-3xl border flex flex-col shadow-2xl animate-in zoom-in-95 my-auto overflow-hidden ${classes.modalContent}`}>
            {/* Cabecera del Modal */}
            <div className={`p-4 sm:px-6 border-b flex items-center justify-between shrink-0 ${classes.divider}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${classes.textMain}`}>Registrar Entrada de Insumos</h3>
                  <p className={`text-xs ${classes.textMuted}`}>
                    Calculadora asistida: ingresa paquetes completos o piezas sueltas de emergencia
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            {/* Formulario de Compra */}
            <form onSubmit={handleSavePurchase} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* Selector de Tipo de Entrada */}
              <div className="space-y-1.5">
                <label className={`font-bold block text-xs ${classes.textMain}`}>¿Qué tipo de entrada deseas realizar?</label>
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl border ${classes.subCard}`}>
                  <button
                    type="button"
                    onClick={() => setPurchaseForm((p) => ({ ...p, entryType: 'SUPPLIER' }))}
                    style={purchaseForm.entryType === 'SUPPLIER' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      purchaseForm.entryType === 'SUPPLIER'
                        ? 'font-bold shadow-md shadow-black/10'
                        : `${classes.buttonGhost}`
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Compra Proveedor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPurchaseForm((p) => ({ ...p, entryType: 'EMERGENCY_STORE' }))}
                    style={purchaseForm.entryType === 'EMERGENCY_STORE' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      purchaseForm.entryType === 'EMERGENCY_STORE'
                        ? 'font-bold shadow-md shadow-black/10'
                        : `${classes.buttonGhost}`
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Tiendita / Urgencia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPurchaseForm((p) => ({ ...p, entryType: 'INITIAL_STOCK' }))}
                    style={purchaseForm.entryType === 'INITIAL_STOCK' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      purchaseForm.entryType === 'INITIAL_STOCK'
                        ? 'font-bold shadow-md shadow-black/10'
                        : `${classes.buttonGhost}`
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Stock Inicial / Apertura</span>
                  </button>
                </div>

                {/* Banner de Ayuda Dinámico */}
                <div className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${classes.subCard}`}>
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: buttonColor }} />
                  <div className={classes.textMain}>
                    {purchaseForm.entryType === 'SUPPLIER' && (
                      <p>
                        <strong>Compra formal a proveedor:</strong> Registra facturas o remisiones con lote grande (cajas de 12 litros, sacos de café, etc.).
                      </p>
                    )}
                    {purchaseForm.entryType === 'EMERGENCY_STORE' && (
                      <p>
                        <strong>Compra de emergencia / Tiendita:</strong> Cuando se acaba un insumo en pleno turno y compras 1 o 2 piezas sueltas a precio de tienda sin factura formal.
                      </p>
                    )}
                    {purchaseForm.entryType === 'INITIAL_STOCK' && (
                      <p>
                        <strong>Inventario Inicial / Apertura:</strong> Úsalo para capturar las existencias con las que arrancas operaciones hoy. No requiere proveedor ni factura.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadatos de la Entrada */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Proveedor (solo si es SUPPLIER) */}
                {purchaseForm.entryType === 'SUPPLIER' ? (
                  <div className="space-y-1">
                    <label className={`font-medium ${classes.textMain}`}>Proveedor Comercial:</label>
                    <select
                      value={purchaseForm.supplierId}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                    >
                      <option value="">-- Sin proveedor asignado --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className={`font-medium ${classes.textMuted}`}>Origen de los insumos:</label>
                    <input
                      type="text"
                      disabled
                      value={
                        purchaseForm.entryType === 'EMERGENCY_STORE'
                          ? 'Tiendita de la esquina / Caja Chica'
                          : 'Saldo Inicial de Apertura'
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-xs opacity-75 ${classes.input}`}
                    />
                  </div>
                )}

                {/* Factura / Folio */}
                <div className="space-y-1">
                  <label className={`font-medium ${classes.textMain}`}>
                    {purchaseForm.entryType === 'SUPPLIER'
                      ? 'No. de Factura / Remisión:'
                      : 'Folio o Referencia interna:'}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-4819 o Ticket #01"
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                  />
                </div>

                {/* Fecha */}
                <div className="space-y-1">
                  <label className={`font-medium ${classes.textMain}`}>Fecha de Entrada:</label>
                  <input
                    type="date"
                    value={purchaseForm.purchasedAt}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasedAt: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              {/* Almacén Destino */}
              <div className="space-y-1">
                <label className={`font-medium ${classes.textMain}`}>Almacén Destino en Sucursal:</label>
                <select
                  value={purchaseForm.warehouseId}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, warehouseId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.isDefault ? '(Almacén Principal)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Renglones de Insumos con Calculadora Asistida */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className={`font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 ${classes.textMain}`}>
                      <Package className="w-3.5 h-3.5" style={{ color: buttonColor }} />
                      Partidas del Ticket / Insumos ({purchaseForm.items.length})
                    </label>
                    <p className={`text-[10px] ${classes.textMuted}`}>
                      Selecciona un insumo existente o agrégalo al vuelo directamente si es nuevo en tu cafetería
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddItemRow(false)}
                      className={`px-2.5 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all ${classes.buttonGhost}`}
                    >
                      <Plus className="w-3.5 h-3.5" style={{ color: buttonColor }} />
                      <span>+ Insumo Catálogo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddItemRow(true)}
                      className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
                        isLight
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300'
                          : 'bg-violet-600/30 hover:bg-violet-600/40 text-violet-300 border-violet-500/40'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>✨ + Insumo Nuevo</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {purchaseForm.items.map((row, idx) => {
                    const selectedItemObj = inventoryItems.find((it) => it.id === row.inventoryItemId)
                    const presentations = selectedItemObj?.presentations || []
                    const selectedPresentation = presentations.find((p) => p.id === row.inventoryPresentationId)
                    const factorToBase = selectedPresentation ? Number(selectedPresentation.factorToBase) : 1

                    const qty = Number(row.quantityBought) || 0
                    const unitCost = Number(row.unitCost) || 0
                    const subtotalRow = qty * unitCost
                    const quantityBaseCalculated = qty * factorToBase
                    const unitCostBase = factorToBase > 0 ? unitCost / factorToBase : unitCost
                    const displayUnit = row.isNewItem ? row.baseUnit : (selectedItemObj?.baseUnit || 'PIECE')

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border space-y-3 transition-all ${
                          row.isNewItem
                            ? isLight
                              ? 'bg-purple-50/60 border-purple-300'
                              : 'bg-slate-950/80 border-violet-500/40 shadow-sm'
                            : `${classes.subCard}`
                        }`}
                      >
                        {/* Barra superior de la partida */}
                        <div className={`flex flex-wrap items-center justify-between gap-2 pb-2 border-b ${classes.divider}`}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px]"
                              style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                            >
                              {idx + 1}
                            </span>
                            <span className={`text-[11px] font-semibold ${classes.textMain}`}>
                              {row.isNewItem ? (
                                <span className="text-purple-600 dark:text-violet-300 flex items-center gap-1 font-bold">
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                  Nuevo Insumo al Vuelo
                                </span>
                              ) : (
                                'Insumo del Catálogo'
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Toggle entre Catálogo y Nuevo */}
                            <div className={`flex p-0.5 rounded-xl border text-[10px] ${classes.card}`}>
                              <button
                                type="button"
                                onClick={() => handleItemChange(idx, 'isNewItem', false)}
                                style={!row.isNewItem ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
                                className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                  !row.isNewItem
                                    ? 'font-bold'
                                    : `${classes.textMuted} hover:${classes.textMain}`
                                }`}
                              >
                                Del Catálogo
                              </button>
                              <button
                                type="button"
                                onClick={() => handleItemChange(idx, 'isNewItem', true)}
                                className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                  row.isNewItem
                                    ? 'bg-purple-700 text-white font-bold'
                                    : `${classes.textMuted} hover:${classes.textMain}`
                                }`}
                              >
                                + Nuevo Insumo
                              </button>
                            </div>

                            {/* Botón Borrar */}
                            {purchaseForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                                title="Quitar este insumo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Campos según modo: Nuevo vs Existente */}
                        {row.isNewItem ? (
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                            {/* Nombre del nuevo insumo */}
                            <div className="sm:col-span-6 space-y-1">
                              <label className="block text-[10px] text-purple-700 dark:text-violet-300 font-semibold">
                                Nombre de la Materia Prima / Insumo *
                              </label>
                              <input
                                type="text"
                                required
                                value={row.newItemName}
                                onChange={(e) => handleItemChange(idx, 'newItemName', e.target.value)}
                                placeholder="Ej: Café de Grano de Chiapas, Leche Entera"
                                className={`w-full px-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${classes.input}`}
                              />
                            </div>

                            {/* Unidad de medida base */}
                            <div className="sm:col-span-3 space-y-1">
                              <label className={`block text-[10px] font-semibold ${classes.textMain}`}>
                                Unidad de Medida *
                              </label>
                              <select
                                value={row.baseUnit}
                                onChange={(e) => handleItemChange(idx, 'baseUnit', e.target.value)}
                                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none cursor-pointer ${classes.input}`}
                              >
                                {Object.values(UNIT_DEFINITIONS).map((u) => (
                                  <option key={u.code} value={u.code}>
                                    {u.label} ({u.symbol})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* SKU autogenerado con fragmentos */}
                            <div className="sm:col-span-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <label className={`block text-[10px] font-semibold ${classes.textMain}`}>SKU / Código</label>
                                <span className="text-[9px] text-purple-600 dark:text-violet-400 font-mono">Auto</span>
                              </div>
                              <input
                                type="text"
                                value={row.sku}
                                onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                                placeholder="CAF-GRA-CHI"
                                className={`w-full px-2.5 py-1.5 rounded-xl border font-mono text-xs font-bold uppercase focus:outline-none ${classes.input}`}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                            {/* Insumo del catálogo */}
                            <div className="sm:col-span-7 space-y-1">
                              <label className={`block text-[10px] font-semibold ${classes.textMuted}`}>
                                Insumo Base del Catálogo:
                              </label>
                              <select
                                value={row.inventoryItemId}
                                onChange={(e) => handleItemChange(idx, 'inventoryItemId', e.target.value)}
                                className={`w-full px-2.5 py-1.5 rounded-xl border font-medium text-xs focus:outline-none cursor-pointer ${classes.input}`}
                              >
                                {inventoryItems.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} [{it.sku || 'S/SKU'}] — ({formatUnitName(it.baseUnit)})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Presentación comercial */}
                            <div className="sm:col-span-5 space-y-1">
                              <label className={`block text-[10px] font-semibold ${classes.textMuted}`}>
                                Presentación de Compra:
                              </label>
                              <select
                                value={row.inventoryPresentationId}
                                onChange={(e) => handleItemChange(idx, 'inventoryPresentationId', e.target.value)}
                                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none cursor-pointer ${classes.input}`}
                              >
                                <option value="">
                                  Pieza o Unidad Suelta ({formatUnitName(selectedItemObj?.baseUnit)})
                                </option>
                                {presentations.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (equivale a {p.factorToBase} {formatUnitSymbol(selectedItemObj?.baseUnit)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Calculadora Asistida: Cantidad, Modo, Unitario y Total */}
                        <div className={`p-2.5 rounded-xl border grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center ${classes.card}`}>
                          {/* Cantidad */}
                          <div className="sm:col-span-3 space-y-1">
                            <label className={`block text-[10px] font-semibold ${classes.textMuted}`}>
                              Cantidad a Comprar:
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                min="0.001"
                                value={row.quantityBought}
                                onChange={(e) => handleItemChange(idx, 'quantityBought', e.target.value)}
                                className={`w-full pl-2.5 pr-10 py-1 rounded-xl border font-bold text-xs focus:outline-none font-mono text-center ${classes.input}`}
                              />
                              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold ${classes.textMuted}`}>
                                {formatUnitSymbol(displayUnit)}
                              </span>
                            </div>
                          </div>

                          {/* Selector de Modo */}
                          <div className="sm:col-span-3 space-y-1">
                            <label className={`block text-[10px] font-semibold ${classes.textMuted}`}>
                              Modo de Cálculo:
                            </label>
                            <div className={`flex p-0.5 rounded-lg border text-[10px] ${classes.subCard}`}>
                              <button
                                type="button"
                                onClick={() => handleItemChange(idx, 'calcMode', 'UNIT')}
                                style={row.calcMode === 'UNIT' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
                                className={`flex-1 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                                  row.calcMode === 'UNIT'
                                    ? 'font-bold'
                                    : `${classes.textMuted} hover:${classes.textMain}`
                                }`}
                              >
                                Por Unidad
                              </button>
                              <button
                                type="button"
                                onClick={() => handleItemChange(idx, 'calcMode', 'TOTAL')}
                                style={row.calcMode === 'TOTAL' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
                                className={`flex-1 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                                  row.calcMode === 'TOTAL'
                                    ? 'font-bold'
                                    : `${classes.textMuted} hover:${classes.textMain}`
                                }`}
                              >
                                Total Lote
                              </button>
                            </div>
                          </div>

                          {/* Input de Costo Unitario */}
                          <div className="sm:col-span-3 space-y-1">
                            <label className={`block text-[10px] font-semibold ${classes.textMuted}`}>
                              Precio Unitario:
                            </label>
                            <div className="relative">
                              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-xs ${classes.textMuted}`}>$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.unitCost}
                                onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                                className={`w-full pl-6 pr-2 py-1 rounded-lg border text-xs font-mono focus:outline-none ${classes.input}`}
                              />
                            </div>
                          </div>

                          {/* Input de Total del Paquete */}
                          <div className="sm:col-span-3 space-y-1">
                            <label className={`block text-[10px] font-semibold ${classes.textMuted}`}>
                              Total Pagado:
                            </label>
                            <div className="relative">
                              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-xs ${classes.textMuted}`}>$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.totalCostInput}
                                onChange={(e) => handleItemChange(idx, 'totalCostInput', e.target.value)}
                                className={`w-full pl-6 pr-2 py-1 rounded-lg border text-xs font-mono focus:outline-none ${classes.input}`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Desglose visual en tiempo real para el cliente */}
                        <div className={`p-2 rounded-xl border text-[11px] flex items-start gap-2 ${
                          isLight
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        }`}>
                          <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                          <div>
                            {row.isNewItem ? (
                              <span>
                                <strong>Se creará en inventario:</strong>{' '}
                                <span className={`font-bold ${classes.textMain}`}>
                                  {row.newItemName || 'Nuevo Insumo'}
                                </span>{' '}
                                [SKU: <span className="font-mono font-bold text-amber-600 dark:text-amber-200">{row.sku || 'PENDIENTE'}</span>] con{' '}
                                <span className={`font-bold ${classes.textMain}`}>
                                  {qty} {formatUnitSymbol(row.baseUnit)}
                                </span>{' '}
                                en almacén a <span className={`font-bold ${classes.textMain}`}>${unitCost.toFixed(2)} MXN</span> c/u.{' '}
                                <strong>Subtotal: ${subtotalRow.toFixed(2)} MXN</strong>
                              </span>
                            ) : (
                              <span>
                                <strong>Entrada neta:</strong> Ingresarán{' '}
                                <span className={`font-bold ${classes.textMain}`}>
                                  {quantityBaseCalculated.toLocaleString('es-MX')} {formatUnitSymbol(selectedItemObj?.baseUnit)}
                                </span>{' '}
                                al almacén. Costo por {selectedPresentation ? selectedPresentation.name : 'pieza/unidad'}:{' '}
                                <span className={`font-bold ${classes.textMain}`}>${unitCost.toFixed(2)} MXN</span>{' '}
                                (sale a{' '}
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  ${unitCostBase.toFixed(4)} por {formatUnitSymbol(selectedItemObj?.baseUnit)}
                                </span>
                                ). <strong>Subtotal: ${subtotalRow.toFixed(2)} MXN</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <label className={`font-medium ${classes.textMuted}`}>Notas u observaciones:</label>
                <input
                  type="text"
                  placeholder="Ej. Insumo fresco, compra de emergencia para turno vespertino"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                />
              </div>

              {/* Total y Botón de Envío */}
              <div className={`pt-3 border-t flex items-center justify-between ${classes.divider}`}>
                <div>
                  <span className={`text-xs block font-medium ${classes.textMuted}`}>Total de la Entrada:</span>
                  <strong className={`text-xl font-black font-mono ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                    ${calculatedTotal.toFixed(2)} MXN
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPurchaseModal(false)}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${classes.buttonGhost}`}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={savingPurchase || calculatedTotal <= 0}
                    style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-black/10 disabled:opacity-40 cursor-pointer transition-all hover:opacity-95"
                  >
                    {savingPurchase ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>Registrar e Ingresar Stock</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR COMPRA */}
      {showEditPurchaseModal && editingPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl animate-in zoom-in-95 ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${classes.textMain}`}>Editar Entrada</h3>
                  <p className={`text-xs ${classes.textMuted}`}>Modifica folio, notas o fecha del comprobante</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditPurchaseModal(false)}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditPurchase} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className={`font-medium ${classes.textMain}`}>Folio / No. Factura:</label>
                <input
                  type="text"
                  value={editPurchaseForm.invoiceNumber}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, invoiceNumber: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                />
              </div>

              <div className="space-y-1">
                <label className={`font-medium ${classes.textMain}`}>Proveedor:</label>
                <select
                  value={editPurchaseForm.supplierId}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, supplierId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                >
                  <option value="">-- Sin proveedor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className={`font-medium ${classes.textMain}`}>Fecha de Entrada:</label>
                <input
                  type="date"
                  value={editPurchaseForm.purchasedAt}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, purchasedAt: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                />
              </div>

              <div className="space-y-1">
                <label className={`font-medium ${classes.textMain}`}>Notas:</label>
                <textarea
                  rows={2}
                  value={editPurchaseForm.notes}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, notes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                />
              </div>

              <div className={`pt-3 border-t flex justify-end gap-2 ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowEditPurchaseModal(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditPurchase}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-black/10 disabled:opacity-40 cursor-pointer hover:opacity-95"
                >
                  {savingEditPurchase && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR / EDITAR PROVEEDOR */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl animate-in zoom-in-95 ${classes.modalContent}`}>
            <div className={`flex items-center gap-3 border-b pb-3 ${classes.divider}`}>
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
                style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${classes.textMain}`}>
                  {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h3>
                <p className={`text-xs ${classes.textMuted}`}>Datos comerciales y de contacto</p>
              </div>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className={`font-medium ${classes.textMain}`}>Nombre Comercial *:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Distribuidora de Café Veracruz"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                />
              </div>

              <div className="space-y-1">
                <label className={`font-medium ${classes.textMain}`}>Persona de Contacto / Vendedor:</label>
                <input
                  type="text"
                  placeholder="Ej. Lic. Carlos Gómez"
                  value={supplierForm.contact}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className={`font-medium ${classes.textMain}`}>Teléfono / WhatsApp:</label>
                  <input
                    type="text"
                    placeholder="Ej. 55 1234 5678"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`font-medium ${classes.textMain}`}>RFC / ID Fiscal:</label>
                  <input
                    type="text"
                    placeholder="Ej. DCV980101XYZ"
                    value={supplierForm.taxId}
                    onChange={(e) => setSupplierForm({ ...supplierForm, taxId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={`font-medium ${classes.textMain}`}>Correo Electrónico:</label>
                <input
                  type="email"
                  placeholder="ventas@cafeveracruz.com"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                />
              </div>

              <div className={`pt-3 border-t flex justify-end gap-2 ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSupplier}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-black/10 disabled:opacity-40 cursor-pointer hover:opacity-95"
                >
                  {savingSupplier && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingSupplier ? 'Actualizar' : 'Guardar Proveedor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE COMPRA */}
      {showDetailModal && selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl animate-in zoom-in-95 ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${classes.textMain}`}>Detalle de Entrada</h3>
                  <p className={`text-xs ${classes.textMuted}`}>Folio: {selectedPurchase.invoiceNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-2xl border grid grid-cols-2 gap-2 ${classes.subCard}`}>
                <div>
                  <span className={`text-[10px] block ${classes.textMuted}`}>Tipo:</span>
                  <strong className={isLight ? 'text-amber-800' : 'text-amber-400'}>
                    {selectedPurchase.entryType === 'INITIAL_STOCK'
                      ? 'Stock Inicial / Apertura'
                      : selectedPurchase.entryType === 'EMERGENCY_STORE'
                      ? 'Tiendita / Urgencia'
                      : 'Compra a Proveedor'}
                  </strong>
                </div>
                <div>
                  <span className={`text-[10px] block ${classes.textMuted}`}>Fecha:</span>
                  <strong className={classes.textMain}>
                    {new Date(selectedPurchase.purchasedAt).toLocaleDateString('es-MX', {
                      dateStyle: 'medium',
                    })}
                  </strong>
                </div>
                <div className="col-span-2">
                  <span className={`text-[10px] block ${classes.textMuted}`}>Proveedor / Origen:</span>
                  <strong className={classes.textMain}>
                    {selectedPurchase.supplier?.name ||
                      (selectedPurchase.entryType === 'INITIAL_STOCK'
                        ? 'Inventario de Apertura'
                        : 'Mostrador / Compra de Emergencia')}
                  </strong>
                </div>
                {selectedPurchase.notes && (
                  <div className={`col-span-2 pt-1 border-t ${classes.divider}`}>
                    <span className={`text-[10px] block ${classes.textMuted}`}>Notas:</span>
                    <p className={`italic ${classes.textMain}`}>{selectedPurchase.notes}</p>
                  </div>
                )}
              </div>

              {/* Desglose de Insumos */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                <span className={`font-bold uppercase tracking-wider text-[10px] ${classes.textMuted}`}>
                  Insumos Ingresados:
                </span>
                {selectedPurchase.items.map((it) => (
                  <div
                    key={it.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${classes.card}`}
                  >
                    <div>
                      <span className={`font-bold block ${classes.textMain}`}>{it.itemName}</span>
                      <span className={`text-[10px] ${classes.textMuted}`}>
                        {it.quantityBought} {it.presentationName || formatUnitName(it.baseUnit)} (${it.unitCost.toFixed(2)} c/u)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-bold text-xs ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                        ${it.subtotal.toFixed(2)} MXN
                      </span>
                      <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{it.quantityBaseCalculated} {formatUnitSymbol(it.baseUnit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`pt-2 border-t flex justify-between items-center text-sm font-bold ${classes.divider}`}>
                <span className={classes.textMuted}>Total de la Entrada:</span>
                <span className={`font-extrabold text-base ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                  ${selectedPurchase.total.toFixed(2)} MXN
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${classes.buttonGhost}`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

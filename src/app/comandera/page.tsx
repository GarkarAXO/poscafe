'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UtensilsCrossed,
  Coffee,
  Store,
  Users,
  Clock,
  Plus,
  Minus,
  Trash2,
  Send,
  Receipt,
  ArrowRightLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  ArrowLeft,
  Search,
  MonitorPlay,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Printer,
  UserCheck,
  UserPlus,
  ReceiptText,
} from 'lucide-react'
import { notify } from '@/lib/notify'

interface TableItem {
  id: string
  name: string
  capacity: number | null
  status: 'AVAILABLE' | 'OCCUPIED' | 'BILL_PRINTED' | 'DIRTY' | 'RESERVED'
  assignedWaiter: { id: string; name: string } | null
  currentWaiter: { id: string; name: string } | null
  activeOrder: {
    id: string
    orderNumber: string
    customerName: string | null
    orderType: string
    status: string
    subtotal: number
    total: number
    openedAt: string
    waiter: { id: string; name: string } | null
    itemsCount: number
    items: Array<{
      id: string
      productName: string
      variantName: string
      quantity: number
      unitPrice: number
      subtotal: number
      notes: string | null
      kitchenStatus: string
    }>
  } | null
}

interface WaiterOption {
  id: string
  name: string
  roles: string[]
}

interface Area {
  id: string
  name: string
  tables: TableItem[]
}

interface ProductVariant {
  id: string
  name: string
  price: number
}

interface Product {
  id: string
  name: string
  category: { id: string; name: string }
  variants: ProductVariant[]
}

interface StagedItem {
  variantId: string
  productName: string
  variantName: string
  unitPrice: number
  quantity: number
  notes: string
}

const PRESET_NOTES = [
  'Sin azúcar',
  'Leche deslactosada',
  'Leche de almendras',
  'Extra caliente',
  'Poco hielo',
  'Para llevar',
  'Urgente',
  'Sin cebolla',
  'Salsa aparte',
]

export default function ComanderaPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeBranch, setActiveBranch] = useState<any>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Meseros de la sucursal y filtros
  const [waiters, setWaiters] = useState<WaiterOption[]>([])
  const [filterOnlyMyTables, setFilterOnlyMyTables] = useState<boolean>(false)

  // Catálogo para toma de comanda
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Estado de mesa y comanda seleccionada
  const [activeTable, setActiveTable] = useState<TableItem | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [submittingOrder, setSubmittingOrder] = useState(false)

  // Acciones de mesa física
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [targetTransferTableId, setTargetTransferTableId] = useState('')
  const [transferring, setTransferring] = useState(false)

  // Traspaso de mesa a otro mesero (temporal)
  const [showTransferWaiterModal, setShowTransferWaiterModal] = useState(false)
  const [targetTransferWaiterId, setTargetTransferWaiterId] = useState('')
  const [transferringWaiter, setTransferringWaiter] = useState(false)

  // Asignar mesero titular
  const [showAssignWaiterModal, setShowAssignWaiterModal] = useState(false)
  const [targetAssignWaiterId, setTargetAssignWaiterId] = useState('')
  const [assigningWaiter, setAssigningWaiter] = useState(false)

  // Modal para imprimir ticket de cobro (pre-cuenta)
  const [showBillReceiptModal, setShowBillReceiptModal] = useState(false)

  // Cargar datos
  const loadComanderaData = async () => {
    try {
      setLoading(true)
      const [resMe, resTables, resCats, resProds] = await Promise.all([
        fetch('/api/auth/me').then((r) => r.json()),
        fetch('/api/comandas/tables').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
      ])

      if (resMe.success) {
        setCurrentUser(resMe.data.user)
        setActiveBranch(resMe.data.user.activeBranch)
      } else {
        router.push('/login')
        return
      }

      if (resTables.success) {
        setAreas(resTables.data.areas)
        if (resTables.data.waiters) {
          setWaiters(resTables.data.waiters)
        }
      }
      if (resCats.success) setCategories(resCats.data)
      if (resProds.success) setProducts(resProds.data)
    } catch {
      setError('Error al conectar con la comandera')
    } finally {
      setLoading(false)
    }
  }

  // Refrescar solo mesas cada 8 segundos para sincronizar con la cocina
  const refreshTables = async () => {
    try {
      const res = await fetch('/api/comandas/tables').then((r) => r.json())
      if (res.success) {
        setAreas(res.data.areas)
        if (res.data.waiters) {
          setWaiters(res.data.waiters)
        }
        // Si hay una mesa activa abierta, actualizar sus datos
        if (activeTable) {
          const allTables = res.data.areas.flatMap((a: Area) => a.tables)
          const updated = allTables.find((t: TableItem) => t.id === activeTable.id)
          if (updated) setActiveTable(updated)
        }
      }
    } catch {
      // Ignorar errores silenciosos en background
    }
  }

  useEffect(() => {
    loadComanderaData()
    const interval = setInterval(refreshTables, 8000)
    return () => clearInterval(interval)
  }, [])

  // Seleccionar mesa para ver / abrir comanda
  const handleSelectTable = (table: TableItem) => {
    setActiveTable(table)
    setStagedItems([])
    setCustomerName(table.activeOrder?.customerName || '')
    setOrderNotes('')
    setShowOrderModal(true)
  }

  // Agregar platillo al pedido nuevo
  const handleAddProduct = (prod: Product) => {
    const variant = prod.variants[0]
    if (!variant) return

    setStagedItems((prev) => {
      const existing = prev.find((it) => it.variantId === variant.id)
      if (existing) {
        return prev.map((it) =>
          it.variantId === variant.id ? { ...it, quantity: it.quantity + 1 } : it
        )
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          productName: prod.name,
          variantName: variant.name,
          unitPrice: Number(variant.price),
          quantity: 1,
          notes: '',
        },
      ]
    })
  }

  // Modificar cantidad en preparación
  const updateStagedQty = (variantId: string, delta: number) => {
    setStagedItems((prev) =>
      prev
        .map((it) => {
          if (it.variantId === variantId) {
            const newQty = it.quantity + delta
            return newQty > 0 ? { ...it, quantity: newQty } : null
          }
          return it
        })
        .filter(Boolean) as StagedItem[]
    )
  }

  // Agregar nota rápida al ítem
  const appendNoteToItem = (variantId: string, note: string) => {
    setStagedItems((prev) =>
      prev.map((it) => {
        if (it.variantId === variantId) {
          const current = it.notes ? it.notes.split(', ') : []
          if (!current.includes(note)) {
            current.push(note)
          }
          return { ...it, notes: current.join(', ') }
        }
        return it
      })
    )
  }

  // Enviar / Marchar comanda a cocina
  const handleSendToKitchen = async () => {
    if (!activeTable) return
    if (stagedItems.length === 0) {
      setError('Agrega al menos un platillo o bebida a la comanda')
      notify.warning('Comanda vacía', 'Selecciona platillos o bebidas para marchar.')
      return
    }

    setSubmittingOrder(true)
    setError(null)

    const tableName = activeTable.name

    try {
      const payload = {
        tableId: activeTable.id,
        orderType: 'DINE_IN',
        customerName: customerName.trim(),
        notes: orderNotes.trim(),
        items: stagedItems.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          notes: it.notes,
        })),
      }

      const res = await fetch('/api/comandas/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (json.success) {
        setSuccessMsg('¡Comanda enviada a Cocina y Barra!')
        notify.success('Comanda marchada', `Enviada a preparación en cocina para la mesa ${tableName}`)
        setTimeout(() => setSuccessMsg(null), 3500)
        setStagedItems([])
        await refreshTables()
      } else {
        const errMsg = json.error?.message || 'Error al enviar la comanda'
        setError(errMsg)
        notify.error('Error al marchar', errMsg)
      }
    } catch {
      setError('Error al comunicar con la cocina')
      notify.error('Error de conexión', 'No fue posible comunicar con la cocina')
    } finally {
      setSubmittingOrder(false)
    }
  }

  // Pedir Pre-cuenta
  const handleRequestBill = async () => {
    if (!activeTable) return
    const tableName = activeTable.name
    try {
      const res = await fetch(`/api/comandas/tables/${activeTable.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REQUEST_BILL' }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccessMsg('Pre-cuenta marcada en mesa')
        notify.info('Pre-cuenta solicitada', `Mesa ${tableName} en espera de ticket de cobro`)
        setTimeout(() => setSuccessMsg(null), 3000)
        await refreshTables()
      }
    } catch {
      setError('Error al solicitar pre-cuenta')
      notify.error('Error', 'No se pudo registrar la pre-cuenta')
    }
  }

  // Liberar mesa
  const handleReleaseTable = async () => {
    if (!activeTable) return
    const tableName = activeTable.name
    notify.action({
      title: `¿Liberar ${tableName}?`,
      description: 'La mesa quedará disponible y se cerrará su turno.',
      buttonText: 'Confirmar Liberación',
      onAction: async () => {
        try {
          const res = await fetch(`/api/comandas/tables/${activeTable.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RELEASE' }),
          })
          const json = await res.json()
          if (json.success) {
            setShowOrderModal(false)
            notify.success('Mesa liberada', `${tableName} ahora se encuentra disponible`)
            await refreshTables()
          } else {
            notify.error('Error al liberar', json.error?.message || 'No se pudo liberar la mesa')
          }
        } catch {
          notify.error('Error de conexión', 'No fue posible comunicar con el servidor')
        }
      },
    })
  }

  // Traspasar mesa
  const handleConfirmTransfer = async () => {
    if (!activeTable || !targetTransferTableId) return
    setTransferring(true)
    try {
      const res = await fetch(`/api/comandas/tables/${activeTable.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRANSFER',
          targetTableId: targetTransferTableId,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowTransferModal(false)
        setShowOrderModal(false)
        setSuccessMsg(json.message)
        notify.success('Mesa traspasada', json.message || 'Comanda reubicada exitosamente')
        setTimeout(() => setSuccessMsg(null), 3500)
        await refreshTables()
      } else {
        const errMsg = json.error?.message || 'No se pudo traspasar la mesa'
        setError(errMsg)
        notify.error('Error al traspasar', errMsg)
      }
    } catch {
      setError('Error al traspasar comanda')
      notify.error('Error de conexión', 'No fue posible traspasar la mesa')
    } finally {
      setTransferring(false)
    }
  }

  // Traspasar mesa a otro compañero mesero
  const handleConfirmTransferWaiter = async () => {
    if (!activeTable || !targetTransferWaiterId) return
    setTransferringWaiter(true)
    try {
      const res = await fetch(`/api/comandas/tables/${activeTable.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRANSFER_WAITER',
          targetWaiterId: targetTransferWaiterId,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowTransferWaiterModal(false)
        notify.success('Mesa traspasada a mesero', json.message)
        await refreshTables()
      } else {
        const errMsg = json.error?.message || 'No se pudo traspasar al mesero'
        notify.error('Error al traspasar', errMsg)
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible comunicar con el servidor')
    } finally {
      setTransferringWaiter(false)
    }
  }

  // Asignar mesero titular a la mesa
  const handleConfirmAssignWaiter = async () => {
    if (!activeTable) return
    setAssigningWaiter(true)
    try {
      const res = await fetch(`/api/comandas/tables/${activeTable.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASSIGN_WAITER',
          waiterId: targetAssignWaiterId || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowAssignWaiterModal(false)
        notify.success('Mesero asignado', json.message)
        await refreshTables()
      } else {
        const errMsg = json.error?.message || 'No se pudo asignar el mesero'
        notify.error('Error al asignar', errMsg)
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible asignar el mesero')
    } finally {
      setAssigningWaiter(false)
    }
  }

  // Abrir modal de ticket de cobro (pre-cuenta)
  const handleOpenPrintBill = async () => {
    if (!activeTable || !activeTable.activeOrder) return
    try {
      if (activeTable.status !== 'BILL_PRINTED') {
        await fetch(`/api/comandas/tables/${activeTable.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'REQUEST_BILL' }),
        })
        await refreshTables()
      }
    } catch {}
    setShowBillReceiptModal(true)
  }

  // Filtros de productos
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCatId === 'ALL' || p.category?.id === selectedCatId
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  // Todas las mesas en lista plana para traspasos
  const allTablesList = areas.flatMap((a) => a.tables)
  const availableTargetTables = allTablesList.filter(
    (t) => t.status === 'AVAILABLE' && t.id !== activeTable?.id
  )

  // Mesas filtradas por área seleccionada
  const displayedAreas =
    selectedAreaId === 'ALL' ? areas : areas.filter((a) => a.id === selectedAreaId)

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs">Sincronizando mesas y comandas...</p>
      </div>
    )
  }

  return (
    <div
      className="h-screen text-slate-100 flex flex-col overflow-hidden selection:bg-amber-500 selection:text-black"
      style={{ backgroundColor: activeBranch?.bgColor || '#020617' }}
    >
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs flex items-center gap-1"
            title="Volver al Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {activeBranch?.logoUrl ? (
            <img
              src={activeBranch.logoUrl}
              alt="Logo Sucursal"
              className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-white/20"
              onError={(e) => {
                ;(e.target as any).style.display = 'none'
              }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
              style={{
                backgroundColor: `${activeBranch?.primaryColor || '#7c3aed'}25`,
                color: activeBranch?.primaryColor || '#7c3aed',
              }}
            >
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          )}

          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              Comandera de Piso
              {activeBranch && (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${activeBranch.primaryColor || '#7c3aed'}25`,
                    color: activeBranch.primaryColor || '#a78bfa',
                  }}
                >
                  {activeBranch.name}
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* User Info & Quick Links */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-slate-200 block">{currentUser?.name}</span>
            <span className="text-[10px] text-amber-400 font-medium">Mesero / Turno activo</span>
          </div>

          {/* Enlace a KDS Cocina (Oculto para mesero estricto) */}
          {(currentUser?.permissions?.canManageInventory ||
            currentUser?.roleCodes?.includes('ADMIN') ||
            currentUser?.roleCodes?.includes('CHEF') ||
            currentUser?.roleCodes?.includes('KITCHEN')) && (
            <Link
              href="/kds"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300 font-medium transition-all"
              title="Abrir pantalla KDS de Cocina"
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ver KDS Cocina</span>
            </Link>
          )}

          {/* Enlace a Caja POS (Oculto para mesero estricto) */}
          {(currentUser?.permissions?.canManageCashRegisters ||
            currentUser?.roleCodes?.includes('ADMIN') ||
            currentUser?.roleCodes?.includes('CASHIER')) && (
            <Link
              href="/pos"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 font-medium transition-all"
              title="Abrir Terminal de Cobro"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Caja POS</span>
            </Link>
          )}

          {/* Bloquear / Salir a Relevo de PIN */}
          <Link
            href="/logout"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 text-xs text-slate-300 hover:text-red-400 transition-all"
            title="Bloquear pantalla para relevo de mesero"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bloquear</span>
          </Link>
        </div>
      </header>

      {/* Alertas */}
      {successMsg && (
        <div className="bg-emerald-500/90 text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/90 text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 underline text-[11px] cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* Main Floor / Tables Area */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
        {/* Header con Filtros de Áreas, Filtro Mis Mesas y Leyenda de Estados */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-3xl border border-slate-800">
          {/* Selector de Áreas y Filtro Mis Mesas */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedAreaId('ALL')}
              style={
                selectedAreaId === 'ALL'
                  ? { backgroundColor: activeBranch?.primaryColor || '#7c3aed', color: '#ffffff' }
                  : undefined
              }
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedAreaId === 'ALL'
                  ? 'shadow-md font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todas las Áreas
            </button>
            {areas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAreaId(a.id)}
                style={
                  selectedAreaId === a.id
                    ? { backgroundColor: activeBranch?.primaryColor || '#7c3aed', color: '#ffffff' }
                    : undefined
                }
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedAreaId === a.id
                    ? 'shadow-md font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {a.name} ({a.tables.length})
              </button>
            ))}

            {/* Separador vertical */}
            <div className="h-6 w-px bg-slate-800 mx-1 shrink-0" />

            {/* Filtro Mis Mesas Asignadas */}
            <button
              type="button"
              onClick={() => setFilterOnlyMyTables(!filterOnlyMyTables)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                filterOnlyMyTables
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Filtrar solo mesas asignadas o bajo mi atención"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Mis Mesas Asignadas</span>
            </button>
          </div>

          {/* Leyenda de Colores */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Ocupada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse"></span>
              Pre-cuenta emitida
            </span>
          </div>
        </div>

        {/* Plano de Mesas por Área */}
        <div className="space-y-6">
          {displayedAreas.map((area) => {
            const tablesToRender = area.tables.filter((table) => {
              if (!filterOnlyMyTables) return true
              return (
                table.assignedWaiter?.id === currentUser?.id ||
                table.currentWaiter?.id === currentUser?.id ||
                table.activeOrder?.waiter?.id === currentUser?.id
              )
            })

            if (filterOnlyMyTables && tablesToRender.length === 0) return null

            return (
              <div key={area.id} className="space-y-3">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-violet-400" />
                  {area.name}
                  {filterOnlyMyTables && (
                    <span className="text-[10px] text-amber-400 normal-case bg-amber-500/10 px-2 py-0.5 rounded-full">
                      ({tablesToRender.length} asignadas)
                    </span>
                  )}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {tablesToRender.map((table) => {
                    const isOccupied = table.status === 'OCCUPIED'
                    const isBillPrinted = table.status === 'BILL_PRINTED'
                    const isAvailable = table.status === 'AVAILABLE'
                    const isTransferred = !!table.currentWaiter && table.currentWaiter.id !== table.assignedWaiter?.id

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => handleSelectTable(table)}
                        className={`p-3.5 rounded-3xl border text-left transition-all relative flex flex-col justify-between min-h-[155px] cursor-pointer hover:scale-[1.02] active:scale-95 ${
                          isAvailable
                            ? 'bg-slate-900/50 border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5'
                            : isBillPrinted
                            ? 'bg-violet-950/30 border-violet-500/60 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30'
                            : 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-500/10'
                        }`}
                      >
                        {/* Cabecera de la Mesa */}
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-base font-bold text-white block">{table.name}</span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Users className="w-3 h-3" /> Cap: {table.capacity || 4}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-1">
                            {isBillPrinted && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500 text-white flex items-center gap-0.5">
                                <Receipt className="w-2.5 h-2.5" /> Cobro
                              </span>
                            )}
                            <span
                              className={`w-3 h-3 rounded-full ${
                                isAvailable
                                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                                  : isBillPrinted
                                  ? 'bg-violet-400 animate-pulse'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Mesero Titular y Mesero Traspasado */}
                        <div className="text-[10px] space-y-0.5 my-1 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60">
                          <span className="text-slate-400 flex items-center gap-1 truncate">
                            <Users className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            Titular: <strong className="text-slate-300">{table.assignedWaiter?.name || 'Libre'}</strong>
                          </span>

                          {isTransferred && (
                            <span className="text-cyan-300 flex items-center gap-1 truncate font-semibold">
                              <ArrowRightLeft className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                              Traspaso: {table.currentWaiter?.name}
                            </span>
                          )}
                        </div>

                        {/* Info de Comanda si está ocupada */}
                        {table.activeOrder ? (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400 font-mono">
                                {table.activeOrder.itemsCount} platillos
                              </span>
                              <strong className="text-amber-400 font-bold">
                                ${table.activeOrder.total.toFixed(2)}
                              </strong>
                            </div>

                            {table.activeOrder.customerName && (
                              <span className="text-[10px] text-slate-400 block truncate italic">
                                {table.activeOrder.customerName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-1">
                            <span className="text-[11px] font-semibold text-emerald-400/90 block">
                              Libre
                            </span>
                            <span className="text-[10px] text-slate-500">Toca para abrir</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* DRAWER / MODAL TÁCTIL DE COMANDA */}
      {showOrderModal && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-4xl h-[92vh] rounded-3xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Header del Modal */}
            <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {activeTable.name}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        activeTable.status === 'AVAILABLE'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {activeTable.status === 'AVAILABLE'
                        ? 'Nueva Comanda'
                        : `Comanda ${activeTable.activeOrder?.orderNumber || 'Abierta'}`}
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>
                      Titular: <strong className="text-slate-200">{activeTable.assignedWaiter?.name || 'Sin asignar'}</strong>
                    </span>
                    {activeTable.currentWaiter && activeTable.currentWaiter.id !== activeTable.assignedWaiter?.id && (
                      <span className="text-cyan-300 font-medium bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        🔄 Atendida por: {activeTable.currentWaiter.name}
                      </span>
                    )}
                    {activeTable.activeOrder && (
                      <span className="text-amber-400/90 font-mono">
                        • {activeTable.activeOrder.itemsCount} platillos (${activeTable.activeOrder.total.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de acción rápida en cabecera */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Asignar mesero titular a la mesa */}
                <button
                  type="button"
                  onClick={() => {
                    setTargetAssignWaiterId(activeTable.assignedWaiter?.id || '')
                    setShowAssignWaiterModal(true)
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Asignar mesero titular a la mesa"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Titular</span>
                </button>

                {activeTable.activeOrder && (
                  <>
                    {/* Traspasar atención a otro mesero y mover comanda (requiere canTransferTables) */}
                    {(currentUser?.permissions?.canTransferTables ||
                      currentUser?.roleCodes?.includes('ADMIN') ||
                      currentUser?.roleCodes?.includes('SUPERADMIN') ||
                      currentUser?.roleCodes?.includes('BRANCH_MANAGER')) && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetTransferWaiterId('')
                            setShowTransferWaiterModal(true)
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-xs text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Ceder mesa a otro compañero mesero (regresará al titular al cobrarse)"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ceder a Mesero</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowTransferModal(true)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Mover comanda a otra mesa física"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden sm:inline">Mover Mesa</span>
                        </button>
                      </>
                    )}

                    {/* Imprimir Pre-cuenta / Ticket de Cobro */}
                    <button
                      type="button"
                      onClick={handleOpenPrintBill}
                      className="px-2.5 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-xs text-violet-300 border border-violet-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Imprimir ticket de cobro / pre-cuenta"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ticket Cobro</span>
                    </button>

                    {/* Liberar mesa */}
                    <button
                      type="button"
                      onClick={handleReleaseTable}
                      className="px-2.5 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-xs text-red-400 border border-red-500/30 transition-all cursor-pointer"
                      title="Liberar mesa"
                    >
                      Liberar
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Split View: Catálogo Táctil vs Resumen de Comanda */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* IZQUIERDA: Catálogo de Platillos y Bebidas */}
              <div className="flex-1 flex flex-col border-r border-slate-800 p-4 space-y-3 overflow-y-auto">
                {/* Search & Categories Bar */}
                <div className="space-y-2 shrink-0">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar platillo o bebida..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Categories Pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedCatId('ALL')}
                      style={
                        selectedCatId === 'ALL'
                          ? { backgroundColor: activeBranch?.primaryColor || '#f59e0b', color: '#ffffff' }
                          : undefined
                      }
                      className={`px-3 py-1.5 rounded-xl font-medium shrink-0 cursor-pointer transition-all ${
                        selectedCatId === 'ALL'
                          ? 'font-bold shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCatId(c.id)}
                        style={
                          selectedCatId === c.id
                            ? { backgroundColor: activeBranch?.primaryColor || '#f59e0b', color: '#ffffff' }
                            : undefined
                        }
                        className={`px-3 py-1.5 rounded-xl font-medium shrink-0 cursor-pointer transition-all ${
                          selectedCatId === c.id
                            ? 'font-bold shadow-md'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid de Productos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto flex-1">
                  {filteredProducts.map((p) => {
                    const price = p.variants[0]?.price || 0
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/50 hover:bg-amber-500/5 flex flex-col justify-between text-left transition-all cursor-pointer active:scale-95 group"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-white group-hover:text-amber-400 block line-clamp-2">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-500">{p.category?.name}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <strong className="text-xs text-amber-400 font-bold">
                            ${Number(price).toFixed(2)}
                          </strong>
                          <span className="w-5 h-5 rounded-lg bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 flex items-center justify-center font-bold text-xs">
                            +
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* DERECHA: Resumen de Comanda (Platillos Marchados + Nuevos a Marchar) */}
              <div className="w-full md:w-96 flex flex-col bg-slate-950/40 p-4 space-y-4 overflow-y-auto">
                {/* Nombre de comensal opcional */}
                <div className="shrink-0 space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">Nombre de Comensal / Referencia:</label>
                  <input
                    type="text"
                    placeholder="Ej. Familia López / Juan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Lista 1: Platillos ya en Cocina / KDS */}
                {activeTable.activeOrder && activeTable.activeOrder.items.length > 0 && (
                  <div className="space-y-2 shrink-0">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Marchado en Cocina ({activeTable.activeOrder.items.length})
                    </span>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {activeTable.activeOrder.items.map((it) => (
                        <div
                          key={it.id}
                          className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white">
                              {it.quantity}x {it.productName}
                            </span>
                            {it.notes && (
                              <span className="text-[10px] text-amber-300/80 block italic">
                                Nota: {it.notes}
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                it.kitchenStatus === 'READY'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : it.kitchenStatus === 'COOKING'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {it.kitchenStatus === 'READY'
                                ? '✓ Listo'
                                : it.kitchenStatus === 'COOKING'
                                ? '🍳 Preparando'
                                : '⏳ En espera'}
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              ${it.subtotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista 2: Nuevos Platillos a Marchar */}
                <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Nueva Ronda por Marchar ({stagedItems.length})
                  </span>

                  {stagedItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl p-4 text-center">
                      <ShoppingBag className="w-6 h-6 mb-2 opacity-50" />
                      <span>Selecciona platillos del catálogo a la izquierda</span>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                      {stagedItems.map((item) => (
                        <div
                          key={item.variantId}
                          className="p-2.5 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <strong className="text-white block">{item.productName}</strong>
                              <span className="text-slate-400 text-[11px]">
                                ${item.unitPrice.toFixed(2)} c/u
                              </span>
                            </div>

                            {/* Controles de Cantidad */}
                            <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                              <button
                                type="button"
                                onClick={() => updateStagedQty(item.variantId, -1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold text-white text-xs px-1">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateStagedQty(item.variantId, 1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Notas Rápidas */}
                          <div className="space-y-1">
                            {item.notes && (
                              <p className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md italic">
                                Nota: {item.notes}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {PRESET_NOTES.slice(0, 4).map((note) => (
                                <button
                                  key={note}
                                  type="button"
                                  onClick={() => appendNoteToItem(item.variantId, note)}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                >
                                  +{note}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subtotal de la nueva ronda y Botón Marchar */}
                <div className="pt-2 border-t border-slate-800 space-y-2 shrink-0">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total ronda a marchar:</span>
                    <strong className="text-amber-400 text-base">
                      $
                      {stagedItems
                        .reduce((acc, curr) => acc + curr.unitPrice * curr.quantity, 0)
                        .toFixed(2)}{' '}
                      MXN
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendToKitchen}
                    disabled={submittingOrder || stagedItems.length === 0}
                    style={{
                      backgroundColor:
                        stagedItems.length > 0
                          ? activeBranch?.buttonColor || activeBranch?.primaryColor || '#f59e0b'
                          : undefined,
                      color: '#ffffff',
                    }}
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:opacity-90 font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {submittingOrder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Marchar a Cocina / KDS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA TRASPASAR MESA */}
      {showTransferModal && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Traspasar Mesa</h3>
                <p className="text-xs text-slate-400">Mover comanda de {activeTable.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-medium">Selecciona la mesa destino (Libre):</label>
              {availableTargetTables.length === 0 ? (
                <p className="p-3 rounded-xl bg-red-500/10 text-red-400 text-center">
                  No hay mesas libres disponibles en este momento.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableTargetTables.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetTransferTableId(t.id)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        targetTransferTableId === t.id
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={transferring || !targetTransferTableId}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
              >
                {transferring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirmar Traspaso</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA TRASPASAR ATENCIÓN DE MESA A OTRO COMPAÑERO MESERO */}
      {showTransferWaiterModal && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-cyan-500/40 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Ceder Mesa a Mesero</h3>
                <p className="text-xs text-slate-400">Traspasar atención temporal de {activeTable.name}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-[11px] text-cyan-300 space-y-1">
              <p className="font-semibold">ℹ️ Relevo temporal de servicio:</p>
              <p className="text-cyan-200/80">
                La mesa y su comanda activa pasarán a ser atendidas por el compañero seleccionado.
                <strong> Una vez cobrada la cuenta en caja, la mesa regresará automáticamente al mesero titular.</strong>
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-medium">Selecciona el compañero mesero:</label>
              {waiters.length === 0 ? (
                <p className="p-3 rounded-xl bg-red-500/10 text-red-400 text-center">
                  No hay otros colaboradores disponibles en esta sucursal.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {waiters.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setTargetTransferWaiterId(w.id)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        targetTransferWaiterId === w.id
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 opacity-70" />
                        <span>{w.name}</span>
                      </div>
                      <span className="text-[10px] opacity-75">
                        {w.roles.join(', ') || 'Colaborador'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTransferWaiterModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmTransferWaiter}
                disabled={transferringWaiter || !targetTransferWaiterId}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
              >
                {transferringWaiter ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirmar Traspaso</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ASIGNAR MESERO TITULAR PERMANENTE A LA MESA */}
      {showAssignWaiterModal && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Mesero Titular</h3>
                <p className="text-xs text-slate-400">Asignar responsable de {activeTable.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-medium">Selecciona el mesero titular:</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {/* Opción para dejar sin asignar */}
                <button
                  type="button"
                  onClick={() => setTargetAssignWaiterId('')}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    targetAssignWaiterId === ''
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>Sin mesero titular asignado (Libre)</span>
                </button>

                {waiters.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setTargetAssignWaiterId(w.id)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      targetAssignWaiterId === w.id
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 opacity-70" />
                      <span>{w.name}</span>
                    </div>
                    <span className="text-[10px] opacity-75">
                      {w.roles.join(', ') || 'Colaborador'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAssignWaiterModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignWaiter}
                disabled={assigningWaiter}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                {assigningWaiter ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Guardar Titular</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TICKET DE COBRO / PRE-CUENTA IMPRIMIBLE */}
      {showBillReceiptModal && activeTable && activeTable.activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-violet-500/50 p-6 space-y-4 shadow-2xl animate-in zoom-in-95 my-auto">
            {/* Header del modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ticket de Pre-cuenta</h3>
                  <p className="text-[11px] text-slate-400">Previsualización e Impresión</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBillReceiptModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Vista previa térmica de Ticket (Fondo blanco, texto negro monoespaciado) */}
            <div
              id="bill-receipt-print"
              className="bg-white text-slate-950 font-mono text-xs p-4 rounded-xl shadow-inner border border-slate-300 space-y-2.5 print:m-0 print:p-0 print:border-none print:shadow-none"
            >
              {/* Cabecera del ticket */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                <strong className="text-sm block tracking-wider uppercase font-extrabold">
                  {activeBranch?.name || 'CAFETERÍA & RESTAURANTE'}
                </strong>
                <p className="text-[10px] text-slate-600">--- PRE-CUENTA DE CONSUMO ---</p>
                <p className="text-[11px] font-bold">MESA: {activeTable.name}</p>
                <p className="text-[10px] text-slate-600">
                  Folio: {activeTable.activeOrder.orderNumber}
                </p>
                <p className="text-[10px] text-slate-500">
                  Fecha: {new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>

              {/* Datos de servicio */}
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2 text-slate-700">
                <p>
                  Mesero: <strong>{activeTable.currentWaiter?.name || activeTable.activeOrder.waiter?.name || currentUser?.name}</strong>
                  {activeTable.assignedWaiter && activeTable.currentWaiter && activeTable.assignedWaiter.id !== activeTable.currentWaiter.id && (
                    <span className="block text-[9px] text-slate-500">
                      (Titular: {activeTable.assignedWaiter.name})
                    </span>
                  )}
                </p>
                {activeTable.activeOrder.customerName && (
                  <p>Comensal: {activeTable.activeOrder.customerName}</p>
                )}
              </div>

              {/* Desglose de platillos */}
              <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between text-[10px] font-bold border-b border-slate-200 pb-1">
                  <span>CANT / DESCRIPCIÓN</span>
                  <span>TOTAL</span>
                </div>
                {activeTable.activeOrder.items.map((it) => (
                  <div key={it.id} className="text-[11px] flex justify-between items-start">
                    <div className="pr-2">
                      <span className="font-bold">{it.quantity}x</span> {it.productName}
                      {it.notes && (
                        <span className="block text-[9px] text-slate-500 italic">
                          ({it.notes})
                        </span>
                      )}
                    </div>
                    <span className="font-semibold shrink-0">
                      ${it.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span>Subtotal:</span>
                  <span>${activeTable.activeOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-slate-900 pt-1">
                  <span>TOTAL A PAGAR:</span>
                  <span>${activeTable.activeOrder.total.toFixed(2)} MXN</span>
                </div>
              </div>

              {/* Mensaje de cobro en caja */}
              <div className="text-center pt-2 border-t border-dashed border-slate-400 space-y-1">
                <p className="text-[10px] font-bold">
                  *** FAVOR DE PAGAR EN CAJA ***
                </p>
                <p className="text-[9px] text-slate-500">
                  Este documento es una pre-cuenta informativa de consumo. Su comprobante de pago oficial se entrega al pagar en caja.
                </p>
                <p className="text-[10px] font-semibold pt-1">¡Gracias por su visita!</p>
              </div>
            </div>

            {/* Acciones del modal */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBillReceiptModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => {
                  window.print()
                  notify.success('Ticket enviado a impresión', `Pre-cuenta de ${activeTable.name}`)
                }}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-violet-600/30 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

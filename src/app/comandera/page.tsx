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
  ShieldCheck,
  LogOut,
  Laptop,
  Columns,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { getTerminalDeviceConfig, TerminalDeviceConfig } from '@/lib/terminal-device'

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
  const [tableServiceMode, setTableServiceMode] = useState<'FREE' | 'ASSIGNED'>('FREE')

  // Catálogo para toma de comanda
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Estado de mesa y comanda seleccionada
  const [activeTable, setActiveTable] = useState<TableItem | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderViewTab, setOrderViewTab] = useState<'catalog' | 'order' | 'split'>('catalog')
  const [refreshing, setRefreshing] = useState(false)
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

  // Advertencia al abrir mesa asignada a otro compañero en modo ASSIGNED
  const [takeoverWarningTable, setTakeoverWarningTable] = useState<TableItem | null>(null)

  // Modal para imprimir ticket de cobro (pre-cuenta)
  const [showBillReceiptModal, setShowBillReceiptModal] = useState(false)

  // Terminal Lock / Waiter Shift Relevo states
  const [isTerminalLocked, setIsTerminalLocked] = useState(false)
  const [unlockPin, setUnlockPin] = useState('')
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [terminalDevice, setTerminalDevice] = useState<TerminalDeviceConfig | null>(null)

  useEffect(() => {
    const config = getTerminalDeviceConfig()
    if (config) {
      setTerminalDevice(config)
    }
  }, [])

  // Escucha de teclado físico para computadoras con teclado/numpad
  useEffect(() => {
    if (!isTerminalLocked) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key >= '0' && e.key <= '9') {
        if (unlockPin.length < 4) {
          const next = unlockPin + e.key
          setUnlockPin(next)
          setUnlockError(null)
          if (next.length === 4) {
            handleUnlockTerminal(next)
          }
        }
      } else if (e.key === 'Backspace') {
        setUnlockPin((prev) => prev.slice(0, -1))
        setUnlockError(null)
      } else if (e.key === 'Escape') {
        setUnlockPin('')
        setUnlockError(null)
      } else if (e.key === 'Enter' && unlockPin.length === 4) {
        handleUnlockTerminal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTerminalLocked, unlockPin, activeBranch, terminalDevice])

  const handleKeypadPressUnlock = (val: string) => {
    if (val === 'C') {
      setUnlockPin('')
      setUnlockError(null)
    } else if (val === 'DEL') {
      setUnlockPin((prev) => prev.slice(0, -1))
      setUnlockError(null)
    } else {
      if (unlockPin.length < 4) {
        const next = unlockPin + val
        setUnlockPin(next)
        setUnlockError(null)
        if (next.length === 4) {
          handleUnlockTerminal(next)
        }
      }
    }
  }

  const handleUnlockTerminal = async (pinToVerify?: string) => {
    const pinVal = pinToVerify || unlockPin
    if (!pinVal || pinVal.length < 4) {
      setUnlockError('Ingresa los 4 dígitos del PIN')
      return
    }

    setUnlocking(true)
    setUnlockError(null)

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pinVal,
          branch_id: terminalDevice?.branchId || activeBranch?.id,
        }),
      })

      const json = await res.json()

      if (!json.success || !json.data) {
        setUnlockError(json.error?.message || 'PIN no asignado a esta sucursal')
        setUnlockPin('')
        return
      }

      const newUser = json.data.user
      setCurrentUser((prev: any) => ({
        ...prev,
        ...newUser,
      }))
      setIsTerminalLocked(false)
      setUnlockPin('')
      notify.success('Relevo Exitoso', `Operando como: ${newUser.name}`)
    } catch {
      setUnlockError('Error de conexión al validar PIN')
    } finally {
      setUnlocking(false)
    }
  }

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
        const loadedAreas: Area[] = [...(resTables.data.areas || [])]
        if (resTables.data.unassignedTables && resTables.data.unassignedTables.length > 0) {
          loadedAreas.push({
            id: 'UNASSIGNED',
            name: 'General',
            tables: resTables.data.unassignedTables,
          })
        }
        setAreas(loadedAreas)
        if (resTables.data.waiters) {
          setWaiters(resTables.data.waiters)
        }
        if (resTables.data.tableServiceMode) {
          setTableServiceMode(resTables.data.tableServiceMode)
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
        const loadedAreas: Area[] = [...(res.data.areas || [])]
        if (res.data.unassignedTables && res.data.unassignedTables.length > 0) {
          loadedAreas.push({
            id: 'UNASSIGNED',
            name: 'General',
            tables: res.data.unassignedTables,
          })
        }
        setAreas(loadedAreas)
        if (res.data.waiters) {
          setWaiters(res.data.waiters)
        }
        if (res.data.tableServiceMode) {
          setTableServiceMode(res.data.tableServiceMode)
        }
        // Si hay una mesa activa abierta, actualizar sus datos
        if (activeTable) {
          const allTables = loadedAreas.flatMap((a: Area) => a.tables)
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

  const openTableOrder = (table: TableItem) => {
    setActiveTable(table)
    setStagedItems([])
    setCustomerName(table.activeOrder?.customerName || '')
    setOrderNotes('')
    // En móvil/tablet/pc: si está disponible, abrir catálogo para registrar artículos rápido; si está ocupada, ver resumen
    setOrderViewTab(table.status === 'AVAILABLE' ? 'catalog' : 'order')
    setShowOrderModal(true)
    setTakeoverWarningTable(null)
  }

  // Seleccionar mesa para ver / abrir comanda
  const handleSelectTable = (table: TableItem) => {
    // En Modo ASIGNADO: si la mesa está libre pero tiene titular diferente al usuario logueado
    if (
      tableServiceMode === 'ASSIGNED' &&
      table.status === 'AVAILABLE' &&
      table.assignedWaiter &&
      table.assignedWaiter.id !== currentUser?.id &&
      !isOwnerOrAdmin
    ) {
      setTakeoverWarningTable(table)
      return
    }

    openTableOrder(table)
  }

  // Refresco manual táctil
  const handleManualRefresh = async () => {
    setRefreshing(true)
    await refreshTables()
    setTimeout(() => setRefreshing(false), 500)
    notify.success('Mesas actualizadas', 'Sincronizado con cocina y caja')
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

  // Eliminar un platillo de la ronda
  const removeItemFromStaged = (variantId: string) => {
    setStagedItems((prev) => prev.filter((it) => it.variantId !== variantId))
  }

  // Actualizar nota completa
  const updateItemNote = (variantId: string, noteText: string) => {
    setStagedItems((prev) =>
      prev.map((it) => (it.variantId === variantId ? { ...it, notes: noteText } : it))
    )
  }

  // Agregar nota rápida al ítem
  const appendNoteToItem = (variantId: string, note: string) => {
    setStagedItems((prev) =>
      prev.map((it) => {
        if (it.variantId === variantId) {
          const current = it.notes ? it.notes.split(', ').filter(Boolean) : []
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
        setOrderViewTab('order')
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

  // Todas las mesas en lista plana para traspasos y conteos rápidos
  const allTablesList = areas.flatMap((a) => a.tables)
  const availableTargetTables = allTablesList.filter(
    (t) => t.status === 'AVAILABLE' && t.id !== activeTable?.id
  )
  const totalAvailable = allTablesList.filter((t) => t.status === 'AVAILABLE').length
  const totalOccupied = allTablesList.filter((t) => t.status === 'OCCUPIED').length
  const totalBillPrinted = allTablesList.filter((t) => t.status === 'BILL_PRINTED').length
  const myTablesCount = allTablesList.filter(
    (t) =>
      t.assignedWaiter?.id === currentUser?.id ||
      t.currentWaiter?.id === currentUser?.id ||
      t.activeOrder?.waiter?.id === currentUser?.id
  ).length

  // Cantidad total de artículos en la comanda (ronda por marchar + marchados en cocina)
  const totalOrderCount =
    stagedItems.reduce((acc, it) => acc + it.quantity, 0) +
    (activeTable?.activeOrder?.items.length || 0)

  const isOwnerOrAdmin =
    currentUser?.roleCodes?.includes('ADMIN') ||
    currentUser?.roleCodes?.includes('SUPERADMIN') ||
    currentUser?.roleCodes?.includes('BRANCH_MANAGER') ||
    currentUser?.permissions?.canManageSettings ||
    currentUser?.permissions?.canManageUsers

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
      {/* Top Navbar estilo Android App Bar */}
      <header className="border-b border-[#382b25] bg-[#1a1412]/95 backdrop-blur-md px-3 sm:px-4 py-2 flex items-center justify-between shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          {isOwnerOrAdmin && (
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all text-xs flex items-center gap-1 cursor-pointer"
              title="Volver al Panel Administrativo"
            >
              <ArrowLeft className="w-4 h-4 text-[#C08552]" />
            </Link>
          )}

          {activeBranch?.logoUrl ? (
            <img
              src={activeBranch.logoUrl}
              alt="Logo Sucursal"
              className="w-8 h-8 rounded-xl object-contain bg-white/10 p-0.5 border border-[#382b25]"
              onError={(e) => {
                ;(e.target as any).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold bg-[#C08552]/20 text-[#C08552] border border-[#C08552]/30">
              <Coffee className="w-4 h-4" />
            </div>
          )}

          <div>
            <h1 className="text-sm font-black text-white flex items-center gap-1.5 sm:gap-2 leading-tight">
              <span className="truncate">Comandera</span>
              {activeBranch && (
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#C08552]/20 text-[#C08552] border border-[#C08552]/30 truncate max-w-[130px] sm:max-w-none">
                  {activeBranch.name}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 sm:hidden">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="truncate max-w-[120px]">{currentUser?.name}</span>
            </div>
          </div>
        </div>

        {/* User Info & Quick Links */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-200 block">{currentUser?.name}</span>
            <span className="text-[10px] text-[#C08552] font-semibold">Mesero / Turno activo</span>
          </div>

          {/* Botón Refrescar táctil */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#251e1b] hover:bg-[#332924] border border-[#382b25] text-xs text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            title="Sincronizar mesas y pedidos"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-[#C08552] ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline text-[11px]">Sincronizar</span>
          </button>

          {/* Enlace a KDS Cocina (Oculto para mesero estricto) */}
          {(currentUser?.permissions?.canManageInventory ||
            currentUser?.roleCodes?.includes('ADMIN') ||
            currentUser?.roleCodes?.includes('CHEF') ||
            currentUser?.roleCodes?.includes('KITCHEN')) && (
            <Link
              href="/kds"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300 font-medium transition-all"
              title="Abrir pantalla KDS de Cocina"
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span className="hidden md:inline">KDS</span>
            </Link>
          )}

          {/* Enlace a Caja POS (Oculto para mesero estricto) */}
          {(currentUser?.permissions?.canManageCashRegisters ||
            currentUser?.roleCodes?.includes('ADMIN') ||
            currentUser?.roleCodes?.includes('CASHIER')) && (
            <Link
              href="/pos"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 font-medium transition-all"
              title="Abrir Terminal de Cobro"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Caja</span>
            </Link>
          )}

          {/* Bloquear / Salir a Relevo de PIN */}
          <button
            type="button"
            onClick={() => {
              setUnlockPin('')
              setUnlockError(null)
              setIsTerminalLocked(true)
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#251e1b] hover:bg-[#C08552]/20 border border-[#382b25] hover:border-[#C08552]/40 text-xs text-slate-300 hover:text-[#C08552] transition-all cursor-pointer"
            title="Bloquear pantalla o relevar mesero con PIN"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Relevo</span>
          </button>
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
      <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto space-y-4 sm:space-y-6">
        {/* Header con Filtros de Áreas, Filtro Mis Mesas y Leyenda de Estados */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#1a1412] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#382b25] shadow-lg">
          {/* Selector de Áreas y Filtro Mis Mesas */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedAreaId('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedAreaId === 'ALL'
                  ? 'bg-[#C08552] text-white shadow-md shadow-[#C08552]/30'
                  : 'bg-[#251e1b] border border-[#382b25] text-slate-300 hover:bg-[#332924]'
              }`}
            >
              Todas ({allTablesList.length})
            </button>
            {areas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAreaId(a.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedAreaId === a.id
                    ? 'bg-[#C08552] text-white shadow-md shadow-[#C08552]/30'
                    : 'bg-[#251e1b] border border-[#382b25] text-slate-300 hover:bg-[#332924]'
                }`}
              >
                {a.name} ({a.tables.length})
              </button>
            ))}

            {/* Separador vertical */}
            <div className="h-6 w-px bg-[#382b25] mx-1 shrink-0" />

            {/* Filtro Mis Mesas / Mis Comandas según Modo */}
            <button
              type="button"
              onClick={() => setFilterOnlyMyTables(!filterOnlyMyTables)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                filterOnlyMyTables
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/50'
                  : 'bg-[#251e1b] border border-[#382b25] text-slate-300 hover:bg-[#332924]'
              }`}
              title={
                tableServiceMode === 'FREE'
                  ? 'Filtrar comandas donde estoy atendiendo'
                  : 'Filtrar mis mesas asignadas a cargo'
              }
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{tableServiceMode === 'FREE' ? 'Mis Comandas' : 'Mis Mesas'}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  filterOnlyMyTables ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {myTablesCount}
              </span>
            </button>
          </div>

          {/* Estadísticas de Estado / Leyenda de Colores */}
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-300 overflow-x-auto pb-0.5">
            {tableServiceMode === 'FREE' ? (
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold shrink-0 shadow-sm"
                title="Servicio Libre: Cualquier mesero puede abrir y tomar cualquier mesa"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Modo Libre
              </span>
            ) : (
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold shrink-0 shadow-sm"
                title="Servicio Asignado: Mesas asignadas a meseros titulares"
              >
                <UserCheck className="w-3 h-3 text-amber-400" />
                Modo Asignado
              </span>
            )}
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {totalAvailable} Libres
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {totalOccupied} Ocupadas
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 font-semibold shrink-0">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
              {totalBillPrinted} Pre-cuenta
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
                  <Store className="w-4 h-4 text-[#C08552]" />
                  {area.name}
                  {filterOnlyMyTables && (
                    <span className="text-[10px] text-amber-400 normal-case bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                      ({tablesToRender.length} asignadas)
                    </span>
                  )}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
                  {tablesToRender.map((table) => {
                    const isOccupied = table.status === 'OCCUPIED'
                    const isBillPrinted = table.status === 'BILL_PRINTED'
                    const isAvailable = table.status === 'AVAILABLE'
                    const isTransferred = !!table.currentWaiter && table.currentWaiter.id !== table.assignedWaiter?.id
                    const isMyAssignedTable = tableServiceMode === 'ASSIGNED' && table.assignedWaiter?.id === currentUser?.id

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => handleSelectTable(table)}
                        className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border text-left transition-all relative flex flex-col justify-between min-h-[145px] sm:min-h-[160px] cursor-pointer hover:scale-[1.02] active:scale-95 select-none ${
                          isMyAssignedTable
                            ? isAvailable
                              ? 'bg-amber-950/20 border-amber-500/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                              : isBillPrinted
                              ? 'bg-violet-950/30 border-violet-500/60 shadow-lg shadow-violet-500/10 ring-2 ring-amber-500/60'
                              : 'bg-amber-950/30 border-amber-500/70 shadow-md shadow-amber-500/15 ring-2 ring-amber-500/50'
                            : isAvailable
                            ? 'bg-[#1c1715]/75 border-[#382b25] hover:border-emerald-500/50 hover:bg-emerald-500/5'
                            : isBillPrinted
                            ? 'bg-violet-950/30 border-violet-500/60 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30'
                            : 'bg-amber-950/25 border-amber-500/50 shadow-md shadow-amber-500/10'
                        }`}
                      >
                        {/* Cabecera de la Mesa */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-base sm:text-lg font-black text-white block leading-tight">
                                {table.name}
                              </span>
                              {isMyAssignedTable && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  ⭐ Mi Mesa
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3 text-slate-500" /> Cap: {table.capacity || 4}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-1">
                            {isBillPrinted && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-500 text-white flex items-center gap-0.5">
                                <Receipt className="w-2.5 h-2.5" /> Cobro
                              </span>
                            )}
                            <span
                              className={`w-3 h-3 rounded-full ${
                                isAvailable
                                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                                  : isBillPrinted
                                  ? 'bg-violet-400 animate-pulse'
                                  : 'bg-amber-500 shadow-sm shadow-amber-500/50'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Indicador de Atención según Modo */}
                        {tableServiceMode === 'FREE' ? (
                          <div className="text-[10px] space-y-0.5 my-1.5 bg-[#14100e]/80 p-2 rounded-xl border border-[#382b25]">
                            {table.activeOrder ? (
                              <span className="text-slate-300 flex items-center gap-1 truncate font-medium">
                                <Users className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                Atiende: <strong className="text-white">{table.activeOrder.waiter?.name || table.currentWaiter?.name || 'Mesero'}</strong>
                              </span>
                            ) : (
                              <span className="text-emerald-400/90 flex items-center gap-1 truncate font-medium">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                Servicio Libre (Cualquiera)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`text-[10px] space-y-0.5 my-1.5 p-2 rounded-xl border ${
                              isMyAssignedTable
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                                : 'bg-[#14100e]/80 border-[#382b25] text-slate-400'
                            }`}
                          >
                            <span className="flex items-center gap-1 truncate">
                              <Users className="w-2.5 h-2.5 text-[#C08552] shrink-0" />
                              {isMyAssignedTable ? (
                                <strong className="text-amber-300">⭐ Tu Mesa Asignada</strong>
                              ) : table.assignedWaiter ? (
                                <span>
                                  Titular: <strong className="text-slate-200">{table.assignedWaiter.name}</strong>
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">⚡ Sin mesero titular</span>
                              )}
                            </span>

                            {isTransferred && (
                              <span className="text-cyan-300 flex items-center gap-1 truncate font-semibold">
                                <ArrowRightLeft className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                                Relevo: {table.currentWaiter?.name}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Info de Comanda si está ocupada */}
                        {table.activeOrder ? (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-mono text-[11px]">
                                {table.activeOrder.itemsCount} platillos
                              </span>
                              <strong className="text-[#C08552] font-black text-sm">
                                ${table.activeOrder.total.toFixed(2)}
                              </strong>
                            </div>

                            {table.activeOrder.customerName && (
                              <span className="text-[10px] text-slate-400 block truncate italic font-medium">
                                👤 {table.activeOrder.customerName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-1">
                            <span className="text-xs font-bold text-emerald-400 block">
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

      {/* DRAWER / MODAL TÁCTIL DE COMANDA - FULLSCREEN EN MÓVIL Y TABLET */}
      {showOrderModal && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/90 md:bg-black/85 md:backdrop-blur-sm flex items-center justify-center p-0 md:p-3 lg:p-5">
          <div className="w-full h-full md:h-[94vh] md:max-w-6xl xl:max-w-7xl md:rounded-3xl bg-[#14100e] border-0 md:border md:border-[#382b25] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Header del Modal con estilo App Nativa */}
            <div className="p-3 sm:px-5 border-b border-[#382b25] flex items-center justify-between bg-[#1c1715] shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="p-2 -ml-1 rounded-xl bg-[#251e1b] hover:bg-[#332924] text-slate-300 md:hidden cursor-pointer"
                  title="Volver al plano de mesas"
                >
                  <ArrowLeft className="w-5 h-5 text-[#C08552]" />
                </button>

                <div className="w-10 h-10 rounded-2xl bg-[#C08552]/20 border border-[#C08552]/30 text-[#C08552] flex items-center justify-center font-bold shrink-0">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white truncate">
                      {activeTable.name}
                    </h3>
                    <span
                      className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                        activeTable.status === 'AVAILABLE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : activeTable.status === 'BILL_PRINTED'
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {activeTable.status === 'AVAILABLE'
                        ? 'Libre'
                        : activeTable.status === 'BILL_PRINTED'
                        ? 'Pre-cuenta'
                        : `Ocupada (#${activeTable.activeOrder?.orderNumber || ''})`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 truncate">
                    {tableServiceMode === 'FREE' ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        Servicio Libre
                        {activeTable.activeOrder?.waiter && (
                          <span className="text-slate-300 ml-1">
                            • Abierta por: <strong className="text-white">{activeTable.activeOrder.waiter.name}</strong>
                          </span>
                        )}
                      </span>
                    ) : (
                      <>
                        <span>
                          Titular: <strong className="text-slate-200">{activeTable.assignedWaiter?.name || 'Sin asignar'}</strong>
                        </span>
                        {activeTable.currentWaiter && activeTable.currentWaiter.id !== activeTable.assignedWaiter?.id && (
                          <span className="text-cyan-300 font-medium">
                            • Relevo: {activeTable.currentWaiter.name}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones de Cabecera */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Asignar titular */}
                <button
                  type="button"
                  onClick={() => {
                    setTargetAssignWaiterId(activeTable.assignedWaiter?.id || '')
                    setShowAssignWaiterModal(true)
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#251e1b] hover:bg-[#332924] border border-[#382b25] text-xs text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Asignar mesero titular a la mesa"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#C08552]" />
                  <span className="hidden lg:inline">Titular</span>
                </button>

                {activeTable.activeOrder && (
                  <>
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
                          title="Ceder mesa temporalmente a otro mesero"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Ceder</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowTransferModal(true)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#251e1b] hover:bg-[#332924] border border-[#382b25] text-xs text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Mover comanda a otra mesa física"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden lg:inline">Mover</span>
                        </button>
                      </>
                    )}

                    {/* Imprimir Pre-cuenta / Ticket */}
                    <button
                      type="button"
                      onClick={handleOpenPrintBill}
                      className="px-2.5 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-xs text-violet-300 border border-violet-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Imprimir ticket de cobro / pre-cuenta"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ticket</span>
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
                  className="hidden md:flex w-8 h-8 rounded-xl bg-[#251e1b] hover:bg-[#332924] text-slate-400 hover:text-white items-center justify-center font-bold cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Pestañas de Navegación del Modal (Móvil, Tablet y Escritorio) */}
            <div className="flex border-b border-[#382b25] bg-[#1a1412] p-1.5 sm:p-2 gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setOrderViewTab('catalog')}
                className={`flex-1 basis-0 min-w-0 h-11 sm:h-12 px-2 sm:px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer select-none active:scale-[0.99] ${
                  orderViewTab === 'catalog'
                    ? 'bg-[#C08552] text-white shadow-md shadow-[#C08552]/20'
                    : 'bg-[#14100e] text-slate-400 hover:text-slate-200 hover:bg-[#201815]'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden">Menú</span>
                  <span className="hidden sm:inline">Menú / Catálogo</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrderViewTab('order')}
                className={`flex-1 basis-0 min-w-0 h-11 sm:h-12 px-2 sm:px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-colors relative cursor-pointer select-none active:scale-[0.99] ${
                  orderViewTab === 'order'
                    ? 'bg-[#C08552] text-white shadow-md shadow-[#C08552]/20'
                    : 'bg-[#14100e] text-slate-400 hover:text-slate-200 hover:bg-[#201815]'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden">Comanda</span>
                  <span className="hidden sm:inline">Artículos Registrados</span>
                </span>
                {totalOrderCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-black leading-none shrink-0 tabular-nums ${
                      orderViewTab === 'order'
                        ? 'bg-slate-950 text-[#F3E9DC]'
                        : 'bg-[#C08552] text-white shadow-sm'
                    }`}
                  >
                    {totalOrderCount}
                  </span>
                )}
              </button>

              {/* Opción Pantalla Dividida en pantallas grandes */}
              <button
                type="button"
                onClick={() => setOrderViewTab('split')}
                className={`hidden lg:flex flex-1 basis-0 min-w-0 h-11 sm:h-12 items-center justify-center gap-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer select-none active:scale-[0.99] ${
                  orderViewTab === 'split'
                    ? 'bg-[#C08552] text-white shadow-md shadow-[#C08552]/20'
                    : 'bg-[#14100e] text-slate-400 hover:text-slate-200 hover:bg-[#201815]'
                }`}
                title="Ver Catálogo y Artículos simultáneamente"
              >
                <Columns className="w-4 h-4 shrink-0" />
                <span className="truncate">Vista Dividida</span>
              </button>
            </div>

            {/* Contenido Dinámico: Catálogo Táctil vs Tarjetas de Comanda */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* VISTA CATÁLOGO (visible si orderViewTab === 'catalog' o 'split') */}
              {(orderViewTab === 'catalog' || orderViewTab === 'split') && (
                <div
                  className={`flex flex-col p-3 sm:p-4 space-y-3 overflow-y-auto flex-1 ${
                    orderViewTab === 'split' ? 'border-r border-[#382b25]' : ''
                  }`}
                >
                  {/* Search & Categories Bar */}
                  <div className="space-y-2 shrink-0">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Buscar platillo, postre o bebida..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-[#14100e] border border-[#382b25] text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Categories Pills */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedCatId('ALL')}
                        className={`px-3.5 py-2 rounded-xl font-bold shrink-0 cursor-pointer transition-all ${
                          selectedCatId === 'ALL'
                            ? 'bg-[#C08552] text-white shadow-md shadow-[#C08552]/20'
                            : 'bg-[#14100e] border border-[#382b25] text-slate-400 hover:text-white'
                        }`}
                      >
                        Todos
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCatId(c.id)}
                          className={`px-3.5 py-2 rounded-xl font-bold shrink-0 cursor-pointer transition-all ${
                            selectedCatId === c.id
                              ? 'bg-[#C08552] text-white shadow-md shadow-[#C08552]/20'
                              : 'bg-[#14100e] border border-[#382b25] text-slate-400 hover:text-white'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid de Tarjetas de Productos Táctil con Steppers Directos (+ y -) */}
                  <div
                    className={`overflow-y-auto flex-1 pb-16 md:pb-0 gap-3 auto-rows-max ${
                      orderViewTab === 'split'
                        ? 'grid grid-cols-2 sm:grid-cols-3'
                        : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                    }`}
                  >
                    {filteredProducts.map((p) => {
                      const price = Number(p.variants[0]?.price || 0)
                      const variant = p.variants[0]
                      const stagedItem = variant
                        ? stagedItems.find((it) => it.variantId === variant.id)
                        : null
                      const stagedCount = stagedItem?.quantity || 0

                      return (
                        <div
                          key={p.id}
                          className={`p-3 sm:p-3.5 rounded-2xl border transition-colors flex flex-col justify-between relative select-none ${
                            stagedCount > 0
                              ? 'bg-[#251b15] border-[#C08552] shadow-md shadow-[#C08552]/15'
                              : 'bg-[#1c1715] border-[#382b25] hover:border-[#C08552]/50 hover:bg-[#221c19]'
                          }`}
                        >
                          {/* Badge de cantidad */}
                          {stagedCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-[#C08552] text-white font-black text-xs shadow-md">
                              {stagedCount}
                            </span>
                          )}

                          {/* Info del platillo */}
                          <div
                            className="space-y-1 cursor-pointer flex-1"
                            onClick={() => handleAddProduct(p)}
                          >
                            <span className="text-xs sm:text-sm font-bold text-white block line-clamp-2 leading-snug">
                              {p.name}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                              {p.category?.name || 'General'}
                            </span>
                            <div className="pt-1">
                              <strong className="text-xs sm:text-sm text-[#C08552] font-black">
                                ${price.toFixed(2)}
                              </strong>
                            </div>
                          </div>

                          {/* Stepper Directo en la Tarjeta: Aumentar / Disminuir (h-10 fija para evitar saltos) */}
                          <div className="pt-2 mt-2 border-t border-[#382b25]/60 h-10 flex items-center">
                            {stagedCount === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleAddProduct(p)}
                                className="w-full h-8 rounded-xl bg-[#2a211d] hover:bg-[#C08552] text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5 text-[#C08552]" />
                                <span>Agregar</span>
                              </button>
                            ) : (
                              <div className="w-full h-8 flex items-center justify-between bg-[#14100e] px-1 rounded-xl border border-[#382b25]">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (variant) updateStagedQty(variant.id, -1)
                                  }}
                                  className="w-7 h-6 flex items-center justify-center rounded-lg bg-[#251e1b] hover:bg-[#332924] active:scale-90 text-slate-200 hover:text-white font-black cursor-pointer transition-colors"
                                  title="Disminuir"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                <div className="flex flex-col items-center leading-none px-1">
                                  <span className="font-black text-white text-xs sm:text-sm font-mono">
                                    {stagedCount}
                                  </span>
                                  <span className="text-[9px] text-[#C08552] font-mono">
                                    ${(price * stagedCount).toFixed(2)}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (variant) updateStagedQty(variant.id, 1)
                                  }}
                                  className="w-7 h-6 flex items-center justify-center rounded-lg bg-[#C08552] hover:bg-[#a87445] active:scale-90 text-white font-black cursor-pointer transition-colors shadow-sm"
                                  title="Aumentar"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Barra Flotante Inferior de Resumen cuando hay artículos registrados */}
                  {stagedItems.length > 0 && orderViewTab === 'catalog' && (
                    <div className="sticky bottom-0 left-0 right-0 p-3 bg-[#1c1715]/95 border-t border-[#382b25] backdrop-blur-md flex items-center justify-between shadow-2xl z-30 rounded-2xl">
                      <div>
                        <span className="text-xs text-slate-300 block font-medium">
                          {stagedItems.reduce((acc, it) => acc + it.quantity, 0)}{' '}
                          {stagedItems.reduce((acc, it) => acc + it.quantity, 0) === 1
                            ? 'artículo registrado'
                            : 'artículos registrados'}
                        </span>
                        <strong className="text-sm sm:text-base font-black text-[#C08552] font-mono">
                          $
                          {stagedItems
                            .reduce((acc, it) => acc + it.unitPrice * it.quantity, 0)
                            .toFixed(2)}{' '}
                          MXN
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => setOrderViewTab('order')}
                        className="px-4 py-2.5 rounded-xl bg-[#C08552] hover:bg-[#a87445] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#C08552]/30 active:scale-95 cursor-pointer transition-all"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Ver Comanda ({stagedItems.reduce((acc, it) => acc + it.quantity, 0)}) →</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* VISTA ARTÍCULOS REGISTRADOS / COMANDA (visible si orderViewTab === 'order' o 'split') */}
              {(orderViewTab === 'order' || orderViewTab === 'split') && (
                <div
                  className={`flex flex-col bg-[#14100e] p-3 sm:p-4 space-y-4 overflow-y-auto ${
                    orderViewTab === 'split'
                      ? 'w-full lg:w-[480px] xl:w-[560px] 2xl:w-[620px] shrink-0'
                      : 'flex-1'
                  }`}
                >
                  {/* Nombre de comensal opcional */}
                  <div className="shrink-0 space-y-1">
                    <label className="text-[11px] text-slate-400 font-medium">
                      Nombre de Comensal / Referencia:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Familia López / Mesa 4"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                    />
                  </div>

                  {/* Lista 1: Platillos ya en Cocina / KDS */}
                  {activeTable.activeOrder && activeTable.activeOrder.items.length > 0 && (
                    <div className="space-y-2 shrink-0 bg-[#191412] p-3 rounded-2xl border border-[#382b25]">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        Marchado en Cocina ({activeTable.activeOrder.items.length})
                      </span>

                      <div
                        className={`overflow-y-auto pr-1 gap-2 ${
                          orderViewTab === 'split'
                            ? 'space-y-2 max-h-40'
                            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-h-48'
                        }`}
                      >
                        {activeTable.activeOrder.items.map((it) => (
                          <div
                            key={it.id}
                            className="p-2.5 rounded-xl bg-[#1c1715] border border-[#382b25] flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-white block truncate">
                                {it.quantity}x {it.productName}
                              </span>
                              {it.notes && (
                                <span className="text-[10px] text-amber-300/90 block italic truncate mt-0.5">
                                  Nota: {it.notes}
                                </span>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  it.kitchenStatus === 'READY'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : it.kitchenStatus === 'COOKING'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {it.kitchenStatus === 'READY'
                                  ? '✓ Listo'
                                  : it.kitchenStatus === 'COOKING'
                                  ? '🍳 Preparando'
                                  : '⏳ En espera'}
                              </span>
                              <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                                ${it.subtotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lista 2: TARJETAS de Nuevos Platillos a Marchar */}
                  <div className="flex-1 flex flex-col space-y-3 overflow-y-auto">
                    <div className="flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold text-[#C08552] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Nuevos Artículos por Marchar ({stagedItems.length})
                      </span>
                      <div className="flex items-center gap-2">
                        {orderViewTab === 'order' && (
                          <button
                            type="button"
                            onClick={() => setOrderViewTab('catalog')}
                            className="text-xs font-bold text-slate-300 hover:text-white bg-[#251e1b] hover:bg-[#332924] px-2.5 py-1 rounded-lg border border-[#382b25] transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#C08552]" />
                            <span>Agregar Más</span>
                          </button>
                        )}

                        {stagedItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setStagedItems([])}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 cursor-pointer"
                          >
                            Vaciar ronda
                          </button>
                        )}
                      </div>
                    </div>

                    {stagedItems.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-[#382b25] rounded-3xl p-8 text-center space-y-3">
                        <ShoppingBag className="w-12 h-12 opacity-30 text-[#C08552]" />
                        <div>
                          <p className="font-bold text-slate-300 text-sm">
                            Sin artículos registrados aún
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            Selecciona platillos o bebidas del menú para agregarlos a esta ronda.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOrderViewTab('catalog')}
                          className="px-4 py-2.5 rounded-xl bg-[#C08552] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#C08552]/20 cursor-pointer active:scale-95"
                        >
                          <UtensilsCrossed className="w-4 h-4" />
                          <span>Abrir Catálogo / Menú</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`overflow-y-auto flex-1 pr-1 gap-3.5 auto-rows-max ${
                          orderViewTab === 'split'
                            ? 'grid grid-cols-1 xl:grid-cols-2'
                            : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                        }`}
                      >
                        {stagedItems.map((item) => (
                          <div
                            key={item.variantId}
                            className="p-3.5 rounded-2xl bg-[#1c1715] border border-[#382b25] hover:border-[#C08552]/40 flex flex-col justify-between space-y-3 text-xs shadow-md transition-colors"
                          >
                            {/* Cabecera de la Tarjeta: Nombre y Subtotal */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <strong className="text-white block text-sm font-bold truncate">
                                  {item.productName}
                                </strong>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-slate-400 text-xs font-mono">
                                    ${item.unitPrice.toFixed(2)} c/u
                                  </span>
                                  <span className="text-[#C08552] font-black text-xs font-mono">
                                    • ${(item.unitPrice * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeItemFromStaged(item.variantId)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-colors cursor-pointer shrink-0"
                                title="Quitar platillo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Stepper Táctil: Disminuir [-] y Aumentar [+] */}
                            <div className="flex items-center justify-between bg-[#14100e] p-1.5 rounded-xl border border-[#382b25]">
                              <span className="text-[11px] text-slate-400 font-medium px-2">
                                Cantidad:
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateStagedQty(item.variantId, -1)}
                                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[#251e1b] hover:bg-[#332924] text-slate-200 hover:text-white active:scale-90 transition-colors cursor-pointer font-black text-sm"
                                  title="Disminuir"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>

                                <span className="font-black text-white text-sm sm:text-base px-2 min-w-[28px] text-center font-mono">
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => updateStagedQty(item.variantId, 1)}
                                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[#C08552] hover:bg-[#a87445] text-white active:scale-90 transition-colors cursor-pointer font-black text-sm shadow-md shadow-[#C08552]/20"
                                  title="Aumentar"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Notas Rápidas y Chips para Cocina */}
                            <div className="space-y-1.5 pt-2 border-t border-[#251e1b]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="Nota especial (ej. sin azúcar, para llevar)..."
                                  value={item.notes}
                                  onChange={(e) => updateItemNote(item.variantId, e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 rounded-xl bg-[#14100e] border border-[#382b25] text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                                />
                                {item.notes && (
                                  <button
                                    type="button"
                                    onClick={() => updateItemNote(item.variantId, '')}
                                    className="text-xs text-slate-400 hover:text-white px-1.5 py-1 cursor-pointer"
                                    title="Borrar nota"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {PRESET_NOTES.slice(0, 5).map((note) => (
                                  <button
                                    key={note}
                                    type="button"
                                    onClick={() => appendNoteToItem(item.variantId, note)}
                                    className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg bg-[#251e1b] hover:bg-[#332924] border border-[#382b25] text-slate-300 active:scale-95 transition-all cursor-pointer"
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
                  <div className="pt-3 border-t border-[#382b25] space-y-2.5 shrink-0 bg-[#14100e]">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-slate-400">Total ronda a marchar:</span>
                      <strong className="text-[#C08552] text-base sm:text-lg font-black font-mono">
                        $
                        {stagedItems
                          .reduce((acc, curr) => acc + curr.unitPrice * curr.quantity, 0)
                          .toFixed(2)}{' '}
                        MXN
                      </strong>
                    </div>

                    <div className="flex gap-2">
                      {orderViewTab === 'order' && (
                        <button
                          type="button"
                          onClick={() => setOrderViewTab('catalog')}
                          className="flex-1 py-3 rounded-2xl bg-[#251e1b] hover:bg-[#332924] border border-[#382b25] text-slate-300 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer transition-all"
                        >
                          <UtensilsCrossed className="w-4 h-4 text-[#C08552]" />
                          <span>+ Agregar Más</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleSendToKitchen}
                        disabled={submittingOrder || stagedItems.length === 0}
                        className="flex-1 py-3.5 rounded-2xl bg-[#C08552] hover:bg-[#a87445] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C08552]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 select-none"
                      >
                        {submittingOrder ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Enviar a Cocina</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

      {/* MODAL FULLSCREEN DE BLOQUEO DE TERMINAL Y RELEVO RÁPIDO */}
      {isTerminalLocked && (
        <div className="fixed inset-0 z-50 bg-[#0e0c0b]/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#14100e] border border-[#382b25] p-6 space-y-5 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-[#C08552]/10 border border-[#C08552]/30 text-[#C08552] flex items-center justify-center mx-auto shadow-lg shadow-[#C08552]/10">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1c1715] border border-[#382b25] text-[11px] text-[#C08552] mb-2 font-bold">
                <Store className="w-3 h-3" />
                <span>{activeBranch?.name || 'Comandera'}</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Comandera Bloqueada</h2>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa tu PIN de 4 dígitos para relevar o continuar turno
              </p>
              {currentUser && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Último mesero: <span className="text-slate-300 font-semibold">{currentUser.name}</span>
                </p>
              )}
            </div>

            {/* Error */}
            {unlockError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium animate-in fade-in">
                {unlockError}
              </div>
            )}

            {/* PIN indicators */}
            <div className="flex justify-center gap-3 my-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl font-bold transition-all ${
                    unlockPin.length > idx
                      ? 'border-[#C08552] bg-[#C08552]/15 text-[#C08552] shadow-md shadow-[#C08552]/20'
                      : 'border-[#382b25] bg-[#1c1715] text-slate-600'
                  }`}
                >
                  {unlockPin.length > idx ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Teclado numérico táctil optimizado para Touch (botones amplios h-14) */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleKeypadPressUnlock(val)}
                  disabled={unlocking}
                  className="h-14 rounded-2xl bg-[#1c1715] hover:bg-[#251e1b] border border-[#382b25] text-lg font-bold text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center select-none"
                >
                  {val === 'DEL' ? '⌫' : val}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleUnlockTerminal()}
              disabled={unlocking || unlockPin.length < 4}
              className="w-full py-3.5 px-4 rounded-xl bg-[#C08552] hover:bg-[#a87445] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#C08552]/20 transition-all disabled:opacity-40 cursor-pointer active:scale-95"
            >
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Desbloquear Comandera</span>
            </button>

            {/* Opción de cerrar sesión general */}
            <div className="pt-2 border-t border-slate-800/80">
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full text-[11px] text-slate-500 hover:text-red-400 flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir al Login Principal (Cerrar Sesión)</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADVERTENCIA AL TOMAR MESA ASIGNADA A OTRO MESERO */}
      {takeoverWarningTable && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#14100e] border border-[#382b25] p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Mesa con mesero titular</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                La <strong className="text-white">{takeoverWarningTable.name}</strong> está asignada
                a <strong className="text-amber-300">{takeoverWarningTable.assignedWaiter?.name}</strong>.
              </p>
              <p className="text-[11px] text-slate-400">
                ¿Deseas abrir la comanda para atenderla como apoyo o relevo?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTakeoverWarningTable(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#251e1b] hover:bg-[#332924] border border-[#382b25] text-slate-300 text-xs font-bold cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => openTableOrder(takeoverWarningTable)}
                style={{ backgroundColor: activeBranch?.primaryColor || '#C08552' }}
                className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 cursor-pointer transition-all flex items-center justify-center gap-1"
              >
                <span>Atender como Apoyo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

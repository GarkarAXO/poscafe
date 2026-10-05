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
import { isLightColor, getStatusBadgeStyles } from '@/lib/theme-utils'
import ProductCustomizerModal, {
  CustomizedItemResult,
  CustomizerProduct,
} from '@/components/product-customizer-modal'

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
      modifiers?: Array<{
        id: string
        modifier: { id: string; name: string; extraPrice: number }
      }>
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
  modifierGroups?: Array<{
    modifierGroup: {
      id: string
      name: string
      minSelect: number
      maxSelect: number
      isRequired: boolean
      modifiers: Array<{
        id: string
        name: string
        extraPrice: number
        inventoryItemId?: string | null
        quantityBase?: number | null
      }>
    }
  }>
}

interface StagedItem {
  stagedId?: string
  variantId: string
  productName: string
  variantName: string
  unitPrice: number
  quantity: number
  notes: string
  modifiers?: Array<{
    modifierId: string
    name: string
    unitPrice: number
  }>
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
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([])
  const [customizingProduct, setCustomizingProduct] = useState<CustomizerProduct | null>(null)
  const [showCustomizerModal, setShowCustomizerModal] = useState(false)
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
  const [welcomeOverlayUser, setWelcomeOverlayUser] = useState<any>(null)
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
      setWelcomeOverlayUser(newUser)
      setTimeout(() => {
        setWelcomeOverlayUser(null)
      }, 2000)
      const isFemale = newUser.gender === 'FEMALE'
      notify.success(
        isFemale ? '¡Bienvenida!' : '¡Bienvenido!',
        `Operando como: ${newUser.name} (${newUser.role?.name || newUser.roleName || 'Colaborador'})`
      )
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
        if (res.data.branch) {
          setActiveBranch(res.data.branch)
        }
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
    // Sondeo periódico cada 6 segundos
    const interval = setInterval(refreshTables, 6000)

    // Sincronización instantánea al volver al apartado o enfocar la pestaña
    const handleFocus = () => {
      refreshTables()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshTables()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
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

  // Agregar platillo al pedido nuevo (abre modal de personalización si tiene variantes o modificadores)
  const handleAddProduct = (prod: Product) => {
    const hasMultipleVariants = prod.variants && prod.variants.length > 1
    const hasModifierGroups = prod.modifierGroups && prod.modifierGroups.length > 0

    if (hasMultipleVariants || hasModifierGroups) {
      setCustomizingProduct(prod as any)
      setShowCustomizerModal(true)
      return
    }

    const variant = prod.variants[0]
    if (!variant) return

    setStagedItems((prev) => {
      const existing = prev.find(
        (it) => it.variantId === variant.id && (!it.modifiers || it.modifiers.length === 0) && !it.notes
      )
      if (existing) {
        return prev.map((it) =>
          it === existing ? { ...it, quantity: it.quantity + 1 } : it
        )
      }
      return [
        ...prev,
        {
          stagedId: `${variant.id}_${Date.now()}`,
          variantId: variant.id,
          productName: prod.name,
          variantName: variant.name,
          unitPrice: Number(variant.price),
          quantity: 1,
          notes: '',
          modifiers: [],
        },
      ]
    })
  }

  // Callback al confirmar personalización en el modal
  const handleConfirmCustomization = (result: CustomizedItemResult) => {
    if (!customizingProduct) return

    setStagedItems((prev) => [
      ...prev,
      {
        stagedId: `${result.variantId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        variantId: result.variantId,
        productName: customizingProduct.name,
        variantName: result.variantName,
        unitPrice: result.unitPrice,
        quantity: result.quantity,
        notes: result.notes,
        modifiers: result.modifiers,
      },
    ])
  }

  // Modificar cantidad en preparación (soporta stagedId o variantId)
  const updateStagedQty = (id: string, delta: number) => {
    setStagedItems((prev) =>
      prev
        .map((it) => {
          if (it.stagedId === id || it.variantId === id) {
            const newQty = it.quantity + delta
            return newQty > 0 ? { ...it, quantity: newQty } : null
          }
          return it
        })
        .filter(Boolean) as StagedItem[]
    )
  }

  // Eliminar un platillo de la ronda (soporta stagedId o variantId)
  const removeItemFromStaged = (id: string) => {
    setStagedItems((prev) =>
      prev.filter((it) => (it.stagedId ? it.stagedId !== id : it.variantId !== id))
    )
  }

  // Actualizar nota completa
  const updateItemNote = (id: string, noteText: string) => {
    setStagedItems((prev) =>
      prev.map((it) => ((it.stagedId === id || it.variantId === id) ? { ...it, notes: noteText } : it))
    )
  }

  // Agregar nota rápida al ítem
  const appendNoteToItem = (id: string, note: string) => {
    setStagedItems((prev) =>
      prev.map((it) => {
        if (it.stagedId === id || it.variantId === id) {
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
          modifiers: it.modifiers?.map((m) => ({
            modifierId: m.modifierId,
            unitPrice: m.unitPrice,
          })) || [],
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

  // Traspasar / Encargar mesa a otro compañero mesero
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
        notify.success('Mesa encargada con éxito', json.message)
        await refreshTables()
        const targetWaiterObj = waiters.find((w) => w.id === targetTransferWaiterId)
        setActiveTable((prev) =>
          prev
            ? {
                ...prev,
                currentWaiter: targetWaiterObj
                  ? { id: targetWaiterObj.id, name: targetWaiterObj.name }
                  : null,
              }
            : null
        )
      } else {
        const errMsg = json.error?.message || 'No se pudo encargar la mesa'
        notify.error('Error al encargar', errMsg)
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible comunicar con el servidor')
    } finally {
      setTransferringWaiter(false)
    }
  }

  // Regresar mesa encargada/temporal a su titular (ej. al regresar del baño o terminar el apoyo)
  const handleReturnTableToTitular = async (tableToReturn?: TableItem) => {
    const table = tableToReturn || activeTable
    if (!table) return

    try {
      const res = await fetch(`/api/comandas/tables/${table.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RETURN_TO_TITULAR' }),
      })
      const json = await res.json()
      if (json.success) {
        notify.success('Mesa devuelta', json.message)
        await refreshTables()
        if (
          tableServiceMode === 'ASSIGNED' &&
          !isOwnerOrAdmin &&
          table.assignedWaiter?.id !== currentUser?.id
        ) {
          setShowOrderModal(false)
        } else {
          setActiveTable((prev) => (prev ? { ...prev, currentWaiter: null } : null))
        }
      } else {
        notify.error('Error al devolver', json.error?.message || 'No se pudo devolver la mesa')
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible comunicar con el servidor')
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

  const isOwnerOrAdmin =
    currentUser?.roleCodes?.includes('ADMIN') ||
    currentUser?.roleCodes?.includes('SUPERADMIN') ||
    currentUser?.roleCodes?.includes('BRANCH_MANAGER') ||
    currentUser?.permissions?.canManageSettings ||
    currentUser?.permissions?.canManageUsers

  // Determina si una mesa es visible para el usuario actual:
  // - Dueños / Administradores / Gerentes: ven todo el plano para supervisión general.
  // - Modo Libre (FREE): todas las mesas son libres y visibles para todos los meseros.
  // - Modo Asignado (ASSIGNED): un mesero solo ve sus mesas asignadas (titular), comandas que atiende,
  //   mesas encargadas/traspasadas a él, o mesas libres/sin asignar en el salón. NUNCA ve las mesas de los demás.
  const isTableVisibleForUser = (table: TableItem) => {
    if (isOwnerOrAdmin) return true
    if (tableServiceMode === 'FREE') return true

    // En Modo Asignado (ASSIGNED):
    const isOwnAssigned = table.assignedWaiter?.id === currentUser?.id
    const isMyActiveOrder = table.activeOrder?.waiter?.id === currentUser?.id
    const isTransferredToMe = table.currentWaiter?.id === currentUser?.id
    const isUnassignedFree = !table.assignedWaiter && table.status === 'AVAILABLE'

    return isOwnAssigned || isMyActiveOrder || isTransferredToMe || isUnassignedFree
  }

  const isMyTable = (table: TableItem) =>
    table.assignedWaiter?.id === currentUser?.id ||
    table.currentWaiter?.id === currentUser?.id ||
    table.activeOrder?.waiter?.id === currentUser?.id

  // Todas las mesas en lista plana para traspasos y conteos rápidos
  const allTablesList = areas.flatMap((a) => a.tables)

  // Mesas visibles según el modo de servicio, permisos y filtro "Mis Mesas"
  const visibleTablesList = allTablesList.filter((table) => {
    if (!isTableVisibleForUser(table)) return false
    if (filterOnlyMyTables && !isMyTable(table)) return false
    return true
  })

  // Mesas disponibles como destino de traspaso (solo entre las mesas que el mesero puede ver y usar)
  const availableTargetTables = visibleTablesList.filter(
    (t) => t.status === 'AVAILABLE' && t.id !== activeTable?.id
  )

  const totalAvailable = visibleTablesList.filter((t) => t.status === 'AVAILABLE').length
  const totalOccupied = visibleTablesList.filter((t) => t.status === 'OCCUPIED').length
  const totalBillPrinted = visibleTablesList.filter((t) => t.status === 'BILL_PRINTED').length
  const myTablesCount = allTablesList.filter(isMyTable).length

  // Cantidad total de artículos en la comanda (ronda por marchar + marchados en cocina)
  const totalOrderCount =
    stagedItems.reduce((acc, it) => acc + it.quantity, 0) +
    (activeTable?.activeOrder?.items.length || 0)

  // Mesas filtradas por área seleccionada
  const displayedAreas =
    selectedAreaId === 'ALL' ? areas : areas.filter((a) => a.id === selectedAreaId)

  // Colores dinámicos del tema configurados en la base de datos para la sucursal activa
  const themeBg = activeBranch?.bgColor || '#14100E'
  const themePrimary = activeBranch?.primaryColor || '#C08552'
  const themeSecondary = activeBranch?.secondaryColor || '#5E3023'
  const themeButton = activeBranch?.buttonColor || activeBranch?.primaryColor || '#C08552'
  const isLight = isLightColor(themeBg)
  const isLightButton = isLightColor(themeButton)

  if (loading) {
    return (
      <div className="h-screen bg-[#14100E] flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#C08552]" />
        <p className="text-xs">Sincronizando mesas y comandas...</p>
      </div>
    )
  }

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden selection:bg-[#C08552] selection:text-white relative ${
        isLight ? 'text-[#2B1712]' : 'text-slate-100'
      }`}
      style={{ backgroundColor: themeBg }}
    >
      {/* Resplandores ambientales cálidos según los colores del tema de la BD */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-32 left-1/3 w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{ backgroundColor: themePrimary, opacity: isLight ? 0.08 : 0.14 }}
        />
        <div
          className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full blur-[130px]"
          style={{ backgroundColor: themeSecondary, opacity: isLight ? 0.06 : 0.12 }}
        />
      </div>

      {/* Top Navbar estilo Android App Bar */}
      <header
        className="border-b px-3 sm:px-4 py-2 flex items-center justify-between shrink-0 z-20 shadow-md backdrop-blur-md"
        style={{
          backgroundColor: isLight ? '#FFFFFFE6' : `${themeBg}F2`,
          borderColor: isLight ? '#DECEBD' : `${themeSecondary}50`,
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {isOwnerOrAdmin && (
            <Link
              href="/dashboard"
              className={`p-2 rounded-xl transition-all text-xs flex items-center gap-1 cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-[#F3E9DC] text-[#5E3023] border border-[#DECEBD] shadow-xs'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
              }`}
              title="Volver al Panel Administrativo"
            >
              <ArrowLeft className="w-4 h-4" style={{ color: themePrimary }} />
            </Link>
          )}

          {/* Isologo / Isotipo de la Sucursal (libre y sin encerrar) */}
          {activeBranch?.isotypeUrl || activeBranch?.logoUrl ? (
            <img
              src={activeBranch.isotypeUrl || activeBranch.logoUrl}
              alt={activeBranch.name || 'Isologo'}
              className="h-8 sm:h-9 w-auto max-w-[44px] object-contain drop-shadow-md select-none transition-transform hover:scale-105"
              onError={(e) => {
                ;(e.target as any).style.display = 'none'
              }}
            />
          ) : (
            <Coffee className="w-6 h-6 shrink-0" style={{ color: themePrimary }} />
          )}

          <div>
            <h1 className={`text-sm font-black flex items-center gap-1.5 sm:gap-2 leading-tight ${
              isLight ? 'text-[#2B1712]' : 'text-white'
            }`}>
              <span className="truncate">Comandera</span>
              {activeBranch && currentUser?.branches && currentUser.branches.length > 1 && (
                <span
                  className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border truncate max-w-[130px] sm:max-w-none"
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
            <div className="flex items-center gap-1.5 text-[11px] sm:hidden">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className={`truncate max-w-[110px] font-medium ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                {currentUser?.name}
              </span>
            </div>
          </div>
        </div>

        {/* User Info & Quick Links */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden sm:block">
            <span className={`text-xs font-bold block ${isLight ? 'text-[#2B1712]' : 'text-slate-200'}`}>
              {currentUser?.name}
            </span>
            <span className={`text-[10px] font-semibold ${isLight ? 'text-[#7A5A43]' : ''}`} style={isLight ? {} : { color: themePrimary }}>
              Mesero / Turno activo
            </span>
          </div>

          {/* Enlace a KDS Cocina (Oculto para mesero estricto) */}
          {(currentUser?.permissions?.canManageInventory ||
            currentUser?.roleCodes?.includes('ADMIN') ||
            currentUser?.roleCodes?.includes('CHEF') ||
            currentUser?.roleCodes?.includes('KITCHEN')) && (
            <Link
              href="/kds"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${getStatusBadgeStyles('KDS', isLight).className}`}
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
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${getStatusBadgeStyles('POS', isLight).className}`}
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer shadow-xs active:scale-95 ${
              isLight
                ? 'bg-white hover:bg-[#F3E9DC] text-[#5E3023] border-[#DECEBD]'
                : ''
            }`}
            style={
              isLight
                ? {}
                : {
                    backgroundColor: `${themeSecondary}60`,
                    borderColor: `${themeSecondary}90`,
                  }
            }
            title="Bloquear pantalla o relevar mesero con PIN"
          >
            <Lock className="w-3.5 h-3.5" style={{ color: isLight ? '#5E3023' : themePrimary }} />
            <span className="hidden sm:inline font-semibold">Relevo</span>
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
        <div
          className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-lg backdrop-blur-sm ${
            isLight ? 'bg-white/90 border-[#DECEBD]' : ''
          }`}
          style={
            isLight
              ? {}
              : {
                  backgroundColor: `${themeSecondary}25`,
                  borderColor: `${themeSecondary}40`,
                }
          }
        >
          {/* Selector de Áreas y Filtro Mis Mesas */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedAreaId('ALL')}
              style={selectedAreaId === 'ALL' ? { backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' } : {}}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedAreaId === 'ALL'
                  ? 'shadow-md'
                  : isLight
                  ? 'bg-[#F3E9DC]/80 border border-[#DECEBD] text-[#5E3023] hover:bg-[#DECEBD]'
                  : 'bg-[#251e1b]/80 border border-[#382b25] text-slate-300 hover:bg-[#332924]'
              }`}
            >
              Todas ({visibleTablesList.length})
            </button>
            {areas.map((a) => {
              const countInArea = a.tables.filter((t) => {
                if (!isTableVisibleForUser(t)) return false
                if (filterOnlyMyTables && !isMyTable(t)) return false
                return true
              }).length

              if (tableServiceMode === 'ASSIGNED' && !isOwnerOrAdmin && countInArea === 0) {
                return null
              }

              const isActive = selectedAreaId === a.id
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAreaId(a.id)}
                  style={isActive ? { backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' } : {}}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'shadow-md'
                      : isLight
                      ? 'bg-[#F3E9DC]/80 border border-[#DECEBD] text-[#5E3023] hover:bg-[#DECEBD]'
                      : 'bg-[#251e1b]/80 border border-[#382b25] text-slate-300 hover:bg-[#332924]'
                  }`}
                >
                  {a.name} ({countInArea})
                </button>
              )
            })}

            {/* Separador vertical */}
            <div className={`h-6 w-px mx-1 shrink-0 ${isLight ? 'bg-[#DECEBD]' : 'bg-[#382b25]'}`} />

            {/* Filtro Mis Mesas / Mis Comandas según Modo */}
            {tableServiceMode === 'ASSIGNED' && !isOwnerOrAdmin ? (
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 ${getStatusBadgeStyles('MODE_ASSIGNED', isLight).className}`}
                title="En Modo Asignado solo verás tus mesas asignadas o las que te hayan encargado"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Mis Mesas</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isLight ? 'bg-amber-200 text-amber-950' : 'bg-slate-950 text-amber-400'}`}>
                  {myTablesCount}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setFilterOnlyMyTables(!filterOnlyMyTables)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                  filterOnlyMyTables
                    ? isLight
                      ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                      : 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/50'
                    : isLight
                    ? 'bg-[#F3E9DC]/80 border border-[#DECEBD] text-[#5E3023] hover:bg-[#DECEBD]'
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
                    filterOnlyMyTables
                      ? isLight
                        ? 'bg-white text-amber-950'
                        : 'bg-slate-950 text-amber-400'
                      : isLight
                      ? 'bg-white text-[#5E3023] border border-[#DECEBD]'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {myTablesCount}
                </span>
              </button>
            )}
          </div>

          {/* Estadísticas de Estado / Leyenda de Colores */}
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] overflow-x-auto pb-0.5">
            {tableServiceMode === 'FREE' ? (
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 ${getStatusBadgeStyles('MODE_FREE', isLight).className}`}
                title="Servicio Libre: Cualquier mesero puede abrir y tomar cualquier mesa"
              >
                <Sparkles className="w-3 h-3" />
                Modo Libre
              </span>
            ) : (
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 ${getStatusBadgeStyles('MODE_ASSIGNED', isLight).className}`}
                title="Servicio Asignado: Mesas asignadas a meseros titulares"
              >
                <UserCheck className="w-3 h-3" />
                Modo Asignado
              </span>
            )}
            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0 ${getStatusBadgeStyles('AVAILABLE', isLight).className}`}>
              <span className={`w-2 h-2 rounded-full ${getStatusBadgeStyles('AVAILABLE', isLight).dotClass}`}></span>
              {totalAvailable} Libres
            </span>
            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0 ${getStatusBadgeStyles('OCCUPIED', isLight).className}`}>
              <span className={`w-2 h-2 rounded-full ${getStatusBadgeStyles('OCCUPIED', isLight).dotClass}`}></span>
              {totalOccupied} Ocupadas
            </span>
            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0 ${getStatusBadgeStyles('BILL_PRINTED', isLight).className}`}>
              <span className={`w-2 h-2 rounded-full ${getStatusBadgeStyles('BILL_PRINTED', isLight).dotClass} animate-pulse`}></span>
              {totalBillPrinted} Pre-cuenta
            </span>
          </div>
        </div>

        {/* Plano de Mesas por Área */}
        <div className="space-y-6">
          {visibleTablesList.length === 0 ? (
            <div className={`p-8 sm:p-12 rounded-3xl border text-center space-y-3 max-w-md mx-auto my-12 ${
              isLight ? 'bg-white border-[#DECEBD] shadow-sm' : 'bg-[#1a1412] border-[#382b25]'
            }`}>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                {filterOnlyMyTables
                  ? 'No tienes comandas activas'
                  : tableServiceMode === 'ASSIGNED'
                  ? 'No tienes mesas asignadas ni libres'
                  : 'No hay mesas disponibles en esta área'}
              </h3>
              <p className={`text-xs ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                {filterOnlyMyTables
                  ? 'Actualmente no tienes mesas o comandas a tu cargo en este filtro.'
                  : tableServiceMode === 'ASSIGNED'
                  ? 'El modo de servicio está configurado como Mesero Asignado. Solicita a un administrador que te asigne mesas, o que un compañero te traspase una.'
                  : 'No se encontraron mesas configuradas en este sector.'}
              </p>
            </div>
          ) : (
            displayedAreas.map((area) => {
              const tablesToRender = area.tables.filter((table) => {
                if (!isTableVisibleForUser(table)) return false
                if (filterOnlyMyTables && !isMyTable(table)) return false
                return true
              })

              if (tablesToRender.length === 0) return null

              return (
                <div key={area.id} className="space-y-3">
                  <h2 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                    isLight ? 'text-[#2B1712]' : 'text-slate-300'
                  }`}>
                    <Store className="w-4 h-4 text-[#C08552]" />
                    {area.name}
                    {(filterOnlyMyTables || (tableServiceMode === 'ASSIGNED' && !isOwnerOrAdmin)) && (
                      <span className={`text-[10px] normal-case px-2 py-0.5 rounded-full font-bold ${
                        isLight
                          ? 'bg-amber-100 text-amber-950 border border-amber-300'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        ({tablesToRender.length} {tableServiceMode === 'ASSIGNED' && !isOwnerOrAdmin ? 'visibles' : 'mis mesas'})
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
                      const isTransferredToMe =
                        tableServiceMode === 'ASSIGNED' &&
                        table.currentWaiter?.id === currentUser?.id &&
                        table.assignedWaiter?.id !== currentUser?.id
                      const isTransferredAway =
                        isMyAssignedTable &&
                        !!table.currentWaiter &&
                        table.currentWaiter.id !== currentUser?.id

                      const cardBg = isLight
                        ? isTransferredToMe
                          ? '#E0F2FE'
                          : isMyAssignedTable
                          ? '#FFFFFF'
                          : isBillPrinted
                          ? '#FAF5FF'
                          : isOccupied
                          ? '#FFFBEB'
                          : '#FFFFFF'
                        : isTransferredToMe
                        ? '#08334440'
                        : isMyAssignedTable
                        ? `${themeSecondary}35`
                        : isBillPrinted
                        ? `${themeSecondary}30`
                        : isOccupied
                        ? `${themeSecondary}20`
                        : `${themeBg}C0`

                      const cardBorder = isLight
                        ? isTransferredToMe
                          ? '#06b6d4'
                          : isMyAssignedTable
                          ? themePrimary
                          : isBillPrinted
                          ? '#C084FC'
                          : isOccupied
                          ? '#FCD34D'
                          : '#DECEBD'
                        : isTransferredToMe
                        ? '#06b6d4'
                        : isMyAssignedTable
                        ? themePrimary
                        : isBillPrinted
                        ? `${themePrimary}90`
                        : isOccupied
                        ? `${themeSecondary}80`
                        : `${themeSecondary}45`

                      return (
                        <button
                          key={table.id}
                          type="button"
                          onClick={() => handleSelectTable(table)}
                          style={{
                            backgroundColor: cardBg,
                            borderColor: cardBorder,
                            ...(isMyAssignedTable
                              ? { boxShadow: `0 8px 24px ${themePrimary}25` }
                              : {}),
                          }}
                          className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border text-left transition-all relative flex flex-col justify-between min-h-[148px] sm:min-h-[165px] cursor-pointer hover:scale-[1.02] active:scale-95 select-none shadow-sm ${
                            isTransferredToMe
                              ? 'shadow-lg shadow-cyan-500/15 ring-2 ring-cyan-500/40'
                              : isMyAssignedTable
                              ? 'ring-2'
                              : isBillPrinted
                              ? 'ring-1'
                              : isAvailable
                              ? isLight
                                ? 'hover:border-emerald-500/70 hover:bg-emerald-50/50'
                                : 'hover:border-emerald-500/50 hover:bg-emerald-500/5'
                              : ''
                          }`}
                        >
                          {/* Cabecera de la Mesa */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-base sm:text-lg font-black block leading-tight ${
                                  isLight ? 'text-[#2B1712]' : 'text-white'
                                }`}>
                                  {table.name}
                                </span>
                                {isTransferredToMe && (
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                    isLight
                                      ? 'bg-cyan-100 text-cyan-950 border-cyan-300'
                                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                  }`}>
                                    🔄 Encargada
                                  </span>
                                )}
                                {isTransferredAway && (
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                    isLight
                                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  }`}>
                                    ⭐ En apoyo
                                  </span>
                                )}
                                {!isTransferredAway && isMyAssignedTable && (
                                  <span
                                    className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-xs tracking-wide ${
                                      isLight
                                        ? 'bg-[#C08552]/15 text-[#5E3023] border-[#C08552]/40'
                                        : ''
                                    }`}
                                    style={
                                      isLight
                                        ? {}
                                        : {
                                            backgroundColor: `${themePrimary}25`,
                                            borderColor: `${themePrimary}60`,
                                            color: themePrimary,
                                          }
                                    }
                                  >
                                    ⭐ Mi Mesa
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 font-semibold"
                                  style={{
                                    backgroundColor: isLight ? '#F3E9DC' : `${themeSecondary}30`,
                                    borderColor: isLight ? '#DECEBD' : `${themeSecondary}60`,
                                    color: isLight ? '#5E3023' : '#DECEBD',
                                  }}
                                >
                                  <Users className="w-3 h-3" style={{ color: themePrimary }} />
                                  {table.capacity || 4} personas
                                </span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-1.5">
                              {isBillPrinted && (
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 animate-pulse shadow-xs ${
                                    isLight
                                      ? 'bg-purple-100 text-purple-950 border-purple-300'
                                      : ''
                                  }`}
                                  style={
                                    isLight
                                      ? {}
                                      : {
                                          backgroundColor: `${themePrimary}30`,
                                          borderColor: `${themePrimary}80`,
                                          color: '#F3E9DC',
                                        }
                                  }
                                >
                                  <Receipt className="w-2.5 h-2.5" style={{ color: themePrimary }} /> Pre-cuenta
                                </span>
                              )}
                              <span
                                className={`w-3 h-3 rounded-full ${
                                  isAvailable
                                    ? isLight ? 'bg-emerald-600 shadow-sm' : 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                                    : isBillPrinted
                                    ? isLight ? 'bg-purple-600 animate-pulse' : 'animate-pulse'
                                    : isLight ? 'bg-amber-600 shadow-sm' : 'bg-amber-500 shadow-sm shadow-amber-500/50'
                                }`}
                                style={
                                  isBillPrinted
                                    ? isLight
                                      ? { backgroundColor: '#9333ea', boxShadow: '0 0 10px #c084fc' }
                                      : {
                                          backgroundColor: themePrimary,
                                          boxShadow: `0 0 10px ${themePrimary}`,
                                        }
                                    : {}
                                }
                              />
                            </div>
                          </div>

                          {/* Indicador de Atención según Modo */}
                          {tableServiceMode === 'FREE' ? (
                            <div
                              className="text-[10px] space-y-0.5 my-1.5 p-2 rounded-xl border"
                              style={{
                                backgroundColor: isLight ? '#FDFBF9' : `${themeSecondary}25`,
                                borderColor: isLight ? '#DECEBD' : `${themeSecondary}50`,
                              }}
                            >
                              {table.activeOrder ? (
                                <span className={`flex items-center gap-1 truncate font-medium ${
                                  isLight ? 'text-[#7A5A43]' : 'text-slate-300'
                                }`}>
                                  <Users className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                  Atiende: <strong className={isLight ? 'text-[#2B1712]' : 'text-white'}>{table.activeOrder.waiter?.name || table.currentWaiter?.name || 'Mesero'}</strong>
                                </span>
                              ) : (
                                <span className={`flex items-center gap-1 truncate font-medium ${
                                  isLight ? 'text-emerald-900 font-bold' : 'text-emerald-400/90'
                                }`}>
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                  Servicio Libre (Cualquiera)
                                </span>
                              )}
                            </div>
                          ) : isTransferredToMe ? (
                            <div className={`text-[10px] space-y-1.5 my-1.5 p-2 rounded-xl border ${
                              isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-950' : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200'
                            }`}>
                              <span className="flex items-center gap-1 truncate font-semibold">
                                <ArrowRightLeft className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                                Encargada por: <strong className={isLight ? 'text-cyan-950 font-bold' : 'text-white'}>{table.assignedWaiter?.name || 'Compañero'}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReturnTableToTitular(table)
                                }}
                                className="w-full py-1 px-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                title={`Devolver mesa a ${table.assignedWaiter?.name || 'Titular'}`}
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Devolver a {table.assignedWaiter?.name?.split(' ')[0] || 'Titular'}</span>
                              </button>
                            </div>
                          ) : isTransferredAway ? (
                            <div className={`text-[10px] space-y-1.5 my-1.5 p-2 rounded-xl border ${
                              isLight ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                            }`}>
                              <span className="flex items-center gap-1 truncate font-semibold">
                                <UserCheck className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                En apoyo: <strong className={isLight ? 'text-amber-950 font-bold' : 'text-white'}>{table.currentWaiter?.name}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReturnTableToTitular(table)
                                }}
                                className="w-full py-1 px-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                title="Retomar atención directa de mi mesa"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Retomar atención</span>
                              </button>
                            </div>
                          ) : (
                            <div
                              className="text-[10px] space-y-0.5 my-1.5 p-2 rounded-xl border"
                              style={{
                                backgroundColor: isLight
                                  ? (isMyAssignedTable ? '#FFFBEB' : '#FDFBF9')
                                  : (isMyAssignedTable ? `${themePrimary}20` : `${themeSecondary}25`),
                                borderColor: isLight
                                  ? (isMyAssignedTable ? '#FCD34D' : '#DECEBD')
                                  : (isMyAssignedTable ? `${themePrimary}50` : `${themeSecondary}50`),
                                color: isLight
                                  ? '#5E3023'
                                  : (isMyAssignedTable ? '#F3E9DC' : '#DECEBD'),
                              }}
                            >
                              <span className="flex items-center gap-1 truncate">
                                <Users className="w-2.5 h-2.5 shrink-0" style={{ color: themePrimary }} />
                                {isMyAssignedTable ? (
                                  <strong style={{ color: themePrimary }}>⭐ Tu Mesa Asignada</strong>
                                ) : table.assignedWaiter ? (
                                  <span>
                                    Titular: <strong className={isLight ? 'text-[#2B1712]' : 'text-slate-200'}>{table.assignedWaiter.name}</strong>
                                  </span>
                                ) : (
                                  <span className={`italic ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>⚡ Sin mesero titular</span>
                                )}
                              </span>

                              {isTransferred && (
                                <span className={`flex items-center gap-1 truncate font-semibold ${
                                  isLight ? 'text-cyan-950 font-bold' : 'text-cyan-300'
                                }`}>
                                  <ArrowRightLeft className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                                  Relevo: {table.currentWaiter?.name}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Info de Comanda si está ocupada */}
                          {table.activeOrder ? (
                            <div className="space-y-1.5 pt-1">
                              <div className="flex justify-between items-center text-xs">
                                <span
                                  className="px-2 py-0.5 rounded-md border font-mono text-[10px] font-bold flex items-center gap-1"
                                  style={{
                                    backgroundColor: isLight ? '#F3E9DC' : `${themeSecondary}35`,
                                    borderColor: isLight ? '#DECEBD' : `${themeSecondary}60`,
                                    color: isLight ? '#5E3023' : '#F3E9DC',
                                  }}
                                >
                                  <UtensilsCrossed className="w-2.5 h-2.5" style={{ color: themePrimary }} />
                                  {table.activeOrder.itemsCount} {table.activeOrder.itemsCount === 1 ? 'artículo' : 'artículos'}
                                </span>
                                <strong className="font-black text-sm tracking-tight font-mono" style={{ color: isLight ? '#5E3023' : themePrimary }}>
                                  ${table.activeOrder.total.toFixed(2)}
                                </strong>
                              </div>

                              {table.activeOrder.customerName && (
                                <span className={`text-[10px] block truncate italic font-medium ${
                                  isLight ? 'text-[#7A5A43]' : 'text-slate-300'
                                }`}>
                                  👤 {table.activeOrder.customerName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-1">
                              <span className={`text-xs font-bold block flex items-center justify-center gap-1 ${
                                isLight ? 'text-emerald-900 font-black' : 'text-emerald-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-emerald-400'}`}></span>
                                Libre
                              </span>
                              <span className={`text-[10px] ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                                Toca para abrir
                              </span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* DRAWER / MODAL TÁCTIL DE COMANDA - FULLSCREEN EN MÓVIL Y TABLET */}
      {showOrderModal && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/90 md:bg-black/85 md:backdrop-blur-sm flex items-center justify-center p-0 md:p-3 lg:p-5">
          <div
            className="w-full h-full md:h-[94vh] md:max-w-6xl xl:max-w-7xl md:rounded-3xl border-0 md:border flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95"
            style={{
              backgroundColor: isLight ? '#FDFBF9' : themeBg,
              borderColor: isLight ? '#DECEBD' : `${themeSecondary}60`,
            }}
          >
            {/* Header del Modal con estilo App Nativa */}
            <div
              className="p-3 sm:px-5 border-b flex items-center justify-between shrink-0"
              style={{
                backgroundColor: isLight ? '#FFFFFF' : `${themeSecondary}25`,
                borderColor: isLight ? '#DECEBD' : `${themeSecondary}50`,
              }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className={`p-2 -ml-1 rounded-xl cursor-pointer md:hidden ${
                    isLight
                      ? 'bg-white hover:bg-[#F3E9DC] border border-[#DECEBD] text-[#5E3023]'
                      : 'bg-[#251e1b] hover:bg-[#332924] text-slate-300'
                  }`}
                  title="Volver al plano de mesas"
                >
                  <ArrowLeft className="w-5 h-5" style={{ color: themePrimary }} />
                </button>

                <div
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center font-bold shrink-0"
                  style={{
                    backgroundColor: `${themePrimary}${isLight ? '15' : '20'}`,
                    borderColor: `${themePrimary}${isLight ? '35' : '40'}`,
                    color: isLight ? '#5E3023' : themePrimary,
                  }}
                >
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-base sm:text-lg font-black truncate ${
                      isLight ? 'text-[#2B1712]' : 'text-white'
                    }`}>
                      {activeTable.name}
                    </h3>
                    {/* Badge Comanda Mesa • X cantidad */}
                    <span
                      className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 shadow-xs"
                      style={{
                        backgroundColor: isLight ? '#F3E9DC' : `${themeSecondary}40`,
                        borderColor: isLight ? '#DECEBD' : `${themeSecondary}70`,
                        color: isLight ? '#5E3023' : '#F3E9DC',
                      }}
                    >
                      <UtensilsCrossed className="w-3 h-3" style={{ color: themePrimary }} />
                      <span>{totalOrderCount} {totalOrderCount === 1 ? 'artículo' : 'artículos'}</span>
                    </span>

                    <span
                      className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                        activeTable.status === 'AVAILABLE'
                          ? getStatusBadgeStyles('AVAILABLE', isLight).className
                          : activeTable.status === 'BILL_PRINTED'
                          ? getStatusBadgeStyles('BILL_PRINTED', isLight).className
                          : getStatusBadgeStyles('OCCUPIED', isLight).className
                      }`}
                    >
                      {activeTable.status === 'AVAILABLE'
                        ? 'Libre'
                        : activeTable.status === 'BILL_PRINTED'
                        ? 'Pre-cuenta'
                        : `Ocupada (#${activeTable.activeOrder?.orderNumber || ''})`}
                    </span>
                  </div>
                  <div className={`flex flex-wrap items-center gap-x-2 text-[11px] truncate ${
                    isLight ? 'text-[#7A5A43]' : 'text-slate-400'
                  }`}>
                    {tableServiceMode === 'FREE' ? (
                      <span className={`font-medium flex items-center gap-1 ${
                        isLight ? 'text-emerald-900 font-bold' : 'text-emerald-400'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        Servicio Libre
                        {activeTable.activeOrder?.waiter && (
                          <span className={`ml-1 ${isLight ? 'text-[#7A5A43]' : 'text-slate-300'}`}>
                            • Abierta por: <strong className={isLight ? 'text-[#2B1712]' : 'text-white'}>{activeTable.activeOrder.waiter.name}</strong>
                          </span>
                        )}
                      </span>
                    ) : (
                      <>
                        <span>
                          Titular: <strong className={isLight ? 'text-[#2B1712]' : 'text-slate-200'}>{activeTable.assignedWaiter?.name || 'Sin asignar'}</strong>
                        </span>
                        {activeTable.currentWaiter && activeTable.currentWaiter.id !== activeTable.assignedWaiter?.id && (
                          <span className={`font-medium ${isLight ? 'text-cyan-950 font-bold' : 'text-cyan-300'}`}>
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
                {/* Asignar titular permanente (SOLO ADMINISTRADOR / GERENTE) */}
                {isOwnerOrAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetAssignWaiterId(activeTable.assignedWaiter?.id || '')
                      setShowAssignWaiterModal(true)
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-[#F3E9DC] text-[#5E3023] border-[#DECEBD]'
                        : 'bg-[#251e1b] hover:bg-[#332924] border-[#382b25] text-slate-300'
                    }`}
                    title="Asignar mesero titular permanente a la mesa"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#C08552]" />
                    <span className="hidden lg:inline">Titular</span>
                  </button>
                )}

                {/* Si la mesa está encargada (currentWaiter seteado), botón de Retomar o Devolver */}
                {activeTable.currentWaiter && (
                  <button
                    type="button"
                    onClick={() => handleReturnTableToTitular(activeTable)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs border flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                      isLight
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                    }`}
                    title={
                      activeTable.assignedWaiter?.id === currentUser?.id
                        ? 'Retomar la atención de tu mesa'
                        : `Devolver mesa a su titular (${activeTable.assignedWaiter?.name || 'Titular'})`
                    }
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {activeTable.assignedWaiter?.id === currentUser?.id
                        ? 'Retomar Mesa'
                        : 'Devolver al Titular'}
                    </span>
                    <span className="sm:hidden">
                      {activeTable.assignedWaiter?.id === currentUser?.id ? 'Retomar' : 'Devolver'}
                    </span>
                  </button>
                )}

                {/* Encargar mesa a compañero (disponible para el mesero que atiende o admin) */}
                {(!activeTable.currentWaiter ||
                  activeTable.currentWaiter.id === currentUser?.id ||
                  isOwnerOrAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetTransferWaiterId('')
                      setShowTransferWaiterModal(true)
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs border flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                      isLight
                        ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-950 border-cyan-300'
                        : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border-cyan-500/30'
                    }`}
                    title="Encargar mesa temporalmente a otro compañero mesero"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Encargar</span>
                  </button>
                )}

                {activeTable.activeOrder && (
                  <>
                    {(currentUser?.permissions?.canTransferTables ||
                      currentUser?.roleCodes?.includes('ADMIN') ||
                      currentUser?.roleCodes?.includes('SUPERADMIN') ||
                      currentUser?.roleCodes?.includes('BRANCH_MANAGER') ||
                      activeTable.assignedWaiter?.id === currentUser?.id ||
                      activeTable.currentWaiter?.id === currentUser?.id) && (
                      <button
                        type="button"
                        onClick={() => setShowTransferModal(true)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          isLight
                            ? 'bg-white hover:bg-[#F3E9DC] text-[#5E3023] border-[#DECEBD]'
                            : 'bg-[#251e1b] hover:bg-[#332924] border-[#382b25] text-slate-300'
                        }`}
                        title="Mover comanda a otra mesa física"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden lg:inline">Mover</span>
                      </button>
                    )}

                    {/* Imprimir Pre-cuenta / Ticket */}
                    <button
                      type="button"
                      onClick={handleOpenPrintBill}
                      className={`px-2.5 py-1.5 rounded-xl text-xs border flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                        isLight
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300'
                          : 'bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border-violet-500/30'
                      }`}
                      title="Imprimir ticket de cobro / pre-cuenta"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ticket</span>
                    </button>

                    {/* Liberar mesa */}
                    <button
                      type="button"
                      onClick={handleReleaseTable}
                      className={`px-2.5 py-1.5 rounded-xl text-xs border transition-all cursor-pointer ${
                        isLight
                          ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 font-bold'
                          : 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border-red-500/30'
                      }`}
                      title="Liberar mesa"
                    >
                      Liberar
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className={`hidden md:flex w-8 h-8 rounded-xl items-center justify-center font-bold cursor-pointer transition-colors ${
                    isLight
                      ? 'bg-[#F3E9DC] hover:bg-[#DECEBD] text-[#5E3023]'
                      : 'bg-[#251e1b] hover:bg-[#332924] text-slate-400 hover:text-white'
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Banner informativo de Relevo / Encargo si aplica */}
            {activeTable.currentWaiter?.id === currentUser?.id &&
              activeTable.assignedWaiter?.id !== currentUser?.id && (
                <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
                  isLight
                    ? 'bg-cyan-50 border-cyan-200 text-cyan-950 font-medium'
                    : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span>
                      Mesa encargada temporalmente por{' '}
                      <strong>{activeTable.assignedWaiter?.name || 'tu compañero'}</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReturnTableToTitular(activeTable)}
                    className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors shrink-0 cursor-pointer text-xs"
                  >
                    Devolver a Titular
                  </button>
                </div>
              )}

            {activeTable.assignedWaiter?.id === currentUser?.id &&
              activeTable.currentWaiter &&
              activeTable.currentWaiter.id !== currentUser?.id && (
                <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
                  isLight
                    ? 'bg-amber-50 border-amber-200 text-amber-950 font-medium'
                    : 'bg-amber-950/80 border-amber-500/30 text-amber-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      Esta mesa la está apoyando temporalmente{' '}
                      <strong>{activeTable.currentWaiter.name}</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReturnTableToTitular(activeTable)}
                    className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shrink-0 cursor-pointer text-xs"
                  >
                    Retomar Atención
                  </button>
                </div>
              )}

            {/* Pestañas de Navegación del Modal (Móvil, Tablet y Escritorio) */}
            <div className={`flex border-b p-1.5 sm:p-2 gap-1.5 shrink-0 ${
              isLight ? 'border-[#DECEBD] bg-[#F7F2ED]' : 'border-[#382b25] bg-[#1a1412]'
            }`}>
              <button
                type="button"
                onClick={() => setOrderViewTab('catalog')}
                style={orderViewTab === 'catalog' ? { backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' } : {}}
                className={`flex-1 basis-0 min-w-0 h-11 sm:h-12 px-2 sm:px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer select-none active:scale-[0.99] ${
                  orderViewTab === 'catalog'
                    ? 'shadow-md'
                    : isLight
                    ? 'bg-white text-[#5E3023] hover:text-[#2B1712] hover:bg-[#F3E9DC] border border-[#DECEBD]'
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
                style={orderViewTab === 'order' ? { backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' } : {}}
                className={`flex-1 basis-0 min-w-0 h-11 sm:h-12 px-2 sm:px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-colors relative cursor-pointer select-none active:scale-[0.99] ${
                  orderViewTab === 'order'
                    ? 'shadow-md'
                    : isLight
                    ? 'bg-white text-[#5E3023] hover:text-[#2B1712] hover:bg-[#F3E9DC] border border-[#DECEBD]'
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
                        ? 'bg-black/30 text-white'
                        : isLight
                        ? 'bg-amber-100 text-amber-950 border border-amber-300'
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
                style={orderViewTab === 'split' ? { backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' } : {}}
                className={`hidden lg:flex flex-1 basis-0 min-w-0 h-11 sm:h-12 items-center justify-center gap-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer select-none active:scale-[0.99] ${
                  orderViewTab === 'split'
                    ? 'shadow-md shadow-[#C08552]/20'
                    : isLight
                    ? 'bg-white text-[#5E3023] hover:text-[#2B1712] hover:bg-[#F3E9DC] border border-[#DECEBD]'
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
                    orderViewTab === 'split' ? (isLight ? 'border-r border-[#DECEBD]' : 'border-r border-[#382b25]') : ''
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
                        className={`w-full pl-9 pr-8 py-2.5 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C08552] ${
                          isLight
                            ? 'bg-white border border-[#DECEBD] text-[#2B1712] placeholder-[#A88C7D]'
                            : 'bg-[#14100e] border border-[#382b25] text-white placeholder-slate-500'
                        }`}
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
                        style={selectedCatId === 'ALL' ? { backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' } : {}}
                        className={`px-3.5 py-2 rounded-xl font-bold shrink-0 cursor-pointer transition-all ${
                          selectedCatId === 'ALL'
                            ? 'shadow-md'
                            : isLight
                            ? 'bg-white border border-[#DECEBD] text-[#5E3023] hover:bg-[#F3E9DC]'
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
                          style={selectedCatId === c.id ? { backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' } : {}}
                          className={`px-3.5 py-2 rounded-xl font-bold shrink-0 cursor-pointer transition-all ${
                            selectedCatId === c.id
                              ? 'shadow-md'
                              : isLight
                              ? 'bg-white border border-[#DECEBD] text-[#5E3023] hover:bg-[#F3E9DC]'
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
                              ? isLight
                                ? 'bg-amber-50 border-amber-400 shadow-md ring-1 ring-amber-300'
                                : 'bg-[#251b15] border-[#C08552] shadow-md shadow-[#C08552]/15'
                              : isLight
                              ? 'bg-white border-[#DECEBD] hover:border-[#C08552] hover:bg-[#FDFBF9] shadow-xs'
                              : 'bg-[#1c1715] border-[#382b25] hover:border-[#C08552]/50 hover:bg-[#221c19]'
                          }`}
                        >
                          {/* Badge de cantidad */}
                          {stagedCount > 0 && (
                            <span
                              style={{ backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                              className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full font-black text-xs shadow-md"
                            >
                              {stagedCount}
                            </span>
                          )}

                          {/* Info del platillo */}
                          <div
                            className="space-y-1 cursor-pointer flex-1"
                            onClick={() => handleAddProduct(p)}
                          >
                            <span className={`text-xs sm:text-sm font-bold block line-clamp-2 leading-snug ${
                              isLight ? 'text-[#2B1712]' : 'text-white'
                            }`}>
                              {p.name}
                            </span>
                            <span className={`text-[10px] sm:text-[11px] block truncate ${
                              isLight ? 'text-[#7A5A43]' : 'text-slate-400'
                            }`}>
                              {p.category?.name || 'General'}
                            </span>
                            <div className="pt-1">
                              <strong className={`text-xs sm:text-sm font-black ${
                                isLight ? 'text-[#5E3023]' : 'text-[#C08552]'
                              }`}>
                                ${price.toFixed(2)}
                              </strong>
                            </div>
                          </div>

                          {/* Stepper Directo en la Tarjeta */}
                          <div className={`pt-2 mt-2 border-t h-10 flex items-center ${
                            isLight ? 'border-[#DECEBD]' : 'border-[#382b25]/60'
                          }`}>
                            {stagedCount === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleAddProduct(p)}
                                className={`w-full h-8 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                                  isLight
                                    ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] text-[#5E3023] border border-[#DECEBD]'
                                    : 'bg-[#2a211d] hover:bg-[#C08552] text-slate-300 hover:text-white'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" style={{ color: themePrimary }} />
                                <span>Agregar</span>
                              </button>
                            ) : (
                              <div className={`w-full h-8 flex items-center justify-between px-1 rounded-xl border ${
                                isLight
                                  ? 'bg-[#FDFBF9] border-[#DECEBD]'
                                  : 'bg-[#14100e] border-[#382b25]'
                              }`}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (variant) updateStagedQty(variant.id, -1)
                                  }}
                                  className={`w-7 h-6 flex items-center justify-center rounded-lg active:scale-90 font-black cursor-pointer transition-colors ${
                                    isLight
                                      ? 'bg-white hover:bg-[#F3E9DC] text-[#5E3023] border border-[#DECEBD]'
                                      : 'bg-[#251e1b] hover:bg-[#332924] text-slate-200 hover:text-white'
                                  }`}
                                  title="Disminuir"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                <div className="flex flex-col items-center leading-none px-1">
                                  <span className={`font-black text-xs sm:text-sm font-mono ${
                                    isLight ? 'text-[#2B1712]' : 'text-white'
                                  }`}>
                                    {stagedCount}
                                  </span>
                                  <span className={`text-[9px] font-mono font-bold ${
                                    isLight ? 'text-[#5E3023]' : 'text-[#C08552]'
                                  }`}>
                                    ${(price * stagedCount).toFixed(2)}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (variant) updateStagedQty(variant.id, 1)
                                  }}
                                  style={{ backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                                  className="w-7 h-6 flex items-center justify-center rounded-lg active:scale-90 font-black cursor-pointer transition-colors shadow-sm"
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
                    <div className={`sticky bottom-0 left-0 right-0 p-3 border-t backdrop-blur-md flex items-center justify-between shadow-2xl z-30 rounded-2xl ${
                      isLight
                        ? 'bg-white/95 border-[#DECEBD] text-[#2B1712]'
                        : 'bg-[#1c1715]/95 border-[#382b25] text-slate-100'
                    }`}>
                      <div>
                        <span className={`text-xs block font-medium ${isLight ? 'text-[#7A5A43]' : 'text-slate-300'}`}>
                          {stagedItems.reduce((acc, it) => acc + it.quantity, 0)}{' '}
                          {stagedItems.reduce((acc, it) => acc + it.quantity, 0) === 1
                            ? 'artículo registrado'
                            : 'artículos registrados'}
                        </span>
                        <strong className={`text-sm sm:text-base font-black font-mono ${isLight ? 'text-[#5E3023]' : 'text-[#C08552]'}`}>
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
                        style={{ backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                        className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer transition-all"
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
                  className={`flex flex-col p-3 sm:p-4 space-y-4 overflow-y-auto ${
                    isLight ? 'bg-[#FDFBF9]' : 'bg-[#14100e]'
                  } ${
                    orderViewTab === 'split'
                      ? 'w-full lg:w-[480px] xl:w-[560px] 2xl:w-[620px] shrink-0 border-l ' + (isLight ? 'border-[#DECEBD]' : 'border-[#382b25]')
                      : 'flex-1'
                  }`}
                >
                  {/* Nombre de comensal opcional */}
                  <div className="shrink-0 space-y-1">
                    <label className={`text-[11px] font-medium ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                      Nombre de Comensal / Referencia:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Familia López / Mesa 4"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C08552] ${
                        isLight
                          ? 'bg-white border border-[#DECEBD] text-[#2B1712] placeholder-[#A88C7D]'
                          : 'bg-[#1c1715] border border-[#382b25] text-white placeholder-slate-500'
                      }`}
                    />
                  </div>

                  {/* Lista 1: Platillos ya en Cocina / KDS */}
                  {activeTable.activeOrder && activeTable.activeOrder.items.length > 0 && (
                    <div className={`space-y-2 shrink-0 p-3 rounded-2xl border ${
                      isLight ? 'bg-white border-[#DECEBD] shadow-xs' : 'bg-[#191412] border-[#382b25]'
                    }`}>
                      <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isLight ? 'text-[#7A5A43]' : 'text-slate-400'
                      }`}>
                        <Clock className="w-3.5 h-3.5 text-cyan-500" />
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
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                              isLight ? 'bg-[#FDFBF9] border-[#DECEBD]' : 'bg-[#1c1715] border-[#382b25]'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className={`font-bold block truncate ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                                {it.quantity}x {it.productName}
                              </span>
                              {it.notes && (
                                <span className={`text-[10px] block italic truncate mt-0.5 ${
                                  isLight ? 'text-amber-800' : 'text-amber-300/90'
                                }`}>
                                  Nota: {it.notes}
                                </span>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  it.kitchenStatus === 'READY'
                                    ? isLight
                                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : it.kitchenStatus === 'COOKING'
                                    ? isLight
                                      ? 'bg-amber-100 text-amber-950 border border-amber-300 font-bold'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : isLight
                                    ? 'bg-[#F3E9DC] text-[#5E3023] border border-[#DECEBD]'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {it.kitchenStatus === 'READY'
                                  ? '✓ Listo'
                                  : it.kitchenStatus === 'COOKING'
                                  ? '🍳 Preparando'
                                  : '⏳ En espera'}
                              </span>
                              <span className={`text-[11px] block mt-0.5 font-mono ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
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
                      <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isLight ? 'text-[#5E3023]' : 'text-[#C08552]'
                      }`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        Nuevos Artículos por Marchar ({stagedItems.length})
                      </span>
                      <div className="flex items-center gap-2">
                        {orderViewTab === 'order' && (
                          <button
                            type="button"
                            onClick={() => setOrderViewTab('catalog')}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                              isLight
                                ? 'bg-white hover:bg-[#F3E9DC] border-[#DECEBD] text-[#5E3023]'
                                : 'bg-[#251e1b] hover:bg-[#332924] border-[#382b25] text-slate-300 hover:text-white'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" style={{ color: themePrimary }} />
                            <span>Agregar Más</span>
                          </button>
                        )}

                        {stagedItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setStagedItems([])}
                            className="text-xs text-red-500 hover:text-red-600 font-bold transition-colors px-2 py-1 cursor-pointer"
                          >
                            Vaciar ronda
                          </button>
                        )}
                      </div>
                    </div>

                    {stagedItems.length === 0 ? (
                      <div className={`flex-1 flex flex-col items-center justify-center text-xs border border-dashed rounded-3xl p-8 text-center space-y-3 ${
                        isLight
                          ? 'border-[#DECEBD] bg-white/60 text-[#7A5A43]'
                          : 'border-[#382b25] text-slate-500'
                      }`}>
                        <ShoppingBag className="w-12 h-12 opacity-30 text-[#C08552]" />
                        <div>
                          <p className={`font-bold text-sm ${isLight ? 'text-[#2B1712]' : 'text-slate-300'}`}>
                            Sin artículos registrados aún
                          </p>
                          <p className={`text-xs mt-1 ${isLight ? 'text-[#7A5A43]' : 'text-slate-500'}`}>
                            Selecciona platillos o bebidas del menú para agregarlos a esta ronda.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOrderViewTab('catalog')}
                          style={{ backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                          className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
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
                        {stagedItems.map((item) => {
                          const itemKey = item.stagedId || item.variantId
                          const isAllergy = item.notes && (item.notes.includes('ALERGIA') || item.notes.includes('ALÉRGICO'))

                          return (
                            <div
                              key={itemKey}
                              className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-3 text-xs shadow-md transition-colors ${
                                isAllergy
                                  ? 'bg-rose-500/10 border-rose-500 shadow-rose-500/10'
                                  : isLight
                                  ? 'bg-white border-[#DECEBD] hover:border-[#C08552]'
                                  : 'bg-[#1c1715] border-[#382b25] hover:border-[#C08552]/40'
                              }`}
                            >
                              {/* Cabecera de la Tarjeta: Nombre, Tamaño, Modificadores y Subtotal */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <strong className={`block text-sm font-bold truncate ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                                      {item.productName}
                                    </strong>
                                    {item.variantName && item.variantName !== 'Regular' && (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                        isLight
                                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      }`}>
                                        {item.variantName}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-xs font-mono ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                                      ${item.unitPrice.toFixed(2)} c/u
                                    </span>
                                    <span className={`font-black text-xs font-mono ${isLight ? 'text-[#5E3023]' : 'text-[#C08552]'}`}>
                                      • ${(item.unitPrice * item.quantity).toFixed(2)}
                                    </span>
                                  </div>

                                  {/* Modificadores / Extras Seleccionados */}
                                  {item.modifiers && item.modifiers.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {item.modifiers.map((m, idx) => (
                                        <span
                                          key={idx}
                                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                            isLight
                                              ? 'bg-amber-100 text-amber-950 border border-amber-200'
                                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                                          }`}
                                        >
                                          + {m.name} {m.unitPrice > 0 ? `($${m.unitPrice.toFixed(2)})` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeItemFromStaged(itemKey)}
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-colors cursor-pointer shrink-0 ${
                                    isLight
                                      ? 'text-rose-600 hover:bg-rose-50'
                                      : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                                  }`}
                                  title="Quitar platillo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Stepper Táctil: Disminuir [-] y Aumentar [+] */}
                              <div className={`flex items-center justify-between p-1.5 rounded-xl border ${
                                isLight ? 'bg-[#FDFBF9] border-[#DECEBD]' : 'bg-[#14100e] border-[#382b25]'
                              }`}>
                                <span className={`text-[11px] font-medium px-2 ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                                  Cantidad:
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateStagedQty(itemKey, -1)}
                                    className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl active:scale-90 transition-colors cursor-pointer font-black text-sm ${
                                      isLight
                                        ? 'bg-white hover:bg-[#F3E9DC] text-[#5E3023] border border-[#DECEBD]'
                                        : 'bg-[#251e1b] hover:bg-[#332924] text-slate-200 hover:text-white'
                                    }`}
                                    title="Disminuir"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>

                                  <span className={`font-black text-sm sm:text-base px-2 min-w-[28px] text-center font-mono ${
                                    isLight ? 'text-[#2B1712]' : 'text-white'
                                  }`}>
                                    {item.quantity}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => updateStagedQty(itemKey, 1)}
                                    style={{ backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                                    className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl active:scale-90 transition-colors cursor-pointer font-black text-sm shadow-md"
                                    title="Aumentar"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Alerta de Alergia destacada si existe */}
                              {isAllergy && (
                                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-600 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
                                  <span>⚠️ ALERTA COCINA:</span>
                                  <span>{item.notes}</span>
                                </div>
                              )}

                              {/* Notas Rápidas y Chips para Cocina */}
                              <div className={`space-y-1.5 pt-2 border-t ${isLight ? 'border-[#DECEBD]' : 'border-[#251e1b]'}`}>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    placeholder="Nota especial (ej. sin azúcar, para llevar)..."
                                    value={item.notes}
                                    onChange={(e) => updateItemNote(itemKey, e.target.value)}
                                    className={`flex-1 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C08552] ${
                                      isLight
                                        ? 'bg-white border border-[#DECEBD] text-[#2B1712] placeholder-[#A88C7D]'
                                        : 'bg-[#14100e] border border-[#382b25] text-amber-200 placeholder-slate-500'
                                    }`}
                                  />
                                  {item.notes && (
                                    <button
                                      type="button"
                                      onClick={() => updateItemNote(itemKey, '')}
                                      className={`text-xs px-1.5 py-1 cursor-pointer ${isLight ? 'text-slate-500 hover:text-black' : 'text-slate-400 hover:text-white'}`}
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
                                      onClick={() => appendNoteToItem(itemKey, note)}
                                      className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg border active:scale-95 transition-all cursor-pointer ${
                                        isLight
                                          ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] border-[#DECEBD] text-[#5E3023] font-medium'
                                          : 'bg-[#251e1b] hover:bg-[#332924] border-[#382b25] text-slate-300'
                                      }`}
                                    >
                                      +{note}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Subtotal de la nueva ronda y Botón Marchar */}
                  <div className={`pt-3 border-t space-y-2.5 shrink-0 ${
                    isLight ? 'border-[#DECEBD] bg-[#FDFBF9]' : 'border-[#382b25] bg-[#14100e]'
                  }`}>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className={isLight ? 'text-[#7A5A43] font-medium' : 'text-slate-400'}>Total ronda a marchar:</span>
                      <strong className={`text-base sm:text-lg font-black font-mono ${
                        isLight ? 'text-[#5E3023]' : 'text-[#C08552]'
                      }`}>
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
                          className={`flex-1 py-3 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer transition-all ${
                            isLight
                              ? 'bg-white hover:bg-[#F3E9DC] border-[#DECEBD] text-[#5E3023]'
                              : 'bg-[#251e1b] hover:bg-[#332924] border-[#382b25] text-slate-300 hover:text-white'
                          }`}
                        >
                          <UtensilsCrossed className="w-4 h-4" style={{ color: themePrimary }} />
                          <span>+ Agregar Más</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleSendToKitchen}
                        disabled={submittingOrder || stagedItems.length === 0}
                        style={{ backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                        className="flex-1 py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 select-none"
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
          <div className={`w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border ${
            isLight ? 'bg-white border-[#DECEBD] text-[#2B1712]' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>Traspasar Mesa</h3>
                <p className={`text-xs ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>Mover comanda de {activeTable.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className={`block font-medium ${isLight ? 'text-[#7A5A43]' : 'text-slate-300'}`}>Selecciona la mesa destino (Libre):</label>
              {availableTargetTables.length === 0 ? (
                <p className="p-3 rounded-xl bg-red-500/10 text-red-500 text-center font-medium">
                  No hay mesas libres disponibles en este momento.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableTargetTables.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetTransferTableId(t.id)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        targetTransferTableId === t.id
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                          : isLight
                          ? 'bg-[#FDFBF9] border-[#DECEBD] text-[#5E3023] hover:bg-[#F3E9DC]'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={`pt-2 flex justify-end gap-2 border-t ${isLight ? 'border-[#DECEBD]' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                  isLight ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] text-[#5E3023]' : 'bg-slate-800 text-slate-300'
                }`}
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

      {/* MODAL PARA ENCARGAR ATENCIÓN DE MESA TEMPORALMENTE A OTRO COMPAÑERO MESERO */}
      {showTransferWaiterModal && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border ${
            isLight ? 'bg-white border-[#DECEBD] text-[#2B1712]' : 'bg-slate-900 border-cyan-500/40 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>Encargar Mesa a Compañero</h3>
                <p className={`text-xs ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>Relevo temporal de atención en {activeTable.name}</p>
              </div>
            </div>

            <div className={`p-3 rounded-2xl text-[11px] space-y-1 border ${
              isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-950' : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300'
            }`}>
              <p className="font-semibold">ℹ️ Encargo temporal de mesa:</p>
              <p className={isLight ? 'text-cyan-900' : 'text-cyan-200/80'}>
                La mesa pasará a la lista de tu compañero para que pueda atender a los clientes (ej. si vas al sanitario).
                <strong> El titular seguirá siendo el mismo y podrán devolver o retomar la mesa en cualquier momento con un solo toque.</strong>
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className={`block font-medium ${isLight ? 'text-[#7A5A43]' : 'text-slate-300'}`}>Selecciona el compañero mesero:</label>
              {waiters.filter((w) => w.id !== currentUser?.id).length === 0 ? (
                <p className="p-3 rounded-xl bg-red-500/10 text-red-500 text-center font-medium">
                  No hay otros compañeros disponibles en esta sucursal.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {waiters
                    .filter((w) => w.id !== currentUser?.id)
                    .map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setTargetTransferWaiterId(w.id)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          targetTransferWaiterId === w.id
                            ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                            : isLight
                            ? 'bg-[#FDFBF9] border-[#DECEBD] text-[#2B1712] hover:bg-[#F3E9DC]'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 opacity-70" />
                          <span className="font-bold">{w.name}</span>
                        </div>
                        <span className={`text-[10px] ${isLight ? 'text-[#7A5A43]' : 'opacity-75'}`}>
                          {w.roles.join(', ') || 'Colaborador'}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className={`pt-2 flex justify-end gap-2 border-t ${isLight ? 'border-[#DECEBD]' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={() => setShowTransferWaiterModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                  isLight ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] text-[#5E3023]' : 'bg-slate-800 text-slate-300'
                }`}
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
                <span>Confirmar y Encargar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ASIGNAR MESERO TITULAR PERMANENTE A LA MESA (SOLO ADMIN / GERENTE) */}
      {showAssignWaiterModal && activeTable && isOwnerOrAdmin && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border ${
            isLight ? 'bg-white border-[#DECEBD] text-[#2B1712]' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>Mesero Titular</h3>
                <p className={`text-xs ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>Asignar responsable de {activeTable.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className={`block font-medium ${isLight ? 'text-[#7A5A43]' : 'text-slate-300'}`}>Selecciona el mesero titular:</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {/* Opción para dejar sin asignar */}
                <button
                  type="button"
                  onClick={() => setTargetAssignWaiterId('')}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer font-bold ${
                    targetAssignWaiterId === ''
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                      : isLight
                      ? 'bg-[#FDFBF9] border-[#DECEBD] text-[#5E3023] hover:bg-[#F3E9DC]'
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
                        : isLight
                        ? 'bg-[#FDFBF9] border-[#DECEBD] text-[#2B1712] hover:bg-[#F3E9DC]'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 opacity-70" />
                      <span className="font-bold">{w.name}</span>
                    </div>
                    <span className={`text-[10px] ${isLight ? 'text-[#7A5A43]' : 'opacity-75'}`}>
                      {w.roles.join(', ') || 'Colaborador'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`pt-2 flex justify-end gap-2 border-t ${isLight ? 'border-[#DECEBD]' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={() => setShowAssignWaiterModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                  isLight ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] text-[#5E3023]' : 'bg-slate-800 text-slate-300'
                }`}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 my-auto border ${
              isLight
                ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                : 'bg-[#17120F] border-[#382B25] text-white'
            }`}
          >
            {/* Header del modal */}
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isLight ? 'border-[#DECEBD]' : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: `${themePrimary}20`,
                    color: isLight ? '#5E3023' : themePrimary,
                  }}
                >
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                    Ticket de Pre-cuenta
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-[#895737]' : 'text-slate-400'}`}>
                    Previsualización e Impresión
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBillReceiptModal(false)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold cursor-pointer transition-colors ${
                  isLight
                    ? 'bg-[#F3E9DC] text-[#5E3023] hover:bg-[#E6D5C3]'
                    : 'bg-[#2B1712] text-slate-400 hover:text-white'
                }`}
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
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                  isLight
                    ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] border-[#DECEBD] text-[#5E3023]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => {
                  window.print()
                  notify.success('Ticket enviado a impresión', `Pre-cuenta de ${activeTable.name}`)
                }}
                style={{ backgroundColor: themeButton }}
                className="px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANTALLA / OVERLAY DE BIENVENIDA AL ENTRAR O DESBLOQUEAR TERMINAL */}
      {welcomeOverlayUser && (
        <div className="fixed inset-0 z-50 bg-[#14100E]/85 backdrop-blur-md flex items-center justify-center p-4 selection:bg-[#C08552] selection:text-white animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#251E1B] border border-[#3E2723] rounded-3xl p-8 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5E3023] to-[#C08552] text-white flex items-center justify-center mx-auto shadow-xl shadow-[#C08552]/30 animate-bounce duration-1000">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#C08552]/20 border border-[#C08552]/40 text-[#DECEBD] mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#C08552]" />
                <span>{welcomeOverlayUser.role?.name || welcomeOverlayUser.roleName || 'Comandera de Mesas'}</span>
              </div>
              <h2 className="text-2xl font-black text-white">
                {welcomeOverlayUser.gender === 'FEMALE' ? '¡Bienvenida,' : '¡Bienvenido,'} {welcomeOverlayUser.name}!
              </h2>
              <p className="text-xs text-[#A88C7D] mt-1 font-medium">
                Turno activado. ¡Excelente jornada con las mesas!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FULLSCREEN DE BLOQUEO DE TERMINAL Y RELEVO RÁPIDO */}
      {isTerminalLocked && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 selection:bg-[#C08552] selection:text-white overflow-y-auto"
          style={{ backgroundColor: themeBg }}
        >
          {/* Ambient Warm Glows con colores de la BD */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full blur-[130px]"
              style={{ backgroundColor: themePrimary, opacity: 0.18 }}
            />
            <div
              className="absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full blur-[110px]"
              style={{ backgroundColor: themeSecondary, opacity: 0.15 }}
            />
          </div>

          <div
            className={`w-full max-w-sm rounded-3xl p-7 sm:p-8 space-y-4 shadow-2xl text-center backdrop-blur-xl relative animate-in zoom-in-95 border ${
              themeBg.toLowerCase().startsWith('#f') || themeBg.toLowerCase().startsWith('#fff')
                ? 'bg-white/95 border-[#E6D5C3] text-[#5E3023] shadow-[#5E3023]/15'
                : 'bg-[#19110E]/95 border-[#3E221A] text-[#F3E9DC] shadow-black/60'
            }`}
          >
            {/* Logo o Icono de Marca */}
            {activeBranch?.logoUrl || activeBranch?.isotypeUrl ? (
              <div className="flex justify-center mb-1">
                <img
                  src={activeBranch?.logoUrl || activeBranch?.isotypeUrl || ''}
                  alt={activeBranch?.name || 'Logo'}
                  className="max-h-16 max-w-[170px] w-auto h-auto object-contain drop-shadow-md py-1"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-2 transform hover:scale-105 transition-transform duration-300 text-white"
                style={{
                  background: `linear-gradient(135deg, ${themeSecondary}, ${themePrimary})`,
                }}
              >
                <Lock className="w-7 h-7" />
              </div>
            )}

            <div>
              <div
                className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold mb-1.5 border"
                style={{
                  backgroundColor: `${themePrimary}20`,
                  borderColor: `${themePrimary}40`,
                  color: themePrimary,
                }}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>
                  {currentUser?.branches && currentUser.branches.length > 1
                    ? activeBranch?.name || 'Comandera'
                    : 'Comandera de Mesas'}
                </span>
              </div>
              <h2
                className={`text-2xl font-extrabold tracking-tight ${
                  themeBg.toLowerCase().startsWith('#f') ? 'text-[#5E3023]' : 'text-[#F3E9DC]'
                }`}
              >
                Comandera Bloqueada
              </h2>
              <p
                className={`text-xs font-medium mt-1 ${
                  themeBg.toLowerCase().startsWith('#f') ? 'text-[#895737]' : 'text-[#A88C7D]'
                }`}
              >
                Ingresa tu PIN de 4 dígitos para relevar o continuar turno
              </p>
              {currentUser && (
                <p
                  className={`text-[11px] mt-1 font-medium ${
                    themeBg.toLowerCase().startsWith('#f') ? 'text-[#A88C7D]' : 'text-[#DECEBD]/70'
                  }`}
                >
                  Último mesero:{' '}
                  <strong
                    className={
                      themeBg.toLowerCase().startsWith('#f') ? 'text-[#5E3023]' : 'text-[#F3E9DC]'
                    }
                  >
                    {currentUser.name}
                  </strong>
                </p>
              )}
            </div>

            {/* Error */}
            {unlockError && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium text-center animate-in fade-in">
                {unlockError}
              </div>
            )}

            {/* PIN indicators */}
            <div className="flex justify-center gap-3 my-2">
              {[0, 1, 2, 3].map((idx) => {
                const filled = unlockPin.length > idx
                const isLight = themeBg.toLowerCase().startsWith('#f')
                return (
                  <div
                    key={idx}
                    className="w-12 h-12 rounded-2xl border flex items-center justify-center text-xl font-bold transition-all"
                    style={
                      filled
                        ? {
                            borderColor: themePrimary,
                            backgroundColor: `${themePrimary}25`,
                            color: isLight ? '#5E3023' : '#FFFFFF',
                            boxShadow: `0 0 12px ${themePrimary}35`,
                          }
                        : isLight
                        ? { borderColor: '#DECEBD', backgroundColor: '#FDFBF9', color: '#A88C7D' }
                        : { borderColor: '#3E221A', backgroundColor: '#120B09', color: '#6A564C' }
                    }
                  >
                    {filled ? '•' : ''}
                  </div>
                )
              })}
            </div>

            {/* Teclado numérico táctil optimizado para Touch */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((val) => {
                const isLight = themeBg.toLowerCase().startsWith('#f')
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleKeypadPressUnlock(val)}
                    disabled={unlocking}
                    className={`h-14 rounded-2xl text-lg font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center select-none border ${
                      isLight
                        ? 'bg-[#FDFBF9] hover:bg-[#F3E9DC] active:bg-[#E6D5C3] border-[#DECEBD] text-[#5E3023]'
                        : 'bg-[#231511] hover:bg-[#341C16] active:bg-[#43231B] border-[#3E221A] text-[#F3E9DC]'
                    }`}
                  >
                    {val === 'DEL' ? '⌫' : val}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => handleUnlockTerminal()}
              disabled={unlocking || unlockPin.length < 4}
              style={{ backgroundColor: themeButton }}
              className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Desbloquear Comandera</span>
            </button>

            {/* Opción de cerrar sesión general */}
            <div
              className={`pt-2 border-t ${
                themeBg.toLowerCase().startsWith('#f') ? 'border-[#E6D5C3]' : 'border-[#3E221A]'
              }`}
            >
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className={`w-full text-xs flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer font-medium ${
                    themeBg.toLowerCase().startsWith('#f')
                      ? 'text-[#895737] hover:text-[#5E3023]'
                      : 'text-[#A88C7D] hover:text-[#F3E9DC]'
                  }`}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-center border ${
              isLight
                ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                : 'bg-[#14100e] border-[#382b25] text-white'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                isLight
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                Mesa con mesero titular
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-[#5E3023]' : 'text-slate-300'}`}>
                La <strong className={isLight ? 'text-[#2B1712]' : 'text-white'}>{takeoverWarningTable.name}</strong> está asignada
                a <strong className={isLight ? 'text-amber-800' : 'text-amber-300'}>{takeoverWarningTable.assignedWaiter?.name}</strong>.
              </p>
              <p className={`text-[11px] ${isLight ? 'text-[#895737]' : 'text-slate-400'}`}>
                ¿Deseas abrir la comanda para atenderla como apoyo o relevo?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTakeoverWarningTable(null)}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  isLight
                    ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] border-[#DECEBD] text-[#5E3023]'
                    : 'bg-[#251e1b] hover:bg-[#332924] border-[#382b25] text-slate-300'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => openTableOrder(takeoverWarningTable)}
                style={{ backgroundColor: themeButton }}
                className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 cursor-pointer transition-all flex items-center justify-center gap-1"
              >
                <span>Atender como Apoyo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERSONALIZADOR DE PRODUCTO (TAMAÑOS, SABORES, EXTRAS, ALERGIAS) */}
      <ProductCustomizerModal
        isOpen={showCustomizerModal}
        onClose={() => {
          setShowCustomizerModal(false)
          setCustomizingProduct(null)
        }}
        product={customizingProduct}
        isLight={isLight}
        primaryColor={themePrimary}
        buttonColor={themeButton}
        onConfirm={handleConfirmCustomization}
      />
    </div>
  )
}

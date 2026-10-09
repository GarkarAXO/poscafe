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
  CreditCard,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Scissors,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { getTerminalDeviceConfig, TerminalDeviceConfig } from '@/lib/terminal-device'
import { isLightColor, getStatusBadgeStyles } from '@/lib/theme-utils'
import ProductCustomizerModal, {
  CustomizedItemResult,
  CustomizerProduct,
} from '@/components/product-customizer-modal'
import ThermalTicketPrinterAnimation, {
  ThermalTicketData,
} from '@/components/ThermalTicketPrinterAnimation'

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
    notes?: string | null
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

  // Tipo de orden (Salón vs Para Llevar) y empaques
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN')
  const [takeawayPackaging, setTakeawayPackaging] = useState<{
    includeBag: boolean
    includeTray: boolean
    includeCutlery: boolean
  }>({
    includeBag: true,
    includeTray: false,
    includeCutlery: false,
  })

  // Referencias para evitar closure bugs en polling y monitoreo de platillos listos
  const activeTableRef = useRef<TableItem | null>(null)
  const prevReadyTablesRef = useRef<Map<string, number>>(new Map())

  // Sincronizar referencia de la mesa activa abierta
  useEffect(() => {
    activeTableRef.current = activeTable
  }, [activeTable])

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

  // Animación interactiva de impresora térmica de tickets
  const [showPrintingAnimation, setShowPrintingAnimation] = useState(false)
  const [billReceiptData, setBillReceiptData] = useState<ThermalTicketData | null>(null)

  // Estados de cobro rápido desde comandera
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH')
  const [checkoutAmountReceived, setCheckoutAmountReceived] = useState('')
  const [checkoutPrintTicket, setCheckoutPrintTicket] = useState(true)
  const [processingCheckout, setProcessingCheckout] = useState(false)

  // Menú de opciones secundarias de mesa (cabecera limpia)
  const [showTableOptionsMenu, setShowTableOptionsMenu] = useState(false)

  // Colapsar / expandir lista de platillos marchados en cocina
  const [kitchenItemsCollapsed, setKitchenItemsCollapsed] = useState(false)

  // Estados para panel de Rectificar Orden en el Menú
  const [showOrderReviewDrawer, setShowOrderReviewDrawer] = useState(false)
  const [expandedReviewProducts, setExpandedReviewProducts] = useState<Record<string, boolean>>({})
  // Modal para preguntar primero al cliente si es consumo en mesa o para llevar/domicilio
  const [showOrderTypeSelectionModal, setShowOrderTypeSelectionModal] = useState(false)

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

  // Sintetizador de audio Web Audio API para timbre de servicio (Platillos listos en cocina)
  const playWaiterChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      const ctx = new AudioContextClass()
      const now = ctx.currentTime

      // Tono 1: A5 (880Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(880, now)
      gain1.gain.setValueAtTime(0.35, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.45)

      // Tono 2: E6 (1318.5Hz) campanilla armónica
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(1318.5, now + 0.12)
      gain2.gain.setValueAtTime(0.3, now + 0.12)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.12)
      osc2.stop(now + 0.7)
    } catch {}
  }

  // Refrescar mesas periódicamente para sincronizar con la cocina y alertar al mesero
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

        const allTables = loadedAreas.flatMap((a: Area) => a.tables)

        // Monitoreo de platillos listos para alertar al mesero con sonido y Sileo toast
        const currentReadyMap = new Map<string, number>()
        const newlyReadyAlerts: string[] = []

        allTables.forEach((t: TableItem) => {
          const readyItems = t.activeOrder?.items?.filter((it) => it.kitchenStatus === 'READY') || []
          const count = readyItems.length
          if (count > 0) {
            currentReadyMap.set(t.id, count)
            const prevCount = prevReadyTablesRef.current.get(t.id) || 0
            if (count > prevCount) {
              const readyNames = readyItems
                .map((it) => `${it.quantity}x ${it.productName}`)
                .slice(0, 2)
                .join(', ')
              newlyReadyAlerts.push(`Mesa ${t.name}: ${count} platillo(s) listos (${readyNames})`)
            }
          }
        })

        if (newlyReadyAlerts.length > 0) {
          playWaiterChime()
          newlyReadyAlerts.forEach((alertMsg) => {
            notify.success('🔔 ¡Platillos listos para servir!', alertMsg)
          })
        }
        prevReadyTablesRef.current = currentReadyMap

        // Si hay una mesa activa abierta, actualizar sus datos usando la referencia (evita closure bug)
        const currentActive = activeTableRef.current
        if (currentActive) {
          const updated = allTables.find((t: TableItem) => t.id === currentActive.id)
          if (updated) {
            setActiveTable(updated)
            activeTableRef.current = updated
          }
        }
      }
    } catch {
      // Ignorar errores silenciosos en background
    }
  }

  useEffect(() => {
    loadComanderaData()
    // Sondeo periódico cada 3 segundos para sincronización con cocina
    const interval = setInterval(refreshTables, 3000)

    // Sincronización instantánea al volver al apartado o enfocar la pestaña
    const handleFocus = () => {
      refreshTables()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshTables()
      }
    }
    const handleKitchenEvent = () => {
      refreshTables()
    }
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'poscafe_kitchen_event') {
        refreshTables()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('poscafe:kitchen-updated', handleKitchenEvent)
    window.addEventListener('storage', handleStorage)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('poscafe:kitchen-updated', handleKitchenEvent)
      window.removeEventListener('storage', handleStorage)
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
    activeTableRef.current = table
    setStagedItems([])
    setCustomerName(table.activeOrder?.customerName || '')
    setOrderNotes('')

    const isTakeaway = (table.activeOrder?.orderType as any) === 'TAKEAWAY'
    setOrderType(isTakeaway ? 'TAKEAWAY' : 'DINE_IN')
    const notes = table.activeOrder?.notes || ''
    setTakeawayPackaging({
      includeBag: !notes.includes('Sin Bolsa'),
      includeTray: notes.includes('Portavasos') || notes.includes('Charola'),
      includeCutlery: notes.includes('Cubiertos'),
    })

    // Si la mesa no tiene orden activa previa, preguntar primero al cliente cómo será el servicio
    if (!table.activeOrder) {
      setShowOrderTypeSelectionModal(true)
    } else {
      setShowOrderTypeSelectionModal(false)
    }

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

  // Marcar platillo individual como servido a la mesa
  const handleMarkItemServed = async (itemId: string, itemName: string) => {
    try {
      const res = await fetch(`/api/kds/items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SERVED' }),
      }).then((r) => r.json())

      if (res.success) {
        notify.success('Platillo servido', `${itemName} entregado a la mesa`)
        try {
          localStorage.setItem('poscafe_kitchen_event', JSON.stringify({ type: 'ITEM_SERVED', itemId, timestamp: Date.now() }))
          window.dispatchEvent(new CustomEvent('poscafe:kitchen-updated'))
        } catch {}
        await refreshTables()
      } else {
        notify.error('Error al servir', res.error?.message || 'No se pudo actualizar estado')
      }
    } catch {
      notify.error('Error de red', 'No se pudo comunicar con el servidor')
    }
  }

  // Marcar todos los platillos listos de la comanda como servidos a la mesa
  const handleMarkAllReadyServed = async () => {
    if (!activeTable?.activeOrder) return
    const readyItems = activeTable.activeOrder.items.filter((it) => it.kitchenStatus === 'READY')
    if (readyItems.length === 0) return

    try {
      await Promise.all(
        readyItems.map((it) =>
          fetch(`/api/kds/items/${it.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'SERVED' }),
          })
        )
      )
      notify.success('Mesa servida', 'Todos los platillos listos han sido marcados como servidos en mesa.')
      try {
        localStorage.setItem('poscafe_kitchen_event', JSON.stringify({ type: 'ALL_SERVED', timestamp: Date.now() }))
        window.dispatchEvent(new CustomEvent('poscafe:kitchen-updated'))
      } catch {}
      await refreshTables()
    } catch {
      notify.error('Error de conexión', 'No fue posible actualizar todos los platillos')
    }
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

    if (activeTable?.status === 'BILL_PRINTED') {
      setActiveTable((prev) => (prev ? { ...prev, status: 'OCCUPIED' } : null))
    }

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

    if (activeTable?.status === 'BILL_PRINTED') {
      setActiveTable((prev) => (prev ? { ...prev, status: 'OCCUPIED' } : null))
    }

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

  // Separar un ítem con cantidad > 1 para permitir notas individuales a cada unidad (ej. 2 capuccinos: uno sin hielo y otro con todo)
  const handleSplitStagedItem = (id: string) => {
    setStagedItems((prev) => {
      const idx = prev.findIndex((it) => (it.stagedId ? it.stagedId === id : it.variantId === id))
      if (idx === -1) return prev
      const item = prev[idx]
      if (item.quantity <= 1) return prev

      const item1 = { ...item, quantity: item.quantity - 1 }
      const item2 = {
        ...item,
        stagedId: `${item.variantId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        quantity: 1,
        notes: '',
      }

      const next = [...prev]
      next.splice(idx, 1, item1, item2)
      return next
    })
  }

  // Alternar nota preestablecida en un ítem
  const handleTogglePresetNote = (id: string, preset: string) => {
    setStagedItems((prev) =>
      prev.map((it) => {
        if (it.stagedId === id || it.variantId === id) {
          const current = it.notes ? it.notes.split(', ').filter(Boolean) : []
          let updated: string[]
          if (current.includes(preset)) {
            updated = current.filter((s) => s !== preset)
          } else {
            updated = [...current, preset]
          }
          return { ...it, notes: updated.join(', ') }
        }
        return it
      })
    )
  }

  // Alternar acordeón de producto en rectificación
  const toggleReviewProductExpand = (productName: string) => {
    setExpandedReviewProducts((prev) => ({
      ...prev,
      [productName]: prev[productName] === undefined ? false : !prev[productName],
    }))
  }

  // Agrupar stagedItems por producto para visualización en acordeón
  const groupedStagedProducts = stagedItems.reduce((acc, item) => {
    const key = item.productName
    if (!acc[key]) {
      acc[key] = {
        productName: item.productName,
        totalQuantity: 0,
        totalSubtotal: 0,
        items: [],
      }
    }
    const itemModTotal = item.modifiers?.reduce((mAcc, m) => mAcc + m.unitPrice, 0) || 0
    const itemTotal = (item.unitPrice + itemModTotal) * item.quantity
    acc[key].totalQuantity += item.quantity
    acc[key].totalSubtotal += itemTotal
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { productName: string; totalQuantity: number; totalSubtotal: number; items: StagedItem[] }>)

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
      let finalNotes = orderNotes.trim()
      if (orderType === 'TAKEAWAY') {
        const pkgs: string[] = []
        if (takeawayPackaging.includeBag) pkgs.push('Bolsa')
        if (takeawayPackaging.includeTray) pkgs.push('Portavasos/Charola')
        if (takeawayPackaging.includeCutlery) pkgs.push('Cubiertos')
        const pkgSummary = pkgs.length > 0 ? `[PARA LLEVAR: ${pkgs.join(', ')}]` : '[PARA LLEVAR]'
        finalNotes = finalNotes ? `${finalNotes} ${pkgSummary}` : pkgSummary
      }

      const payload = {
        tableId: activeTable.id,
        orderType,
        customerName: customerName.trim(),
        notes: finalNotes,
        takeawayPackaging: orderType === 'TAKEAWAY' ? {
          bags: takeawayPackaging.includeBag ? 1 : 0,
          cupTrays: takeawayPackaging.includeTray ? 1 : 0,
          cutlerySets: takeawayPackaging.includeCutlery ? 1 : 0,
        } : undefined,
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
        setSuccessMsg(
          orderType === 'TAKEAWAY'
            ? '¡Comanda PARA LLEVAR enviada a Cocina y Barra!'
            : '¡Comanda enviada a Cocina y Barra!'
        )
        notify.success(
          orderType === 'TAKEAWAY' ? '🥡 Comanda para llevar marchada' : 'Comanda marchada',
          `Enviada a preparación para la mesa ${tableName} (${orderType === 'TAKEAWAY' ? 'Para llevar' : 'Servicio en mesa'})`
        )
        setTimeout(() => setSuccessMsg(null), 3500)
        setStagedItems([])
        setOrderViewTab('order')
        setActiveTable((prev) => (prev ? { ...prev, status: 'OCCUPIED' } : null))
        try {
          localStorage.setItem('poscafe_kitchen_event', JSON.stringify({ type: 'NEW_ORDER', timestamp: Date.now() }))
          window.dispatchEvent(new CustomEvent('poscafe:kitchen-updated'))
        } catch {}
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

  // Liberar mesa con validación estricta
  const handleReleaseTable = async () => {
    if (!activeTable) return
    const tableName = activeTable.name

    // 1. Validar platillos en cocina o pendientes
    if (activeTable.activeOrder?.items && activeTable.activeOrder.items.length > 0) {
      const inKitchen = activeTable.activeOrder.items.filter(
        (it) => it.kitchenStatus === 'PENDING' || it.kitchenStatus === 'COOKING' || it.kitchenStatus === 'READY'
      )
      if (inKitchen.length > 0) {
        notify.warning(
          'No se puede liberar la mesa',
          `Hay ${inKitchen.length} artículo(s) preparándose o listos en cocina. Debes servirlos o cancelarlos antes de liberar la mesa.`
        )
        return
      }

      // 2. Validar si la cuenta está pendiente de cobro
      if (activeTable.activeOrder.total > 0 && activeTable.activeOrder.status !== 'PAID') {
        notify.warning(
          'Cuenta pendiente de pago',
          `La ${tableName} tiene un consumo pendiente de $${activeTable.activeOrder.total.toFixed(2)} MXN. Usa el botón "Cobrar Cuenta" para liquidar y liberar automáticamente.`
        )
        return
      }
    }

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
            setShowTableOptionsMenu(false)
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

  // Fallback a ventana emergente si el navegador bloquea iframe
  const openPrintWindowFallback = (html: string) => {
    try {
      const printWindow = window.open('', '_blank', 'width=380,height=600')
      if (printWindow) {
        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
        setTimeout(() => {
          try {
            printWindow.focus()
            printWindow.print()
          } catch {}
        }, 300)
      } else {
        setShowPrintingAnimation(true)
      }
    } catch {
      setShowPrintingAnimation(true)
    }
  }

  // Función para imprimir el ticket en formato térmico estándar de 80mm de forma directa e infalible
  const printTicketDocument = (ticket: NonNullable<typeof billReceiptData>) => {
    try {
      setBillReceiptData(ticket)
      setShowPrintingAnimation(true)
      const itemsHtml = ticket.items
        .map(
          (it) => `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; font-size:11px; line-height:1.25;">
          <div style="padding-right:8px; text-align:left;">
            <strong>${it.quantity}x</strong> ${it.productName}
            ${it.notes ? `<div style="font-size:9px; color:#525252; font-style:italic; padding-left:10px; margin-top:1px;">(${it.notes})</div>` : ''}
          </div>
          <div style="font-weight:bold; white-space:nowrap; text-align:right;">$${it.subtotal.toFixed(2)}</div>
        </div>
      `
        )
        .join('')

      const paymentMethodLabels: Record<string, string> = {
        CASH: 'Efectivo',
        CARD: 'Tarjeta',
        TRANSFER: 'Transferencia',
      }

      const paymentInfoHtml = ticket.isPaid
        ? `
        <div style="border-top:1px dashed #555; padding-top:4px; margin-top:6px; font-size:10px; color:#171717;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span>Método de Pago:</span>
            <strong>${paymentMethodLabels[ticket.paymentMethod || 'CASH'] || ticket.paymentMethod || 'Efectivo'}</strong>
          </div>
          ${
            ticket.paymentMethod === 'CASH' && ticket.amountReceived !== undefined
              ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
              <span>Recibido:</span>
              <span>$${ticket.amountReceived.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-weight:900; color:#000;">
              <span>Cambio:</span>
              <span>$${(ticket.change || 0).toFixed(2)}</span>
            </div>
          `
              : ''
          }
        </div>
      `
        : ''

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket - ${ticket.tableName}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm 5mm 6mm 5mm;
            }
            @media print {
              html, body {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .ticket-container {
                width: 100% !important;
                max-width: 270px !important;
                margin: 0 auto !important;
                padding: 4px 8px 14px 8px !important;
              }
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              color: #0a0a0a;
              background: #fff;
              width: 100%;
              margin: 0;
              padding: 0;
              font-variant-numeric: tabular-nums;
            }
            .ticket-container {
              width: 100%;
              max-width: 270px;
              margin: 0 auto;
              padding: 8px 12px 18px 12px;
            }
            .center { text-align: center; }
            .border-b-dashed { border-bottom: 1px dashed #555; padding-bottom: 6px; margin-bottom: 6px; }
            .border-t-dashed { border-top: 1px dashed #555; padding-top: 6px; margin-top: 6px; }
            .flex { display: flex; justify-content: space-between; }
            .logo-img {
              max-width: 140px;
              max-height: 56px;
              object-fit: contain;
              margin: 0 auto 6px auto;
              display: block;
              filter: grayscale(100%) contrast(125%);
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <!-- Cabecera del ticket -->
            <div class="center border-b-dashed">
              ${ticket.logoUrl ? `<img src="${ticket.logoUrl}" class="logo-img" alt="Logo" />` : ''}
              <div style="font-size:14px; font-weight:900; text-transform:uppercase; letter-spacing:0.5px; line-height:1.2; margin-bottom:2px; color:#000;">
                ${ticket.businessName || ticket.branchName || 'CAFETERÍA & RESTAURANTE'}
              </div>
              <div style="font-size:10px; font-weight:bold; letter-spacing:0.5px; color:#404040; margin-top:2px;">
                ${ticket.isPaid ? '--- COMPROBANTE DE PAGO ---' : '--- PRE-CUENTA DE CONSUMO ---'}
              </div>
              <div style="font-size:12px; font-weight:900; margin-top:3px; color:#000;">
                MESA: ${ticket.tableName}
              </div>
              <div style="font-size:10px; font-weight:500; color:#525252; margin-top:2px;">
                Folio: #${ticket.orderNumber ? ticket.orderNumber.slice(-6) : '000000'}
              </div>
              <div style="font-size:9px; font-weight:500; color:#737373; margin-top:2px;">
                ${ticket.date || new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            </div>

            <!-- Datos de mesero y cliente -->
            <div class="border-b-dashed" style="font-size:10px; color:#262626; line-height:1.35;">
              <div class="flex" style="margin-bottom:2px;">
                <span>Atendió:</span>
                <strong style="font-weight:bold;">${ticket.waiterName}</strong>
              </div>
              ${ticket.customerName ? `
              <div class="flex">
                <span>Cliente:</span>
                <strong style="font-weight:bold;">${ticket.customerName}</strong>
              </div>` : ''}
            </div>

            <!-- Desglose de platillos -->
            <div class="border-b-dashed">
              <div class="flex" style="font-size:10px; font-weight:bold; border-bottom:1px solid #d4d4d4; padding-bottom:3px; margin-bottom:4px; color:#171717;">
                <span>CANT / DESCRIPCIÓN</span>
                <span style="text-align:right;">TOTAL</span>
              </div>
              ${itemsHtml}
            </div>

            <!-- Totales -->
            <div style="margin-top:4px;">
              <div class="flex" style="font-size:11px; color:#262626; margin-bottom:2px;">
                <span>Subtotal:</span>
                <span>$${ticket.subtotal.toFixed(2)}</span>
              </div>
              <div class="flex" style="font-size:14px; font-weight:900; border-top:1.5px solid #000; padding-top:4px; margin-top:4px; color:#000;">
                <span>TOTAL:</span>
                <span>$${ticket.total.toFixed(2)} MXN</span>
              </div>
            </div>

            <!-- Datos de pago si ya está liquidado -->
            ${paymentInfoHtml}

            <!-- Mensaje inferior del ticket -->
            <div class="center border-t-dashed" style="margin-top:6px; padding-top:6px;">
              <div style="font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.5px; color:#171717;">
                ${ticket.isPaid ? '*** ¡GRACIAS POR SU VISITA! ***' : '*** FAVOR DE PAGAR EN CAJA ***'}
              </div>
              <div style="font-size:9px; color:#525252; margin-top:2px;">
                ${ticket.isPaid ? 'Comprobante de pago emitido exitosamente.' : 'Documento informativo de consumo.'}
              </div>
            </div>
          </div>
        </body>
        </html>
      `

      // 1. Usar iframe en el DOM (no bloqueado por popup blockers, imprime solo el ticket)
      let iframe = document.getElementById('poscafe-ticket-print-frame') as HTMLIFrameElement | null
      if (!iframe) {
        iframe = document.createElement('iframe')
        iframe.id = 'poscafe-ticket-print-frame'
        iframe.style.position = 'fixed'
        iframe.style.top = '-9999px'
        iframe.style.left = '-9999px'
        iframe.style.width = '1px'
        iframe.style.height = '1px'
        iframe.style.border = 'none'
        document.body.appendChild(iframe)
      }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(fullHtml)
        iframeDoc.close()

        setTimeout(() => {
          try {
            iframe?.contentWindow?.focus()
            iframe?.contentWindow?.print()
          } catch (frameErr) {
            console.warn('Fallo al invocar print en iframe:', frameErr)
            openPrintWindowFallback(fullHtml)
          }
        }, 200)
      } else {
        openPrintWindowFallback(fullHtml)
      }
    } catch (e) {
      console.warn('Error al invocar impresión térmica:', e)
      setShowPrintingAnimation(true)
    }
  }

  // Cobrar cuenta rápido desde Comandera de Piso
  const handleQuickCheckout = async () => {
    if (!activeTable || !activeTable.activeOrder) return

    setProcessingCheckout(true)
    const tableName = activeTable.name
    const totalOrder = Number(activeTable.activeOrder.total)
    const activeOrderData = activeTable.activeOrder

    const sessionBusinessName = currentUser?.business?.name || currentUser?.name || activeBranch?.name || 'CAFETERÍA & RESTAURANTE'
    const sessionLogoUrl = activeBranch?.logoUrl || currentUser?.business?.settings?.ticketLogoUrl || currentUser?.business?.settings?.logoUrl || activeBranch?.isotypeUrl || null

    // 1. Preparar snapshot seguro del ticket para que no se pierda al liberar la mesa
    const ticketSnapshot: NonNullable<typeof billReceiptData> = {
      tableName: activeTable.name,
      orderNumber: activeOrderData.orderNumber,
      businessName: sessionBusinessName,
      branchName: sessionBusinessName,
      logoUrl: sessionLogoUrl,
      waiterName: activeTable.currentWaiter?.name || activeOrderData.waiter?.name || currentUser?.name || 'Mesero',
      customerName: activeOrderData.customerName,
      items: activeOrderData.items.map((it) => ({
        id: it.id,
        productName: it.productName,
        quantity: it.quantity,
        subtotal: it.subtotal,
        notes: it.notes,
      })),
      subtotal: Number(activeOrderData.subtotal),
      total: totalOrder,
      paymentMethod: checkoutPaymentMethod,
      amountReceived:
        checkoutPaymentMethod === 'CASH' && checkoutAmountReceived
          ? Number(checkoutAmountReceived)
          : totalOrder,
      change:
        checkoutPaymentMethod === 'CASH' && checkoutAmountReceived
          ? Math.max(0, Number(checkoutAmountReceived) - totalOrder)
          : 0,
      isPaid: true,
      date: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
    }

    setBillReceiptData(ticketSnapshot)

    // 2. Si se solicitó imprimir ticket primero, ejecutar la impresión de forma DESACOPLADA.
    // La impresión no bloquea ni detiene el cobro si la impresora falla o se cancela.
    if (checkoutPrintTicket) {
      try {
        printTicketDocument(ticketSnapshot)
      } catch (printErr) {
        console.warn('Fallo en impresión de ticket (no bloquea el cobro):', printErr)
        notify.warning(
          'Impresión no disponible',
          'No se pudo comunicar con la impresora, pero el cobro de la mesa continuará con normalidad.'
        )
      }
    }

    // 3. Concluir el registro del cobro y liberación de mesa
    try {
      const payload = {
        paymentMethod: checkoutPaymentMethod,
        amountReceived:
          checkoutPaymentMethod === 'CASH' && checkoutAmountReceived
            ? Number(checkoutAmountReceived)
            : totalOrder,
      }

      const res = await fetch(`/api/comandas/tables/${activeTable.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (json.success) {
        setShowCheckoutModal(false)
        setShowOrderModal(false)
        setShowTableOptionsMenu(false)
        notify.success(
          'Mesa cobrada exitosamente',
          `Pago de $${totalOrder.toFixed(2)} MXN registrado y ${tableName} liberada.`
        )

        try {
          localStorage.setItem('poscafe_kitchen_event', JSON.stringify({ type: 'CHECKOUT', timestamp: Date.now() }))
          window.dispatchEvent(new CustomEvent('poscafe:kitchen-updated'))
        } catch {}

        await refreshTables()
      } else {
        const errMsg = json.error?.message || 'No se pudo procesar el cobro'
        notify.error('Error al cobrar', errMsg)
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible registrar el cobro de la mesa')
    } finally {
      setProcessingCheckout(false)
    }
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
    const orderData = activeTable.activeOrder
    const sessionBusinessName = currentUser?.business?.name || currentUser?.name || activeBranch?.name || 'CAFETERÍA & RESTAURANTE'
    const sessionLogoUrl = activeBranch?.logoUrl || currentUser?.business?.settings?.ticketLogoUrl || currentUser?.business?.settings?.logoUrl || activeBranch?.isotypeUrl || null

    const ticket: NonNullable<typeof billReceiptData> = {
      tableName: activeTable.name,
      orderNumber: orderData.orderNumber,
      businessName: sessionBusinessName,
      branchName: sessionBusinessName,
      logoUrl: sessionLogoUrl,
      waiterName: activeTable.currentWaiter?.name || orderData.waiter?.name || currentUser?.name || 'Mesero',
      customerName: orderData.customerName,
      items: orderData.items.map((it) => ({
        id: it.id,
        productName: it.productName,
        quantity: it.quantity,
        subtotal: it.subtotal,
        notes: it.notes,
      })),
      subtotal: Number(orderData.subtotal),
      total: Number(orderData.total),
      isPaid: false,
      date: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
    }
    setBillReceiptData(ticket)

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
    printTicketDocument(ticket)
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
                      const readyItemsCount = table.activeOrder?.items?.filter((it) => it.kitchenStatus === 'READY').length || 0
                      const hasReadyItems = readyItemsCount > 0
                      const isTakeawayOrder = table.activeOrder?.orderType === 'TAKEAWAY'
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
                        ? hasReadyItems
                          ? '#ECFDF5'
                          : isTransferredToMe
                          ? '#E0F2FE'
                          : isMyAssignedTable
                          ? '#FFFFFF'
                          : isBillPrinted
                          ? '#FAF5FF'
                          : isOccupied
                          ? '#FFFBEB'
                          : '#FFFFFF'
                        : hasReadyItems
                        ? '#064e3b35'
                        : isTransferredToMe
                        ? '#08334440'
                        : isMyAssignedTable
                        ? `${themeSecondary}35`
                        : isBillPrinted
                        ? `${themeSecondary}30`
                        : isOccupied
                        ? `${themeSecondary}20`
                        : `${themeBg}C0`

                      const cardBorder = hasReadyItems
                        ? '#10b981'
                        : isLight
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
                            ...(hasReadyItems
                              ? { boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)' }
                              : isMyAssignedTable
                              ? { boxShadow: `0 8px 24px ${themePrimary}25` }
                              : {}),
                          }}
                          className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border text-left transition-all relative flex flex-col justify-between min-h-[118px] sm:min-h-[160px] cursor-pointer hover:scale-[1.02] active:scale-95 select-none shadow-sm ${
                            hasReadyItems
                              ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20'
                              : isTransferredToMe
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
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-base sm:text-lg font-black block leading-tight truncate ${
                                  isLight ? 'text-[#2B1712]' : 'text-white'
                                }`}>
                                  {table.name}
                                </span>
                                {hasReadyItems ? (
                                  <span className="text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-0.5 sm:gap-1 shadow-xs animate-pulse">
                                    🔔 ¡{readyItemsCount} Listo!
                                  </span>
                                ) : table.activeOrder?.items?.some((it) => it.kitchenStatus === 'COOKING') ? (
                                  <span className="text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-0.5 sm:gap-1 shadow-xs">
                                    🍳 En Marcha
                                  </span>
                                ) : table.activeOrder?.items?.some((it) => it.kitchenStatus === 'PENDING') ? (
                                  <span className="text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-0.5 sm:gap-1 shadow-xs">
                                    ⏳ En Cocina
                                  </span>
                                ) : null}
                                {isTakeawayOrder && (
                                  <span className={`text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded border ${
                                    isLight ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  }`}>
                                    🥡 Llevar
                                  </span>
                                )}
                                {isTransferredToMe && (
                                  <span className={`text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded border ${
                                    isLight ? 'bg-cyan-100 text-cyan-950 border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                  }`}>
                                    🔄 Relevo
                                  </span>
                                )}
                                {!isTransferredAway && isMyAssignedTable && (
                                  <span
                                    className={`hidden sm:inline-flex text-[9px] font-black px-2 py-0.5 rounded-full border items-center gap-1 shadow-xs tracking-wide ${
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

                              {/* Capacidad visible en pantallas sm+ */}
                              <div className="mt-1 hidden sm:flex items-center gap-1.5 flex-wrap">
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

                            {/* Status Dot / Pre-cuenta */}
                            <div className="flex items-center gap-1 shrink-0">
                              {isBillPrinted && (
                                <span
                                  className={`text-[8px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.5 rounded-full border flex items-center gap-0.5 animate-pulse shadow-xs ${
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
                                  <Receipt className="w-2.5 h-2.5" style={{ color: themePrimary }} />
                                  <span className="hidden sm:inline">Pre-cuenta</span>
                                </span>
                              )}
                              <span
                                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
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

                          {/* Cuerpo Central - Optimizado para Móvil vs Desktop */}
                          {table.activeOrder ? (
                            <div className="my-1 sm:my-1.5">
                              {/* Versión Móvil: Una línea compacta */}
                              <div className="sm:hidden text-[10px] truncate">
                                <span className={isLight ? 'text-[#7A5A43]' : 'text-slate-400'}>
                                  👤 {table.activeOrder.waiter?.name || table.currentWaiter?.name || 'Mesero'}
                                </span>
                              </div>

                              {/* Versión Tablet/Desktop Completa */}
                              <div className="hidden sm:block">
                                {tableServiceMode === 'FREE' ? (
                                  <div
                                    className="text-[10px] space-y-0.5 p-1.5 rounded-xl border"
                                    style={{
                                      backgroundColor: isLight ? '#FDFBF9' : `${themeSecondary}25`,
                                      borderColor: isLight ? '#DECEBD' : `${themeSecondary}50`,
                                    }}
                                  >
                                    <span className={`flex items-center gap-1 truncate font-medium ${
                                      isLight ? 'text-[#7A5A43]' : 'text-slate-300'
                                    }`}>
                                      <Users className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                      Atiende: <strong className={isLight ? 'text-[#2B1712]' : 'text-white'}>{table.activeOrder.waiter?.name || table.currentWaiter?.name || 'Mesero'}</strong>
                                    </span>
                                  </div>
                                ) : isTransferredToMe ? (
                                  <div className={`text-[10px] space-y-1 p-1.5 rounded-xl border ${
                                    isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-950' : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200'
                                  }`}>
                                    <span className="flex items-center gap-1 truncate font-semibold">
                                      <ArrowRightLeft className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                                      Encargada: <strong className={isLight ? 'text-cyan-950 font-bold' : 'text-white'}>{table.assignedWaiter?.name || 'Compañero'}</strong>
                                    </span>
                                  </div>
                                ) : isTransferredAway ? (
                                  <div className={`text-[10px] space-y-1 p-1.5 rounded-xl border ${
                                    isLight ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                                  }`}>
                                    <span className="flex items-center gap-1 truncate font-semibold">
                                      <UserCheck className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                      En apoyo: <strong className={isLight ? 'text-amber-950 font-bold' : 'text-white'}>{table.currentWaiter?.name}</strong>
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    className="text-[10px] space-y-0.5 p-1.5 rounded-xl border truncate"
                                    style={{
                                      backgroundColor: isLight
                                        ? (isMyAssignedTable ? '#FFFBEB' : '#FDFBF9')
                                        : (isMyAssignedTable ? `${themePrimary}20` : `${themeSecondary}25`),
                                      borderColor: isLight
                                        ? (isMyAssignedTable ? '#FCD34D' : '#DECEBD')
                                        : (isMyAssignedTable ? `${themePrimary}50` : `${themeSecondary}50`),
                                    }}
                                  >
                                    <span className="flex items-center gap-1 truncate">
                                      <Users className="w-2.5 h-2.5 shrink-0" style={{ color: themePrimary }} />
                                      {table.assignedWaiter ? (
                                        <span>Titular: <strong>{table.assignedWaiter.name}</strong></span>
                                      ) : (
                                        <span className="italic">Libre</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-1 my-auto">
                              <span className={`text-[11px] sm:text-xs font-bold block flex items-center justify-center gap-1 ${
                                isLight ? 'text-emerald-900 font-black' : 'text-emerald-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-emerald-400'}`}></span>
                                Libre
                              </span>
                              <span className={`text-[9px] sm:text-[10px] block ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                                Toca para abrir
                              </span>
                            </div>
                          )}

                          {/* Pie de Tarjeta: Conteo de Artículos y Total */}
                          {table.activeOrder && (
                            <div className="pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-0.5">
                              <div className="flex justify-between items-center text-xs">
                                <span
                                  className="px-1.5 sm:px-2 py-0.5 rounded-md border font-mono text-[9px] sm:text-[10px] font-bold flex items-center gap-1"
                                  style={{
                                    backgroundColor: isLight ? '#F3E9DC' : `${themeSecondary}35`,
                                    borderColor: isLight ? '#DECEBD' : `${themeSecondary}60`,
                                    color: isLight ? '#5E3023' : '#F3E9DC',
                                  }}
                                >
                                  <UtensilsCrossed className="w-2.5 h-2.5" style={{ color: themePrimary }} />
                                  <span>{table.activeOrder.itemsCount}</span>
                                </span>
                                <strong className="font-black text-xs sm:text-sm tracking-tight font-mono" style={{ color: isLight ? '#5E3023' : themePrimary }}>
                                  ${table.activeOrder.total.toFixed(2)}
                                </strong>
                              </div>

                              {table.activeOrder.customerName && (
                                <span className={`text-[9px] sm:text-[10px] block truncate italic font-medium ${
                                  isLight ? 'text-[#7A5A43]' : 'text-slate-300'
                                }`}>
                                  👤 {table.activeOrder.customerName}
                                </span>
                              )}
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
            {/* Header Limpio del Modal de Mesa */}
            <div
              className="p-3 sm:px-5 border-b flex items-center justify-between shrink-0"
              style={{
                backgroundColor: isLight ? '#FFFFFF' : `${themeSecondary}25`,
                borderColor: isLight ? '#DECEBD' : `${themeSecondary}50`,
              }}
            >
              {/* Izquierda: Volver + Nombre de Mesa + Status simple */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className={`p-2 -ml-1 rounded-xl cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-[#F3E9DC] border border-[#DECEBD] text-[#5E3023]'
                      : 'bg-[#251e1b] hover:bg-[#332924] text-slate-300'
                  }`}
                  title="Volver al plano de mesas"
                >
                  <ArrowLeft className="w-5 h-5" style={{ color: themePrimary }} />
                </button>

                <div className="min-w-0 flex items-center gap-2">
                  <h3 className={`text-lg sm:text-xl font-black tracking-tight truncate ${
                    isLight ? 'text-[#2B1712]' : 'text-white'
                  }`}>
                    {activeTable.name}
                  </h3>
                </div>
              </div>

              {/* Derecha: Menú Opciones (⋯) + Cerrar */}
              <div className="flex items-center gap-2">

                {/* Menú de Opciones Secundarias (⋯ Opciones) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTableOptionsMenu(!showTableOptionsMenu)}
                    className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-all cursor-pointer font-bold ${
                      isLight
                        ? 'bg-white hover:bg-[#F3E9DC] text-[#5E3023] border-[#DECEBD]'
                        : 'bg-[#251e1b] hover:bg-[#332924] border-[#382b25] text-slate-300'
                    }`}
                    title="Más opciones de la mesa"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                    <span className="hidden sm:inline">Opciones</span>
                  </button>

                  {/* Dropdown flotante de Opciones de Mesa */}
                  {showTableOptionsMenu && (
                    <div
                      className={`absolute right-0 top-full mt-1.5 w-56 rounded-2xl border shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 ${
                        isLight ? 'bg-white border-[#DECEBD] text-[#2B1712]' : 'bg-[#1c1715] border-[#382b25] text-slate-100'
                      }`}
                    >
                      {/* Imprimir Pre-cuenta / Ticket */}
                      {activeTable.activeOrder && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowTableOptionsMenu(false)
                            handleOpenPrintBill()
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-left ${
                            isLight ? 'hover:bg-[#F3E9DC] text-[#5E3023]' : 'hover:bg-[#251e1b] text-slate-200'
                          }`}
                        >
                          <Printer className="w-4 h-4 text-purple-400" />
                          <span>Imprimir Pre-cuenta</span>
                        </button>
                      )}

                      {/* Mover / Traspasar Mesa */}
                      {activeTable.activeOrder && (currentUser?.permissions?.canTransferTables || isOwnerOrAdmin || activeTable.assignedWaiter?.id === currentUser?.id || activeTable.currentWaiter?.id === currentUser?.id) && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowTableOptionsMenu(false)
                            setShowTransferModal(true)
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-left ${
                            isLight ? 'hover:bg-[#F3E9DC] text-[#5E3023]' : 'hover:bg-[#251e1b] text-slate-200'
                          }`}
                        >
                          <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                          <span>Mover a otra mesa</span>
                        </button>
                      )}

                      {/* Encargar Mesa a Compañero */}
                      {(!activeTable.currentWaiter || activeTable.currentWaiter.id === currentUser?.id || isOwnerOrAdmin) && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowTableOptionsMenu(false)
                            setTargetTransferWaiterId('')
                            setShowTransferWaiterModal(true)
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-left ${
                            isLight ? 'hover:bg-[#F3E9DC] text-[#5E3023]' : 'hover:bg-[#251e1b] text-slate-200'
                          }`}
                        >
                          <UserCheck className="w-4 h-4 text-cyan-400" />
                          <span>Encargar a compañero</span>
                        </button>
                      )}

                      {/* Asignar Titular Permanente (Admin) */}
                      {isOwnerOrAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowTableOptionsMenu(false)
                            setTargetAssignWaiterId(activeTable.assignedWaiter?.id || '')
                            setShowAssignWaiterModal(true)
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-left ${
                            isLight ? 'hover:bg-[#F3E9DC] text-[#5E3023]' : 'hover:bg-[#251e1b] text-slate-200'
                          }`}
                        >
                          <UserPlus className="w-4 h-4 text-amber-400" />
                          <span>Asignar mesero titular</span>
                        </button>
                      )}

                      {/* Si está encargada, devolver o retomar */}
                      {activeTable.currentWaiter && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowTableOptionsMenu(false)
                            handleReturnTableToTitular(activeTable)
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-left ${
                            isLight ? 'hover:bg-amber-50 text-amber-900' : 'hover:bg-amber-950/40 text-amber-300'
                          }`}
                        >
                          <RotateCcw className="w-4 h-4 text-amber-400" />
                          <span>
                            {activeTable.assignedWaiter?.id === currentUser?.id
                              ? 'Retomar mi mesa'
                              : 'Devolver al titular'}
                          </span>
                        </button>
                      )}

                      {/* Separador */}
                      <div className={`h-px my-1 ${isLight ? 'bg-[#DECEBD]' : 'bg-[#382b25]'}`} />

                      {/* Liberar Mesa (con validación de seguridad) */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowTableOptionsMenu(false)
                          handleReleaseTable()
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-left ${
                          isLight ? 'hover:bg-red-50 text-red-700' : 'hover:bg-red-950/40 text-red-400'
                        }`}
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Liberar mesa</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Botón cerrar en desktop */}
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

            {/* Barra de Modo de Consumo y Empaques (Preguntar al cliente primero: Mesa vs Para Llevar) */}
            <div
              className={`px-3 py-2 border-b flex items-center justify-between gap-2 flex-wrap shrink-0 ${
                isLight ? 'bg-white border-[#DECEBD]' : 'bg-[#181311] border-[#382b25]'
              }`}
            >
              {/* Selector de Modo */}
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-bold ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                  Consumo:
                </span>
                <div
                  className="inline-flex p-0.5 rounded-xl border text-xs"
                  style={{
                    backgroundColor: isLight ? '#F3E9DC' : '#14100e',
                    borderColor: isLight ? '#DECEBD' : '#382b25',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOrderType('DINE_IN')}
                    className={`px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1 transition-all cursor-pointer ${
                      orderType === 'DINE_IN'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : isLight
                        ? 'text-[#7A5A43] hover:text-[#2B1712]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🍽️ En Mesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('TAKEAWAY')
                      if (!takeawayPackaging.includeBag && !takeawayPackaging.includeTray) {
                        setTakeawayPackaging((prev) => ({ ...prev, includeBag: true }))
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1 transition-all cursor-pointer ${
                      orderType === 'TAKEAWAY'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isLight
                        ? 'text-[#7A5A43] hover:text-[#2B1712]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🥡 Para Llevar</span>
                  </button>
                </div>
              </div>

              {/* Empaques opcionales si es Para Llevar */}
              {orderType === 'TAKEAWAY' ? (
                <div className="flex items-center gap-1 text-[11px] animate-in fade-in">
                  <span className={`text-[10px] font-bold hidden xs:inline ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                    Empaque:
                  </span>
                  <button
                    type="button"
                    onClick={() => setTakeawayPackaging((prev) => ({ ...prev, includeBag: !prev.includeBag }))}
                    className={`px-2 py-1 rounded-lg border font-bold cursor-pointer transition-all ${
                      takeawayPackaging.includeBag
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : isLight ? 'bg-white text-slate-500 border-[#DECEBD]' : 'bg-[#251e1b] text-slate-400 border-[#382b25]'
                    }`}
                    title="Descontar bolsa de inventario"
                  >
                    {takeawayPackaging.includeBag ? '✓ Bolsa' : '+ Bolsa'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTakeawayPackaging((prev) => ({ ...prev, includeTray: !prev.includeTray }))}
                    className={`px-2 py-1 rounded-lg border font-bold cursor-pointer transition-all ${
                      takeawayPackaging.includeTray
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : isLight ? 'bg-white text-slate-500 border-[#DECEBD]' : 'bg-[#251e1b] text-slate-400 border-[#382b25]'
                    }`}
                    title="Descontar portavasos/charola de inventario"
                  >
                    {takeawayPackaging.includeTray ? '✓ Portavasos' : '+ Portavasos'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTakeawayPackaging((prev) => ({ ...prev, includeCutlery: !prev.includeCutlery }))}
                    className={`px-2 py-1 rounded-lg border font-bold cursor-pointer transition-all ${
                      takeawayPackaging.includeCutlery
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : isLight ? 'bg-white text-slate-500 border-[#DECEBD]' : 'bg-[#251e1b] text-slate-400 border-[#382b25]'
                    }`}
                    title="Descontar cubiertos de inventario"
                  >
                    {takeawayPackaging.includeCutlery ? '✓ Cubiertos' : '+ Cubiertos'}
                  </button>
                </div>
              ) : (
                <span className={`text-[10px] italic hidden sm:inline ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                  (Servicio en vajilla y cristalería de la cafetería)
                </span>
              )}
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
                    <div className="sticky bottom-0 left-0 right-0 z-30 flex flex-col">
                      {/* Drawer Desplegable para Rectificar la Orden */}
                      {showOrderReviewDrawer && (
                        <div
                          className={`p-3 sm:p-4 border-t-2 rounded-t-3xl shadow-2xl space-y-3 max-h-[55vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 backdrop-blur-xl ${
                            isLight
                              ? 'bg-white/98 border-[#C08552] text-[#2B1712]'
                              : 'bg-[#181311]/98 border-[#C08552]/70 text-slate-100'
                          }`}
                        >
                          {/* Header del Drawer de Rectificación */}
                          <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#DECEBD] dark:border-[#382b25]">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                <Sparkles className="w-4 h-4" />
                              </span>
                              <div>
                                <h4 className={`text-xs sm:text-sm font-black ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                                  Rectificar Ronda ({stagedItems.reduce((acc, it) => acc + it.quantity, 0)} artículos)
                                </h4>
                                <p className={`text-[10px] ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                                  Especifica notas individuales (ej. uno sin hielo y otro con todo)
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setStagedItems([])}
                                className="text-[11px] text-rose-500 hover:text-rose-600 font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                title="Vaciar toda la ronda"
                              >
                                Vaciar
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowOrderReviewDrawer(false)}
                                className={`p-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                                  isLight
                                    ? 'bg-[#F3E9DC] hover:bg-[#DECEBD] text-[#5E3023] border-[#DECEBD]'
                                    : 'bg-[#251e1b] hover:bg-[#332924] text-slate-300 border-[#382b25]'
                                }`}
                                title="Minimizar panel de rectificación"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Lista Agrupada en Acordeón por Producto */}
                          <div className="space-y-2.5">
                            {Object.values(groupedStagedProducts).map((group) => {
                              const isExpanded = expandedReviewProducts[group.productName] !== false

                              return (
                                <div
                                  key={group.productName}
                                  className={`rounded-2xl border transition-all overflow-hidden ${
                                    isLight ? 'bg-[#FDFBF9] border-[#DECEBD]' : 'bg-[#14100e] border-[#382b25]'
                                  }`}
                                >
                                  {/* Encabezado del Acordeón del Producto */}
                                  <button
                                    type="button"
                                    onClick={() => toggleReviewProductExpand(group.productName)}
                                    className={`w-full p-2.5 sm:p-3 flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
                                      isLight ? 'hover:bg-[#F3E9DC]/60' : 'hover:bg-[#1f1815]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0"
                                        style={{ backgroundColor: themeButton }}
                                      >
                                        {group.totalQuantity}
                                      </span>
                                      <strong className={`text-xs sm:text-sm font-black truncate ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                                        {group.productName}
                                      </strong>
                                      {group.items.some((it) => it.notes) && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shrink-0">
                                          Con notas
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-xs font-mono font-black ${isLight ? 'text-[#5E3023]' : 'text-[#C08552]'}`}>
                                        ${group.totalSubtotal.toFixed(2)}
                                      </span>
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 opacity-70" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 opacity-70" />
                                      )}
                                    </div>
                                  </button>

                                  {/* Contenido Desplegado del Producto: Ítems individuales para notas específicas */}
                                  {isExpanded && (
                                    <div className={`p-2.5 sm:p-3 border-t space-y-2.5 ${
                                      isLight ? 'border-[#DECEBD] bg-white' : 'border-[#2a201b] bg-[#1a1412]'
                                    }`}>
                                      {group.items.map((item, itemIdx) => {
                                        const itemKey = item.stagedId || item.variantId
                                        const isAllergy = item.notes && (item.notes.includes('ALERGIA') || item.notes.includes('ALÉRGICO') || item.notes.includes('Alérgico'))

                                        return (
                                          <div
                                            key={itemKey}
                                            className={`p-2.5 rounded-xl border space-y-2 transition-all ${
                                              isAllergy
                                                ? 'bg-rose-500/10 border-rose-500/60'
                                                : isLight
                                                ? 'bg-[#FDFBF9] border-[#E8DCCF]'
                                                : 'bg-[#15100e] border-[#382b25]'
                                            }`}
                                          >
                                            {/* Fila del Ítem: Variante, Botón Separar y Controles */}
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                <span className={`text-xs font-bold ${isLight ? 'text-[#2B1712]' : 'text-slate-200'}`}>
                                                  #{itemIdx + 1}
                                                </span>
                                                {item.variantName && item.variantName !== 'Regular' && (
                                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                    isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/20 text-amber-300'
                                                  }`}>
                                                    {item.variantName}
                                                  </span>
                                                )}

                                                {/* Botón Separar Ítems (si cantidad > 1) para permitir decir ej. 1 sin hielo y 1 con todo */}
                                                {item.quantity > 1 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleSplitStagedItem(itemKey)}
                                                    className="px-2 py-0.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-black text-[10px] flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                                                    title="Separar en 2 líneas para poner notas individuales a cada uno"
                                                  >
                                                    <Scissors className="w-3 h-3" />
                                                    <span>Separar ({item.quantity})</span>
                                                  </button>
                                                )}
                                              </div>

                                              {/* Stepper y Basura */}
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => updateStagedQty(itemKey, -1)}
                                                  className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold text-xs cursor-pointer active:scale-90 ${
                                                    isLight ? 'bg-white border-[#DECEBD] text-[#5E3023]' : 'bg-[#251e1b] border-[#382b25] text-slate-300'
                                                  }`}
                                                >
                                                  <Minus className="w-3 h-3" />
                                                </button>
                                                <span className={`font-black text-xs font-mono min-w-[20px] text-center ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                                                  {item.quantity}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => updateStagedQty(itemKey, 1)}
                                                  style={{ backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                                                  className="w-7 h-7 flex items-center justify-center rounded-lg font-bold text-xs cursor-pointer active:scale-90 shadow-xs"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => removeItemFromStaged(itemKey)}
                                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer active:scale-90 ml-1"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>

                                            {/* Modificadores / Extras */}
                                            {item.modifiers && item.modifiers.length > 0 && (
                                              <div className="flex flex-wrap gap-1 text-[10px]">
                                                {item.modifiers.map((m, mIdx) => (
                                                  <span key={mIdx} className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">
                                                    + {m.name}
                                                  </span>
                                                ))}
                                              </div>
                                            )}

                                            {/* Chips Rápidos de Notas Preestablecidas */}
                                            <div className="space-y-1.5 pt-1">
                                              <div className="flex flex-wrap gap-1">
                                                {['Sin hielo', 'Con todo', 'Sin azúcar', 'Deslactosada', 'Bien caliente', 'Para llevar', 'Alérgico/a'].map((chip) => {
                                                  const isSelected = item.notes?.includes(chip)
                                                  return (
                                                    <button
                                                      key={chip}
                                                      type="button"
                                                      onClick={() => handleTogglePresetNote(itemKey, chip)}
                                                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer select-none active:scale-95 ${
                                                        isSelected
                                                          ? 'bg-amber-600 text-white border-amber-600 font-black shadow-xs'
                                                          : isLight
                                                          ? 'bg-white hover:bg-[#F3E9DC] text-[#5E3023] border-[#DECEBD]'
                                                          : 'bg-[#1f1815] hover:bg-[#2c221e] text-slate-300 border-[#382b25]'
                                                      }`}
                                                    >
                                                      {isSelected ? `✓ ${chip}` : `+ ${chip}`}
                                                    </button>
                                                  )
                                                })}
                                              </div>

                                              {/* Input de Nota libre */}
                                              <input
                                                type="text"
                                                placeholder="Nota específica (ej. término medio, sin cebolla)..."
                                                value={item.notes || ''}
                                                onChange={(e) => updateItemNote(itemKey, e.target.value)}
                                                className={`w-full px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C08552] ${
                                                  isLight
                                                    ? 'bg-white border border-[#DECEBD] text-[#2B1712] placeholder-[#A88C7D]'
                                                    : 'bg-[#181311] border border-[#382b25] text-amber-200 placeholder-slate-500'
                                                }`}
                                              />
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Barra Fija Inferior con Total, Rectificar y Enviar Directo a Cocina */}
                      <div
                        className={`p-3 border-t backdrop-blur-md flex items-center justify-between gap-2 shadow-2xl rounded-2xl ${
                          isLight
                            ? 'bg-white/95 border-[#DECEBD] text-[#2B1712]'
                            : 'bg-[#1c1715]/95 border-[#382b25] text-slate-100'
                        }`}
                      >
                        {/* Botón Rectificar / Resumen con Total al Lado */}
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => setShowOrderReviewDrawer(!showOrderReviewDrawer)}
                            className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 select-none ${
                              showOrderReviewDrawer
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                : isLight
                                ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] text-[#5E3023] border-[#DECEBD]'
                                : 'bg-[#251e1b] hover:bg-[#332924] text-slate-200 border-[#382b25]'
                            }`}
                            title="Desplegar resumen para rectificar la orden"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Rectificar ({stagedItems.reduce((acc, it) => acc + it.quantity, 0)})</span>
                            {showOrderReviewDrawer ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <div className="hidden xs:block sm:block">
                            <span className={`text-[10px] block font-medium leading-none ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                              Total ronda:
                            </span>
                            <strong className={`text-xs sm:text-sm font-black font-mono leading-tight ${isLight ? 'text-[#5E3023]' : 'text-[#C08552]'}`}>
                              $
                              {stagedItems
                                .reduce((acc, it) => {
                                  const modTotal = it.modifiers?.reduce((mAcc, m) => mAcc + m.unitPrice, 0) || 0
                                  return acc + (it.unitPrice + modTotal) * it.quantity
                                }, 0)
                                .toFixed(2)}{' '}
                              MXN
                            </strong>
                          </div>
                        </div>

                        {/* Botón de Acción: Enviar Directo a Cocina */}
                        <div>
                          <button
                            type="button"
                            onClick={handleSendToKitchen}
                            disabled={submittingOrder}
                            style={{ backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                            className="px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer transition-all select-none disabled:opacity-50"
                            title="Enviar ronda directo a cocina"
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


                  {/* Nombre de comensal / referencia compacto */}
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-[11px] font-bold shrink-0 ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                      👤 Comensal:
                    </span>
                    <input
                      type="text"
                      placeholder="Nombre o referencia (ej. Familia López)..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`flex-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C08552] ${
                        isLight
                          ? 'bg-white border border-[#DECEBD] text-[#2B1712] placeholder-[#A88C7D]'
                          : 'bg-[#1c1715] border border-[#382b25] text-white placeholder-slate-500'
                      }`}
                    />
                  </div>

                  {/* SECCIÓN 1: PRODUCTOS AGREGADOS / CONSUMIDOS EN LA MESA */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-1.5 ${
                          isLight ? 'text-[#5E3023]' : 'text-[#C08552]'
                        }`}>
                          <ShoppingBag className="w-4 h-4" />
                          Consumo en Mesa ({activeTable.activeOrder?.items?.length || 0})
                        </span>
                      </div>

                      {/* Botón Servir Todo si hay platillos listos */}
                      {activeTable.activeOrder?.items?.some((it) => it.kitchenStatus === 'READY') && (
                        <button
                          type="button"
                          onClick={handleMarkAllReadyServed}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer animate-pulse"
                          title="Marcar todos los platillos listos como entregados a la mesa"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>🔔 Servir Todo a Mesa</span>
                        </button>
                      )}
                    </div>

                    {/* Si la mesa tiene platillos agregados / consumidos */}
                    {activeTable.activeOrder && activeTable.activeOrder.items.length > 0 ? (
                      <div className="space-y-2 max-h-72 sm:max-h-80 overflow-y-auto pr-1">
                        {activeTable.activeOrder.items.map((it) => {
                          const isReady = it.kitchenStatus === 'READY'
                          const isCooking = it.kitchenStatus === 'COOKING'
                          const isServed = it.kitchenStatus === 'SERVED'

                          return (
                            <div
                              key={it.id}
                              className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all shadow-xs ${
                                isReady
                                  ? isLight
                                    ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/40'
                                    : 'bg-emerald-950/30 border-emerald-500/60 ring-2 ring-emerald-500/30'
                                  : isCooking
                                  ? isLight
                                    ? 'bg-amber-50/70 border-amber-300'
                                    : 'bg-amber-950/20 border-amber-600/40'
                                  : isLight
                                  ? 'bg-white border-[#DECEBD]'
                                  : 'bg-[#1a1412] border-[#382b25]'
                              }`}
                            >
                              {/* Nombre, Cantidad, Variante y Notas */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className="px-2 py-0.5 rounded-lg text-xs font-black text-white shrink-0"
                                    style={{ backgroundColor: themeButton }}
                                  >
                                    {it.quantity}x
                                  </span>
                                  <strong className={`text-xs sm:text-sm font-black truncate ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                                    {it.productName}
                                  </strong>
                                  {it.variantName && it.variantName !== 'Regular' && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}>
                                      {it.variantName}
                                    </span>
                                  )}
                                </div>

                                {it.notes && (
                                  <p className={`text-xs italic flex items-center gap-1 ${
                                    it.notes.includes('ALERGIA') || it.notes.includes('ALÉRGICO')
                                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                                      : isLight
                                      ? 'text-amber-900'
                                      : 'text-amber-300'
                                  }`}>
                                    <span>📝 {it.notes}</span>
                                  </p>
                                )}
                              </div>

                              {/* Estado en Cocina + Botón Servir + Subtotal */}
                              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-dashed border-[#DECEBD] dark:border-[#382b25]">
                                {/* Badge de Estado KDS */}
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                                      isReady
                                        ? 'bg-emerald-600 text-white animate-pulse shadow-sm'
                                        : isCooking
                                        ? isLight
                                          ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : isServed
                                        ? isLight
                                          ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                          : 'bg-slate-800 text-slate-400'
                                        : isLight
                                        ? 'bg-blue-100 text-blue-950 border border-blue-300'
                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    }`}
                                  >
                                    {isReady ? (
                                      <>🔔 Listo para Servir</>
                                    ) : isCooking ? (
                                      <>🍳 Preparando</>
                                    ) : isServed ? (
                                      <>✅ Servido</>
                                    ) : (
                                      <>⏳ En Espera</>
                                    )}
                                  </span>

                                  {/* Botón individual de Servir si está LISTO */}
                                  {isReady && (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkItemServed(it.id, it.productName)}
                                      className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                                      title="Confirmar entrega en la mesa"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      <span>Servir</span>
                                    </button>
                                  )}
                                </div>

                                {/* Subtotal */}
                                <span className={`text-xs sm:text-sm font-mono font-black ${isLight ? 'text-[#5E3023]' : 'text-[#C08552]'}`}>
                                  ${it.subtotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className={`p-4 rounded-2xl border border-dashed text-center space-y-1.5 ${
                        isLight ? 'border-[#DECEBD] bg-white/70 text-[#7A5A43]' : 'border-[#382b25] bg-[#1a1412]/50 text-slate-400'
                      }`}>
                        <p className={`font-bold text-xs ${isLight ? 'text-[#2B1712]' : 'text-slate-200'}`}>
                          Sin platillos marchados aún en esta mesa
                        </p>
                        <p className="text-[11px]">
                          Selecciona platillos del catálogo o revisa la ronda a continuación para enviar a cocina.
                        </p>
                      </div>
                    )}
                  </div>



                  {/* SECCIÓN 3: RESUMEN TOTAL DE LA CUENTA Y OPCIONES DE COBRO */}
                  <div className={`p-3.5 sm:p-4 rounded-3xl border space-y-3 shrink-0 ${
                    isLight ? 'bg-white border-[#DECEBD] shadow-md' : 'bg-[#181311] border-[#382b25]'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className={`text-[11px] block font-medium ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                          Total Consumido ({activeTable.name}):
                        </span>
                        <strong className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                          isLight ? 'text-[#5E3023]' : 'text-[#C08552]'
                        }`}>
                          ${(activeTable.activeOrder?.total || 0).toFixed(2)} MXN
                        </strong>
                      </div>

                      {/* Botones de Cobro y Ticket */}
                      {activeTable.activeOrder && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleOpenPrintBill}
                            className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer select-none active:scale-95 transition-all ${
                              isLight
                                ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] text-[#5E3023] border-[#DECEBD]'
                                : 'bg-[#251e1b] hover:bg-[#332924] text-slate-200 border-[#382b25]'
                            }`}
                            title="Imprimir ticket informativo de pre-cuenta para el cliente"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Imprimir Ticket</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCheckoutPaymentMethod('CASH')
                              setCheckoutAmountReceived(activeTable.activeOrder?.total ? String(activeTable.activeOrder.total) : '')
                              setShowCheckoutModal(true)
                            }}
                            className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer select-none"
                            title="Cobrar la cuenta y liquidar la mesa"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Cobrar Cuenta</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL INICIAL OBLIGATORIO: SELECCIÓN DE MODO DE CONSUMO (MESA VS PARA LLEVAR) */}
      {showOrderTypeSelectionModal && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={`w-full max-w-lg rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 my-auto border ${
              isLight
                ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                : 'bg-[#1a1412] border-[#382b25] text-white'
            }`}
          >
            {/* Header */}
            <div className="text-center space-y-1">
              <span className="inline-flex p-3 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 text-2xl">
                🍽️ / 🥡
              </span>
              <h3 className={`text-lg sm:text-xl font-black ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                Iniciar Pedido en {activeTable.name}
              </h3>
              <p className={`text-xs sm:text-sm ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                Pregunta primero al cliente cómo será su pedido para que cocina y barra preparen en vajilla o empaques desechables.
              </p>
            </div>

            {/* Dos Opciones Principales Táctiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Opción 1: Consumo en Mesa */}
              <button
                type="button"
                onClick={() => {
                  setOrderType('DINE_IN')
                  setShowOrderTypeSelectionModal(false)
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 group active:scale-95 ${
                  orderType === 'DINE_IN'
                    ? 'border-amber-600 bg-amber-500/10 shadow-md ring-2 ring-amber-500/30'
                    : isLight
                    ? 'border-[#DECEBD] bg-[#FDFBF9] hover:border-amber-500'
                    : 'border-[#382b25] bg-[#14100e] hover:border-amber-600/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🍽️</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    Vajilla & Cristalería
                  </span>
                </div>
                <div>
                  <h4 className={`text-sm font-black ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                    Comer Aquí (En Mesa)
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                    Cocina y barra servirán en platos, tazas y vasos de la cafetería. No se descuentan vasos desechables.
                  </p>
                </div>
              </button>

              {/* Opción 2: Para Llevar / Domicilio */}
              <button
                type="button"
                onClick={() => {
                  setOrderType('TAKEAWAY')
                  if (!takeawayPackaging.includeBag && !takeawayPackaging.includeTray) {
                    setTakeawayPackaging((prev) => ({ ...prev, includeBag: true }))
                  }
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 group active:scale-95 ${
                  orderType === 'TAKEAWAY'
                    ? 'border-emerald-600 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/30'
                    : isLight
                    ? 'border-[#DECEBD] bg-[#FDFBF9] hover:border-emerald-500'
                    : 'border-[#382b25] bg-[#14100e] hover:border-emerald-600/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🥡</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Vasos & Empaques
                  </span>
                </div>
                <div>
                  <h4 className={`text-sm font-black ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                    Para Llevar / Domicilio
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                    Cocina y barra prepararán en vasos térmicos, charolas y empaques desechables.
                  </p>
                </div>
              </button>
            </div>

            {/* Si seleccionó Para Llevar, configurar empaques */}
            {orderType === 'TAKEAWAY' && (
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 animate-in fade-in ${
                  isLight ? 'bg-emerald-50/70 border-emerald-300' : 'bg-emerald-950/20 border-emerald-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                    <span>📦 Empaques a descontar de inventario:</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    (Vasos y tapas automáticos)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTakeawayPackaging((prev) => ({ ...prev, includeBag: !prev.includeBag }))}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      takeawayPackaging.includeBag
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : isLight ? 'bg-white text-slate-600 border-[#DECEBD]' : 'bg-[#1c1715] text-slate-400 border-[#382b25]'
                    }`}
                  >
                    <span className="text-lg">🛍️</span>
                    <span>{takeawayPackaging.includeBag ? '✓ Bolsa' : 'Sin Bolsa'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTakeawayPackaging((prev) => ({ ...prev, includeTray: !prev.includeTray }))}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      takeawayPackaging.includeTray
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : isLight ? 'bg-white text-slate-600 border-[#DECEBD]' : 'bg-[#1c1715] text-slate-400 border-[#382b25]'
                    }`}
                  >
                    <span className="text-lg">☕</span>
                    <span>{takeawayPackaging.includeTray ? '✓ Portavasos' : 'Sin Portavasos'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTakeawayPackaging((prev) => ({ ...prev, includeCutlery: !prev.includeCutlery }))}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      takeawayPackaging.includeCutlery
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : isLight ? 'bg-white text-slate-600 border-[#DECEBD]' : 'bg-[#1c1715] text-slate-400 border-[#382b25]'
                    }`}
                  >
                    <span className="text-lg">🍴</span>
                    <span>{takeawayPackaging.includeCutlery ? '✓ Cubiertos' : 'Sin Cubiertos'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Botón de Confirmación para empezar a tomar pedido */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#DECEBD] dark:border-[#382b25]">
              <button
                type="button"
                onClick={() => setShowOrderTypeSelectionModal(false)}
                style={{ backgroundColor: themeButton, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all select-none"
              >
                <span>Comenzar a Ordenar {orderType === 'TAKEAWAY' ? '🥡 (Para Llevar)' : '🍽️ (En Mesa)'} →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COBRO RÁPIDO DESDE COMANDERA */}
      {showCheckoutModal && activeTable && activeTable.activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={`w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 my-auto border ${
              isLight
                ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                : 'bg-[#1a1412] border-[#382b25] text-white'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-[#DECEBD]' : 'border-white/10'
            }`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md"
                  style={{ backgroundColor: themeButton }}
                >
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                    Cobrar {activeTable.name}
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                    Folio: {activeTable.activeOrder.orderNumber}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold cursor-pointer transition-colors ${
                  isLight
                    ? 'bg-[#F3E9DC] hover:bg-[#DECEBD] text-[#5E3023]'
                    : 'bg-[#251e1b] hover:bg-[#332924] text-slate-400 hover:text-white'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Resumen del Consumo */}
            <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
              isLight ? 'bg-[#FDFBF9] border-[#DECEBD]' : 'bg-[#14100e] border-[#382b25]'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className={isLight ? 'text-[#7A5A43]' : 'text-slate-400'}>
                  Consumo ({activeTable.activeOrder.items.length} artículos):
                </span>
                <span className={`font-mono text-base font-black ${isLight ? 'text-[#5E3023]' : 'text-[#C08552]'}`}>
                  ${activeTable.activeOrder.total.toFixed(2)} MXN
                </span>
              </div>

              {/* Lista compacta de artículos */}
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 border-t pt-2 border-dashed border-slate-300 dark:border-slate-800">
                {activeTable.activeOrder.items.map((it) => (
                  <div key={it.id} className="flex justify-between items-center text-[11px]">
                    <span className="truncate pr-2">
                      <strong className="font-bold">{it.quantity}x</strong> {it.productName}
                    </span>
                    <span className="font-mono shrink-0 font-medium">${it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selector de Método de Pago */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold block ${isLight ? 'text-[#7A5A43]' : 'text-slate-300'}`}>
                Método de Pago:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCheckoutPaymentMethod('CASH')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    checkoutPaymentMethod === 'CASH'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/40'
                      : isLight
                      ? 'bg-white border-[#DECEBD] text-[#5E3023] hover:bg-[#F3E9DC]'
                      : 'bg-[#1c1715] border-[#382b25] text-slate-300 hover:bg-[#251e1b]'
                  }`}
                >
                  <span className="text-base">💵</span>
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckoutPaymentMethod('CARD')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    checkoutPaymentMethod === 'CARD'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/40'
                      : isLight
                      ? 'bg-white border-[#DECEBD] text-[#5E3023] hover:bg-[#F3E9DC]'
                      : 'bg-[#1c1715] border-[#382b25] text-slate-300 hover:bg-[#251e1b]'
                  }`}
                >
                  <span className="text-base">💳</span>
                  <span>Tarjeta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckoutPaymentMethod('TRANSFER')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    checkoutPaymentMethod === 'TRANSFER'
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md ring-2 ring-violet-400/40'
                      : isLight
                      ? 'bg-white border-[#DECEBD] text-[#5E3023] hover:bg-[#F3E9DC]'
                      : 'bg-[#1c1715] border-[#382b25] text-slate-300 hover:bg-[#251e1b]'
                  }`}
                >
                  <span className="text-base">📱</span>
                  <span>Transferencia</span>
                </button>
              </div>
            </div>

            {/* Si es efectivo: input de monto recibido y cálculo de cambio */}
            {checkoutPaymentMethod === 'CASH' && (
              <div className={`p-3 rounded-2xl border space-y-2 text-xs ${
                isLight ? 'bg-[#FDFBF9] border-[#DECEBD]' : 'bg-[#14100e] border-[#382b25]'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <label className={`font-semibold ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                    Monto Recibido:
                  </label>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      step="any"
                      min={activeTable.activeOrder.total}
                      placeholder={activeTable.activeOrder.total.toFixed(2)}
                      value={checkoutAmountReceived}
                      onChange={(e) => setCheckoutAmountReceived(e.target.value)}
                      className={`w-full pl-6 pr-3 py-1.5 rounded-xl border font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right ${
                        isLight ? 'bg-white border-[#DECEBD] text-[#2B1712]' : 'bg-[#1c1715] border-[#382b25] text-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Cambio */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold">Cambio a Entregar:</span>
                  <strong className={`font-mono text-base font-black ${
                    Number(checkoutAmountReceived || 0) >= activeTable.activeOrder.total
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-500'
                  }`}>
                    ${Math.max(0, (Number(checkoutAmountReceived || activeTable.activeOrder.total) - activeTable.activeOrder.total)).toFixed(2)} MXN
                  </strong>
                </div>
              </div>
            )}

            {/* Checkbox de Imprimir Ticket */}
            <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border border-dashed text-xs cursor-pointer select-none ${
              isLight ? 'border-[#DECEBD] bg-amber-50/50' : 'border-[#382b25] bg-amber-950/20'
            }`}>
              <input
                type="checkbox"
                checked={checkoutPrintTicket}
                onChange={(e) => setCheckoutPrintTicket(e.target.checked)}
                className="w-4 h-4 rounded mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className={`font-bold block ${isLight ? 'text-[#5E3023]' : 'text-amber-200'}`}>
                  🖨️ Imprimir ticket primero antes de registrar cobro
                </span>
                <span className={`text-[10px] block ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                  La impresión no detiene ni bloquea el cobro si la impresora falla o se cancela.
                </span>
              </div>
            </label>

            {/* Botones de Acción */}
            <div className={`pt-3 border-t flex items-center justify-between gap-2 ${
              isLight ? 'border-[#DECEBD]' : 'border-white/10'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setShowCheckoutModal(false)
                  handleOpenPrintBill()
                }}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border flex items-center gap-1.5 ${
                  isLight
                    ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] border-[#DECEBD] text-[#5E3023]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
                title="Ver o imprimir pre-cuenta sin registrar cobro"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Solo Ticket</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                  }`}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleQuickCheckout}
                  disabled={processingCheckout}
                  className="px-4 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all select-none"
                >
                  {processingCheckout ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : checkoutPrintTicket ? (
                    <Printer className="w-4 h-4" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>
                    {checkoutPrintTicket ? 'Imprimir y Cobrar' : 'Cobrar y Liberar'} (${activeTable.activeOrder.total.toFixed(2)})
                  </span>
                </button>
              </div>
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

      {/* MODAL CON ANIMACIÓN DE IMPRESORA TÉRMICA EN TIEMPO REAL */}
      <ThermalTicketPrinterAnimation
        isOpen={showPrintingAnimation}
        ticket={billReceiptData}
        onClose={() => setShowPrintingAnimation(false)}
        onReprint={() => {
          if (billReceiptData) {
            printTicketDocument(billReceiptData)
          }
        }}
      />
    </div>
  )
}

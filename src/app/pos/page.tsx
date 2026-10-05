'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Coffee,
  Package,
  Store,
  LogOut,
  ShoppingCart,
  Tag,
  UtensilsCrossed,
  Users,
  CreditCard,
  Banknote,
  QrCode,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Receipt,
  FileText,
  Lock,
  AlertCircle,
  MonitorPlay,
  BadgePercent,
  Gift,
  KeyRound,
  ShieldCheck,
  X,
  ReceiptText,
  ShieldAlert,
  ArrowRightLeft,
  Laptop,
  Settings,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import {
  getTerminalDeviceConfig,
  saveTerminalDeviceConfig,
  clearTerminalDeviceConfig,
  TerminalDeviceConfig,
} from '@/lib/terminal-device'
import { isLightColor, getStatusBadgeStyles } from '@/lib/theme-utils'
import ProductCustomizerModal, {
  CustomizedItemResult,
  CustomizerProduct,
} from '@/components/product-customizer-modal'

interface Table {
  id: string
  name: string
  capacity: number | null
  status: string
  assignedWaiter?: { id: string; name: string } | null
  currentWaiter?: { id: string; name: string } | null
  activeOrder?: {
    id: string
    orderNumber: string
    customerName: string | null
    subtotal: number
    total: number
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

interface CashSessionData {
  sessionId: string
  registerName: string
  openedBy: string
  openedAt: string
  openingBalance: number
  cashSales: number
  cardSales: number
  transferSales: number
  totalSales: number
  expectedCashInDrawer: number
  ordersCount: number
}

interface ProductVariant {
  id: string
  name: string
  price: number
  cost: number
  inventoryPolicy: string
}

interface Product {
  id: string
  name: string
  code: string
  inventoryPolicy: string
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

interface Category {
  id: string
  name: string
}

interface CartItem {
  cartItemId?: string
  variantId: string
  productName: string
  variantName: string
  unitPrice: number
  quantity: number
  inventoryPolicy: string
  notes?: string
  modifiers?: Array<{
    modifierId: string
    name: string
    unitPrice: number
  }>
}

interface SaleSuccessData {
  orderNumber: string
  total: number
  paymentMethod: string
  inventoryDeductions: Array<{ item: string; deducted: number; unit: string }>
}

export default function PosTerminalPage() {
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [activeBranch, setActiveBranch] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [showPendingTablesModal, setShowPendingTablesModal] = useState(false)
  const [customizingProduct, setCustomizingProduct] = useState<CustomizerProduct | null>(null)
  const [showCustomizerModal, setShowCustomizerModal] = useState(false)

  // Terminal Lock / Fast Shift Change states
  const [isTerminalLocked, setIsTerminalLocked] = useState(false)
  const [unlockPin, setUnlockPin] = useState('')
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [welcomeOverlayUser, setWelcomeOverlayUser] = useState<any>(null)

  // Terminal Device / Branch Binding State
  const [terminalDevice, setTerminalDevice] = useState<TerminalDeviceConfig | null>(null)
  const [showDeviceConfigModal, setShowDeviceConfigModal] = useState(false)
  const [deviceTerminalNameInput, setDeviceTerminalNameInput] = useState('')

  // Cargar configuración de dispositivo fijo al montar
  useEffect(() => {
    const config = getTerminalDeviceConfig()
    if (config) {
      setTerminalDevice(config)
      setDeviceTerminalNameInput(config.terminalName)
    }
  }, [])

  // Escucha de teclado físico (0-9, Backspace, Esc, Enter) para usuarios de escritorio
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

  const handleSaveDeviceBinding = () => {
    if (!activeBranch) {
      notify.error('Error', 'No hay una sucursal activa seleccionada')
      return
    }
    const config: TerminalDeviceConfig = {
      branchId: activeBranch.id,
      branchName: activeBranch.name,
      terminalName: deviceTerminalNameInput.trim() || 'Caja Principal',
      isFixedTerminal: true,
      configuredAt: new Date().toISOString(),
    }
    saveTerminalDeviceConfig(config)
    setTerminalDevice(config)
    setShowDeviceConfigModal(false)
    notify.success('Dispositivo Vinculado', `Este equipo ha quedado fijado como ${config.terminalName} para ${activeBranch.name}`)
  }

  const handleUnbindDevice = () => {
    clearTerminalDeviceConfig()
    setTerminalDevice(null)
    setDeviceTerminalNameInput('')
    setShowDeviceConfigModal(false)
    notify.info('Dispositivo Liberado', 'Este equipo ya no está fijado a una sucursal.')
  }

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
        setUnlockError(json.error?.message || 'PIN inválido para esta sucursal')
        setUnlockPin('')
        return
      }

      const newUser = json.data.user
      setSessionUser((prev: any) => ({
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

  // Cart / Order state
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN')
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')

  // Descuentos y Cortesías
  const [discount, setDiscount] = useState<{ amount: number; percentage?: number; reason: string; approvedBy?: string } | null>(null)
  const [courtesy, setCourtesy] = useState<{ amount: number; isFull: boolean; reason: string; beneficiary?: string; approvedBy?: string } | null>(null)

  // Modales de Descuento, Cortesía y PIN
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showCourtesyModal, setShowCourtesyModal] = useState(false)
  const [showPinAuthModal, setShowPinAuthModal] = useState(false)
  const [authActionPending, setAuthActionPending] = useState<'discount' | 'courtesy' | null>(null)
  const [authPin, setAuthPin] = useState('')
  const [verifyingPin, setVerifyingPin] = useState(false)

  // Formulario Descuento
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE')
  const [discountVal, setDiscountVal] = useState('')
  const [discountReason, setDiscountReason] = useState('')

  // Formulario Cortesía
  const [courtesyIsFull, setCourtesyIsFull] = useState(true)
  const [courtesyAmountVal, setCourtesyAmountVal] = useState('')
  const [courtesyReason, setCourtesyReason] = useState('')
  const [courtesyBeneficiary, setCourtesyBeneficiary] = useState('')

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD_DEBIT' | 'CARD_CREDIT' | 'TRANSFER'>('CASH')
  const [amountReceived, setAmountReceived] = useState<string>('')
  const [processingSale, setProcessingSale] = useState(false)
  const [takeawayPackaging, setTakeawayPackaging] = useState({
    includeBag: true,
    includeTray: true,
    includeCutlery: false,
  })

  // Success Modal State
  const [saleSuccess, setSaleSuccess] = useState<SaleSuccessData | null>(null)

  // Cash Session / Cut Modal States
  const [showCutModal, setShowCutModal] = useState(false)
  const [cashSession, setCashSession] = useState<CashSessionData | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)
  const [countedCash, setCountedCash] = useState<string>('')
  const [cutNotes, setCutNotes] = useState<string>('')
  const [submittingCut, setSubmittingCut] = useState(false)
  const [cutReceipt, setCutReceipt] = useState<any | null>(null)

  const openCashCutModal = async () => {
    setError(null)
    setLoadingSession(true)
    setShowCutModal(true)
    try {
      const res = await fetch('/api/pos/cash-session/current').then((r) => r.json())
      if (res.success && res.data) {
        setCashSession(res.data)
        setCountedCash(res.data.expectedCashInDrawer.toString())
      } else {
        setCashSession(null)
      }
    } catch {
      setError('Error al consultar balance de caja')
    } finally {
      setLoadingSession(false)
    }
  }

  const handleConfirmCloseSession = async () => {
    setSubmittingCut(true)
    setError(null)
    try {
      const res = await fetch('/api/pos/cash-session/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closingBalance: Number(countedCash) || 0,
          notes: cutNotes,
          logoutAfter: false,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowCutModal(false)
        setCutReceipt(json.data)
      } else {
        setError(json.error?.message || 'Error al cerrar caja')
      }
    } catch {
      setError('Error de comunicación con el servidor')
    } finally {
      setSubmittingCut(false)
    }
  }

  // Refrescar mesas y comandas activas
  const refreshTablesData = async () => {
    try {
      const resTables = await fetch('/api/comandas/tables').then((r) => r.json())
      if (resTables.success && resTables.data) {
        const allTables: Table[] = [
          ...resTables.data.areas.flatMap((a: any) => a.tables || []),
          ...(resTables.data.unassignedTables || []),
        ]
        setTables(allTables)
      }
    } catch {
      // Ignorar errores silenciosos
    }
  }

  // Cargar datos iniciales del POS
  const loadPosData = async () => {
    try {
      setLoading(true)
      const [resMe, resCat, resProd] = await Promise.all([
        fetch('/api/auth/me').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
      ])

      if (resMe.success) {
        const user = resMe.data.user
        setSessionUser(user)
        setActiveBranch(user.activeBranch)

        // Validar permisos: Mesero estricto no puede operar terminal de caja
        const isOwnerOrAdmin =
          user.roleCodes?.includes('ADMIN') ||
          user.roleCodes?.includes('SUPERADMIN') ||
          user.roleCodes?.includes('BRANCH_MANAGER')

        const isStrictWaiter =
          !isOwnerOrAdmin &&
          !Boolean(user.permissions?.canAccessPOS) &&
          !Boolean(user.permissions?.canManageCashRegisters) &&
          !user.roleCodes?.includes('CASHIER')

        if (isStrictWaiter) {
          setAccessDenied(true)
          notify.warning('Terminal de Cobro', 'Los meseros operan desde la Comandera. Redirigiendo...')
          setTimeout(() => {
            window.location.href = '/comandera'
          }, 2200)
          return
        }

        // Cargar mesas con comandas activas desde el motor de comandas
        const resTables = await fetch('/api/comandas/tables').then((r) => r.json())
        if (resTables.success && resTables.data) {
          const allTables: Table[] = [
            ...resTables.data.areas.flatMap((a: any) => a.tables || []),
            ...(resTables.data.unassignedTables || []),
          ]
          setTables(allTables)
          if (allTables.length > 0) setSelectedTableId(allTables[0].id)
        }
      } else {
        window.location.href = '/login'
        return
      }

      if (resCat.success) setCategories(resCat.data)
      if (resProd.success) setProducts(resProd.data)
    } catch {
      setError('Error al sincronizar datos de la terminal POS')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosData()
    // Sondeo de mesas cada 6 segundos para detectar pre-cuentas de meseros
    const interval = setInterval(refreshTablesData, 6000)

    // Sincronización instantánea al volver a la pantalla/pestaña
    const handleFocus = () => refreshTablesData()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshTablesData()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
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

  // Cargar comanda marchada de mesa en el carrito de cobro
  const handleLoadTableOrder = (table: Table) => {
    if (!table.activeOrder || table.activeOrder.items.length === 0) {
      notify.warning('Mesa sin consumos', `La mesa ${table.name} no tiene platillos marchados.`)
      return
    }

    const loadedCart: CartItem[] = table.activeOrder.items.map((it) => {
      // Buscar la variante real en los productos cargados
      let matchedPolicy = 'NONE'
      let matchedVariantId = it.id

      for (const p of products) {
        const v = p.variants.find((vr) => vr.name === it.variantName || p.name === it.productName)
        if (v) {
          matchedPolicy = p.inventoryPolicy
          matchedVariantId = v.id
          break
        }
      }

      return {
        variantId: matchedVariantId,
        productName: it.productName,
        variantName: it.variantName,
        unitPrice: Number(it.unitPrice),
        quantity: Number(it.quantity),
        inventoryPolicy: matchedPolicy,
        notes: it.notes || '',
      }
    })

    setCart(loadedCart)
    setSelectedTableId(table.id)
    setOrderType('DINE_IN')
    setCustomerName(table.activeOrder.customerName || '')
    setShowPendingTablesModal(false)

    notify.success(
      'Comanda Cargada',
      `Mesa ${table.name} (${table.activeOrder.orderNumber}) lista para cobrar en caja.`
    )
  }

  // Agregar al carrito (abre personalizador si tiene variantes o modificadores)
  const addToCart = (product: Product) => {
    const hasMultipleVariants = product.variants && product.variants.length > 1
    const hasModifierGroups = product.modifierGroups && product.modifierGroups.length > 0

    if (hasMultipleVariants || hasModifierGroups) {
      setCustomizingProduct(product as any)
      setShowCustomizerModal(true)
      return
    }

    const variant = product.variants[0]
    if (!variant) return

    setCart((prev) => {
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
          cartItemId: `${variant.id}_${Date.now()}`,
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name,
          unitPrice: Number(variant.price),
          quantity: 1,
          inventoryPolicy: product.inventoryPolicy,
          modifiers: [],
          notes: '',
        },
      ]
    })
  }

  // Callback al confirmar personalización
  const handleConfirmCustomization = (result: CustomizedItemResult) => {
    if (!customizingProduct) return

    setCart((prev) => [
      ...prev,
      {
        cartItemId: `${result.variantId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        variantId: result.variantId,
        productName: customizingProduct.name,
        variantName: result.variantName,
        unitPrice: result.unitPrice,
        quantity: result.quantity,
        inventoryPolicy: (customizingProduct as any).inventoryPolicy || 'RECIPE',
        notes: result.notes,
        modifiers: result.modifiers,
      },
    ])
  }

  // Modificar cantidad (soporta cartItemId o variantId)
  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.cartItemId === id || it.variantId === id) {
            const newQty = it.quantity + delta
            return newQty > 0 ? { ...it, quantity: newQty } : null
          }
          return it
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const clearCart = (notifyUser = false) => {
    setCart([])
    setCustomerName('')
    setDiscount(null)
    setCourtesy(null)
    if (notifyUser) {
      notify.info('Ticket vaciado', 'Se eliminaron los productos de la orden en curso.')
    }
  }

  // Totales, Descuento y Cortesía
  const subtotal = cart.reduce((acc, curr) => acc + curr.unitPrice * curr.quantity, 0)
  const discountAmount = discount ? discount.amount : 0
  const courtesyAmount = courtesy ? courtesy.amount : 0
  const total = Math.max(0, subtotal - discountAmount - courtesyAmount)
  const receivedNum = Number(amountReceived) || 0
  const changeDue = receivedNum >= total ? receivedNum - total : 0

  // Solicitar Descuento
  const handleRequestDiscount = () => {
    if (cart.length === 0) {
      notify.warning('Ticket vacío', 'Agrega productos antes de aplicar un descuento')
      return
    }
    if (sessionUser?.permissions?.canAuthorizeDiscounts) {
      setDiscountVal('10')
      setDiscountType('PERCENTAGE')
      setDiscountReason('Descuento comercial / promoción')
      setShowDiscountModal(true)
    } else {
      setAuthActionPending('discount')
      setAuthPin('')
      setShowPinAuthModal(true)
    }
  }

  // Solicitar Cortesía / Sin Cobro
  const handleRequestCourtesy = () => {
    if (cart.length === 0) {
      notify.warning('Ticket vacío', 'Agrega productos antes de aplicar una cortesía')
      return
    }
    if (sessionUser?.permissions?.canAuthorizeCourtesies) {
      setCourtesyIsFull(true)
      setCourtesyAmountVal(subtotal.toString())
      setCourtesyReason('Cortesía de la casa / Invitación')
      setCourtesyBeneficiary(customerName || '')
      setShowCourtesyModal(true)
    } else {
      setAuthActionPending('courtesy')
      setAuthPin('')
      setShowPinAuthModal(true)
    }
  }

  // Validar PIN de Autorización
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authPin || authPin.length !== 4) {
      notify.warning('PIN requerido', 'Ingresa los 4 dígitos del PIN')
      return
    }
    setVerifyingPin(true)
    try {
      const res = await fetch('/api/auth/authorize-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: authPin,
          requiredPermission:
            authActionPending === 'discount'
              ? 'canAuthorizeDiscounts'
              : 'canAuthorizeCourtesies',
        }),
      })
      const json = await res.json()
      if (json.success) {
        notify.success('Acción autorizada', json.message)
        setShowPinAuthModal(false)
        if (authActionPending === 'discount') {
          setDiscountVal('10')
          setDiscountType('PERCENTAGE')
          setDiscountReason(`Autorizado por ${json.data.name}`)
          setShowDiscountModal(true)
        } else if (authActionPending === 'courtesy') {
          setCourtesyIsFull(true)
          setCourtesyAmountVal(subtotal.toString())
          setCourtesyReason(`Autorizado por ${json.data.name}`)
          setCourtesyBeneficiary(customerName || '')
          setShowCourtesyModal(true)
        }
      } else {
        notify.error('No autorizado', json.error?.message || 'PIN inválido o sin permisos')
      }
    } catch {
      notify.error('Error', 'No fue posible validar el PIN')
    } finally {
      setVerifyingPin(false)
    }
  }

  // Aplicar Descuento
  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault()
    const val = Number(discountVal)
    if (isNaN(val) || val <= 0) {
      notify.warning('Monto inválido', 'Ingresa un valor mayor a cero')
      return
    }

    let calculatedAmount = 0
    if (discountType === 'PERCENTAGE') {
      if (val > 100) {
        notify.warning('Porcentaje inválido', 'El porcentaje no puede ser superior al 100%')
        return
      }
      calculatedAmount = (subtotal * val) / 100
    } else {
      if (val > subtotal) {
        notify.warning('Monto excedido', 'El descuento no puede superar el subtotal')
        return
      }
      calculatedAmount = val
    }

    setDiscount({
      amount: calculatedAmount,
      percentage: discountType === 'PERCENTAGE' ? val : undefined,
      reason: discountReason.trim() || 'Descuento autorizado',
      approvedBy: sessionUser?.name || 'Supervisor',
    })

    setShowDiscountModal(false)
    notify.success('Descuento aplicado', `Se descontaron $${calculatedAmount.toFixed(2)} MXN`)
  }

  // Aplicar Cortesía
  const handleApplyCourtesy = (e: React.FormEvent) => {
    e.preventDefault()
    let calculatedAmount = subtotal
    if (!courtesyIsFull) {
      const val = Number(courtesyAmountVal)
      if (isNaN(val) || val <= 0 || val > subtotal) {
        notify.warning('Monto inválido', 'Ingresa un monto válido dentro del subtotal')
        return
      }
      calculatedAmount = val
    }

    setCourtesy({
      amount: calculatedAmount,
      isFull: courtesyIsFull,
      reason: courtesyReason.trim() || 'Cortesía de la casa / Sin cobro',
      beneficiary: courtesyBeneficiary.trim() || undefined,
      approvedBy: sessionUser?.name || 'Supervisor',
    })

    setShowCourtesyModal(false)
    notify.success(
      courtesyIsFull ? 'Cuenta sin cobro' : 'Cortesía parcial',
      `Se aplicó cortesía por $${calculatedAmount.toFixed(2)} MXN`
    )
  }

  // Procesar Cobro
  const handleConfirmPayment = async () => {
    if (cart.length === 0) return
    setError(null)
    setProcessingSale(true)

    try {
      const payload = {
        tableId: orderType === 'DINE_IN' ? selectedTableId : null,
        orderType,
        customerName,
        items: cart.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          notes: it.notes || '',
          modifiers: it.modifiers?.map((m) => ({
            modifierId: m.modifierId,
            unitPrice: m.unitPrice,
          })) || [],
        })),
        paymentMethod: total === 0 ? 'OTHER' : paymentMethod,
        amountReceived: total === 0 ? 0 : paymentMethod === 'CASH' ? receivedNum : total,
        discount: discount ? { amount: discount.amount, reason: discount.reason, approvedBy: discount.approvedBy } : undefined,
        courtesy: courtesy ? { amount: courtesy.amount, reason: courtesy.reason, beneficiary: courtesy.beneficiary, approvedBy: courtesy.approvedBy } : undefined,
        takeawayPackaging: orderType !== 'DINE_IN' ? takeawayPackaging : undefined,
      }

      const res = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (json.success) {
        setShowCheckoutModal(false)
        setSaleSuccess(json.data)
        clearCart(false)
        notify.success(
          total === 0 ? 'Cortesía emitida' : 'Cobro completado',
          total === 0
            ? `Cuenta registrada como cortesía ($0.00) ticket #${json.data.orderNumber}`
            : `Venta registrada por $${total.toFixed(2)} MXN con ticket #${json.data.orderNumber}`
        )
      } else {
        const errMsg = json.error?.message || 'Error al procesar cobro'
        setError(errMsg)
        notify.error('Error en cobro', errMsg)
      }
    } catch {
      setError('Error de comunicación con el servidor')
      notify.error('Error de conexión', 'No fue posible registrar el cobro')
    } finally {
      setProcessingSale(false)
    }
  }

  // Filtrado de productos por categoría
  const filteredProducts =
    selectedCategory === 'ALL'
      ? products
      : products.filter((p) => p.category?.id === selectedCategory)

  if (accessDenied) {
    return (
      <div className="h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Terminal de Cobro Exclusiva de Caja</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Los meseros toman pedidos y marchan comandas desde la Comandera de Piso. El cobro y manejo de dinero en caja registradora está reservado para el personal de caja.
        </p>
        <Link
          href="/comandera"
          className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Ir a Comandera de Mesas</span>
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs">Iniciando Terminal POS...</p>
      </div>
    )
  }

  const themeBg = activeBranch?.bgColor || '#14100E'
  const themePrimary = activeBranch?.primaryColor || '#C08552'
  const themeSecondary = activeBranch?.secondaryColor || '#5E3023'
  const themeButton = activeBranch?.buttonColor || '#C08552'
  const isLight = isLightColor(themeBg)
  const isLightButton = isLightColor(themeButton)

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden selection:bg-[#C08552] selection:text-white relative ${
        isLight ? 'text-[#2B1712]' : 'text-slate-100'
      }`}
      style={{ backgroundColor: themeBg }}
    >
      {/* Resplandores cálidos de ambiente con colores de la BD */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{ backgroundColor: themePrimary, opacity: isLight ? 0.08 : 0.12 }}
        />
        <div
          className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full blur-[130px]"
          style={{ backgroundColor: themeSecondary, opacity: isLight ? 0.06 : 0.1 }}
        />
      </div>

      {/* Top Header */}
      <header
        className="border-b px-4 py-2.5 flex items-center justify-between shrink-0 z-20 backdrop-blur-md shadow-sm"
        style={{
          backgroundColor: isLight ? '#FFFFFFE6' : `${themeBg}F2`,
          borderColor: isLight ? '#DECEBD' : `${themeSecondary}60`,
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1 cursor-pointer"
            style={
              isLight
                ? {
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DECEBD',
                    color: '#5E3023',
                  }
                : {
                    backgroundColor: `${themeSecondary}40`,
                    borderColor: `${themeSecondary}70`,
                    color: '#DECEBD',
                  }
            }
            title="Volver al Dashboard"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: themePrimary }} />
          </Link>

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
            <h1 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              <span>Terminal POS</span>
              {activeBranch && sessionUser?.branches && sessionUser.branches.length > 1 && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full border hidden sm:inline-block"
                  style={{
                    backgroundColor: `${themePrimary}${isLight ? '15' : '20'}`,
                    borderColor: `${themePrimary}${isLight ? '35' : '40'}`,
                    color: isLight ? '#5E3023' : themePrimary,
                  }}
                >
                  {activeBranch.name} ({activeBranch.code})
                </span>
              )}
            </h1>
          </div>

          {/* Badge / Botón de Fijación de Terminal */}
          <button
            type="button"
            onClick={() => setShowDeviceConfigModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              terminalDevice
                ? isLight
                  ? 'bg-amber-100 text-amber-950 border border-amber-300'
                  : 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : isLight
                ? 'bg-white hover:bg-[#F3E9DC] text-[#5E3023] border border-[#DECEBD]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
            title="Configurar este equipo como terminal fija de la sucursal"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {terminalDevice ? terminalDevice.terminalName : 'Fijar Dispositivo'}
            </span>
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span
              className={`text-xs font-semibold block ${
                isLight ? 'text-[#2B1712]' : 'text-slate-200'
              }`}
            >
              {sessionUser?.name}
            </span>
            <span
              className={`text-[10px] font-mono ${
                isLight ? 'text-[#895737]' : 'text-slate-400'
              }`}
            >
              Rol: {sessionUser?.roleCodes?.join(', ')}
            </span>
          </div>

          {/* Enlace Comandera */}
          <Link
            href="/comandera"
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isLight
                ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] border-[#DECEBD] text-[#5E3023]'
                : 'bg-violet-600/15 hover:bg-violet-600/25 border-violet-500/30 text-violet-300'
            }`}
            title="Abrir Comandera de Meseros"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Mesas</span>
          </Link>

          {/* Enlace KDS Cocina */}
          <Link
            href="/kds"
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isLight
                ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] border-[#DECEBD] text-[#5E3023]'
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-300'
            }`}
            title="Abrir Monitor KDS Cocina"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>KDS</span>
          </Link>

          {/* Botón de Arqueo / Cierre de Turno */}
          <button
            type="button"
            onClick={openCashCutModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isLight
                ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] border-[#DECEBD] text-[#5E3023]'
                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Arqueo / Corte</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setUnlockPin('')
              setUnlockError(null)
              setIsTerminalLocked(true)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer font-semibold ${
              isLight
                ? 'bg-white hover:bg-[#F3E9DC] border-[#DECEBD] text-[#5E3023]'
                : 'bg-[#2B1712] hover:bg-[#C08552]/20 border-[#42221A] hover:border-[#C08552]/40 text-[#DECEBD] hover:text-[#F3E9DC]'
            }`}
            title="Bloquear terminal o cambiar operador de turno"
          >
            <Lock className="w-3.5 h-3.5 text-[#C08552]" />
            <span>Bloquear / Relevo</span>
          </button>
        </div>
      </header>

      {/* Main Terminal Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Categories & Products Grid */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          {/* Order Type & Table Selector */}
          <div
            className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
              isLight
                ? 'bg-white border-[#DECEBD] shadow-xs'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            {/* Toggle DINE_IN vs TAKEAWAY */}
            <div
              className={`flex p-1 rounded-xl border text-xs ${
                isLight ? 'bg-[#F3E9DC] border-[#DECEBD]' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                style={
                  orderType === 'DINE_IN'
                    ? { backgroundColor: themePrimary, color: '#ffffff' }
                    : undefined
                }
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  orderType === 'DINE_IN'
                    ? 'shadow-xs font-bold'
                    : isLight
                    ? 'text-[#7A5A43] hover:text-[#2B1712]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🍽️ En Mesa (Comedor)
              </button>
              <button
                type="button"
                onClick={() => setOrderType('TAKEAWAY')}
                style={
                  orderType === 'TAKEAWAY'
                    ? { backgroundColor: themeSecondary, color: '#ffffff' }
                    : undefined
                }
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  orderType === 'TAKEAWAY'
                    ? 'shadow-xs font-bold'
                    : isLight
                    ? 'text-[#7A5A43] hover:text-[#2B1712]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🛍️ Para Llevar
              </button>

              {/* Botón Comandas de Mesas por Cobrar */}
              <button
                type="button"
                onClick={() => {
                  refreshTablesData()
                  setShowPendingTablesModal(true)
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                  isLight
                    ? 'bg-amber-100 hover:bg-amber-200/80 border-amber-300 text-amber-950'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                }`}
                title="Cargar consumos y comandas marchadas por meseros"
              >
                <ReceiptText className="w-3.5 h-3.5" style={{ color: isLight ? '#5E3023' : themePrimary }} />
                <span>Comandas por Cobrar</span>
                {tables.filter((t) => !!t.activeOrder).length > 0 && (
                  <span
                    className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center animate-pulse"
                    style={{ backgroundColor: themePrimary }}
                  >
                    {tables.filter((t) => !!t.activeOrder).length}
                  </span>
                )}
              </button>
            </div>

            {/* Mesas selector if DINE_IN */}
            {orderType === 'DINE_IN' && tables.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                <span
                  className={`text-[11px] font-semibold shrink-0 ${
                    isLight ? 'text-[#7A5A43]' : 'text-slate-400'
                  }`}
                >
                  Mesa:
                </span>
                {tables.map((t) => {
                  const hasBill = t.status === 'BILL_PRINTED'
                  const hasOrder = !!t.activeOrder
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTableId(t.id)}
                      style={
                        selectedTableId === t.id
                          ? { backgroundColor: themePrimary, color: '#ffffff' }
                          : undefined
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1 cursor-pointer border ${
                        selectedTableId === t.id
                          ? 'border-transparent shadow-xs font-bold'
                          : hasBill
                          ? isLight
                            ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold'
                            : 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          : hasOrder
                          ? isLight
                            ? 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
                            : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                          : isLight
                          ? 'bg-white border-[#DECEBD] text-[#5E3023] hover:bg-[#F3E9DC]'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                      title={
                        hasBill
                          ? `${t.name}: Pre-cuenta impresa - Lista para cobro`
                          : hasOrder
                          ? `${t.name}: Consumo activo en mesa`
                          : `${t.name}: Mesa libre`
                      }
                    >
                      {hasBill && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      )}
                      <span>{t.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Categories Selector Bar */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold shrink-0 transition-all cursor-pointer border ${
                selectedCategory === 'ALL'
                  ? isLight
                    ? 'bg-[#5E3023] border-[#5E3023] text-white font-bold shadow-xs'
                    : 'bg-white border-white text-slate-950 font-bold shadow-sm'
                  : isLight
                  ? 'bg-white border-[#DECEBD] text-[#5E3023] hover:bg-[#F3E9DC]'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Todos los productos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                style={
                  selectedCategory === c.id
                    ? { backgroundColor: themePrimary, color: '#ffffff', borderColor: themePrimary }
                    : undefined
                }
                className={`px-3.5 py-1.5 rounded-xl font-semibold shrink-0 transition-all cursor-pointer border ${
                  selectedCategory === c.id
                    ? 'font-bold shadow-md'
                    : isLight
                    ? 'bg-white border-[#DECEBD] text-[#5E3023] hover:bg-[#F3E9DC]'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const variant = p.variants[0]
              const price = variant ? Number(variant.price) : 0

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between h-32 shadow-xs group ${
                    isLight
                      ? 'bg-white hover:bg-[#FDFBF9] border-[#DECEBD] hover:border-[#C08552]'
                      : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        className={`font-mono px-1.5 py-0.5 rounded font-semibold ${
                          isLight
                            ? 'bg-[#F3E9DC] text-[#7A5A43]'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {p.inventoryPolicy === 'RECIPE' ? 'RECETA' : p.inventoryPolicy}
                      </span>
                    </div>
                    <h4
                      className={`text-sm font-bold mt-1.5 line-clamp-2 leading-tight ${
                        isLight ? 'text-[#2B1712]' : 'text-white'
                      }`}
                    >
                      {p.name}
                    </h4>
                  </div>

                  <div
                    className={`flex items-center justify-between pt-2 border-t ${
                      isLight ? 'border-[#DECEBD]' : 'border-slate-800/80'
                    }`}
                  >
                    <span
                      className={`text-sm font-extrabold ${
                        isLight ? 'text-[#5E3023]' : 'text-amber-400'
                      }`}
                    >
                      ${price.toFixed(2)}
                    </span>
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                        isLight
                          ? 'bg-[#F3E9DC] text-[#5E3023] group-hover:bg-[#5E3023] group-hover:text-white'
                          : 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-black'
                      }`}
                    >
                      +
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Ticket Sidebar */}
        <div
          className={`w-80 sm:w-96 border-l flex flex-col h-full shrink-0 ${
            isLight ? 'border-[#DECEBD] bg-white' : 'border-slate-800 bg-slate-900/90'
          }`}
        >
          {/* Ticket Header */}
          <div
            className={`p-4 border-b flex items-center justify-between ${
              isLight ? 'border-[#DECEBD]' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" style={{ color: themePrimary }} />
              <span className={`font-bold text-sm ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                Ticket de Venta
              </span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => clearCart(true)}
                className={`text-[11px] font-semibold cursor-pointer ${
                  isLight ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'
                }`}
              >
                Vaciar
              </button>
            )}
          </div>

          {/* Customer / Note input */}
          <div
            className={`p-3 border-b ${
              isLight ? 'border-[#DECEBD] bg-[#FAF6F0]' : 'border-slate-800/80 bg-slate-950/40'
            }`}
          >
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente o nota..."
              className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 ${
                isLight
                  ? 'bg-white border-[#DECEBD] text-[#2B1712] placeholder-[#A88C7D] focus:ring-[#C08552]'
                  : 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:ring-amber-500'
              }`}
            />
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {cart.length === 0 ? (
              <div
                className={`h-full flex flex-col items-center justify-center text-xs text-center space-y-2 p-4 ${
                  isLight ? 'text-[#895737]' : 'text-slate-500'
                }`}
              >
                <UtensilsCrossed
                  className={`w-8 h-8 ${isLight ? 'text-[#DECEBD]' : 'text-slate-600'}`}
                />
                <p>Toca los productos de la izquierda para agregarlos a la comanda.</p>
              </div>
            ) : (
              cart.map((item) => {
                const itemKey = item.cartItemId || item.variantId
                const isAllergy = item.notes && (item.notes.includes('ALERGIA') || item.notes.includes('ALÉRGICO'))

                return (
                  <div
                    key={itemKey}
                    className={`p-2.5 rounded-xl border flex flex-col space-y-1.5 text-xs transition-colors ${
                      isAllergy
                        ? 'bg-rose-500/10 border-rose-500 shadow-rose-500/10'
                        : isLight
                        ? 'bg-[#FDFBF9] border-[#DECEBD]'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 pr-2 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-bold block truncate ${
                              isLight ? 'text-[#2B1712]' : 'text-white'
                            }`}
                          >
                            {item.productName}
                          </span>
                          {item.variantName && item.variantName !== 'Regular' && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                isLight
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {item.variantName}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-medium ${
                            isLight ? 'text-[#7A5A43]' : 'text-slate-400'
                          }`}
                        >
                          ${item.unitPrice.toFixed(2)} c/u
                        </span>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemKey, -1)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold cursor-pointer transition-colors ${
                            isLight
                              ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] text-[#5E3023]'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span
                          className={`w-6 text-center font-bold text-xs ${
                            isLight ? 'text-[#2B1712]' : 'text-white'
                          }`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemKey, 1)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold cursor-pointer transition-colors ${
                            isLight
                              ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] text-[#5E3023]'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div
                        className={`w-16 text-right font-extrabold shrink-0 ${
                          isLight ? 'text-[#5E3023]' : 'text-amber-400'
                        }`}
                      >
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    {/* Modificadores / Sabores */}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {item.modifiers.map((m, idx) => (
                          <span
                            key={idx}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
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

                    {/* Alerta de Alergia o Notas */}
                    {item.notes && (
                      <div className="pt-0.5">
                        {isAllergy ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 font-bold block animate-pulse">
                            {item.notes}
                          </span>
                        ) : (
                          <span className={`text-[10px] italic block ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                            Nota: {item.notes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Ticket Footer / Checkout Action */}
          <div
            className={`p-4 border-t space-y-3 shrink-0 ${
              isLight ? 'border-[#DECEBD] bg-[#FAF6F0]' : 'border-slate-800 bg-slate-950'
            }`}
          >
            {/* Botones de Descuento y Cortesía */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRequestDiscount}
                disabled={cart.length === 0}
                className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  discount
                    ? isLight
                      ? 'border-amber-400 bg-amber-100 text-amber-950 font-bold'
                      : 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : isLight
                    ? 'border-[#DECEBD] bg-white hover:bg-[#F3E9DC] text-[#5E3023]'
                    : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <BadgePercent className="w-3.5 h-3.5 text-amber-500" />
                <span>{discount ? 'Editar Desc.' : 'Descuento'}</span>
              </button>

              <button
                type="button"
                onClick={handleRequestCourtesy}
                disabled={cart.length === 0}
                className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  courtesy
                    ? isLight
                      ? 'border-emerald-400 bg-emerald-100 text-emerald-950 font-bold'
                      : 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : isLight
                    ? 'border-[#DECEBD] bg-white hover:bg-[#F3E9DC] text-[#5E3023]'
                    : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Gift className="w-3.5 h-3.5 text-emerald-500" />
                <span>{courtesy ? 'Editar Cort.' : 'Sin Cobro'}</span>
              </button>
            </div>

            {/* Desglose de totales */}
            <div className="space-y-1 text-xs">
              <div
                className={`flex justify-between ${
                  isLight ? 'text-[#7A5A43] font-medium' : 'text-slate-400'
                }`}
              >
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              {discount && (
                <div
                  className={`flex items-center justify-between text-xs font-semibold ${
                    isLight ? 'text-amber-950' : 'text-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>Descuento {discount.percentage ? `(${discount.percentage}%)` : ''}</span>
                    <button
                      type="button"
                      onClick={() => setDiscount(null)}
                      className={`text-[10px] p-0.5 cursor-pointer ${
                        isLight ? 'text-[#895737] hover:text-rose-600' : 'text-slate-500 hover:text-rose-400'
                      }`}
                      title="Quitar descuento"
                    >
                      ✕
                    </button>
                  </div>
                  <span>-${discount.amount.toFixed(2)}</span>
                </div>
              )}

              {courtesy && (
                <div
                  className={`flex items-center justify-between text-xs font-semibold ${
                    isLight ? 'text-emerald-950' : 'text-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>Cortesía {courtesy.isFull ? '(100%)' : ''}</span>
                    <button
                      type="button"
                      onClick={() => setCourtesy(null)}
                      className={`text-[10px] p-0.5 cursor-pointer ${
                        isLight ? 'text-[#895737] hover:text-rose-600' : 'text-slate-500 hover:text-rose-400'
                      }`}
                      title="Quitar cortesía"
                    >
                      ✕
                    </button>
                  </div>
                  <span>-${courtesy.amount.toFixed(2)}</span>
                </div>
              )}

              <div
                className={`flex justify-between text-base font-bold pt-2 border-t ${
                  isLight ? 'border-[#DECEBD] text-[#2B1712]' : 'border-slate-800 text-white'
                }`}
              >
                <span>Total a Cobrar</span>
                <span
                  className="font-extrabold"
                  style={{
                    color: total === 0 ? (isLight ? '#065F46' : '#10b981') : (isLight ? '#5E3023' : themePrimary),
                  }}
                >
                  ${total.toFixed(2)} MXN
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setAmountReceived(total.toString())
                setShowCheckoutModal(true)
              }}
              disabled={cart.length === 0}
              style={{
                backgroundColor: total === 0 ? '#059669' : themeButton,
                color: total === 0 ? '#ffffff' : (isLightButton ? '#2B1712' : '#ffffff'),
                ...(total > 0 ? { boxShadow: `0 4px 14px ${themeButton}40` } : {}),
              }}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {total === 0 ? (
                <>
                  <Gift className="w-4 h-4" />
                  <span>Emitir Ticket sin Cobro ($0.00)</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Cobrar ${total.toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE COBRO / PAGO */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 border ${
              isLight
                ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isLight ? 'border-[#DECEBD]' : 'border-slate-800'
              }`}
            >
              <h3
                className={`text-base font-bold flex items-center gap-2 ${
                  isLight ? 'text-[#2B1712]' : 'text-white'
                }`}
              >
                <Receipt className="w-5 h-5 text-amber-500" /> Confirmar Cobro
              </h3>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className={`text-lg cursor-pointer ${
                  isLight ? 'text-[#895737] hover:text-[#5E3023]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Total Display */}
            <div
              className={`text-center py-2.5 rounded-2xl border ${
                isLight
                  ? 'bg-[#FAF6F0] border-[#DECEBD]'
                  : 'bg-slate-950 border-slate-850'
              }`}
            >
              <span className={`text-xs ${isLight ? 'text-[#7A5A43] font-medium' : 'text-slate-400'}`}>
                Monto Total
              </span>
              <p
                className={`text-3xl font-black ${
                  isLight ? 'text-[#5E3023]' : 'text-amber-400'
                }`}
              >
                ${total.toFixed(2)} MXN
              </p>
            </div>

            {/* Selector de empaques para llevar (cuando no es consumo en sucursal) */}
            {orderType !== 'DINE_IN' && (
              <div
                className={`p-3 rounded-2xl border space-y-2 text-xs ${
                  isLight ? 'bg-[#FAF6F0] border-[#DECEBD]' : 'bg-slate-950 border-slate-850'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-[#5E3023]' : 'text-amber-400'}`}>
                    <Package className="w-3.5 h-3.5" /> Empaques Desechables (Para llevar)
                  </span>
                  <span className={`text-[10px] ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                    Descontar de stock
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={takeawayPackaging.includeBag}
                      onChange={(e) =>
                        setTakeawayPackaging((prev) => ({ ...prev, includeBag: e.target.checked }))
                      }
                      className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className={isLight ? 'text-[#2B1712] font-medium' : 'text-slate-200'}>Bolsa</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={takeawayPackaging.includeTray}
                      onChange={(e) =>
                        setTakeawayPackaging((prev) => ({ ...prev, includeTray: e.target.checked }))
                      }
                      className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className={isLight ? 'text-[#2B1712] font-medium' : 'text-slate-200'}>Charola</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={takeawayPackaging.includeCutlery}
                      onChange={(e) =>
                        setTakeawayPackaging((prev) => ({ ...prev, includeCutlery: e.target.checked }))
                      }
                      className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className={isLight ? 'text-[#2B1712] font-medium' : 'text-slate-200'}>Cubiertos</span>
                  </label>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? isLight
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-950 shadow-xs'
                      : 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : isLight
                    ? 'border-[#DECEBD] bg-[#FDFBF9] hover:bg-[#F3E9DC] text-[#5E3023]'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <Banknote className="w-4 h-4" /> Efectivo
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD_DEBIT')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                  paymentMethod === 'CARD_DEBIT'
                    ? isLight
                      ? 'border-cyan-500 bg-cyan-100 text-cyan-950 shadow-xs'
                      : 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : isLight
                    ? 'border-[#DECEBD] bg-[#FDFBF9] hover:bg-[#F3E9DC] text-[#5E3023]'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <CreditCard className="w-4 h-4" /> Tarjeta Débito
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD_CREDIT')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                  paymentMethod === 'CARD_CREDIT'
                    ? isLight
                      ? 'border-violet-500 bg-violet-100 text-violet-950 shadow-xs'
                      : 'border-violet-500 bg-violet-500/10 text-violet-400'
                    : isLight
                    ? 'border-[#DECEBD] bg-[#FDFBF9] hover:bg-[#F3E9DC] text-[#5E3023]'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <CreditCard className="w-4 h-4" /> Tarjeta Crédito
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TRANSFER')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                  paymentMethod === 'TRANSFER'
                    ? isLight
                      ? 'border-amber-500 bg-amber-100 text-amber-950 shadow-xs'
                      : 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : isLight
                    ? 'border-[#DECEBD] bg-[#FDFBF9] hover:bg-[#F3E9DC] text-[#5E3023]'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <QrCode className="w-4 h-4" /> Transferencia / QR
              </button>
            </div>

            {/* Cash Shortcuts and Change Calculator */}
            {paymentMethod === 'CASH' && (
              <div
                className={`space-y-3 p-3 rounded-2xl border ${
                  isLight
                    ? 'bg-[#FAF6F0] border-[#DECEBD]'
                    : 'bg-slate-950 border-slate-850'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                    Efectivo Recibido:
                  </span>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className={`w-28 px-2 py-1 rounded-lg border text-right font-bold focus:ring-1 ${
                      isLight
                        ? 'bg-white border-[#DECEBD] text-[#2B1712] focus:ring-[#C08552]'
                        : 'bg-slate-900 border-slate-800 text-white focus:ring-amber-500'
                    }`}
                  />
                </div>

                {/* Quick amount pills */}
                <div className="flex gap-1.5 text-xs">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountReceived(amt.toString())}
                      className={`flex-1 py-1.5 rounded-lg border font-bold cursor-pointer transition-colors ${
                        isLight
                          ? 'bg-white hover:bg-[#F3E9DC] border-[#DECEBD] text-[#5E3023]'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmountReceived(total.toString())}
                    className={`flex-1 py-1.5 rounded-lg border font-bold cursor-pointer transition-colors ${
                      isLight
                        ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-950'
                        : 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    Exacto
                  </button>
                </div>

                <div
                  className={`flex justify-between items-center pt-2 border-t text-xs ${
                    isLight ? 'border-[#DECEBD]' : 'border-slate-850'
                  }`}
                >
                  <span className={`font-semibold ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                    Cambio a entregar:
                  </span>
                  <strong
                    className={`text-sm font-black ${
                      isLight ? 'text-emerald-800' : 'text-emerald-400'
                    }`}
                  >
                    ${changeDue.toFixed(2)} MXN
                  </strong>
                </div>
              </div>
            )}

            {/* Error in modal */}
            {error && <div className="text-red-500 text-xs text-center font-medium">{error}</div>}

            {/* Final Action Button */}
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={processingSale || (paymentMethod === 'CASH' && receivedNum < total)}
              style={{
                backgroundColor: themeButton,
                color: isLightButton ? '#2B1712' : '#ffffff',
              }}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer hover:opacity-90"
            >
              {processingSale ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>Registrar Venta y Cobro</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE VENTA EXITOSA CON DESGLOSE DE INVENTARIO */}
      {saleSuccess && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 sm:p-8 space-y-5 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-mono text-emerald-400 block font-semibold">
                {saleSuccess.orderNumber}
              </span>
              <h3 className="text-xl font-bold text-white mt-1">¡Venta Exitosa!</h3>
              <p className="text-xs text-slate-400 mt-1">Cobro registrado: ${Number(saleSuccess.total).toFixed(2)} MXN</p>
            </div>

            {/* Inventory Ledger Deductions Summary */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Descuento de Stock en Almacén:
              </span>
              <div className="text-xs space-y-1">
                {saleSuccess.inventoryDeductions && saleSuccess.inventoryDeductions.length > 0 ? (
                  saleSuccess.inventoryDeductions.map((ded, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>{ded.item}</span>
                      <strong className="text-emerald-400">
                        -{ded.deducted} {ded.unit}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Sin deducciones de empaque desechable (servicio en loza/cerámica o producto sin receta).
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSaleSuccess(null)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              Comenzar Nueva Venta
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE ARQUEO / CIERRE DE TURNO DE CAJA */}
      {showCutModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Arqueo y Cierre de Turno</h3>
                  <p className="text-xs text-slate-400">Verificación de efectivo físico y corte Z</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCutModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingSession ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs">Consultando balance del turno...</span>
              </div>
            ) : cashSession ? (
              <div className="space-y-4 text-xs">
                {/* Desglose de Ventas del Turno */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Fondo Inicial de Caja:</span>
                    <strong className="text-white">${cashSession.openingBalance.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Ventas en Efectivo:</span>
                    <strong className="text-emerald-400">+${cashSession.cashSales.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Ventas con Tarjeta (Débito/Crédito):</span>
                    <span className="text-slate-300">${cashSession.cardSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Transferencias / QR:</span>
                    <span className="text-slate-300">${cashSession.transferSales.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                    <span className="text-slate-200">Total Facturado en Turno ({cashSession.ordersCount} órdenes):</span>
                    <span className="text-amber-400">${cashSession.totalSales.toFixed(2)} MXN</span>
                  </div>
                </div>

                {/* Resumen de Efectivo Esperado */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-amber-300 block font-semibold">
                      Efectivo Esperado en Cajón
                    </span>
                    <span className="text-[10px] text-slate-400">(Fondo + Ventas en Efectivo)</span>
                  </div>
                  <span className="text-2xl font-black text-amber-400">
                    ${cashSession.expectedCashInDrawer.toFixed(2)}
                  </span>
                </div>

                {/* Conteo Físico Real */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">
                    Efectivo Físico Contado en Cajón ($ MXN) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Cálculo de Descuadre en Vivo */}
                {(() => {
                  const diff = (Number(countedCash) || 0) - cashSession.expectedCashInDrawer
                  return (
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                        Math.abs(diff) < 0.01
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : diff > 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}
                    >
                      <span>Resultado del Arqueo:</span>
                      <span>
                        {Math.abs(diff) < 0.01
                          ? '✓ Caja Cuadrada Exacta ($0.00)'
                          : diff > 0
                          ? `▲ Sobrante de +$${diff.toFixed(2)} MXN`
                          : `▼ Faltante de -$${Math.abs(diff).toFixed(2)} MXN`}
                      </span>
                    </div>
                  )
                })()}

                {/* Notas */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Notas o Justificación del Corte (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={cutNotes}
                    onChange={(e) => setCutNotes(e.target.value)}
                    placeholder="Observaciones de billetes o incidencias durante el turno..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCutModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium cursor-pointer"
                  >
                    Continuar Vendiendo
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCloseSession}
                    disabled={submittingCut || countedCash === ''}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {submittingCut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>Confirmar Corte Z y Cerrar Turno</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No hay sesiones de caja abiertas en este momento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TICKET / RECIBO DE CORTE Z */}
      {cutReceipt && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-amber-500/40 p-6 sm:p-8 space-y-5 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-amber-400 block font-bold">
                Corte Z Oficial
              </span>
              <h3 className="text-xl font-bold text-white mt-1">{cutReceipt.registerName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Cajero: {cutReceipt.closedBy}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2 text-left">
              <div className="flex justify-between text-slate-400">
                <span>Fondo Inicial:</span>
                <span className="text-white">${Number(cutReceipt.openingBalance).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Efectivo Esperado:</span>
                <span className="text-white">${Number(cutReceipt.expectedBalance).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-bold border-t border-slate-800 pt-1.5">
                <span className="text-slate-200">Efectivo Contado:</span>
                <span className="text-amber-400">${Number(cutReceipt.countedBalance).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1">
                <span>Diferencia:</span>
                <span
                  className={
                    cutReceipt.difference === 0
                      ? 'text-emerald-400'
                      : cutReceipt.difference > 0
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }
                >
                  {cutReceipt.difference >= 0 ? `+$${cutReceipt.difference.toFixed(2)}` : `-$${Math.abs(cutReceipt.difference).toFixed(2)}`}
                </span>
              </div>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                Finalizar y Salir a Pantalla de Bloqueo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DESCUENTO */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-amber-400" />
                Aplicar Descuento
              </h3>
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyDiscount} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENTAGE')}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                    discountType === 'PERCENTAGE'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  Porcentaje (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('FIXED')}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                    discountType === 'FIXED'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  Monto Fijo ($)
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {discountType === 'PERCENTAGE' ? 'Porcentaje de Descuento (%)' : 'Monto a Descontar ($ MXN)'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  placeholder={discountType === 'PERCENTAGE' ? 'Ej: 10, 15, 20' : 'Ej: 50.00'}
                  value={discountVal}
                  onChange={(e) => setDiscountVal(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-base focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Motivo o Justificación del Descuento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Convenio empresa, cliente frecuente..."
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
                >
                  Aplicar Descuento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CORTESÍA / SIN COBRO */}
      {showCourtesyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-400" />
                Cortesía de la Casa
              </h3>
              <button
                type="button"
                onClick={() => setShowCourtesyModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyCourtesy} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCourtesyIsFull(true)}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                    courtesyIsFull
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  100% Sin Cobro
                </button>
                <button
                  type="button"
                  onClick={() => setCourtesyIsFull(false)}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                    !courtesyIsFull
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  Monto Parcial
                </button>
              </div>

              {!courtesyIsFull && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Monto de Cortesía ($ MXN)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={subtotal}
                    required
                    placeholder={`Máximo $${subtotal.toFixed(2)}`}
                    value={courtesyAmountVal}
                    onChange={(e) => setCourtesyAmountVal(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-base focus:outline-none focus:border-emerald-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Beneficiario (Persona o Invitado)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Lic. González, Proveedor, Personal..."
                  value={courtesyBeneficiary}
                  onChange={(e) => setCourtesyBeneficiary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Motivo de la Cortesía *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Atención de gerencia, cortesía de la casa..."
                  value={courtesyReason}
                  onChange={(e) => setCourtesyReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCourtesyModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  {courtesyIsFull ? 'Marcar Cuenta sin Cobro' : 'Aplicar Cortesía'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE AUTORIZACIÓN CON PIN */}
      {/* MODAL DE COMANDAS DE MESAS PENDIENTES DE COBRO */}
      {showPendingTablesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl max-h-[85vh] rounded-3xl p-6 flex flex-col shadow-2xl animate-in zoom-in-95 space-y-4 border ${
              isLight
                ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                : 'bg-slate-900 border-violet-500/40 text-white'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 shrink-0 border-b ${
                isLight ? 'border-[#DECEBD]' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: `${themePrimary}20`,
                    color: isLight ? '#5E3023' : themePrimary,
                  }}
                >
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                    Comandas de Mesas por Cobrar
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-[#895737]' : 'text-slate-400'}`}>
                    Selecciona una mesa para registrar su cobro y consumo en caja
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingTablesModal(false)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold cursor-pointer transition-colors ${
                  isLight
                    ? 'bg-[#F3E9DC] text-[#5E3023] hover:bg-[#E6D5C3]'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Lista de Mesas con Comanda */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {tables.filter((t) => !!t.activeOrder).length === 0 ? (
                <div
                  className={`py-12 flex flex-col items-center justify-center text-xs text-center space-y-2 ${
                    isLight ? 'text-[#895737]' : 'text-slate-500'
                  }`}
                >
                  <UtensilsCrossed
                    className={`w-10 h-10 mb-1 ${isLight ? 'text-[#DECEBD]' : 'opacity-40'}`}
                  />
                  <p className={`font-semibold ${isLight ? 'text-[#2B1712]' : 'text-slate-400'}`}>
                    No hay comandas pendientes de cobro
                  </p>
                  <p className={`max-w-xs ${isLight ? 'text-[#895737]' : 'text-slate-500'}`}>
                    Cuando un mesero marche platillos o imprima una pre-cuenta desde la Comandera, aparecerá aquí lista para cobrar.
                  </p>
                </div>
              ) : (
                tables
                  .filter((t) => !!t.activeOrder)
                  .sort((a, b) => (b.status === 'BILL_PRINTED' ? 1 : 0) - (a.status === 'BILL_PRINTED' ? 1 : 0))
                  .map((table) => {
                    const order = table.activeOrder!
                    const isBillPrinted = table.status === 'BILL_PRINTED'
                    const isTransferred = !!table.currentWaiter && table.currentWaiter.id !== table.assignedWaiter?.id

                    return (
                      <div
                        key={table.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isBillPrinted
                            ? isLight
                              ? 'bg-amber-50/90 border-amber-300 shadow-md ring-1 ring-amber-300'
                              : 'bg-violet-950/30 border-violet-500/60 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30'
                            : isLight
                            ? 'bg-[#FDFBF9] border-[#DECEBD] hover:border-[#C08552]'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-base font-extrabold ${
                                isLight ? 'text-[#2B1712]' : 'text-white'
                              }`}
                            >
                              {table.name}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                                isLight
                                  ? 'bg-[#F3E9DC] text-[#5E3023]'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {order.orderNumber}
                            </span>
                            {isBillPrinted && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse ${
                                  isLight
                                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                    : 'bg-violet-500 text-white'
                                }`}
                              >
                                <Receipt className="w-3 h-3" /> Pre-cuenta solicitada
                              </span>
                            )}
                          </div>

                          <div
                            className={`text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1 ${
                              isLight ? 'text-[#7A5A43]' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              Atiende:{' '}
                              <strong className={isLight ? 'text-[#2B1712]' : 'text-slate-200'}>
                                {table.currentWaiter?.name || order.waiter?.name || 'Mesero'}
                              </strong>
                            </span>
                            {isTransferred && table.assignedWaiter && (
                              <span className={isLight ? 'text-cyan-800 font-semibold' : 'text-cyan-300'}>
                                (Titular original: {table.assignedWaiter.name})
                              </span>
                            )}
                            {order.customerName && (
                              <span className={`italic ${isLight ? 'text-[#895737]' : 'text-slate-400'}`}>
                                Comensal: {order.customerName}
                              </span>
                            )}
                          </div>

                          {/* Lista resumida de platillos */}
                          <p className={`text-[11px] line-clamp-1 ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                            {order.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                          </p>
                        </div>

                        {/* Total y Botón Cargar */}
                        <div
                          className={`flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 ${
                            isLight ? 'border-[#DECEBD]' : 'border-slate-800'
                          }`}
                        >
                          <span
                            className={`text-base font-extrabold ${
                              isLight ? 'text-[#5E3023]' : 'text-amber-400'
                            }`}
                          >
                            ${order.total.toFixed(2)} MXN
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLoadTableOrder(table)}
                            style={{
                              backgroundColor: themeButton,
                              color: isLightButton ? '#2B1712' : '#ffffff',
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:opacity-90"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Cargar en Caja</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>

            <div
              className={`flex justify-between items-center pt-2 border-t text-xs shrink-0 ${
                isLight ? 'border-[#DECEBD] text-[#7A5A43]' : 'border-slate-800 text-slate-400'
              }`}
            >
              <span>Al cobrar la mesa en caja, regresará automáticamente a su mesero titular.</span>
              <button
                type="button"
                onClick={() => setShowPendingTablesModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
                  isLight
                    ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] border-[#DECEBD] text-[#5E3023]'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AUTORIZACIÓN CON PIN */}
      {showPinAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Autorización Requerida</h3>
              <p className="text-xs text-slate-400">
                Tu puesto no tiene permiso directo para{' '}
                {authActionPending === 'discount' ? 'aplicar descuentos' : 'autorizar cortesías'}.
                Introduce el PIN de un supervisor o administrador.
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={authPin}
                onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-3xl tracking-[0.5em] font-mono py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPinAuthModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={verifyingPin || authPin.length !== 4}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-40 cursor-pointer"
                >
                  {verifyingPin && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Validar Autorización</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PANTALLA / OVERLAY DE BIENVENIDA AL ENTRAR O DESBLOQUEAR TERMINAL */}
      {welcomeOverlayUser && (
        <div className="fixed inset-0 z-50 bg-[#14100E]/85 backdrop-blur-md flex items-center justify-center p-4 selection:bg-[#C08552] selection:text-white animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#251E1B] border border-[#3E2723] rounded-3xl p-8 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5E3023] to-[#C08552] text-white flex items-center justify-center mx-auto shadow-xl shadow-[#C08552]/30 animate-bounce duration-1000">
              <Coffee className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#C08552]/20 border border-[#C08552]/40 text-[#DECEBD] mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#C08552]" />
                <span>{welcomeOverlayUser.role?.name || welcomeOverlayUser.roleName || 'Terminal POS'}</span>
              </div>
              <h2 className="text-2xl font-black text-white">
                {welcomeOverlayUser.gender === 'FEMALE' ? '¡Bienvenida,' : '¡Bienvenido,'} {welcomeOverlayUser.name}!
              </h2>
              <p className="text-xs text-[#A88C7D] mt-1 font-medium">
                Turno activado. ¡Mucho éxito en el servicio!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FULLSCREEN DE BLOQUEO DE TERMINAL Y RELEVO RÁPIDO */}
      {isTerminalLocked && (
        <div className="fixed inset-0 z-50 bg-[#F3E9DC] flex items-center justify-center p-4 selection:bg-[#C08552] selection:text-white overflow-y-auto">
          {/* Ambient Warm Coffee Glows */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#C08552]/15 rounded-full blur-[130px]" />
            <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-[#5E3023]/10 rounded-full blur-[110px]" />
          </div>

          <div className="w-full max-w-sm rounded-3xl bg-white/95 border border-[#E6D5C3] p-7 sm:p-8 space-y-4 shadow-2xl shadow-[#5E3023]/15 text-center backdrop-blur-xl relative animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5E3023] to-[#7A3E2D] text-[#F3E9DC] flex items-center justify-center mx-auto shadow-lg shadow-[#5E3023]/25 mb-2 transform hover:scale-105 transition-transform duration-300">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#C08552]/15 border border-[#C08552]/30 text-xs font-semibold text-[#C08552] mb-1.5">
                <Laptop className="w-3.5 h-3.5" />
                <span>
                  {terminalDevice?.terminalName
                    ? sessionUser?.branches && sessionUser.branches.length > 1
                      ? `${terminalDevice.terminalName} • ${activeBranch?.name}`
                      : terminalDevice.terminalName
                    : sessionUser?.branches && sessionUser.branches.length > 1
                    ? activeBranch?.name || 'Terminal POS'
                    : 'Terminal de Cobro POS'}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#5E3023] tracking-tight">Terminal Bloqueada</h2>
              <p className="text-xs text-[#895737] font-medium mt-1">
                Ingresa tu PIN de 4 dígitos (pantalla táctil o teclado físico)
              </p>
              {sessionUser && (
                <p className="text-[11px] text-[#A88C7D] mt-1 font-medium">
                  Último operador: <strong className="text-[#5E3023]">{sessionUser.name}</strong>
                </p>
              )}
            </div>

            {/* Error */}
            {unlockError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center animate-in fade-in">
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
                      ? 'border-[#C08552] bg-[#C08552]/15 text-[#5E3023] shadow-md shadow-[#C08552]/20'
                      : 'border-[#DECEBD] bg-[#FDFBF9] text-[#A88C7D]'
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
                  className="h-14 rounded-2xl bg-[#FDFBF9] hover:bg-[#F3E9DC] active:bg-[#E6D5C3] border border-[#DECEBD] text-lg font-bold text-[#5E3023] transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center select-none"
                >
                  {val === 'DEL' ? '⌫' : val}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleUnlockTerminal()}
              disabled={unlocking || unlockPin.length < 4}
              className="w-full py-3.5 px-4 rounded-xl bg-[#C08552] hover:bg-[#A96F3F] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C08552]/30 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Desbloquear Terminal</span>
            </button>

            {/* Acciones secundarias en bloqueo */}
            <div className="pt-2 border-t border-[#E6D5C3] flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setShowDeviceConfigModal(true)}
                className="w-full text-xs text-[#895737] hover:text-[#5E3023] flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer font-medium"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar / Vincular este Dispositivo</span>
              </button>

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full text-xs text-[#895737] hover:text-rose-600 flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir al Login Principal (Cerrar Sesión)</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN Y FIJACIÓN DE DISPOSITIVO / TERMINAL */}
      {showDeviceConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl text-left animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Vincular Dispositivo Fijo</h3>
                  <p className="text-xs text-slate-400">Modo Terminal de Sucursal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeviceConfigModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <p className="font-bold mb-1">¿Cómo funciona el Modo Terminal?</p>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Al fijar este equipo, la tablet o computadora recordará permanentemente que pertenece a <strong>{activeBranch?.name}</strong>. Los cajeros y meseros solo necesitarán teclear su PIN de 4 dígitos para operar, sin pedir usuario ni contraseñas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre de la Terminal en esta Sucursal
                </label>
                <input
                  type="text"
                  value={deviceTerminalNameInput}
                  onChange={(e) => setDeviceTerminalNameInput(e.target.value)}
                  placeholder="Ej: Caja Principal 1, Tablet Barra, Caja Terraza"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sucursal Asignada
                </label>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span className="font-medium text-white">{activeBranch?.name}</span>
                  <span className="text-[10px] text-amber-400 font-mono">Código: {activeBranch?.code}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSaveDeviceBinding}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Laptop className="w-4 h-4" />
                  <span>Guardar y Fijar como Terminal</span>
                </button>

                {terminalDevice && (
                  <button
                    type="button"
                    onClick={handleUnbindDevice}
                    className="w-full py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                  >
                    Desvincular Dispositivo (Usar como equipo móvil libre)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Personalizador de Producto (Tamaños, Sabores, Extras, Alergias) */}
      <ProductCustomizerModal
        isOpen={showCustomizerModal}
        onClose={() => {
          setShowCustomizerModal(false)
          setCustomizingProduct(null)
        }}
        product={customizingProduct}
        isLight={isLight}
        primaryColor={themePrimary}
        buttonColor={themePrimary || '#C08552'}
        onConfirm={handleConfirmCustomization}
      />
    </div>
  )
}

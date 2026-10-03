'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Coffee,
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
}

interface Category {
  id: string
  name: string
}

interface CartItem {
  variantId: string
  productName: string
  variantName: string
  unitPrice: number
  quantity: number
  inventoryPolicy: string
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

  // Terminal Lock / Fast Shift Change states
  const [isTerminalLocked, setIsTerminalLocked] = useState(false)
  const [unlockPin, setUnlockPin] = useState('')
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)

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
      notify.success('Turno Desbloqueado', `Operando como: ${newUser.name}`)
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
    // Sondeo de mesas cada 8 segundos para detectar pre-cuentas de meseros
    const interval = setInterval(refreshTablesData, 8000)
    return () => clearInterval(interval)
  }, [])

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

  // Agregar al carrito
  const addToCart = (product: Product) => {
    const variant = product.variants[0]
    if (!variant) return

    setCart((prev) => {
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
          productName: product.name,
          variantName: variant.name,
          unitPrice: Number(variant.price),
          quantity: 1,
          inventoryPolicy: product.inventoryPolicy,
        },
      ]
    })
  }

  // Modificar cantidad
  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.variantId === variantId) {
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
        })),
        paymentMethod: total === 0 ? 'OTHER' : paymentMethod,
        amountReceived: total === 0 ? 0 : paymentMethod === 'CASH' ? receivedNum : total,
        discount: discount ? { amount: discount.amount, reason: discount.reason, approvedBy: discount.approvedBy } : undefined,
        courtesy: courtesy ? { amount: courtesy.amount, reason: courtesy.reason, beneficiary: courtesy.beneficiary, approvedBy: courtesy.approvedBy } : undefined,
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

  return (
    <div
      className="h-screen text-slate-100 flex flex-col overflow-hidden selection:bg-amber-500 selection:text-black"
      style={{ backgroundColor: activeBranch?.bgColor || '#020617' }}
    >
      {/* Top Header */}
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
                backgroundColor: `${activeBranch?.primaryColor || '#f59e0b'}25`,
                color: activeBranch?.primaryColor || '#f59e0b',
              }}
            >
              <Coffee className="w-4 h-4" />
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              Terminal POS
              {activeBranch && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
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
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
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
            <span className="text-xs font-semibold text-slate-200 block">{sessionUser?.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Rol: {sessionUser?.roleCodes?.join(', ')}
            </span>
          </div>

          {/* Enlace Comandera */}
          <Link
            href="/comandera"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-xs text-violet-300 font-medium transition-all"
            title="Abrir Comandera de Meseros"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Mesas</span>
          </Link>

          {/* Enlace KDS Cocina */}
          <Link
            href="/kds"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs text-cyan-300 font-medium transition-all"
            title="Abrir Monitor KDS Cocina"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>KDS</span>
          </Link>

          {/* Botón de Arqueo / Cierre de Turno */}
          <button
            type="button"
            onClick={openCashCutModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 font-medium transition-all cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/30 text-xs text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
            title="Bloquear terminal o cambiar operador de turno"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bloquear / Relevo</span>
          </button>
        </div>
      </header>

      {/* Main Terminal Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Categories & Products Grid */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          {/* Order Type & Table Selector */}
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Toggle DINE_IN vs TAKEAWAY */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                style={
                  orderType === 'DINE_IN'
                    ? { backgroundColor: activeBranch?.primaryColor || '#7c3aed', color: '#ffffff' }
                    : undefined
                }
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  orderType === 'DINE_IN'
                    ? 'shadow-sm font-bold'
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
                    ? { backgroundColor: activeBranch?.secondaryColor || '#4f46e5', color: '#ffffff' }
                    : undefined
                }
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  orderType === 'TAKEAWAY'
                    ? 'shadow-sm font-bold'
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
                className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                title="Cargar consumos y comandas marchadas por meseros"
              >
                <ReceiptText className="w-3.5 h-3.5" />
                <span>Comandas por Cobrar</span>
                {tables.filter((t) => !!t.activeOrder).length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                    {tables.filter((t) => !!t.activeOrder).length}
                  </span>
                )}
              </button>
            </div>

            {/* Mesas selector if DINE_IN */}
            {orderType === 'DINE_IN' && tables.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                <span className="text-[11px] text-slate-400 shrink-0">Mesa:</span>
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
                          ? { backgroundColor: activeBranch?.primaryColor || '#7c3aed', color: '#ffffff' }
                          : undefined
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                        selectedTableId === t.id
                          ? 'shadow-sm font-bold'
                          : hasBill
                          ? 'bg-violet-950/40 border border-violet-500/50 text-violet-300'
                          : hasOrder
                          ? 'bg-amber-950/30 border border-amber-500/40 text-amber-300'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                      title={
                        hasBill
                          ? `${t.name}: Pre-cuenta impresa - Lista para cobro`
                          : hasOrder
                          ? `${t.name}: Consumo activo en mesa`
                          : `${t.name}: Mesa libre`
                      }
                    >
                      {hasBill && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
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
              className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-white text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
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
                    ? { backgroundColor: activeBranch?.primaryColor || '#7c3aed', color: '#ffffff' }
                    : undefined
                }
                className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 transition-all cursor-pointer ${
                  selectedCategory === c.id
                    ? 'font-bold shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
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
                  className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between h-32 shadow-sm group"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {p.inventoryPolicy === 'RECIPE' ? 'RECETA' : p.inventoryPolicy}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white mt-1.5 line-clamp-2 leading-tight">
                      {p.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-sm font-bold text-amber-400">${price.toFixed(2)}</span>
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs group-hover:bg-amber-500 group-hover:text-black font-bold transition-all">
                      +
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Ticket Sidebar */}
        <div className="w-80 sm:w-96 border-l border-slate-800 bg-slate-900/90 flex flex-col h-full shrink-0">
          {/* Ticket Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm text-white">Ticket de Venta</span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => clearCart(true)}
                className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* Customer / Note input */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente o nota..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center space-y-2 p-4">
                <UtensilsCrossed className="w-8 h-8 text-slate-600" />
                <p>Toca los productos de la izquierda para agregarlos a la comanda.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.variantId}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex-1 pr-2">
                    <span className="font-semibold text-white block line-clamp-1">
                      {item.productName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ${item.unitPrice.toFixed(2)} c/u
                    </span>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-white text-xs">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-16 text-right font-bold text-amber-400">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Ticket Footer / Checkout Action */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3 shrink-0">
            {/* Botones de Descuento y Cortesía */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRequestDiscount}
                disabled={cart.length === 0}
                className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  discount
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <BadgePercent className="w-3.5 h-3.5 text-amber-400" />
                <span>{discount ? 'Editar Desc.' : 'Descuento'}</span>
              </button>

              <button
                type="button"
                onClick={handleRequestCourtesy}
                disabled={cart.length === 0}
                className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  courtesy
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                <span>{courtesy ? 'Editar Cort.' : 'Sin Cobro'}</span>
              </button>
            </div>

            {/* Desglose de totales */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              {discount && (
                <div className="flex items-center justify-between text-amber-400 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Descuento {discount.percentage ? `(${discount.percentage}%)` : ''}</span>
                    <button
                      type="button"
                      onClick={() => setDiscount(null)}
                      className="text-slate-500 hover:text-rose-400 text-[10px] p-0.5 cursor-pointer"
                      title="Quitar descuento"
                    >
                      ✕
                    </button>
                  </div>
                  <span>-${discount.amount.toFixed(2)}</span>
                </div>
              )}

              {courtesy && (
                <div className="flex items-center justify-between text-emerald-400 text-xs">
                  <div className="flex items-center gap-1">
                    <span>Cortesía {courtesy.isFull ? '(100%)' : ''}</span>
                    <button
                      type="button"
                      onClick={() => setCourtesy(null)}
                      className="text-slate-500 hover:text-rose-400 text-[10px] p-0.5 cursor-pointer"
                      title="Quitar cortesía"
                    >
                      ✕
                    </button>
                  </div>
                  <span>-${courtesy.amount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                <span>Total a Cobrar</span>
                <span
                  className="font-extrabold"
                  style={{ color: total === 0 ? '#10b981' : activeBranch?.buttonColor || '#f59e0b' }}
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
                backgroundColor: total === 0 ? '#059669' : activeBranch?.buttonColor || '#f59e0b',
                color: '#ffffff',
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
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" /> Confirmar Cobro
              </h3>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Total Display */}
            <div className="text-center py-2 bg-slate-950 rounded-2xl border border-slate-850">
              <span className="text-xs text-slate-400">Monto Total</span>
              <p className="text-3xl font-extrabold text-amber-400">${total.toFixed(2)} MXN</p>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-semibold transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <Banknote className="w-4 h-4" /> Efectivo
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD_DEBIT')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-semibold transition-all ${
                  paymentMethod === 'CARD_DEBIT'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <CreditCard className="w-4 h-4" /> Tarjeta Débito
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD_CREDIT')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-semibold transition-all ${
                  paymentMethod === 'CARD_CREDIT'
                    ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <CreditCard className="w-4 h-4" /> Tarjeta Crédito
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TRANSFER')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-semibold transition-all ${
                  paymentMethod === 'TRANSFER'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <QrCode className="w-4 h-4" /> Transferencia / QR
              </button>
            </div>

            {/* Cash Shortcuts and Change Calculator */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3 bg-slate-950 p-3 rounded-2xl border border-slate-850">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Efectivo Recibido:</span>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-28 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white text-right font-bold focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Quick amount pills */}
                <div className="flex gap-1.5 text-xs">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountReceived(amt.toString())}
                      className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold"
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmountReceived(total.toString())}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-semibold"
                  >
                    Exacto
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-850 text-xs">
                  <span className="text-slate-400 font-medium">Cambio a entregar:</span>
                  <strong className="text-sm font-bold text-emerald-400">
                    ${changeDue.toFixed(2)} MXN
                  </strong>
                </div>
              </div>
            )}

            {/* Error in modal */}
            {error && <div className="text-red-400 text-xs text-center">{error}</div>}

            {/* Final Action Button */}
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={processingSale || (paymentMethod === 'CASH' && receivedNum < total)}
              style={{
                backgroundColor: activeBranch?.buttonColor || '#059669',
                color: '#ffffff',
              }}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
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
                {saleSuccess.inventoryDeductions.map((ded, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span>{ded.item}</span>
                    <strong className="text-emerald-400">
                      -{ded.deducted} {ded.unit}
                    </strong>
                  </div>
                ))}
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-slate-900 border border-violet-500/40 p-6 flex flex-col shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Comandas de Mesas por Cobrar</h3>
                  <p className="text-xs text-slate-400">Selecciona una mesa para registrar su cobro y consumo en caja</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingTablesModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Lista de Mesas con Comanda */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {tables.filter((t) => !!t.activeOrder).length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs text-center space-y-2">
                  <UtensilsCrossed className="w-10 h-10 opacity-40 mb-1" />
                  <p className="font-semibold text-slate-400">No hay comandas pendientes de cobro</p>
                  <p className="max-w-xs text-slate-500">
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
                            ? 'bg-violet-950/30 border-violet-500/60 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-white">{table.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300">
                              {order.orderNumber}
                            </span>
                            {isBillPrinted && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500 text-white flex items-center gap-1 animate-pulse">
                                <Receipt className="w-3 h-3" /> Pre-cuenta solicitada
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              Atiende: <strong className="text-slate-200">{table.currentWaiter?.name || order.waiter?.name || 'Mesero'}</strong>
                            </span>
                            {isTransferred && table.assignedWaiter && (
                              <span className="text-cyan-300">
                                (Titular original: {table.assignedWaiter.name})
                              </span>
                            )}
                            {order.customerName && (
                              <span className="italic text-slate-400">
                                Comensal: {order.customerName}
                              </span>
                            )}
                          </div>

                          {/* Lista resumida de platillos */}
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {order.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                          </p>
                        </div>

                        {/* Total y Botón Cargar */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                          <span className="text-base font-extrabold text-amber-400">
                            ${order.total.toFixed(2)} MXN
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLoadTableOrder(table)}
                            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-violet-600/30 transition-all cursor-pointer"
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

            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs text-slate-400 shrink-0">
              <span>Al cobrar la mesa en caja, regresará automáticamente a su mesero titular.</span>
              <button
                type="button"
                onClick={() => setShowPendingTablesModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
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

      {/* MODAL FULLSCREEN DE BLOQUEO DE TERMINAL Y RELEVO RÁPIDO */}
      {isTerminalLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-amber-300 mb-2 font-medium">
                <Laptop className="w-3.5 h-3.5" />
                <span>
                  {terminalDevice?.terminalName
                    ? `${terminalDevice.terminalName} • ${activeBranch?.name}`
                    : (activeBranch?.name || 'Terminal POS')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Terminal Bloqueada</h2>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa tu PIN de 4 dígitos (pantalla táctil o teclado físico)
              </p>
              {sessionUser && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Último operador: <span className="text-slate-300 font-medium">{sessionUser.name}</span>
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
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-md shadow-amber-500/20'
                      : 'border-slate-800 bg-slate-950/60 text-slate-600'
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
                  className="h-14 rounded-2xl bg-slate-950/90 hover:bg-slate-800 border border-slate-800/80 text-lg font-bold text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center select-none"
                >
                  {val === 'DEL' ? '⌫' : val}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleUnlockTerminal()}
              disabled={unlocking || unlockPin.length < 4}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40 cursor-pointer"
            >
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Desbloquear Terminal</span>
            </button>

            {/* Acciones secundarias en bloqueo */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setShowDeviceConfigModal(true)}
                className="w-full text-[11px] text-slate-400 hover:text-amber-300 flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar / Vincular este Dispositivo</span>
              </button>

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
    </div>
  )
}

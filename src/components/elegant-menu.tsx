'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coffee,
  Search,
  Sparkles,
  Clock,
  MapPin,
  Phone,
  X,
  Check,
  BellRing,
  Info,
  ChevronRight,
  ChevronLeft,
  Pause,
  Play,
  Flame,
  MessageCircle,
} from 'lucide-react'
import { InstagramIcon, FacebookIcon, TikTokIcon, WhatsAppIcon } from '@/components/brand-icons'
import { isLightColor } from '@/lib/theme-utils'

function hexToRgba(hex?: string | null, alpha = 1): string {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`
  const cleanHex = hex.trim().replace('#', '')
  if (cleanHex.length !== 6 && cleanHex.length !== 3) {
    return hex
  }
  const r =
    cleanHex.length === 3
      ? parseInt(cleanHex[0] + cleanHex[0], 16)
      : parseInt(cleanHex.substring(0, 2), 16)
  const g =
    cleanHex.length === 3
      ? parseInt(cleanHex[1] + cleanHex[1], 16)
      : parseInt(cleanHex.substring(2, 4), 16)
  const b =
    cleanHex.length === 3
      ? parseInt(cleanHex[2] + cleanHex[2], 16)
      : parseInt(cleanHex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface Variant {
  id: string
  name: string
  price: number
}

export interface Modifier {
  id: string
  name: string
  extraPrice: number
}

export interface ModifierGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  isRequired: boolean
  modifiers: Modifier[]
}

export interface Product {
  id: string
  name: string
  code: string | null
  description: string | null
  imageUrl: string | null
  isNew?: boolean
  isSeasonal?: boolean
  hasVariants: boolean
  minPrice: number
  maxPrice?: number
  variants: Variant[]
  modifierGroups?: ModifierGroup[]
  ingredients?: string[]
  isAvailable?: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  products: Product[]
}

export interface TableData {
  id?: string
  name: string
  area: string | null
  branchId?: string
  isInitiated?: boolean
  activeOrderId?: string | null
  orderNumber?: string | null
  waiterId?: string | null
  waiterName?: string | null
}

export interface BusinessData {
  id?: string
  name: string
  legalName?: string | null
  logoUrl?: string | null
  isotypeUrl?: string | null
  currency: string
  timezone?: string
  heroWallpaperUrl?: string | null
  heroWallpaperOpacity?: number | null
  socialLinks?: {
    instagram?: string | null
    facebook?: string | null
    tiktok?: string | null
    whatsapp?: string | null
    maps?: string | null
  }
  theme?: {
    primaryColor?: string
    secondaryColor?: string
    buttonColor?: string
    bgColor?: string
    darkMode?: boolean
    menuCoverColor?: string
    menuPaperColor?: string
    menuTextColor?: string
    menuAccentColor?: string
    menuCoverTitle?: string
    menuCoverSubtitle?: string
    businessHours?: string
    phone?: string | null
    address?: string | null
    heroWallpaperUrl?: string | null
    heroWallpaperOpacity?: number | null
    instagramUrl?: string | null
    facebookUrl?: string | null
    tiktokUrl?: string | null
    whatsappNumber?: string | null
    mapsUrl?: string | null
  }
}

interface ElegantMenuProps {
  business: BusinessData
  categories: Category[]
  table?: TableData | null
  customColors?: {
    primaryColor?: string
    secondaryColor?: string
    buttonColor?: string
    bgColor?: string
    darkMode?: boolean
    menuCoverColor?: string
    menuPaperColor?: string
    menuTextColor?: string
    menuAccentColor?: string
    menuCoverTitle?: string
    menuCoverSubtitle?: string
    businessHours?: string
    phone?: string | null
    address?: string | null
    heroWallpaperUrl?: string | null
    heroWallpaperOpacity?: number | null
    instagramUrl?: string | null
    facebookUrl?: string | null
    tiktokUrl?: string | null
    whatsappNumber?: string | null
    mapsUrl?: string | null
  }
  isPreview?: boolean
}

export default function ElegantMenu({
  business,
  categories,
  table,
  customColors,
  isPreview = false,
}: ElegantMenuProps) {
  // Paleta dinámica basada en la configuración de la sucursal o presets (por defecto: Alevan Bloom & Brew)
  const palette = useMemo(() => {
    const cover =
      customColors?.menuCoverColor || business.theme?.menuCoverColor || '#320001'
    const paper =
      customColors?.menuPaperColor || business.theme?.menuPaperColor || '#F8F1EE'
    const text =
      customColors?.menuTextColor || business.theme?.menuTextColor || '#5E1222'
    const accent =
      customColors?.menuAccentColor || business.theme?.menuAccentColor || '#B4566F'

    const isCoverLight = isLightColor(cover)
    const isPaperLight = isLightColor(paper)

    return {
      cover,
      paper,
      text,
      accent,
      isCoverLight,
      isPaperLight,
      // Textos y contrastes sobre la tapa / cubierta (Hero, Food Break, Footer)
      coverText: isCoverLight ? '#1B1412' : '#F6EEE4',
      coverMuted: isCoverLight ? hexToRgba('#1B1412', 0.72) : hexToRgba('#F6EEE4', 0.75),
      coverAccent: isCoverLight ? text : isLightColor(accent) ? accent : '#F0DADD',
      coverShadowGradient: isCoverLight
        ? `linear-gradient(180deg, ${hexToRgba(cover, 0.45)} 0%, ${hexToRgba(cover, 0.10)} 40%, ${hexToRgba(
            cover,
            0.35
          )} 65%, ${hexToRgba(cover, 0.88)} 100%)`
        : `linear-gradient(180deg, ${hexToRgba(cover, 0.70)} 0%, ${hexToRgba(cover, 0.20)} 40%, ${hexToRgba(
            cover,
            0.45
          )} 65%, ${hexToRgba(cover, 0.94)} 100%)`,

      // Textos y contrastes sobre las hojas interiores / páginas
      muted: isPaperLight ? hexToRgba(text, 0.70) : hexToRgba(text, 0.80),
      line: hexToRgba(text, 0.18),
      tint: hexToRgba(accent, 0.12),
      cardBg: isPaperLight ? '#FFFFFF' : hexToRgba(text, 0.08),
      navBg: hexToRgba(paper, 0.94),
      modalFooterBg: hexToRgba(accent, 0.08),
      hoverBg: hexToRgba(accent, 0.08),
    }
  }, [
    customColors?.menuCoverColor,
    customColors?.menuPaperColor,
    customColors?.menuTextColor,
    customColors?.menuAccentColor,
    business.theme?.menuCoverColor,
    business.theme?.menuPaperColor,
    business.theme?.menuTextColor,
    business.theme?.menuAccentColor,
  ])

  // Textos editoriales configurables para la portada
  const coverTitle =
    customColors?.menuCoverTitle ||
    business.theme?.menuCoverTitle ||
    'Cafetería & Barra de Especialidad'
  const coverSubtitle =
    customColors?.menuCoverSubtitle ||
    business.theme?.menuCoverSubtitle ||
    '“Where coffee & moments meet.”'
  // Datos del establecimiento
  const businessHours =
    customColors?.businessHours ||
    business.theme?.businessHours ||
    'Lunes a Domingo: 8:00 AM - 10:00 PM'
  const phone = customColors?.phone || business.theme?.phone || null
  const address = customColors?.address || business.theme?.address || null

  // Fondo cinematográfico del Hero y Redes Sociales
  const heroWallpaperUrl =
    customColors?.heroWallpaperUrl ||
    business.heroWallpaperUrl ||
    business.theme?.heroWallpaperUrl ||
    null

  const heroWallpaperOpacity =
    customColors?.heroWallpaperOpacity ??
    business.heroWallpaperOpacity ??
    business.theme?.heroWallpaperOpacity ??
    0.35

  const rawInstagram =
    customColors?.instagramUrl ||
    business.socialLinks?.instagram ||
    business.theme?.instagramUrl ||
    null

  const rawFacebook =
    customColors?.facebookUrl ||
    business.socialLinks?.facebook ||
    business.theme?.facebookUrl ||
    null

  const rawTiktok =
    customColors?.tiktokUrl ||
    business.socialLinks?.tiktok ||
    business.theme?.tiktokUrl ||
    null

  const rawWhatsapp =
    customColors?.whatsappNumber ||
    business.socialLinks?.whatsapp ||
    business.theme?.whatsappNumber ||
    phone ||
    null

  const rawMaps =
    customColors?.mapsUrl ||
    business.socialLinks?.maps ||
    business.theme?.mapsUrl ||
    address ||
    null

  const instagramLink = useMemo(() => {
    if (!rawInstagram?.trim()) return null
    const val = rawInstagram.trim()
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    const cleanUser = val.replace(/^@/, '')
    return `https://instagram.com/${cleanUser}`
  }, [rawInstagram])

  const facebookLink = useMemo(() => {
    if (!rawFacebook?.trim()) return null
    const val = rawFacebook.trim()
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    return `https://facebook.com/${val.replace(/^\//, '')}`
  }, [rawFacebook])

  const tiktokLink = useMemo(() => {
    if (!rawTiktok?.trim()) return null
    const val = rawTiktok.trim()
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    const cleanUser = val.replace(/^@/, '')
    return `https://tiktok.com/@${cleanUser}`
  }, [rawTiktok])

  const whatsappLink = useMemo(() => {
    if (!rawWhatsapp?.trim()) return null
    const val = rawWhatsapp.trim()
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    const digits = val.replace(/[^0-9]/g, '')
    return digits ? `https://wa.me/${digits}` : null
  }, [rawWhatsapp])

  const mapsLink = useMemo(() => {
    if (!rawMaps?.trim()) return null
    const val = rawMaps.trim()
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`
  }, [rawMaps])

  const hasAnySocial = Boolean(
    instagramLink || facebookLink || tiktokLink || whatsappLink || mapsLink
  )

  // Scroll interactivo para animación de arco y lectura
  const [heroProgress, setHeroProgress] = useState(0)
  const [scrollPercent, setScrollPercent] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isPreview) {
      setHeroProgress(0.2)
      return
    }

    let ticking = false

    const updateScrollMetrics = () => {
      const hero = heroRef.current
      if (hero) {
        const r = hero.getBoundingClientRect()
        const vh = window.innerHeight || 800
        const span = Math.max(1, r.height - vh)
        // Progreso continuo de 0 a 1 mientras el contenido del hero permanece en pantalla
        const raw = Math.min(1, Math.max(0, -r.top / span))
        setHeroProgress(raw)
      }

      const currentY = window.scrollY || document.documentElement.scrollTop || 0
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0) {
        setScrollPercent(Math.min(100, Math.max(0, (currentY / docHeight) * 100)))
      }
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(() => {
          updateScrollMetrics()
          ticking = false
        })
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    updateScrollMetrics()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [isPreview, categories])

  // Estados interactivos
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({})
  const [showInfoModal, setShowInfoModal] = useState(false)

  // Estado sincronizado de la mesa (en vivo)
  const [liveTable, setLiveTable] = useState<TableData | null>(table || null)
  const [waiterCalled, setWaiterCalled] = useState(false)
  const [isCallingWaiter, setIsCallingWaiter] = useState(false)
  const [callMessage, setCallMessage] = useState<string | null>(null)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [orderToast, setOrderToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [itemNotes, setItemNotes] = useState('')

  useEffect(() => {
    if (table) {
      setLiveTable(table)
    }
  }, [table])

  // Polling automático en tiempo real del estado de la mesa (apertura por mesero)
  useEffect(() => {
    if (isPreview || !table) return
    const branchId = table.branchId
    const tableId = table.id
    const tableName = table.name
    if (!branchId || (!tableId && !tableName)) return

    let isMounted = true

    const checkTableStatus = async () => {
      try {
        const url = `/api/public/menu/table-status?branchId=${encodeURIComponent(branchId)}${
          tableId ? `&tableId=${encodeURIComponent(tableId)}` : `&table=${encodeURIComponent(tableName)}`
        }`
        const res = await fetch(url)
        if (!res.ok) return
        const json = await res.json()
        if (json.success && json.data && isMounted) {
          setLiveTable((prev) => ({
            id: json.data.tableId || prev?.id,
            name: json.data.tableName || prev?.name || tableName,
            area: json.data.areaName || prev?.area || null,
            branchId: branchId,
            isInitiated: Boolean(json.data.isInitiated),
            activeOrderId: json.data.activeOrderId || null,
            orderNumber: json.data.orderNumber || null,
            waiterId: json.data.waiter?.id || null,
            waiterName: json.data.waiter?.name || null,
          }))

          if (json.data.hasWaiterCall) {
            setWaiterCalled(true)
          } else {
            setWaiterCalled(false)
          }
        }
      } catch {
        // En caso de corte momentáneo de red, no interrumpir la experiencia
      }
    }

    checkTableStatus()
    const interval = setInterval(checkTableStatus, 5000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [isPreview, table])

  // Platillos con imagen para el hero y para los arcos fotográficos
  const allProductsWithImage = useMemo(() => {
    const prods: Product[] = []
    categories.forEach((c) => {
      c.products.forEach((p) => {
        if (p.imageUrl && !prods.some((x) => x.id === p.id)) {
          prods.push(p)
        }
      })
    })
    return prods
  }, [categories])

  const heroCoverProduct = allProductsWithImage[0] || null
  const introDuoProducts = useMemo(() => {
    if (allProductsWithImage.length <= 2) return allProductsWithImage
    // Si el primer especial coincide con la primera foto, elegimos fotos alternas para mayor riqueza visual
    const firstSpecialId = allProductsWithImage[0]?.id
    const nonHero = allProductsWithImage.filter((p) => p.id !== firstSpecialId)
    return nonHero.length >= 2 ? nonHero.slice(0, 2) : allProductsWithImage.slice(0, 2)
  }, [allProductsWithImage])

  // Platillos especiales con fotografía para el cuadro interactivo del Hero
  const specialProducts = useMemo(() => {
    const list: Product[] = []
    const seen = new Set<string>()

    // 1. Priorizar productos con imagen que sean de temporada o nuevos
    categories.forEach((c) => {
      c.products.forEach((p) => {
        if ((p.isSeasonal || p.isNew) && p.imageUrl && !seen.has(p.id)) {
          seen.add(p.id)
          list.push(p)
        }
      })
    })

    // 2. Complementar con otros platillos destacados que tengan imagen (hasta 6)
    categories.forEach((c) => {
      c.products.forEach((p) => {
        if (p.imageUrl && !seen.has(p.id) && list.length < 6) {
          seen.add(p.id)
          list.push(p)
        }
      })
    })

    return list
  }, [categories])

  const hasHeroImages = specialProducts.length > 0

  // Estado del acordeón dinámico de especiales
  const [activeSpecialIndex, setActiveSpecialIndex] = useState(0)
  const [isSpecialPaused, setIsSpecialPaused] = useState(false)

  // Rotación cíclica automática del acordeón cada 4.5 segundos
  useEffect(() => {
    if (specialProducts.length <= 1 || isSpecialPaused) return
    const timer = setInterval(() => {
      setActiveSpecialIndex((prev) => (prev + 1) % specialProducts.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [specialProducts.length, isSpecialPaused])

  // Reset del índice si la lista cambia
  useEffect(() => {
    if (activeSpecialIndex >= specialProducts.length && specialProducts.length > 0) {
      setActiveSpecialIndex(0)
    }
  }, [specialProducts.length, activeSpecialIndex])

  // Filtrado de productos por búsqueda o categoría seleccionada
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return categories
      .map((cat) => {
        if (selectedCategoryId !== 'all' && cat.id !== selectedCategoryId) {
          return null
        }

        const prods = cat.products.filter((p) => {
          if (!query) return true
          const matchName = p.name.toLowerCase().includes(query)
          const matchDesc = p.description?.toLowerCase().includes(query)
          const matchCode = p.code?.toLowerCase().includes(query)
          return matchName || matchDesc || matchCode
        })

        if (prods.length === 0) return null
        return { ...cat, products: prods }
      })
      .filter(Boolean) as Category[]
  }, [categories, searchQuery, selectedCategoryId])

  // Modal de producto
  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product)
    setSelectedVariant(product.variants[0] || null)
    setItemNotes('')

    const initialMods: Record<string, string[]> = {}
    product.modifierGroups?.forEach((group) => {
      if (group.isRequired && group.modifiers.length > 0) {
        initialMods[group.id] = [group.modifiers[0].id]
      } else {
        initialMods[group.id] = []
      }
    })
    setSelectedModifiers(initialMods)
  }

  const handleToggleModifier = (groupId: string, modId: string, maxSelect: number) => {
    setSelectedModifiers((prev) => {
      const current = prev[groupId] || []
      const isSelected = current.includes(modId)

      if (isSelected) {
        return {
          ...prev,
          [groupId]: current.filter((id) => id !== modId),
        }
      } else {
        if (maxSelect === 1) {
          return {
            ...prev,
            [groupId]: [modId],
          }
        } else if (current.length < maxSelect) {
          return {
            ...prev,
            [groupId]: [...current, modId],
          }
        }
        return prev
      }
    })
  }

  const currentTotalPrice = useMemo(() => {
    if (!selectedProduct) return 0
    let price = selectedVariant ? selectedVariant.price : selectedProduct.minPrice

    if (selectedProduct.modifierGroups) {
      selectedProduct.modifierGroups.forEach((group) => {
        const selectedIds = selectedModifiers[group.id] || []
        group.modifiers.forEach((m) => {
          if (selectedIds.includes(m.id)) {
            price += m.extraPrice
          }
        })
      })
    }

    return price
  }, [selectedProduct, selectedVariant, selectedModifiers])

  // Acción para llamar al mesero en tiempo real
  const handleCallWaiter = async () => {
    if (!liveTable || isCallingWaiter) return
    setIsCallingWaiter(true)
    try {
      const res = await fetch('/api/public/menu/call-waiter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: liveTable.branchId,
          tableId: liveTable.id,
          tableName: liveTable.name,
          message: liveTable.isInitiated
            ? 'Comensal solicita asistencia en mesa'
            : 'Comensal solicita abrir la mesa para ordenar platillos',
        }),
      })
      const result = await res.json()
      if (result.success) {
        setWaiterCalled(true)
        setCallMessage(result.message || 'Llamada enviada con éxito')
      } else {
        setCallMessage(result.error?.message || 'No se pudo contactar al mesero')
      }
    } catch {
      setCallMessage('Error al contactar con el mesero')
    } finally {
      setIsCallingWaiter(false)
      setTimeout(() => setCallMessage(null), 5000)
    }
  }

  // Acción para enviar pedido a cocina desde la mesa (solo si está iniciada)
  const handleSendOrder = async () => {
    if (!liveTable || !selectedProduct || isSubmittingOrder) return

    if (!liveTable.isInitiated) {
      setOrderToast({
        type: 'error',
        text: 'La mesa aún no ha sido iniciada por el mesero. Solicita a tu mesero que abra la comanda para poder ordenar.',
      })
      setTimeout(() => setOrderToast(null), 6000)
      return
    }

    const variant = selectedVariant || selectedProduct.variants[0]
    if (!variant) return

    setIsSubmittingOrder(true)
    try {
      const selectedModIds: string[] = []
      Object.values(selectedModifiers).forEach((mods) => {
        selectedModIds.push(...mods)
      })

      const res = await fetch('/api/public/menu/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: liveTable.branchId,
          tableId: liveTable.id,
          tableName: liveTable.name,
          items: [
            {
              variantId: variant.id,
              quantity: 1,
              unitPrice: currentTotalPrice,
              notes: itemNotes.trim() || undefined,
              modifiers: selectedModIds,
            },
          ],
        }),
      })

      const result = await res.json()
      if (result.success) {
        setOrderToast({
          type: 'success',
          text: `¡${selectedProduct.name} enviado a tu comanda y a cocina!`,
        })
        setSelectedProduct(null)
        setItemNotes('')
        setTimeout(() => setOrderToast(null), 6000)
      } else {
        setOrderToast({
          type: 'error',
          text: result.error?.message || 'Error al procesar tu pedido',
        })
        setTimeout(() => setOrderToast(null), 6000)
      }
    } catch (err: any) {
      setOrderToast({
        type: 'error',
        text: err.message || 'Error de conexión al enviar el pedido',
      })
      setTimeout(() => setOrderToast(null), 6000)
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  // Desplazamiento suave al navbar o menú
  const scrollToBar = () => {
    const el = document.getElementById('bar')
    if (el) {
      const rect = el.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      window.scrollTo({
        top: Math.max(0, rect.top + scrollTop),
        behavior: 'smooth',
      })
    }
  }

  // Desplazamiento suave al selector de categoría
  const scrollToCategory = (catId: string) => {
    setSelectedCategoryId(catId)
    if (catId === 'all') {
      const el = document.getElementById('menu-sections') || document.getElementById('bar')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
      return
    }
    const el = document.getElementById(`cat-${catId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div
      className="w-full min-h-screen relative font-sans select-none antialiased"
      style={{
        backgroundColor: palette.paper,
        color: palette.text,
      }}
    >
      {/* ======================================================== */}
      {/* 1. HERO EDITORIAL: IDENTIDAD Y VENTANA CINEMÁTICA        */}
      {/* ======================================================== */}
      <header
        id="top"
        ref={heroRef}
        className={`relative w-full ${
          isPreview
            ? 'min-h-[100svh]'
            : hasHeroImages
            ? 'min-h-[100svh] lg:h-[185vh]'
            : 'min-h-[100svh]'
        }`}
        style={{
          backgroundColor: palette.cover,
          color: palette.coverText,
        }}
      >
        <div className="relative lg:sticky lg:top-0 min-h-[100svh] lg:h-screen w-full overflow-hidden flex flex-col justify-center items-center py-5 sm:py-8 lg:py-0">
          {/* Fondo cinematográfico temático del Hero (Wallpaper con overlay protector) */}
          {heroWallpaperUrl && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroWallpaperUrl}
                alt="Fondo temático Hero"
                className="w-full h-full object-cover select-none transition-all duration-700 scale-105"
                style={{ opacity: heroWallpaperOpacity }}
              />
              <div
                className="absolute inset-0 transition-colors duration-700"
                style={{
                  backgroundColor: hexToRgba(palette.cover, 0.72),
                  backgroundImage:
                    'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.65) 100%)',
                }}
              />
            </div>
          )}

          {/* Fondo ambiental sutil con viñeta y textura suave */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: palette.coverShadowGradient,
            }}
          />
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
            style={{
              backgroundColor: hexToRgba(palette.coverAccent, 0.12),
            }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
            style={{
              backgroundColor: hexToRgba(palette.coverAccent, 0.08),
            }}
          />

          {/* Contenedor principal */}
          <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-10 lg:px-14 py-2 sm:py-6 lg:py-8">
            {hasHeroImages ? (
              /* Caso con imágenes: En móvil layout vertical proporcionado sin recortes; en desktop 2 columnas lado a lado */
              <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-14 items-center">
                {/* ---------------------------------------------------- */}
                {/* COLUMNA IZQUIERDA: LOGO, TÍTULO, FRASE Y VER MENÚ   */}
                {/* ---------------------------------------------------- */}
                <div className="w-full lg:col-span-6 flex flex-col items-center text-center space-y-3 sm:space-y-5 lg:space-y-6">
                  {/* Logo o Marca */}
                  {business.logoUrl || business.isotypeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={business.logoUrl || business.isotypeUrl || ''}
                      alt={business.name}
                      className="w-auto h-14 sm:h-20 lg:h-32 max-w-[min(78vw,340px)] object-contain drop-shadow-2xl transition-transform hover:scale-102"
                    />
                  ) : (
                    <h1
                      className="text-3xl sm:text-5xl lg:text-6xl font-bodoni italic tracking-tight drop-shadow-xl"
                      style={{ color: palette.coverText }}
                    >
                      {business.name}
                    </h1>
                  )}

                  {/* Título de la cafetería / rubro */}
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span
                      className="w-5 sm:w-7 h-[1.5px]"
                      style={{ backgroundColor: palette.coverAccent }}
                    />
                    <p
                      className="font-marcellus text-[11px] sm:text-xs lg:text-sm tracking-[0.24em] sm:tracking-[0.28em] uppercase font-medium"
                      style={{ color: palette.coverAccent }}
                    >
                      {coverTitle}
                    </p>
                    <span
                      className="w-5 sm:w-7 h-[1.5px]"
                      style={{ backgroundColor: palette.coverAccent }}
                    />
                  </div>

                  {/* Frase / Slogan en tipografía Dancing Script */}
                  <p
                    className="font-dancing text-2xl sm:text-3xl lg:text-5xl leading-tight font-medium max-w-lg drop-shadow-sm px-2"
                    style={{ color: palette.coverText }}
                  >
                    {coverSubtitle}
                  </p>

                  {/* Si está en mesa: Chip identificador de mesa */}
                  {liveTable && (
                    <div className="pt-0.5 sm:pt-1">
                      <div
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-marcellus uppercase tracking-widest border shadow-xl backdrop-blur-md"
                        style={{
                          backgroundColor: liveTable.isInitiated
                            ? 'rgba(16, 185, 129, 0.22)'
                            : hexToRgba(palette.coverAccent, 0.18),
                          borderColor: liveTable.isInitiated ? '#10B981' : palette.coverAccent,
                          color: liveTable.isInitiated ? '#A7F3D0' : palette.coverText,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full animate-ping"
                          style={{
                            backgroundColor: liveTable.isInitiated
                              ? '#10B981'
                              : palette.coverAccent,
                          }}
                        />
                        <span className="font-semibold text-[11px] sm:text-xs">Mesa {liveTable.name}</span>
                        {liveTable.area && (
                          <span className="opacity-75 text-[10px] sm:text-xs">({liveTable.area})</span>
                        )}
                        <span className="text-[9px] sm:text-[10px] opacity-80 pl-1 border-l border-white/20">
                          {liveTable.isInitiated ? 'Abierta' : 'En espera'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Botón Ver menú y redes para DESKTOP (en móvil va debajo del cuadro de especiales) */}
                  <div className="hidden lg:flex w-full flex-col items-center justify-center pt-3 sm:pt-5 space-y-3">
                    <button
                      type="button"
                      onClick={scrollToBar}
                      className="group flex flex-col items-center gap-2.5 cursor-pointer text-xs font-marcellus uppercase tracking-[0.3em] transition-opacity hover:opacity-100"
                      style={{
                        color: palette.coverText,
                      }}
                    >
                      <span className="opacity-85 group-hover:opacity-100 transition-opacity">Ver menú</span>
                      <i
                        className="block w-[1.5px] h-10 animate-drip"
                        style={{
                          background: `linear-gradient(to bottom, ${palette.coverText}, transparent)`,
                        }}
                      />
                    </button>

                    {/* Redes sociales sutiles en Hero Desktop */}
                    {hasAnySocial && (
                      <div className="flex items-center justify-center gap-2 pt-1">
                        {instagramLink && (
                          <a
                            href={instagramLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            title="Instagram"
                            className="w-8 h-8 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                            style={{
                              borderColor: hexToRgba(palette.coverAccent, 0.45),
                              backgroundColor: hexToRgba(palette.cover, 0.55),
                              color: palette.coverText,
                            }}
                          >
                            <InstagramIcon className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {facebookLink && (
                          <a
                            href={facebookLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            title="Facebook"
                            className="w-8 h-8 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                            style={{
                              borderColor: hexToRgba(palette.coverAccent, 0.45),
                              backgroundColor: hexToRgba(palette.cover, 0.55),
                              color: palette.coverText,
                            }}
                          >
                            <FacebookIcon className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {tiktokLink && (
                          <a
                            href={tiktokLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="TikTok"
                            title="TikTok"
                            className="w-8 h-8 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                            style={{
                              borderColor: hexToRgba(palette.coverAccent, 0.45),
                              backgroundColor: hexToRgba(palette.cover, 0.55),
                              color: palette.coverText,
                            }}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.74 4.54 6.26 6.26 0 0 0 1.95-4.55V8.1a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.87-.47v.94z" />
                            </svg>
                          </a>
                        )}
                        {whatsappLink && (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="WhatsApp"
                            title="WhatsApp"
                            className="w-8 h-8 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                            style={{
                              borderColor: hexToRgba(palette.coverAccent, 0.45),
                              backgroundColor: hexToRgba(palette.cover, 0.55),
                              color: palette.coverText,
                            }}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {mapsLink && (
                          <a
                            href={mapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Ubicación"
                            title="Ubicación"
                            className="w-8 h-8 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                            style={{
                              borderColor: hexToRgba(palette.coverAccent, 0.45),
                              backgroundColor: hexToRgba(palette.cover, 0.55),
                              color: palette.coverText,
                            }}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ---------------------------------------------------- */}
                {/* COLUMNA DERECHA: CUADRO VENTANA DE ESPECIALES        */}
                {/* ---------------------------------------------------- */}
                <div className="w-full lg:col-span-6 flex justify-center lg:justify-end">
                  <div
                    className="relative w-full max-w-[240px] sm:max-w-[300px] lg:max-w-[420px] aspect-[4/4.8] lg:aspect-[3/4.2] max-h-[35vh] sm:max-h-[42vh] lg:max-h-none overflow-hidden shadow-2xl border cursor-pointer will-change-transform rounded-[28px] lg:rounded-none"
                    style={{
                      borderRadius: `${28 + heroProgress * 164}px ${28 + heroProgress * 164}px 24px 24px`,
                      transform: `scale(${Math.max(0.88, 1 - heroProgress * 0.1)})`,
                      borderColor: hexToRgba(palette.coverAccent, 0.32),
                      backgroundColor: hexToRgba(palette.cover, 0.45),
                      transition: 'border-radius 0.05s ease-out, transform 0.05s ease-out',
                    }}
                    onClick={() => {
                      if (specialProducts[activeSpecialIndex]) {
                        handleOpenProduct(specialProducts[activeSpecialIndex])
                      }
                    }}
                    title={
                      specialProducts[activeSpecialIndex]
                        ? `Ver ${specialProducts[activeSpecialIndex].name}`
                        : undefined
                    }
                  >
                    {/* Carrusel crossfade de imágenes de los especiales */}
                    {specialProducts.map((special, sIdx) => {
                      const isCurrent = sIdx === activeSpecialIndex
                      if (!special.imageUrl) return null
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={special.id}
                          src={special.imageUrl}
                          alt={special.name}
                          className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                            isCurrent
                              ? 'opacity-100 scale-100'
                              : 'opacity-0 scale-105 pointer-events-none'
                          }`}
                        />
                      )
                    })}

                    {/* Sutil halo y borde interior de luz (estilo ventana Alevan) */}
                    <div
                      className="absolute inset-0 pointer-events-none rounded-[inherit]"
                      style={{
                        boxShadow:
                          'inset 0 0 0 1px rgba(255, 255, 255, 0.14), inset 0 0 35px rgba(0, 0, 0, 0.3)',
                      }}
                    />
                  </div>
                </div>

                {/* BOTÓN VER MENÚ Y REDES PARA MÓVIL (debajo del cuadro interactivo) */}
                <div className="w-full flex lg:hidden flex-col items-center justify-center pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={scrollToBar}
                    className="group flex flex-col items-center gap-1.5 cursor-pointer text-xs font-marcellus uppercase tracking-[0.25em] transition-opacity hover:opacity-100 active:scale-95"
                    style={{
                      color: palette.coverText,
                    }}
                  >
                    <span className="opacity-90 group-hover:opacity-100 transition-opacity text-[11px]">Ver menú</span>
                    <i
                      className="block w-[1.5px] h-7 animate-drip"
                      style={{
                        background: `linear-gradient(to bottom, ${palette.coverText}, transparent)`,
                      }}
                    />
                  </button>

                  {/* Redes sociales en móvil */}
                  {hasAnySocial && (
                    <div className="flex items-center justify-center gap-2 pt-0.5">
                      {instagramLink && (
                        <a
                          href={instagramLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Instagram"
                          title="Instagram"
                          className="w-7 h-7 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90 cursor-pointer shadow-xs"
                          style={{
                            borderColor: hexToRgba(palette.coverAccent, 0.45),
                            backgroundColor: hexToRgba(palette.cover, 0.55),
                            color: palette.coverText,
                          }}
                        >
                          <InstagramIcon className="w-3 h-3" />
                        </a>
                      )}
                      {facebookLink && (
                        <a
                          href={facebookLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Facebook"
                          title="Facebook"
                          className="w-7 h-7 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90 cursor-pointer shadow-xs"
                          style={{
                            borderColor: hexToRgba(palette.coverAccent, 0.45),
                            backgroundColor: hexToRgba(palette.cover, 0.55),
                            color: palette.coverText,
                          }}
                        >
                          <FacebookIcon className="w-3 h-3" />
                        </a>
                      )}
                      {tiktokLink && (
                        <a
                          href={tiktokLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="TikTok"
                          title="TikTok"
                          className="w-7 h-7 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90 cursor-pointer shadow-xs"
                          style={{
                            borderColor: hexToRgba(palette.coverAccent, 0.45),
                            backgroundColor: hexToRgba(palette.cover, 0.55),
                            color: palette.coverText,
                          }}
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.74 4.54 6.26 6.26 0 0 0 1.95-4.55V8.1a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.87-.47v.94z" />
                          </svg>
                        </a>
                      )}
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="WhatsApp"
                          title="WhatsApp"
                          className="w-7 h-7 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90 cursor-pointer shadow-xs"
                          style={{
                            borderColor: hexToRgba(palette.coverAccent, 0.45),
                            backgroundColor: hexToRgba(palette.cover, 0.55),
                            color: palette.coverText,
                          }}
                        >
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      )}
                      {mapsLink && (
                        <a
                          href={mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Ubicación"
                          title="Ubicación"
                          className="w-7 h-7 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90 cursor-pointer shadow-xs"
                          style={{
                            borderColor: hexToRgba(palette.coverAccent, 0.45),
                            backgroundColor: hexToRgba(palette.cover, 0.55),
                            color: palette.coverText,
                          }}
                        >
                          <MapPin className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Caso sin imágenes: Vista centrada limpia */
              <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-6">
                {business.logoUrl || business.isotypeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={business.logoUrl || business.isotypeUrl || ''}
                    alt={business.name}
                    className="w-auto h-24 sm:h-32 md:h-36 max-w-[min(85vw,380px)] object-contain drop-shadow-2xl"
                  />
                ) : (
                  <h1
                    className="text-4xl sm:text-6xl md:text-7xl font-bodoni italic tracking-tight drop-shadow-xl"
                    style={{ color: palette.coverText }}
                  >
                    {business.name}
                  </h1>
                )}

                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-[1.5px]"
                    style={{ backgroundColor: palette.coverAccent }}
                  />
                  <p
                    className="font-marcellus text-xs sm:text-sm tracking-[0.28em] uppercase font-medium"
                    style={{ color: palette.coverAccent }}
                  >
                    {coverTitle}
                  </p>
                  <span
                    className="w-8 h-[1.5px]"
                    style={{ backgroundColor: palette.coverAccent }}
                  />
                </div>

                <p
                  className="font-dancing text-3xl sm:text-4xl lg:text-5xl leading-tight font-medium drop-shadow-sm max-w-xl"
                  style={{ color: palette.coverText }}
                >
                  {coverSubtitle}
                </p>

                {liveTable && (
                  <div className="pt-1">
                    <div
                      className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-marcellus uppercase tracking-widest border shadow-xl backdrop-blur-md"
                      style={{
                        backgroundColor: liveTable.isInitiated
                          ? 'rgba(16, 185, 129, 0.22)'
                          : hexToRgba(palette.coverAccent, 0.18),
                        borderColor: liveTable.isInitiated ? '#10B981' : palette.coverAccent,
                        color: liveTable.isInitiated ? '#A7F3D0' : palette.coverText,
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full animate-ping"
                        style={{
                          backgroundColor: liveTable.isInitiated
                            ? '#10B981'
                            : palette.coverAccent,
                        }}
                      />
                      <span className="font-semibold">Mesa {liveTable.name}</span>
                      {liveTable.area && (
                        <span className="opacity-75">({liveTable.area})</span>
                      )}
                      <span className="text-[10px] opacity-80 pl-1 border-l border-white/20">
                        {liveTable.isInitiated ? 'Abierta' : 'En espera'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Botón Ver menú y línea centradas */}
                <div className="w-full flex flex-col items-center justify-center pt-4 sm:pt-6 space-y-3">
                  <button
                    type="button"
                    onClick={scrollToBar}
                    className="group flex flex-col items-center gap-2.5 cursor-pointer text-xs font-marcellus uppercase tracking-[0.3em] transition-opacity hover:opacity-100"
                    style={{
                      color: palette.coverText,
                    }}
                  >
                    <span className="opacity-85 group-hover:opacity-100 transition-opacity">Ver menú</span>
                    <i
                      className="block w-[1.5px] h-10 animate-drip"
                      style={{
                        background: `linear-gradient(to bottom, ${palette.coverText}, transparent)`,
                      }}
                    />
                  </button>

                  {/* Redes sociales sutiles en Hero */}
                  {hasAnySocial && (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {instagramLink && (
                        <a
                          href={instagramLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Instagram"
                          title="Instagram"
                          className="w-8 h-8 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                          style={{
                            borderColor: hexToRgba(palette.coverAccent, 0.45),
                            backgroundColor: hexToRgba(palette.cover, 0.55),
                            color: palette.coverText,
                          }}
                        >
                          <InstagramIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {facebookLink && (
                        <a
                          href={facebookLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Facebook"
                          title="Facebook"
                          className="w-8 h-8 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                          style={{
                            borderColor: hexToRgba(palette.coverAccent, 0.45),
                            backgroundColor: hexToRgba(palette.cover, 0.55),
                            color: palette.coverText,
                          }}
                        >
                          <FacebookIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {tiktokLink && (
                        <a
                          href={tiktokLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="TikTok"
                          title="TikTok"
                          className="w-8 h-8 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                          style={{
                            borderColor: hexToRgba(palette.coverAccent, 0.45),
                            backgroundColor: hexToRgba(palette.cover, 0.55),
                            color: palette.coverText,
                          }}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.74 4.54 6.26 6.26 0 0 0 1.95-4.55V8.1a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.87-.47v.94z" />
                          </svg>
                        </a>
                      )}
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="WhatsApp"
                          title="WhatsApp"
                          className="w-8 h-8 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                          style={{
                            borderColor: hexToRgba(palette.coverAccent, 0.45),
                            backgroundColor: hexToRgba(palette.cover, 0.55),
                            color: palette.coverText,
                          }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {mapsLink && (
                        <a
                          href={mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Ubicación"
                          title="Ubicación"
                          className="w-8 h-8 rounded-full border flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                          style={{
                            borderColor: hexToRgba(palette.coverAccent, 0.45),
                            backgroundColor: hexToRgba(palette.cover, 0.55),
                            color: palette.coverText,
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. STICKY HEADER DE ALEVAN (.bar con chips y progreso)   */}
      {/* ======================================================== */}
      <nav
        id="bar"
        className="sticky top-0 z-40 w-full border-b transition-colors duration-200"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: palette.navBg,
          backdropFilter: 'saturate(1.2) blur(14px)',
          WebkitBackdropFilter: 'saturate(1.2) blur(14px)',
          borderColor: palette.line,
        }}
      >
        {/* Fila Superior: Logo + Enlaces y Llamada a Mesero */}
        <div className="max-w-[1120px] mx-auto px-3.5 sm:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
          <a
            href="#top"
            className="flex items-center gap-2 text-inherit no-underline cursor-pointer group shrink-0"
          >
            {business.logoUrl || business.isotypeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl || business.isotypeUrl || ''}
                alt={business.name}
                className="h-6 sm:h-8 w-auto max-w-[95px] sm:max-w-[110px] object-contain drop-shadow-xs"
              />
            ) : (
              <span
                className="font-bodoni italic text-lg sm:text-xl font-bold tracking-tight"
                style={{ color: palette.text }}
              >
                {business.name}
              </span>
            )}
          </a>

          {/* Botones de acción circular de Alevan (Redes sociales y utilidades) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {liveTable && (
              <button
                type="button"
                onClick={handleCallWaiter}
                disabled={isCallingWaiter || waiterCalled}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-marcellus tracking-wider uppercase border transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                style={{
                  backgroundColor: waiterCalled ? '#10B981' : palette.tint,
                  borderColor: waiterCalled ? '#10B981' : palette.accent,
                  color: waiterCalled ? '#FFFFFF' : palette.text,
                }}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {waiterCalled ? 'Mesero Notificado' : isCallingWaiter ? 'Llamando...' : 'Llamar Mesero'}
                </span>
              </button>
            )}

            {/* Redes sociales secundarias (en móvil se ocultan para dar prioridad a contacto directo) */}
            {instagramLink && (
              <a
                href={instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Síguenos en Instagram"
                className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 rounded-full border items-center justify-center transition-all cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95 shadow-xs"
                style={{
                  backgroundColor: palette.tint,
                  borderColor: palette.line,
                  color: palette.text,
                }}
              >
                <InstagramIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            )}

            {facebookLink && (
              <a
                href={facebookLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                title="Síguenos en Facebook"
                className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 rounded-full border items-center justify-center transition-all cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95 shadow-xs"
                style={{
                  backgroundColor: palette.tint,
                  borderColor: palette.line,
                  color: palette.text,
                }}
              >
                <FacebookIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            )}

            {tiktokLink && (
              <a
                href={tiktokLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                title="Síguenos en TikTok"
                className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 rounded-full border items-center justify-center transition-all cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95 shadow-xs"
                style={{
                  backgroundColor: palette.tint,
                  borderColor: palette.line,
                  color: palette.text,
                }}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.74 4.54 6.26 6.26 0 0 0 1.95-4.55V8.1a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.87-.47v.94z" />
                </svg>
              </a>
            )}

            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                title="Escríbenos por WhatsApp"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95 shadow-xs"
                style={{
                  backgroundColor: palette.tint,
                  borderColor: palette.line,
                  color: palette.text,
                }}
              >
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            )}

            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ubicación en Google Maps"
                title="Cómo llegar (Google Maps)"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95 shadow-xs"
                style={{
                  backgroundColor: palette.tint,
                  borderColor: palette.line,
                  color: palette.text,
                }}
              >
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              aria-label="Información y Horarios"
              title="Información y Horarios"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95 shadow-xs"
              style={{
                backgroundColor: palette.tint,
                borderColor: palette.line,
                color: palette.text,
              }}
            >
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Fila Inferior: Chips de Categorías scrolleables (.chips de Alevan) */}
        <div className="relative max-w-[1120px] mx-auto">
          <div
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3.5 sm:px-8 py-2 scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <button
              type="button"
              onClick={(e) => {
                setSelectedCategoryId('all')
                e.currentTarget.scrollIntoView({ inline: 'center', behavior: 'smooth' })
              }}
              className="flex-shrink-0 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-[12px] font-marcellus tracking-[0.14em] uppercase transition-all cursor-pointer active:scale-95"
              style={{
                backgroundColor: selectedCategoryId === 'all' ? palette.text : 'transparent',
                color: selectedCategoryId === 'all' ? palette.paper : palette.muted,
              }}
            >
              Toda la Carta
            </button>

            {categories.map((cat) => {
              const isOn = selectedCategoryId === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={(e) => {
                    scrollToCategory(cat.id)
                    e.currentTarget.scrollIntoView({ inline: 'center', behavior: 'smooth' })
                  }}
                  className="flex-shrink-0 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-[12px] font-marcellus tracking-[0.14em] uppercase transition-all cursor-pointer active:scale-95"
                  style={{
                    backgroundColor: isOn ? palette.text : 'transparent',
                    color: isOn ? palette.paper : palette.muted,
                  }}
                >
                  {cat.name}
                </button>
              )
            })}

            {/* Mini buscador minimalista dentro del chip rail */}
            <div className="ml-auto relative flex-shrink-0 w-28 sm:w-48 pl-2">
              <Search
                className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
                style={{ color: palette.text }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-7 pr-3 py-1.5 rounded-full text-xs outline-none border transition-all"
                style={{
                  backgroundColor: palette.cardBg,
                  borderColor: palette.line,
                  color: palette.text,
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100"
                  style={{ color: palette.text }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Línea de progreso de lectura roja/rosa de Alevan (.progress) */}
        <span
          className="block h-[2px] transition-all duration-150 ease-out"
          style={{
            backgroundColor: palette.accent,
            width: `${scrollPercent}%`,
          }}
        />
      </nav>

      {/* ======================================================== */}
      {/* 3. SECCIÓN INTRO DE ALEVAN (.intro + .duo)               */}
      {/* ======================================================== */}
      <section
        className="py-12 sm:py-20 max-w-[1120px] mx-auto px-4 sm:px-8 border-b"
        style={{ borderColor: palette.line }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Texto de Bienvenida */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <p
              className="font-script text-3xl sm:text-4xl m-0"
              style={{ color: palette.accent }}
            >
              Where coffee &amp; moments meet
            </p>
            <h2
              className="font-bodoni italic text-4xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight m-0"
              style={{ color: palette.text }}
            >
              Café y gastronomía artesanal en un mismo lugar.
            </h2>
            <p
              className="text-base leading-relaxed max-w-xl"
              style={{ color: palette.muted }}
            >
              Granos de altura 100% arábica seleccionados con pasión, infusionados con maestría y
              acompañados de horneado diario para consentir tus sentidos.
            </p>

            {/* Botones píldora de Alevan (.btn.solid y .btn.ghost) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#menu-sections"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-marcellus uppercase tracking-[0.16em] transition-all shadow-sm cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: palette.text,
                  color: palette.paper,
                }}
              >
                <span>Explorar la Carta</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>

              {address && (
                <button
                  type="button"
                  onClick={() => setShowInfoModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-marcellus uppercase tracking-[0.16em] transition-all border cursor-pointer hover:opacity-85"
                  style={{
                    borderColor: palette.text,
                    color: palette.text,
                    backgroundColor: 'transparent',
                  }}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Cómo llegar</span>
                </button>
              )}
            </div>
          </div>

          {/* Dúo Fotográfico con Arcos (.duo de Alevan) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[380px] pb-10">
              {/* Foto grande con arco (.duo-big) */}
              <div
                className="w-[82%] ml-auto aspect-[3/4.2] rounded-[24px] overflow-hidden shadow-2xl relative"
                style={{ backgroundColor: palette.tint }}
              >
                {introDuoProducts[0]?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={introDuoProducts[0].imageUrl}
                    alt={introDuoProducts[0].name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 opacity-40">
                    <Coffee className="w-12 h-12 mb-1" style={{ color: palette.text }} />
                    <span
                      className="font-marcellus text-xs uppercase tracking-widest"
                      style={{ color: palette.text }}
                    >
                      Especialidad
                    </span>
                  </div>
                )}
              </div>

              {/* Foto pequeña superpuesta (.duo-small) */}
              <div
                className="absolute left-0 bottom-0 w-[50%] aspect-[3/4.1] rounded-[20px] overflow-hidden border-[5px] shadow-2xl"
                style={{
                  backgroundColor: palette.tint,
                  borderColor: palette.paper,
                  boxShadow: `0 18px 40px -18px ${hexToRgba(palette.cover, 0.45)}`,
                }}
              >
                {introDuoProducts[1]?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={introDuoProducts[1].imageUrl}
                    alt={introDuoProducts[1].name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 opacity-40">
                    <Sparkles className="w-8 h-8 mb-1" style={{ color: palette.text }} />
                    <span
                      className="font-marcellus text-[9px] uppercase tracking-widest"
                      style={{ color: palette.text }}
                    >
                      Artesanal
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. SECCIONES DE CATEGORÍAS (.sec DE ALEVAN)              */}
      {/* ======================================================== */}
      <main id="menu-sections" className="scroll-mt-28 max-w-[1120px] mx-auto px-4 sm:px-8 py-8 space-y-20">
        {filteredCategories.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Coffee className="w-12 h-12 mx-auto opacity-30" style={{ color: palette.text }} />
            <p className="font-bodoni italic text-2xl" style={{ color: palette.text }}>
              No se encontraron opciones
            </p>
            <p className="text-sm" style={{ color: palette.muted }}>
              Intenta con otra palabra o categoría.
            </p>
          </div>
        ) : (
          filteredCategories.map((category, catIndex) => {
            const lower = category.name.toLowerCase()

            // Kicker temático barista por categoría (estilo Alevan)
            const kicker = (() => {
              if (lower.includes('caliente') || lower.includes('café') || lower.includes('cafe') || lower.includes('espresso') || lower.includes('latte')) return 'Brew'
              if (lower.includes('fría') || lower.includes('fria') || lower.includes('frapp') || lower.includes('cold') || lower.includes('ice')) return 'Frío'
              if (lower.includes('smoothie') || lower.includes('bowl') || lower.includes('tisana') || lower.includes('té') || lower.includes('te')) return 'Fresh'
              if (lower.includes('salado') || lower.includes('comida') || lower.includes('bagel') || lower.includes('panini')) return 'Antojo'
              if (lower.includes('postre') || lower.includes('pan') || lower.includes('crepa') || lower.includes('reposter')) return 'Horno & Dulce'
              return 'Especialidad'
            })()

            // Nota contextual
            const note = (() => {
              if (lower.includes('café') || lower.includes('cafe') || lower.includes('espresso')) {
                return 'Extracciones con grano 100% arábica de especialidad • Caliente o en las rocas'
              }
              if (lower.includes('fría') || lower.includes('fria') || lower.includes('frapp')) {
                return 'Bebidas batidas al momento • Opciones con leche entera, deslactosada o vegetal'
              }
              if (lower.includes('reposter') || lower.includes('pan') || lower.includes('postre') || lower.includes('crepa')) {
                return 'Elaboración artesanal diaria con mantequilla pura e ingredientes frescos'
              }
              return 'Recetas de autor elaboradas con insumos frescos al momento'
            })()

            // Fotos representativas de la categoría para el rail de arcos
            const categoryPhotos = category.products.filter((p) => p.imageUrl)
            const railPhotos = categoryPhotos.slice(0, 2)

            return (
              <React.Fragment key={category.id}>
                {/* BANNER INTERMEDIO FOOD BREAK DE ALEVAN (ENTRE CIERTAS CATEGORÍAS) */}
                {catIndex === 2 && (
                  <div
                    className="-mx-4 sm:-mx-8 my-16 py-14 sm:py-20 text-center overflow-hidden"
                    style={{
                      backgroundColor: palette.cover,
                      color: palette.coverText,
                    }}
                  >
                    <div className="max-w-2xl mx-auto px-4 space-y-2">
                      <p
                        className="font-script text-4xl sm:text-6xl m-0"
                        style={{ color: palette.coverAccent }}
                      >
                        y para deleitar
                      </p>
                      <p
                        className="font-bodoni italic text-2xl sm:text-4xl leading-tight m-0"
                        style={{ color: palette.coverText }}
                      >
                        Salado, dulce y lo que sale del horno artesanal.
                      </p>
                    </div>
                  </div>
                )}

                <section id={`cat-${category.id}`} className="scroll-mt-24 sm:scroll-mt-28 space-y-6 sm:space-y-8">
                  {/* Encabezado de Sección (.sec-head de Alevan) */}
                  <header
                    className="space-y-1 text-left border-b pb-3 sm:pb-4"
                    style={{ borderColor: palette.line }}
                  >
                    <p
                      className="font-script text-2xl sm:text-4xl m-0"
                      style={{ color: palette.accent }}
                    >
                      {kicker}
                    </p>
                    <h2
                      className="font-bodoni italic text-3xl sm:text-5xl lg:text-7xl font-normal leading-[1.05] tracking-tight m-0"
                      style={{ color: palette.text }}
                    >
                      {category.name}
                    </h2>
                    <p
                      className="text-xs sm:text-base max-w-xl pt-1"
                      style={{ color: palette.muted }}
                    >
                      {note}
                    </p>
                  </header>

                  {/* Cuerpo de Sección (.sec-body de Alevan) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-14 items-start">
                    {/* EN MÓVIL: Carrusel horizontal compacto de platillos con foto */}
                    {railPhotos.length > 0 && (
                      <div className="lg:hidden w-full overflow-x-auto no-scrollbar pb-2 pt-0.5 -mx-1 px-1 flex gap-3">
                        {railPhotos.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleOpenProduct(item)}
                            className="flex-shrink-0 w-36 h-28 rounded-2xl overflow-hidden relative shadow-md border cursor-pointer active:scale-95 transition-transform"
                            style={{
                              borderColor: palette.line,
                              backgroundColor: palette.cardBg,
                            }}
                          >
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-30">
                                <Coffee className="w-6 h-6" style={{ color: palette.text }} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-2.5 text-left pointer-events-none">
                              <span className="text-[11px] font-marcellus text-white font-medium uppercase tracking-wider truncate">
                                {item.name}
                              </span>
                              <span className="text-xs font-bodoni text-white/90">
                                ${item.minPrice.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* EN DESKTOP: Rail Fotográfico de Arcos Desfasados (.rail de Alevan) */}
                    {railPhotos.length > 0 && (
                      <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-36 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {railPhotos.map((item, rIdx) => (
                            <figure
                              key={item.id}
                              onClick={() => handleOpenProduct(item)}
                              className={`group cursor-pointer m-0 space-y-2 ${
                                rIdx === 1 ? 'lg:translate-y-10' : ''
                              }`}
                            >
                              <div
                                className="alevan-arch shadow-lg transition-transform duration-500 group-hover:scale-[1.02]"
                                style={{ backgroundColor: palette.tint }}
                              >
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-3 opacity-30 text-center">
                                    <Coffee className="w-8 h-8 mb-1" style={{ color: palette.text }} />
                                    <span
                                      className="font-marcellus text-[9px] uppercase tracking-widest"
                                      style={{ color: palette.text }}
                                    >
                                      Receta
                                    </span>
                                  </div>
                                )}
                              </div>
                              <figcaption
                                className="text-center font-marcellus text-[11px] uppercase tracking-[0.2em] truncate transition-colors"
                                style={{ color: palette.muted }}
                              >
                                {item.name}
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* COLUMNA DERECHA: Lista Editorial de Platillos (.items de Alevan) */}
                    <div
                      className={`${
                        railPhotos.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'
                      } space-y-0`}
                    >
                      {category.products.map((product) => {
                        const hasMulti = product.variants.length > 1

                        return (
                          <div
                            key={product.id}
                            onClick={() => handleOpenProduct(product)}
                            className="py-3.5 sm:py-5 group cursor-pointer transition-all duration-150 rounded-xl px-2.5 -mx-2.5 select-none border-b active:scale-[0.99] active:bg-black/[0.03]"
                            style={{
                              borderColor: palette.line,
                              touchAction: 'manipulation',
                            }}
                          >
                            {/* Fila del Título, Línea Guía Punteada y Precio */}
                            <div className="flex items-baseline justify-between gap-2.5 sm:gap-3">
                              <h4
                                className="font-marcellus text-[14px] sm:text-[17px] uppercase tracking-[0.1em] sm:tracking-[0.12em] font-normal transition-colors m-0"
                                style={{ color: palette.text }}
                              >
                                {product.name}
                              </h4>

                              {/* Línea punteada de guía (.lead de Alevan) */}
                              <span
                                className="flex-1 border-b border-dotted opacity-40 min-w-3 sm:min-w-6"
                                style={{ borderColor: palette.text }}
                              />

                              {/* Precio en Bodoni Moda Tabular (.price de Alevan) */}
                              <div
                                className="shrink-0 text-right font-bodoni text-xl sm:text-2xl font-normal"
                                style={{ color: palette.accent }}
                              >
                                <small className="text-xs mr-0.5 opacity-75">$</small>
                                <span>{product.minPrice.toFixed(0)}</span>
                                {hasMulti && (
                                  <span className="text-[10px] font-marcellus uppercase tracking-widest ml-1 opacity-60">
                                    desde
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Descripción del platillo (.desc de Alevan) */}
                            {product.description && (
                              <p
                                className="text-xs sm:text-sm leading-relaxed mt-1 mb-0 max-w-xl"
                                style={{ color: palette.muted }}
                              >
                                {product.description}
                              </p>
                            )}

                            {/* Ingredientes de la receta */}
                            {product.ingredients && product.ingredients.length > 0 && (
                              <p
                                className="text-[11px] italic font-serif mt-1 mb-0 opacity-85"
                                style={{ color: palette.muted }}
                              >
                                Con: {product.ingredients.join(', ')}
                              </p>
                            )}

                            {/* Variantes de Tamaño (Dot Leaders Secundarios) */}
                            {hasMulti && product.variants.length > 1 && (
                              <div
                                className="mt-2.5 pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs"
                                style={{ borderColor: palette.line }}
                              >
                                {product.variants.map((v) => (
                                  <div
                                    key={v.id}
                                    className="flex items-baseline justify-between"
                                    style={{ color: palette.muted }}
                                  >
                                    <span className="font-marcellus text-[11px] uppercase tracking-wider">
                                      {v.name}
                                    </span>
                                    <span
                                      className="flex-1 mx-2 border-b border-dotted opacity-30"
                                      style={{ borderColor: palette.text }}
                                    />
                                    <span
                                      className="font-bodoni font-normal"
                                      style={{ color: palette.accent }}
                                    >
                                      ${v.price.toFixed(0)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Chips de Modificadores y Sabores */}
                            {product.modifierGroups && product.modifierGroups.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {product.modifierGroups.map((g) => (
                                  <span
                                    key={g.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-marcellus uppercase tracking-wider border"
                                    style={{
                                      backgroundColor: palette.tint,
                                      borderColor: palette.line,
                                      color: palette.text,
                                    }}
                                  >
                                    <span>{g.name}:</span>
                                    <span className="opacity-75">
                                      {g.modifiers.slice(0, 3).map((m) => m.name).join(', ')}
                                      {g.modifiers.length > 3 ? '...' : ''}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              </React.Fragment>
            )
          })
        )}
      </main>

      {/* ======================================================== */}
      {/* 5. FOOTER DE ALEVAN (.foot)                              */}
      {/* ======================================================== */}
      <footer
        className="mt-20 py-16 text-center"
        style={{
          backgroundColor: palette.cover,
          color: palette.coverText,
        }}
      >
        <div className="max-w-[1120px] mx-auto px-4 space-y-6">
          {business.logoUrl || business.isotypeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl || business.isotypeUrl || ''}
              alt={business.name}
              className="w-auto h-16 sm:h-20 max-w-[min(76vw,380px)] mx-auto object-contain drop-shadow"
            />
          ) : (
            <h3
              className="font-bodoni italic text-3xl font-normal"
              style={{ color: palette.coverText }}
            >
              {business.name}
            </h3>
          )}

          <p
            className="font-bodoni italic text-xl sm:text-2xl m-0"
            style={{ color: palette.coverText }}
          >
            Gracias por visitarnos.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-marcellus uppercase tracking-[0.16em] transition-all hover:opacity-90"
                style={{
                  backgroundColor: palette.coverAccent,
                  color: palette.cover,
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp {phone}</span>
              </a>
            )}

            {address && (
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-marcellus uppercase tracking-[0.16em] transition-all border cursor-pointer hover:opacity-85"
                style={{
                  borderColor: hexToRgba(palette.coverText, 0.4),
                  color: palette.coverText,
                  backgroundColor: 'transparent',
                }}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Cómo llegar</span>
              </button>
            )}
          </div>

          <p
            className="font-marcellus text-[11px] leading-relaxed uppercase tracking-[0.24em] max-w-md mx-auto pt-4"
            style={{ color: palette.coverMuted }}
          >
            {business.name} • {address || 'Cafetería de Especialidad'}
            <br />
            {businessHours}
            <br />
            Precios en pesos mexicanos ({business.currency}) con impuestos incluidos.
          </p>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 6. BOTÓN FLOTANTE PARA LLAMAR AL MESERO (SI HAY MESA)    */}
      {/* ======================================================== */}
      {liveTable && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            type="button"
            onClick={handleCallWaiter}
            disabled={isCallingWaiter || waiterCalled}
            style={{
              backgroundColor: waiterCalled ? '#10B981' : palette.text,
              color: palette.paper,
              boxShadow: `0 12px 28px ${hexToRgba(palette.cover, 0.35)}`,
              borderColor: hexToRgba(palette.paper, 0.2),
            }}
            className="px-4 py-3 rounded-full font-marcellus text-xs tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer shadow-xl active:scale-95 border"
          >
            <BellRing className={`w-4 h-4 ${isCallingWaiter ? 'animate-bounce' : ''}`} />
            <span>
              {waiterCalled
                ? '✓ Mesero Notificado'
                : isCallingWaiter
                ? 'Llamando...'
                : `Llamar Mesero (Mesa ${liveTable.name})`}
            </span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. NOTIFICACIONES TOAST FLOTANTES                        */}
      {/* ======================================================== */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4">
        <AnimatePresence>
          {callMessage && (
            <motion.div
              initial={{ y: -20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              className="pointer-events-auto px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs border"
              style={{
                backgroundColor: palette.cover,
                color: palette.coverText,
                borderColor: hexToRgba(palette.accent, 0.5),
              }}
            >
              <BellRing className="w-4 h-4 shrink-0" style={{ color: palette.coverAccent }} />
              <span className="font-medium">{callMessage}</span>
            </motion.div>
          )}

          {orderToast && (
            <motion.div
              initial={{ y: -20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              className={`pointer-events-auto px-4 py-3 rounded-2xl text-white border shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs ${
                orderToast.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500/50'
                  : 'bg-rose-950/95 border-rose-500/50'
              }`}
            >
              {orderToast.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{orderToast.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ======================================================== */}
      {/* 8. MODAL DE PRODUCTO / PERSONALIZACIÓN Y COMANDA         */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            key="product-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedProduct(null)}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              key="product-modal-content"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[92dvh] sm:max-h-[85vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col shadow-2xl border"
              style={{
                backgroundColor: palette.paper,
                borderColor: palette.line,
                color: palette.text,
              }}
            >
              {/* Tirador táctil móvil */}
              <div className="w-12 h-1.5 rounded-full bg-current opacity-25 mx-auto my-2.5 sm:hidden shrink-0" />

              {/* Imagen con arco en cabecera */}
              <div
                className="relative w-full h-40 sm:h-60 shrink-0 overflow-hidden"
                style={{ backgroundColor: palette.tint }}
              >
                {selectedProduct.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                    <Coffee className="w-16 h-16 mb-2" style={{ color: palette.text }} />
                    <span
                      className="font-marcellus text-xs uppercase tracking-widest"
                      style={{ color: palette.text }}
                    >
                      Receta de la Casa
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center cursor-pointer hover:bg-black/75 active:scale-90 transition-all shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido scrolleable con contención de sobre-scroll táctil */}
              <div
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-left"
                style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
              >
                <div>
                  <h3
                    className="font-bodoni italic text-2xl sm:text-4xl leading-tight m-0"
                    style={{ color: palette.text }}
                  >
                    {selectedProduct.name}
                  </h3>
                  {selectedProduct.description && (
                    <p
                      className="text-xs sm:text-sm mt-1 leading-relaxed"
                      style={{ color: palette.muted }}
                    >
                      {selectedProduct.description}
                    </p>
                  )}
                  {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
                    <p
                      className="text-xs italic font-serif mt-1"
                      style={{ color: palette.muted }}
                    >
                      Con: {selectedProduct.ingredients.join(', ')}
                    </p>
                  )}
                </div>

                {/* Tamaños / Presentaciones */}
                {selectedProduct.variants.length > 1 && (
                  <div className="space-y-2">
                    <label
                      className="text-xs font-marcellus uppercase tracking-wider block"
                      style={{ color: palette.text }}
                    >
                      Tamaño / Presentación:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedProduct.variants.map((v) => {
                        const isSelected = selectedVariant?.id === v.id
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariant(v)}
                            className="p-2.5 sm:p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col justify-center active:scale-95"
                            style={{
                              backgroundColor: isSelected ? palette.text : palette.cardBg,
                              borderColor: isSelected ? palette.text : palette.line,
                              color: isSelected ? palette.paper : palette.text,
                            }}
                          >
                            <span className="font-marcellus text-xs font-bold block">{v.name}</span>
                            <span className="font-bodoni text-sm mt-0.5">${v.price.toFixed(0)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Modificadores */}
                {selectedProduct.modifierGroups && selectedProduct.modifierGroups.length > 0 && (
                  <div className="space-y-4 pt-1">
                    {selectedProduct.modifierGroups.map((group) => (
                      <div key={group.id} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className="font-marcellus uppercase tracking-wider font-bold"
                            style={{ color: palette.text }}
                          >
                            {group.name}
                          </span>
                          <span className="text-[10px]" style={{ color: palette.muted }}>
                            {group.isRequired ? 'Obligatorio' : 'Opcional'} • Máx {group.maxSelect}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.modifiers.map((mod) => {
                            const isChecked = selectedModifiers[group.id]?.includes(mod.id)
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => handleToggleModifier(group.id, mod.id, group.maxSelect)}
                                className="p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer active:scale-95"
                                style={{
                                  backgroundColor: isChecked ? palette.tint : palette.cardBg,
                                  borderColor: isChecked ? palette.accent : palette.line,
                                  color: palette.text,
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]"
                                    style={{
                                      borderColor: isChecked ? palette.text : palette.line,
                                      backgroundColor: isChecked ? palette.text : 'transparent',
                                      color: palette.paper,
                                    }}
                                  >
                                    {isChecked && '✓'}
                                  </div>
                                  <span className="font-medium">{mod.name}</span>
                                </div>
                                {mod.extraPrice > 0 && (
                                  <span
                                    className="font-bodoni font-bold"
                                    style={{ color: palette.accent }}
                                  >
                                    +${mod.extraPrice.toFixed(0)}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Instrucciones de cocina (font-size 16px en móvil para evitar zoom en iOS) */}
                {liveTable && (
                  <div className="space-y-1.5 pt-1">
                    <label
                      className="text-[11px] font-marcellus uppercase tracking-wider block"
                      style={{ color: palette.muted }}
                    >
                      Instrucciones para cocina (opcional):
                    </label>
                    <input
                      type="text"
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      placeholder="Ej: Sin azúcar, leche de almendras, salsa aparte..."
                      className="w-full px-3.5 py-2.5 rounded-xl border text-[16px] sm:text-xs outline-none transition-all"
                      style={{
                        backgroundColor: palette.cardBg,
                        borderColor: palette.line,
                        color: palette.text,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Pie de modal con precio y comanda (safe-area inferior para celulares) */}
              <div
                className="p-4 sm:p-5 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0"
                style={{
                  borderColor: palette.line,
                  backgroundColor: palette.modalFooterBg,
                  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                }}
              >
                <div className="flex items-center justify-between sm:block text-left">
                  <span
                    className="text-[10px] font-marcellus uppercase tracking-widest block"
                    style={{ color: palette.muted }}
                  >
                    Total
                  </span>
                  <strong
                    className="text-2xl font-bodoni font-normal"
                    style={{ color: palette.text }}
                  >
                    ${currentTotalPrice.toFixed(0)} {business.currency}
                  </strong>
                </div>

                {liveTable ? (
                  !liveTable.isInitiated ? (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCallWaiter}
                        disabled={isCallingWaiter || waiterCalled}
                        style={{
                          backgroundColor: waiterCalled ? '#10B981' : palette.text,
                          color: palette.paper,
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-full font-marcellus text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        <span>{waiterCalled ? '✓ Llamado Enviado' : isCallingWaiter ? 'Llamando...' : 'Llamar Mesero'}</span>
                      </button>
                      <button
                        type="button"
                        disabled
                        className="w-full sm:w-auto px-4 py-2.5 rounded-full font-marcellus text-xs uppercase tracking-wider opacity-60 cursor-not-allowed border"
                        style={{
                          borderColor: palette.line,
                          color: palette.muted,
                        }}
                      >
                        🔒 Mesa no iniciada
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="px-4 py-2.5 rounded-full border text-xs font-marcellus uppercase tracking-wider cursor-pointer active:scale-95"
                        style={{
                          borderColor: palette.line,
                          color: palette.text,
                        }}
                      >
                        Volver
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOrder}
                        disabled={isSubmittingOrder}
                        style={{
                          backgroundColor: palette.text,
                          color: palette.paper,
                        }}
                        className="flex-1 sm:flex-initial px-6 py-2.5 rounded-full font-marcellus text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        {isSubmittingOrder ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Ordenar a Mesa {liveTable.name}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    style={{
                      backgroundColor: palette.text,
                      color: palette.paper,
                    }}
                    className="px-6 py-2.5 rounded-full font-marcellus text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    Volver al Menú
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 9. MODAL DE UBICACIÓN & CONTACTO                         */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            key="info-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInfoModal(false)}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              key="info-modal-content"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] p-6 space-y-5 shadow-2xl relative border text-left"
              style={{
                backgroundColor: palette.paper,
                borderColor: palette.line,
                color: palette.text,
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
              }}
            >
              {/* Tirador táctil móvil */}
              <div className="w-12 h-1.5 rounded-full bg-current opacity-25 mx-auto -mt-2 mb-3 sm:hidden" />

              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full opacity-60 hover:opacity-100 cursor-pointer active:scale-90"
                style={{ color: palette.text }}
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3
                  className="font-bodoni italic text-2xl m-0"
                  style={{ color: palette.text }}
                >
                  {business.name}
                </h3>
                <p
                  className="font-marcellus text-xs uppercase tracking-widest mt-1"
                  style={{ color: palette.muted }}
                >
                  Horarios &amp; Ubicación
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div
                  className="flex items-start gap-3 p-3.5 rounded-2xl border"
                  style={{
                    backgroundColor: palette.cardBg,
                    borderColor: palette.line,
                  }}
                >
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: palette.accent }} />
                  <div>
                    <strong
                      className="block font-marcellus uppercase tracking-wider mb-0.5"
                      style={{ color: palette.text }}
                    >
                      Horario de Servicio
                    </strong>
                    <span style={{ color: palette.muted }}>{businessHours}</span>
                  </div>
                </div>

                {address && (
                  <div
                    className="flex items-start gap-3 p-3.5 rounded-2xl border"
                    style={{
                      backgroundColor: palette.cardBg,
                      borderColor: palette.line,
                    }}
                  >
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: palette.accent }} />
                    <div>
                      <strong
                        className="block font-marcellus uppercase tracking-wider mb-0.5"
                        style={{ color: palette.text }}
                      >
                        Ubicación
                      </strong>
                      <span style={{ color: palette.muted }}>{address}</span>
                    </div>
                  </div>
                )}

                {phone && (
                  <div
                    className="flex items-start gap-3 p-3.5 rounded-2xl border"
                    style={{
                      backgroundColor: palette.cardBg,
                      borderColor: palette.line,
                    }}
                  >
                    <Phone className="w-4 h-4 shrink-0 mt-0.5" style={{ color: palette.accent }} />
                    <div>
                      <strong
                        className="block font-marcellus uppercase tracking-wider mb-0.5"
                        style={{ color: palette.text }}
                      >
                        Teléfono / Pedidos
                      </strong>
                      <span style={{ color: palette.muted }}>{phone}</span>
                    </div>
                  </div>
                )}

                {/* Redes Sociales en el Modal */}
                {hasAnySocial && (
                  <div
                    className="p-3.5 rounded-2xl border space-y-2.5"
                    style={{
                      backgroundColor: palette.cardBg,
                      borderColor: palette.line,
                    }}
                  >
                    <strong
                      className="block font-marcellus uppercase tracking-wider text-[11px]"
                      style={{ color: palette.text }}
                    >
                      Síguenos en Redes Sociales
                    </strong>
                    <div className="flex flex-wrap items-center gap-2">
                      {instagramLink && (
                        <a
                          href={instagramLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all hover:scale-105 active:scale-95"
                          style={{
                            borderColor: palette.line,
                            backgroundColor: palette.paper,
                            color: palette.text,
                          }}
                        >
                          <InstagramIcon className="w-3.5 h-3.5" />
                          <span>Instagram</span>
                        </a>
                      )}
                      {facebookLink && (
                        <a
                          href={facebookLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all hover:scale-105 active:scale-95"
                          style={{
                            borderColor: palette.line,
                            backgroundColor: palette.paper,
                            color: palette.text,
                          }}
                        >
                          <FacebookIcon className="w-3.5 h-3.5" />
                          <span>Facebook</span>
                        </a>
                      )}
                      {tiktokLink && (
                        <a
                          href={tiktokLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all hover:scale-105 active:scale-95"
                          style={{
                            borderColor: palette.line,
                            backgroundColor: palette.paper,
                            color: palette.text,
                          }}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.74 4.54 6.26 6.26 0 0 0 1.95-4.55V8.1a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.87-.47v.94z" />
                          </svg>
                          <span>TikTok</span>
                        </a>
                      )}
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all hover:scale-105 active:scale-95"
                          style={{
                            borderColor: palette.line,
                            backgroundColor: palette.paper,
                            color: palette.text,
                          }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {mapsLink && (
                        <a
                          href={mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all hover:scale-105 active:scale-95"
                          style={{
                            borderColor: palette.line,
                            backgroundColor: palette.paper,
                            color: palette.text,
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Google Maps</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-full py-3 rounded-full font-marcellus text-xs uppercase tracking-widest cursor-pointer transition-all hover:opacity-90"
                style={{
                  backgroundColor: palette.text,
                  color: palette.paper,
                }}
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

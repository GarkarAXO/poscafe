'use client'

import React, { useState, useMemo } from 'react'
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
  Flame,
} from 'lucide-react'
import { isLightColor } from '@/lib/theme-utils'
import {
  CoffeeBeanDivider,
  CrepeDivider,
  CoffeeCupDivider,
  OrganicWaveDivider,
  MokaPotIcon,
  ColdDrinkIcon,
  CoffeeBranchVector,
  CoffeeBeanScatter,
  BestSellerStamp,
} from '@/components/menu-dividers'

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
}

export interface BusinessData {
  id?: string
  name: string
  legalName?: string | null
  logoUrl?: string | null
  isotypeUrl?: string | null
  currency: string
  timezone?: string
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
  // Configuración de colores del Menú
  const coverColor = customColors?.menuCoverColor || business.theme?.menuCoverColor || '#18120F'
  const paperColor = customColors?.menuPaperColor || business.theme?.menuPaperColor || '#FDFBF7'
  const textColor = customColors?.menuTextColor || business.theme?.menuTextColor || '#2C1810'
  const accentColor = customColors?.menuAccentColor || business.theme?.menuAccentColor || '#D4AF37'
  const coverTitle = customColors?.menuCoverTitle || business.theme?.menuCoverTitle || business.name
  const coverSubtitle =
    customColors?.menuCoverSubtitle ||
    business.theme?.menuCoverSubtitle ||
    'Carta de Especialidades & Gastronomía'
  const businessHours = customColors?.businessHours || business.theme?.businessHours || 'Lunes a Domingo: 8:00 AM - 10:00 PM'
  const phone = customColors?.phone || business.theme?.phone || null
  const address = customColors?.address || business.theme?.address || null

  const isCoverLight = isLightColor(coverColor)
  const isPaperLight = isLightColor(paperColor)
  const isAccentLight = isLightColor(accentColor)
  const accentContrastText = isAccentLight ? '#1A110B' : '#FFFFFF'

  // Estados interactivos
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({})
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [waiterCalled, setWaiterCalled] = useState(false)
  const [peelHover, setPeelHover] = useState(false)

  // Encontrar un platillo destacado con imagen para la cubierta
  const featuredProductWithImage = useMemo(() => {
    let found: Product | null = null
    for (const cat of categories) {
      for (const p of cat.products) {
        if (p.imageUrl && (p.isNew || p.isSeasonal)) return p
        if (p.imageUrl && !found) found = p
      }
    }
    return found || categories[0]?.products[0] || null
  }, [categories])

  // Filtrado de productos
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

  const handleCallWaiter = () => {
    setWaiterCalled(true)
    setTimeout(() => setWaiterCalled(false), 5000)
  }

  return (
    <div
      className={`w-full transition-colors duration-300 relative select-none font-sans ${
        isPreview ? 'p-3 sm:p-5 rounded-3xl min-h-full' : 'p-4 sm:p-8 lg:p-12 min-h-screen'
      }`}
      style={{
        backgroundColor: coverColor,
        color: isCoverLight ? '#2B1712' : '#F3E9DC',
      }}
    >
      {/* SUTIL TEXTURA DE FONDO: RESPLANDOR Y MARCAS DE AGUA BOTÁNICAS */}
      <div className={`${isPreview ? 'absolute' : 'fixed'} inset-0 pointer-events-none overflow-hidden select-none`}>
        {/* Resplandores cromáticos */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[170px] opacity-25"
          style={{ backgroundColor: accentColor }}
        />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-[190px] opacity-20"
          style={{ backgroundColor: accentColor }}
        />

        {/* Marcas de agua botánicas y de granos flotantes (Inspiradas en referencias de autor) */}
        <div
          className="absolute top-10 -right-6 opacity-[0.05] transform rotate-12 scale-125 pointer-events-none"
          style={{ color: accentColor }}
        >
          <CoffeeBranchVector className="w-72 h-72" />
        </div>
        <div
          className="absolute bottom-32 -left-8 opacity-[0.04] transform -rotate-45 scale-150 pointer-events-none"
          style={{ color: accentColor }}
        >
          <CoffeeBeanScatter className="w-64 h-64" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10 space-y-12">
        {/* ======================================================== */}
        {/* CABECERA EDITORIAL (SIN NAVBAR): */}
        {/* LOGO LIBRE Y GRANDE A LA IZQUIERDA, PLATILLO ENTRE CUBIERTA A LA DERECHA */}
        {/* ======================================================== */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2 sm:pt-6">
          {/* LADO IZQUIERDO: LOGO LIBRE Y GRANDE, IDENTIDAD Y DETALLES */}
          <div className="md:col-span-6 lg:col-span-7 space-y-5 text-left">
            {/* LOGO LIBRE Y PROTAGONISTA (SIN CUADROS NI ENCIERROS) */}
            <div className="space-y-3">
              {business.logoUrl || business.isotypeUrl ? (
                <div className="relative py-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={business.logoUrl || business.isotypeUrl || ''}
                    alt={business.name}
                    className="h-24 sm:h-28 md:h-32 w-auto max-w-[280px] object-contain drop-shadow-2xl select-none"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 py-1" style={{ color: accentColor }}>
                  <Coffee className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg" />
                  <span className="text-3xl sm:text-4xl font-black uppercase tracking-tight drop-shadow">
                    {business.name}
                  </span>
                </div>
              )}

              {table && (
                <div
                  className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold border shadow-sm"
                  style={{
                    backgroundColor: `${accentColor}18`,
                    borderColor: `${accentColor}45`,
                    color: isCoverLight ? '#2B1712' : '#FFE8B3',
                  }}
                >
                  <span>Mesa {table.name}</span>
                  {table.area && <span className="opacity-70 font-normal">({table.area})</span>}
                </div>
              )}
            </div>

            {/* Título de la Carta & Lema Elegante */}
            <div className="space-y-1.5">
              <span
                className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] font-extrabold block"
                style={{ color: accentColor }}
              >
                {business.name}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[1.08]">
                {coverTitle}
              </h1>
              <p
                className="text-xs sm:text-sm font-medium leading-relaxed max-w-md pt-1"
                style={{ opacity: 0.8 }}
              >
                {coverSubtitle}
              </p>
            </div>

            {/* Horario y Botón de Ubicación */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border backdrop-blur-md"
                style={{
                  backgroundColor: isCoverLight ? '#FFFFFF80' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: isCoverLight ? '#00000015' : 'rgba(255, 255, 255, 0.12)',
                }}
              >
                <Clock className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span className="font-medium text-[11px] sm:text-xs">{businessHours}</span>
              </div>

              {(address || phone) && (
                <button
                  type="button"
                  onClick={() => setShowInfoModal(true)}
                  className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:opacity-90 active:scale-95"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}40`,
                    color: isCoverLight ? '#2B1712' : '#FFFFFF',
                  }}
                >
                  <Info className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  <span>Ubicación</span>
                </button>
              )}
            </div>
          </div>

          {/* LADO DERECHO: PLATILLO ENTRE CUBIERTA (PEELED-CORNER REVEAL EFFECT CON SELLO VINTAGE) */}
          <div className="md:col-span-6 lg:col-span-5 flex justify-center md:justify-end">
            <div
              onMouseEnter={() => setPeelHover(true)}
              onMouseLeave={() => setPeelHover(false)}
              onClick={() => featuredProductWithImage && handleOpenProduct(featuredProductWithImage)}
              className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[4/5] rounded-[32px] overflow-hidden shadow-2xl cursor-pointer transition-all duration-500 group select-none"
              style={{
                boxShadow: isCoverLight
                  ? '0 24px 48px -12px rgba(94, 48, 35, 0.25)'
                  : '0 24px 60px -12px rgba(0, 0, 0, 0.75)',
              }}
            >
              {/* Sello Vintage Flotante Barista */}
              <div className="absolute top-4 left-4 z-30 transform -rotate-12 pointer-events-none drop-shadow-md">
                <BestSellerStamp
                  label="ESPECIALIDAD"
                  sublabel="DE LA CASA"
                  color={accentColor}
                />
              </div>

              {/* CAPA DE FONDO: FOTOGRAFÍA DEL PLATILLO ASOMÁNDOSE */}
              <div className="absolute inset-0 bg-neutral-900">
                {featuredProductWithImage?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featuredProductWithImage.imageUrl}
                    alt={featuredProductWithImage.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center opacity-40">
                    <Coffee className="w-16 h-16 mb-2" style={{ color: accentColor }} />
                    <span className="text-xs uppercase tracking-widest font-mono">
                      Especialidad de la Casa
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                <div className="absolute bottom-4 left-5 right-5 z-20 flex items-end justify-between text-white">
                  <div>
                    <span
                      className="text-[9px] font-mono uppercase tracking-[0.2em] font-black block"
                      style={{ color: accentColor }}
                    >
                      Recomendación de la Casa
                    </span>
                    <h4 className="text-base sm:text-lg font-black tracking-tight leading-tight drop-shadow">
                      {featuredProductWithImage?.name || 'Selección del Día'}
                    </h4>
                  </div>
                  {featuredProductWithImage && (
                    <span
                      className="text-lg font-black shrink-0 ml-2"
                      style={{ color: accentColor }}
                    >
                      ${featuredProductWithImage.minPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* CUBIERTA FRONTAL CON ESQUINA DOBLADA/LEVANTADA */}
              <div
                className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out"
                style={{
                  background: `linear-gradient(135deg, ${coverColor} 0%, ${coverColor} 70%, transparent 70%)`,
                  clipPath: peelHover
                    ? 'polygon(0 0, 45% 0, 100% 55%, 100% 100%, 0 100%)'
                    : 'polygon(0 0, 58% 0, 100% 42%, 100% 100%, 0 100%)',
                }}
              >
                <div
                  className="absolute inset-4 rounded-[22px] border pointer-events-none"
                  style={{
                    borderColor: `${accentColor}30`,
                    clipPath: peelHover
                      ? 'polygon(0 0, 40% 0, 100% 60%, 100% 100%, 0 100%)'
                      : 'polygon(0 0, 52% 0, 100% 48%, 100% 100%, 0 100%)',
                  }}
                />

                <div className="p-7 space-y-3 max-w-[200px]">
                  <h3
                    className="text-base sm:text-lg font-black uppercase tracking-wider leading-snug"
                    style={{ color: isCoverLight ? '#2B1712' : '#FFFFFF' }}
                  >
                    {coverTitle}
                  </h3>
                  <p
                    className="text-[10px] leading-relaxed font-mono uppercase tracking-widest opacity-60"
                    style={{ color: isCoverLight ? '#5E3023' : '#F3E9DC' }}
                  >
                    Toca para descubrir
                  </p>
                </div>
              </div>

              {/* LA ESQUINA DOBLADA (PLIEGUE REVERSO EN COLOR PAPEL CON SOMBRA PROYECTADA) */}
              <div
                className="absolute top-0 right-0 pointer-events-none transition-all duration-500 ease-out"
                style={{
                  width: peelHover ? '55%' : '42%',
                  height: peelHover ? '55%' : '42%',
                  background: `linear-gradient(225deg, ${paperColor} 50%, rgba(0,0,0,0.18) 50%, rgba(0,0,0,0.4) 60%, transparent 60%)`,
                  filter: 'drop-shadow(-8px 12px 16px rgba(0,0,0,0.45))',
                  clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
                  transform: 'rotate(90deg)',
                  transformOrigin: 'top right',
                }}
              />
            </div>
          </div>
        </section>

        {/* TRANSICIÓN DE ONDA LÍQUIDA ORGÁNICA (INSPIRADA EN CARTAS DE AUTOR) */}
        <div className="-my-4">
          <OrganicWaveDivider color={accentColor} />
        </div>

        {/* ======================================================== */}
        {/* BARRA STICKY DE CATEGORÍAS Y BUSCADOR (OPTIMIZADO PARA MÓVIL) */}
        {/* ======================================================== */}
        <section
          className="sticky top-0 z-30 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 backdrop-blur-xl border-b transition-all space-y-3"
          style={{
            backgroundColor: `${coverColor}F0`,
            borderColor: `${accentColor}25`,
          }}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Selector de Categorías tipo Píldoras Refinadas con Scroll Horizontal */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 max-w-full touch-pan-x">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 touch-manipulation"
                style={{
                  backgroundColor:
                    selectedCategoryId === 'all'
                      ? accentColor
                      : isCoverLight
                      ? '#FFFFFF90'
                      : 'rgba(255,255,255,0.06)',
                  color: selectedCategoryId === 'all' ? accentContrastText : undefined,
                  boxShadow: selectedCategoryId === 'all' ? `0 4px 14px ${accentColor}40` : 'none',
                }}
              >
                Toda la Carta
              </button>

              {categories.map((cat) => {
                const isActive = selectedCategoryId === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer border active:scale-95 touch-manipulation"
                    style={{
                      backgroundColor: isActive
                        ? accentColor
                        : isCoverLight
                        ? '#FFFFFF90'
                        : 'rgba(255,255,255,0.06)',
                      borderColor: isActive
                        ? accentColor
                        : isCoverLight
                        ? '#00000010'
                        : 'rgba(255,255,255,0.08)',
                      color: isActive ? accentContrastText : undefined,
                      boxShadow: isActive ? `0 4px 14px ${accentColor}40` : 'none',
                    }}
                  >
                    {cat.name} ({cat.products.length})
                  </button>
                )
              })}
            </div>

            {/* Input de Búsqueda Minimalista (Font size 16px en móvil para evitar zoom no deseado en iOS) */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50"
                style={{ color: accentColor }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar platillo o café..."
                className="w-full pl-10 pr-9 py-2.5 sm:py-2 rounded-xl text-base sm:text-xs focus:outline-none transition-all border"
                style={{
                  backgroundColor: isCoverLight ? '#FFFFFFE6' : 'rgba(255, 255, 255, 0.06)',
                  borderColor: isCoverLight ? '#00000015' : 'rgba(255, 255, 255, 0.12)',
                  color: isCoverLight ? '#2B1712' : '#FFFFFF',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1.5 touch-manipulation"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* LISTADO DE SECCIONES CON TARJETAS DIAGONALES EN CASCADA */}
        {/* (ACOMODADAS UNA DESPUÉS DE OTRA CON CORTE ANGULAR) */}
        {/* ======================================================== */}
        <section className="space-y-12 pb-24">
          {filteredCategories.length === 0 ? (
            <div
              className="py-16 text-center rounded-3xl border space-y-2"
              style={{
                backgroundColor: isCoverLight ? '#FFFFFF60' : 'rgba(255,255,255,0.03)',
                borderColor: `${accentColor}30`,
              }}
            >
              <Coffee className="w-10 h-10 mx-auto opacity-40" style={{ color: accentColor }} />
              <p className="text-sm font-bold">No se encontraron platillos</p>
              <p className="text-xs opacity-60">Prueba con otra palabra o categoría.</p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.id} className="space-y-6">
                {/* Encabezado de Sección con Viñeta Distinguida, Icono Barista y Nota Editorial */}
                <div
                  className="border-b pb-3 pt-6 space-y-1.5"
                  style={{ borderColor: `${accentColor}35` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Viñeta ornamental barista */}
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: accentColor }}
                      />

                      {/* Icono temático de autor según categoría */}
                      {(() => {
                        const lower = category.name.toLowerCase()
                        if (
                          lower.includes('fría') ||
                          lower.includes('fria') ||
                          lower.includes('frapp') ||
                          lower.includes('cold') ||
                          lower.includes('ice')
                        ) {
                          return <ColdDrinkIcon className="w-5 h-5 opacity-70 shrink-0" color={accentColor} />
                        }
                        if (
                          lower.includes('café') ||
                          lower.includes('cafe') ||
                          lower.includes('espresso') ||
                          lower.includes('latte') ||
                          lower.includes('caliente')
                        ) {
                          return <MokaPotIcon className="w-5 h-5 opacity-70 shrink-0" color={accentColor} />
                        }
                        if (
                          lower.includes('té') ||
                          lower.includes('te') ||
                          lower.includes('tisana') ||
                          lower.includes('infusi')
                        ) {
                          return <CoffeeBranchVector className="w-5 h-5 opacity-70 shrink-0" color={accentColor} />
                        }
                        return null
                      })()}

                      <h2
                        className="text-2xl sm:text-3xl font-black uppercase tracking-tight"
                        style={{ color: isCoverLight ? '#2B1712' : '#FFFFFF' }}
                      >
                        {category.name}
                      </h2>
                    </div>

                    <span
                      className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border opacity-75"
                      style={{
                        borderColor: `${accentColor}30`,
                        backgroundColor: isCoverLight ? '#FFFFFF60' : 'rgba(255, 255, 255, 0.04)',
                      }}
                    >
                      {category.products.length} {category.products.length === 1 ? 'opción' : 'opciones'}
                    </span>
                  </div>

                  {/* Nota de Barista contextual por categoría (inspirada en cartas de especialidad) */}
                  {(() => {
                    const lower = category.name.toLowerCase()
                    if (lower.includes('café') || lower.includes('cafe') || lower.includes('espresso')) {
                      return (
                        <p className="text-[11px] italic font-serif opacity-60 pl-5.5">
                          Extracciones con grano 100% arábica de especialidad • Puedes pedir tu café caliente o con hielo
                        </p>
                      )
                    }
                    if (lower.includes('fría') || lower.includes('fria') || lower.includes('frapp') || lower.includes('cold')) {
                      return (
                        <p className="text-[11px] italic font-serif opacity-60 pl-5.5">
                          Bebidas batidas al momento • Pregunta por opciones de leche entera, deslactosada o vegetal
                        </p>
                      )
                    }
                    if (lower.includes('reposter') || lower.includes('pan') || lower.includes('postre') || lower.includes('horno')) {
                      return (
                        <p className="text-[11px] italic font-serif opacity-60 pl-5.5">
                          Horneado fresco a diario con mantequilla pura e ingredientes de temporada
                        </p>
                      )
                    }
                    return null
                  })()}
                </div>

                {/* LISTADO DE PLATILLOS INTEGRADOS AL LIENZO (SIN CAJAS, SIN FONDO Y SIN BORDES) */}
                {/* ESTRUCTURA ALTERNADA: UNO A LA IZQUIERDA Y UNO A LA DERECHA */}
                <div className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
                  {category.products.map((product, pIdx) => {
                    const hasMulti = product.variants.length > 1
                    const isLeft = pIdx % 2 === 0

                    return (
                      <motion.div
                        key={product.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOpenProduct(product)}
                        className={`group relative py-5 sm:py-8 transition-all duration-300 cursor-pointer flex ${
                          isLeft ? 'flex-row' : 'flex-row-reverse'
                        } items-start sm:items-stretch gap-3.5 sm:gap-8 select-none touch-manipulation`}
                      >
                        {/* FOTOGRAFÍA CON CORTE DIAGONAL EDITORIAL FLOTANTE (ADAPTADA A MÓVIL Y DESKTOP) */}
                        <div
                          className="relative w-28 h-28 sm:w-60 md:w-72 sm:h-52 shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-900 shadow-md sm:shadow-xl group-active:scale-95 transition-transform"
                          style={{
                            clipPath: isLeft
                              ? 'polygon(0 0, 100% 0, 92% 100%, 0 100%)'
                              : 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)',
                          }}
                        >
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center opacity-30 text-center p-3">
                              <Coffee className="w-8 h-8 sm:w-10 sm:h-10 mb-1" style={{ color: accentColor }} />
                              <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-widest">
                                Especialidad
                              </span>
                            </div>
                          )}

                          {/* Degradado interior suave */}
                          <div
                            className={`absolute inset-0 bg-gradient-to-${
                              isLeft ? 'r' : 'l'
                            } from-black/40 via-transparent to-transparent pointer-events-none`}
                          />

                          {/* Badges Angulares en la esquina de la imagen */}
                          {(product.isNew || product.isSeasonal) && (
                            <div
                              className={`absolute top-2 ${
                                isLeft ? 'left-2' : 'right-2'
                              } flex items-center gap-1 z-10`}
                            >
                              {product.isNew && (
                                <span
                                  className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded shadow"
                                  style={{
                                    backgroundColor: accentColor,
                                    color: accentContrastText,
                                  }}
                                >
                                  NUEVO
                                </span>
                              )}
                              {product.isSeasonal && (
                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded shadow bg-rose-600 text-white">
                                  TEMPORADA
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* CUERPO DEL PLATILLO: INTEGRADO DIRECTAMENTE AL LIENZO SIN TARJETA */}
                        <div className="flex-1 flex flex-col justify-between text-left space-y-1.5 sm:space-y-3 w-full min-w-0">
                          <div className="space-y-1 sm:space-y-2">
                            {/* Nombre del platillo y Precio */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                              <div className="min-w-0">
                                <h3
                                  className="font-black text-base sm:text-2xl tracking-tight leading-snug group-hover:opacity-85 transition-opacity line-clamp-2 sm:line-clamp-none"
                                  style={{ color: isCoverLight ? '#2B1712' : '#FFFFFF' }}
                                >
                                  {product.name}
                                </h3>
                                {product.code && (
                                  <span className="text-[9px] sm:text-[10px] font-mono opacity-50 block mt-0.5">
                                    #{product.code}
                                  </span>
                                )}
                              </div>

                              <div className="text-left sm:text-right shrink-0">
                                {hasMulti && product.maxPrice && product.maxPrice > product.minPrice ? (
                                  <div>
                                    <span
                                      className="text-lg sm:text-2xl font-black block leading-none"
                                      style={{ color: accentColor }}
                                    >
                                      ${product.minPrice.toFixed(0)} - ${product.maxPrice.toFixed(0)}
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] font-mono opacity-60 block mt-0.5">
                                      según tamaño
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <span
                                      className="text-lg sm:text-3xl font-black block leading-none"
                                      style={{ color: accentColor }}
                                    >
                                      ${product.minPrice.toFixed(2)}
                                    </span>
                                    {hasMulti && (
                                      <span className="text-[9px] sm:text-[10px] font-mono opacity-60 block mt-0.5">
                                        desde
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Descripción */}
                            {product.description && (
                              <p
                                className="text-[11px] sm:text-sm leading-relaxed max-w-2xl line-clamp-2 sm:line-clamp-none"
                                style={{
                                  color: isCoverLight ? '#4A3428' : '#D1C4B5',
                                  opacity: 0.9,
                                }}
                              >
                                {product.description}
                              </p>
                            )}

                            {/* TAMAÑOS DISPONIBLES: Puntos Guía (Dot Leaders) de alta carta editorial */}
                            {hasMulti && product.variants.length > 1 && (
                              <div className="pt-2 space-y-1.5 max-w-lg">
                                <span
                                  className="text-[10px] font-mono uppercase tracking-widest font-black block"
                                  style={{ color: accentColor }}
                                >
                                  Tamaños & Precios:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                  {product.variants.map((v) => (
                                    <div
                                      key={v.id}
                                      className="flex items-baseline justify-between text-xs py-0.5"
                                    >
                                      <span className="font-semibold text-[11px] opacity-90 shrink-0">
                                        {v.name}
                                      </span>
                                      <span
                                        className="flex-1 mx-2 border-b border-dotted opacity-30"
                                        style={{ borderColor: accentColor }}
                                      />
                                      <span
                                        className="font-black text-xs shrink-0"
                                        style={{ color: accentColor }}
                                      >
                                        ${v.price.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* INGREDIENTES: Se muestran sólo si existen en la receta */}
                            {product.ingredients && product.ingredients.length > 0 && (
                              <div className="pt-1 flex items-baseline gap-2 flex-wrap text-xs">
                                <span
                                  className="text-[10px] font-mono uppercase tracking-widest font-black shrink-0"
                                  style={{ color: accentColor }}
                                >
                                  Ingredientes:
                                </span>
                                <span
                                  className="italic text-[11px] sm:text-xs leading-relaxed"
                                  style={{
                                    color: isCoverLight ? '#5E4638' : '#B8A898',
                                  }}
                                >
                                  {product.ingredients.join(', ')}
                                </span>
                              </div>
                            )}

                            {/* SABORES & OPCIONES: Mostrados a modo de lista directamente en el platillo */}
                            {product.modifierGroups && product.modifierGroups.length > 0 && (
                              <div className="pt-1.5 space-y-1.5">
                                <span
                                  className="text-[10px] font-mono uppercase tracking-widest font-black block"
                                  style={{ color: accentColor }}
                                >
                                  Sabores & Variedades:
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {product.modifierGroups
                                    .flatMap((g) => g.modifiers)
                                    .slice(0, 6)
                                    .map((mod) => (
                                      <span
                                        key={mod.id}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium border transition-all"
                                        style={{
                                          backgroundColor: isCoverLight
                                            ? '#FFFFFF80'
                                            : 'rgba(255, 255, 255, 0.05)',
                                          borderColor: `${accentColor}30`,
                                          color: isCoverLight ? '#2B1712' : '#F3E9DC',
                                        }}
                                      >
                                        <span>{mod.name}</span>
                                        {mod.extraPrice > 0 && (
                                          <span
                                            className="font-bold opacity-80"
                                            style={{ color: accentColor }}
                                          >
                                            +${mod.extraPrice.toFixed(0)}
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  {product.modifierGroups.flatMap((g) => g.modifiers).length > 6 && (
                                    <span className="text-[10px] font-mono opacity-50 px-1">
                                      +{product.modifierGroups.flatMap((g) => g.modifiers).length - 6} más
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Pie de acción integrado */}
                          <div className="pt-2 flex items-center justify-between text-xs border-t border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-2 text-[11px] opacity-60">
                              {hasMulti ? (
                                <span>{product.variants.length} tamaños disponibles</span>
                              ) : (
                                <span>Presentación estándar</span>
                              )}
                            </div>

                            <span
                              className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                              style={{ color: accentColor }}
                            >
                              <span>Ver detalle</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* SEPARADOR CURVO ARTESANAL SVG AL TERMINAR LA CATEGORÍA */}
                <div className="pt-6">
                  {(() => {
                    const lower = category.name.toLowerCase()
                    if (
                      lower.includes('crepa') ||
                      lower.includes('crepe') ||
                      lower.includes('pan') ||
                      lower.includes('reposter') ||
                      lower.includes('postre') ||
                      lower.includes('horno') ||
                      lower.includes('waffle')
                    ) {
                      return <CrepeDivider color={accentColor} />
                    }
                    if (
                      lower.includes('café') ||
                      lower.includes('cafe') ||
                      lower.includes('espresso') ||
                      lower.includes('latte') ||
                      lower.includes('americano')
                    ) {
                      return <CoffeeBeanDivider color={accentColor} />
                    }
                    return <CoffeeCupDivider color={accentColor} />
                  })()}
                </div>
              </div>
            ))
          )}
        </section>

        {/* PIE DE CARTA SUTIL (SIN PUNTOS) */}
        <footer
          className="pt-6 border-t text-center text-xs space-y-1 pb-16"
          style={{ borderColor: `${accentColor}25`, opacity: 0.6 }}
        >
          <p>© {new Date().getFullYear()} {business.name}. Precios en {business.currency} con IVA incluido</p>
          <p className="text-[10px]">Servicio de hospitalidad y gastronomía</p>
        </footer>
      </div>

      {/* ======================================================== */}
      {/* BOTÓN FLOTANTE DE LLAMAR AL MESERO (SI HAY MESA) */}
      {/* ======================================================== */}
      {table && (
        <div className={`${isPreview ? 'sticky bottom-4 ml-auto w-fit mr-2' : 'fixed bottom-5 right-5'} z-40`}>
          <button
            type="button"
            onClick={handleCallWaiter}
            disabled={waiterCalled}
            style={{
              backgroundColor: waiterCalled ? '#059669' : accentColor,
              color: accentContrastText,
              boxShadow: `0 8px 24px ${accentColor}50`,
            }}
            className="px-4 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xl active:scale-95"
          >
            <BellRing className="w-4 h-4" />
            <span>{waiterCalled ? '✓ Mesero Notificado' : `Llamar Mesero (Mesa ${table.name})`}</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL / BOTTOM SHEET DE PERSONALIZACIÓN DE PRODUCTO */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedProduct && (
          <div className={`${isPreview ? 'absolute' : 'fixed'} inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md`}>
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-lg max-h-[90vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col shadow-2xl border"
              style={{
                backgroundColor: paperColor,
                borderColor: `${accentColor}40`,
                color: textColor,
              }}
            >
              {/* Imagen de Cabecera */}
              <div className="relative w-full h-52 sm:h-60 bg-neutral-900 shrink-0">
                {selectedProduct.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                    <Coffee className="w-16 h-16 mb-2" style={{ color: accentColor }} />
                    <span className="text-xs font-mono uppercase tracking-widest">
                      Especialidad de la Casa
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-all shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido interactivo desplazable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <h3 className="text-2xl font-black tracking-tight leading-tight">
                    {selectedProduct.name}
                  </h3>
                  {selectedProduct.description && (
                    <p className="text-xs sm:text-sm mt-1.5 leading-relaxed opacity-75">
                      {selectedProduct.description}
                    </p>
                  )}
                  {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
                    <div
                      className="mt-3 p-3 rounded-2xl border text-xs space-y-1"
                      style={{
                        borderColor: `${accentColor}30`,
                        backgroundColor: isPaperLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <span
                        className="text-[10px] font-mono uppercase tracking-widest font-black block"
                        style={{ color: accentColor }}
                      >
                        Ingredientes & Preparación:
                      </span>
                      <p className="italic leading-relaxed opacity-85">
                        {selectedProduct.ingredients.join(', ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tamaños */}
                {selectedProduct.variants.length > 1 && (
                  <div className="space-y-2">
                    <label
                      className="text-xs font-bold uppercase tracking-wider block"
                      style={{ color: accentColor }}
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
                            className="p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-center"
                            style={{
                              backgroundColor: isSelected
                                ? `${accentColor}20`
                                : isPaperLight
                                ? '#FFFFFF'
                                : 'rgba(255,255,255,0.05)',
                              borderColor: isSelected ? accentColor : 'rgba(0,0,0,0.1)',
                              color: textColor,
                              boxShadow: isSelected ? `0 2px 8px ${accentColor}30` : 'none',
                            }}
                          >
                            <span className="text-xs font-bold truncate">{v.name}</span>
                            <span
                              className="text-sm font-black mt-0.5"
                              style={{ color: accentColor }}
                            >
                              ${v.price.toFixed(2)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Modificadores y Sabores */}
                {selectedProduct.modifierGroups && selectedProduct.modifierGroups.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-black/10 dark:border-white/10">
                    {selectedProduct.modifierGroups.map((group) => {
                      const selectedGroupMods = selectedModifiers[group.id] || []
                      return (
                        <div key={group.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label
                              className="text-xs font-bold uppercase tracking-wider"
                              style={{ color: accentColor }}
                            >
                              {group.name}
                            </label>
                            <span className="text-[10px] opacity-60">
                              {group.isRequired ? 'Obligatorio' : 'Opcional'} / Máx {group.maxSelect}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.modifiers.map((mod) => {
                              const isChecked = selectedGroupMods.includes(mod.id)
                              return (
                                <button
                                  key={mod.id}
                                  type="button"
                                  onClick={() =>
                                    handleToggleModifier(group.id, mod.id, group.maxSelect)
                                  }
                                  className="p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer"
                                  style={{
                                    backgroundColor: isChecked
                                      ? `${accentColor}20`
                                      : isPaperLight
                                      ? '#FFFFFF'
                                      : 'rgba(255,255,255,0.05)',
                                    borderColor: isChecked ? accentColor : 'rgba(0,0,0,0.1)',
                                    color: textColor,
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded-md border flex items-center justify-center"
                                      style={{
                                        backgroundColor: isChecked ? accentColor : 'transparent',
                                        borderColor: isChecked ? accentColor : 'currentColor',
                                        color: accentContrastText,
                                      }}
                                    >
                                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <span>{mod.name}</span>
                                  </div>
                                  {mod.extraPrice > 0 && (
                                    <span
                                      className="text-[11px] font-bold"
                                      style={{ color: accentColor }}
                                    >
                                      +${mod.extraPrice.toFixed(0)}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer con Total en Vivo */}
              <div
                className="p-5 border-t flex items-center justify-between"
                style={{
                  backgroundColor: isPaperLight ? '#F5EFE6' : '#140F0D',
                  borderColor: isPaperLight ? '#E5DCCE' : '#2A201A',
                }}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                    Precio Total
                  </span>
                  <strong className="text-2xl font-black" style={{ color: accentColor }}>
                    ${currentTotalPrice.toFixed(2)} {business.currency}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  style={{
                    backgroundColor: accentColor,
                    color: accentContrastText,
                  }}
                  className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  {table ? `Ordenar en Mesa ${table.name}` : 'Volver a la Carta'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL DE INFORMACIÓN (UBICACIÓN Y CONTACTO) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showInfoModal && (
          <div className={`${isPreview ? 'absolute' : 'fixed'} inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md`}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl relative border"
              style={{
                backgroundColor: paperColor,
                borderColor: `${accentColor}40`,
                color: textColor,
              }}
            >
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full opacity-60 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                >
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold uppercase">{business.name}</h3>
                  <p className="text-xs opacity-60">Información del Establecimiento</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-2xl border border-black/5 dark:border-white/10">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentColor }} />
                  <div>
                    <strong className="block font-semibold mb-0.5">Horario de Servicio</strong>
                    <span className="opacity-75">{businessHours}</span>
                  </div>
                </div>

                {address && (
                  <div className="flex items-start gap-3 p-3 rounded-2xl border border-black/5 dark:border-white/10">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentColor }} />
                    <div>
                      <strong className="block font-semibold mb-0.5">Ubicación</strong>
                      <span className="opacity-75">{address}</span>
                    </div>
                  </div>
                )}

                {phone && (
                  <div className="flex items-start gap-3 p-3 rounded-2xl border border-black/5 dark:border-white/10">
                    <Phone className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentColor }} />
                    <div>
                      <strong className="block font-semibold mb-0.5">Teléfono</strong>
                      <span className="opacity-75">{phone}</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                style={{ backgroundColor: accentColor, color: accentContrastText }}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Cerrar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  Coffee,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  UtensilsCrossed,
  X,
  Bell,
  CheckCircle2,
  MapPin,
  Clock,
  Info,
  BookOpen,
  Phone,
  Bookmark,
  Compass,
} from 'lucide-react'

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
  hasVariants: boolean
  minPrice: number
  maxPrice?: number
  variants: Variant[]
  modifierGroups?: ModifierGroup[]
  isAvailable?: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  products: Product[]
}

export interface BusinessData {
  id?: string
  name: string
  legalName?: string | null
  logoUrl?: string | null
  isotypeUrl?: string | null
  currency?: string
  timezone?: string
  phone?: string | null
  address?: string | null
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

export interface TableData {
  id?: string
  name: string
  area?: string | null
}

export interface BookMenuProps {
  business: BusinessData
  categories: Category[]
  table?: TableData | null
  isInteractive?: boolean
  initialPage?: number
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
}

export default function BookMenu({
  business,
  categories,
  table,
  isInteractive = true,
  initialPage = 0,
  customColors,
}: BookMenuProps) {
  // Paleta de colores e identidad de la carta
  const primaryColor = customColors?.primaryColor || business.theme?.primaryColor || '#C08552'
  const isDarkMode =
    customColors?.darkMode !== undefined
      ? customColors.darkMode
      : business.theme?.darkMode ?? false
  const currency = business.currency || 'MXN'

  // Colores y textos dedicados del Libro / Carta
  const coverBg = customColors?.menuCoverColor || business.theme?.menuCoverColor || '#18120F'
  const paperBg =
    customColors?.menuPaperColor ||
    business.theme?.menuPaperColor ||
    (isDarkMode ? '#1E1714' : '#FDFBF7')
  const paperText =
    customColors?.menuTextColor ||
    business.theme?.menuTextColor ||
    (isDarkMode ? '#EFE3D5' : '#2A1810')
  const paperMuted = isDarkMode ? '#9E8879' : '#73584E'
  const paperBorder = isDarkMode ? '#382B24' : '#E8DDD0'
  const accentColor = customColors?.menuAccentColor || business.theme?.menuAccentColor || '#D4AF37'
  const coverTitle =
    customColors?.menuCoverTitle ||
    business.theme?.menuCoverTitle ||
    'CARTA DE ESPECIALIDADES'
  const coverSubtitle =
    customColors?.menuCoverSubtitle ||
    business.theme?.menuCoverSubtitle ||
    'Café de especialidad y gastronomía artesanal'
  const businessHours =
    customColors?.businessHours ||
    business.theme?.businessHours ||
    'Lunes a Domingo: 8:00 AM - 10:00 PM'
  const phone = customColors?.phone || business.theme?.phone || business.phone || null
  const address = customColors?.address || business.theme?.address || business.address || null

  // Páginas del libro: 0 = Portada, 1..N = Categorías, N+1 = Contraportada
  const totalPages = categories.length + 2
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showIndexDrawer, setShowIndexDrawer] = useState(false)

  // Acciones en mesa
  const [waiterCalled, setWaiterCalled] = useState(false)
  const [billRequested, setBillRequested] = useState(false)

  // Soporte gestos táctiles (Swipe)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    if (diff > 45) {
      goToNextPage()
    } else if (diff < -45) {
      goToPrevPage()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  // Teclado (flechas izquierda / derecha)
  useEffect(() => {
    if (!isInteractive) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedProduct || showIndexDrawer) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        goToNextPage()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevPage()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, isInteractive, selectedProduct, showIndexDrawer, totalPages])

  const goToNextPage = () => {
    if (currentPage >= totalPages - 1 || isAnimating) return
    setIsAnimating(true)
    setFlipDirection('next')
    setTimeout(() => {
      setCurrentPage((prev) => prev + 1)
      setIsAnimating(false)
      setFlipDirection(null)
    }, 380)
  }

  const goToPrevPage = () => {
    if (currentPage <= 0 || isAnimating) return
    setIsAnimating(true)
    setFlipDirection('prev')
    setTimeout(() => {
      setCurrentPage((prev) => prev - 1)
      setIsAnimating(false)
      setFlipDirection(null)
    }, 380)
  }

  const goToPage = (pageIndex: number) => {
    if (pageIndex === currentPage || isAnimating) return
    const direction = pageIndex > currentPage ? 'next' : 'prev'
    setIsAnimating(true)
    setFlipDirection(direction)
    setShowIndexDrawer(false)
    setTimeout(() => {
      setCurrentPage(pageIndex)
      setIsAnimating(false)
      setFlipDirection(null)
    }, 350)
  }

  const handleCallWaiter = () => {
    setWaiterCalled(true)
    setTimeout(() => setWaiterCalled(false), 5000)
  }

  const handleRequestBill = () => {
    setBillRequested(true)
    setTimeout(() => setBillRequested(false), 5000)
  }

  const isCover = currentPage === 0
  const isBackCover = currentPage === totalPages - 1

  return (
    <div
      className="w-full flex flex-col items-center justify-center select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* BANNER SUPERIOR DE MESA (Si se accedió con QR de comensal) */}
      {table && (
        <div className="w-full max-w-3xl mb-3 px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xl z-20">
          <div className="flex items-center gap-2 font-bold text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <MapPin className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>
              Mesa: <strong className="text-white">{table.name}</strong>{' '}
              {table.area ? <span className="opacity-70">({table.area})</span> : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCallWaiter}
              disabled={waiterCalled}
              className="px-3 py-1.5 rounded-xl font-bold text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Bell className="w-3 h-3" />
              <span>{waiterCalled ? 'Mesero notificado' : 'Llamar Mesero'}</span>
            </button>

            <button
              type="button"
              onClick={handleRequestBill}
              disabled={billRequested}
              className="px-3 py-1.5 rounded-xl font-bold text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{billRequested ? 'Cuenta solicitada' : 'Pedir Cuenta'}</span>
            </button>
          </div>
        </div>
      )}

      {/* CONTENEDOR 3D DEL LIBRO CON PROFUNDIDAD HEYZINE */}
      <div className="relative w-full max-w-3xl flex items-center justify-center p-1 sm:p-4">
        {/* BOTÓN FLOTANTE IZQUIERDO — PÁGINA ANTERIOR */}
        {currentPage > 0 && (
          <button
            type="button"
            onClick={goToPrevPage}
            disabled={isAnimating}
            className="absolute left-1 sm:-left-5 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center shadow-2xl border border-white/20 transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
            title="Página Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* ESTRUCTURA FÍSICA DEL LIBRO CON CAPAS DE HOJAS APILADAS */}
        <div
          className="w-full min-h-[580px] sm:min-h-[660px] rounded-3xl relative overflow-hidden flex flex-col justify-between transition-all duration-300"
          style={{
            backgroundColor: isCover ? coverBg : isBackCover ? coverBg : paperBg,
            color: isCover || isBackCover ? '#FFFFFF' : paperText,
            border: isCover || isBackCover ? `3px double ${accentColor}80` : `1px solid ${paperBorder}`,
            boxShadow: isCover || isBackCover
              ? `0 30px 60px -15px rgba(0,0,0,0.7), 6px 6px 0px -1px #0A0807, 12px 12px 0px -2px #070504, 0 0 25px ${accentColor}20`
              : `0 25px 50px -12px rgba(0,0,0,0.5), 5px 5px 0px -1px #DCD1C4, 10px 10px 0px -2px #C5B8A8, inset 0 0 100px rgba(0,0,0,0.03)`,
          }}
        >
          {/* CINTA MARCAPÁGINAS DE TELA (Bookmark Ribbon) */}
          <div
            className="absolute top-0 right-10 sm:right-14 w-4 sm:w-5 h-14 sm:h-16 z-30 pointer-events-none shadow-lg transition-transform duration-300"
            style={{
              backgroundColor: accentColor,
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
            }}
          />

          {/* LOMO ARTESANAL DE ENCUADERNACIÓN (Efecto de lomo cosido y sombra de pliegue central Heyzine) */}
          <div
            className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 z-20 pointer-events-none"
            style={{
              background: isCover || isBackCover
                ? `linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.2) 65%, transparent)`
                : `linear-gradient(to right, rgba(0,0,0,0.22), rgba(0,0,0,0.08) 50%, transparent)`,
              borderRight: isCover || isBackCover ? `1px dashed ${accentColor}50` : `1px solid ${paperBorder}`,
            }}
          />

          {/* ADORNOS DE ESQUINAS DORADAS DE ENCUADERNADOR (En portada y contraportada) */}
          {(isCover || isBackCover) && (
            <>
              {/* Esquina sup-izq */}
              <div
                className="absolute top-3 left-3 w-8 h-8 pointer-events-none opacity-60 border-t-2 border-l-2"
                style={{ borderColor: accentColor }}
              />
              {/* Esquina sup-der */}
              <div
                className="absolute top-3 right-3 w-8 h-8 pointer-events-none opacity-60 border-t-2 border-r-2"
                style={{ borderColor: accentColor }}
              />
              {/* Esquina inf-izq */}
              <div
                className="absolute bottom-3 left-3 w-8 h-8 pointer-events-none opacity-60 border-b-2 border-l-2"
                style={{ borderColor: accentColor }}
              />
              {/* Esquina inf-der */}
              <div
                className="absolute bottom-3 right-3 w-8 h-8 pointer-events-none opacity-60 border-b-2 border-r-2"
                style={{ borderColor: accentColor }}
              />
            </>
          )}

          {/* BOTÓN DISCRETO DE ÍNDICE DE SECCIONES (Disponible en páginas interiores) */}
          {!isCover && !isBackCover && (
            <button
              type="button"
              onClick={() => setShowIndexDrawer(true)}
              className="absolute top-4 right-4 z-20 px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase border transition-all flex items-center gap-1.5 cursor-pointer opacity-75 hover:opacity-100"
              style={{
                borderColor: paperBorder,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
                color: accentColor,
              }}
              title="Ver índice de secciones"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Índice</span>
            </button>
          )}

          {/* CONTENIDO INTERACTIVO CON ANIMACIÓN DE PÁGINA */}
          <div
            key={currentPage}
            className={`flex-1 flex flex-col justify-between p-6 sm:p-10 pl-9 sm:pl-14 transition-all duration-300 relative z-10 ${
              flipDirection === 'next'
                ? 'animate-in slide-in-from-right-8 fade-in'
                : flipDirection === 'prev'
                ? 'animate-in slide-in-from-left-8 fade-in'
                : 'animate-in fade-in'
            }`}
          >
            {/* ========================================================
                CASO 1: PÁGINA 0 — PORTADA DEL MENÚ
               ======================================================== */}
            {isCover && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 my-auto relative">
                {/* Logo libre sin encerrar y más grande */}
                {business.logoUrl ? (
                  <div className="relative w-52 h-52 sm:w-72 sm:h-72 my-1">
                    <Image
                      src={business.logoUrl}
                      alt={business.name}
                      fill
                      unoptimized
                      priority
                      className="object-contain filter drop-shadow-2xl"
                    />
                  </div>
                ) : (
                  <div className="my-2 p-6 rounded-full bg-white/5 border border-white/10 shadow-2xl">
                    <Coffee className="w-24 h-24 sm:w-28 sm:h-28 text-amber-300 drop-shadow-xl" />
                  </div>
                )}

                <div className="space-y-3 max-w-md">
                  <div
                    className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border"
                    style={{
                      borderColor: `${accentColor}60`,
                      color: accentColor,
                      backgroundColor: `${accentColor}15`,
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{coverTitle}</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black tracking-wide text-white uppercase drop-shadow-lg font-serif">
                    {business.name}
                  </h1>

                  <p className="text-xs sm:text-sm text-white/75 font-medium leading-relaxed">
                    {coverSubtitle}
                  </p>
                </div>

                {/* Separador de filigrana editorial tipo Non Solo */}
                <div className="flex items-center justify-center gap-3 w-56 opacity-75">
                  <div className="flex-1 h-[1px]" style={{ backgroundColor: accentColor }} />
                  <span className="text-xs" style={{ color: accentColor }}>✦ · ⚜ · ✦</span>
                  <div className="flex-1 h-[1px]" style={{ backgroundColor: accentColor }} />
                </div>

                <div className="text-[11px] text-white/60 space-y-1">
                  <p>
                    {categories.length} Secciones •{' '}
                    {categories.reduce((acc, c) => acc + c.products.length, 0)} Creaciones
                  </p>
                  {businessHours && (
                    <p className="text-[10px] text-white/50 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{businessHours}</span>
                    </p>
                  )}
                </div>

                {/* Botón Abrir Carta */}
                <button
                  type="button"
                  onClick={goToNextPage}
                  style={{
                    backgroundColor: accentColor,
                    color: '#140E0C',
                  }}
                  className="px-9 py-3.5 rounded-2xl font-black text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer group"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Abrir Carta</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {/* ========================================================
                CASO 2: PÁGINAS 1..N — EXACTAMENTE 1 CATEGORÍA POR PÁGINA
               ======================================================== */}
            {!isCover && !isBackCover && (() => {
              const currentCategory = categories[currentPage - 1]
              if (!currentCategory) return null

              return (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  {/* ENCABEZADO EDITORIAL DE LA CATEGORÍA */}
                  <div
                    className="text-center space-y-1.5 border-b pb-3.5 relative"
                    style={{ borderColor: paperBorder }}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
                      <span>{business.name}</span>
                      <span className="font-mono">
                        Página {currentPage} / {categories.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <span className="text-xs" style={{ color: accentColor }}>✦</span>
                      <h2
                        className="text-xl sm:text-2xl font-black uppercase tracking-wider font-serif"
                        style={{ color: paperText }}
                      >
                        {currentCategory.name}
                      </h2>
                      <span className="text-xs" style={{ color: accentColor }}>✦</span>
                    </div>

                    <p className="text-xs font-medium italic" style={{ color: paperMuted }}>
                      Selección artesanal preparada al momento con ingredientes seleccionados
                    </p>
                  </div>

                  {/* LISTA DE PLATILLOS / BEBIDAS DE LA CATEGORÍA */}
                  <div className="flex-1 space-y-3.5 py-1 overflow-y-auto max-h-[380px] sm:max-h-[440px] pr-1.5 scrollbar-thin">
                    {currentCategory.products.length === 0 ? (
                      <div className="py-20 text-center space-y-2 opacity-50">
                        <UtensilsCrossed className="w-8 h-8 mx-auto" />
                        <p className="text-xs">No hay productos disponibles en esta sección.</p>
                      </div>
                    ) : (
                      currentCategory.products.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => setSelectedProduct(product)}
                          className="group p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3.5 hover:scale-[1.01]"
                          style={{
                            borderColor: paperBorder,
                            backgroundColor: isDarkMode
                              ? 'rgba(255,255,255,0.025)'
                              : 'rgba(255,255,255,0.8)',
                          }}
                        >
                          {/* Miniatura Foto o Icono */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 relative bg-amber-500/10 border border-current/10 flex items-center justify-center shadow-xs">
                            {product.imageUrl ? (
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                unoptimized
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <Coffee className="w-6 h-6 opacity-60" style={{ color: accentColor }} />
                            )}
                          </div>

                          {/* Info Producto */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <h3
                                className="text-sm sm:text-base font-bold tracking-tight truncate group-hover:opacity-80 transition-opacity"
                                style={{ color: paperText }}
                              >
                                {product.name}
                              </h3>
                            </div>

                            {product.description && (
                              <p
                                className="text-xs line-clamp-2 mt-0.5 leading-relaxed"
                                style={{ color: paperMuted }}
                              >
                                {product.description}
                              </p>
                            )}

                            {product.variants.length > 1 && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {product.variants.map((v) => (
                                  <span
                                    key={v.id}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md border"
                                    style={{
                                      borderColor: paperBorder,
                                      backgroundColor: isDarkMode
                                        ? 'rgba(0,0,0,0.3)'
                                        : 'rgba(255,255,255,0.9)',
                                    }}
                                  >
                                    {v.name}: ${v.price.toFixed(0)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Precio Destacado con Acento de Color de la Carta */}
                          <div className="text-right shrink-0">
                            <div
                              className="font-black text-base sm:text-lg font-serif"
                              style={{ color: accentColor }}
                            >
                              <span>${product.minPrice.toFixed(2)}</span>
                            </div>
                            <span className="text-[9px] uppercase font-bold opacity-60">
                              {currency}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* PIE DE PÁGINA CON ESQUINA DOBLADA TIPO HEYZINE (DOG-EAR CURL) */}
                  <div
                    className="border-t pt-2.5 flex items-center justify-between text-xs relative"
                    style={{ borderColor: paperBorder, color: paperMuted }}
                  >
                    <span className="text-[11px] font-medium opacity-80">
                      Toca un producto para ver ingredientes
                    </span>

                    {/* Esquina interactiva de pase de hoja */}
                    <button
                      type="button"
                      onClick={goToNextPage}
                      className="group inline-flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-105 cursor-pointer"
                      style={{ color: accentColor }}
                    >
                      <span>Siguiente página</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* ========================================================
                CASO 3: PÁGINA N+1 — CONTRAPORTADA DE LA CARTA
               ======================================================== */}
            {isBackCover && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 my-auto relative">
                {/* Isotipo o Logo */}
                {business.isotypeUrl || business.logoUrl ? (
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                    <Image
                      src={business.isotypeUrl || business.logoUrl!}
                      alt={business.name}
                      fill
                      unoptimized
                      className="object-contain filter drop-shadow-xl"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl bg-white/10 border border-white/20 text-white">
                    <Coffee className="w-8 h-8" style={{ color: accentColor }} />
                  </div>
                )}

                <div className="space-y-2 max-w-sm">
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-serif">
                    ¡Gracias por tu visita!
                  </h3>
                  <p className="text-xs sm:text-sm text-white/75 font-medium leading-relaxed">
                    Cada taza y platillo es preparado con dedicación y los mejores granos de origen.
                  </p>
                </div>

                {/* Tarjeta de Horario de Servicio y Contacto */}
                <div
                  className="p-4 rounded-2xl border text-xs max-w-sm w-full space-y-3 bg-black/40 backdrop-blur-md"
                  style={{ borderColor: `${accentColor}40` }}
                >
                  {businessHours && (
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: accentColor }} />
                      <div className="text-center">
                        <span className="font-bold text-white block">Horario de Servicio</span>
                        <span className="text-[11px] text-white/80">{businessHours}</span>
                      </div>
                    </div>
                  )}

                  {address && (
                    <div className="pt-2 border-t border-white/10 text-center text-[11px] text-white/70 flex items-center justify-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{address}</span>
                    </div>
                  )}

                  {phone && (
                    <div className="text-center text-[11px] text-white/70 flex items-center justify-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Tel: {phone}</span>
                    </div>
                  )}
                </div>

                {/* Acciones de Mesa si está en una mesa */}
                {table && (
                  <div
                    className="p-3.5 rounded-2xl border text-xs max-w-sm w-full space-y-2.5 bg-white/5"
                    style={{ borderColor: `${accentColor}30` }}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-white font-bold">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{table.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleCallWaiter}
                        disabled={waiterCalled}
                        className="py-2 px-3 rounded-xl font-bold bg-amber-500 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:opacity-95 text-xs"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>{waiterCalled ? 'Notificado' : 'Llamar Mesero'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRequestBill}
                        disabled={billRequested}
                        className="py-2 px-3 rounded-xl font-bold bg-emerald-600 text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:opacity-95 text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{billRequested ? 'Solicitada' : 'Pedir Cuenta'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Botón Volver al Inicio de la Carta */}
                <button
                  type="button"
                  onClick={() => goToPage(0)}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 cursor-pointer hover:bg-white/10"
                  style={{
                    borderColor: `${accentColor}60`,
                    color: accentColor,
                  }}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Volver a la Portada</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BOTÓN FLOTANTE DERECHO — SIGUIENTE PÁGINA */}
        {currentPage < totalPages - 1 && (
          <button
            type="button"
            onClick={goToNextPage}
            disabled={isAnimating}
            className="absolute right-1 sm:-right-5 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center shadow-2xl border border-white/20 transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
            title="Siguiente Página"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* DRAWER / MODAL DEL ÍNDICE DE SECCIONES (Acceso rápido) */}
      {showIndexDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-3xl border overflow-hidden p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: paperBg,
              color: paperText,
              borderColor: paperBorder,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: paperBorder }}>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5" style={{ color: accentColor }} />
                <h3 className="font-black text-base uppercase font-serif">Índice de la Carta</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIndexDrawer(false)}
                className="w-8 h-8 rounded-full border flex items-center justify-center hover:opacity-75 cursor-pointer"
                style={{ borderColor: paperBorder }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {/* Portada */}
              <button
                type="button"
                onClick={() => goToPage(0)}
                className="w-full p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all hover:opacity-85 cursor-pointer"
                style={{
                  borderColor: paperBorder,
                  backgroundColor: currentPage === 0 ? `${accentColor}20` : 'transparent',
                  color: currentPage === 0 ? accentColor : paperText,
                }}
              >
                <span>Portada Principal</span>
                <span className="font-mono text-[10px] opacity-60">Pág. 0</span>
              </button>

              {/* Categorías */}
              {categories.map((cat, idx) => {
                const pageNum = idx + 1
                const isActive = currentPage === pageNum
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => goToPage(pageNum)}
                    className="w-full p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all hover:opacity-85 cursor-pointer"
                    style={{
                      borderColor: paperBorder,
                      backgroundColor: isActive ? `${accentColor}20` : 'transparent',
                      color: isActive ? accentColor : paperText,
                    }}
                  >
                    <span>{cat.name}</span>
                    <span className="font-mono text-[10px] opacity-60">Pág. {pageNum}</span>
                  </button>
                )
              })}

              {/* Contraportada */}
              <button
                type="button"
                onClick={() => goToPage(totalPages - 1)}
                className="w-full p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all hover:opacity-85 cursor-pointer"
                style={{
                  borderColor: paperBorder,
                  backgroundColor: currentPage === totalPages - 1 ? `${accentColor}20` : 'transparent',
                  color: currentPage === totalPages - 1 ? accentColor : paperText,
                }}
              >
                <span>Horarios y Atención</span>
                <span className="font-mono text-[10px] opacity-60">Final</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE PRODUCTO */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border overflow-hidden max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            style={{
              backgroundColor: paperBg,
              color: paperText,
              borderColor: paperBorder,
            }}
          >
            {/* Foto Ampliada */}
            <div className="relative h-48 sm:h-56 w-full bg-amber-500/10 shrink-0">
              {selectedProduct.imageUrl ? (
                <Image
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Coffee className="w-14 h-14 opacity-50" style={{ color: accentColor }} />
                  <span className="text-xs font-bold uppercase opacity-40">{business.name}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <h3 className="text-xl font-black tracking-tight font-serif">
                  {selectedProduct.name}
                </h3>
                {selectedProduct.description && (
                  <p
                    className="text-xs sm:text-sm mt-1 leading-relaxed"
                    style={{ color: paperMuted }}
                  >
                    {selectedProduct.description}
                  </p>
                )}
              </div>

              {/* Variantes y Tamaños */}
              {selectedProduct.variants.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                    Opciones de Tamaño
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedProduct.variants.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-xl border flex items-center justify-between text-xs font-bold"
                        style={{ borderColor: paperBorder }}
                      >
                        <span>{v.name}</span>
                        <span
                          className="font-extrabold text-sm font-serif"
                          style={{ color: accentColor }}
                        >
                          ${v.price.toFixed(2)} {currency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modificadores */}
              {selectedProduct.modifierGroups && selectedProduct.modifierGroups.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                    Personalizaciones & Extras
                  </span>
                  {selectedProduct.modifierGroups.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-xl border space-y-2 text-xs"
                      style={{ borderColor: paperBorder }}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{g.name}</span>
                        <span className="text-[10px] opacity-60">
                          {g.isRequired ? 'Requerido' : 'Opcional'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {g.modifiers.map((m) => (
                          <div
                            key={m.id}
                            className="p-1.5 rounded-lg border text-[11px] flex items-center justify-between"
                            style={{ borderColor: paperBorder }}
                          >
                            <span className="truncate mr-1">{m.name}</span>
                            <span
                              className="font-bold font-serif"
                              style={{ color: accentColor }}
                            >
                              {m.extraPrice > 0 ? `+$${m.extraPrice.toFixed(0)}` : 'Incluido'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="p-3 rounded-xl border text-xs flex items-center gap-2"
                style={{
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span>Indica esta selección a tu mesero al ordenar en mesa.</span>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t flex justify-end" style={{ borderColor: paperBorder }}>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                style={{ backgroundColor: primaryColor }}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md cursor-pointer hover:opacity-95"
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

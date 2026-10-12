'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coffee,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw,
  Flame,
  Tv,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Layers,
  UtensilsCrossed,
  Palette,
  Check,
  Star,
  Tag,
} from 'lucide-react'
import {
  MokaPotIcon,
  ColdDrinkIcon,
  CoffeeBranchVector,
} from '@/components/menu-dividers'

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

export interface Variant {
  id: string
  name: string
  price: number
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
}

export interface Category {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  products: Product[]
}

export interface BusinessData {
  id: string
  name: string
  legalName?: string | null
  logoUrl?: string | null
  isotypeUrl?: string | null
  currency: string
  timezone: string
  theme: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    darkMode: boolean
  }
}

export interface DisplayClientProps {
  initialBusiness: BusinessData
  initialCategories: Category[]
}

export type ScreenMode = 'ROTATING' | 'FEATURED' | 'DRINKS' | 'FOOD' | 'ALL_STATIC'

export interface DisplayThemeConfig {
  id: string
  name: string
  tag: string
  bg: string
  glow1: string
  glow2: string
  headerBg: string
  cardBg: string
  cardBorder: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string
  mutedColor: string
  priceColor: string
  badgeBg: string
  badgeText: string
  isLight?: boolean
}

export const DISPLAY_THEMES: Record<string, DisplayThemeConfig> = {
  'cinepolis-gold': {
    id: 'cinepolis-gold',
    name: 'Cinépolis Dark Gold',
    tag: 'Cine & Gala',
    bg: '#0A0807',
    glow1: '#F59E0B',
    glow2: '#B45309',
    headerBg: 'rgba(0, 0, 0, 0.75)',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(245, 158, 11, 0.25)',
    primaryColor: '#F59E0B',
    secondaryColor: '#B45309',
    accentColor: '#FBBF24',
    textColor: '#FFFFFF',
    mutedColor: '#E2D9D2',
    priceColor: '#F59E0B',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeText: '#FCD34D',
  },
  'specialty-coffee': {
    id: 'specialty-coffee',
    name: 'Café de Especialidad',
    tag: 'Artesanal Tostado',
    bg: '#0F0B08',
    glow1: '#C08552',
    glow2: '#5E3023',
    headerBg: 'rgba(15, 11, 8, 0.85)',
    cardBg: 'rgba(192, 133, 82, 0.08)',
    cardBorder: 'rgba(192, 133, 82, 0.35)',
    primaryColor: '#C08552',
    secondaryColor: '#5E3023',
    accentColor: '#D4A373',
    textColor: '#FDFBF7',
    mutedColor: '#D7CCC8',
    priceColor: '#E0A96D',
    badgeBg: 'rgba(192, 133, 82, 0.2)',
    badgeText: '#E6CCB2',
  },
  'matcha-emerald': {
    id: 'matcha-emerald',
    name: 'Matcha & Esmeralda',
    tag: 'Bistro Botánico',
    bg: '#06130D',
    glow1: '#10B981',
    glow2: '#064E3B',
    headerBg: 'rgba(6, 19, 13, 0.85)',
    cardBg: 'rgba(16, 185, 129, 0.07)',
    cardBorder: 'rgba(16, 185, 129, 0.28)',
    primaryColor: '#10B981',
    secondaryColor: '#064E3B',
    accentColor: '#34D399',
    textColor: '#ECFDF5',
    mutedColor: '#A7F3D0',
    priceColor: '#34D399',
    badgeBg: 'rgba(16, 185, 129, 0.18)',
    badgeText: '#6EE7B7',
  },
  'midnight-neon': {
    id: 'midnight-neon',
    name: 'Midnight Neón',
    tag: 'Boutique Urbana',
    bg: '#090814',
    glow1: '#EC4899',
    glow2: '#8B5CF6',
    headerBg: 'rgba(9, 8, 20, 0.85)',
    cardBg: 'rgba(139, 92, 246, 0.09)',
    cardBorder: 'rgba(236, 72, 153, 0.32)',
    primaryColor: '#EC4899',
    secondaryColor: '#8B5CF6',
    accentColor: '#F472B6',
    textColor: '#FAF5FF',
    mutedColor: '#DDD6FE',
    priceColor: '#F472B6',
    badgeBg: 'rgba(236, 72, 153, 0.2)',
    badgeText: '#FBCFE8',
  },
  'clean-marble': {
    id: 'clean-marble',
    name: 'Mármol Blanco (Modo Día)',
    tag: 'Luz Natural',
    bg: '#F8F6F0',
    glow1: '#E2D9D2',
    glow2: '#D7CCC8',
    headerBg: 'rgba(255, 255, 255, 0.95)',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(43, 23, 18, 0.12)',
    primaryColor: '#C08552',
    secondaryColor: '#8C5338',
    accentColor: '#B45309',
    textColor: '#24140E',
    mutedColor: '#6B5E55',
    priceColor: '#B45309',
    badgeBg: 'rgba(192, 133, 82, 0.12)',
    badgeText: '#78350F',
    isLight: true,
  },
}



export default function DisplayClient({
  initialBusiness,
  initialCategories,
}: DisplayClientProps) {
  const [business] = useState<BusinessData>(initialBusiness)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Configuración de pantalla
  const [screenMode, setScreenMode] = useState<ScreenMode>('ROTATING')
  const [selectedThemeId, setSelectedThemeId] = useState<string>('cinepolis-gold')
  const [isPaused, setIsPaused] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [showConfigMenu, setShowConfigMenu] = useState(false)
  const [slideDuration, setSlideDuration] = useState(12) // segundos por slide
  const [progress, setProgress] = useState(0)

  // Tema activo resuelto
  const activeTheme: DisplayThemeConfig = useMemo(() => {
    if (selectedThemeId === 'brand-theme') {
      const pColor = business.theme?.primaryColor || '#C08552'
      const sColor = business.theme?.secondaryColor || '#5E3023'
      const aColor = business.theme?.accentColor || '#C08552'
      return {
        id: 'brand-theme',
        name: 'Identidad de Marca',
        tag: 'Personalizado',
        bg: '#0D0A08',
        glow1: pColor,
        glow2: sColor,
        headerBg: 'rgba(13, 10, 8, 0.85)',
        cardBg: 'rgba(255, 255, 255, 0.05)',
        cardBorder: `${pColor}40`,
        primaryColor: pColor,
        secondaryColor: sColor,
        accentColor: aColor,
        textColor: '#FFFFFF',
        mutedColor: '#D1C7BD',
        priceColor: aColor,
        badgeBg: `${pColor}25`,
        badgeText: aColor,
      }
    }
    return DISPLAY_THEMES[selectedThemeId] || DISPLAY_THEMES['cinepolis-gold']
  }, [selectedThemeId, business.theme])

  // Identificar productos destacados (Nuevos o De Temporada)
  const featuredProducts = useMemo(() => {
    const list: Product[] = []
    categories.forEach((cat) => {
      cat.products.forEach((p) => {
        if (p.isNew || p.isSeasonal) {
          list.push(p)
        }
      })
    })
    return list
  }, [categories])

  // Categorías de bebidas vs alimentos
  const drinkCategories = useMemo(() => {
    return categories.filter((c) => {
      const lower = c.name.toLowerCase()
      return (
        lower.includes('café') ||
        lower.includes('cafe') ||
        lower.includes('bebida') ||
        lower.includes('frappe') ||
        lower.includes('té') ||
        lower.includes('te') ||
        lower.includes('latte') ||
        lower.includes('cold brew') ||
        lower.includes('jugo') ||
        lower.includes('smoothie')
      )
    })
  }, [categories])

  const foodCategories = useMemo(() => {
    return categories.filter((c) => !drinkCategories.some((dc) => dc.id === c.id))
  }, [categories, drinkCategories])

  // Cargar modo y tema desde localStorage o URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlMode = params.get('mode') as ScreenMode | null
      const urlTheme = params.get('theme') as string | null
      const savedMode = localStorage.getItem('poscafe_display_mode') as ScreenMode | null
      const savedTheme = localStorage.getItem('poscafe_display_theme')

      if (urlMode) {
        setScreenMode(urlMode)
      } else if (savedMode) {
        setScreenMode(savedMode)
      }

      if (urlTheme && (DISPLAY_THEMES[urlTheme] || urlTheme === 'brand-theme')) {
        setSelectedThemeId(urlTheme)
      } else if (savedTheme && (DISPLAY_THEMES[savedTheme] || savedTheme === 'brand-theme')) {
        setSelectedThemeId(savedTheme)
      }
    }
  }, [])

  const handleModeChange = (mode: ScreenMode) => {
    setScreenMode(mode)
    setCurrentSlideIndex(0)
    setProgress(0)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_mode', mode)
    }
  }

  const handleThemeChange = (themeId: string) => {
    setSelectedThemeId(themeId)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_theme', themeId)
    }
  }

  // Generar lista de slides a rotar según el modo.
  // Paginación inteligente: si una categoría tiene más de 4 productos, la dividimos en páginas de hasta 4
  // para que cada producto conserve FOTOS GRANDES, TÍTULOS GRANDES y SABORES EN LISTA sin amontonarse.
  const slides = useMemo(() => {
    const ITEMS_PER_SLIDE = 4

    const createCategorySlides = (cats: Category[]) => {
      const catSlides: Array<{
        type: 'category'
        title: string
        category: Category
        products: Product[]
        pageNumber: number
        totalPages: number
      }> = []

      cats.forEach((cat) => {
        const totalItems = cat.products.length
        if (totalItems <= ITEMS_PER_SLIDE) {
          catSlides.push({
            type: 'category',
            title: cat.name,
            category: cat,
            products: cat.products,
            pageNumber: 1,
            totalPages: 1,
          })
        } else {
          const totalPages = Math.ceil(totalItems / ITEMS_PER_SLIDE)
          for (let p = 0; p < totalPages; p++) {
            const pageProducts = cat.products.slice(p * ITEMS_PER_SLIDE, (p + 1) * ITEMS_PER_SLIDE)
            catSlides.push({
              type: 'category',
              title: `${cat.name} (${p + 1}/${totalPages})`,
              category: cat,
              products: pageProducts,
              pageNumber: p + 1,
              totalPages,
            })
          }
        }
      })

      return catSlides
    }

    if (screenMode === 'FEATURED') {
      return [{ type: 'featured' as const, title: 'Especialidades & Novedades', data: featuredProducts }]
    }

    if (screenMode === 'DRINKS') {
      return createCategorySlides(drinkCategories)
    }

    if (screenMode === 'FOOD') {
      return createCategorySlides(foodCategories)
    }

    if (screenMode === 'ALL_STATIC') {
      return [{ type: 'all_static' as const, title: 'Menú Completo' }]
    }

    // MODO ROTATING (Cinépolis):
    const list: Array<
      | { type: 'featured'; title: string; data: Product[] }
      | {
          type: 'category'
          title: string
          category: Category
          products: Product[]
          pageNumber: number
          totalPages: number
        }
    > = []

    if (featuredProducts.length > 0) {
      list.push({
        type: 'featured',
        title: 'Novedades & Temporada',
        data: featuredProducts,
      })
    }

    // Diapositivas de categorías con paginación amplia
    const categorySlides = createCategorySlides(categories)
    categorySlides.forEach((cs) => list.push(cs))

    return list.length > 0 ? list : [{ type: 'all_static' as const, title: 'Menú' }]
  }, [screenMode, featuredProducts, categories, drinkCategories, foodCategories])

  // Temporizador de rotación de slides con barra de progreso fluida
  useEffect(() => {
    if (slides.length <= 1 || isPaused || screenMode === 'ALL_STATIC') {
      setProgress(0)
      return
    }

    const intervalMs = 100
    const step = 100 / ((slideDuration * 1000) / intervalMs)

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlideIndex((oldIdx) => (oldIdx + 1) % slides.length)
          return 0
        }
        return prev + step
      })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [slides.length, isPaused, slideDuration, screenMode])

  // Montaje en cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-refresco en segundo plano cada 60 segundos
  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        setIsUpdating(true)
        const res = await fetch(`/api/public/display?b=${business.id}`)
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data?.categories) {
            setCategories(json.data.categories)
          }
        }
      } catch (err) {
        console.error('Error auto-refreshing display:', err)
      } finally {
        setIsUpdating(false)
      }
    }

    const interval = setInterval(fetchLatestData, 60000)
    return () => clearInterval(interval)
  }, [business.id])

  // Manejo de pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
        setIsFullscreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const currentSlide = slides[currentSlideIndex] || slides[0]

  // Alternancia dinámica del logo superior (Esquina izquierda ↔ Esquina derecha según la diapositiva)
  const isLogoTopLeft = currentSlideIndex % 2 === 0
  const isLogoTopRight = !isLogoTopLeft

  // Renderizar logo grande, libre y adaptado en la parte superior
  const renderBrandLogo = (extraClass = '', sizeClass = 'h-14 sm:h-18 lg:h-20 xl:h-24') => {
    return (
      <motion.div
        key={`top-logo-${isLogoTopLeft ? 'left' : 'right'}`}
        initial={{ opacity: 0, scale: 0.9, x: isLogoTopLeft ? -15 : 15 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: isLogoTopLeft ? -15 : 15 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`flex items-center shrink-0 select-none ${extraClass}`}
      >
        {business.logoUrl ? (
          <img
            src={business.logoUrl}
            alt={business.name}
            className={`${sizeClass} w-auto max-w-[220px] sm:max-w-[280px] lg:max-w-[340px] object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.7)] select-none`}
          />
        ) : business.isotypeUrl ? (
          <img
            src={business.isotypeUrl}
            alt={business.name}
            className={`${sizeClass} w-auto object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)] select-none`}
          />
        ) : (
          <div className="flex items-center gap-3">
            <Coffee
              className="w-10 h-10 sm:w-14 sm:h-14 drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
              style={{ color: activeTheme.accentColor }}
            />
            <span
              className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-wider drop-shadow-md"
              style={{ color: activeTheme.textColor }}
            >
              {business.name}
            </span>
          </div>
        )}
      </motion.div>
    )
  }

  // Renderizar ícono barista de placeholder para productos sin foto
  const renderProductPlaceholder = (catName?: string) => {
    const lower = (catName || '').toLowerCase()
    if (lower.includes('fría') || lower.includes('fria') || lower.includes('cold') || lower.includes('frapp')) {
      return <ColdDrinkIcon className="w-14 h-14 opacity-50" color={activeTheme.accentColor} />
    }
    if (lower.includes('café') || lower.includes('cafe') || lower.includes('espresso') || lower.includes('latte')) {
      return <MokaPotIcon className="w-14 h-14 opacity-50" color={activeTheme.accentColor} />
    }
    if (lower.includes('té') || lower.includes('te') || lower.includes('tisana')) {
      return <CoffeeBranchVector className="w-14 h-14 opacity-50" color={activeTheme.accentColor} />
    }
    return <Coffee className="w-14 h-14 opacity-50" style={{ color: activeTheme.accentColor }} />
  }

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col justify-between select-none relative font-sans transition-colors duration-500"
      style={{
        backgroundColor: activeTheme.bg,
        color: activeTheme.textColor,
      }}
    >
      {/* GLOWS CINEMATOGRÁFICOS DE AMBIENTACIÓN */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 left-1/4 w-[750px] h-[750px] rounded-full blur-[220px] opacity-25 transition-all duration-700"
          style={{ backgroundColor: activeTheme.glow1 }}
        />
        <div
          className="absolute -bottom-40 right-1/4 w-[750px] h-[750px] rounded-full blur-[240px] opacity-20 transition-all duration-700"
          style={{ backgroundColor: activeTheme.glow2 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      </div>

      {/* BARRA DE PROGRESO DE ROTACIÓN SUPERIOR (ESTILO CINÉPOLIS) */}
      {slides.length > 1 && screenMode !== 'ALL_STATIC' && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-white/10 z-50">
          <div
            className="h-full transition-all duration-100 ease-linear shadow-lg"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(to right, ${activeTheme.primaryColor}, ${activeTheme.accentColor})`,
              boxShadow: `0 0 12px ${activeTheme.accentColor}80`,
            }}
          />
        </div>
      )}

      {/* INDICADOR INFERIOR DE SLIDES (PUNTITOS DISCRETOS SI HAY ROTACIÓN) */}
      {slides.length > 1 && screenMode !== 'ALL_STATIC' && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-md shadow-2xl transition-all"
          style={{
            backgroundColor: activeTheme.isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)',
            borderColor: activeTheme.cardBorder,
          }}
        >
          {slides.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCurrentSlideIndex(idx)
                setProgress(0)
              }}
              className={`transition-all rounded-full cursor-pointer ${
                currentSlideIndex === idx
                  ? 'w-7 h-2 shadow-sm'
                  : 'w-2 h-2 opacity-30 hover:opacity-60'
              }`}
              style={{
                backgroundColor: currentSlideIndex === idx ? activeTheme.accentColor : activeTheme.textColor,
                boxShadow: currentSlideIndex === idx ? `0 0 8px ${activeTheme.accentColor}` : 'none',
              }}
              title={s.title}
            />
          ))}
          <span
            className="text-[11px] font-mono ml-1 font-bold"
            style={{ color: activeTheme.mutedColor }}
          >
            {currentSlideIndex + 1}/{slides.length}
          </span>
        </div>
      )}

      {/* CONTROLES FLOTANTES DISCRETOS DE PANTALLA TV (OCULTOS / SUTILES) */}
      <div className="fixed bottom-4 right-6 z-50 flex items-center gap-1.5 opacity-20 hover:opacity-100 transition-all duration-300 p-1.5 rounded-2xl backdrop-blur-xl bg-black/50 border border-white/10 shadow-2xl">
        {/* Botón Pausa / Reproducir rotación */}
        {slides.length > 1 && screenMode !== 'ALL_STATIC' && (
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="w-8 h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
              borderColor: activeTheme.cardBorder,
              color: activeTheme.textColor,
            }}
            title={isPaused ? 'Reanudar rotación' : 'Pausar rotación'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Configuración de Pantalla y Tema */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowConfigMenu(!showConfigMenu)}
            className="w-8 h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: showConfigMenu
                ? `${activeTheme.primaryColor}30`
                : activeTheme.isLight
                ? '#FFFFFF'
                : 'rgba(255,255,255,0.08)',
              borderColor: showConfigMenu ? activeTheme.primaryColor : activeTheme.cardBorder,
              color: showConfigMenu ? activeTheme.accentColor : activeTheme.textColor,
            }}
            title="Configuración de Pantalla & Tema"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {/* Menú Desplegable de Configuración de Pantalla */}
          {showConfigMenu && (
            <div
              className="absolute right-0 bottom-12 w-80 rounded-3xl border shadow-2xl backdrop-blur-2xl p-4 z-50 space-y-4"
              style={{
                backgroundColor: activeTheme.isLight ? '#FFFFFFFA' : '#14100EFA',
                borderColor: activeTheme.cardBorder,
                color: activeTheme.textColor,
              }}
            >
              <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: activeTheme.cardBorder }}>
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4" style={{ color: activeTheme.accentColor }} />
                  <span className="text-xs font-bold uppercase tracking-wider">Ajustes de Pantalla TV</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigMenu(false)}
                  className="text-xs cursor-pointer opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>

              {/* MODOS DE PANTALLA */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">
                  Rol de esta Pantalla
                </span>
                {[
                  { id: 'ROTATING' as ScreenMode, label: '🎬 Rotación Cinépolis', desc: 'Destacados y categorías con fotos grandes' },
                  { id: 'FEATURED' as ScreenMode, label: '✨ Solo Vitrina Estelar', desc: 'Novedades y platillos de temporada' },
                  { id: 'DRINKS' as ScreenMode, label: '☕ Solo Bebidas & Café', desc: 'Especial para TV sobre barra / cafetera' },
                  { id: 'FOOD' as ScreenMode, label: '🥐 Solo Pan & Alimentos', desc: 'Especial para TV sobre vitrina de postres' },
                  { id: 'ALL_STATIC' as ScreenMode, label: '📋 Vista Completa Fija', desc: 'Todas las categorías simultáneas' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      handleModeChange(opt.id)
                    }}
                    className={`w-full text-left p-2 rounded-2xl border text-xs transition-all flex flex-col cursor-pointer ${
                      screenMode === opt.id ? 'ring-1 font-bold' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor:
                        screenMode === opt.id
                          ? `${activeTheme.primaryColor}25`
                          : activeTheme.isLight
                          ? '#00000005'
                          : 'rgba(255,255,255,0.04)',
                      borderColor: screenMode === opt.id ? activeTheme.primaryColor : activeTheme.cardBorder,
                      color: screenMode === opt.id ? activeTheme.accentColor : activeTheme.textColor,
                    }}
                  >
                    <span>{opt.label}</span>
                    <span className="text-[10px] opacity-60 font-normal">{opt.desc}</span>
                  </button>
                ))}
              </div>

              {/* TEMAS VISUALES DE PANTALLA */}
              <div className="pt-2 border-t space-y-1.5" style={{ borderColor: activeTheme.cardBorder }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                    <Palette className="w-3 h-3" style={{ color: activeTheme.accentColor }} />
                    Tema de Color TV
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(DISPLAY_THEMES).map((th) => {
                    const isCurrent = selectedThemeId === th.id
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => handleThemeChange(th.id)}
                        className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                          isCurrent ? 'ring-2' : 'opacity-75 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: th.bg,
                          borderColor: isCurrent ? th.accentColor : 'rgba(255,255,255,0.15)',
                          color: th.textColor,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold truncate">{th.name}</span>
                          {isCurrent && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: th.primaryColor }} />
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: th.accentColor }} />
                          <span className="text-[9px] opacity-60 ml-auto">{th.tag}</span>
                        </div>
                      </button>
                    )
                  })}

                  {/* Opción tema personalizado de la marca */}
                  <button
                    type="button"
                    onClick={() => handleThemeChange('brand-theme')}
                    className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between gap-1 col-span-2 ${
                      selectedThemeId === 'brand-theme' ? 'ring-2' : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: '#0D0A08',
                      borderColor:
                        selectedThemeId === 'brand-theme'
                          ? business.theme?.accentColor || '#C08552'
                          : 'rgba(255,255,255,0.15)',
                      color: '#FFFFFF',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold">Tema del Negocio</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/15">SaaS Custom</span>
                    </div>
                    <span className="text-[9px] opacity-60">Usa colores de {business.name}</span>
                  </button>
                </div>
              </div>

              {/* Duración de transición */}
              {screenMode === 'ROTATING' && (
                <div className="pt-2 border-t" style={{ borderColor: activeTheme.cardBorder }}>
                  <div className="flex items-center justify-between text-[10px] font-semibold opacity-70 mb-1">
                    <span>Segundos por diapositiva</span>
                    <span className="font-mono font-bold" style={{ color: activeTheme.accentColor }}>
                      {slideDuration}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="30"
                    step="2"
                    value={slideDuration}
                    onChange={(e) => setSlideDuration(Number(e.target.value))}
                    className="w-full cursor-pointer accent-amber-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botón Pantalla Completa */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="w-8 h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
          style={{
            backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
            borderColor: activeTheme.cardBorder,
            color: activeTheme.textColor,
          }}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (TV)'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL A PANTALLA COMPLETA: ANIMACIÓN ENTRE SLIDES */}
      <main className="flex-1 min-h-0 relative z-10 px-6 sm:px-10 lg:px-12 py-4 sm:py-5 overflow-hidden flex flex-col justify-between h-full">
        <AnimatePresence mode="wait">
          {/* ======================================================== */}
          {/* SLIDE: VITRINA DESTACADOS / CARTELERA CINÉPOLIS          */}
          {/* ======================================================== */}
          {currentSlide.type === 'featured' && (
            <motion.div
              key="featured-slide"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
              className="h-full w-full flex flex-col justify-between"
            >
              {/* TÍTULO DE VITRINA ADAPTADO SEGÚN ESQUINA SUPERIOR DEL LOGO */}
              <div className="flex items-center justify-between mb-4 gap-6 shrink-0">
                {isLogoTopLeft ? (
                  <>
                    <div className="flex items-center gap-5 min-w-0">
                      {renderBrandLogo()}
                      <div className="h-12 w-px bg-white/15 hidden md:block shrink-0" />
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full animate-pulse shadow-md shrink-0"
                          style={{
                            backgroundColor: activeTheme.accentColor,
                            boxShadow: `0 0 14px ${activeTheme.accentColor}`,
                          }}
                        />
                        <div className="min-w-0">
                          <h2
                            className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-wider uppercase flex items-center gap-3 truncate"
                            style={{ color: activeTheme.textColor }}
                          >
                            <span>Cartelera de Temporada</span>
                            <span
                              className="text-xs lg:text-sm font-bold px-3 py-1 rounded-full text-white shadow-lg shrink-0"
                              style={{
                                background: `linear-gradient(to right, ${activeTheme.primaryColor}, ${activeTheme.accentColor})`,
                              }}
                            >
                              Edición Especial
                            </span>
                          </h2>
                        </div>
                      </div>
                    </div>
                    <div
                      className="hidden md:flex items-center gap-2 text-xs font-mono font-bold shrink-0"
                      style={{ color: activeTheme.accentColor }}
                    >
                      <Flame className="w-4 h-4 text-rose-500" />
                      <span>Lo más recomendado por nuestros baristas</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full animate-pulse shadow-md shrink-0"
                          style={{
                            backgroundColor: activeTheme.accentColor,
                            boxShadow: `0 0 14px ${activeTheme.accentColor}`,
                          }}
                        />
                        <h2
                          className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-wider uppercase flex items-center gap-3 truncate"
                          style={{ color: activeTheme.textColor }}
                        >
                          <span>Cartelera de Temporada</span>
                          <span
                            className="text-xs lg:text-sm font-bold px-3 py-1 rounded-full text-white shadow-lg shrink-0"
                            style={{
                              background: `linear-gradient(to right, ${activeTheme.primaryColor}, ${activeTheme.accentColor})`,
                            }}
                          >
                            Edición Especial
                          </span>
                        </h2>
                      </div>
                      <div
                        className="flex items-center gap-2 text-xs font-mono font-bold mt-1 ml-6.5"
                        style={{ color: activeTheme.accentColor }}
                      >
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        <span>Lo más recomendado por nuestros baristas</span>
                      </div>
                    </div>
                    {renderBrandLogo()}
                  </>
                )}
              </div>

              {/* GRID DE PRODUCTOS DESTACADOS CON FOTOS GRANDES Y SABORES DEBAJO DEL TÍTULO */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 overflow-hidden">
                {currentSlide.data.slice(0, 3).map((product) => {
                  const allModifiers = product.modifierGroups?.flatMap((mg) => mg.modifiers) || []

                  return (
                    <div
                      key={product.id}
                      className="relative rounded-3xl border p-4 sm:p-5 flex flex-col justify-between shadow-2xl backdrop-blur-xl overflow-hidden group transition-all duration-300 min-h-0"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
                      {/* Glow cálido en tarjeta */}
                      <div
                        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
                        style={{ backgroundColor: activeTheme.primaryColor }}
                      />

                      <div className="min-h-0">
                        {/* FOTO GRANDE DE IMPACTO */}
                        <div
                          className="relative w-full h-36 sm:h-44 lg:h-48 rounded-2xl overflow-hidden mb-3 border shadow-inner flex items-center justify-center bg-black/30 shrink-0"
                          style={{ borderColor: activeTheme.cardBorder }}
                        >
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-4">
                              {renderProductPlaceholder()}
                              <span
                                className="text-[10px] uppercase tracking-widest font-mono mt-2 font-bold"
                                style={{ color: activeTheme.mutedColor }}
                              >
                                Especialidad de la Casa
                              </span>
                            </div>
                          )}

                          {/* BADGES EN ESQUINA SUPERIOR DE LA IMAGEN */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                            {product.isNew && (
                              <span
                                className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg"
                                style={{
                                  backgroundColor: activeTheme.accentColor,
                                  color: activeTheme.isLight ? '#FFFFFF' : '#000000',
                                }}
                              >
                                ✨ NUEVO
                              </span>
                            )}
                            {product.isSeasonal && (
                              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-lg">
                                🍁 TEMPORADA
                              </span>
                            )}
                          </div>
                        </div>

                        {/* NOMBRE DEL PRODUCTO */}
                        <h3
                          className="text-2xl lg:text-3xl font-black tracking-tight leading-tight uppercase"
                          style={{ color: activeTheme.textColor }}
                        >
                          {product.name}
                        </h3>

                        {/* DESCRIPCIÓN DEL PRODUCTO */}
                        {product.description && (
                          <p
                            className="text-xs lg:text-sm line-clamp-2 mt-1 leading-relaxed italic"
                            style={{ color: activeTheme.mutedColor }}
                          >
                            {product.description}
                          </p>
                        )}

                        {/* ======================================================== */}
                        {/* SABORES EN LISTA DIRECTAMENTE DEBAJO DEL TÍTULO          */}
                        {/* ======================================================== */}
                        {product.modifierGroups && product.modifierGroups.length > 0 && (
                          <div
                            className="mt-3 p-3 rounded-2xl border space-y-2"
                            style={{
                              backgroundColor: activeTheme.isLight ? '#00000005' : 'rgba(255,255,255,0.04)',
                              borderColor: activeTheme.cardBorder,
                            }}
                          >
                            {product.modifierGroups.map((group) => (
                              <div key={group.id} className="space-y-1">
                                <span
                                  className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                                  style={{ color: activeTheme.accentColor }}
                                >
                                  <Sparkles className="w-3 h-3" />
                                  {group.name}:
                                </span>
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {group.modifiers.map((mod) => (
                                    <span
                                      key={mod.id}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl border shadow-xs"
                                      style={{
                                        backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                                        borderColor: activeTheme.cardBorder,
                                        color: activeTheme.textColor,
                                      }}
                                    >
                                      <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: activeTheme.accentColor }}
                                      />
                                      <span>{mod.name}</span>
                                      {mod.extraPrice > 0 && (
                                        <span
                                          className="font-bold text-[10px]"
                                          style={{ color: activeTheme.accentColor }}
                                        >
                                          (+${mod.extraPrice.toFixed(0)})
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* SECCIÓN DE TAMAÑOS / PRECIOS */}
                      <div
                        className="pt-3 border-t mt-3 space-y-2"
                        style={{ borderColor: activeTheme.cardBorder }}
                      >
                        {product.variants.length > 1 ? (
                          <div>
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                              style={{ color: activeTheme.accentColor }}
                            >
                              Tamaños Disponibles
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {product.variants.map((v) => (
                                <div
                                  key={v.id}
                                  className="border rounded-xl px-2.5 py-1.5 text-center flex flex-col justify-center shadow-sm"
                                  style={{
                                    backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                                    borderColor: activeTheme.cardBorder,
                                  }}
                                >
                                  <span
                                    className="text-[10px] uppercase font-semibold truncate"
                                    style={{ color: activeTheme.mutedColor }}
                                  >
                                    {v.name}
                                  </span>
                                  <strong
                                    className="text-base font-black"
                                    style={{ color: activeTheme.priceColor }}
                                  >
                                    ${v.price.toFixed(0)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-baseline justify-between">
                            <span
                              className="text-xs font-bold uppercase tracking-wider"
                              style={{ color: activeTheme.mutedColor }}
                            >
                              Precio
                            </span>
                            <strong
                              className="text-3xl font-black"
                              style={{ color: activeTheme.priceColor }}
                            >
                              ${product.minPrice.toFixed(2)}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* SLIDE: CATEGORÍA DETALLADA (FOTOS GRANDES, SABORES Y TAMAÑOS) */}
          {/* ======================================================== */}
          {currentSlide.type === 'category' && currentSlide.category && (
            <motion.div
              key={`${currentSlide.category.id}-p${currentSlide.pageNumber}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="h-full w-full flex flex-col justify-between"
            >
              {/* ENCABEZADO DE CATEGORÍA ADAPTADO SEGÚN ESQUINA DEL LOGO */}
              <div
                className="border-b pb-3 mb-4 flex items-center justify-between gap-6 shrink-0"
                style={{ borderColor: activeTheme.cardBorder }}
              >
                {isLogoTopLeft ? (
                  <>
                    <div className="flex items-center gap-5 min-w-0">
                      {renderBrandLogo()}
                      <div className="h-12 w-px bg-white/15 hidden md:block shrink-0" />
                      <div className="min-w-0">
                        <h2
                          className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-wide uppercase drop-shadow-sm flex items-center gap-3 truncate"
                          style={{ color: activeTheme.textColor }}
                        >
                          <span>{currentSlide.category.name}</span>
                          {currentSlide.totalPages > 1 && (
                            <span
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0"
                              style={{
                                backgroundColor: activeTheme.badgeBg,
                                color: activeTheme.badgeText,
                                borderColor: activeTheme.cardBorder,
                              }}
                            >
                              Pág {currentSlide.pageNumber}/{currentSlide.totalPages}
                            </span>
                          )}
                        </h2>
                        <p
                          className="text-xs uppercase tracking-widest font-semibold mt-0.5 truncate"
                          style={{ color: activeTheme.mutedColor }}
                        >
                          Elaborado artesanalmente con ingredientes selectos
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border font-mono"
                        style={{
                          backgroundColor: activeTheme.badgeBg,
                          color: activeTheme.badgeText,
                          borderColor: activeTheme.cardBorder,
                        }}
                      >
                        {currentSlide.category.products.length} {currentSlide.category.products.length === 1 ? 'Especialidad' : 'Especialidades'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full shadow-md shrink-0"
                          style={{
                            backgroundColor: activeTheme.primaryColor,
                            boxShadow: `0 0 14px ${activeTheme.primaryColor}`,
                          }}
                        />
                        <h2
                          className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-wide uppercase drop-shadow-sm flex items-center gap-3 truncate"
                          style={{ color: activeTheme.textColor }}
                        >
                          <span>{currentSlide.category.name}</span>
                          {currentSlide.totalPages > 1 && (
                            <span
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0"
                              style={{
                                backgroundColor: activeTheme.badgeBg,
                                color: activeTheme.badgeText,
                                borderColor: activeTheme.cardBorder,
                              }}
                            >
                              Pág {currentSlide.pageNumber}/{currentSlide.totalPages}
                            </span>
                          )}
                        </h2>
                        <span
                          className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border font-mono shrink-0 ml-2"
                          style={{
                            backgroundColor: activeTheme.badgeBg,
                            color: activeTheme.badgeText,
                            borderColor: activeTheme.cardBorder,
                          }}
                        >
                          {currentSlide.category.products.length} {currentSlide.category.products.length === 1 ? 'Especialidad' : 'Especialidades'}
                        </span>
                      </div>
                      <p
                        className="text-xs uppercase tracking-widest font-semibold mt-1 ml-6.5"
                        style={{ color: activeTheme.mutedColor }}
                      >
                        Elaborado artesanalmente con ingredientes selectos
                      </p>
                    </div>
                    {renderBrandLogo()}
                  </>
                )}
              </div>

              {/* LISTA DE PRODUCTOS EN GRID 2X2 DE ALTO IMPACTO (FOTOS GRANDES, SABORES DEBAJO DEL TÍTULO Y TAMAÑOS) */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 overflow-hidden content-start">
                {currentSlide.products.map((product) => {
                  const hasMultiSizes = product.variants.length > 1
                  const allModifiers = product.modifierGroups?.flatMap((mg) => mg.modifiers) || []

                  return (
                    <div
                      key={product.id}
                      className="rounded-3xl border p-4 sm:p-5 flex items-start sm:items-stretch gap-4 sm:gap-6 shadow-xl backdrop-blur-md relative overflow-hidden group transition-all duration-300"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
                      {/* FOTOGRAFÍA GRANDE DEL PRODUCTO */}
                      <div
                        className="relative w-28 h-28 sm:w-36 sm:h-36 lg:w-40 lg:h-40 shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden border shadow-lg bg-black/30 flex items-center justify-center group-hover:scale-102 transition-transform duration-500"
                        style={{ borderColor: activeTheme.cardBorder }}
                      >
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-center">
                            {renderProductPlaceholder(currentSlide.category.name)}
                            <span
                              className="text-[9px] uppercase font-mono mt-1 font-bold"
                              style={{ color: activeTheme.mutedColor }}
                            >
                              Artesanal
                            </span>
                          </div>
                        )}

                        {/* BADGES SOBRE LA FOTO */}
                        {(product.isNew || product.isSeasonal) && (
                          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                            {product.isNew && (
                              <span
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-md"
                                style={{
                                  backgroundColor: activeTheme.accentColor,
                                  color: activeTheme.isLight ? '#FFFFFF' : '#000000',
                                }}
                              >
                                NUEVO
                              </span>
                            )}
                            {product.isSeasonal && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-md bg-rose-600 text-white">
                                TEMPORADA
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CONTENIDO DEL PRODUCTO: TÍTULO GRANDE, SABORES EN LISTA Y TAMAÑOS */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          {/* TÍTULO MÁS GRANDE Y CLARO */}
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-snug line-clamp-2"
                              style={{ color: activeTheme.textColor }}
                            >
                              {product.name}
                            </h3>

                            {/* Precio único en la esquina si no tiene variantes */}
                            {!hasMultiSizes && (
                              <span
                                className="text-xl sm:text-2xl font-black shrink-0"
                                style={{ color: activeTheme.priceColor }}
                              >
                                ${product.minPrice.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* DESCRIPCIÓN */}
                          {product.description && (
                            <p
                              className="text-xs sm:text-sm line-clamp-2 mt-1 italic leading-relaxed"
                              style={{ color: activeTheme.mutedColor }}
                            >
                              {product.description}
                            </p>
                          )}

                          {/* ======================================================== */}
                          {/* LOS SABORES EN LISTA DEBAJO DE CADA TÍTULO               */}
                          {/* ======================================================== */}
                          {product.modifierGroups && product.modifierGroups.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {product.modifierGroups.map((group) => (
                                <div key={group.id} className="space-y-0.5">
                                  <span
                                    className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
                                    style={{ color: activeTheme.accentColor }}
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    {group.name}:
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {group.modifiers.map((mod) => (
                                      <span
                                        key={mod.id}
                                        className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-xl border shadow-2xs"
                                        style={{
                                          backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                                          borderColor: activeTheme.cardBorder,
                                          color: activeTheme.textColor,
                                        }}
                                      >
                                        <span
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: activeTheme.accentColor }}
                                        />
                                        <span>{mod.name}</span>
                                        {mod.extraPrice > 0 && (
                                          <span
                                            className="font-bold text-[10px]"
                                            style={{ color: activeTheme.accentColor }}
                                          >
                                            (+${mod.extraPrice.toFixed(0)})
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* DESGLOSE DE TAMAÑOS CON PRECIOS */}
                        {hasMultiSizes && (
                          <div className="mt-3 pt-2 border-t" style={{ borderColor: activeTheme.cardBorder }}>
                            <div className="flex items-center gap-2 flex-wrap">
                              {product.variants.map((v) => (
                                <div
                                  key={v.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-xs"
                                  style={{
                                    backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                                    borderColor: activeTheme.cardBorder,
                                  }}
                                >
                                  <span
                                    className="text-[10px] font-bold uppercase tracking-wider opacity-70"
                                    style={{ color: activeTheme.mutedColor }}
                                  >
                                    {v.name}
                                  </span>
                                  <span
                                    className="text-sm sm:text-base font-black"
                                    style={{ color: activeTheme.priceColor }}
                                  >
                                    ${v.price.toFixed(0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* SLIDE: MENÚ COMPLETO ESTÁTICO (TODAS LAS CATEGORÍAS)     */}
          {/* ======================================================== */}
          {currentSlide.type === 'all_static' && (
            <motion.div
              key="all-static"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full flex flex-col justify-between"
            >
              {/* ENCABEZADO ADAPTATIVO EN MODO ESTÁTICO */}
              <div className="flex items-center justify-between mb-4 gap-6 shrink-0">
                {isLogoTopLeft ? (
                  <div className="flex items-center gap-5">
                    {renderBrandLogo()}
                    <div className="h-12 w-px bg-white/15 hidden md:block" />
                    <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-wider" style={{ color: activeTheme.textColor }}>
                      Menú Completo de Especialidades
                    </h2>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-wider" style={{ color: activeTheme.textColor }}>
                      Menú Completo de Especialidades
                    </h2>
                    {renderBrandLogo()}
                  </>
                )}
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-hidden">
                {categories.slice(0, 3).map((cat) => (
                <div
                  key={cat.id}
                  className="border rounded-3xl p-5 flex flex-col h-full shadow-2xl backdrop-blur-md overflow-hidden"
                  style={{
                    backgroundColor: activeTheme.cardBg,
                    borderColor: activeTheme.cardBorder,
                  }}
                >
                  <div
                    className="border-b pb-3 mb-3 flex items-center justify-between"
                    style={{ borderColor: activeTheme.cardBorder }}
                  >
                    <h3
                      className="text-xl font-black uppercase"
                      style={{ color: activeTheme.textColor }}
                    >
                      {cat.name}
                    </h3>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: activeTheme.badgeBg,
                        color: activeTheme.badgeText,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
                      {cat.products.length} ítems
                    </span>
                  </div>

                  <div className="flex-1 overflow-hidden space-y-3">
                    {cat.products.slice(0, 6).map((p) => {
                      const allModifiers = p.modifierGroups?.flatMap((mg) => mg.modifiers) || []

                      return (
                        <div
                          key={p.id}
                          className="flex items-start gap-3 border-b pb-2.5 last:border-0"
                          style={{ borderColor: activeTheme.cardBorder }}
                        >
                          {/* Miniatura de foto */}
                          <div
                            className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border bg-black/30 flex items-center justify-center"
                            style={{ borderColor: activeTheme.cardBorder }}
                          >
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Coffee className="w-5 h-5 opacity-40" style={{ color: activeTheme.accentColor }} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <span
                                className="text-sm font-bold truncate uppercase"
                                style={{ color: activeTheme.textColor }}
                              >
                                {p.name}
                              </span>
                              <div className="shrink-0 text-right">
                                {p.variants.length > 1 ? (
                                  <div className="flex items-center gap-1 text-[11px] font-bold flex-wrap justify-end">
                                    {p.variants.map((v) => (
                                      <span
                                        key={v.id}
                                        className="px-1.5 py-0.5 rounded border"
                                        style={{
                                          borderColor: activeTheme.cardBorder,
                                          color: activeTheme.priceColor,
                                        }}
                                      >
                                        ${v.price.toFixed(0)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span
                                    className="text-sm font-black"
                                    style={{ color: activeTheme.priceColor }}
                                  >
                                    ${p.minPrice.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Sabores y modificadores en detalle completo debajo del título */}
                            {p.modifierGroups && p.modifierGroups.length > 0 && (
                              <div className="mt-1 space-y-0.5 text-[10px]">
                                {p.modifierGroups.map((group) => (
                                  <div key={group.id} className="flex items-baseline gap-1 flex-wrap">
                                    <span className="font-bold shrink-0" style={{ color: activeTheme.accentColor }}>
                                      {group.name}:
                                    </span>
                                    <span className="opacity-85">
                                      {group.modifiers
                                        .map((m) => `${m.name}${m.extraPrice > 0 ? ` (+$${m.extraPrice.toFixed(0)})` : ''}`)
                                        .join(', ')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER / TICKER DE PROMOCIONES Y CORTESÍAS */}
      <footer
        className="relative z-20 px-6 sm:px-10 py-2.5 sm:py-3 border-t backdrop-blur-xl flex items-center justify-between text-xs transition-colors duration-500 shrink-0"
        style={{
          backgroundColor: activeTheme.headerBg,
          borderColor: activeTheme.cardBorder,
          color: activeTheme.mutedColor,
        }}
      >
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-2 font-bold"
            style={{ color: activeTheme.accentColor }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Café de Especialidad 100% Mexicano</span>
          </div>
          <span className="hidden sm:inline opacity-30">•</span>
          <div className="hidden sm:flex items-center gap-2 font-medium">
            <Clock className="w-3.5 h-3.5" style={{ color: activeTheme.primaryColor }} />
            <span>Tostado artesanal y baristas certificados</span>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[11px] font-semibold">
          <span>Precios en {business.currency} con IVA incluido</span>
          {isUpdating && (
            <span className="flex items-center gap-1.5" style={{ color: activeTheme.accentColor }}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Sincronizando...</span>
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}

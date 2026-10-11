'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
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
} from 'lucide-react'

interface Modifier {
  id: string
  name: string
  extraPrice: number
}

interface ModifierGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  isRequired: boolean
  modifiers: Modifier[]
}

interface Variant {
  id: string
  name: string
  price: number
}

interface Product {
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

interface Category {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  products: Product[]
}

interface BusinessData {
  id: string
  name: string
  legalName?: string | null
  logoUrl?: string | null
  currency: string
  timezone: string
  theme: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    darkMode: boolean
  }
}

interface DisplayClientProps {
  initialBusiness: BusinessData
  initialCategories: Category[]
}

type ScreenMode = 'ROTATING' | 'FEATURED' | 'DRINKS' | 'FOOD' | 'ALL_STATIC'

export default function DisplayClient({
  initialBusiness,
  initialCategories,
}: DisplayClientProps) {
  const [business] = useState<BusinessData>(initialBusiness)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [currentDate, setCurrentDate] = useState<string>('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Configuración de pantalla
  const [screenMode, setScreenMode] = useState<ScreenMode>('ROTATING')
  const [isPaused, setIsPaused] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [showConfigMenu, setShowConfigMenu] = useState(false)
  const [slideDuration, setSlideDuration] = useState(12) // segundos por slide
  const [progress, setProgress] = useState(0)

  const primaryColor = business.theme?.primaryColor || '#C08552'
  const secondaryColor = business.theme?.secondaryColor || '#5E3023'

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

  // Cargar modo preferido desde localStorage o URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlMode = params.get('mode') as ScreenMode | null
      const savedMode = localStorage.getItem('poscafe_display_mode') as ScreenMode | null
      if (urlMode) {
        setScreenMode(urlMode)
      } else if (savedMode) {
        setScreenMode(savedMode)
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

  // Generar lista de slides a rotar según el modo
  const slides = useMemo(() => {
    if (screenMode === 'FEATURED') {
      return [{ type: 'featured' as const, title: 'Especialidades & Novedades', data: featuredProducts }]
    }

    if (screenMode === 'DRINKS') {
      return drinkCategories.map((cat) => ({
        type: 'category' as const,
        title: cat.name,
        category: cat,
      }))
    }

    if (screenMode === 'FOOD') {
      return foodCategories.map((cat) => ({
        type: 'category' as const,
        title: cat.name,
        category: cat,
      }))
    }

    if (screenMode === 'ALL_STATIC') {
      return [{ type: 'all_static' as const, title: 'Menú Completo' }]
    }

    // MODO ROTATING (Cinépolis):
    // Si hay productos destacados, el Slide 0 es la Vitrina Cinépolis
    const list: Array<
      | { type: 'featured'; title: string; data: Product[] }
      | { type: 'category'; title: string; category: Category }
    > = []

    if (featuredProducts.length > 0) {
      list.push({
        type: 'featured',
        title: 'Novedades & Temporada',
        data: featuredProducts,
      })
    }

    // Dividir categorías en slides
    categories.forEach((cat) => {
      list.push({
        type: 'category',
        title: cat.name,
        category: cat,
      })
    })

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

  // Reloj digital en vivo
  useEffect(() => {
    setMounted(true)
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
      setCurrentDate(
        now.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      )
    }

    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
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

  return (
    <div className="h-screen w-screen bg-[#0A0807] text-[#F3E9DC] overflow-hidden flex flex-col justify-between selection:bg-[#C08552] selection:text-white select-none relative font-sans">
      {/* GLOWS CINEMATOGRÁFICOS DE AMBIENTACIÓN */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 left-1/4 w-[750px] h-[750px] rounded-full blur-[200px] opacity-25"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute -bottom-40 right-1/4 w-[750px] h-[750px] rounded-full blur-[220px] opacity-20"
          style={{ backgroundColor: secondaryColor }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      </div>

      {/* BARRA DE PROGRESO DE ROTACIÓN SUPERIOR (ESTILO CINÉPOLIS) */}
      {slides.length > 1 && screenMode !== 'ALL_STATIC' && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-white/10 z-50">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-200 transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(245,158,11,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* HEADER DE LA PANTALLA TV */}
      <header className="relative z-20 px-8 py-4 border-b border-white/10 flex items-center justify-between backdrop-blur-xl bg-black/60 shadow-lg">
        <div className="flex items-center gap-4">
          {business.logoUrl ? (
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-white shrink-0">
              <Image
                src={business.logoUrl}
                alt={business.name}
                fill
                unoptimized
                className="object-contain p-1.5"
              />
            </div>
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl shrink-0 border border-white/20"
              style={{ backgroundColor: primaryColor }}
            >
              <Coffee className="w-8 h-8" />
            </div>
          )}

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400/10 border border-amber-400/30 text-amber-300 mb-0.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>
                {screenMode === 'FEATURED'
                  ? 'Cartelera de Especialidades'
                  : screenMode === 'DRINKS'
                  ? 'Barra de Bebidas'
                  : screenMode === 'FOOD'
                  ? 'Cocina & Panadería'
                  : 'Tablero Digital'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white uppercase drop-shadow-md">
              {business.name}
            </h1>
          </div>
        </div>

        {/* INDICADOR DEL SLIDE ACTUAL (SI HAY ROTACIÓN) */}
        {slides.length > 1 && screenMode !== 'ALL_STATIC' && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
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
                    ? 'w-8 h-2 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                    : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                }`}
                title={s.title}
              />
            ))}
            <span className="text-[11px] font-mono text-white/60 ml-2">
              {currentSlideIndex + 1}/{slides.length}
            </span>
          </div>
        )}

        {/* RELOJ DIGITAL, CONTROLES DE PANTALLA Y MENÚ DE CONFIGURACIÓN */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p
              className="text-2xl lg:text-3xl font-mono font-black text-amber-400 tracking-wider drop-shadow-sm"
              suppressHydrationWarning
            >
              {mounted ? currentTime : '--:--:--'}
            </p>
            <p
              className="text-[11px] uppercase tracking-widest text-amber-200/60 font-semibold capitalize mt-0.5"
              suppressHydrationWarning
            >
              {mounted ? currentDate : ''}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botón Pausa / Reproducir rotación */}
            {slides.length > 1 && screenMode !== 'ALL_STATIC' && (
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="w-10 h-10 rounded-2xl bg-white/5 border border-white/15 text-white/80 hover:text-white hover:bg-white/15 transition-all flex items-center justify-center cursor-pointer shadow-lg"
                title={isPaused ? 'Reanudar rotación' : 'Pausar rotación'}
              >
                {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
              </button>
            )}

            {/* Configuración de Pantalla */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowConfigMenu(!showConfigMenu)}
                className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center cursor-pointer shadow-lg ${
                  showConfigMenu
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-white/5 border-white/15 text-white/80 hover:text-white hover:bg-white/15'
                }`}
                title="Configuración de Pantalla (Rol de TV)"
              >
                <Settings2 className="w-4 h-4" />
              </button>

              {/* Menú Desplegable de Configuración de Pantalla */}
              {showConfigMenu && (
                <div className="absolute right-0 mt-3 w-72 rounded-3xl bg-[#181412]/95 border border-white/20 shadow-2xl backdrop-blur-xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Rol de esta Pantalla</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfigMenu(false)}
                      className="text-white/50 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      { id: 'ROTATING' as ScreenMode, label: '🎬 Rotación Cinépolis', desc: 'Destacados y categorías alternando' },
                      { id: 'FEATURED' as ScreenMode, label: '✨ Solo Vitrina Estelar', desc: 'Productos Nuevos y de Temporada' },
                      { id: 'DRINKS' as ScreenMode, label: '☕ Solo Bebidas & Café', desc: 'Especial para TV sobre cafetera' },
                      { id: 'FOOD' as ScreenMode, label: '🥐 Solo Pan & Alimentos', desc: 'Especial para TV de vitrina' },
                      { id: 'ALL_STATIC' as ScreenMode, label: '📋 Vista Completa Fija', desc: 'Todas las categorías simultáneas' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          handleModeChange(opt.id)
                          setShowConfigMenu(false)
                        }}
                        className={`w-full text-left p-2.5 rounded-2xl border text-xs transition-all flex flex-col cursor-pointer ${
                          screenMode === opt.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-white/50 font-normal">{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Duración de transición */}
                  {screenMode === 'ROTATING' && (
                    <div className="pt-2 border-t border-white/10">
                      <label className="text-[10px] font-semibold text-white/60 block mb-1">
                        Segundos por Pantalla ({slideDuration}s)
                      </label>
                      <input
                        type="range"
                        min="6"
                        max="30"
                        step="2"
                        value={slideDuration}
                        onChange={(e) => setSlideDuration(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
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
              className="w-10 h-10 rounded-2xl bg-white/5 border border-white/15 text-white/80 hover:text-white hover:bg-white/15 transition-all flex items-center justify-center cursor-pointer shadow-lg"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (TV)'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL: ANIMACIÓN ENTRE SLIDES */}
      <main className="flex-1 relative z-10 px-8 py-5 overflow-hidden flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* SLIDE: VITRINA DESTACADOS / CARTELERA CINÉPOLIS */}
          {currentSlide.type === 'featured' && (
            <motion.div
              key="featured-slide"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
              className="h-full w-full flex flex-col justify-between"
            >
              {/* TÍTULO DE VITRINA */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,1)]" />
                  <h2 className="text-2xl lg:text-4xl font-black text-white tracking-wider uppercase flex items-center gap-3">
                    <span>Cartelera de Temporada & Novedades</span>
                    <span className="text-sm font-bold px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg">
                      Edición Especial
                    </span>
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Lo más recomendado por nuestros baristas</span>
                </div>
              </div>

              {/* GRID DE PRODUCTOS DESTACADOS TIPO CINÉPOLIS (MÁX 3 O 4 CARDS GRANDES) */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-190px)]">
                {currentSlide.data.slice(0, 3).map((product, pIdx) => (
                  <div
                    key={product.id}
                    className="relative rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/20 p-6 flex flex-col justify-between shadow-2xl backdrop-blur-xl overflow-hidden group hover:border-amber-400/50 transition-all duration-300"
                  >
                    {/* Glow cálido en tarjeta */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div>
                      {/* IMAGEN DE IMPACTO */}
                      <div className="relative w-full h-48 lg:h-56 rounded-2xl overflow-hidden mb-4 border border-white/10 bg-black/40 shadow-inner flex items-center justify-center">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center opacity-40">
                            <Coffee className="w-16 h-16 text-amber-400 mb-2" />
                            <span className="text-xs uppercase tracking-widest font-mono">Bebida Insignia</span>
                          </div>
                        )}

                        {/* BADGES EN ESQUINA SUPERIOR DE LA IMAGEN */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                          {product.isNew && (
                            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-black shadow-lg">
                              ✨ NUEVO
                            </span>
                          )}
                          {product.isSeasonal && (
                            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500 text-white shadow-lg">
                              🍁 TEMPORADA
                            </span>
                          )}
                        </div>
                      </div>

                      {/* NOMBRE Y DESCRIPCIÓN */}
                      <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-xs lg:text-sm text-neutral-300 line-clamp-2 mt-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* SECCIÓN DE TAMAÑOS / PRECIOS Y SABORES */}
                    <div className="pt-4 border-t border-white/10 mt-4 space-y-3">
                      {/* TAMAÑOS DESGLOSADOS */}
                      {product.variants.length > 1 ? (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 block mb-1.5">
                            Tamaños Disponibles
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {product.variants.map((v) => (
                              <div
                                key={v.id}
                                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-center flex flex-col justify-center"
                              >
                                <span className="text-[10px] text-white/60 uppercase font-semibold truncate">
                                  {v.name}
                                </span>
                                <strong className="text-base font-black text-amber-400">
                                  ${v.price.toFixed(0)}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-white/60">Precio</span>
                          <strong className="text-3xl font-black text-amber-400">
                            ${product.minPrice.toFixed(2)}
                          </strong>
                        </div>
                      )}

                      {/* SABORES DISPONIBLES */}
                      {product.modifierGroups && product.modifierGroups.length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-1">
                            Sabores & Opciones:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {product.modifierGroups.flatMap((mg) => mg.modifiers).slice(0, 4).map((mod) => (
                              <span
                                key={mod.id}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-neutral-300 font-medium"
                              >
                                {mod.name}
                                {mod.extraPrice > 0 && ` +$${mod.extraPrice}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SLIDE: CATEGORÍA DETALLADA CON TAMAÑOS Y SABORES */}
          {currentSlide.type === 'category' && currentSlide.category && (
            <motion.div
              key={currentSlide.category.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="h-full w-full flex flex-col justify-between"
            >
              {/* ENCABEZADO DE CATEGORÍA */}
              <div className="border-b border-white/15 pb-4 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-4 h-4 rounded-full shadow-[0_0_12px_rgba(192,133,82,0.8)]"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div>
                    <h2 className="text-3xl lg:text-4xl font-black text-white tracking-wide uppercase drop-shadow-sm">
                      {currentSlide.category.name}
                    </h2>
                    <p className="text-xs text-amber-300/80 uppercase tracking-widest font-semibold mt-0.5">
                      Preparado artesanalmente al momento
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/30 font-mono">
                    {currentSlide.category.products.length} Ítems en esta sección
                  </span>
                </div>
              </div>

              {/* LISTA DE PRODUCTOS CON TABLERO MODERNO */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-5 overflow-hidden content-start">
                {currentSlide.category.products.map((product) => {
                  const hasMultiSizes = product.variants.length > 1
                  const allModifiers = product.modifierGroups?.flatMap((mg) => mg.modifiers) || []

                  return (
                    <div
                      key={product.id}
                      className="group border-b border-white/10 pb-3 flex flex-col justify-between"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        {/* Nombre del producto + badges */}
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-lg lg:text-xl font-black text-white tracking-tight">
                            {product.name}
                          </span>
                          {product.isNew && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-black">
                              NUEVO
                            </span>
                          )}
                          {product.isSeasonal && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white">
                              TEMPORADA
                            </span>
                          )}
                        </div>

                        {/* Línea punteada de tablero */}
                        <div className="flex-1 border-b border-dotted border-white/25 mx-2 translate-y-[-4px]" />

                        {/* Precios (Variantes completas o único) */}
                        <div className="shrink-0 text-right">
                          {hasMultiSizes ? (
                            <div className="flex items-center gap-2 font-extrabold text-amber-400">
                              {product.variants.map((v) => (
                                <span
                                  key={v.id}
                                  className="inline-flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10 shadow-sm"
                                >
                                  <span className="text-[10px] text-white/50 uppercase font-semibold">
                                    {v.name.slice(0, 4)}
                                  </span>
                                  <span className="text-sm lg:text-base font-black">
                                    ${v.price.toFixed(0)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xl lg:text-2xl font-black text-amber-400">
                              ${product.minPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Descripción y Sabores/Modificadores */}
                      <div className="mt-1 flex items-center justify-between gap-4 text-xs text-neutral-400">
                        {product.description && (
                          <p className="line-clamp-1 italic text-white/70">
                            {product.description}
                          </p>
                        )}

                        {allModifiers.length > 0 && (
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <span className="text-[10px] text-amber-400/80 font-bold uppercase">Sabores:</span>
                            <span className="text-[10px] text-white/60">
                              {allModifiers.slice(0, 3).map((m) => m.name).join(', ')}
                              {allModifiers.length > 3 && ` +${allModifiers.length - 3}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* SLIDE: MENÚ COMPLETO ESTÁTICO (TODAS LAS CATEGORÍAS EN 3 COLUMNAS) */}
          {currentSlide.type === 'all_static' && (
            <motion.div
              key="all-static"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {categories.slice(0, 3).map((cat) => (
                <div
                  key={cat.id}
                  className="bg-[#181412]/80 border border-white/10 rounded-3xl p-6 flex flex-col h-full shadow-2xl backdrop-blur-md overflow-hidden"
                >
                  <div className="border-b border-white/15 pb-3 mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white uppercase">{cat.name}</h3>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      {cat.products.length} ítems
                    </span>
                  </div>
                  <div className="flex-1 overflow-hidden space-y-3.5">
                    {cat.products.slice(0, 8).map((p) => (
                      <div key={p.id}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-base font-bold text-white shrink-0">{p.name}</span>
                          <div className="flex-1 border-b border-dotted border-white/20 mx-1 translate-y-[-4px]" />
                          <div className="shrink-0 text-right">
                            {p.variants.length > 1 ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                                {p.variants.slice(0, 3).map((v) => (
                                  <span key={v.id} className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-[11px]">
                                    ${v.price.toFixed(0)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-base font-black text-amber-400">${p.minPrice.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER / TICKER DE PROMOCIONES Y CORTESÍAS */}
      <footer className="relative z-20 px-8 py-3.5 border-t border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between text-xs text-[#DECEBD]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>Café de Especialidad 100% Mexicano</span>
          </div>
          <span className="hidden sm:inline text-white/20">•</span>
          <div className="hidden sm:flex items-center gap-2 font-medium text-white/70">
            <Clock className="w-3.5 h-3.5 text-[#C08552]" />
            <span>Tostado artesanal y baristas certificados</span>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[11px] font-semibold text-white/60">
          <span>Precios en {business.currency} con IVA incluido</span>
          {isUpdating && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Sincronizando...</span>
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}

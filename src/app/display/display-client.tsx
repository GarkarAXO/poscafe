'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  Coffee,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw,
  Wifi,
} from 'lucide-react'

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
  hasVariants: boolean
  minPrice: number
  variants: Variant[]
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

  const primaryColor = business.theme?.primaryColor || '#C08552'
  const secondaryColor = business.theme?.secondaryColor || '#5E3023'

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

  // Dividir categorías en columnas para vista panorámica de TV (máx 3-4 columnas)
  const columnsCount = Math.min(Math.max(categories.length, 1), 3)

  return (
    <div className="h-screen w-screen bg-[#0E0C0A] text-[#F3E9DC] overflow-hidden flex flex-col justify-between selection:bg-[#C08552] selection:text-white select-none relative">
      {/* GLOWS DE AMBIENTACIÓN CÁLIDOS DE FONDO */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full blur-[160px] opacity-20"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute -bottom-32 right-1/4 w-[600px] h-[600px] rounded-full blur-[180px] opacity-15"
          style={{ backgroundColor: secondaryColor }}
        />
      </div>

      {/* HEADER DE LA PANTALLA TV */}
      <header className="relative z-10 px-8 py-5 border-b border-white/10 flex items-center justify-between backdrop-blur-md bg-black/40">
        <div className="flex items-center gap-4">
          {business.logoUrl ? (
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-xl border border-white/20 bg-white shrink-0">
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
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <Coffee className="w-8 h-8" />
            </div>
          )}

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-bold bg-[#C08552]/20 border border-[#C08552]/40 text-[#DECEBD] mb-0.5">
              <Sparkles className="w-3 h-3 text-[#C08552]" />
              <span>Menú del Día</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white uppercase">
              {business.name}
            </h1>
          </div>
        </div>

        {/* RELOJ DIGITAL Y BOTÓN PANTALLA COMPLETA */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p
              className="text-2xl lg:text-3xl font-mono font-black text-amber-400 tracking-wider"
              suppressHydrationWarning
            >
              {mounted ? currentTime : '--:--:--'}
            </p>
            <p
              className="text-xs uppercase tracking-widest text-[#A88C7D] font-semibold capitalize mt-0.5"
              suppressHydrationWarning
            >
              {mounted ? currentDate : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/15 text-white/70 hover:text-white hover:bg-white/15 transition-all flex items-center justify-center cursor-pointer shadow-lg"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (TV)'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL — TABLERO DE PRECIOS EN COLUMNAS */}
      <main className="flex-1 relative z-10 px-8 py-6 overflow-hidden">
        {categories.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
            <Coffee className="w-16 h-16" style={{ color: primaryColor }} />
            <h2 className="text-xl font-bold">Catálogo en Actualización</h2>
            <p className="text-sm text-[#A88C7D]">
              Configura tus productos con la opción &quot;Visible en Pantallas TV&quot; desde el Catálogo.
            </p>
          </div>
        ) : (
          <div
            className="grid h-full gap-6 lg:gap-8"
            style={{
              gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`,
            }}
          >
            {categories.slice(0, 3).map((category) => (
              <div
                key={category.id}
                className="bg-[#181412]/80 border border-white/10 rounded-3xl p-6 flex flex-col h-full shadow-2xl backdrop-blur-md relative overflow-hidden"
              >
                {/* ENCABEZADO DE CATEGORÍA */}
                <div className="border-b border-white/15 pb-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <h2 className="text-xl lg:text-2xl font-black text-white tracking-wide uppercase">
                      {category.name}
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                    {category.products.length} {category.products.length === 1 ? 'Ítem' : 'Ítems'}
                  </span>
                </div>

                {/* LISTADO DE PRODUCTOS CON PUNTOS LÍDER Y PRECIO */}
                <div className="flex-1 overflow-hidden space-y-4">
                  {category.products.slice(0, 8).map((product) => (
                    <div key={product.id} className="group">
                      <div className="flex items-baseline justify-between gap-2">
                        {/* Nombre del Producto */}
                        <span className="text-base lg:text-lg font-bold text-white tracking-tight shrink-0">
                          {product.name}
                        </span>

                        {/* Línea de puntos conector */}
                        <div className="flex-1 border-b border-dotted border-white/25 mx-1 translate-y-[-4px]" />

                        {/* Precios (Variantes o precio único) */}
                        <div className="shrink-0 text-right">
                          {product.variants.length > 1 ? (
                            <div className="flex items-center gap-2 text-xs lg:text-sm font-extrabold text-amber-400">
                              {product.variants.slice(0, 3).map((v) => (
                                <span
                                  key={v.id}
                                  className="inline-flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10"
                                >
                                  <span className="text-[10px] text-white/50 uppercase">
                                    {v.name.slice(0, 3)}
                                  </span>
                                  <span>${v.price.toFixed(0)}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-base lg:text-lg font-black text-amber-400">
                              ${product.minPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Descripción corta */}
                      {product.description && (
                        <p className="text-xs text-[#A88C7D] line-clamp-1 mt-0.5 font-medium">
                          {product.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER / TICKER DE PROMOCIONES Y CORTESÍAS */}
      <footer className="relative z-10 px-8 py-3.5 border-t border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between text-xs text-[#DECEBD]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>Café de Especialidad 100% Mexicano</span>
          </div>
          <span className="hidden sm:inline text-white/20">•</span>
          <div className="hidden sm:flex items-center gap-2 font-medium text-white/70">
            <Clock className="w-3.5 h-3.5 text-[#C08552]" />
            <span>Preparado al momento por nuestros baristas</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-semibold text-white/60">
          <span>Precios en {business.currency} con IVA incluido</span>
          {isUpdating && (
            <span className="flex items-center gap-1 text-amber-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Actualizando...</span>
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}

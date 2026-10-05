'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Palette,
  Sparkles,
  Save,
  Loader2,
  Store,
  Check,
  Eye,
  UtensilsCrossed,
  CreditCard,
  Send,
  Coffee,
  CheckCircle,
  RotateCcw,
  ArrowLeft,
  Lock,
  MonitorPlay,
  UserCheck,
  Receipt,
  ShoppingCart,
  Banknote,
  QrCode,
  Clock,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Users,
  Package,
  Boxes,
  LayoutGrid,
  Laptop,
  Flame,
  CheckCheck,
  AlertTriangle,
  Plus,
  Minus,
  Search,
  Layers,
  ShoppingBag,
  Bell,
  BookOpen,
} from 'lucide-react'
import BookMenu from '@/components/book-menu'
import { notify } from '@/lib/notify'
import { isLightColor, getStatusBadgeStyles } from '@/lib/theme-utils'
import { useDashboardTheme } from '@/context/dashboard-theme-context'

interface Branch {
  id: string
  name: string
  code: string
  logoUrl: string | null
  isotypeUrl: string | null
  sidebarTheme: string | null
  bgColor: string | null
  primaryColor: string | null
  secondaryColor: string | null
  buttonColor: string | null
  businessHours?: string | null
  menuCoverColor?: string | null
  menuPaperColor?: string | null
  menuTextColor?: string | null
  menuAccentColor?: string | null
  menuCoverTitle?: string | null
  menuCoverSubtitle?: string | null
}

interface MenuThemePreset {
  id: string
  name: string
  description: string
  menuCoverColor: string
  menuPaperColor: string
  menuTextColor: string
  menuAccentColor: string
  tag: string
}

const MENU_THEME_PRESETS: MenuThemePreset[] = [
  {
    id: 'cuero-oro',
    name: 'Cuero Imperial & Oro',
    description: 'Tapa negra espresso, hojas pergamino marfil y filigranas doradas de alta cocina.',
    menuCoverColor: '#18120F',
    menuPaperColor: '#FDFBF7',
    menuTextColor: '#2C1810',
    menuAccentColor: '#D4AF37',
    tag: 'Recomendado',
  },
  {
    id: 'pergamino-vintage',
    name: 'Pergamino & Cobre Tostado',
    description: 'Tapa café tostado con hojas cálidas envejecidas y detalles en cobre y canela.',
    menuCoverColor: '#2C1E17',
    menuPaperColor: '#F6EFE3',
    menuTextColor: '#3E2415',
    menuAccentColor: '#C08552',
    tag: 'Artesanal',
  },
  {
    id: 'marfil-minimalista',
    name: 'Marfil & Bronce Sofisticado',
    description: 'Tapa carbón moderno con páginas blanco hueso y acentos bronce contemporáneos.',
    menuCoverColor: '#201E1C',
    menuPaperColor: '#FAF8F5',
    menuTextColor: '#1C1917',
    menuAccentColor: '#B8860B',
    tag: 'Elegante',
  },
  {
    id: 'nocturno-ambar',
    name: 'Edición Nocturna & Ámbar',
    description: 'Atmósfera tenue con páginas oscuras, contraste suave y acentos ámbar radiante.',
    menuCoverColor: '#0E0C0B',
    menuPaperColor: '#1A1513',
    menuTextColor: '#EFE5DA',
    menuAccentColor: '#F59E0B',
    tag: 'Alto Contraste',
  },
]

interface ThemePreset {
  id: string
  name: string
  description: string
  bgColor: string
  primaryColor: string
  secondaryColor: string
  buttonColor: string
  sidebarTheme: string
  tag: string
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'warm-coffee',
    name: 'Café Artesanal (Warm Coffee)',
    description: 'Espresso profundo, caramelo tostado y acentos cálidos de madera.',
    bgColor: '#14100E',
    primaryColor: '#C08552',
    secondaryColor: '#5E3023',
    buttonColor: '#C08552',
    sidebarTheme: 'COFFEE',
    tag: 'Recomendado',
  },
  {
    id: 'cream-latte',
    name: 'Crema & Espresso (Light Coffee)',
    description: 'Fondo crema suave y luminoso con contrastes en café oscuro.',
    bgColor: '#F3E9DC',
    primaryColor: '#5E3023',
    secondaryColor: '#E6D5C3',
    buttonColor: '#5E3023',
    sidebarTheme: 'LIGHT',
    tag: 'Tema Claro',
  },
  {
    id: 'dark-roast',
    name: 'Tostado Nocturno (Dark Roast)',
    description: 'Fondo carbón espresso, oro tostado y acentos ámbar.',
    bgColor: '#0D0B0A',
    primaryColor: '#D4A373',
    secondaryColor: '#3B2219',
    buttonColor: '#D4A373',
    sidebarTheme: 'CHARCOAL',
    tag: 'Alto Contraste',
  },
  {
    id: 'mocha-hazelnut',
    name: 'Mocha & Avellana',
    description: 'Chocolate cálido con tonos crema dorada y ámbar suave.',
    bgColor: '#1A120B',
    primaryColor: '#E5BA73',
    secondaryColor: '#3C2A21',
    buttonColor: '#E5BA73',
    sidebarTheme: 'COFFEE',
    tag: 'Cálido Suave',
  },
  {
    id: 'matcha-latte',
    name: 'Matcha & Té Verde',
    description: 'Verde oliva y hoja de té para barras especializadas y orgánicas.',
    bgColor: '#0F1711',
    primaryColor: '#588157',
    secondaryColor: '#344E41',
    buttonColor: '#588157',
    sidebarTheme: 'EMERALD',
    tag: 'Especialidad',
  },
  {
    id: 'bistro-emerald',
    name: 'Bistro & Esmeralda',
    description: 'Verde bosque profundo y oro clásico para restaurantes y cafeterías.',
    bgColor: '#071813',
    primaryColor: '#10B981',
    secondaryColor: '#064E3B',
    buttonColor: '#10B981',
    sidebarTheme: 'EMERALD',
    tag: 'Bistro',
  },
  {
    id: 'midnight-navy',
    name: 'Azul Medianoche & Plata',
    description: 'Azul cobalto profundo y moderno con acentos de alta legibilidad.',
    bgColor: '#0A111E',
    primaryColor: '#38BDF8',
    secondaryColor: '#1E293B',
    buttonColor: '#0284C7',
    sidebarTheme: 'NAVY',
    tag: 'Moderno',
  },
  {
    id: 'wine-bistro',
    name: 'Vino Tinto & Borgoña',
    description: 'Elegancia clásica para café bistró, cenas y repostería fina.',
    bgColor: '#180A12',
    primaryColor: '#F472B6',
    secondaryColor: '#4A152E',
    buttonColor: '#BE185D',
    sidebarTheme: 'BURGUNDY',
    tag: 'Elegante',
  },
]

export default function ThemeCustomizerPage() {
  const router = useRouter()
  const {
    isLight,
    buttonColor: sysButtonColor,
    primaryColor: sysPrimaryColor,
    contrastTextButton: sysContrastTextButton,
    classes,
  } = useDashboardTheme()

  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewTab, setPreviewTab] = useState<
    'comandera' | 'pos' | 'kds' | 'dashboard' | 'tables' | 'catalog' | 'menu' | 'sidebar'
  >('comandera')

  // Colores y ajustes visuales para la sucursal seleccionada
  const [themeData, setThemeData] = useState({
    bgColor: '#14100E',
    primaryColor: '#C08552',
    secondaryColor: '#5E3023',
    buttonColor: '#C08552',
    logoUrl: '',
    isotypeUrl: '',
    sidebarTheme: 'DARK',
    // Personalización Carta Menú Digital (Estilo Libro Flipbook)
    businessHours: 'Lunes a Domingo: 8:00 AM - 10:00 PM',
    menuCoverColor: '#18120F',
    menuPaperColor: '#FDFBF7',
    menuTextColor: '#2C1810',
    menuAccentColor: '#D4AF37',
    menuCoverTitle: 'CARTA DE ESPECIALIDADES',
    menuCoverSubtitle: 'Café de especialidad y gastronomía artesanal',
  })

  // Cargar sucursales
  const fetchBranches = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/branches')
      const json = await res.json()
      if (json.success && json.data.branches?.length > 0) {
        setBranches(json.data.branches)
        const initialBranch = json.data.branches[0]
        setSelectedBranchId(initialBranch.id)
        setThemeData({
          bgColor: initialBranch.bgColor || '#14100E',
          primaryColor: initialBranch.primaryColor || '#C08552',
          secondaryColor: initialBranch.secondaryColor || '#5E3023',
          buttonColor: initialBranch.buttonColor || '#C08552',
          logoUrl: initialBranch.logoUrl || '',
          isotypeUrl: initialBranch.isotypeUrl || '',
          sidebarTheme: (initialBranch.sidebarTheme as any) || 'DARK',
          businessHours: initialBranch.businessHours || 'Lunes a Domingo: 8:00 AM - 10:00 PM',
          menuCoverColor: initialBranch.menuCoverColor || '#18120F',
          menuPaperColor: initialBranch.menuPaperColor || '#FDFBF7',
          menuTextColor: initialBranch.menuTextColor || '#2C1810',
          menuAccentColor: initialBranch.menuAccentColor || '#D4AF37',
          menuCoverTitle: initialBranch.menuCoverTitle || 'CARTA DE ESPECIALIDADES',
          menuCoverSubtitle: initialBranch.menuCoverSubtitle || 'Café de especialidad y gastronomía artesanal',
        })
      }
    } catch {
      notify.error('Error', 'No fue posible cargar las sucursales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  // Cambiar sucursal activa en el selector
  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId)
    const branch = branches.find((b) => b.id === branchId)
    if (branch) {
      setThemeData({
        bgColor: branch.bgColor || '#14100E',
        primaryColor: branch.primaryColor || '#C08552',
        secondaryColor: branch.secondaryColor || '#5E3023',
        buttonColor: branch.buttonColor || '#C08552',
        logoUrl: branch.logoUrl || '',
        isotypeUrl: branch.isotypeUrl || '',
        sidebarTheme: (branch.sidebarTheme as any) || 'DARK',
        businessHours: branch.businessHours || 'Lunes a Domingo: 8:00 AM - 10:00 PM',
        menuCoverColor: branch.menuCoverColor || '#18120F',
        menuPaperColor: branch.menuPaperColor || '#FDFBF7',
        menuTextColor: branch.menuTextColor || '#2C1810',
        menuAccentColor: branch.menuAccentColor || '#D4AF37',
        menuCoverTitle: branch.menuCoverTitle || 'CARTA DE ESPECIALIDADES',
        menuCoverSubtitle: branch.menuCoverSubtitle || 'Café de especialidad y gastronomía artesanal',
      })
    }
  }

  // Aplicar un Preset preconfigurado del Sistema
  const handleApplyPreset = (preset: ThemePreset) => {
    setThemeData((prev) => ({
      ...prev,
      bgColor: preset.bgColor,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      buttonColor: preset.buttonColor,
      sidebarTheme: preset.sidebarTheme || prev.sidebarTheme,
    }))
    notify.info('Preset seleccionado', `Se cargó la paleta "${preset.name}". Haz clic en "Guardar" para aplicarlo a la base de datos.`)
  }

  // Aplicar un Preset exclusivo de la Carta Menú
  const handleApplyMenuPreset = (preset: MenuThemePreset) => {
    setThemeData((prev) => ({
      ...prev,
      menuCoverColor: preset.menuCoverColor,
      menuPaperColor: preset.menuPaperColor,
      menuTextColor: preset.menuTextColor,
      menuAccentColor: preset.menuAccentColor,
    }))
    setPreviewTab('menu')
    notify.info('Estilo de Carta aplicado', `Se configuró "${preset.name}". Puedes ver la previsualización a la derecha.`)
  }

  // Guardar en la Base de Datos
  const handleSaveTheme = async () => {
    if (!selectedBranchId) return
    setSaving(true)

    try {
      const res = await fetch(`/api/branches/${selectedBranchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bgColor: themeData.bgColor,
          primaryColor: themeData.primaryColor,
          secondaryColor: themeData.secondaryColor,
          buttonColor: themeData.buttonColor,
          logoUrl: themeData.logoUrl || null,
          isotypeUrl: themeData.isotypeUrl || null,
          sidebarTheme: themeData.sidebarTheme,
          businessHours: themeData.businessHours,
          menuCoverColor: themeData.menuCoverColor,
          menuPaperColor: themeData.menuPaperColor,
          menuTextColor: themeData.menuTextColor,
          menuAccentColor: themeData.menuAccentColor,
          menuCoverTitle: themeData.menuCoverTitle,
          menuCoverSubtitle: themeData.menuCoverSubtitle,
        }),
      })

      const json = await res.json()
      if (json.success) {
        notify.success(
          'Guardado',
          'Guardado y aplicando en lo que se recarga el sistema...'
        )
        // Actualizar lista local
        setBranches((prev) =>
          prev.map((b) => (b.id === selectedBranchId ? { ...b, ...themeData } : b))
        )
        // Disparar evento para aplicar el tema en caliente y sincronizar
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('poscafe:theme-updated', {
              detail: { branchId: selectedBranchId, ...themeData },
            })
          )
          try {
            localStorage.setItem(
              'poscafe_theme_event',
              JSON.stringify({ branchId: selectedBranchId, ...themeData, timestamp: Date.now() })
            )
          } catch {}
          // Recargar automáticamente para aplicar el nuevo tema a todo el sistema
          setTimeout(() => {
            window.location.reload()
          }, 600)
        }
      } else {
        notify.error('Error al guardar', json.error?.message || 'No se pudo actualizar el tema')
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible comunicar con el servidor')
    } finally {
      setSaving(false)
    }
  }

  const selectedBranch = branches.find((b) => b.id === selectedBranchId)
  const isLightBg = isLightColor(themeData.bgColor)
  const isLightButton = isLightColor(themeData.buttonColor)

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 min-h-[60vh] gap-3 ${classes.textMuted}`}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: sysButtonColor }} />
        <p className="text-xs font-medium">Cargando personalización de temas...</p>
      </div>
    )
  }

  return (
    <div className={`flex-1 flex flex-col w-full ${classes.textMain}`}>
      {/* Top Navbar Sticky (estándar de Catálogo e Insumos) */}
      <header className={`border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30 transition-colors ${classes.header}`}>
        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
          <Link
            href="/dashboard"
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${classes.buttonGhost}`}
            title="Volver al Panel General"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <div className={`h-5 w-px border-l ${classes.divider} shrink-0`} />

          <div className="overflow-hidden">
            <h1 className={`font-extrabold text-sm sm:text-base flex items-center gap-2 tracking-tight truncate ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              <Palette className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" style={{ color: sysButtonColor }} />
              <span className="truncate">Temas y Colores del Sistema</span>
            </h1>
            <p className={`text-[11px] sm:text-xs truncate hidden sm:block ${classes.textMuted}`}>
              Personalización visual de Comandera, POS, Barra Lateral, Logos y KDS
            </p>
          </div>
        </div>

        {/* Botón Guardar en Cabecera */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSaveTheme}
            disabled={saving || !selectedBranchId}
            style={{ backgroundColor: sysButtonColor, color: sysContrastTextButton }}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 hover:opacity-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Guardar</span>
          </button>
        </div>
      </header>

      {/* Main Body con espaciado amplio y responsivo como en Catálogo */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-16">
        {/* Banner Informativo y Selector de Sucursal */}
        <div className={`border p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${classes.card}`}>
          <div className="space-y-1">
            <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-xs font-semibold ${classes.badge}`}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: sysButtonColor }} />
              <span>Identidad Visual & Experiencia Multidispositivo</span>
            </div>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              Diseño y Colores por Sucursal
            </h2>
            <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${classes.textMuted}`}>
              Configura y almacena en la base de datos la paleta de colores para el fondo, botones y tarjetas
              de la <strong>Comandera de Mesas</strong>, <strong>Terminal de Cobro POS</strong>, <strong>Barra Lateral</strong> y pantallas de cocina.
            </p>
          </div>

          {branches.length > 1 && (
            <div className={`border p-3 rounded-2xl flex items-center gap-3 shrink-0 shadow-xs ${classes.subCard}`}>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold"
                style={{ backgroundColor: `${sysButtonColor}20`, color: sysButtonColor }}
              >
                <Store className="w-4 h-4" />
              </div>
              <div className="text-left">
                <label className={`text-[10px] uppercase font-bold block ${classes.textMuted}`}>Sucursal a Configurar</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-4 ${classes.textMain}`}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="text-black">
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN 1: PALETAS DE COLOR PREDISEÑADAS (1-CLIC) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: sysButtonColor }} />
              <h2 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                Paletas de Café Prediseñadas (1 Clic)
              </h2>
            </div>
            <span className={`text-[11px] ${classes.textMuted}`}>Toca una paleta para probarla al instante</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {THEME_PRESETS.map((preset) => {
              const isCurrent =
                themeData.bgColor === preset.bgColor &&
                themeData.primaryColor === preset.primaryColor &&
                themeData.buttonColor === preset.buttonColor

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between space-y-3 cursor-pointer select-none active:scale-[0.98] ${
                    isCurrent
                      ? `border-[#C08552] ${classes.subCard} shadow-md shadow-[#C08552]/15 ring-2 ring-[#C08552]/40`
                      : `${classes.card} hover:border-[#C08552]/60 hover:shadow-xs`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`text-xs font-black block leading-tight ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                        {preset.name}
                      </span>
                      <p className={`text-[11px] mt-0.5 leading-snug ${classes.textMuted}`}>
                        {preset.description}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${classes.badge}`}>
                      {preset.tag}
                    </span>
                  </div>

                  {/* Muestras circulares de los 4 colores del tema */}
                  <div className={`flex items-center justify-between pt-2 border-t ${classes.divider}`}>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: preset.bgColor }}
                        title="Color de Fondo"
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: preset.secondaryColor }}
                        title="Color Secundario"
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: preset.primaryColor }}
                        title="Color Primario"
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: preset.buttonColor }}
                        title="Color de Botón"
                      />
                    </div>

                    {isCurrent && (
                      <span className="text-[11px] font-bold text-[#C08552] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Seleccionado
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

      {/* SECCIÓN 2: AJUSTE DETALLADO DE COLORES Y PREVISUALIZACIÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Controles de Colores (5 columnas en LG) */}
        <div className={`lg:col-span-5 space-y-4 border p-5 sm:p-6 rounded-3xl shadow-sm ${classes.card}`}>
          <div className={`flex items-center justify-between pb-3 border-b ${classes.divider}`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              <Palette className="w-4 h-4" style={{ color: sysButtonColor }} />
              Personalización Fina de Colores
            </h3>
            <button
              type="button"
              onClick={() => handleApplyPreset(THEME_PRESETS[0])}
              className={`text-[11px] flex items-center gap-1 cursor-pointer font-medium ${classes.textMuted} hover:${classes.textMain}`}
              title="Restablecer a valores de café recomendados"
            >
              <RotateCcw className="w-3 h-3" />
              Restablecer
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Color de Fondo */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${classes.subCard}`}>
              <div>
                <label className={`block text-xs font-bold ${classes.textMain}`}>
                  Color de Fondo (Pantalla)
                </label>
                <p className={`text-[10px] ${classes.textMuted}`}>
                  Fondo de la Comandera y áreas operativas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeData.bgColor}
                  onChange={(e) => setThemeData({ ...themeData, bgColor: e.target.value })}
                  className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={themeData.bgColor}
                  onChange={(e) => setThemeData({ ...themeData, bgColor: e.target.value })}
                  className={`w-20 px-2 py-1.5 rounded-lg border font-mono text-xs uppercase text-center font-bold ${classes.input}`}
                />
              </div>
            </div>

            {/* Color de Botones de Acción */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${classes.subCard}`}>
              <div>
                <label className={`block text-xs font-bold ${classes.textMain}`}>
                  Color de Botones de Acción
                </label>
                <p className={`text-[10px] ${classes.textMuted}`}>
                  Enviar a Cocina, Cobrar, Agregar y Pestañas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeData.buttonColor}
                  onChange={(e) => setThemeData({ ...themeData, buttonColor: e.target.value })}
                  className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={themeData.buttonColor}
                  onChange={(e) => setThemeData({ ...themeData, buttonColor: e.target.value })}
                  className={`w-20 px-2 py-1.5 rounded-lg border font-mono text-xs uppercase text-center font-bold ${classes.input}`}
                />
              </div>
            </div>

            {/* Color Primario de Marca */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${classes.subCard}`}>
              <div>
                <label className={`block text-xs font-bold ${classes.textMain}`}>
                  Color Primario (Acentos)
                </label>
                <p className={`text-[10px] ${classes.textMuted}`}>
                  Acentos de mesa, iconos y encabezados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeData.primaryColor}
                  onChange={(e) => setThemeData({ ...themeData, primaryColor: e.target.value })}
                  className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={themeData.primaryColor}
                  onChange={(e) => setThemeData({ ...themeData, primaryColor: e.target.value })}
                  className={`w-20 px-2 py-1.5 rounded-lg border font-mono text-xs uppercase text-center font-bold ${classes.input}`}
                />
              </div>
            </div>

            {/* Color Secundario / Paneles */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${classes.subCard}`}>
              <div>
                <label className={`block text-xs font-bold ${classes.textMain}`}>
                  Color Secundario (Paneles)
                </label>
                <p className={`text-[10px] ${classes.textMuted}`}>
                  Bordes sutiles, resplandores y fondos de filtros
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeData.secondaryColor}
                  onChange={(e) => setThemeData({ ...themeData, secondaryColor: e.target.value })}
                  className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={themeData.secondaryColor}
                  onChange={(e) => setThemeData({ ...themeData, secondaryColor: e.target.value })}
                  className={`w-20 px-2 py-1.5 rounded-lg border font-mono text-xs uppercase text-center font-bold ${classes.input}`}
                />
              </div>
            </div>

            {/* Selector de Tema de la Barra Lateral (Sidebar) */}
            <div className={`p-3.5 rounded-2xl border space-y-2.5 ${classes.subCard}`}>
              <div>
                <label className={`block text-xs font-bold ${classes.textMain}`}>
                  Tema de la Barra Lateral (Sidebar)
                </label>
                <p className={`text-[10px] ${classes.textMuted}`}>
                  Elige entre 8 estilos diseñados para contrastar perfectamente con tu logotipo:
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'DARK', name: 'Espresso', desc: '#14100E', bg: '#14100E', text: '#F3E9DC' },
                  { id: 'COFFEE', name: 'Tostado', desc: '#2B1712', bg: '#2B1712', text: '#F3E9DC' },
                  { id: 'LIGHT', name: 'Crema', desc: '#FDFBF9', bg: '#FDFBF9', text: '#3D1E16', border: '#DECEBD' },
                  { id: 'WHITE', name: 'Blanco', desc: '#FFFFFF', bg: '#FFFFFF', text: '#1E293B', border: '#CBD5E1' },
                  { id: 'EMERALD', name: 'Esmeralda', desc: '#0C1E17', bg: '#0C1E17', text: '#E2F2EB' },
                  { id: 'NAVY', name: 'Azul Marino', desc: '#0B1524', bg: '#0B1524', text: '#E0EBF7' },
                  { id: 'BURGUNDY', name: 'Borgoña', desc: '#1F0C16', bg: '#1F0C16', text: '#F8E3EE' },
                  { id: 'CHARCOAL', name: 'Carbón', desc: '#15181C', bg: '#15181C', text: '#E6EAF0' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setThemeData({ ...themeData, sidebarTheme: opt.id })}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 select-none ${
                      themeData.sidebarTheme === opt.id
                        ? 'ring-2 ring-[#C08552] border-[#C08552] shadow-sm scale-102'
                        : 'border-[#DECEBD] opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.bg, color: opt.text, borderColor: opt.border || undefined }}
                  >
                    <span className="text-[11px] font-black">{opt.name}</span>
                    <span className="text-[9px] opacity-75">{opt.desc}</span>
                    {themeData.sidebarTheme === opt.id && (
                      <span className="text-[9px] font-bold text-[#C08552] mt-0.5">● Activo</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* URL de Logotipo Principal (Grande) */}
            <div className={`p-3 rounded-2xl border space-y-1.5 ${classes.subCard}`}>
              <div className="flex items-center justify-between">
                <label className={`block text-xs font-bold ${classes.textMain}`}>
                  URL del Logotipo Principal (Grande)
                </label>
                {themeData.logoUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold">Logo activo</span>
                )}
              </div>
              <p className={`text-[10px] ${classes.textMuted}`}>
                Se muestra grande y centrado en la barra lateral expandida con el nombre debajo.
              </p>
              <input
                type="url"
                value={themeData.logoUrl}
                onChange={(e) => setThemeData({ ...themeData, logoUrl: e.target.value })}
                placeholder="https://ejemplo.com/logo-completo.png"
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
              />
              {themeData.logoUrl && (
                <div className="pt-2 flex flex-col items-center justify-center">
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${classes.textSub}`}>
                    Logotipo Principal (Libre / Sin marco)
                  </span>
                  <img
                    src={themeData.logoUrl}
                    alt="Vista previa Logo"
                    className="max-h-20 w-auto object-contain drop-shadow-md select-none transition-transform hover:scale-105"
                    onError={(e) => {
                      ;(e.target as any).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* URL de Isologo / Isotipo (Compacto) */}
            <div className={`p-3 rounded-2xl border space-y-1.5 ${classes.subCard}`}>
              <div className="flex items-center justify-between">
                <label className={`block text-xs font-bold ${classes.textMain}`}>
                  URL de Isotipo / Isologo (Sidebar Contraído)
                </label>
                {themeData.isotypeUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold">Isotipo activo</span>
                )}
              </div>
              <p className={`text-[10px] ${classes.textMuted}`}>
                Símbolo compacto (1:1) para la barra contraída y pantallas reducidas.
              </p>
              <input
                type="url"
                value={themeData.isotypeUrl}
                onChange={(e) => setThemeData({ ...themeData, isotypeUrl: e.target.value })}
                placeholder="https://ejemplo.com/isotipo-icono.png"
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
              />
              {themeData.isotypeUrl && (
                <div className="pt-2 flex flex-col items-center justify-center">
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${classes.textSub}`}>
                    Isotipo / Isologo (Libre / Sin marco)
                  </span>
                  <img
                    src={themeData.isotypeUrl}
                    alt="Vista previa Isotipo"
                    className="w-14 h-14 object-contain drop-shadow-md select-none transition-transform hover:scale-110"
                    onError={(e) => {
                      ;(e.target as any).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* SECCIÓN DEDICADA: PERSONALIZACIÓN DE LA CARTA MENÚ DIGITAL (ESTILO LIBRO FLIPBOOK) */}
            <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${classes.subCard}`}>
              <div className={`flex items-center justify-between pb-2 border-b ${classes.divider}`}>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  <h4 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                    Personalización de la Carta Menú (Libro)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTab('menu')}
                  className="text-[11px] font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>Ver Carta</span>
                </button>
              </div>

              {/* Estilos rápidos de carta preconfigurados (1 Clic) */}
              <div className="space-y-1.5">
                <span className={`text-[11px] font-bold ${classes.textMain}`}>
                  Estilos de Carta Prediseñados (1 Clic)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MENU_THEME_PRESETS.map((mp) => {
                    const isCurrent =
                      themeData.menuCoverColor === mp.menuCoverColor &&
                      themeData.menuPaperColor === mp.menuPaperColor &&
                      themeData.menuAccentColor === mp.menuAccentColor

                    return (
                      <button
                        key={mp.id}
                        type="button"
                        onClick={() => handleApplyMenuPreset(mp)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 select-none ${
                          isCurrent
                            ? 'ring-2 ring-amber-500 border-amber-500 shadow-sm'
                            : 'border-slate-300/40 opacity-85 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: mp.menuCoverColor,
                          color: '#FFFFFF',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black">{mp.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 font-bold">
                            {mp.tag}
                          </span>
                        </div>
                        <p className="text-[9px] text-white/70 line-clamp-1 leading-tight">
                          {mp.description}
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-white/30"
                            style={{ backgroundColor: mp.menuCoverColor }}
                            title="Tapa / Portada"
                          />
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: mp.menuPaperColor }}
                            title="Hojas / Papel"
                          />
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: mp.menuAccentColor }}
                            title="Acento / Oro"
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Colores individuales de la carta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Color de Portada (Tapa) */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${classes.card}`}>
                  <div>
                    <label className={`block text-[11px] font-bold ${classes.textMain}`}>
                      Color de Portada (Tapa)
                    </label>
                    <p className={`text-[9px] ${classes.textMuted}`}>Fondo exterior</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={themeData.menuCoverColor}
                      onChange={(e) => {
                        setThemeData({ ...themeData, menuCoverColor: e.target.value })
                        setPreviewTab('menu')
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={themeData.menuCoverColor}
                      onChange={(e) => {
                        setThemeData({ ...themeData, menuCoverColor: e.target.value })
                        setPreviewTab('menu')
                      }}
                      className={`w-18 px-1.5 py-1 rounded border font-mono text-[10px] uppercase text-center font-bold ${classes.input}`}
                    />
                  </div>
                </div>

                {/* Color de Hojas Interiores (Papel) */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${classes.card}`}>
                  <div>
                    <label className={`block text-[11px] font-bold ${classes.textMain}`}>
                      Hojas Interiores (Papel)
                    </label>
                    <p className={`text-[9px] ${classes.textMuted}`}>Pergamino o marfil</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={themeData.menuPaperColor}
                      onChange={(e) => {
                        setThemeData({ ...themeData, menuPaperColor: e.target.value })
                        setPreviewTab('menu')
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={themeData.menuPaperColor}
                      onChange={(e) => {
                        setThemeData({ ...themeData, menuPaperColor: e.target.value })
                        setPreviewTab('menu')
                      }}
                      className={`w-18 px-1.5 py-1 rounded border font-mono text-[10px] uppercase text-center font-bold ${classes.input}`}
                    />
                  </div>
                </div>

                {/* Color de Tipografía de Platillos */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${classes.card}`}>
                  <div>
                    <label className={`block text-[11px] font-bold ${classes.textMain}`}>
                      Texto de Platillos
                    </label>
                    <p className={`text-[9px] ${classes.textMuted}`}>Nombres y notas</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={themeData.menuTextColor}
                      onChange={(e) => {
                        setThemeData({ ...themeData, menuTextColor: e.target.value })
                        setPreviewTab('menu')
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={themeData.menuTextColor}
                      onChange={(e) => {
                        setThemeData({ ...themeData, menuTextColor: e.target.value })
                        setPreviewTab('menu')
                      }}
                      className={`w-18 px-1.5 py-1 rounded border font-mono text-[10px] uppercase text-center font-bold ${classes.input}`}
                    />
                  </div>
                </div>

                {/* Color de Acento (Precios y Filigranas) */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${classes.card}`}>
                  <div>
                    <label className={`block text-[11px] font-bold ${classes.textMain}`}>
                      Acento de Precios
                    </label>
                    <p className={`text-[9px] ${classes.textMuted}`}>Dorado o bronce</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={themeData.menuAccentColor}
                      onChange={(e) => {
                        setThemeData({ ...themeData, menuAccentColor: e.target.value })
                        setPreviewTab('menu')
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={themeData.menuAccentColor}
                      onChange={(e) => {
                        setThemeData({ ...themeData, menuAccentColor: e.target.value })
                        setPreviewTab('menu')
                      }}
                      className={`w-18 px-1.5 py-1 rounded border font-mono text-[10px] uppercase text-center font-bold ${classes.input}`}
                    />
                  </div>
                </div>
              </div>

              {/* Título de Portada */}
              <div className="space-y-1">
                <label className={`block text-[11px] font-bold ${classes.textMain}`}>
                  Título de la Portada
                </label>
                <input
                  type="text"
                  value={themeData.menuCoverTitle}
                  onChange={(e) => {
                    setThemeData({ ...themeData, menuCoverTitle: e.target.value })
                    setPreviewTab('menu')
                  }}
                  placeholder="Ej: CARTA DE ESPECIALIDADES"
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                />
              </div>

              {/* Subtítulo de Portada */}
              <div className="space-y-1">
                <label className={`block text-[11px] font-bold ${classes.textMain}`}>
                  Lema o Subtítulo de Portada
                </label>
                <input
                  type="text"
                  value={themeData.menuCoverSubtitle}
                  onChange={(e) => {
                    setThemeData({ ...themeData, menuCoverSubtitle: e.target.value })
                    setPreviewTab('menu')
                  }}
                  placeholder="Ej: Café de especialidad y gastronomía artesanal"
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                />
              </div>

              {/* Horario de Servicio del Negocio */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={`block text-[11px] font-bold flex items-center gap-1.5 ${classes.textMain}`}>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Horario de Servicio del Negocio</span>
                  </label>
                  <span className={`text-[10px] ${classes.textMuted}`}>Visible en portada y contraportada</span>
                </div>
                <input
                  type="text"
                  value={themeData.businessHours}
                  onChange={(e) => {
                    setThemeData({ ...themeData, businessHours: e.target.value })
                    setPreviewTab('menu')
                  }}
                  placeholder="Ej: Lunes a Domingo: 8:00 AM - 10:00 PM"
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveTheme}
              disabled={saving}
              style={{ backgroundColor: sysButtonColor, color: sysContrastTextButton }}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 mt-4 hover:opacity-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Guardar</span>
            </button>
          </div>
        </div>

        {/* Previsualización en Tiempo Real (7 columnas en LG) */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${classes.textMain}`}>
              <Eye className="w-4 h-4" style={{ color: sysButtonColor }} />
              Previsualización en Tiempo Real
            </h3>

            {/* Pestañas para alternar entre todas las páginas del sistema */}
            <div className={`flex items-center gap-1 border p-1 rounded-2xl text-xs overflow-x-auto max-w-full ${classes.subCard}`}>
              {[
                { id: 'comandera', label: 'Comandera', icon: UtensilsCrossed },
                { id: 'pos', label: 'POS (Caja)', icon: ShoppingCart },
                { id: 'kds', label: 'KDS Cocina', icon: MonitorPlay },
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'tables', label: 'Mesas', icon: LayoutGrid },
                { id: 'catalog', label: 'Catálogo', icon: Package },
                { id: 'menu', label: 'Carta Menú (Libro)', icon: BookOpen },
                { id: 'sidebar', label: 'Sidebar & Logos', icon: Layers },
              ].map((tab) => {
                const TabIcon = tab.icon
                const isActive = previewTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPreviewTab(tab.id as any)}
                    style={isActive ? { backgroundColor: sysButtonColor, color: sysContrastTextButton } : undefined}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? 'shadow-xs scale-102'
                        : `${classes.textMuted} hover:${classes.textMain} hover:bg-black/5`
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* CONTENEDOR PRINCIPAL DE PREVISUALIZACIÓN VIVA */}
          {(() => {
            // Colores calculados para la previsualización del sidebar
            const sTheme = themeData.sidebarTheme
            const sBg =
              sTheme === 'WHITE'
                ? '#FFFFFF'
                : sTheme === 'LIGHT'
                ? '#FDFBF9'
                : sTheme === 'COFFEE'
                ? '#2B1712'
                : sTheme === 'EMERALD'
                ? '#0C1E17'
                : sTheme === 'NAVY'
                ? '#0B1524'
                : sTheme === 'BURGUNDY'
                ? '#1F0C16'
                : sTheme === 'CHARCOAL'
                ? '#15181C'
                : '#14100E'

            const sBorder =
              sTheme === 'WHITE'
                ? '#E2E8F0'
                : sTheme === 'LIGHT'
                ? '#EAD8C7'
                : sTheme === 'COFFEE'
                ? '#42221A'
                : sTheme === 'EMERALD'
                ? '#153428'
                : sTheme === 'NAVY'
                ? '#162740'
                : sTheme === 'BURGUNDY'
                ? '#381628'
                : sTheme === 'CHARCOAL'
                ? '#262B32'
                : '#2D1B15'

            const sText =
              sTheme === 'WHITE'
                ? '#1E293B'
                : sTheme === 'LIGHT'
                ? '#3D1E16'
                : sTheme === 'EMERALD'
                ? '#E2F2EB'
                : sTheme === 'NAVY'
                ? '#E0EBF7'
                : sTheme === 'BURGUNDY'
                ? '#F8E3EE'
                : sTheme === 'CHARCOAL'
                ? '#E6EAF0'
                : '#F3E9DC'

            // VISTA 1: COMANDERA DE PISO
            if (previewTab === 'comandera') {
              return (
                <div
                  className={`rounded-3xl border p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all duration-300 min-h-[480px] flex flex-col justify-between select-none ${
                    isLightBg ? 'border-[#DECEBD] shadow-amber-950/5' : 'border-black/20'
                  }`}
                  style={{ backgroundColor: themeData.bgColor }}
                >
                  <div
                    className="absolute -top-16 left-1/4 w-72 h-72 rounded-full blur-[90px] pointer-events-none"
                    style={{ backgroundColor: themeData.primaryColor, opacity: isLightBg ? 0.08 : 0.2 }}
                  />
                  <div
                    className="absolute -bottom-16 right-1/4 w-60 h-60 rounded-full blur-[80px] pointer-events-none"
                    style={{ backgroundColor: themeData.secondaryColor, opacity: isLightBg ? 0.06 : 0.15 }}
                  />

                  {/* Top Navbar simulada */}
                  <div
                    className="rounded-2xl p-3 flex items-center justify-between border shadow-sm relative z-10"
                    style={{
                      backgroundColor: isLightBg ? '#FFFFFFE6' : `${themeData.secondaryColor}40`,
                      borderColor: isLightBg ? '#DECEBD' : `${themeData.secondaryColor}80`,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold border"
                        style={{
                          backgroundColor: `${themeData.primaryColor}${isLightBg ? '15' : '25'}`,
                          borderColor: `${themeData.primaryColor}${isLightBg ? '35' : '50'}`,
                          color: isLightBg ? '#5E3023' : themeData.primaryColor,
                        }}
                      >
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className={`text-xs font-black leading-tight flex items-center gap-1.5 ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                          <span>Comandera</span>
                          {branches.length > 1 && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.2 rounded-full border"
                              style={{
                                backgroundColor: `${themeData.primaryColor}${isLightBg ? '15' : '20'}`,
                                borderColor: `${themeData.primaryColor}${isLightBg ? '35' : '40'}`,
                                color: isLightBg ? '#5E3023' : themeData.primaryColor,
                              }}
                            >
                              {selectedBranch?.name || 'Sucursal Matriz'}
                            </span>
                          )}
                        </h4>
                        <p className={`text-[10px] ${isLightBg ? 'text-[#5E3023] font-bold' : 'text-slate-300 font-medium'}`}>
                          Mesero / Turno activo
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] ${getStatusBadgeStyles('KDS', isLightBg).className}`}>
                        <MonitorPlay className="w-3 h-3" />
                        <span>KDS</span>
                      </span>
                      <span className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] ${getStatusBadgeStyles('POS', isLightBg).className}`}>
                        <Coffee className="w-3 h-3" />
                        <span>Caja</span>
                      </span>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] ${getStatusBadgeStyles('RELEVO', isLightBg).className}`}>
                        <Lock className="w-3 h-3" />
                        <span>Relevo</span>
                      </span>
                    </div>
                  </div>

                  {/* Pestañas de Áreas simuladas */}
                  <div className="my-2.5 flex items-center justify-between gap-2 overflow-x-auto relative z-10 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="px-3 py-1 rounded-xl font-bold shadow-xs cursor-default"
                        style={{
                          backgroundColor: themeData.buttonColor,
                          color: isLightButton ? '#2B1712' : '#FFFFFF',
                        }}
                      >
                        Todas (12)
                      </div>
                      <div
                        className={`px-3 py-1 rounded-xl border cursor-default ${
                          isLightBg ? 'text-[#5E3023] bg-white/80 border-[#DECEBD]' : 'text-slate-300'
                        }`}
                        style={
                          isLightBg
                            ? {}
                            : {
                                backgroundColor: `${themeData.secondaryColor}30`,
                                borderColor: `${themeData.secondaryColor}60`,
                              }
                        }
                      >
                        Salón Principal (8)
                      </div>
                      <div
                        className={`px-3 py-1 rounded-xl border cursor-default ${
                          isLightBg ? 'text-[#5E3023] bg-white/80 border-[#DECEBD]' : 'text-slate-300'
                        }`}
                        style={
                          isLightBg
                            ? {}
                            : {
                                backgroundColor: `${themeData.secondaryColor}30`,
                                borderColor: `${themeData.secondaryColor}60`,
                              }
                        }
                      >
                        Terraza (4)
                      </div>
                    </div>
                  </div>

                  {/* Leyenda de Estados adaptativa */}
                  <div className="flex items-center gap-1.5 text-[10px] overflow-x-auto pb-1.5 relative z-10">
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${getStatusBadgeStyles('MODE_ASSIGNED', isLightBg).className}`}>
                      <UserCheck className="w-2.5 h-2.5" />
                      Modo Asignado
                    </span>
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${getStatusBadgeStyles('AVAILABLE', isLightBg).className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadgeStyles('AVAILABLE', isLightBg).dotClass}`} />
                      8 Libres
                    </span>
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${getStatusBadgeStyles('OCCUPIED', isLightBg).className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadgeStyles('OCCUPIED', isLightBg).dotClass}`} />
                      3 Ocupadas
                    </span>
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${getStatusBadgeStyles('BILL_PRINTED', isLightBg).className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadgeStyles('BILL_PRINTED', isLightBg).dotClass} animate-pulse`} />
                      1 Pre-cuenta
                    </span>
                  </div>

                  {/* Mesas de Ejemplo */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 relative z-10 flex-1 my-1">
                    {/* Mesa 1: Libre */}
                    <div
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        isLightBg ? 'bg-white border-[#DECEBD] shadow-xs' : ''
                      }`}
                      style={
                        isLightBg
                          ? {}
                          : {
                              backgroundColor: `${themeData.secondaryColor}25`,
                              borderColor: `${themeData.secondaryColor}60`,
                            }
                      }
                    >
                      <div className="flex justify-between items-start">
                        <span className={`font-black text-sm ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                          Mesa 1
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full ${isLightBg ? 'bg-emerald-600' : 'bg-emerald-500'} shadow-xs`} />
                      </div>
                      <span className={`text-[10px] mt-2 block ${isLightBg ? 'text-[#7A5A43] font-semibold' : 'text-slate-400'}`}>
                        Cap: 4 pers.
                      </span>
                      <span className={`text-[10px] font-bold mt-1 ${isLightBg ? 'text-emerald-950 font-black' : 'text-emerald-400'}`}>
                        ● Disponible
                      </span>
                    </div>

                    {/* Mesa 2: Ocupada (Mi Mesa) */}
                    <div
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all shadow-md ring-1 ${
                        isLightBg ? 'bg-[#FFFBEB] border-amber-300 ring-amber-200' : ''
                      }`}
                      style={
                        isLightBg
                          ? {}
                          : {
                              backgroundColor: `${themeData.secondaryColor}40`,
                              borderColor: themeData.primaryColor,
                            }
                      }
                    >
                      <div className="flex justify-between items-start">
                        <span className={`font-black text-sm ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                          Mesa 2
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full ${isLightBg ? 'bg-amber-600' : 'bg-amber-400'} shadow-xs`} />
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block border self-start ${
                          isLightBg
                            ? 'bg-amber-100 text-amber-950 border-amber-300 font-black'
                            : ''
                        }`}
                        style={
                          isLightBg
                            ? {}
                            : {
                                backgroundColor: `${themeData.primaryColor}25`,
                                borderColor: `${themeData.primaryColor}50`,
                                color: themeData.primaryColor,
                              }
                        }
                      >
                        ⭐ Mi Mesa
                      </span>
                      <span className={`text-[10px] font-bold mt-1 ${isLightBg ? 'text-amber-950 font-black' : 'text-amber-300'}`}>
                        3 artículos • $185
                      </span>
                    </div>

                    {/* Mesa 3: En Cobro (Pre-cuenta) */}
                    <div
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        isLightBg ? 'bg-[#FAF5FF] border-purple-300 shadow-xs' : ''
                      }`}
                      style={
                        isLightBg
                          ? {}
                          : {
                              backgroundColor: `${themeData.secondaryColor}30`,
                              borderColor: `${themeData.secondaryColor}60`,
                            }
                      }
                    >
                      <div className="flex justify-between items-start">
                        <span className={`font-black text-sm ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                          Mesa 3
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full ${isLightBg ? 'bg-purple-600' : 'bg-violet-400'} shadow-xs animate-pulse`} />
                      </div>
                      <span className={`text-[10px] mt-2 block ${isLightBg ? 'text-[#7A5A43] font-semibold' : 'text-slate-400'}`}>
                        Cap: 2 pers.
                      </span>
                      <span className={`text-[10px] font-bold mt-1 ${isLightBg ? 'text-purple-950 font-black' : 'text-violet-300'}`}>
                        🧾 Pre-cuenta
                      </span>
                    </div>
                  </div>

                  {/* Barra Inferior Simulada */}
                  <div
                    className="mt-3 p-3 rounded-2xl border flex items-center justify-between gap-3 relative z-10"
                    style={{
                      backgroundColor: isLightBg ? '#FFFFFFE6' : `${themeData.secondaryColor}40`,
                      borderColor: isLightBg ? '#DECEBD' : `${themeData.secondaryColor}70`,
                    }}
                  >
                    <div>
                      <span className={`text-[10px] block ${isLightBg ? 'text-[#5E3023] font-bold' : 'text-slate-300'}`}>
                        Comanda Mesa 2:
                      </span>
                      <span className={`text-xs font-black font-mono ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                        $185.00 MXN
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        style={{
                          backgroundColor: themeData.buttonColor,
                          color: isLightButton ? '#2B1712' : '#FFFFFF',
                        }}
                        className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-default"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar a Cocina</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            // VISTA 2: TERMINAL POS (CAJA)
            if (previewTab === 'pos') {
              return (
                <div
                  className={`rounded-3xl border p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all duration-300 min-h-[480px] flex flex-col justify-between select-none ${
                    isLightBg ? 'border-[#DECEBD] shadow-amber-950/5' : 'border-black/20'
                  }`}
                  style={{ backgroundColor: themeData.bgColor }}
                >
                  {/* Top POS bar */}
                  <div
                    className="rounded-2xl p-2.5 flex items-center justify-between border shadow-sm relative z-10"
                    style={{
                      backgroundColor: isLightBg ? '#FFFFFFE6' : `${themeData.secondaryColor}40`,
                      borderColor: isLightBg ? '#DECEBD' : `${themeData.secondaryColor}70`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                        Caja Principal • POS
                      </span>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: `${themeData.primaryColor}${isLightBg ? '15' : '20'}`,
                          borderColor: `${themeData.primaryColor}${isLightBg ? '35' : '40'}`,
                          color: isLightBg ? '#5E3023' : themeData.primaryColor,
                        }}
                      >
                        🍽️ En Mesa
                      </span>
                    </div>

                    <div
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border"
                      style={{
                        backgroundColor: isLightBg ? '#FEF3C7' : 'rgba(245, 158, 11, 0.2)',
                        borderColor: isLightBg ? '#FCD34D' : 'rgba(245, 158, 11, 0.4)',
                        color: isLightBg ? '#78350F' : '#FDE68A',
                      }}
                    >
                      <Receipt className="w-3 h-3" />
                      <span>3 Comandas por Cobrar</span>
                    </div>
                  </div>

                  {/* Cuerpo dividido: Catálogo a la izquierda, Ticket a la derecha */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 my-3 flex-1 relative z-10">
                    {/* Productos */}
                    <div className="sm:col-span-7 space-y-2">
                      <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                        {['Todo', '☕ Café', '🥤 Fríos', '🥐 Pan'].map((c, i) => (
                          <span
                            key={c}
                            className={`px-2.5 py-1 rounded-lg font-bold border ${
                              i === 0
                                ? 'text-white'
                                : isLightBg
                                ? 'bg-white border-[#DECEBD] text-[#5E3023]'
                                : 'bg-black/20 border-white/10 text-slate-300'
                            }`}
                            style={i === 0 ? { backgroundColor: themeData.buttonColor } : {}}
                          >
                            {c}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { name: 'Cappuccino Italiano', price: '$55.00' },
                          { name: 'Espresso Doble', price: '$45.00' },
                          { name: 'Latte Vainilla', price: '$65.00' },
                          { name: 'Croissant Francés', price: '$42.00' },
                        ].map((prod) => (
                          <div
                            key={prod.name}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between h-20 shadow-xs ${
                              isLightBg ? 'bg-white border-[#DECEBD]' : 'bg-black/30 border-white/10'
                            }`}
                          >
                            <span className={`text-[11px] font-bold line-clamp-1 ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                              {prod.name}
                            </span>
                            <div className="flex items-center justify-between pt-1">
                              <span
                                className="text-xs font-black"
                                style={{ color: isLightBg ? '#5E3023' : themeData.primaryColor }}
                              >
                                {prod.price}
                              </span>
                              <span
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold text-white shadow-xs"
                                style={{ backgroundColor: themeData.buttonColor }}
                              >
                                +
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ticket Lateral */}
                    <div
                      className={`sm:col-span-5 p-3 rounded-2xl border flex flex-col justify-between ${
                        isLightBg ? 'bg-white border-[#DECEBD]' : 'bg-black/40 border-white/10'
                      }`}
                    >
                      <div>
                        <div className={`flex items-center justify-between pb-1.5 border-b text-[11px] font-bold ${
                          isLightBg ? 'border-[#DECEBD] text-[#2B1712]' : 'border-white/10 text-white'
                        }`}>
                          <span>Ticket #0142</span>
                          <span className="text-[10px] text-emerald-600 font-semibold">Mesa 2</span>
                        </div>

                        <div className="space-y-1.5 pt-2 text-[10px]">
                          <div className="flex justify-between items-center">
                            <span className={isLightBg ? 'text-[#5E3023]' : 'text-slate-300'}>1x Cappuccino</span>
                            <span className="font-bold font-mono">$55.00</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={isLightBg ? 'text-[#5E3023]' : 'text-slate-300'}>1x Croissant</span>
                            <span className="font-bold font-mono">$42.00</span>
                          </div>
                        </div>
                      </div>

                      <div className={`pt-2 border-t space-y-1.5 ${isLightBg ? 'border-[#DECEBD]' : 'border-white/10'}`}>
                        <div className="flex justify-between text-[11px] font-black">
                          <span className={isLightBg ? 'text-[#2B1712]' : 'text-white'}>Total:</span>
                          <span style={{ color: isLightBg ? '#5E3023' : themeData.primaryColor }}>$97.00 MXN</span>
                        </div>
                        <button
                          type="button"
                          style={{
                            backgroundColor: themeData.buttonColor,
                            color: isLightButton ? '#2B1712' : '#FFFFFF',
                          }}
                          className="w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Cobrar $97.00</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            // VISTA 3: MONITOR KDS (COCINA & BARRA)
            if (previewTab === 'kds') {
              return (
                <div
                  className={`rounded-3xl border p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all duration-300 min-h-[480px] flex flex-col justify-between select-none ${
                    isLightBg ? 'border-[#DECEBD] shadow-amber-950/5' : 'border-black/20'
                  }`}
                  style={{ backgroundColor: themeData.bgColor }}
                >
                  {/* Top KDS bar */}
                  <div
                    className="rounded-2xl p-2.5 flex items-center justify-between border shadow-sm relative z-10"
                    style={{
                      backgroundColor: isLightBg ? '#FFFFFFE6' : `${themeData.secondaryColor}40`,
                      borderColor: isLightBg ? '#DECEBD' : `${themeData.secondaryColor}70`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                        KDS • Monitor de Cocina
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-lg border font-mono ${
                        isLightBg ? 'bg-white border-[#DECEBD] text-[#5E3023]' : 'bg-black/30 border-white/10 text-slate-300'
                      }`}>
                        3 órdenes
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg border font-mono font-bold ${
                        isLightBg ? 'bg-emerald-100 border-emerald-300 text-emerald-950' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      }`}>
                        2 listos
                      </span>
                    </div>
                  </div>

                  {/* 3 Tarjetas de Tickets KDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3 flex-1 relative z-10">
                    {/* Ticket 1: Normal */}
                    <div
                      className={`p-3 rounded-2xl border flex flex-col justify-between shadow-md ${
                        isLightBg ? 'bg-white border-[#DECEBD]' : 'bg-black/30 border-white/10'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center pb-1.5 border-b border-dashed border-slate-300/40">
                          <div>
                            <span className={`text-xs font-black block ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                              MESA 3
                            </span>
                            <span className="text-[9px] opacity-70">#ORD-101 • 4 min</span>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-lg font-bold ${
                            isLightBg ? 'bg-[#F3E9DC] text-[#5E3023]' : 'bg-slate-800 text-slate-300'
                          }`}>
                            4m
                          </span>
                        </div>
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between items-center">
                            <span>2x Cappuccino</span>
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded">MARCHANDO</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>1x Tarta Manzana</span>
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1 rounded">✓ LISTO</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{ backgroundColor: themeData.buttonColor, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                        className="w-full py-1.5 mt-2 rounded-xl text-[10px] font-bold shadow-xs"
                      >
                        ⚡ Marcar Listo
                      </button>
                    </div>

                    {/* Ticket 2: Advertencia (>6m) */}
                    <div
                      className={`p-3 rounded-2xl border flex flex-col justify-between shadow-md ${
                        isLightBg ? 'bg-[#FFFBEB] border-amber-400' : 'bg-[#261609] border-amber-500/50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center pb-1.5 border-b border-dashed border-amber-300">
                          <div>
                            <span className={`text-xs font-black block ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                              MESA 1
                            </span>
                            <span className="text-[9px] text-amber-900 font-semibold">#ORD-100 • 8 min</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-lg font-black bg-amber-500 text-slate-950">
                            8m ⚠️
                          </span>
                        </div>
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between items-center">
                            <span>1x Bagel Salmón</span>
                            <span className="text-[9px] font-bold text-amber-900 bg-amber-200 px-1 rounded">MARCHANDO</span>
                          </div>
                          <p className="text-[9px] italic text-amber-800 bg-amber-100/80 p-1 rounded">
                            Nota: Sin cebolla morada
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{ backgroundColor: themeData.buttonColor, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                        className="w-full py-1.5 mt-2 rounded-xl text-[10px] font-bold shadow-xs"
                      >
                        ⚡ Marcar Listo
                      </button>
                    </div>

                    {/* Ticket 3: Urgente (>12m) */}
                    <div
                      className={`p-3 rounded-2xl border flex flex-col justify-between shadow-md ${
                        isLightBg ? 'bg-[#FEF2F2] border-red-400 animate-pulse' : 'bg-[#2A0A0B] border-red-500/50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center pb-1.5 border-b border-dashed border-red-300">
                          <div>
                            <span className={`text-xs font-black block ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                              🛍️ PARA LLEVAR
                            </span>
                            <span className="text-[9px] text-red-800 font-bold">#ORD-098 • 14 min</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-lg font-black bg-red-600 text-white">
                            14m 🔥
                          </span>
                        </div>
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between items-center">
                            <span>2x Americano Frío</span>
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1 rounded">✓ LISTO</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="w-full py-1.5 mt-2 rounded-xl text-[10px] font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                      >
                        ✓ Despachar
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            // VISTA 4: DASHBOARD PRINCIPAL
            if (previewTab === 'dashboard') {
              return (
                <div
                  className={`rounded-3xl border p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all duration-300 min-h-[480px] flex flex-col justify-between select-none ${
                    isLightBg ? 'border-[#DECEBD] shadow-amber-950/5' : 'border-black/20'
                  }`}
                  style={{ backgroundColor: themeData.bgColor }}
                >
                  {/* Banner de Bienvenida */}
                  <div
                    className="rounded-2xl p-3 border shadow-sm relative z-10 flex items-center justify-between"
                    style={{
                      backgroundColor: isLightBg ? '#FFFFFFE6' : `${themeData.secondaryColor}40`,
                      borderColor: isLightBg ? '#DECEBD' : `${themeData.secondaryColor}70`,
                    }}
                  >
                    <div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider block ${isLightBg ? 'text-[#895737]' : 'text-slate-400'}`}>
                        Panel Central de Control
                      </span>
                      <h4 className={`text-sm font-black ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                        Bienvenido a {selectedBranch?.name || 'Sucursal Matriz'}
                      </h4>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold border"
                      style={{
                        backgroundColor: `${themeData.primaryColor}${isLightBg ? '15' : '20'}`,
                        borderColor: `${themeData.primaryColor}${isLightBg ? '35' : '40'}`,
                        color: isLightBg ? '#5E3023' : themeData.primaryColor,
                      }}
                    >
                      Moneda: MXN
                    </span>
                  </div>

                  {/* 4 KPIs de Resumen */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 relative z-10">
                    {[
                      { label: 'Ventas de Hoy', val: '$8,450.00', icon: TrendingUp, change: '+14%' },
                      { label: 'Comandas', val: '38 órdenes', icon: UtensilsCrossed, change: 'En curso' },
                      { label: 'Mesas Ocupadas', val: '6 de 12', icon: Coffee, change: '50%' },
                      { label: 'Ticket Promedio', val: '$222.30', icon: CreditCard, change: 'MXN' },
                    ].map((kpi) => {
                      const KpiIcon = kpi.icon
                      return (
                        <div
                          key={kpi.label}
                          className={`p-3 rounded-2xl border flex flex-col justify-between shadow-xs ${
                            isLightBg ? 'bg-white border-[#DECEBD]' : 'bg-black/30 border-white/10'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-semibold ${isLightBg ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                              {kpi.label}
                            </span>
                            <KpiIcon className="w-3.5 h-3.5" style={{ color: themeData.primaryColor }} />
                          </div>
                          <div className="pt-2">
                            <span className={`text-sm font-black block ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                              {kpi.val}
                            </span>
                            <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
                              {kpi.change}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Accesos rápidos inferiores */}
                  <div
                    className="p-3 rounded-2xl border flex items-center justify-between gap-2 relative z-10"
                    style={{
                      backgroundColor: isLightBg ? '#FFFFFFE6' : `${themeData.secondaryColor}30`,
                      borderColor: isLightBg ? '#DECEBD' : `${themeData.secondaryColor}60`,
                    }}
                  >
                    <span className={`text-[11px] font-bold ${isLightBg ? 'text-[#5E3023]' : 'text-slate-300'}`}>
                      Accesos directos de operación:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        style={{ backgroundColor: themeData.buttonColor, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                        className="px-3 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1 shadow-xs"
                      >
                        <UtensilsCrossed className="w-3 h-3" />
                        <span>Comandera</span>
                      </button>
                      <button
                        type="button"
                        style={{
                          backgroundColor: `${themeData.primaryColor}${isLightBg ? '20' : '30'}`,
                          color: isLightBg ? '#5E3023' : themeData.primaryColor,
                          borderColor: `${themeData.primaryColor}50`,
                        }}
                        className="px-3 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1 border shadow-xs"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>Punto de Venta</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            // VISTA 5: GESTIÓN DE MESAS Y ÁREAS
            if (previewTab === 'tables') {
              return (
                <div
                  className={`rounded-3xl border p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all duration-300 min-h-[480px] flex flex-col justify-between select-none ${
                    isLightBg ? 'border-[#DECEBD] shadow-amber-950/5' : 'border-black/20'
                  }`}
                  style={{ backgroundColor: themeData.bgColor }}
                >
                  <div
                    className="rounded-2xl p-3 border shadow-sm relative z-10 flex items-center justify-between"
                    style={{
                      backgroundColor: isLightBg ? '#FFFFFFE6' : `${themeData.secondaryColor}40`,
                      borderColor: isLightBg ? '#DECEBD' : `${themeData.secondaryColor}70`,
                    }}
                  >
                    <div>
                      <h4 className={`text-xs font-black ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                        Control de Mesas y Distribución
                      </h4>
                      <p className={`text-[10px] ${isLightBg ? 'text-[#895737]' : 'text-slate-400'}`}>
                        Salón Principal (8) • Terraza (4)
                      </p>
                    </div>
                    <button
                      type="button"
                      style={{ backgroundColor: themeData.buttonColor, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                      className="px-3 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nueva Mesa</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 relative z-10 flex-1">
                    {[
                      { name: 'Mesa 1', cap: '4 pers.', status: 'Libre', waiter: 'Carlos M.', color: 'emerald' },
                      { name: 'Mesa 2', cap: '4 pers.', status: 'Ocupada', waiter: 'Ana R.', color: 'amber' },
                      { name: 'Mesa 3', cap: '2 pers.', status: 'Pre-cuenta', waiter: 'Carlos M.', color: 'purple' },
                      { name: 'Mesa 4', cap: '6 pers.', status: 'Libre', waiter: 'Libre', color: 'emerald' },
                    ].map((tbl) => (
                      <div
                        key={tbl.name}
                        className={`p-3 rounded-2xl border flex flex-col justify-between shadow-xs ${
                          isLightBg ? 'bg-white border-[#DECEBD]' : 'bg-black/30 border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`font-black text-xs ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                            {tbl.name}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${
                            tbl.color === 'emerald' ? 'bg-emerald-500' : tbl.color === 'amber' ? 'bg-amber-500' : 'bg-purple-500'
                          }`} />
                        </div>
                        <div className="space-y-0.5 pt-2">
                          <span className={`text-[9px] block ${isLightBg ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                            Cap: {tbl.cap}
                          </span>
                          <span className={`text-[9px] font-bold block ${
                            tbl.color === 'emerald' ? 'text-emerald-700' : tbl.color === 'amber' ? 'text-amber-700' : 'text-purple-700'
                          }`}>
                            {tbl.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="p-2.5 rounded-2xl border flex items-center justify-between text-[10px] relative z-10"
                    style={{
                      backgroundColor: isLightBg ? '#FFFFFFE6' : `${themeData.secondaryColor}30`,
                      borderColor: isLightBg ? '#DECEBD' : `${themeData.secondaryColor}60`,
                    }}
                  >
                    <span className={isLightBg ? 'text-[#7A5A43]' : 'text-slate-400'}>
                      Modo: <strong>Servicio Libre (Cualquier mesero)</strong>
                    </span>
                    <span className="font-bold text-emerald-600">✓ 12 mesas sincronizadas</span>
                  </div>
                </div>
              )
            }

            // VISTA 6: CATÁLOGO & PRODUCTOS
            if (previewTab === 'catalog') {
              return (
                <div
                  className={`rounded-3xl border p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all duration-300 min-h-[480px] flex flex-col justify-between select-none ${
                    isLightBg ? 'border-[#DECEBD] shadow-amber-950/5' : 'border-black/20'
                  }`}
                  style={{ backgroundColor: themeData.bgColor }}
                >
                  <div
                    className="rounded-2xl p-3 border shadow-sm relative z-10 flex items-center justify-between"
                    style={{
                      backgroundColor: isLightBg ? '#FFFFFFE6' : `${themeData.secondaryColor}40`,
                      borderColor: isLightBg ? '#DECEBD' : `${themeData.secondaryColor}70`,
                    }}
                  >
                    <div>
                      <h4 className={`text-xs font-black ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                        Catálogo de Productos & Recetas
                      </h4>
                      <p className={`text-[10px] ${isLightBg ? 'text-[#895737]' : 'text-slate-400'}`}>
                        24 platillos y bebidas en menú activo
                      </p>
                    </div>
                    <button
                      type="button"
                      style={{ backgroundColor: themeData.buttonColor, color: isLightButton ? '#2B1712' : '#FFFFFF' }}
                      className="px-3 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nuevo Producto</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3 relative z-10 flex-1">
                    {[
                      { name: 'Americano Clásico', code: 'CAF-01', price: '$45.00', cat: 'Cafetería', badge: 'RECETA' },
                      { name: 'Cappuccino de Vainilla', code: 'CAF-02', price: '$65.00', cat: 'Cafetería', badge: 'RECETA' },
                      { name: 'Muffin de Frutos Rojos', code: 'PAN-05', price: '$38.00', cat: 'Repostería', badge: 'STOCK' },
                    ].map((item) => (
                      <div
                        key={item.code}
                        className={`p-3 rounded-2xl border flex flex-col justify-between shadow-xs ${
                          isLightBg ? 'bg-white border-[#DECEBD]' : 'bg-black/30 border-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono opacity-70">{item.code}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              item.badge === 'RECETA' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {item.badge}
                            </span>
                          </div>
                          <h5 className={`text-xs font-black mt-1 ${isLightBg ? 'text-[#2B1712]' : 'text-white'}`}>
                            {item.name}
                          </h5>
                          <span className={`text-[9px] ${isLightBg ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                            {item.cat}
                          </span>
                        </div>

                        <div className="pt-2 flex justify-between items-center border-t border-dashed border-slate-300/40">
                          <span
                            className="text-xs font-black"
                            style={{ color: isLightBg ? '#5E3023' : themeData.primaryColor }}
                          >
                            {item.price}
                          </span>
                          <span className="text-[9px] text-emerald-600 font-bold">Activo</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="p-2.5 rounded-2xl border flex items-center justify-between text-[10px] relative z-10"
                    style={{
                      backgroundColor: isLightBg ? '#FFFFFFE6' : `${themeData.secondaryColor}30`,
                      borderColor: isLightBg ? '#DECEBD' : `${themeData.secondaryColor}60`,
                    }}
                  >
                    <span className={isLightBg ? 'text-[#7A5A43]' : 'text-slate-400'}>
                      Descuento automático de inventario por porción activo
                    </span>
                    <span className="font-bold text-amber-600">✓ Recetas sincronizadas</span>
                  </div>
                </div>
              )
            }

            // VISTA: CARTA DE MENÚ TIPO LIBRO INTERACTIVA
            if (previewTab === 'menu') {
              const previewCategories = [
                {
                  id: 'cat-1',
                  name: 'Cafetería de Especialidad',
                  slug: 'cafeteria',
                  imageUrl: null,
                  products: [
                    {
                      id: 'p1',
                      name: 'Café Espresso Doble',
                      code: 'ESP-01',
                      description: 'Extracción balanceada con notas de chocolate amargo y avellana tostada.',
                      imageUrl: null,
                      hasVariants: false,
                      minPrice: 42,
                      variants: [{ id: 'v1', name: 'Doble (60ml)', price: 42 }],
                      isAvailable: true,
                    },
                    {
                      id: 'p2',
                      name: 'Café Latte Caliente',
                      code: 'LAT-02',
                      description: 'Espresso aterciopelado con microespuma de leche entera o vegetal al punto.',
                      imageUrl: null,
                      hasVariants: true,
                      minPrice: 55,
                      variants: [
                        { id: 'v2-1', name: 'Chico (8oz)', price: 55 },
                        { id: 'v2-2', name: 'Mediano (12oz)', price: 65 },
                        { id: 'v2-3', name: 'Grande (16oz)', price: 75 },
                      ],
                      isAvailable: true,
                    },
                    {
                      id: 'p3',
                      name: 'Cappuccino Italiano',
                      code: 'CAP-03',
                      description: 'Capas definidas de espresso, leche sedosa y densa crema con toque de canela.',
                      imageUrl: null,
                      hasVariants: false,
                      minPrice: 60,
                      variants: [{ id: 'v3', name: 'Estándar', price: 60 }],
                      isAvailable: true,
                    },
                  ],
                },
                {
                  id: 'cat-2',
                  name: 'Bebidas Frías & Frappés',
                  slug: 'frias',
                  imageUrl: null,
                  products: [
                    {
                      id: 'p4',
                      name: 'Cold Brew Moka Artesanal',
                      code: 'CB-01',
                      description: 'Café macerado en frío durante 18 horas con infusión de cacao puro.',
                      imageUrl: null,
                      hasVariants: false,
                      minPrice: 68,
                      variants: [{ id: 'v4', name: '16oz', price: 68 }],
                      isAvailable: true,
                    },
                    {
                      id: 'p5',
                      name: 'Frappé Caramelo Tostado',
                      code: 'FRP-02',
                      description: 'Base de espresso batida con hielo, caramelo y corona de crema batida.',
                      imageUrl: null,
                      hasVariants: true,
                      minPrice: 72,
                      variants: [
                        { id: 'v5-1', name: 'Mediano (16oz)', price: 72 },
                        { id: 'v5-2', name: 'Grande (20oz)', price: 85 },
                      ],
                      isAvailable: true,
                    },
                  ],
                },
                {
                  id: 'cat-3',
                  name: 'Repostería & Horno',
                  slug: 'reposteria',
                  imageUrl: null,
                  products: [
                    {
                      id: 'p6',
                      name: 'Croissant Mantequilla Almendrado',
                      code: 'CRO-01',
                      description: 'Masa hojaldrada horneada a diario rellena de crema de almendras tostadas.',
                      imageUrl: null,
                      hasVariants: false,
                      minPrice: 48,
                      variants: [{ id: 'v6', name: 'Pieza', price: 48 }],
                      isAvailable: true,
                    },
                    {
                      id: 'p7',
                      name: 'Cheesecake Frutos Rojos',
                      code: 'CHK-02',
                      description: 'Textura cremosa estilo Nueva York con compota casera de zarzamora y fresa.',
                      imageUrl: null,
                      hasVariants: false,
                      minPrice: 65,
                      variants: [{ id: 'v7', name: 'Rebanada', price: 65 }],
                      isAvailable: true,
                    },
                  ],
                },
              ]

              return (
                <div
                  className="rounded-3xl border p-4 sm:p-6 shadow-xl space-y-4 relative overflow-hidden transition-all duration-300"
                  style={{
                    backgroundColor: themeData.bgColor,
                    borderColor: `${themeData.primaryColor}40`,
                  }}
                >
                  <div className="flex items-center justify-between text-xs border-b pb-2 text-white/70">
                    <span className="font-bold flex items-center gap-1.5 text-amber-400">
                      <BookOpen className="w-4 h-4" />
                      Previsualización: Carta Menú Digital (1 Categoría por Página)
                    </span>
                    <span className="text-[11px] opacity-75">
                      Prueba pasar las páginas o tocar los productos
                    </span>
                  </div>

                  <BookMenu
                    business={{
                      name: selectedBranch?.name || 'Café Katela',
                      logoUrl: themeData.logoUrl || selectedBranch?.logoUrl || null,
                      isotypeUrl: themeData.isotypeUrl || selectedBranch?.isotypeUrl || null,
                      currency: 'MXN',
                      theme: {
                        primaryColor: themeData.primaryColor,
                        secondaryColor: themeData.secondaryColor,
                        buttonColor: themeData.buttonColor,
                        darkMode: !isLightBg,
                        menuCoverColor: themeData.menuCoverColor,
                        menuPaperColor: themeData.menuPaperColor,
                        menuTextColor: themeData.menuTextColor,
                        menuAccentColor: themeData.menuAccentColor,
                        menuCoverTitle: themeData.menuCoverTitle,
                        menuCoverSubtitle: themeData.menuCoverSubtitle,
                        businessHours: themeData.businessHours,
                      },
                    }}
                    categories={previewCategories}
                    table={{ name: 'Mesa 4', area: 'Terraza' }}
                    customColors={{
                      primaryColor: themeData.primaryColor,
                      secondaryColor: themeData.secondaryColor,
                      buttonColor: themeData.buttonColor,
                      bgColor: themeData.bgColor,
                      darkMode: !isLightBg,
                      menuCoverColor: themeData.menuCoverColor,
                      menuPaperColor: themeData.menuPaperColor,
                      menuTextColor: themeData.menuTextColor,
                      menuAccentColor: themeData.menuAccentColor,
                      menuCoverTitle: themeData.menuCoverTitle,
                      menuCoverSubtitle: themeData.menuCoverSubtitle,
                      businessHours: themeData.businessHours,
                    }}
                  />
                </div>
              )
            }

            // VISTA 8: BARRA LATERAL & LOGOS (CON LOS 8 TEMAS)
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Sidebar Expandido con Logo Grande y Nombre debajo */}
                <div
                  className="rounded-3xl border p-5 shadow-xl flex flex-col justify-between min-h-[480px] transition-all"
                  style={{
                    backgroundColor: sBg,
                    borderColor: sBorder,
                    color: sText,
                  }}
                >
                  <div className="space-y-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 text-center">
                      Sidebar Expandido • Tema: {themeData.sidebarTheme}
                    </div>

                    <div
                      className="pb-4 border-b flex flex-col items-center text-center"
                      style={{ borderColor: sBorder }}
                    >
                      {themeData.logoUrl || themeData.isotypeUrl ? (
                        <img
                          src={themeData.logoUrl || themeData.isotypeUrl}
                          alt="Logo / Isologo"
                          className="max-h-20 max-w-[190px] w-auto h-auto object-contain my-1 drop-shadow-md select-none"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold my-1 shadow-md"
                          style={{
                            background: `linear-gradient(135deg, ${themeData.secondaryColor}, ${themeData.primaryColor})`,
                          }}
                        >
                          <Coffee className="w-7 h-7" />
                        </div>
                      )}
                      <h4 className="font-black text-sm tracking-tight mt-2 truncate w-full">
                        {selectedBranch?.name || 'PosCafé'}
                      </h4>
                      <span className="text-[10px] opacity-70 block truncate">
                        Cafetería de Especialidad
                      </span>
                    </div>

                    <div className="space-y-2 pt-1 text-xs">
                      <div
                        className="p-2.5 rounded-xl font-bold text-white flex items-center gap-2 shadow-sm"
                        style={{ backgroundColor: themeData.buttonColor }}
                      >
                        <UtensilsCrossed className="w-4 h-4" />
                        <span>Comandera de Mesas</span>
                      </div>
                      <div
                        className="p-2.5 rounded-xl flex items-center gap-2 opacity-80"
                        style={{
                          backgroundColor:
                            sTheme === 'LIGHT' || sTheme === 'WHITE' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Terminal POS (Caja)</span>
                      </div>
                      <div
                        className="p-2.5 rounded-xl flex items-center gap-2 opacity-80"
                        style={{
                          backgroundColor:
                            sTheme === 'LIGHT' || sTheme === 'WHITE' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <MonitorPlay className="w-4 h-4" />
                        <span>Monitor Cocina (KDS)</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="pt-3 border-t text-[11px] flex items-center justify-between opacity-80"
                    style={{ borderColor: sBorder }}
                  >
                    <div>
                      <strong className="block font-bold">Admin Demo</strong>
                      <span className="text-[10px] opacity-70">Administrador</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border">
                      Estilo: {themeData.sidebarTheme}
                    </span>
                  </div>
                </div>

                {/* 2. Sidebar Contraído con Isologo */}
                <div
                  className="rounded-3xl border p-5 shadow-xl flex flex-col justify-between items-center min-h-[480px] transition-all"
                  style={{
                    backgroundColor: sBg,
                    borderColor: sBorder,
                    color: sText,
                  }}
                >
                  <div className="space-y-4 flex flex-col items-center w-full">
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 text-center">
                      Sidebar Contraído (Isotipo)
                    </div>

                    <div
                      className="pb-4 border-b flex flex-col items-center w-full"
                      style={{ borderColor: sBorder }}
                    >
                      {themeData.isotypeUrl || themeData.logoUrl ? (
                        <img
                          src={themeData.isotypeUrl || themeData.logoUrl}
                          alt="Isologo"
                          className="w-12 h-12 object-contain drop-shadow-md select-none transition-transform hover:scale-105"
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-md"
                          style={{
                            background: `linear-gradient(135deg, ${themeData.secondaryColor}, ${themeData.primaryColor})`,
                          }}
                        >
                          <Coffee className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex flex-col items-center">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: themeData.buttonColor }}
                      >
                        <UtensilsCrossed className="w-5 h-5" />
                      </div>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center opacity-70"
                        style={{
                          backgroundColor:
                            sTheme === 'LIGHT' || sTheme === 'WHITE' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <CreditCard className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-center opacity-75 font-medium px-2">
                    El isotipo proporciona un símbolo limpio para navegación compacta.
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </main>
  </div>
)
}

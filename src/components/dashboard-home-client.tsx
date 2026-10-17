'use client'

import React from 'react'
import Link from 'next/link'
import {
  Store,
  MapPin,
  Users,
  Package,
  CheckCircle,
  Coffee,
  ArrowRight,
  BarChart3,
  UtensilsCrossed,
  CreditCard,
  LayoutGrid,
  QrCode,
  MonitorPlay,
  Boxes,
  Truck,
  Palette,
  Tv,
  ArrowUpRight,
  Sparkles,
  Receipt,
} from 'lucide-react'
import { useDashboardTheme } from '@/context/dashboard-theme-context'
import { getContrastTextColor } from '@/lib/theme-utils'

interface DashboardHomeClientProps {
  sessionName: string
  sessionGender?: string | null
  business: any
  activeBranch: any
  tableCount: number
  isMultiBranch: boolean
}

export default function DashboardHomeClient({
  sessionName,
  sessionGender,
  business,
  activeBranch,
  tableCount,
  isMultiBranch,
}: DashboardHomeClientProps) {
  const { isLight, primaryColor, secondaryColor, buttonColor, classes } = useDashboardTheme()

  const posTextContrast = getContrastTextColor(buttonColor, '#FFFFFF', '#14100E')
  const comanderaTextContrast = getContrastTextColor(primaryColor, '#FFFFFF', '#14100E')

  // Módulos de Operación Diaria (Botones Cuadrados)
  const operationShortcuts = [
    {
      title: 'Terminal POS',
      subtitle: 'Cobro rápido, tickets y caja',
      badge: 'Caja Activa',
      href: '/pos',
      icon: CreditCard,
      highlight: true,
      customBg: buttonColor,
      customColor: posTextContrast,
      isExternal: false,
    },
    {
      title: 'Comandera',
      subtitle: 'Toma de pedidos y mesas',
      badge: `${tableCount} Mesas`,
      href: '/comandera',
      icon: UtensilsCrossed,
      highlight: true,
      customBg: primaryColor,
      customColor: comanderaTextContrast,
      isExternal: false,
    },
    {
      title: 'Monitor KDS',
      subtitle: 'Comandas de cocina en vivo',
      badge: 'Cocina',
      href: '/kds',
      icon: MonitorPlay,
      iconColor: '#10B981',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      isExternal: false,
    },
    {
      title: 'Menú Digital',
      subtitle: 'Carta QR para comensales',
      badge: 'QR Móvil',
      href: '/menu',
      icon: QrCode,
      iconColor: '#3B82F6',
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      isExternal: true,
    },
    {
      title: 'Pantalla TV',
      subtitle: 'Menuboard interactivo',
      badge: 'Display',
      href: '/display',
      icon: Tv,
      iconColor: '#F59E0B',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      isExternal: true,
    },
  ]

  // Módulos de Administración (Botones Cuadrados según dashboard-sidebar.tsx)
  const adminShortcuts = [
    {
      title: 'Inventario',
      subtitle: 'Insumos, stock y mermas',
      badge: 'Materias Primas',
      href: '/dashboard/inventory',
      icon: Boxes,
      iconColor: '#8B5CF6',
    },
    {
      title: 'Compras',
      subtitle: 'Abastecimiento y facturas',
      badge: 'Proveedores',
      href: '/dashboard/purchases',
      icon: Truck,
      iconColor: '#EC4899',
    },
    {
      title: 'Gastos Operativos',
      subtitle: 'Servicios, rentas y comprobantes',
      badge: 'Costos Fijos',
      href: '/dashboard/expenses',
      icon: Receipt,
      iconColor: '#F43F5E',
    },
    {
      title: 'Catálogo & Recetas',
      subtitle: 'Productos, tamaños y escandallo',
      badge: 'Recetario',
      href: '/dashboard/catalog',
      icon: Package,
      iconColor: buttonColor,
    },
    {
      title: 'Áreas de Cocina',
      subtitle: 'Estaciones, bebidas y cocina caliente',
      badge: 'Producción',
      href: '/dashboard/kitchen-stations',
      icon: UtensilsCrossed,
      iconColor: '#F59E0B',
    },
    {
      title: 'Control de Mesas',
      subtitle: 'Zonas, mapas y meseros',
      badge: `${tableCount} activas`,
      href: '/dashboard/tables',
      icon: LayoutGrid,
      iconColor: primaryColor,
    },
    {
      title: 'Personal & Roles',
      subtitle: 'Colaboradores, PINs y permisos',
      badge: 'Equipo',
      href: '/dashboard/users',
      icon: Users,
      iconColor: '#06B6D4',
    },
    {
      title: 'Reportes & Ventas',
      subtitle: 'Cortes Z, arqueos y auditoría',
      badge: 'Finanzas',
      href: '/dashboard/reports',
      icon: BarChart3,
      iconColor: '#10B981',
    },
    {
      title: 'Sucursales',
      subtitle: 'Sedes y almacenes físicos',
      badge: `${business.branches.length} Sedes`,
      href: '/dashboard/branches',
      icon: Store,
      iconColor: '#F97316',
    },
    {
      title: 'Temas & Colores',
      subtitle: 'Personalización de marca y TV',
      badge: 'Branding',
      href: '/dashboard/theme',
      icon: Palette,
      iconColor: '#E11D48',
    },
  ]

  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16 lg:pt-8 pb-8 space-y-6 sm:space-y-8 w-full max-w-7xl mx-auto transition-all duration-300">
      {/* Welcome Banner con identidad visual reactiva al tema */}
      <div
        className={`rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden backdrop-blur-md border ${classes.card}`}
      >
        {/* Glow ambiental */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-20"
          style={{
            background: `radial-gradient(circle, ${buttonColor}, ${primaryColor})`,
          }}
        />

        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isLight
                  ? 'bg-[#C08552]/15 border-[#C08552]/30 text-[#895737]'
                  : 'bg-white/10 border-white/15 text-amber-300'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Panel de Control</span>
            </div>

            <span className={`text-xs px-2.5 py-1 rounded-full border font-mono font-semibold ${classes.badge}`}>
              {activeBranch?.name || business.name} ({activeBranch?.code || 'MATRIZ'})
            </span>
          </div>

          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isLight ? 'text-[#2B1712]' : 'text-white'
            }`}
          >
            {sessionGender === 'FEMALE' ? 'Bienvenida' : 'Bienvenido'}, {sessionName}
          </h1>
          <p className={`text-xs sm:text-sm font-medium leading-relaxed ${classes.textMuted}`}>
            Control integral de cafetería: accesos rápidos táctiles a punto de venta, comandas, insumos y administración de sucursales.
          </p>
        </div>

        {/* Acciones directas compactas */}
        <div className="flex items-center gap-2.5 relative z-10 shrink-0">
          <Link
            href="/pos"
            style={{
              backgroundColor: buttonColor,
              color: posTextContrast,
            }}
            className="px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all hover:opacity-95 shadow-md active:scale-95 touch-manipulation cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Abrir POS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/comandera"
            style={{
              backgroundColor: primaryColor,
              color: comanderaTextContrast,
            }}
            className="px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/10 shadow-md transition-all hover:opacity-95 active:scale-95 touch-manipulation cursor-pointer"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Comandera</span>
          </Link>
        </div>
      </div>

      {/* SECCIÓN 1: OPERACIÓN EN VIVO (BOTONES CUADRADOS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: buttonColor }} />
            <h2 className={`text-sm sm:text-base font-black uppercase tracking-wider ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              Operación en Vivo
            </h2>
          </div>
          <span className={`text-[11px] font-medium ${classes.textMuted}`}>
            Punto de venta, comandas y pantallas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {operationShortcuts.map((op, idx) => {
            const Icon = op.icon
            const isHighlight = op.highlight && op.customBg

            return (
              <Link
                key={idx}
                href={op.href}
                target={op.isExternal ? '_blank' : undefined}
                style={
                  isHighlight
                    ? {
                        backgroundColor: op.customBg,
                        color: op.customColor,
                      }
                    : undefined
                }
                className={`aspect-square p-4 sm:p-5 rounded-2xl sm:rounded-3xl border flex flex-col justify-between transition-all duration-200 group active:scale-95 touch-manipulation select-none relative overflow-hidden shadow-sm hover:shadow-lg ${
                  isHighlight
                    ? 'border-transparent ring-1 ring-white/20'
                    : `${classes.card} hover:border-[#C08552]/40`
                }`}
              >
                {/* Glow sutil en hover */}
                <div
                  className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity"
                  style={{
                    backgroundColor: op.iconColor || op.customBg || buttonColor,
                  }}
                />

                {/* Fila Superior: Ícono + Badge / Flecha */}
                <div className="flex items-start justify-between gap-2 relative z-10">
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold shadow-xs transition-transform duration-200 group-hover:scale-105 ${
                      isHighlight
                        ? 'bg-black/15 text-current'
                        : isLight
                        ? 'bg-[#C08552]/10 border border-[#C08552]/20'
                        : 'bg-white/10 border border-white/10'
                    }`}
                    style={!isHighlight && op.iconColor ? { color: op.iconColor } : undefined}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${
                        isHighlight
                          ? 'bg-black/20 text-current border-white/20'
                          : op.badgeColor || classes.badge
                      }`}
                    >
                      {op.badge}
                    </span>
                    {op.isExternal ? (
                      <ArrowUpRight
                        className={`w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity ${
                          isHighlight ? 'text-current' : classes.textMuted
                        }`}
                      />
                    ) : (
                      <ArrowRight
                        className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isHighlight ? 'text-current' : classes.textMuted
                        }`}
                      />
                    )}
                  </div>
                </div>

                {/* Fila Inferior: Título y Subtítulo */}
                <div className="relative z-10 pt-2">
                  <h3
                    className={`text-sm sm:text-base font-black tracking-tight truncate ${
                      isHighlight ? 'text-current' : isLight ? 'text-[#2B1712]' : 'text-white'
                    }`}
                  >
                    {op.title}
                  </h3>
                  <p
                    className={`text-[10px] sm:text-[11px] line-clamp-1 mt-0.5 font-medium ${
                      isHighlight ? 'opacity-85 text-current' : classes.textMuted
                    }`}
                  >
                    {op.subtitle}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* SECCIÓN 2: ADMINISTRACIÓN Y CONTROL (BOTONES CUADRADOS DE TODO EL SIDEBAR) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4" style={{ color: buttonColor }} />
            <h2 className={`text-sm sm:text-base font-black uppercase tracking-wider ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              Administración y Catálogo
            </h2>
          </div>
          <span className={`text-[11px] font-medium ${classes.textMuted}`}>
            9 Módulos de configuración central
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
          {adminShortcuts.map((ad, idx) => {
            const Icon = ad.icon

            return (
              <Link
                key={idx}
                href={ad.href}
                className={`aspect-square p-4 sm:p-5 rounded-2xl sm:rounded-3xl border flex flex-col justify-between transition-all duration-200 group active:scale-95 touch-manipulation select-none relative overflow-hidden shadow-sm hover:shadow-lg ${classes.card} hover:border-[#C08552]/40`}
              >
                {/* Glow ambiental en hover */}
                <div
                  className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-25 transition-opacity"
                  style={{ backgroundColor: ad.iconColor || buttonColor }}
                />

                {/* Fila Superior: Ícono estilizado + Badge */}
                <div className="flex items-start justify-between gap-2 relative z-10">
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold shadow-xs transition-transform duration-200 group-hover:scale-105 ${
                      isLight
                        ? 'bg-[#C08552]/10 border border-[#C08552]/20'
                        : 'bg-white/10 border border-white/10'
                    }`}
                    style={{ color: ad.iconColor || buttonColor }}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${classes.badge}`}>
                    {ad.badge}
                  </span>
                </div>

                {/* Fila Inferior: Título y Subtítulo */}
                <div className="relative z-10 pt-2">
                  <div className="flex items-center justify-between gap-1">
                    <h3
                      className={`text-sm sm:text-base font-black tracking-tight truncate ${
                        isLight ? 'text-[#2B1712]' : 'text-white'
                      }`}
                    >
                      {ad.title}
                    </h3>
                    <ArrowRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${classes.textMuted}`} />
                  </div>
                  <p className={`text-[10px] sm:text-[11px] line-clamp-1 mt-0.5 font-medium ${classes.textMuted}`}>
                    {ad.subtitle}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isMultiBranch ? (
          <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
            <div className={`flex items-center justify-between mb-2 font-medium ${classes.textMuted}`}>
              <span className="text-xs">Sucursales Activas</span>
              <Store className="w-4 h-4" style={{ color: buttonColor }} />
            </div>
            <p className={`text-2xl font-extrabold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              {business.branches.length}
            </p>
            <p className={`text-xs mt-1 font-medium ${classes.textSub}`}>Sucursales en operación</p>
          </div>
        ) : (
          <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
            <div className={`flex items-center justify-between mb-2 font-medium ${classes.textMuted}`}>
              <span className="text-xs">Sucursal Principal</span>
              <Store className="w-4 h-4" style={{ color: buttonColor }} />
            </div>
            <p className={`text-xl font-extrabold truncate ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              {activeBranch?.name || business.name}
            </p>
            <p className={`text-xs mt-1 font-medium ${classes.textSub}`}>
              Código: {activeBranch?.code || 'MATRIZ'}
            </p>
          </div>
        )}

        <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
          <div className={`flex items-center justify-between mb-2 font-medium ${classes.textMuted}`}>
            <span className="text-xs">Moneda de Cobro</span>
            <Coffee className="w-4 h-4" style={{ color: buttonColor }} />
          </div>
          <p className={`text-2xl font-extrabold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
            {business.currencyCode}
          </p>
          <p className={`text-xs mt-1 font-medium ${classes.textSub}`}>
            Zona horaria: {business.timezone}
          </p>
        </div>

        <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
          <div className={`flex items-center justify-between mb-2 font-medium ${classes.textMuted}`}>
            <span className="text-xs">Recetario e Insumos</span>
            <Package className="w-4 h-4" style={{ color: buttonColor }} />
          </div>
          <p className={`text-2xl font-extrabold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
            {business.settings?.recipesEnabled ? 'Activo' : 'Inactivo'}
          </p>
          <p className={`text-xs mt-1 font-medium ${classes.textSub}`}>
            Cálculo de insumos por porción
          </p>
        </div>

        <div className={`p-5 rounded-3xl border transition-all ${classes.card}`}>
          <div className={`flex items-center justify-between mb-2 font-medium ${classes.textMuted}`}>
            <span className="text-xs">Servicio en Mesas</span>
            <Users className="w-4 h-4" style={{ color: buttonColor }} />
          </div>
          <p className={`text-2xl font-extrabold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
            {business.settings?.tablesEnabled ? 'Activo' : 'Inactivo'}
          </p>
          <p className={`text-xs mt-1 font-medium ${classes.textSub}`}>
            Control de mesas y consumo
          </p>
        </div>
      </div>

      {/* Multi-Branch Cards - Solo visible si tiene permiso de multisucursal */}
      {isMultiBranch && (
        <div className={`p-6 rounded-3xl border space-y-4 ${classes.card}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-base font-extrabold flex items-center gap-2 ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                <MapPin className="w-4 h-4" style={{ color: buttonColor }} />
                Tus Sucursales
              </h2>
              <p className={`text-xs mt-0.5 font-medium ${classes.textMuted}`}>
                Cada sucursal opera con sus propios almacenes, cajas de cobro y mapa de mesas.
              </p>
            </div>
            <Link
              href="/dashboard/branches"
              style={{ color: buttonColor }}
              className="text-xs font-bold hover:underline transition-colors"
            >
              Administrar sucursales →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {business.branches.map((b: any) => {
              const isCurrent = b.id === activeBranch?.id
              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? isLight
                        ? 'border-[#C08552] bg-white shadow-md ring-1 ring-[#C08552]/30'
                        : 'border-amber-500/60 bg-[#251E1B] shadow-md ring-1 ring-amber-500/30'
                      : classes.subCardHover + ' ' + classes.subCard
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${classes.badge}`}>
                        {b.code}
                      </span>
                      <h3 className={`text-base font-bold mt-1 ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                        {b.name}
                      </h3>
                      <p className={`text-xs ${classes.textMuted}`}>{b.addressLine1 || 'Sin dirección'}</p>
                    </div>

                    {isCurrent ? (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                          isLight
                            ? 'bg-[#C08552]/15 border-[#C08552]/30 text-[#895737]'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Activa
                      </span>
                    ) : (
                      <form action="/api/auth/switch-branch" method="POST">
                        <input type="hidden" name="branch_id" value={b.id} />
                        <button
                          type="submit"
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${classes.buttonGhost}`}
                        >
                          Cambiar a esta
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

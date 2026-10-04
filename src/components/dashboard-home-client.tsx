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
} from 'lucide-react'
import { useDashboardTheme } from '@/context/dashboard-theme-context'
import { getContrastTextColor } from '@/lib/theme-utils'

interface DashboardHomeClientProps {
  sessionName: string
  business: any
  activeBranch: any
  tableCount: number
  isMultiBranch: boolean
}

export default function DashboardHomeClient({
  sessionName,
  business,
  activeBranch,
  tableCount,
  isMultiBranch,
}: DashboardHomeClientProps) {
  const { isLight, primaryColor, secondaryColor, buttonColor, classes } = useDashboardTheme()

  const posTextContrast = getContrastTextColor(buttonColor, '#FFFFFF', '#14100E')
  const comanderaTextContrast = getContrastTextColor(primaryColor, '#FFFFFF', '#14100E')

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-8 w-full transition-all duration-300">
      {/* Welcome Banner con identidad visual reactiva al tema */}
      <div
        className={`rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden backdrop-blur-md ${classes.card}`}
      >
        {/* Glow sutil */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-25"
          style={{
            background: `radial-gradient(circle, ${buttonColor}, ${primaryColor})`,
          }}
        />

        <div className="space-y-2 relative z-10">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
              isLight
                ? 'bg-[#C08552]/15 border-[#C08552]/30 text-[#895737]'
                : 'bg-white/10 border-white/15 text-amber-300'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Panel de Administración
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              isLight ? 'text-[#2B1712]' : 'text-white'
            }`}
          >
            Bienvenido, {sessionName}
          </h1>
          <p className={`text-sm max-w-xl font-medium ${classes.textMuted}`}>
            Control centralizado para gestionar tus sucursales, consultar ventas del día y administrar tu catálogo.
          </p>
        </div>

        {/* Acciones directas con colores dinámicos */}
        <div className="flex flex-wrap gap-2.5 relative z-10">
          <Link
            href="/pos"
            style={{
              backgroundColor: buttonColor,
              color: posTextContrast,
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all hover:opacity-95 shadow-md cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Terminal POS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/comandera"
            style={{
              backgroundColor: primaryColor,
              color: comanderaTextContrast,
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border border-white/10 shadow-md transition-all hover:opacity-95 cursor-pointer"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Comandera</span>
          </Link>

          <Link
            href="/dashboard/reports"
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${classes.buttonGhost}`}
          >
            <BarChart3 className="w-4 h-4" style={{ color: buttonColor }} />
            <span>Ventas y Arqueos</span>
          </Link>
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

      {/* Tarjeta de acceso rápido a Control de Mesas */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-5 ${classes.card}`}
      >
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isLight
                ? 'bg-[#C08552]/15 border-[#C08552]/30'
                : 'bg-white/10 border-white/15'
            }`}
            style={{ color: buttonColor }}
          >
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-extrabold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                Control de Mesas y Meseros
              </h2>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${classes.badge}`}>
                {tableCount} {tableCount === 1 ? 'mesa activa' : 'mesas activas'}
              </span>
            </div>
            <p className={`text-xs mt-1 max-w-2xl leading-relaxed font-medium ${classes.textMuted}`}>
              Gestiona el número de mesas de{' '}
              <strong className={isLight ? 'text-[#2B1712]' : 'text-amber-300'}>
                {activeBranch?.name || business.name}
              </strong>
              , asigna meseros titulares por mesa o habilita el servicio libre donde cualquier colaborador puede tomar comandas.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/tables"
          style={{
            backgroundColor: primaryColor,
            color: comanderaTextContrast,
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all hover:opacity-95 shrink-0 cursor-pointer"
        >
          Gestionar Mesas
          <ArrowRight className="w-4 h-4" />
        </Link>
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

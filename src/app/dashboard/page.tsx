import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
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
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session || !session.businessId) return null

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
    include: {
      settings: true,
      branches: { where: { active: true } },
      subscription: { include: { plan: true } },
    },
  })

  if (!business) return null

  const activeBranch =
    business.branches.find((b) => b.id === session.activeBranchId) || business.branches[0]

  const settings = business.settings
  const isMultiBranch = settings?.multiBranchEnabled !== false
  const primaryColor = activeBranch?.primaryColor || settings?.primaryColor || '#7c3aed'
  const buttonColor = activeBranch?.buttonColor || settings?.accentColor || primaryColor

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-8 w-full transition-all duration-300">
      {/* Welcome Banner con identidad visual del negocio */}
      <div
        className="rounded-3xl border p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}18 0%, rgba(15, 23, 42, 0.7) 100%)`,
          borderColor: `${primaryColor}35`,
        }}
      >
        <div className="space-y-2">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: `${primaryColor}15`,
              borderColor: `${primaryColor}30`,
              color: primaryColor,
            }}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Panel de Administración
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Bienvenido, {session.name}
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Control centralizado para gestionar tus sucursales, consultar ventas del día y administrar tu catálogo.
          </p>
        </div>

        {/* Acciones directas */}
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/pos"
            style={{
              backgroundColor: buttonColor,
              boxShadow: `0 8px 20px -4px ${buttonColor}40`,
            }}
            className="px-4 py-2.5 rounded-xl text-white font-semibold text-xs flex items-center gap-2 transition-all hover:opacity-90 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Terminal POS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/comandera"
            className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700/80 transition-all cursor-pointer"
          >
            <UtensilsCrossed className="w-4 h-4 text-cyan-400" />
            <span>Comandera</span>
          </Link>
          <Link
            href="/dashboard/reports"
            className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700/80 transition-all cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Ventas y Arqueos</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isMultiBranch ? (
          <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Sucursales Activas</span>
              <Store className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <p className="text-2xl font-bold text-white">{business.branches.length}</p>
            <p className="text-xs text-slate-500 mt-1">Sucursales en operación</p>
          </div>
        ) : (
          <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Sucursal Principal</span>
              <Store className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <p className="text-xl font-bold text-white truncate">{activeBranch?.name || business.name}</p>
            <p className="text-xs text-slate-500 mt-1">Código: {activeBranch?.code || 'MATRIZ'}</p>
          </div>
        )}

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Moneda de Cobro</span>
            <Coffee className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{business.currencyCode}</p>
          <p className="text-xs text-slate-500 mt-1">Zona horaria: {business.timezone}</p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Recetario e Insumos</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {business.settings?.recipesEnabled ? 'Activo' : 'Inactivo'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Cálculo de insumos por porción</p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Servicio en Mesas</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400">
            {business.settings?.tablesEnabled ? 'Activo' : 'Inactivo'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Control de mesas y consumo</p>
        </div>
      </div>

      {/* Multi-Branch Cards - Solo visible si tiene permiso de multisucursal */}
      {isMultiBranch && (
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: primaryColor }} />
                Tus Sucursales
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cada sucursal opera con sus propios almacenes, cajas de cobro y mapa de mesas.
              </p>
            </div>
            <Link
              href="/dashboard/branches"
              className="text-xs font-medium transition-colors"
              style={{ color: primaryColor }}
            >
              Administrar sucursales →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {business.branches.map((b) => {
              const isCurrent = b.id === activeBranch?.id
              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'shadow-md'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                  style={
                    isCurrent
                      ? {
                          borderColor: `${primaryColor}60`,
                          backgroundColor: `${primaryColor}0d`,
                          boxShadow: `0 4px 20px -2px ${primaryColor}20`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {b.code}
                      </span>
                      <h3 className="text-base font-semibold text-white mt-1">{b.name}</h3>
                      <p className="text-xs text-slate-400">{b.addressLine1 || 'Sin dirección'}</p>
                    </div>

                    {isCurrent ? (
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${primaryColor}20`,
                          color: primaryColor,
                        }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Activa
                      </span>
                    ) : (
                      <form action="/api/auth/switch-branch" method="POST">
                        <input type="hidden" name="branch_id" value={b.id} />
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer"
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

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Coffee,
  Store,
  MapPin,
  Package,
  BarChart3,
  UtensilsCrossed,
  MonitorPlay,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
  CreditCard,
  Users,
  Truck,
  Boxes,
  LayoutGrid,
} from 'lucide-react'

interface DashboardSidebarProps {
  business: {
    id: string
    name: string
    businessType: string
    subscription?: { plan: { name: string } } | null
    branches: Array<{ id: string; name: string; code: string }>
    settings?: {
      logoUrl?: string | null
      primaryColor?: string | null
      secondaryColor?: string | null
      accentColor?: string | null
      multiBranchEnabled?: boolean
      canCustomizeColors?: boolean
      recipesEnabled?: boolean
      tablesEnabled?: boolean
      waitersEnabled?: boolean
      kitchenEnabled?: boolean
      cashRegisterEnabled?: boolean
      inventoryEnabled?: boolean
      digitalMenuEnabled?: boolean
      purchasesEnabled?: boolean
      expensesEnabled?: boolean
      displaysEnabled?: boolean
      discountsEnabled?: boolean
      courtesiesEnabled?: boolean
      negativeStockEnabled?: boolean
      darkMode?: boolean
    } | null
  }
  user: {
    name: string
    roleCodes: string[]
    permissions?: {
      canAccessPOS?: boolean
      canManageCatalog?: boolean
      canManageInventory?: boolean
      canManagePurchases?: boolean
      canManageExpenses?: boolean
      canManageCashRegisters?: boolean
      canViewReports?: boolean
      canManageUsers?: boolean
      canManageSettings?: boolean
      canAuthorizeDiscounts?: boolean
      canAuthorizeCourtesies?: boolean
      canAuthorizeCancellations?: boolean
      canTransferTables?: boolean
    }
  }
  activeBranchId?: string
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function DashboardSidebar({
  business,
  user,
  activeBranchId,
  collapsed,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Cerrar drawer móvil al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const activeBranch =
    business.branches.find((b) => b.id === activeBranchId) || business.branches[0]

  const settings = business.settings || {}
  const primaryColor = settings.primaryColor || '#7c3aed'
  const secondaryColor = settings.secondaryColor || '#4f46e5'
  const accentColor = settings.accentColor || '#f59e0b'

  interface NavItem {
    name: string
    href: string
    icon: any
    active: boolean
    enabled?: boolean
    highlight?: boolean
  }

  const isOwnerOrAdmin =
    user.roleCodes.includes('ADMIN') ||
    user.roleCodes.includes('SUPERADMIN') ||
    user.roleCodes.includes('BRANCH_MANAGER')

  const perms = user.permissions || {
    canAccessPOS: false,
    canManageCatalog: false,
    canManageInventory: false,
    canManagePurchases: false,
    canManageExpenses: false,
    canManageCashRegisters: false,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canAuthorizeDiscounts: false,
    canAuthorizeCourtesies: false,
    canAuthorizeCancellations: false,
    canTransferTables: false,
  }

  // Items de Operación Diaria dinámicos según módulos habilitados y permisos
  const operationItems: NavItem[] = [
    {
      name: 'Panel General',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
      enabled:
        isOwnerOrAdmin ||
        perms.canViewReports ||
        perms.canManageUsers ||
        perms.canManageCatalog ||
        perms.canManageSettings ||
        perms.canManageInventory,
    },
    {
      name: 'Terminal POS (Caja)',
      href: '/pos',
      icon: CreditCard,
      active: pathname === '/pos',
      highlight: true,
      enabled:
        (isOwnerOrAdmin || perms.canAccessPOS || perms.canManageCashRegisters || user.roleCodes.includes('CASHIER')) &&
        (settings.cashRegisterEnabled ?? true),
    },
    {
      name: 'Comandera de Mesas',
      href: '/comandera',
      icon: UtensilsCrossed,
      active: pathname === '/comandera',
      highlight: user.roleCodes.includes('WAITER'),
      enabled:
        (isOwnerOrAdmin || user.roleCodes.includes('WAITER') || perms.canAccessPOS) &&
        (settings.tablesEnabled ?? true),
    },
    {
      name: 'Monitor KDS Cocina',
      href: '/kds',
      icon: MonitorPlay,
      active: pathname === '/kds',
      enabled:
        (isOwnerOrAdmin ||
          user.roleCodes.includes('CHEF') ||
          user.roleCodes.includes('KITCHEN') ||
          perms.canManageInventory) &&
        (settings.kitchenEnabled ?? false),
    },
  ].filter((item) => item.enabled)

  // Items de Administración ordenados según el flujo lógico de insumos -> compras -> recetas -> operación
  const adminItems: NavItem[] = [
    {
      name: 'Inventario de Insumos',
      href: '/dashboard/inventory',
      icon: Boxes,
      active: pathname.startsWith('/dashboard/inventory'),
      enabled:
        (isOwnerOrAdmin || perms.canManageInventory) &&
        (settings.inventoryEnabled ?? true),
    },
    {
      name: 'Compras',
      href: '/dashboard/purchases',
      icon: Truck,
      active: pathname.startsWith('/dashboard/purchases'),
      enabled:
        (isOwnerOrAdmin || perms.canManagePurchases || perms.canManageInventory) &&
        (settings.purchasesEnabled ?? true),
    },
    {
      name: settings.recipesEnabled !== false ? 'Catálogo y Recetas' : 'Catálogo de Productos',
      href: '/dashboard/catalog',
      icon: Package,
      active: pathname.startsWith('/dashboard/catalog'),
      enabled: isOwnerOrAdmin || perms.canManageCatalog,
    },
    {
      name: 'Control de Mesas',
      href: '/dashboard/tables',
      icon: LayoutGrid,
      active: pathname.startsWith('/dashboard/tables'),
      enabled:
        (isOwnerOrAdmin || perms.canManageSettings || perms.canTransferTables || perms.canAccessPOS) &&
        (settings.tablesEnabled ?? true),
    },
    {
      name: 'Personal y Roles',
      href: '/dashboard/users',
      icon: Users,
      active: pathname.startsWith('/dashboard/users'),
      enabled: isOwnerOrAdmin || perms.canManageUsers,
    },
    {
      name: settings.cashRegisterEnabled !== false ? 'Reportes y Arqueos' : 'Reportes de Ventas',
      href: '/dashboard/reports',
      icon: BarChart3,
      active: pathname.startsWith('/dashboard/reports'),
      enabled: isOwnerOrAdmin || perms.canViewReports || perms.canManageCashRegisters,
    },
    {
      name: 'Gestión de Sucursales',
      href: '/dashboard/branches',
      icon: Store,
      active: pathname.startsWith('/dashboard/branches'),
      enabled: (isOwnerOrAdmin || perms.canManageSettings) && settings.multiBranchEnabled !== false,
    },
  ].filter((item) => item.enabled)

  const navLinks = [
    ...(operationItems.length > 0
      ? [
          {
            group: 'Operación Diaria',
            items: operationItems,
          },
        ]
      : []),
    ...(adminItems.length > 0
      ? [
          {
            group: 'Administración',
            items: adminItems,
          },
        ]
      : []),
  ]

  return (
    <>
      {/* Botón flotante para abrir menú en móviles */}
      <div className="lg:hidden fixed top-3 left-3 z-40">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-lg cursor-pointer"
          title="Menú de Navegación"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Overlay para móviles */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-xs"
        />
      )}

      {/* Barra Lateral (Sidebar) con transición fluida */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-slate-900/95 border-r border-slate-800 flex flex-col transition-all duration-300 backdrop-blur-md ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Cabecera del Sidebar */}
        <div
          className={`border-b border-slate-800 shrink-0 ${
            collapsed
              ? 'p-2.5 flex flex-col items-center gap-2'
              : 'p-4 flex items-center justify-between'
          }`}
        >
          <div
            className={`flex items-center gap-3 overflow-hidden ${
              collapsed ? 'justify-center w-full' : ''
            }`}
          >
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={business.name}
                className="w-10 h-10 rounded-2xl object-contain bg-slate-950 border border-slate-800 p-1 shrink-0 shadow-md aspect-square"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0 text-white font-bold aspect-square"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                <Coffee className="w-5 h-5 text-white" />
              </div>
            )}

            {!collapsed && (
              <div className="overflow-hidden">
                <h2 className="font-bold text-sm text-white truncate">{business.name}</h2>
                <span className="text-[11px] text-slate-400 block truncate capitalize">
                  {business.businessType === 'CAFE'
                    ? 'Cafetería'
                    : business.businessType === 'RESTAURANT'
                    ? 'Restaurante'
                    : business.businessType === 'BAR'
                    ? 'Bar'
                    : 'Punto de Venta'}
                </span>
              </div>
            )}
          </div>

          {/* Botón Colapsar / Expandir (Escritorio) */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden lg:flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer ${
              collapsed ? 'w-8 h-7 justify-center items-center' : ''
            }`}
            title={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Sucursal Activa Pill */}
        {!collapsed && activeBranch && (
          <div className="p-3 mx-3 my-2 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-500 block uppercase">Sucursal</span>
                <strong className="text-white text-xs truncate block">{activeBranch.name}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Enlaces de Navegación */}
        <div className="flex-1 p-3 space-y-5 overflow-y-auto">
          {navLinks.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!collapsed && (
                <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {group.group}
                </span>
              )}

              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all group ${
                      item.active
                        ? 'text-white shadow-md font-bold'
                        : item.highlight
                        ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                    style={
                      item.active
                        ? {
                            backgroundColor: primaryColor,
                            boxShadow: `0 4px 14px 0 ${primaryColor}40`,
                          }
                        : undefined
                    }
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        item.active
                          ? 'text-white'
                          : item.highlight
                          ? 'text-amber-400'
                          : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Pie del Sidebar: Usuario y Cerrar Sesión */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0 space-y-2">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="overflow-hidden">
                <strong className="text-xs text-white block truncate">{user.name}</strong>
                <span className="text-[10px] text-slate-400 block truncate">
                  {user.roleCodes.join(', ')}
                </span>
              </div>

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/80 transition-all cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex justify-center">
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/80 transition-all cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

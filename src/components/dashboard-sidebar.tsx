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
  Palette,
  Receipt,
} from 'lucide-react'

interface DashboardSidebarProps {
  business: {
    id: string
    name: string
    businessType: string
    subscription?: { plan: { name: string } } | null
    branches: Array<{
      id: string
      name: string
      code: string
      bgColor?: string | null
      primaryColor?: string | null
      secondaryColor?: string | null
      buttonColor?: string | null
      logoUrl?: string | null
      isotypeUrl?: string | null
      sidebarTheme?: string | null
      modules?: Record<string, boolean> | null
    }>
    settings?: {
      logoUrl?: string | null
      isotypeUrl?: string | null
      sidebarTheme?: string | null
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
    permissionCodes?: string[]
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
      canAccessKDS?: boolean
      canManageKitchen?: boolean
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

  // Bloquear scroll del fondo cuando el drawer móvil está abierto (evitar scroll bleed)
  useEffect(() => {
    if (mobileOpen) {
      const originalBodyOverflow = document.body.style.overflow
      const originalBodyOverscroll = document.body.style.overscrollBehavior
      const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior

      document.body.style.overflow = 'hidden'
      document.body.style.overscrollBehavior = 'none'
      document.documentElement.style.overscrollBehavior = 'none'

      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.body.style.overscrollBehavior = originalBodyOverscroll
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll
      }
    }
  }, [mobileOpen])

  const activeBranch =
    business.branches.find((b) => b.id === activeBranchId) || business.branches[0]

  const settings = business.settings || {}
  const primaryColor = activeBranch?.primaryColor || settings.primaryColor || '#C08552'
  const secondaryColor = activeBranch?.secondaryColor || settings.secondaryColor || '#5E3023'
  const logoUrl = activeBranch?.logoUrl || settings.logoUrl
  const isotypeUrl = activeBranch?.isotypeUrl || settings.isotypeUrl
  const rawSidebarTheme = (activeBranch?.sidebarTheme || settings.sidebarTheme || 'DARK').trim()
  const sidebarTheme = rawSidebarTheme.startsWith('#') ? rawSidebarTheme.toUpperCase() : rawSidebarTheme.toUpperCase()

  const isColorLight = (hex: string): boolean => {
    try {
      const clean = hex.replace('#', '')
      const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
      if (full.length !== 6) return false
      const r = parseInt(full.substring(0, 2), 16) / 255
      const g = parseInt(full.substring(2, 4), 16) / 255
      const b = parseInt(full.substring(4, 6), 16) / 255
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      return lum > 0.65
    } catch {
      return false
    }
  }

  const isLight = sidebarTheme === 'LIGHT'
  const isWhite = sidebarTheme === 'WHITE'
  const isCoffee = sidebarTheme === 'COFFEE'
  const isEmerald = sidebarTheme === 'EMERALD'
  const isNavy = sidebarTheme === 'NAVY'
  const isBurgundy = sidebarTheme === 'BURGUNDY'
  const isCharcoal = sidebarTheme === 'CHARCOAL'
  const isAmber = sidebarTheme === 'AMBER'
  const isTeal = sidebarTheme === 'TEAL'
  const isPurple = sidebarTheme === 'PURPLE'
  const isSlate = sidebarTheme === 'SLATE'
  const isForest = sidebarTheme === 'FOREST'
  const isRose = sidebarTheme === 'ROSE'
  const isChocolate = sidebarTheme === 'CHOCOLATE'
  const isMidnight = sidebarTheme === 'MIDNIGHT'
  const isHex = sidebarTheme.startsWith('#')
  const isCustomLight = isHex && isColorLight(sidebarTheme)
  const isLightMode = isLight || isWhite || isCustomLight

  // Estilos de acuerdo al tema del sidebar configurado
  const asideBgClass = isHex
    ? isCustomLight
      ? 'border-r border-slate-300 text-slate-800'
      : 'border-r border-white/10 text-[#F3E9DC]'
    : isWhite
    ? 'bg-white border-r border-slate-200 text-slate-800'
    : isLight
    ? 'bg-[#FDFBF9]/98 border-r border-[#EAD8C7] text-[#3D1E16]'
    : isCoffee
    ? 'bg-[#2B1712]/98 border-r border-[#42221A] text-[#F3E9DC]'
    : isEmerald
    ? 'bg-[#0C1E17]/98 border-r border-[#153428] text-[#E2F2EB]'
    : isNavy
    ? 'bg-[#0B1524]/98 border-r border-[#162740] text-[#E0EBF7]'
    : isBurgundy
    ? 'bg-[#1F0C16]/98 border-r border-[#381628] text-[#F8E3EE]'
    : isCharcoal
    ? 'bg-[#15181C]/98 border-r border-[#262B32] text-[#E6EAF0]'
    : isAmber
    ? 'bg-[#1C1308]/98 border-r border-[#3B2610] text-[#FDE68A]'
    : isTeal
    ? 'bg-[#071719]/98 border-r border-[#133237] text-[#CCFBF1]'
    : isPurple
    ? 'bg-[#150A21]/98 border-r border-[#2D1645] text-[#F3E8FF]'
    : isSlate
    ? 'bg-[#0B1120]/98 border-r border-[#1E293B] text-[#E2E8F0]'
    : isForest
    ? 'bg-[#08150C]/98 border-r border-[#142F1C] text-[#DCFCE7]'
    : isRose
    ? 'bg-[#1C0D15]/98 border-r border-[#381A2A] text-[#FFE4E6]'
    : isChocolate
    ? 'bg-[#20120B]/98 border-r border-[#3A2013] text-[#FBE7DB]'
    : isMidnight
    ? 'bg-[#090A0D]/98 border-r border-[#1E2026] text-[#F8FAFC]'
    : 'bg-[#14100E]/98 border-r border-[#2D1B15] text-[#F3E9DC]'

  const headerBorderClass = isHex
    ? isCustomLight
      ? 'border-slate-300'
      : 'border-white/10'
    : isWhite
    ? 'border-slate-200'
    : isLight
    ? 'border-[#EAD8C7]'
    : isCoffee
    ? 'border-[#42221A]'
    : isEmerald
    ? 'border-[#153428]'
    : isNavy
    ? 'border-[#162740]'
    : isBurgundy
    ? 'border-[#381628]'
    : isCharcoal
    ? 'border-[#262B32]'
    : isAmber
    ? 'border-[#3B2610]'
    : isTeal
    ? 'border-[#133237]'
    : isPurple
    ? 'border-[#2D1645]'
    : isSlate
    ? 'border-[#1E293B]'
    : isForest
    ? 'border-[#142F1C]'
    : isRose
    ? 'border-[#381A2A]'
    : isChocolate
    ? 'border-[#3A2013]'
    : isMidnight
    ? 'border-[#1E2026]'
    : 'border-[#2D1B15]'

  const headingTextClass = isHex
    ? isCustomLight
      ? 'text-slate-900'
      : 'text-white'
    : isWhite
    ? 'text-slate-900'
    : isLight
    ? 'text-[#3D1E16]'
    : isEmerald
    ? 'text-[#E2F2EB]'
    : isNavy
    ? 'text-[#E0EBF7]'
    : isBurgundy
    ? 'text-[#F8E3EE]'
    : isCharcoal
    ? 'text-[#E6EAF0]'
    : isAmber
    ? 'text-[#FDE68A]'
    : isTeal
    ? 'text-[#CCFBF1]'
    : isPurple
    ? 'text-[#F3E8FF]'
    : isSlate
    ? 'text-[#E2E8F0]'
    : isForest
    ? 'text-[#DCFCE7]'
    : isRose
    ? 'text-[#FFE4E6]'
    : isChocolate
    ? 'text-[#FBE7DB]'
    : isMidnight
    ? 'text-[#F8FAFC]'
    : 'text-[#F3E9DC]'

  const mutedTextClass = isHex
    ? isCustomLight
      ? 'text-slate-600'
      : 'text-white/60'
    : isWhite
    ? 'text-slate-500'
    : isLight
    ? 'text-[#8C6D58]'
    : isCoffee
    ? 'text-[#DECEBD]'
    : isEmerald
    ? 'text-[#8EBEA9]'
    : isNavy
    ? 'text-[#8BA7C9]'
    : isBurgundy
    ? 'text-[#C48FA9]'
    : isCharcoal
    ? 'text-[#9AA2B0]'
    : isAmber
    ? 'text-[#C9974B]'
    : isTeal
    ? 'text-[#5EEAD4]'
    : isPurple
    ? 'text-[#C084FC]'
    : isSlate
    ? 'text-[#94A3B8]'
    : isForest
    ? 'text-[#86EFAC]'
    : isRose
    ? 'text-[#FDA4AF]'
    : isChocolate
    ? 'text-[#D97706]'
    : isMidnight
    ? 'text-[#94A3B8]'
    : 'text-[#A88C7D]'

  const toggleBtnClass = isHex
    ? isCustomLight
      ? 'bg-black/5 hover:bg-black/10 text-slate-800 border border-black/10'
      : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
    : isWhite
    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
    : isLight
    ? 'bg-[#F3E9DC] hover:bg-[#E6D5C3] text-[#5E3023] border border-[#DECEBD]'
    : isCoffee
    ? 'bg-[#3D1E16] hover:bg-[#4A261D] text-[#DECEBD] border border-[#42221A]'
    : isEmerald
    ? 'bg-[#132E23] hover:bg-[#1A3D2F] text-[#C1E4D6] border border-[#1E4837]'
    : isNavy
    ? 'bg-[#122035] hover:bg-[#1A2C49] text-[#BED5F0] border border-[#1B3050]'
    : isBurgundy
    ? 'bg-[#2D1221] hover:bg-[#3D1A2E] text-[#E8BBD2] border border-[#481D34]'
    : isCharcoal
    ? 'bg-[#1F2329] hover:bg-[#2A3038] text-[#D0D6E0] border border-[#2F353E]'
    : isAmber
    ? 'bg-[#2B1D0C] hover:bg-[#3D2912] text-[#FDE68A] border border-[#3B2610]'
    : isTeal
    ? 'bg-[#0E2327] hover:bg-[#15343A] text-[#CCFBF1] border border-[#133237]'
    : isPurple
    ? 'bg-[#231236] hover:bg-[#321A4D] text-[#F3E8FF] border border-[#2D1645]'
    : isSlate
    ? 'bg-[#162238] hover:bg-[#1F304E] text-[#E2E8F0] border border-[#1E293B]'
    : isForest
    ? 'bg-[#102616] hover:bg-[#163820] text-[#DCFCE7] border border-[#142F1C]'
    : isRose
    ? 'bg-[#2B1420] hover:bg-[#3D1D2E] text-[#FFE4E6] border border-[#381A2A]'
    : isChocolate
    ? 'bg-[#2C180E] hover:bg-[#3D2214] text-[#FBE7DB] border border-[#3A2013]'
    : isMidnight
    ? 'bg-[#14161C] hover:bg-[#1D2029] text-[#F8FAFC] border border-[#1E2026]'
    : 'bg-[#231713] hover:bg-[#331C14] text-[#DECEBD] border border-[#2D1B15]'

  const branchPillClass = isHex
    ? isCustomLight
      ? 'bg-black/5 border-black/10'
      : 'bg-black/30 border-white/10'
    : isWhite
    ? 'bg-slate-100/80 border-slate-200'
    : isLight
    ? 'bg-[#F3E9DC]/80 border-[#DECEBD]'
    : isCoffee
    ? 'bg-[#1E100D]/80 border-[#42221A]'
    : isEmerald
    ? 'bg-[#081510] border-[#153428]'
    : isNavy
    ? 'bg-[#060D18] border-[#162740]'
    : isBurgundy
    ? 'bg-[#14060E] border-[#381628]'
    : isCharcoal
    ? 'bg-[#0D0F12] border-[#262B32]'
    : isAmber
    ? 'bg-[#120B04] border-[#3B2610]'
    : isTeal
    ? 'bg-[#040E0F] border-[#133237]'
    : isPurple
    ? 'bg-[#0C0514] border-[#2D1645]'
    : isSlate
    ? 'bg-[#060A14] border-[#1E293B]'
    : isForest
    ? 'bg-[#040C07] border-[#142F1C]'
    : isRose
    ? 'bg-[#12070D] border-[#381A2A]'
    : isChocolate
    ? 'bg-[#140A06] border-[#3A2013]'
    : isMidnight
    ? 'bg-[#050608] border-[#1E2026]'
    : 'bg-[#1E100D] border-[#2D1B15]'

  const navItemInactiveClass = isHex
    ? isCustomLight
      ? 'text-slate-700 hover:bg-black/5 hover:text-slate-900'
      : 'text-white/80 hover:bg-white/10 hover:text-white'
    : isWhite
    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    : isLight
    ? 'text-[#5E3023] hover:bg-[#F3E9DC] hover:text-[#2B1712]'
    : isCoffee
    ? 'text-[#DECEBD] hover:bg-[#3D1E16] hover:text-[#F3E9DC]'
    : isEmerald
    ? 'text-[#A9D7C4] hover:bg-[#132E23] hover:text-white'
    : isNavy
    ? 'text-[#A5C3E5] hover:bg-[#122035] hover:text-white'
    : isBurgundy
    ? 'text-[#DCADC5] hover:bg-[#2D1221] hover:text-white'
    : isCharcoal
    ? 'text-[#BAC2CE] hover:bg-[#1F2329] hover:text-white'
    : isAmber
    ? 'text-[#FDE68A]/80 hover:bg-[#2B1D0C] hover:text-[#FDE68A]'
    : isTeal
    ? 'text-[#CCFBF1]/80 hover:bg-[#0E2327] hover:text-white'
    : isPurple
    ? 'text-[#F3E8FF]/80 hover:bg-[#231236] hover:text-white'
    : isSlate
    ? 'text-[#E2E8F0]/80 hover:bg-[#162238] hover:text-white'
    : isForest
    ? 'text-[#DCFCE7]/80 hover:bg-[#102616] hover:text-white'
    : isRose
    ? 'text-[#FFE4E6]/80 hover:bg-[#2B1420] hover:text-white'
    : isChocolate
    ? 'text-[#FBE7DB]/80 hover:bg-[#2C180E] hover:text-white'
    : isMidnight
    ? 'text-[#F8FAFC]/80 hover:bg-[#14161C] hover:text-white'
    : 'text-[#DECEBD] hover:bg-[#231713] hover:text-[#F3E9DC]'

  const navItemHighlightClass = isLightMode
    ? 'bg-[#C08552]/15 text-[#5E3023] hover:bg-[#C08552]/25 border border-[#C08552]/30'
    : 'bg-[#C08552]/20 text-[#F3E9DC] hover:bg-[#C08552]/30 border border-[#C08552]/40'

  const footerBgClass = isHex
    ? isCustomLight
      ? 'border-t border-slate-300 bg-black/5'
      : 'border-t border-white/10 bg-black/25'
    : isWhite
    ? 'border-t border-slate-200 bg-slate-50/80'
    : isLight
    ? 'border-t border-[#EAD8C7] bg-[#F7F2ED]/90'
    : isCoffee
    ? 'border-t border-[#42221A] bg-[#1E100D]/70'
    : isEmerald
    ? 'border-t border-[#153428] bg-[#07130F]/90'
    : isNavy
    ? 'border-t border-[#162740] bg-[#050C16]/90'
    : isBurgundy
    ? 'border-t border-[#381628] bg-[#12050D]/90'
    : isCharcoal
    ? 'border-t border-[#262B32] bg-[#0C0E10]/90'
    : isAmber
    ? 'border-t border-[#3B2610] bg-[#120B04]/90'
    : isTeal
    ? 'border-t border-[#133237] bg-[#040E0F]/90'
    : isPurple
    ? 'border-t border-[#2D1645] bg-[#0C0514]/90'
    : isSlate
    ? 'border-t border-[#1E293B] bg-[#060A14]/90'
    : isForest
    ? 'border-t border-[#142F1C] bg-[#040C07]/90'
    : isRose
    ? 'border-t border-[#381A2A] bg-[#12070D]/90'
    : isChocolate
    ? 'border-t border-[#3A2013] bg-[#140A06]/90'
    : isMidnight
    ? 'border-t border-[#1E2026] bg-[#050608]/90'
    : 'border-t border-[#2D1B15] bg-[#0E0B0A]/90'

  const footerLogoutBtnClass = isHex
    ? isCustomLight
      ? 'bg-black/5 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-black/10'
      : 'bg-white/10 hover:bg-rose-500/20 text-white/80 hover:text-rose-300 border border-white/15'
    : isWhite
    ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200'
    : isLight
    ? 'bg-[#F3E9DC] hover:bg-rose-50 text-[#8C6D58] hover:text-rose-600 border border-[#DECEBD]'
    : isCoffee
    ? 'bg-[#3D1E16] hover:bg-rose-500/20 text-[#DECEBD] hover:text-rose-300 border border-[#42221A]'
    : isEmerald
    ? 'bg-[#132E23] hover:bg-rose-500/20 text-[#A9D7C4] hover:text-rose-300 border border-[#1E4837]'
    : isNavy
    ? 'bg-[#122035] hover:bg-rose-500/20 text-[#A5C3E5] hover:text-rose-300 border border-[#1B3050]'
    : isBurgundy
    ? 'bg-[#2D1221] hover:bg-rose-500/20 text-[#DCADC5] hover:text-rose-300 border border-[#422214]'
    : isCharcoal
    ? 'bg-[#1F2329] hover:bg-rose-500/20 text-[#BAC2CE] hover:text-rose-300 border border-[#2F353E]'
    : isAmber
    ? 'bg-[#2B1D0C] hover:bg-rose-500/20 text-[#FDE68A] hover:text-rose-300 border border-[#3B2610]'
    : isTeal
    ? 'bg-[#0E2327] hover:bg-rose-500/20 text-[#CCFBF1] hover:text-rose-300 border border-[#133237]'
    : isPurple
    ? 'bg-[#231236] hover:bg-rose-500/20 text-[#F3E8FF] hover:text-rose-300 border border-[#2D1645]'
    : isSlate
    ? 'bg-[#162238] hover:bg-rose-500/20 text-[#E2E8F0] hover:text-rose-300 border border-[#1E293B]'
    : isForest
    ? 'bg-[#102616] hover:bg-rose-500/20 text-[#DCFCE7] hover:text-rose-300 border border-[#142F1C]'
    : isRose
    ? 'bg-[#2B1420] hover:bg-rose-500/20 text-[#FFE4E6] hover:text-rose-300 border border-[#381A2A]'
    : isChocolate
    ? 'bg-[#2C180E] hover:bg-rose-500/20 text-[#FBE7DB] hover:text-rose-300 border border-[#3A2013]'
    : isMidnight
    ? 'bg-[#14161C] hover:bg-rose-500/20 text-[#F8FAFC] hover:text-rose-300 border border-[#1E2026]'
    : 'bg-[#231713] hover:bg-rose-500/20 text-[#DECEBD] hover:text-rose-300 border border-[#2D1B15]'

  const mobileBtnClass = isHex
    ? isCustomLight
      ? 'border-slate-300 text-slate-800'
      : 'border-white/15 text-white'
    : isWhite
    ? 'bg-white border-slate-200 text-slate-800'
    : isLight
    ? 'bg-[#FDFBF9] border-[#EAD8C7] text-[#3D1E16]'
    : isCoffee
    ? 'bg-[#2B1712] border-[#42221A] text-[#F3E9DC]'
    : isEmerald
    ? 'bg-[#0C1E17] border-[#153428] text-[#E2F2EB]'
    : isNavy
    ? 'bg-[#0B1524] border-[#162740] text-[#E0EBF7]'
    : isBurgundy
    ? 'bg-[#1F0C16] border-[#381628] text-[#F8E3EE]'
    : isCharcoal
    ? 'bg-[#15181C] border-[#262B32] text-[#E6EAF0]'
    : isAmber
    ? 'bg-[#1C1308] border-[#3B2610] text-[#FDE68A]'
    : isTeal
    ? 'bg-[#071719] border-[#133237] text-[#CCFBF1]'
    : isPurple
    ? 'bg-[#150A21] border-[#2D1645] text-[#F3E8FF]'
    : isSlate
    ? 'bg-[#0B1120] border-[#1E293B] text-[#E2E8F0]'
    : isForest
    ? 'bg-[#08150C] border-[#142F1C] text-[#DCFCE7]'
    : isRose
    ? 'bg-[#1C0D15] border-[#381A2A] text-[#FFE4E6]'
    : isChocolate
    ? 'bg-[#20120B] border-[#3A2013] text-[#FBE7DB]'
    : isMidnight
    ? 'bg-[#090A0D] border-[#1E2026] text-[#F8FAFC]'
    : 'bg-[#14100E] border-[#2D1B15] text-[#F3E9DC]'

  interface NavItem {
    name: string
    href: string
    icon: any
    active: boolean
    enabled?: boolean
    highlight?: boolean
  }

  const isSuperAdmin = user.roleCodes.includes('SUPERADMIN')
  const userPermCodes = new Set(user.permissionCodes || [])

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
    canAccessKDS: false,
    canManageKitchen: false,
  }

  // Verificación de módulos habilitados por sucursal física:
  // Si la sucursal activa tiene una configuración explícita para este módulo, esta rige su visibilidad.
  // De lo contrario, se adopta el valor de settings global del negocio.
  const branchModules = (activeBranch as any)?.modules || null
  const isBranchModuleEnabled = (moduleKey: string, fallbackSetting: boolean = true): boolean => {
    if (branchModules && typeof branchModules[moduleKey] === 'boolean') {
      return branchModules[moduleKey]
    }
    return fallbackSetting
  }

  // Verificación de permiso granular: SuperAdmin tiene acceso total a todos los módulos.
  // Para los demás puestos (incluyendo administradores de sucursal), cada apartado se muestra
  // acorde a los permisos específicos asignados a su puesto en Recursos Humanos.
  const hasPerm = (code: string, legacyFlag?: boolean): boolean => {
    if (isSuperAdmin) return true
    if (userPermCodes.has(code)) return true
    if (legacyFlag === true) return true
    return false
  }

  // Items de Operación Diaria dinámicos según módulos habilitados por sucursal y permisos
  const operationItems: NavItem[] = [
    {
      name: 'Panel General',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
      enabled:
        isBranchModuleEnabled('dashboard', true) &&
        (isSuperAdmin ||
          hasPerm('acceso_dashboard') ||
          hasPerm('ver_reportes', perms.canViewReports) ||
          hasPerm('gestionar_personal', perms.canManageUsers) ||
          hasPerm('gestionar_catalogo', perms.canManageCatalog) ||
          hasPerm('gestionar_configuracion', perms.canManageSettings) ||
          hasPerm('gestionar_inventario', perms.canManageInventory)),
    },
    {
      name: 'Terminal POS (Caja)',
      href: '/pos',
      icon: CreditCard,
      active: pathname === '/pos',
      highlight: true,
      enabled:
        isBranchModuleEnabled('pos', settings.cashRegisterEnabled ?? true) &&
        (isSuperAdmin ||
          hasPerm('acceso_pos', perms.canAccessPOS) ||
          hasPerm('gestionar_cajas', perms.canManageCashRegisters) ||
          user.roleCodes.includes('CASHIER')),
    },
    {
      name: 'Comandera de Mesas',
      href: '/comandera',
      icon: UtensilsCrossed,
      active: pathname === '/comandera',
      highlight: user.roleCodes.includes('WAITER'),
      enabled:
        isBranchModuleEnabled('comandera', settings.tablesEnabled ?? true) &&
        (isSuperAdmin ||
          hasPerm('acceso_comandera', perms.canAccessPOS) ||
          hasPerm('traspaso_mesas', perms.canTransferTables) ||
          user.roleCodes.includes('WAITER')),
    },
    {
      name: 'Monitor KDS Cocina',
      href: '/kds',
      icon: MonitorPlay,
      active: pathname === '/kds',
      enabled:
        isBranchModuleEnabled('kds', settings.kitchenEnabled ?? true) &&
        (isSuperAdmin ||
          hasPerm('acceso_kds', perms.canAccessKDS) ||
          hasPerm('gestionar_cocina', perms.canManageKitchen) ||
          user.roleCodes.includes('CHEF') ||
          user.roleCodes.includes('KITCHEN') ||
          user.roleCodes.includes('BARISTA')),
    },
  ].filter((item) => item.enabled)

  // Items de Administración ordenados según el flujo lógico:
  // Controlados por módulo asignado a la sucursal y permiso individual
  const adminItems: NavItem[] = [
    {
      name: 'Inventario de Insumos',
      href: '/dashboard/inventory',
      icon: Boxes,
      active: pathname.startsWith('/dashboard/inventory'),
      enabled:
        isBranchModuleEnabled('inventory', settings.inventoryEnabled ?? true) &&
        (isSuperAdmin || hasPerm('gestionar_inventario', perms.canManageInventory)),
    },
    {
      name: 'Compras',
      href: '/dashboard/purchases',
      icon: Truck,
      active: pathname.startsWith('/dashboard/purchases'),
      enabled:
        isBranchModuleEnabled('purchases', settings.purchasesEnabled ?? true) &&
        (isSuperAdmin || hasPerm('gestionar_compras', perms.canManagePurchases)),
    },
    {
      name: 'Gastos Operativos',
      href: '/dashboard/expenses',
      icon: Receipt,
      active: pathname.startsWith('/dashboard/expenses'),
      enabled:
        isBranchModuleEnabled('expenses', settings.expensesEnabled ?? true) &&
        (isSuperAdmin || hasPerm('gestionar_gastos', perms.canManageExpenses)),
    },
    {
      name: settings.recipesEnabled !== false ? 'Catálogo y Recetas' : 'Catálogo de Productos',
      href: '/dashboard/catalog',
      icon: Package,
      active: pathname.startsWith('/dashboard/catalog'),
      enabled:
        isBranchModuleEnabled('catalog', true) &&
        (isSuperAdmin || hasPerm('gestionar_catalogo', perms.canManageCatalog)),
    },
    {
      name: 'Áreas de Cocina',
      href: '/dashboard/kitchen-stations',
      icon: UtensilsCrossed,
      active: pathname.startsWith('/dashboard/kitchen-stations'),
      enabled:
        isBranchModuleEnabled('kitchenStations', settings.kitchenEnabled ?? true) &&
        isBranchModuleEnabled('kds', true) &&
        (isSuperAdmin ||
          hasPerm('gestionar_cocina', perms.canManageKitchen) ||
          hasPerm('gestionar_catalogo', perms.canManageCatalog)),
    },
    {
      name: 'Control de Mesas',
      href: '/dashboard/tables',
      icon: LayoutGrid,
      active: pathname.startsWith('/dashboard/tables'),
      enabled:
        isBranchModuleEnabled('tables', settings.tablesEnabled ?? true) &&
        (isSuperAdmin ||
          hasPerm('traspaso_mesas', perms.canTransferTables) ||
          hasPerm('acceso_comandera', perms.canAccessPOS) ||
          hasPerm('gestionar_configuracion', perms.canManageSettings)),
    },
    {
      name: 'Personal y Roles (RH)',
      href: '/dashboard/users',
      icon: Users,
      active: pathname.startsWith('/dashboard/users'),
      enabled:
        isBranchModuleEnabled('users', true) &&
        (isSuperAdmin || hasPerm('gestionar_personal', perms.canManageUsers)),
    },
    {
      name: settings.cashRegisterEnabled !== false ? 'Reportes y Arqueos' : 'Reportes de Ventas',
      href: '/dashboard/reports',
      icon: BarChart3,
      active: pathname.startsWith('/dashboard/reports'),
      enabled:
        isBranchModuleEnabled('reports', true) &&
        (isSuperAdmin ||
          hasPerm('ver_reportes', perms.canViewReports) ||
          hasPerm('gestionar_cajas', perms.canManageCashRegisters)),
    },
    {
      name: 'Gestión de Sucursales',
      href: '/dashboard/branches',
      icon: Store,
      active: pathname.startsWith('/dashboard/branches'),
      enabled:
        isBranchModuleEnabled('branches', settings.multiBranchEnabled !== false) &&
        settings.multiBranchEnabled !== false &&
        (isSuperAdmin || hasPerm('gestionar_configuracion', perms.canManageSettings)),
    },
    {
      name: 'Temas y Colores',
      href: '/dashboard/theme',
      icon: Palette,
      active: pathname.startsWith('/dashboard/theme'),
      enabled:
        isBranchModuleEnabled('theme', settings.canCustomizeColors !== false) &&
        settings.canCustomizeColors !== false &&
        (isSuperAdmin || hasPerm('gestionar_configuracion', perms.canManageSettings)),
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
      <div className="lg:hidden fixed top-2.5 sm:top-3 left-3 z-40">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`p-2.5 rounded-xl ${mobileBtnClass} shadow-lg cursor-pointer active:scale-95 touch-manipulation select-none transition-transform flex items-center justify-center`}
          style={isHex ? { backgroundColor: sidebarTheme } : undefined}
          title="Menú de Navegación"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Overlay para móviles con bloqueo estricto de eventos de scroll */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          onTouchMove={(e) => e.preventDefault()}
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-xs overscroll-none touch-none"
        />
      )}

      {/* Barra Lateral (Sidebar) con transición fluida y contención de scroll */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 ${asideBgClass} flex flex-col transition-all duration-300 backdrop-blur-md overscroll-contain touch-pan-y ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          ...(isHex ? { backgroundColor: sidebarTheme } : {}),
          overscrollBehavior: 'contain',
        }}
      >
        {/* Cabecera del Sidebar */}
        <div
          className={`border-b ${headerBorderClass} shrink-0 transition-all ${
            collapsed
              ? 'p-2.5 flex flex-col items-center gap-3'
              : 'p-3 sm:p-4 flex flex-col items-center'
          }`}
        >
          {collapsed ? (
            /* Modo Contraído: Isologo / Isotipo y botón expandir */
            <>
              <div className="flex items-center justify-center w-full py-1">
                {isotypeUrl || logoUrl ? (
                  <img
                    src={(isotypeUrl || logoUrl) || ''}
                    alt={business.name}
                    className="w-11 h-11 object-contain drop-shadow-md select-none transition-transform hover:scale-105"
                    title={business.name}
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md text-[#F3E9DC] font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
                    }}
                    title={business.name}
                  >
                    <Coffee className="w-5 h-5 text-[#F3E9DC]" />
                  </div>
                )}
              </div>

              {/* Botón Expandir (Escritorio) */}
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`hidden lg:flex p-1.5 rounded-lg ${toggleBtnClass} transition-all cursor-pointer`}
                title="Expandir barra lateral"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* Modo Expandido: Botón colapsar superior, Logo grande centrado y nombre debajo */
            <div className="w-full flex flex-col items-center">
              <div className="w-full flex items-center justify-end mb-1">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className={`hidden lg:flex p-1.5 rounded-lg ${toggleBtnClass} transition-all cursor-pointer`}
                  title="Contraer barra lateral"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Logo / Isologo Grande Centrado (libre, sin encerrar) */}
              <div className="w-full flex flex-col items-center text-center px-1">
                {logoUrl || isotypeUrl ? (
                  <div className="w-full flex justify-center py-1">
                    <img
                      src={(logoUrl || isotypeUrl) || ''}
                      alt={business.name}
                      className="max-h-20 max-w-[190px] w-auto h-auto object-contain drop-shadow-md transition-all select-none hover:scale-[1.02]"
                    />
                  </div>
                ) : (
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg text-[#F3E9DC] font-bold my-1"
                    style={{
                      background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
                    }}
                  >
                    <Coffee className="w-7 h-7 text-[#F3E9DC]" />
                  </div>
                )}

                {/* Nombre del Negocio y Subtítulo Acomodados Debajo del Logo */}
                <div className="w-full text-center mt-2 overflow-hidden">
                  <h2 className={`font-black text-sm tracking-tight truncate ${headingTextClass}`}>
                    {business.name}
                  </h2>
                  <span className={`text-[11px] block truncate capitalize font-medium ${mutedTextClass}`}>
                    {business.businessType === 'CAFE'
                      ? 'Cafetería de Especialidad'
                      : business.businessType === 'RESTAURANT'
                      ? 'Restaurante & Café'
                      : business.businessType === 'BAR'
                      ? 'Bar & Café'
                      : 'Punto de Venta'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sucursal Activa Pill */}
        {!collapsed && activeBranch && (
          <div className={`p-2.5 mx-3 my-2 rounded-2xl ${branchPillClass} flex items-center justify-between text-xs shrink-0 shadow-xs`}>
            <div className="flex items-center gap-2 overflow-hidden">
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
              <div className="truncate">
                <span className={`text-[10px] block uppercase font-bold tracking-wider ${mutedTextClass}`}>
                  Sucursal
                </span>
                <strong className={`text-xs truncate block font-bold ${headingTextClass}`}>
                  {activeBranch.name}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Enlaces de Navegación con scroll contenido */}
        <div
          className="flex-1 p-3 space-y-5 overflow-y-auto overscroll-contain touch-pan-y"
          style={{ overscrollBehavior: 'contain' }}
        >
          {navLinks.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!collapsed && (
                <span className={`px-3 text-[10px] font-bold uppercase tracking-wider block mb-1 ${mutedTextClass}`}>
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
                        ? navItemHighlightClass
                        : navItemInactiveClass
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                    style={
                      item.active
                        ? {
                            backgroundColor: primaryColor,
                            boxShadow: `0 4px 14px 0 ${primaryColor}55`,
                          }
                        : undefined
                    }
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        item.active
                          ? 'text-white'
                          : ''
                      }`}
                      style={
                        !item.active && item.highlight
                          ? { color: primaryColor }
                          : undefined
                      }
                    />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Pie del Sidebar: Usuario y Cerrar Sesión */}
        <div className={`p-3 border-t ${headerBorderClass} ${footerBgClass} shrink-0 space-y-2`}>
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="overflow-hidden">
                <strong className={`text-xs block truncate font-bold ${headingTextClass}`}>
                  {user.name}
                </strong>
                <span className={`text-[10px] block truncate font-medium ${mutedTextClass}`}>
                  {user.roleCodes.join(', ')}
                </span>
              </div>

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className={`p-2 rounded-xl ${footerLogoutBtnClass} transition-all cursor-pointer`}
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
                  className={`p-2 rounded-xl ${footerLogoutBtnClass} transition-all cursor-pointer`}
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

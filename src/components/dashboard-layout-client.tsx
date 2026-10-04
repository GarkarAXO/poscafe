'use client'

import { useState, useEffect } from 'react'
import DashboardSidebar from './dashboard-sidebar'

import { isLightColor } from '@/lib/theme-utils'
import { DashboardThemeProvider } from '@/context/dashboard-theme-context'

interface DashboardLayoutClientProps {
  business: any
  user: any
  activeBranchId?: string
  children: React.ReactNode
}

export default function DashboardLayoutClient({
  business,
  user,
  activeBranchId,
  children,
}: DashboardLayoutClientProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [liveTheme, setLiveTheme] = useState<{
    bgColor?: string | null
    primaryColor?: string | null
    secondaryColor?: string | null
    buttonColor?: string | null
    logoUrl?: string | null
    isotypeUrl?: string | null
    sidebarTheme?: string | null
  } | null>(null)

  const activeBranch =
    business.branches?.find((b: any) => b.id === activeBranchId) || business.branches?.[0]

  // Escuchar eventos en caliente cuando se guarda un tema en /dashboard/theme
  useEffect(() => {
    const handleThemeUpdate = (e: any) => {
      const detail = e.detail
      if (!detail) return
      if (!detail.branchId || detail.branchId === activeBranch?.id) {
        setLiveTheme(detail)
      }
    }
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'poscafe_theme_event' && e.newValue) {
        try {
          const detail = JSON.parse(e.newValue)
          if (!detail.branchId || detail.branchId === activeBranch?.id) {
            setLiveTheme(detail)
          }
        } catch {}
      }
    }
    window.addEventListener('poscafe:theme-updated', handleThemeUpdate)
    window.addEventListener('storage', handleStorageUpdate)
    return () => {
      window.removeEventListener('poscafe:theme-updated', handleThemeUpdate)
      window.removeEventListener('storage', handleStorageUpdate)
    }
  }, [activeBranch?.id])

  const settings = business.settings || {}

  // Determinar colores de fondo y acentos reactivos en tiempo real
  const primaryColor =
    liveTheme?.primaryColor || activeBranch?.primaryColor || settings.primaryColor || '#5E3023'
  const secondaryColor =
    liveTheme?.secondaryColor || activeBranch?.secondaryColor || settings.secondaryColor || '#5E3023'
  const buttonColor =
    liveTheme?.buttonColor || activeBranch?.buttonColor || settings.accentColor || '#C08552'
  const bgColor =
    liveTheme?.bgColor ||
    (settings.canCustomizeColors !== false && activeBranch?.bgColor
      ? activeBranch.bgColor
      : '#F3E9DC')

  const isLight = isLightColor(bgColor)

  // Inyectar liveTheme en la lista de sucursales para el sidebar
  const updatedBranches = (business.branches || []).map((b: any) => {
    if (b.id === activeBranch?.id && liveTheme) {
      return {
        ...b,
        ...liveTheme,
      }
    }
    return b
  })

  const mergedBusiness = {
    ...business,
    branches: updatedBranches,
  }

  return (
    <DashboardThemeProvider
      initialBgColor={bgColor}
      initialPrimaryColor={primaryColor}
      initialSecondaryColor={secondaryColor}
      initialButtonColor={buttonColor}
      activeBranchId={activeBranch?.id}
    >
      <div
        className={`min-h-screen flex flex-col transition-colors duration-500 relative selection:bg-[#C08552] selection:text-white ${
          isLight ? 'text-[#2B1712]' : 'text-slate-100'
        }`}
        style={{
          backgroundColor: bgColor,
          backgroundImage: `radial-gradient(ellipse 90% 55% at 50% -15%, ${primaryColor}18, transparent)`,
        }}
      >
        {/* Warm Ambient Coffee Glows matching Login */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] transition-colors duration-500"
            style={{ backgroundColor: `${primaryColor}20` }}
          />
          <div
            className="absolute bottom-10 right-1/4 w-[450px] h-[450px] rounded-full blur-[120px] transition-colors duration-500"
            style={{ backgroundColor: `${secondaryColor}15` }}
          />
        </div>

        <DashboardSidebar
          business={mergedBusiness}
          user={user}
          activeBranchId={activeBranchId}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
        {/* Contenido principal con padding adaptable: lg:pl-20 cuando está contraído, lg:pl-64 cuando está expandido */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 relative z-10 ${
            collapsed ? 'lg:pl-20' : 'lg:pl-64'
          }`}
        >
          {children}
        </div>
      </div>
    </DashboardThemeProvider>
  )
}

'use client'

import { useState } from 'react'
import DashboardSidebar from './dashboard-sidebar'

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

  const activeBranch =
    business.branches?.find((b: any) => b.id === activeBranchId) || business.branches?.[0]

  const settings = business.settings || {}

  // Determinar colores de fondo y acentos de acuerdo con la sucursal activa o ajustes globales
  const primaryColor = activeBranch?.primaryColor || settings.primaryColor || '#7c3aed'
  const bgColor =
    (settings.canCustomizeColors !== false && activeBranch?.bgColor)
      ? activeBranch.bgColor
      : '#020617'

  return (
    <div
      className="min-h-screen text-slate-100 flex flex-col transition-colors duration-300"
      style={{
        backgroundColor: bgColor,
        backgroundImage: `radial-gradient(ellipse 90% 55% at 50% -15%, ${primaryColor}18, transparent)`,
      }}
    >
      <DashboardSidebar
        business={business}
        user={user}
        activeBranchId={activeBranchId}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      {/* Contenido principal con padding adaptable: lg:pl-20 cuando está contraído, lg:pl-64 cuando está expandido */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

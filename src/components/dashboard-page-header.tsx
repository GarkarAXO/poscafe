'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { useDashboardTheme } from '@/context/dashboard-theme-context'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface DashboardPageHeaderProps {
  breadcrumbs?: BreadcrumbItem[]
  title: React.ReactNode
  description?: React.ReactNode
  badge?: React.ReactNode
  icon?: React.ReactNode
  actions?: React.ReactNode
  backHref?: string
  backLabel?: string
}

export default function DashboardPageHeader({
  breadcrumbs,
  title,
  description,
  badge,
  icon,
  actions,
  backHref = '/dashboard',
  backLabel = 'Volver al Panel',
}: DashboardPageHeaderProps) {
  const { isLight, buttonColor, classes } = useDashboardTheme()

  return (
    <div className="space-y-4">
      {/* Barra superior con breadcrumbs y botón volver */}
      <div className="flex items-center justify-between gap-3">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className={`flex items-center gap-1.5 text-xs font-medium ${classes.textMuted}`}>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <React.Fragment key={index}>
                  {index > 0 && <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="hover:underline transition-colors truncate max-w-[140px] sm:max-w-none"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className={`font-bold truncate max-w-[160px] sm:max-w-none ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        ) : (
          <div />
        )}

        {backHref && (
          <Link
            href={backHref}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${classes.buttonGhost}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ color: buttonColor }} />
            <span>{backLabel}</span>
          </Link>
        )}
      </div>

      {/* Título, Badge y Acciones */}
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {icon && (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  {icon}
                </div>
              )}
              <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className={`text-xs sm:text-sm max-w-2xl font-normal ${classes.textMuted}`}>
                {description}
              </p>
            )}
          </div>

          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
    </div>
  )
}

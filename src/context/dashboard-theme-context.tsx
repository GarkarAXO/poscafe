'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { isLightColor, getDashboardThemeClasses, getContrastTextColor } from '@/lib/theme-utils'

interface ThemeState {
  bgColor: string
  primaryColor: string
  secondaryColor: string
  buttonColor: string
  isLight: boolean
  classes: ReturnType<typeof getDashboardThemeClasses>
  contrastTextButton: string
  contrastTextPrimary: string
}

const defaultThemeState: ThemeState = {
  bgColor: '#F3E9DC',
  primaryColor: '#5E3023',
  secondaryColor: '#5E3023',
  buttonColor: '#C08552',
  isLight: true,
  classes: getDashboardThemeClasses(true),
  contrastTextButton: '#FFFFFF',
  contrastTextPrimary: '#FFFFFF',
}

const DashboardThemeContext = createContext<ThemeState>(defaultThemeState)

interface DashboardThemeProviderProps {
  initialBgColor?: string | null
  initialPrimaryColor?: string | null
  initialSecondaryColor?: string | null
  initialButtonColor?: string | null
  activeBranchId?: string
  children: React.ReactNode
}

export function DashboardThemeProvider({
  initialBgColor,
  initialPrimaryColor,
  initialSecondaryColor,
  initialButtonColor,
  activeBranchId,
  children,
}: DashboardThemeProviderProps) {
  const [theme, setTheme] = useState<{
    bgColor: string
    primaryColor: string
    secondaryColor: string
    buttonColor: string
  }>(() => {
    const bg = initialBgColor || '#F3E9DC'
    const primary = initialPrimaryColor || '#5E3023'
    const secondary = initialSecondaryColor || '#5E3023'
    const button = initialButtonColor || '#C08552'
    return { bgColor: bg, primaryColor: primary, secondaryColor: secondary, buttonColor: button }
  })

  // Escuchar cambios reactivos de tema
  useEffect(() => {
    const handleThemeUpdate = (e: any) => {
      const detail = e.detail
      if (!detail) return
      if (!detail.branchId || detail.branchId === activeBranchId) {
        setTheme((prev) => ({
          bgColor: detail.bgColor || prev.bgColor,
          primaryColor: detail.primaryColor || prev.primaryColor,
          secondaryColor: detail.secondaryColor || prev.secondaryColor,
          buttonColor: detail.buttonColor || prev.buttonColor,
        }))
      }
    }

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'poscafe_theme_event' && e.newValue) {
        try {
          const detail = JSON.parse(e.newValue)
          if (!detail.branchId || detail.branchId === activeBranchId) {
            setTheme((prev) => ({
              bgColor: detail.bgColor || prev.bgColor,
              primaryColor: detail.primaryColor || prev.primaryColor,
              secondaryColor: detail.secondaryColor || prev.secondaryColor,
              buttonColor: detail.buttonColor || prev.buttonColor,
            }))
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
  }, [activeBranchId])

  // Actualizar si las props iniciales cambian por cambio de sucursal
  useEffect(() => {
    setTheme({
      bgColor: initialBgColor || '#F3E9DC',
      primaryColor: initialPrimaryColor || '#5E3023',
      secondaryColor: initialSecondaryColor || '#5E3023',
      buttonColor: initialButtonColor || '#C08552',
    })
  }, [initialBgColor, initialPrimaryColor, initialSecondaryColor, initialButtonColor])

  const isLight = isLightColor(theme.bgColor)
  const classes = getDashboardThemeClasses(isLight)
  const contrastTextButton = getContrastTextColor(theme.buttonColor)
  const contrastTextPrimary = getContrastTextColor(theme.primaryColor)

  const value: ThemeState = {
    bgColor: theme.bgColor,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    buttonColor: theme.buttonColor,
    isLight,
    classes,
    contrastTextButton,
    contrastTextPrimary,
  }

  return (
    <DashboardThemeContext.Provider value={value}>
      {children}
    </DashboardThemeContext.Provider>
  )
}

export function useDashboardTheme(): ThemeState {
  return useContext(DashboardThemeContext)
}

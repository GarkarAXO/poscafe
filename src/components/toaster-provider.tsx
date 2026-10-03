'use client'

import { useEffect, useState } from 'react'
import { Toaster } from 'sileo'

export default function ToasterProvider() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const updateTheme = () => {
      if (typeof window === 'undefined') return

      const isHtmlDark = document.documentElement.classList.contains('dark')
      const isHtmlLight = document.documentElement.classList.contains('light')

      if (isHtmlDark) {
        setTheme('dark')
        document.documentElement.setAttribute('data-color-mode', 'dark')
        return
      }
      if (isHtmlLight) {
        setTheme('light')
        document.documentElement.setAttribute('data-color-mode', 'light')
        return
      }

      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const mode = isSystemDark ? 'dark' : 'light'
      setTheme(mode)
      document.documentElement.setAttribute('data-color-mode', mode)
    }

    updateTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => updateTheme()
    mediaQuery.addEventListener('change', handler)

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    return () => {
      mediaQuery.removeEventListener('change', handler)
      observer.disconnect()
    }
  }, [])

  return (
    <Toaster
      position="top-center"
      theme={theme}
      options={{
        position: 'top-center',
        roundness: 16,
      }}
    />
  )
}

'use client'

import { useEffect } from 'react'

interface DynamicFaviconProps {
  branchId?: string | null
  iconUrl?: string | null
}

/**
 * Componente cliente para actualizar dinámicamente el favicon de la pestaña del navegador
 * según la sucursal activa o la URL de favicon provista.
 */
export default function DynamicFavicon({ branchId, iconUrl }: DynamicFaviconProps) {
  useEffect(() => {
    const faviconHref = iconUrl || (branchId ? `/api/favicon?branchId=${encodeURIComponent(branchId)}` : '/api/favicon')

    // Buscar o crear los tags de link para el icono en el head
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }

    link.type = faviconHref.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon'
    link.href = faviconHref

    // También actualizar apple-touch-icon si existe o crearlo
    let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']")
    if (!appleLink) {
      appleLink = document.createElement('link')
      appleLink.rel = 'apple-touch-icon'
      document.head.appendChild(appleLink)
    }
    appleLink.href = faviconHref
  }, [branchId, iconUrl])

  return null
}

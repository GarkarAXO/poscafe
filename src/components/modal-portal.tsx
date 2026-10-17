'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  children: ReactNode
}

/**
 * Componente que renderiza su contenido directamente en el <body> del documento
 * mediante createPortal. Esto evita que los modales queden atrapados dentro de contenedores
 * con backdrop-blur, relative, transform o overflow-hidden, garantizando que siempre se
 * centren en el viewport visible de la pantalla sin importar qué tan largo sea el contenido
 * de la página (por ejemplo, con 20 o más mesas).
 */
let activeModalsCount = 0

export function ModalPortal({ children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    activeModalsCount++
    const originalOverflow = document.body.style.overflow
    if (activeModalsCount === 1) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      setMounted(false)
      activeModalsCount = Math.max(0, activeModalsCount - 1)
      if (activeModalsCount === 0) {
        document.body.style.overflow = originalOverflow || ''
      }
    }
  }, [])

  if (!mounted || typeof document === 'undefined') {
    return null
  }

  return createPortal(children, document.body)
}

export default ModalPortal

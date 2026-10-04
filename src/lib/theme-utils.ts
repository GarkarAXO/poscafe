/**
 * Utilidades de cálculo de contraste y adaptación de temas (Claro / Oscuro)
 * para Comandera, KDS, POS, Barra Lateral y Vistas de Previsualización.
 */

/**
 * Determina si un color HEX es claro u oscuro según luminancia perceptual (BT.709).
 * Retorna true si el color es claro (requiere textos oscuros y badges de alto contraste),
 * o false si es oscuro (requiere textos claros y acentos luminosos).
 */
export function isLightColor(hex?: string | null): boolean {
  if (!hex) return false
  const cleanHex = hex.trim().replace('#', '')
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return false

  const r =
    cleanHex.length === 3
      ? parseInt(cleanHex[0] + cleanHex[0], 16)
      : parseInt(cleanHex.substring(0, 2), 16)
  const g =
    cleanHex.length === 3
      ? parseInt(cleanHex[1] + cleanHex[1], 16)
      : parseInt(cleanHex.substring(2, 4), 16)
  const b =
    cleanHex.length === 3
      ? parseInt(cleanHex[2] + cleanHex[2], 16)
      : parseInt(cleanHex.substring(4, 6), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) return false

  // Fórmula perceptual ITU-R BT.709
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55
}

/**
 * Retorna el color de texto óptimo para garantizar legibilidad (WCAG)
 * sobre un fondo determinado por su valor HEX.
 */
export function getContrastTextColor(bgHex?: string | null, lightText = '#FFFFFF', darkText = '#2B1712'): string {
  return isLightColor(bgHex) ? darkText : lightText
}

export type StatusBadgeType =
  | 'CONNECTED'
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'BILL_PRINTED'
  | 'MY_TABLE'
  | 'TRANSFERRED'
  | 'KDS'
  | 'POS'
  | 'RELEVO'
  | 'MODE_FREE'
  | 'MODE_ASSIGNED'

/**
 * Retorna clases de Tailwind adaptativas para badges y botones de estado
 * según si el fondo activo es claro u oscuro.
 */
export function getStatusBadgeStyles(
  status: StatusBadgeType,
  isLight: boolean
): { className: string; dotClass?: string; pingClass?: string } {
  if (isLight) {
    // Modo Claro: Fondos con tintes suaves y textos de alto contraste (950) con bordes definidos (300)
    switch (status) {
      case 'CONNECTED':
        return {
          className:
            'bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold shadow-xs',
          dotClass: 'bg-emerald-600',
          pingClass: 'bg-emerald-500',
        }
      case 'AVAILABLE':
        return {
          className:
            'bg-emerald-100/90 text-emerald-950 border border-emerald-300 font-bold shadow-xs',
          dotClass: 'bg-emerald-600',
          pingClass: 'bg-emerald-500',
        }
      case 'OCCUPIED':
        return {
          className:
            'bg-amber-100/90 text-amber-950 border border-amber-300 font-bold shadow-xs',
          dotClass: 'bg-amber-600',
          pingClass: 'bg-amber-500',
        }
      case 'BILL_PRINTED':
        return {
          className:
            'bg-purple-100 text-purple-950 border border-purple-300 font-black shadow-xs',
          dotClass: 'bg-purple-600',
          pingClass: 'bg-purple-500',
        }
      case 'MY_TABLE':
        return {
          className:
            'bg-[#C08552]/15 text-[#5E3023] border border-[#C08552]/35 font-black shadow-xs',
        }
      case 'TRANSFERRED':
        return {
          className:
            'bg-cyan-100 text-cyan-950 border border-cyan-300 font-bold shadow-xs',
          dotClass: 'bg-cyan-600',
        }
      case 'KDS':
        return {
          className:
            'bg-cyan-100 hover:bg-cyan-200/90 text-cyan-950 border border-cyan-300 font-bold shadow-xs',
        }
      case 'POS':
        return {
          className:
            'bg-amber-100 hover:bg-amber-200/90 text-amber-950 border border-amber-300 font-bold shadow-xs',
        }
      case 'RELEVO':
        return {
          className:
            'bg-white hover:bg-[#F3E9DC] text-[#5E3023] border border-[#DECEBD] font-bold shadow-xs',
        }
      case 'MODE_FREE':
        return {
          className:
            'bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold shadow-xs',
          dotClass: 'bg-emerald-600',
        }
      case 'MODE_ASSIGNED':
        return {
          className:
            'bg-amber-100 text-amber-950 border border-amber-300 font-bold shadow-xs',
          dotClass: 'bg-amber-600',
        }
    }
  } else {
    // Modo Oscuro: Fondos translúcidos con textos luminosos (300/200) y bordes sutiles
    switch (status) {
      case 'CONNECTED':
        return {
          className:
            'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold shadow-xs',
          dotClass: 'bg-emerald-500',
          pingClass: 'bg-emerald-400',
        }
      case 'AVAILABLE':
        return {
          className:
            'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold',
          dotClass: 'bg-emerald-400',
        }
      case 'OCCUPIED':
        return {
          className:
            'bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold',
          dotClass: 'bg-amber-400',
        }
      case 'BILL_PRINTED':
        return {
          className:
            'bg-violet-500/15 text-violet-300 border border-violet-500/30 font-bold shadow-xs',
          dotClass: 'bg-violet-400',
          pingClass: 'bg-violet-400',
        }
      case 'MY_TABLE':
        return {
          className:
            'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shadow-xs',
        }
      case 'TRANSFERRED':
        return {
          className:
            'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold',
          dotClass: 'bg-cyan-400',
        }
      case 'KDS':
        return {
          className:
            'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium',
        }
      case 'POS':
        return {
          className:
            'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium',
        }
      case 'RELEVO':
        return {
          className:
            'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 font-semibold shadow-xs',
        }
      case 'MODE_FREE':
        return {
          className:
            'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm',
          dotClass: 'bg-emerald-400',
        }
      case 'MODE_ASSIGNED':
        return {
          className:
            'bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-sm',
          dotClass: 'bg-amber-400',
        }
    }
  }
}

/**
 * Clases de Tailwind y estilos armonizados para paneles y vistas del Dashboard
 * según el fondo activo (claro u oscuro).
 */
export function getDashboardThemeClasses(isLight: boolean) {
  return {
    isLight,
    // Tipografía
    textMain: isLight ? 'text-[#2B1712]' : 'text-slate-100',
    textMuted: isLight ? 'text-[#7A5B50]' : 'text-slate-400',
    textSub: isLight ? 'text-[#A88C7D]' : 'text-slate-500',
    textHighlight: isLight ? 'text-[#5E3023]' : 'text-amber-400',

    // Tarjetas y Contenedores
    card: isLight
      ? 'bg-white/95 border-[#E6D5C3] shadow-sm text-[#2B1712]'
      : 'bg-[#181311]/90 border-white/10 shadow-lg text-slate-100',
    cardSolid: isLight
      ? 'bg-white border-[#E6D5C3] text-[#2B1712]'
      : 'bg-[#181311] border-white/10 text-slate-100',
    subCard: isLight
      ? 'bg-[#FDFBF9] border-[#E6D5C3] text-[#2B1712]'
      : 'bg-[#221B18]/70 border-white/10 text-slate-100',
    subCardHover: isLight
      ? 'hover:bg-[#F3E9DC]/40 hover:border-[#C08552]/40'
      : 'hover:bg-white/5 hover:border-white/20',

    // Formularios e Inputs
    input: isLight
      ? 'bg-white border-[#DECEBD] text-[#2B1712] placeholder-[#A88C7D] focus:border-[#C08552] focus:ring-1 focus:ring-[#C08552]/30'
      : 'bg-[#1C1614] border-white/15 text-slate-100 placeholder-slate-500 focus:border-white/30 focus:ring-1 focus:ring-white/10',

    // Botones y Badges secundarios
    buttonGhost: isLight
      ? 'bg-white/80 hover:bg-[#F3E9DC] text-[#5E3023] border-[#DECEBD] shadow-xs'
      : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/15 shadow-xs',
    badge: isLight
      ? 'bg-[#F3E9DC] text-[#5E3023] border-[#DECEBD]'
      : 'bg-white/10 text-slate-200 border-white/15',

    // Encabezados y Barras de Navegación
    header: isLight
      ? 'bg-white/85 border-[#DECEBD] backdrop-blur-md text-[#2B1712]'
      : 'bg-[#14100E]/85 border-white/10 backdrop-blur-md text-slate-100',

    // Tablas
    tableHeader: isLight
      ? 'bg-[#F3E9DC]/70 text-[#5E3023] border-[#E6D5C3]'
      : 'bg-[#1C1614]/80 text-slate-300 border-white/10',
    tableRow: isLight
      ? 'border-[#E6D5C3]/60 hover:bg-[#F3E9DC]/30'
      : 'border-white/5 hover:bg-white/5',

    // Modales
    modalContent: isLight
      ? 'bg-white border-[#E6D5C3] text-[#2B1712] shadow-2xl'
      : 'bg-[#1A1412] border-white/10 text-slate-100 shadow-2xl',

    // Divisores y Bordes
    divider: isLight ? 'border-[#DECEBD]' : 'border-white/10',
  }
}


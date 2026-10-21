'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coffee,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw,
  Flame,
  Tv,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Layers,
  UtensilsCrossed,
  Palette,
  Check,
  Star,
  Tag,
  Image as ImageIcon,
  Sliders,
  Pencil,
  RotateCcw,
  X,
  Calendar,
} from 'lucide-react'
import {
  MokaPotIcon,
  ColdDrinkIcon,
  CoffeeBranchVector,
} from '@/components/menu-dividers'

export interface Modifier {
  id: string
  name: string
  extraPrice: number
}

export interface ModifierGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  isRequired: boolean
  modifiers: Modifier[]
}

export interface Variant {
  id: string
  name: string
  price: number
}

export interface Product {
  id: string
  name: string
  code: string | null
  description: string | null
  imageUrl: string | null
  isNew?: boolean
  isSeasonal?: boolean
  hasVariants: boolean
  minPrice: number
  maxPrice?: number
  variants: Variant[]
  modifierGroups?: ModifierGroup[]
}

export interface Category {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  products: Product[]
}

export interface BusinessData {
  id: string
  name: string
  legalName?: string | null
  logoUrl?: string | null
  isotypeUrl?: string | null
  currency: string
  timezone: string
  theme: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    darkMode: boolean
  }
}

export interface DisplayClientProps {
  initialBusiness: BusinessData
  initialCategories: Category[]
}

export type ScreenMode = 'ROTATING' | 'FEATURED' | 'DRINKS' | 'FOOD' | 'ALL_STATIC'

export interface DisplayThemeConfig {
  id: string
  name: string
  tag: string
  category: 'seasonal' | 'classic'
  monthOrSeason?: string
  icon?: string
  bg: string
  glow1: string
  glow2: string
  headerBg: string
  cardBg: string
  cardBorder: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string
  mutedColor: string
  priceColor: string
  badgeBg: string
  badgeText: string
  isLight?: boolean
  bgWallpaperUrl?: string
  wallpaperOverlay?: string
  // Stickers temáticos y bordes adaptables
  stickerEmoji?: string
  stickerSecondaryEmoji?: string
  stickerTag?: string
  cardBorderAccent?: string
}

export interface CustomDisplayColors {
  enabled: boolean
  primaryColor: string
  secondaryColor: string
  accentColor: string
  priceColor: string
  textColor: string
}

export const QUICK_COLOR_PALETTES = [
  {
    id: 'navidad-festiva',
    name: '🎄 Navidad Clásica (Rojo/Verde/Blanco)',
    colors: {
      primaryColor: '#DC2626',
      secondaryColor: '#15803D',
      accentColor: '#FFFFFF',
      priceColor: '#FEF08A',
      textColor: '#FFFFFF',
    },
  },
  {
    id: 'ano-nuevo-gala',
    name: '🍾 Año Nuevo Gala (Dorado & Champagne)',
    colors: {
      primaryColor: '#F59E0B',
      secondaryColor: '#D97706',
      accentColor: '#FEF08A',
      priceColor: '#FDE047',
      textColor: '#FFFFFF',
    },
  },
  {
    id: 'primavera-rosa-amarillo',
    name: '🌸 Primavera (Rosa Cerezo & Amarillo)',
    colors: {
      primaryColor: '#FACC15',
      secondaryColor: '#EC4899',
      accentColor: '#F472B6',
      priceColor: '#FACC15',
      textColor: '#FFFBEB',
    },
  },
  {
    id: 'dia-de-muertos',
    name: '💀 Día de Muertos (Cempasúchil & Copal)',
    colors: {
      primaryColor: '#F59E0B',
      secondaryColor: '#7C3AED',
      accentColor: '#FB923C',
      priceColor: '#FBBF24',
      textColor: '#FFF7ED',
    },
  },
  {
    id: 'fiestas-patrias',
    name: '🇲🇽 Fiestas Patrias (Verde, Blanco & Rojo)',
    colors: {
      primaryColor: '#16A34A',
      secondaryColor: '#DC2626',
      accentColor: '#FFFFFF',
      priceColor: '#4ADE80',
      textColor: '#FFFFFF',
    },
  },
  {
    id: 'cyberpunk-neon',
    name: '🌌 Cyberpunk Neón (Magenta & Violeta)',
    colors: {
      primaryColor: '#EC4899',
      secondaryColor: '#8B5CF6',
      accentColor: '#06B6D4',
      priceColor: '#22D3EE',
      textColor: '#FAF5FF',
    },
  },
  {
    id: 'cafe-caramelo',
    name: '☕ Café & Caramelo Tostado',
    colors: {
      primaryColor: '#C08552',
      secondaryColor: '#5E3023',
      accentColor: '#D4A373',
      priceColor: '#E0A96D',
      textColor: '#FDFBF7',
    },
  },
]

export const DISPLAY_THEMES: Record<string, DisplayThemeConfig> = {
  // =========================================================================
  // 🇲🇽 10 PLANTILLAS FESTIVAS & TEMPORADAS DE MÉXICO (MES A MES)
  // =========================================================================
  'dia-de-muertos': {
    id: 'dia-de-muertos',
    name: 'Día de Muertos',
    tag: 'Cempasúchil & Copal',
    category: 'seasonal',
    monthOrSeason: 'Octubre - Noviembre',
    icon: '🎃',
    bg: '#0C060B',
    glow1: '#F59E0B',
    glow2: '#7C3AED',
    headerBg: 'rgba(12, 6, 11, 0.88)',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(245, 158, 11, 0.32)',
    primaryColor: '#F59E0B',
    secondaryColor: '#7C3AED',
    accentColor: '#FB923C',
    textColor: '#FFF7ED',
    mutedColor: '#E9D5FF',
    priceColor: '#FBBF24',
    badgeBg: 'rgba(124, 58, 237, 0.25)',
    badgeText: '#FDE047',
    bgWallpaperUrl: '/wallpapers/dia-de-muertos.jpg',
    wallpaperOverlay: 'rgba(14, 8, 12, 0.45)',
    stickerEmoji: '💀',
    stickerSecondaryEmoji: '🌼',
    stickerTag: 'Día de Muertos',
    cardBorderAccent: 'linear-gradient(90deg, #F59E0B 0%, #FB923C 50%, #7C3AED 100%)',
  },
  'navidad': {
    id: 'navidad',
    name: 'Navidad & Nochebuena',
    tag: 'Pino & Luces Festivas',
    category: 'seasonal',
    monthOrSeason: 'Diciembre',
    icon: '🎄',
    bg: '#06110A',
    glow1: '#DC2626',
    glow2: '#15803D',
    headerBg: 'rgba(6, 17, 10, 0.88)',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(220, 38, 38, 0.40)',
    primaryColor: '#DC2626',
    secondaryColor: '#15803D',
    accentColor: '#FFFFFF',
    textColor: '#FFFFFF',
    mutedColor: '#BBF7D0',
    priceColor: '#FEF08A',
    badgeBg: 'rgba(220, 38, 38, 0.30)',
    badgeText: '#FFFFFF',
    bgWallpaperUrl: '/wallpapers/navidad.jpg',
    wallpaperOverlay: 'rgba(6, 17, 10, 0.42)',
    stickerEmoji: '🎄',
    stickerSecondaryEmoji: '🎅',
    stickerTag: 'Navidad Festiva',
    cardBorderAccent: 'linear-gradient(90deg, #DC2626 0%, #FFFFFF 50%, #15803D 100%)',
  },
  'ano-nuevo': {
    id: 'ano-nuevo',
    name: 'Año Nuevo Gala',
    tag: 'Black & Gold Luxury',
    category: 'seasonal',
    monthOrSeason: 'Enero',
    icon: '🎆',
    bg: '#08080A',
    glow1: '#F59E0B',
    glow2: '#D97706',
    headerBg: 'rgba(8, 8, 10, 0.90)',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(245, 158, 11, 0.45)',
    primaryColor: '#F59E0B',
    secondaryColor: '#D97706',
    accentColor: '#FEF08A',
    textColor: '#FFFFFF',
    mutedColor: '#FEF3C7',
    priceColor: '#FDE047',
    badgeBg: 'rgba(245, 158, 11, 0.25)',
    badgeText: '#FEF08A',
    bgWallpaperUrl: '/wallpapers/ano-nuevo.jpg',
    wallpaperOverlay: 'rgba(8, 8, 10, 0.45)',
    stickerEmoji: '🍾',
    stickerSecondaryEmoji: '✨',
    stickerTag: 'Año Nuevo Gala',
    cardBorderAccent: 'linear-gradient(90deg, #D97706 0%, #FEF08A 50%, #F59E0B 100%)',
  },
  'san-valentin': {
    id: 'san-valentin',
    name: 'San Valentín & Amistad',
    tag: 'Amor & Chocolate',
    category: 'seasonal',
    monthOrSeason: 'Febrero',
    icon: '💖',
    bg: '#13060C',
    glow1: '#E11D48',
    glow2: '#BE185D',
    headerBg: 'rgba(19, 6, 12, 0.88)',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(225, 29, 72, 0.32)',
    primaryColor: '#F43F5E',
    secondaryColor: '#BE185D',
    accentColor: '#FDA4AF',
    textColor: '#FFF1F2',
    mutedColor: '#FECDD3',
    priceColor: '#FB7185',
    badgeBg: 'rgba(225, 29, 72, 0.22)',
    badgeText: '#FFE4E6',
    bgWallpaperUrl: '/wallpapers/san-valentin.jpg',
    wallpaperOverlay: 'rgba(19, 6, 12, 0.42)',
    stickerEmoji: '💘',
    stickerSecondaryEmoji: '🌹',
    stickerTag: 'San Valentín',
    cardBorderAccent: 'linear-gradient(90deg, #F43F5E 0%, #FDA4AF 50%, #BE185D 100%)',
  },
  'primavera': {
    id: 'primavera',
    name: 'Primavera & Floración',
    tag: 'Flor de Café & Menta',
    category: 'seasonal',
    monthOrSeason: 'Marzo - Abril',
    icon: '🌸',
    bg: '#08130E',
    glow1: '#FACC15',
    glow2: '#EC4899',
    headerBg: 'rgba(8, 19, 14, 0.88)',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(250, 204, 21, 0.35)',
    primaryColor: '#FACC15',
    secondaryColor: '#EC4899',
    accentColor: '#F472B6',
    textColor: '#FFFBEB',
    mutedColor: '#FDE047',
    priceColor: '#FACC15',
    badgeBg: 'rgba(236, 72, 153, 0.25)',
    badgeText: '#FDE047',
    bgWallpaperUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1920&q=80',
    wallpaperOverlay: 'rgba(8, 19, 14, 0.86)',
    stickerEmoji: '🌸',
    stickerSecondaryEmoji: '🌼',
    stickerTag: 'Primavera Floral',
    cardBorderAccent: 'linear-gradient(90deg, #FACC15 0%, #F472B6 50%, #EC4899 100%)',
  },
  'dia-de-las-madres': {
    id: 'dia-de-las-madres',
    name: 'Día de las Madres',
    tag: 'Lavanda & Cariño',
    category: 'seasonal',
    monthOrSeason: 'Mayo',
    icon: '💐',
    bg: '#0E0814',
    glow1: '#A855F7',
    glow2: '#EC4899',
    headerBg: 'rgba(14, 8, 20, 0.88)',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(168, 85, 247, 0.32)',
    primaryColor: '#C084FC',
    secondaryColor: '#F472B6',
    accentColor: '#E879F9',
    textColor: '#FAF5FF',
    mutedColor: '#E9D5FF',
    priceColor: '#F0ABFC',
    badgeBg: 'rgba(168, 85, 247, 0.22)',
    badgeText: '#F3E8FF',
    bgWallpaperUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1920&q=80',
    wallpaperOverlay: 'rgba(14, 8, 20, 0.86)',
    stickerEmoji: '💐',
    stickerSecondaryEmoji: '💖',
    stickerTag: 'Día de las Madres',
    cardBorderAccent: 'linear-gradient(90deg, #C084FC 0%, #F472B6 50%, #E879F9 100%)',
  },
  'verano-tropical': {
    id: 'verano-tropical',
    name: 'Verano & Cold Brew',
    tag: 'Cítricos & Sol Marina',
    category: 'seasonal',
    monthOrSeason: 'Junio - Julio',
    icon: '☀️',
    bg: '#061017',
    glow1: '#0284C7',
    glow2: '#F59E0B',
    headerBg: 'rgba(6, 16, 23, 0.88)',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(2, 132, 199, 0.32)',
    primaryColor: '#38BDF8',
    secondaryColor: '#F59E0B',
    accentColor: '#FBBF24',
    textColor: '#F0F9FF',
    mutedColor: '#BAE6FD',
    priceColor: '#38BDF8',
    badgeBg: 'rgba(2, 132, 199, 0.22)',
    badgeText: '#7DD3FC',
    bgWallpaperUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=1920&q=80',
    wallpaperOverlay: 'rgba(6, 16, 23, 0.86)',
    stickerEmoji: '☀️',
    stickerSecondaryEmoji: '🌴',
    stickerTag: 'Verano Tropical',
    cardBorderAccent: 'linear-gradient(90deg, #38BDF8 0%, #FBBF24 50%, #F59E0B 100%)',
  },
  'cosecha-barista': {
    id: 'cosecha-barista',
    name: 'Cosecha & Finca Barista',
    tag: 'Grano Tostado & Madera',
    category: 'seasonal',
    monthOrSeason: 'Agosto',
    icon: '☕',
    bg: '#0F0906',
    glow1: '#D97706',
    glow2: '#78350F',
    headerBg: 'rgba(15, 9, 6, 0.88)',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(217, 119, 6, 0.32)',
    primaryColor: '#F59E0B',
    secondaryColor: '#92400E',
    accentColor: '#FBBF24',
    textColor: '#FEF3C7',
    mutedColor: '#FDE68A',
    priceColor: '#F59E0B',
    badgeBg: 'rgba(217, 119, 6, 0.22)',
    badgeText: '#FDE68A',
    bgWallpaperUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1920&q=80',
    wallpaperOverlay: 'rgba(15, 9, 6, 0.86)',
    stickerEmoji: '☕',
    stickerSecondaryEmoji: '🌱',
    stickerTag: 'Cosecha Finca',
    cardBorderAccent: 'linear-gradient(90deg, #D97706 0%, #FDE68A 50%, #78350F 100%)',
  },
  'fiestas-patrias': {
    id: 'fiestas-patrias',
    name: 'Fiestas Patrias México',
    tag: 'Viva México & Tradición',
    category: 'seasonal',
    monthOrSeason: 'Septiembre',
    icon: '🇲🇽',
    bg: '#08120B',
    glow1: '#16A34A',
    glow2: '#DC2626',
    headerBg: 'rgba(8, 18, 11, 0.88)',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(22, 163, 74, 0.35)',
    primaryColor: '#22C55E',
    secondaryColor: '#EF4444',
    accentColor: '#FBBF24',
    textColor: '#F0FDF4',
    mutedColor: '#DCFCE7',
    priceColor: '#4ADE80',
    badgeBg: 'rgba(22, 163, 74, 0.22)',
    badgeText: '#86EFAC',
    bgWallpaperUrl: '/wallpapers/fiestas-patrias.jpg',
    wallpaperOverlay: 'rgba(10, 16, 11, 0.42)',
    stickerEmoji: '🇲🇽',
    stickerSecondaryEmoji: '🎺',
    stickerTag: 'Viva México',
    cardBorderAccent: 'linear-gradient(90deg, #16A34A 0%, #FFFFFF 50%, #DC2626 100%)',
  },
  'otono-pumpkin': {
    id: 'otono-pumpkin',
    name: 'Otoño & Pumpkin Spice',
    tag: 'Canela, Nuez & Especias',
    category: 'seasonal',
    monthOrSeason: 'Septiembre - Octubre',
    icon: '🍂',
    bg: '#110804',
    glow1: '#EA580C',
    glow2: '#9A3412',
    headerBg: 'rgba(17, 8, 4, 0.88)',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(234, 88, 12, 0.32)',
    primaryColor: '#F97316',
    secondaryColor: '#C2410C',
    accentColor: '#FDBA74',
    textColor: '#FFF7ED',
    mutedColor: '#FFEDD5',
    priceColor: '#FB923C',
    badgeBg: 'rgba(234, 88, 12, 0.22)',
    badgeText: '#FED7AA',
    bgWallpaperUrl: 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=1920&q=80',
    wallpaperOverlay: 'rgba(17, 8, 4, 0.45)',
    stickerEmoji: '🍂',
    stickerSecondaryEmoji: '🎃',
    stickerTag: 'Otoño & Especias',
    cardBorderAccent: 'linear-gradient(90deg, #EA580C 0%, #FDBA74 50%, #9A3412 100%)',
  },

  // =========================================================================
  // ☕ 5 PLANTILLAS CLÁSICAS & ATEMPORALES
  // =========================================================================
  'cinepolis-gold': {
    id: 'cinepolis-gold',
    name: 'Oro Negro & Gala',
    tag: 'Gala & Ámbar',
    category: 'classic',
    monthOrSeason: 'Todo el año',
    icon: '✨',
    bg: '#0A0807',
    glow1: '#F59E0B',
    glow2: '#B45309',
    headerBg: 'rgba(0, 0, 0, 0.75)',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(245, 158, 11, 0.25)',
    primaryColor: '#F59E0B',
    secondaryColor: '#B45309',
    accentColor: '#FBBF24',
    textColor: '#FFFFFF',
    mutedColor: '#E2D9D2',
    priceColor: '#F59E0B',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeText: '#FCD34D',
    bgWallpaperUrl: '/wallpapers/cinepolis-vip.jpg',
    wallpaperOverlay: 'rgba(10, 8, 6, 0.40)',
    stickerEmoji: '✨',
    stickerSecondaryEmoji: '⭐',
    stickerTag: 'Noche de Gala',
    cardBorderAccent: 'linear-gradient(90deg, #F59E0B 0%, #FDE047 50%, #B45309 100%)',
  },
  'specialty-coffee': {
    id: 'specialty-coffee',
    name: 'Café de Especialidad',
    tag: 'Artesanal Tostado',
    category: 'classic',
    monthOrSeason: 'Todo el año',
    icon: '☕',
    bg: '#0F0B08',
    glow1: '#C08552',
    glow2: '#5E3023',
    headerBg: 'rgba(15, 11, 8, 0.85)',
    cardBg: 'rgba(192, 133, 82, 0.08)',
    cardBorder: 'rgba(192, 133, 82, 0.35)',
    primaryColor: '#C08552',
    secondaryColor: '#5E3023',
    accentColor: '#D4A373',
    textColor: '#FDFBF7',
    mutedColor: '#D7CCC8',
    priceColor: '#E0A96D',
    badgeBg: 'rgba(192, 133, 82, 0.2)',
    badgeText: '#E6CCB2',
    bgWallpaperUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1920&q=80',
    wallpaperOverlay: 'rgba(15, 11, 8, 0.85)',
    stickerEmoji: '☕',
    stickerSecondaryEmoji: '✨',
    stickerTag: 'Café Artesanal',
    cardBorderAccent: 'linear-gradient(90deg, #C08552 0%, #D4A373 50%, #5E3023 100%)',
  },
  'matcha-emerald': {
    id: 'matcha-emerald',
    name: 'Matcha & Esmeralda',
    tag: 'Bistro Botánico',
    category: 'classic',
    monthOrSeason: 'Todo el año',
    icon: '🍵',
    bg: '#06130D',
    glow1: '#10B981',
    glow2: '#064E3B',
    headerBg: 'rgba(6, 19, 13, 0.85)',
    cardBg: 'rgba(16, 185, 129, 0.07)',
    cardBorder: 'rgba(16, 185, 129, 0.28)',
    primaryColor: '#10B981',
    secondaryColor: '#064E3B',
    accentColor: '#34D399',
    textColor: '#ECFDF5',
    mutedColor: '#A7F3D0',
    priceColor: '#34D399',
    badgeBg: 'rgba(16, 185, 129, 0.18)',
    badgeText: '#6EE7B7',
    bgWallpaperUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1920&q=80',
    wallpaperOverlay: 'rgba(6, 19, 13, 0.85)',
    stickerEmoji: '🍵',
    stickerSecondaryEmoji: '🌿',
    stickerTag: 'Matcha Orgánico',
    cardBorderAccent: 'linear-gradient(90deg, #10B981 0%, #6EE7B7 50%, #064E3B 100%)',
  },
  'midnight-neon': {
    id: 'midnight-neon',
    name: 'Midnight Neón',
    tag: 'Boutique Urbana',
    category: 'classic',
    monthOrSeason: 'Todo el año',
    icon: '🌌',
    bg: '#090814',
    glow1: '#EC4899',
    glow2: '#8B5CF6',
    headerBg: 'rgba(9, 8, 20, 0.85)',
    cardBg: 'rgba(139, 92, 246, 0.09)',
    cardBorder: 'rgba(236, 72, 153, 0.32)',
    primaryColor: '#EC4899',
    secondaryColor: '#8B5CF6',
    accentColor: '#F472B6',
    textColor: '#FAF5FF',
    mutedColor: '#DDD6FE',
    priceColor: '#F472B6',
    badgeBg: 'rgba(236, 72, 153, 0.2)',
    badgeText: '#FBCFE8',
    bgWallpaperUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=80',
    wallpaperOverlay: 'rgba(9, 8, 20, 0.85)',
    stickerEmoji: '🌌',
    stickerSecondaryEmoji: '⚡',
    stickerTag: 'Midnight Neón',
    cardBorderAccent: 'linear-gradient(90deg, #EC4899 0%, #DDD6FE 50%, #8B5CF6 100%)',
  },
  'clean-marble': {
    id: 'clean-marble',
    name: 'Mármol Blanco (Modo Día)',
    tag: 'Luz Natural',
    category: 'classic',
    monthOrSeason: 'Todo el año',
    icon: '🏛️',
    bg: '#F8F6F0',
    glow1: '#E2D9D2',
    glow2: '#D7CCC8',
    headerBg: 'rgba(255, 255, 255, 0.95)',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(43, 23, 18, 0.12)',
    primaryColor: '#C08552',
    secondaryColor: '#8C5338',
    accentColor: '#B45309',
    textColor: '#24140E',
    mutedColor: '#6B5E55',
    priceColor: '#B45309',
    badgeBg: 'rgba(192, 133, 82, 0.12)',
    badgeText: '#78350F',
    isLight: true,
    bgWallpaperUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80',
    wallpaperOverlay: 'rgba(248, 246, 240, 0.88)',
    stickerEmoji: '🏛️',
    stickerSecondaryEmoji: '☕',
    stickerTag: 'Mármol Blanco',
    cardBorderAccent: 'linear-gradient(90deg, #C08552 0%, #E2D9D2 50%, #8C5338 100%)',
  },
}



export default function DisplayClient({
  initialBusiness,
  initialCategories,
}: DisplayClientProps) {
  const [business] = useState<BusinessData>(initialBusiness)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Configuración de pantalla
  const [screenMode, setScreenMode] = useState<ScreenMode>('ROTATING')
  const [selectedThemeId, setSelectedThemeId] = useState<string>('cinepolis-gold')
  const [isPaused, setIsPaused] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [showConfigMenu, setShowConfigMenu] = useState(false)
  const [slideDuration, setSlideDuration] = useState(12) // segundos por slide
  const [progress, setProgress] = useState(0)

  // Personalización de Nombres de Temas, Fondos, Stickers y Colores
  const [customThemeNames, setCustomThemeNames] = useState<Record<string, string>>({})
  const [showWallpaper, setShowWallpaper] = useState<boolean>(true)
  const [wallpaperOpacity, setWallpaperOpacity] = useState<number>(0.60)
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string>('')
  const [showStickers, setShowStickers] = useState<boolean>(true)
  const [customStickerEmoji, setCustomStickerEmoji] = useState<string>('')
  const [customStickerTag, setCustomStickerTag] = useState<string>('')
  const [customColors, setCustomColors] = useState<CustomDisplayColors>({
    enabled: false,
    primaryColor: '#DC2626',
    secondaryColor: '#15803D',
    accentColor: '#FFFFFF',
    priceColor: '#FEF08A',
    textColor: '#FFFFFF',
  })
  const [settingsTab, setSettingsTab] = useState<'themes' | 'colors' | 'stickers' | 'wallpaper' | 'screen'>('themes')
  const [themesFilter, setThemesFilter] = useState<'all' | 'seasonal' | 'classic'>('all')
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [tempThemeName, setTempThemeName] = useState<string>('')

  // Tema activo resuelto (con nombre, stickers y colores personalizados si existen)
  const activeTheme: DisplayThemeConfig = useMemo(() => {
    let baseConfig: DisplayThemeConfig
    if (selectedThemeId === 'brand-theme') {
      const pColor = business.theme?.primaryColor || '#C08552'
      const sColor = business.theme?.secondaryColor || '#5E3023'
      const aColor = business.theme?.accentColor || '#C08552'
      baseConfig = {
        id: 'brand-theme',
        name: 'Identidad de Marca',
        tag: 'Personalizado',
        category: 'classic',
        monthOrSeason: 'Todo el año',
        icon: '🏢',
        bg: '#0D0A08',
        glow1: pColor,
        glow2: sColor,
        headerBg: 'rgba(13, 10, 8, 0.85)',
        cardBg: 'rgba(255, 255, 255, 0.05)',
        cardBorder: `${pColor}40`,
        primaryColor: pColor,
        secondaryColor: sColor,
        accentColor: aColor,
        textColor: '#FFFFFF',
        mutedColor: '#D1C7BD',
        priceColor: aColor,
        badgeBg: `${pColor}25`,
        badgeText: aColor,
        bgWallpaperUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1920&q=80',
        wallpaperOverlay: 'rgba(13, 10, 8, 0.85)',
        stickerEmoji: '🏢',
        stickerTag: business.name || 'Marca',
        cardBorderAccent: `linear-gradient(90deg, ${pColor} 0%, ${aColor} 50%, ${sColor} 100%)`,
      }
    } else {
      baseConfig = DISPLAY_THEMES[selectedThemeId] || DISPLAY_THEMES['cinepolis-gold']
    }

    // Sobrescritura de nombre personalizado
    const customName = customThemeNames[baseConfig.id]?.trim()
    if (customName) {
      baseConfig = { ...baseConfig, name: customName }
    }

    // Sobrescritura de colores personalizados si están habilitados
    if (customColors.enabled) {
      baseConfig = {
        ...baseConfig,
        primaryColor: customColors.primaryColor || baseConfig.primaryColor,
        secondaryColor: customColors.secondaryColor || baseConfig.secondaryColor,
        accentColor: customColors.accentColor || baseConfig.accentColor,
        priceColor: customColors.priceColor || baseConfig.priceColor,
        textColor: customColors.textColor || baseConfig.textColor,
        glow1: customColors.primaryColor || baseConfig.glow1,
        glow2: customColors.secondaryColor || baseConfig.glow2,
        cardBorder: `${customColors.primaryColor || baseConfig.primaryColor}50`,
        cardBorderAccent: `linear-gradient(90deg, ${customColors.primaryColor} 0%, ${customColors.accentColor} 50%, ${customColors.secondaryColor} 100%)`,
      }
    }

    // Sobrescritura de sticker personalizado si existe
    if (customStickerEmoji.trim()) {
      baseConfig = {
        ...baseConfig,
        stickerEmoji: customStickerEmoji.trim(),
      }
    }
    if (customStickerTag.trim()) {
      baseConfig = {
        ...baseConfig,
        stickerTag: customStickerTag.trim(),
      }
    }

    return baseConfig
  }, [selectedThemeId, business.theme, business.name, customThemeNames, customColors, customStickerEmoji, customStickerTag])

  // Identificar productos destacados (Nuevos o De Temporada)
  const featuredProducts = useMemo(() => {
    const list: Product[] = []
    categories.forEach((cat) => {
      cat.products.forEach((p) => {
        if (p.isNew || p.isSeasonal) {
          list.push(p)
        }
      })
    })
    return list
  }, [categories])

  // Categorías de bebidas vs alimentos
  const drinkCategories = useMemo(() => {
    return categories.filter((c) => {
      const lower = c.name.toLowerCase()
      return (
        lower.includes('café') ||
        lower.includes('cafe') ||
        lower.includes('bebida') ||
        lower.includes('frappe') ||
        lower.includes('té') ||
        lower.includes('te') ||
        lower.includes('latte') ||
        lower.includes('cold brew') ||
        lower.includes('jugo') ||
        lower.includes('smoothie')
      )
    })
  }, [categories])

  const foodCategories = useMemo(() => {
    return categories.filter((c) => !drinkCategories.some((dc) => dc.id === c.id))
  }, [categories, drinkCategories])

  // Cargar modo, tema, fondos, stickers y colores desde localStorage o URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlMode = params.get('mode') as ScreenMode | null
      const urlTheme = params.get('theme') as string | null
      const savedMode = localStorage.getItem('poscafe_display_mode') as ScreenMode | null
      const savedTheme = localStorage.getItem('poscafe_display_theme')

      if (urlMode) {
        setScreenMode(urlMode)
      } else if (savedMode) {
        setScreenMode(savedMode)
      }

      if (urlTheme && (DISPLAY_THEMES[urlTheme] || urlTheme === 'brand-theme')) {
        setSelectedThemeId(urlTheme)
      } else if (savedTheme && (DISPLAY_THEMES[savedTheme] || savedTheme === 'brand-theme')) {
        setSelectedThemeId(savedTheme)
      }

      // Cargar nombres personalizados
      try {
        const savedNames = localStorage.getItem('poscafe_display_custom_names')
        if (savedNames) {
          setCustomThemeNames(JSON.parse(savedNames))
        }
      } catch {}

      // Cargar opciones de fondo de pantalla
      const savedShowWp = localStorage.getItem('poscafe_display_show_wallpaper')
      if (savedShowWp !== null) {
        setShowWallpaper(savedShowWp === 'true')
      }

      const savedWpOpacity = localStorage.getItem('poscafe_display_wallpaper_opacity')
      if (savedWpOpacity) {
        const parsed = parseFloat(savedWpOpacity)
        if (!isNaN(parsed)) setWallpaperOpacity(parsed)
      }

      const savedCustomWp = localStorage.getItem('poscafe_display_custom_wallpaper')
      if (savedCustomWp) {
        setCustomWallpaperUrl(savedCustomWp)
      }

      // Cargar opciones de stickers temáticos
      const savedStickers = localStorage.getItem('poscafe_display_show_stickers')
      if (savedStickers !== null) {
        setShowStickers(savedStickers === 'true')
      }
      const savedStickerEmoji = localStorage.getItem('poscafe_display_custom_sticker_emoji')
      if (savedStickerEmoji) setCustomStickerEmoji(savedStickerEmoji)
      const savedStickerTag = localStorage.getItem('poscafe_display_custom_sticker_tag')
      if (savedStickerTag) setCustomStickerTag(savedStickerTag)

      // Cargar colores personalizados
      try {
        const savedColors = localStorage.getItem('poscafe_display_custom_colors')
        if (savedColors) {
          setCustomColors(JSON.parse(savedColors))
        }
      } catch {}
    }
  }, [])

  // Sincronización en caliente entre pestañas / dashboard
  useEffect(() => {
    const handleSync = () => {
      try {
        const savedTheme = localStorage.getItem('poscafe_display_theme')
        if (savedTheme && (DISPLAY_THEMES[savedTheme] || savedTheme === 'brand-theme')) {
          setSelectedThemeId(savedTheme)
        }

        const savedNames = localStorage.getItem('poscafe_display_custom_names')
        if (savedNames) {
          setCustomThemeNames(JSON.parse(savedNames))
        }

        const savedShowWp = localStorage.getItem('poscafe_display_show_wallpaper')
        if (savedShowWp !== null) {
          setShowWallpaper(savedShowWp === 'true')
        }

        const savedWpOpacity = localStorage.getItem('poscafe_display_wallpaper_opacity')
        if (savedWpOpacity) {
          const parsed = parseFloat(savedWpOpacity)
          if (!isNaN(parsed)) setWallpaperOpacity(parsed)
        }

        const savedCustomWp = localStorage.getItem('poscafe_display_custom_wallpaper')
        if (savedCustomWp !== null) {
          setCustomWallpaperUrl(savedCustomWp)
        }

        const savedStickers = localStorage.getItem('poscafe_display_show_stickers')
        if (savedStickers !== null) {
          setShowStickers(savedStickers === 'true')
        }
        const savedStickerEmoji = localStorage.getItem('poscafe_display_custom_sticker_emoji')
        if (savedStickerEmoji !== null) setCustomStickerEmoji(savedStickerEmoji)
        const savedStickerTag = localStorage.getItem('poscafe_display_custom_sticker_tag')
        if (savedStickerTag !== null) setCustomStickerTag(savedStickerTag)

        const savedColors = localStorage.getItem('poscafe_display_custom_colors')
        if (savedColors) {
          setCustomColors(JSON.parse(savedColors))
        }
      } catch {}
    }

    window.addEventListener('poscafe:theme-updated', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener('poscafe:theme-updated', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  const handleModeChange = (mode: ScreenMode) => {
    setScreenMode(mode)
    setCurrentSlideIndex(0)
    setProgress(0)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_mode', mode)
    }
  }

  const handleThemeChange = (themeId: string) => {
    setSelectedThemeId(themeId)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_theme', themeId)
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { displayThemeId: themeId },
        })
      )
    }
  }

  const handleSaveCustomThemeName = (themeId: string, newName: string) => {
    const trimmed = newName.trim()
    const updated = { ...customThemeNames }
    if (trimmed) {
      updated[themeId] = trimmed
    } else {
      delete updated[themeId]
    }
    setCustomThemeNames(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_custom_names', JSON.stringify(updated))
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { customThemeNames: updated },
        })
      )
    }
    setEditingThemeId(null)
    setTempThemeName('')
  }

  const handleResetThemeName = (themeId: string) => {
    const updated = { ...customThemeNames }
    delete updated[themeId]
    setCustomThemeNames(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_custom_names', JSON.stringify(updated))
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { customThemeNames: updated },
        })
      )
    }
    setEditingThemeId(null)
    setTempThemeName('')
  }

  const handleToggleWallpaper = (enabled: boolean) => {
    setShowWallpaper(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_show_wallpaper', String(enabled))
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { showWallpaper: enabled },
        })
      )
    }
  }

  const handleWallpaperOpacityChange = (opacity: number) => {
    setWallpaperOpacity(opacity)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_wallpaper_opacity', String(opacity))
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { wallpaperOpacity: opacity },
        })
      )
    }
  }

  const handleCustomWallpaperChange = (url: string) => {
    setCustomWallpaperUrl(url)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_custom_wallpaper', url)
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { customWallpaperUrl: url },
        })
      )
    }
  }

  const handleToggleShowStickers = (enabled: boolean) => {
    setShowStickers(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_show_stickers', String(enabled))
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { showStickers: enabled },
        })
      )
    }
  }

  const handleSaveCustomStickers = (emoji: string, tag: string) => {
    setCustomStickerEmoji(emoji)
    setCustomStickerTag(tag)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_custom_sticker_emoji', emoji)
      localStorage.setItem('poscafe_display_custom_sticker_tag', tag)
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { customStickerEmoji: emoji, customStickerTag: tag },
        })
      )
    }
  }

  const handleToggleCustomColors = (enabled: boolean) => {
    const updated = { ...customColors, enabled }
    setCustomColors(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_custom_colors', JSON.stringify(updated))
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { customColors: updated },
        })
      )
    }
  }

  const handleApplyQuickPalette = (paletteColors: Omit<CustomDisplayColors, 'enabled'>) => {
    const updated: CustomDisplayColors = {
      enabled: true,
      ...paletteColors,
    }
    setCustomColors(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_custom_colors', JSON.stringify(updated))
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { customColors: updated },
        })
      )
    }
  }

  const handleUpdateCustomColor = (key: keyof Omit<CustomDisplayColors, 'enabled'>, value: string) => {
    const updated: CustomDisplayColors = {
      ...customColors,
      enabled: true,
      [key]: value,
    }
    setCustomColors(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_custom_colors', JSON.stringify(updated))
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { customColors: updated },
        })
      )
    }
  }

  const handleResetCustomColors = () => {
    const currentBase = DISPLAY_THEMES[selectedThemeId] || DISPLAY_THEMES['cinepolis-gold']
    const updated: CustomDisplayColors = {
      enabled: false,
      primaryColor: currentBase.primaryColor,
      secondaryColor: currentBase.secondaryColor,
      accentColor: currentBase.accentColor,
      priceColor: currentBase.priceColor,
      textColor: currentBase.textColor,
    }
    setCustomColors(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poscafe_display_custom_colors', JSON.stringify(updated))
      window.dispatchEvent(
        new CustomEvent('poscafe:theme-updated', {
          detail: { customColors: updated },
        })
      )
    }
  }

  // Generar lista de slides a rotar según el modo.
  // Paginación inteligente: si una categoría tiene más de 4 productos, la dividimos en páginas de hasta 4
  // para que cada producto conserve FOTOS GRANDES, TÍTULOS GRANDES y SABORES EN LISTA sin amontonarse.
  const slides = useMemo(() => {
    const ITEMS_PER_SLIDE = 4

    const createCategorySlides = (cats: Category[]) => {
      const catSlides: Array<{
        type: 'category'
        title: string
        category: Category
        products: Product[]
        pageNumber: number
        totalPages: number
      }> = []

      cats.forEach((cat) => {
        const totalItems = cat.products.length
        if (totalItems <= ITEMS_PER_SLIDE) {
          catSlides.push({
            type: 'category',
            title: cat.name,
            category: cat,
            products: cat.products,
            pageNumber: 1,
            totalPages: 1,
          })
        } else {
          const totalPages = Math.ceil(totalItems / ITEMS_PER_SLIDE)
          for (let p = 0; p < totalPages; p++) {
            const pageProducts = cat.products.slice(p * ITEMS_PER_SLIDE, (p + 1) * ITEMS_PER_SLIDE)
            catSlides.push({
              type: 'category',
              title: `${cat.name} (${p + 1}/${totalPages})`,
              category: cat,
              products: pageProducts,
              pageNumber: p + 1,
              totalPages,
            })
          }
        }
      })

      return catSlides
    }

    if (screenMode === 'FEATURED') {
      return [{ type: 'featured' as const, title: 'Especialidades & Novedades', data: featuredProducts }]
    }

    if (screenMode === 'DRINKS') {
      return createCategorySlides(drinkCategories)
    }

    if (screenMode === 'FOOD') {
      return createCategorySlides(foodCategories)
    }

    if (screenMode === 'ALL_STATIC') {
      return [{ type: 'all_static' as const, title: 'Menú Completo' }]
    }

    // MODO ROTATING (Cinépolis):
    const list: Array<
      | { type: 'featured'; title: string; data: Product[] }
      | {
          type: 'category'
          title: string
          category: Category
          products: Product[]
          pageNumber: number
          totalPages: number
        }
    > = []

    if (featuredProducts.length > 0) {
      list.push({
        type: 'featured',
        title: 'Novedades & Temporada',
        data: featuredProducts,
      })
    }

    // Diapositivas de categorías con paginación amplia
    const categorySlides = createCategorySlides(categories)
    categorySlides.forEach((cs) => list.push(cs))

    return list.length > 0 ? list : [{ type: 'all_static' as const, title: 'Menú' }]
  }, [screenMode, featuredProducts, categories, drinkCategories, foodCategories])

  // Temporizador de rotación de slides con barra de progreso fluida
  useEffect(() => {
    if (slides.length <= 1 || isPaused || screenMode === 'ALL_STATIC') {
      setProgress(0)
      return
    }

    const intervalMs = 100
    const step = 100 / ((slideDuration * 1000) / intervalMs)

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlideIndex((oldIdx) => (oldIdx + 1) % slides.length)
          return 0
        }
        return prev + step
      })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [slides.length, isPaused, slideDuration, screenMode])

  // Montaje en cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-refresco en segundo plano cada 60 segundos
  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        setIsUpdating(true)
        const res = await fetch(`/api/public/display?b=${business.id}`)
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data?.categories) {
            setCategories(json.data.categories)
          }
        }
      } catch (err) {
        console.error('Error auto-refreshing display:', err)
      } finally {
        setIsUpdating(false)
      }
    }

    const interval = setInterval(fetchLatestData, 60000)
    return () => clearInterval(interval)
  }, [business.id])

  // Manejo de pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
        setIsFullscreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const currentSlide = slides[currentSlideIndex] || slides[0]

  // Alternancia dinámica del logo superior (Esquina izquierda ↔ Esquina derecha según la diapositiva)
  const isLogoTopLeft = currentSlideIndex % 2 === 0
  const isLogoTopRight = !isLogoTopLeft

  // Renderizar logo grande, libre y adaptado en la parte superior
  const renderBrandLogo = (extraClass = '', sizeClass = 'h-14 sm:h-18 lg:h-20 xl:h-24') => {
    return (
      <motion.div
        key={`top-logo-${isLogoTopLeft ? 'left' : 'right'}`}
        initial={{ opacity: 0, scale: 0.9, x: isLogoTopLeft ? -15 : 15 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: isLogoTopLeft ? -15 : 15 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`flex items-center shrink-0 select-none ${extraClass}`}
      >
        {business.logoUrl ? (
          <img
            src={business.logoUrl}
            alt={business.name}
            className={`${sizeClass} w-auto max-w-[220px] sm:max-w-[280px] lg:max-w-[340px] object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.7)] select-none`}
          />
        ) : business.isotypeUrl ? (
          <img
            src={business.isotypeUrl}
            alt={business.name}
            className={`${sizeClass} w-auto object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)] select-none`}
          />
        ) : (
          <div className="flex items-center gap-3">
            <Coffee
              className="w-10 h-10 sm:w-14 sm:h-14 drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
              style={{ color: activeTheme.accentColor }}
            />
            <span
              className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-wider drop-shadow-md"
              style={{ color: activeTheme.textColor }}
            >
              {business.name}
            </span>
          </div>
        )}
      </motion.div>
    )
  }

  // Renderizar ícono barista de placeholder para productos sin foto
  const renderProductPlaceholder = (catName?: string) => {
    const lower = (catName || '').toLowerCase()
    if (lower.includes('fría') || lower.includes('fria') || lower.includes('cold') || lower.includes('frapp')) {
      return <ColdDrinkIcon className="w-14 h-14 opacity-50" color={activeTheme.accentColor} />
    }
    if (lower.includes('café') || lower.includes('cafe') || lower.includes('espresso') || lower.includes('latte')) {
      return <MokaPotIcon className="w-14 h-14 opacity-50" color={activeTheme.accentColor} />
    }
    if (lower.includes('té') || lower.includes('te') || lower.includes('tisana')) {
      return <CoffeeBranchVector className="w-14 h-14 opacity-50" color={activeTheme.accentColor} />
    }
    return <Coffee className="w-14 h-14 opacity-50" style={{ color: activeTheme.accentColor }} />
  }

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col justify-between select-none relative font-sans transition-colors duration-500"
      style={{
        backgroundColor: activeTheme.bg,
        color: activeTheme.textColor,
      }}
    >
      {/* CAPA DE FONDO CINEMATOGRÁFICO TEMÁTICO (WALLPAPER CON OVERLAY PROTECTOR) */}
      {showWallpaper && (customWallpaperUrl || activeTheme.bgWallpaperUrl) && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={customWallpaperUrl || activeTheme.bgWallpaperUrl}
            alt="Fondo temático"
            className="w-full h-full object-cover select-none transition-all duration-700 scale-[1.02]"
            style={{ opacity: wallpaperOpacity }}
          />
          {/* Overlay sutil con gradiente: centro despejado y visible, sutil viñeta en bordes */}
          <div
            className="absolute inset-0 transition-colors duration-700"
            style={{
              backgroundColor: activeTheme.wallpaperOverlay || 'rgba(10, 8, 7, 0.45)',
              backgroundImage: 'radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.40) 100%)',
            }}
          />
        </div>
      )}

      {/* GLOWS CINEMATOGRÁFICOS DE AMBIENTACIÓN */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 left-1/4 w-[750px] h-[750px] rounded-full blur-[220px] opacity-25 transition-all duration-700"
          style={{ backgroundColor: activeTheme.glow1 }}
        />
        <div
          className="absolute -bottom-40 right-1/4 w-[750px] h-[750px] rounded-full blur-[240px] opacity-20 transition-all duration-700"
          style={{ backgroundColor: activeTheme.glow2 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      </div>

      {/* BARRA DE PROGRESO DE ROTACIÓN SUPERIOR (ESTILO CINÉPOLIS) */}
      {slides.length > 1 && screenMode !== 'ALL_STATIC' && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-white/10 z-50">
          <div
            className="h-full transition-all duration-100 ease-linear shadow-lg"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(to right, ${activeTheme.primaryColor}, ${activeTheme.accentColor})`,
              boxShadow: `0 0 12px ${activeTheme.accentColor}80`,
            }}
          />
        </div>
      )}

      {/* INDICADOR INFERIOR DE SLIDES (PUNTITOS DISCRETOS SI HAY ROTACIÓN) */}
      {slides.length > 1 && screenMode !== 'ALL_STATIC' && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-md shadow-2xl transition-all"
          style={{
            backgroundColor: activeTheme.isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)',
            borderColor: activeTheme.cardBorder,
          }}
        >
          {slides.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCurrentSlideIndex(idx)
                setProgress(0)
              }}
              className={`transition-all rounded-full cursor-pointer ${
                currentSlideIndex === idx
                  ? 'w-7 h-2 shadow-sm'
                  : 'w-2 h-2 opacity-30 hover:opacity-60'
              }`}
              style={{
                backgroundColor: currentSlideIndex === idx ? activeTheme.accentColor : activeTheme.textColor,
                boxShadow: currentSlideIndex === idx ? `0 0 8px ${activeTheme.accentColor}` : 'none',
              }}
              title={s.title}
            />
          ))}
          <span
            className="text-[11px] font-mono ml-1 font-bold"
            style={{ color: activeTheme.mutedColor }}
          >
            {currentSlideIndex + 1}/{slides.length}
          </span>
        </div>
      )}

      {/* CONTROLES FLOTANTES DISCRETOS DE PANTALLA TV (OCULTOS / SUTILES) */}
      <div className="fixed bottom-4 right-6 z-50 flex items-center gap-1.5 opacity-20 hover:opacity-100 transition-all duration-300 p-1.5 rounded-2xl backdrop-blur-xl bg-black/50 border border-white/10 shadow-2xl">
        {/* Botón Pausa / Reproducir rotación */}
        {slides.length > 1 && screenMode !== 'ALL_STATIC' && (
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="w-8 h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
              borderColor: activeTheme.cardBorder,
              color: activeTheme.textColor,
            }}
            title={isPaused ? 'Reanudar rotación' : 'Pausar rotación'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Configuración de Pantalla y Tema */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowConfigMenu(!showConfigMenu)}
            className="w-8 h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: showConfigMenu
                ? `${activeTheme.primaryColor}30`
                : activeTheme.isLight
                ? '#FFFFFF'
                : 'rgba(255,255,255,0.08)',
              borderColor: showConfigMenu ? activeTheme.primaryColor : activeTheme.cardBorder,
              color: showConfigMenu ? activeTheme.accentColor : activeTheme.textColor,
            }}
            title="Configuración de Pantalla & Tema"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {/* Menú Desplegable de Configuración de Pantalla TV con Pestañas */}
          {showConfigMenu && (
            <div
              className="absolute right-0 bottom-12 w-84 sm:w-96 max-h-[82vh] overflow-y-auto rounded-3xl border shadow-2xl backdrop-blur-2xl p-4.5 z-50 space-y-4 text-xs select-none overscroll-contain"
              style={{
                backgroundColor: activeTheme.isLight ? '#FFFFFFFA' : '#14100EFA',
                borderColor: activeTheme.cardBorder,
                color: activeTheme.textColor,
              }}
            >
              {/* CABECERA DEL MENÚ */}
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: activeTheme.cardBorder }}>
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4" style={{ color: activeTheme.accentColor }} />
                  <span className="text-xs font-black uppercase tracking-wider">Ajustes Menuboard TV</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfigMenu(false)
                    setEditingThemeId(null)
                  }}
                  className="w-6 h-6 rounded-lg flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-white/10 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* SEGMENTED CONTROL: PESTAÑAS */}
              <div
                className="grid grid-cols-3 p-1 rounded-2xl border gap-1 text-[11px] font-bold text-center"
                style={{
                  backgroundColor: activeTheme.isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                  borderColor: activeTheme.cardBorder,
                }}
              >
                <button
                  type="button"
                  onClick={() => setSettingsTab('themes')}
                  className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    settingsTab === 'themes' ? 'shadow-sm font-black' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={
                    settingsTab === 'themes'
                      ? {
                          backgroundColor: activeTheme.primaryColor,
                          color: '#FFFFFF',
                        }
                      : {}
                  }
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Temas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsTab('colors')}
                  className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    settingsTab === 'colors' ? 'shadow-sm font-black' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={
                    settingsTab === 'colors'
                      ? {
                          backgroundColor: activeTheme.primaryColor,
                          color: '#FFFFFF',
                        }
                      : {}
                  }
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Colores</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsTab('stickers')}
                  className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    settingsTab === 'stickers' ? 'shadow-sm font-black' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={
                    settingsTab === 'stickers'
                      ? {
                          backgroundColor: activeTheme.primaryColor,
                          color: '#FFFFFF',
                        }
                      : {}
                  }
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Stickers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsTab('wallpaper')}
                  className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    settingsTab === 'wallpaper' ? 'shadow-sm font-black' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={
                    settingsTab === 'wallpaper'
                      ? {
                          backgroundColor: activeTheme.primaryColor,
                          color: '#FFFFFF',
                        }
                      : {}
                  }
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Fondo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsTab('screen')}
                  className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    settingsTab === 'screen' ? 'shadow-sm font-black' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={
                    settingsTab === 'screen'
                      ? {
                          backgroundColor: activeTheme.primaryColor,
                          color: '#FFFFFF',
                        }
                      : {}
                  }
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Modo</span>
                </button>
              </div>

              {/* MODAL DE RENOMBRAR TEMA (SI ESTÁ ACTIVO) */}
              {editingThemeId && (
                <div
                  className="p-3.5 rounded-2xl border space-y-2.5 shadow-lg animate-in fade-in"
                  style={{
                    backgroundColor: activeTheme.isLight ? '#F1EBE4' : 'rgba(255,255,255,0.06)',
                    borderColor: activeTheme.accentColor,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase flex items-center gap-1.5">
                      <Pencil className="w-3 h-3" style={{ color: activeTheme.accentColor }} />
                      Renombrar plantilla
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingThemeId(null)
                        setTempThemeName('')
                      }}
                      className="text-[10px] opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <p className="text-[10px] opacity-75">
                    Plantilla original:{' '}
                    <strong>{DISPLAY_THEMES[editingThemeId]?.name || 'Identidad de Marca'}</strong>
                  </p>

                  <input
                    type="text"
                    value={tempThemeName}
                    onChange={(e) => setTempThemeName(e.target.value)}
                    placeholder="Nuevo nombre personalizado..."
                    className="w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none"
                    style={{
                      backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                      borderColor: activeTheme.cardBorder,
                      color: activeTheme.textColor,
                    }}
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveCustomThemeName(editingThemeId, tempThemeName)}
                      className="flex-1 py-1.5 px-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                      style={{
                        backgroundColor: activeTheme.accentColor,
                        color: '#000000',
                      }}
                    >
                      <Check className="w-3 h-3" />
                      <span>Guardar</span>
                    </button>

                    {customThemeNames[editingThemeId] && (
                      <button
                        type="button"
                        onClick={() => handleResetThemeName(editingThemeId)}
                        className="py-1.5 px-2.5 rounded-xl border font-semibold text-[10px] flex items-center gap-1 cursor-pointer opacity-70 hover:opacity-100"
                        style={{ borderColor: activeTheme.cardBorder }}
                        title="Restablecer nombre de fábrica"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restablecer</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* PESTAÑA 1: CATÁLOGO DE TEMAS & PLANTILLAS FESTIVAS       */}
              {/* ======================================================== */}
              {settingsTab === 'themes' && (
                <div className="space-y-3">
                  {/* Filtro de Categorías */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
                    {[
                      { id: 'all' as const, label: '✨ Todas (15)' },
                      { id: 'seasonal' as const, label: '🇲🇽 Festividades (10)' },
                      { id: 'classic' as const, label: '☕ Clásicas (5)' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setThemesFilter(f.id)}
                        className={`px-2.5 py-1 rounded-xl border whitespace-nowrap transition-all cursor-pointer font-bold ${
                          themesFilter === f.id ? 'ring-1' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor:
                            themesFilter === f.id
                              ? `${activeTheme.primaryColor}25`
                              : activeTheme.isLight
                              ? '#FFFFFF'
                              : 'rgba(255,255,255,0.04)',
                          borderColor: themesFilter === f.id ? activeTheme.primaryColor : activeTheme.cardBorder,
                          color: themesFilter === f.id ? activeTheme.accentColor : activeTheme.textColor,
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Lista de Temas */}
                  <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                    {Object.values(DISPLAY_THEMES)
                      .filter((th) => {
                        if (themesFilter === 'seasonal') return th.category === 'seasonal'
                        if (themesFilter === 'classic') return th.category === 'classic'
                        return true
                      })
                      .map((th) => {
                        const isCurrent = selectedThemeId === th.id
                        const displayName = customThemeNames[th.id] || th.name
                        const isRenamed = Boolean(customThemeNames[th.id])

                        return (
                          <div
                            key={th.id}
                            className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-2.5 select-none ${
                              isCurrent ? 'ring-2 shadow-md' : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{
                              backgroundColor: th.bg,
                              borderColor: isCurrent ? th.accentColor : 'rgba(255,255,255,0.12)',
                              color: th.textColor,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleThemeChange(th.id)}
                              className="flex-1 min-w-0 text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm shrink-0">{th.icon}</span>
                                <span className="text-[11px] font-black truncate">{displayName}</span>
                                {isRenamed && (
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                                    Editado
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[9px] opacity-70">
                                <span>{th.monthOrSeason || th.tag}</span>
                                <div className="flex items-center gap-1 ml-auto">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-white/20"
                                    style={{ backgroundColor: th.primaryColor }}
                                    title="Primario"
                                  />
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-white/20"
                                    style={{ backgroundColor: th.accentColor }}
                                    title="Acento"
                                  />
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingThemeId(th.id)
                                  setTempThemeName(displayName)
                                }}
                                className="p-1.5 rounded-lg border hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
                                style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                                title="Renombrar este tema"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              {isCurrent && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                            </div>
                          </div>
                        )
                      })}

                    {/* Tema personalizado de la marca */}
                    <div
                      className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-2.5 ${
                        selectedThemeId === 'brand-theme' ? 'ring-2 shadow-md' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: '#0D0A08',
                        borderColor:
                          selectedThemeId === 'brand-theme'
                            ? business.theme?.accentColor || '#C08552'
                            : 'rgba(255,255,255,0.12)',
                        color: '#FFFFFF',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleThemeChange('brand-theme')}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm shrink-0">🏢</span>
                          <span className="text-[11px] font-black truncate">
                            {customThemeNames['brand-theme'] || 'Identidad de Marca'}
                          </span>
                          <span className="text-[8px] px-1 py-0.2 rounded bg-white/15">SaaS Custom</span>
                        </div>
                        <p className="text-[9px] opacity-70 mt-0.5 truncate">
                          Aplica colores registrados de {business.name}
                        </p>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingThemeId('brand-theme')
                            setTempThemeName(customThemeNames['brand-theme'] || 'Identidad de Marca')
                          }}
                          className="p-1.5 rounded-lg border hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
                          style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                          title="Renombrar tema de la marca"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {selectedThemeId === 'brand-theme' && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* PESTAÑA: PERSONALIZACIÓN DE COLORES DE PANTALLA TV       */}
              {/* ======================================================== */}
              {settingsTab === 'colors' && (
                <div className="space-y-3.5">
                  {/* Interruptor de Colores Personalizados */}
                  <div
                    className="p-3 rounded-2xl border flex items-center justify-between gap-3"
                    style={{
                      backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                      borderColor: activeTheme.cardBorder,
                    }}
                  >
                    <div>
                      <span className="text-[11px] font-black block">Definir Colores Propios</span>
                      <p className="text-[9px] opacity-70">
                        {customColors.enabled ? 'Sobrescribiendo la paleta de la plantilla' : 'Usando colores originales de la plantilla'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleCustomColors(!customColors.enabled)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                        customColors.enabled ? 'bg-amber-500' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                          customColors.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Paletas Rápidas Temáticas (1 clic) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase opacity-70 block">
                      Paletas Rápidas Temáticas (1 clic)
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {QUICK_COLOR_PALETTES.map((pal) => (
                        <button
                          key={pal.id}
                          type="button"
                          onClick={() => handleApplyQuickPalette(pal.colors)}
                          className="p-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all hover:scale-[1.01] cursor-pointer group"
                          style={{
                            backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
                            borderColor: activeTheme.cardBorder,
                          }}
                        >
                          <span className="text-[11px] font-bold truncate group-hover:text-amber-400">
                            {pal.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: pal.colors.primaryColor }} title="Primario" />
                            <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: pal.colors.secondaryColor }} title="Secundario" />
                            <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: pal.colors.accentColor }} title="Acento" />
                            <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: pal.colors.priceColor }} title="Precio" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selectores de Color Detallados */}
                  <div
                    className="p-3 rounded-2xl border space-y-2.5"
                    style={{
                      backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                      borderColor: activeTheme.cardBorder,
                    }}
                  >
                    <span className="text-[10px] font-black uppercase opacity-70 block">
                      Ajuste Fino de Colores
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {/* Primario */}
                      <div className="space-y-1">
                        <label className="font-bold block opacity-80">Primario (Detalles)</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={customColors.primaryColor}
                            onChange={(e) => handleUpdateCustomColor('primaryColor', e.target.value)}
                            className="w-7 h-7 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={customColors.primaryColor}
                            onChange={(e) => handleUpdateCustomColor('primaryColor', e.target.value)}
                            className="w-full px-1.5 py-1 rounded-lg border text-[10px] font-mono uppercase"
                            style={{
                              backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                              borderColor: activeTheme.cardBorder,
                              color: activeTheme.textColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Secundario */}
                      <div className="space-y-1">
                        <label className="font-bold block opacity-80">Secundario (Glows)</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={customColors.secondaryColor}
                            onChange={(e) => handleUpdateCustomColor('secondaryColor', e.target.value)}
                            className="w-7 h-7 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={customColors.secondaryColor}
                            onChange={(e) => handleUpdateCustomColor('secondaryColor', e.target.value)}
                            className="w-full px-1.5 py-1 rounded-lg border text-[10px] font-mono uppercase"
                            style={{
                              backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                              borderColor: activeTheme.cardBorder,
                              color: activeTheme.textColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Acento */}
                      <div className="space-y-1">
                        <label className="font-bold block opacity-80">Acento (Etiquetas)</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={customColors.accentColor}
                            onChange={(e) => handleUpdateCustomColor('accentColor', e.target.value)}
                            className="w-7 h-7 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={customColors.accentColor}
                            onChange={(e) => handleUpdateCustomColor('accentColor', e.target.value)}
                            className="w-full px-1.5 py-1 rounded-lg border text-[10px] font-mono uppercase"
                            style={{
                              backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                              borderColor: activeTheme.cardBorder,
                              color: activeTheme.textColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Precios */}
                      <div className="space-y-1">
                        <label className="font-bold block opacity-80">Precios ($)</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={customColors.priceColor}
                            onChange={(e) => handleUpdateCustomColor('priceColor', e.target.value)}
                            className="w-7 h-7 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={customColors.priceColor}
                            onChange={(e) => handleUpdateCustomColor('priceColor', e.target.value)}
                            className="w-full px-1.5 py-1 rounded-lg border text-[10px] font-mono uppercase"
                            style={{
                              backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                              borderColor: activeTheme.cardBorder,
                              color: activeTheme.textColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Texto */}
                      <div className="space-y-1 col-span-2">
                        <label className="font-bold block opacity-80">Texto Principal</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={customColors.textColor}
                            onChange={(e) => handleUpdateCustomColor('textColor', e.target.value)}
                            className="w-7 h-7 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={customColors.textColor}
                            onChange={(e) => handleUpdateCustomColor('textColor', e.target.value)}
                            className="w-full px-1.5 py-1 rounded-lg border text-[10px] font-mono uppercase"
                            style={{
                              backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                              borderColor: activeTheme.cardBorder,
                              color: activeTheme.textColor,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetCustomColors}
                      className="w-full py-1.5 px-3 rounded-xl border text-[10px] font-bold opacity-75 hover:opacity-100 flex items-center justify-center gap-1 cursor-pointer mt-1"
                      style={{ borderColor: activeTheme.cardBorder }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restablecer a colores de la plantilla activa</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* PESTAÑA: STICKERS TEMÁTICOS & BORDES ADAPTABLES          */}
              {/* ======================================================== */}
              {settingsTab === 'stickers' && (
                <div className="space-y-3.5">
                  {/* Interruptor de Stickers */}
                  <div
                    className="p-3 rounded-2xl border flex items-center justify-between gap-3"
                    style={{
                      backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                      borderColor: activeTheme.cardBorder,
                    }}
                  >
                    <div>
                      <span className="text-[11px] font-black block">Stickers & Bordes Temáticos</span>
                      <p className="text-[9px] opacity-70">
                        {showStickers ? 'Mostrando sellos festivos y bordes adaptados' : 'Desactivados (Tarjetas estándar)'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleShowStickers(!showStickers)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                        showStickers ? 'bg-emerald-500' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                          showStickers ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {showStickers && (
                    <>
                      {/* Selector de Emoji Rápido */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase opacity-70 block">
                          Elegir Sticker Festivo
                        </span>
                        <div
                          className="flex flex-wrap gap-1.5 p-2 rounded-2xl border"
                          style={{
                            borderColor: activeTheme.cardBorder,
                            backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
                          }}
                        >
                          {[
                            { emoji: '🎄', tag: 'Navidad' },
                            { emoji: '🎅', tag: 'Nochebuena' },
                            { emoji: '🍾', tag: 'Año Nuevo' },
                            { emoji: '✨', tag: 'Gala VIP' },
                            { emoji: '🌸', tag: 'Primavera' },
                            { emoji: '🌼', tag: 'Flores' },
                            { emoji: '💀', tag: 'Día de Muertos' },
                            { emoji: '🇲🇽', tag: 'Viva México' },
                            { emoji: '💘', tag: 'San Valentín' },
                            { emoji: '🌹', tag: 'Amor' },
                            { emoji: '☕', tag: 'Artesanal' },
                            { emoji: '☀️', tag: 'Verano' },
                            { emoji: '🍂', tag: 'Otoño' },
                            { emoji: '💐', tag: 'Mamá' },
                            { emoji: '🎬', tag: 'Cine' },
                            { emoji: '⭐', tag: 'Estelar' },
                          ].map((item) => (
                            <button
                              key={item.emoji}
                              type="button"
                              onClick={() => {
                                setCustomStickerEmoji(item.emoji)
                                setCustomStickerTag(item.tag)
                                handleSaveCustomStickers(item.emoji, item.tag)
                              }}
                              className={`p-1.5 px-2 rounded-xl border text-sm flex items-center gap-1 transition-all cursor-pointer ${
                                (customStickerEmoji || activeTheme.stickerEmoji) === item.emoji
                                  ? 'ring-2 ring-amber-500 bg-amber-500/20'
                                  : 'opacity-70 hover:opacity-100 hover:bg-white/10'
                              }`}
                              style={{ borderColor: activeTheme.cardBorder }}
                              title={item.tag}
                            >
                              <span>{item.emoji}</span>
                              <span className="text-[9px] font-bold">{item.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sticker Personalizado manual */}
                      <div
                        className="p-3 rounded-2xl border space-y-2.5"
                        style={{
                          backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                          borderColor: activeTheme.cardBorder,
                        }}
                      >
                        <span className="text-[10px] font-black uppercase opacity-70 block">
                          Sticker o Texto Libre
                        </span>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold block opacity-80">Emoji</label>
                            <input
                              type="text"
                              value={customStickerEmoji}
                              placeholder={activeTheme.stickerEmoji || '🎁'}
                              onChange={(e) => {
                                setCustomStickerEmoji(e.target.value)
                                handleSaveCustomStickers(e.target.value, customStickerTag)
                              }}
                              className="w-full px-2 py-1.5 rounded-xl border text-center text-sm focus:outline-none"
                              style={{
                                backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                                borderColor: activeTheme.cardBorder,
                                color: activeTheme.textColor,
                              }}
                            />
                          </div>

                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-bold block opacity-80">Etiqueta del Sello</label>
                            <input
                              type="text"
                              value={customStickerTag}
                              placeholder={activeTheme.stickerTag || 'Edición Festiva'}
                              onChange={(e) => {
                                setCustomStickerTag(e.target.value)
                                handleSaveCustomStickers(customStickerEmoji, e.target.value)
                              }}
                              className="w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none"
                              style={{
                                backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                                borderColor: activeTheme.cardBorder,
                                color: activeTheme.textColor,
                              }}
                            />
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[10px]">
                          <span className="opacity-75">Vista Previa:</span>
                          <div
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-md border"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.65)',
                              borderColor: activeTheme.cardBorder,
                              color: activeTheme.textColor,
                            }}
                          >
                            <span className="text-sm">{customStickerEmoji || activeTheme.stickerEmoji || '✨'}</span>
                            <span className="font-black uppercase tracking-wider text-[9px]" style={{ color: activeTheme.accentColor }}>
                              {customStickerTag || activeTheme.stickerTag || 'Especial'}
                            </span>
                          </div>
                        </div>

                        {(customStickerEmoji || customStickerTag) && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomStickerEmoji('')
                              setCustomStickerTag('')
                              handleSaveCustomStickers('', '')
                            }}
                            className="w-full py-1.5 px-3 rounded-xl border text-[10px] font-bold opacity-75 hover:opacity-100 flex items-center justify-center gap-1 cursor-pointer"
                            style={{ borderColor: activeTheme.cardBorder }}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restablecer al sticker de la plantilla</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* PESTAÑA 2: FONDOS DE PANTALLA TEMÁTICOS (WALLPAPERS)     */}
              {/* ======================================================== */}
              {settingsTab === 'wallpaper' && (
                <div className="space-y-3.5">
                  {/* Interruptor de Wallpaper */}
                  <div
                    className="p-3 rounded-2xl border flex items-center justify-between gap-3"
                    style={{
                      backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                      borderColor: activeTheme.cardBorder,
                    }}
                  >
                    <div>
                      <span className="text-[11px] font-black block">Fondo de Pantalla Temático</span>
                      <p className="text-[9px] opacity-70">
                        {showWallpaper ? 'Activo con overlay de contraste' : 'Desactivado (Solo color sólido)'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleWallpaper(!showWallpaper)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                        showWallpaper ? 'bg-emerald-500' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                          showWallpaper ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {showWallpaper && (
                    <>
                      {/* Vista Previa del Fondo Activo */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase opacity-70 block">
                          Fondo Activo de la Plantilla
                        </span>
                        <div
                          className="w-full h-24 rounded-2xl border overflow-hidden relative shadow-inner"
                          style={{ borderColor: activeTheme.cardBorder }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={customWallpaperUrl || activeTheme.bgWallpaperUrl}
                            alt="Preview fondo"
                            className="w-full h-full object-cover"
                            style={{ opacity: wallpaperOpacity }}
                          />
                          <div
                            className="absolute inset-0 flex items-center justify-center p-2 text-center"
                            style={{ backgroundColor: activeTheme.wallpaperOverlay || 'rgba(0,0,0,0.6)' }}
                          >
                            <span className="text-[10px] font-bold text-white drop-shadow">
                              {customWallpaperUrl ? 'URL Personalizada Activa' : activeTheme.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Control Deslizante de Opacidad */}
                      <div
                        className="p-3 rounded-2xl border space-y-2"
                        style={{
                          backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                          borderColor: activeTheme.cardBorder,
                        }}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span>Opacidad del Fondo</span>
                          <span className="font-mono" style={{ color: activeTheme.accentColor }}>
                            {Math.round(wallpaperOpacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.20"
                          max="0.90"
                          step="0.05"
                          value={wallpaperOpacity}
                          onChange={(e) => handleWallpaperOpacityChange(parseFloat(e.target.value))}
                          className="w-full cursor-pointer accent-amber-500"
                        />
                        <p className="text-[9px] opacity-60 leading-tight">
                          El overlay tintado protege la legibilidad de precios y textos mientras el fondo aporta el ambiente temático.
                        </p>
                      </div>

                      {/* URL de Fondo Propio Personalizado */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase opacity-70 block">
                          URL de Fondo Propio (Opcional)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={customWallpaperUrl}
                            onChange={(e) => handleCustomWallpaperChange(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="flex-1 px-2.5 py-1.5 rounded-xl border text-[11px] focus:outline-none"
                            style={{
                              backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                              borderColor: activeTheme.cardBorder,
                              color: activeTheme.textColor,
                            }}
                          />
                          {customWallpaperUrl && (
                            <button
                              type="button"
                              onClick={() => handleCustomWallpaperChange('')}
                              className="px-2 py-1.5 rounded-xl border text-[10px] font-bold opacity-70 hover:opacity-100 cursor-pointer"
                              style={{ borderColor: activeTheme.cardBorder }}
                              title="Restablecer al fondo predeterminado de la plantilla"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* PESTAÑA 3: ROL DE PANTALLA & ROTACIÓN                    */}
              {/* ======================================================== */}
              {settingsTab === 'screen' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">
                      Rol de esta Pantalla
                    </span>
                    {[
                      { id: 'ROTATING' as ScreenMode, label: '🎬 Rotación Cinépolis', desc: 'Destacados y categorías con fotos grandes' },
                      { id: 'FEATURED' as ScreenMode, label: '✨ Solo Vitrina Estelar', desc: 'Novedades y platillos de temporada' },
                      { id: 'DRINKS' as ScreenMode, label: '☕ Solo Bebidas & Café', desc: 'Especial para TV sobre barra / cafetera' },
                      { id: 'FOOD' as ScreenMode, label: '🥐 Solo Pan & Alimentos', desc: 'Especial para TV sobre vitrina de postres' },
                      { id: 'ALL_STATIC' as ScreenMode, label: '📋 Vista Completa Fija', desc: 'Todas las categorías simultáneas' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleModeChange(opt.id)}
                        className={`w-full text-left p-2 rounded-2xl border text-xs transition-all flex flex-col cursor-pointer ${
                          screenMode === opt.id ? 'ring-1 font-bold' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor:
                            screenMode === opt.id
                              ? `${activeTheme.primaryColor}25`
                              : activeTheme.isLight
                              ? '#00000005'
                              : 'rgba(255,255,255,0.04)',
                          borderColor: screenMode === opt.id ? activeTheme.primaryColor : activeTheme.cardBorder,
                          color: screenMode === opt.id ? activeTheme.accentColor : activeTheme.textColor,
                        }}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] opacity-60 font-normal">{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Duración de transición */}
                  {screenMode === 'ROTATING' && (
                    <div className="pt-2 border-t" style={{ borderColor: activeTheme.cardBorder }}>
                      <div className="flex items-center justify-between text-[10px] font-semibold opacity-70 mb-1">
                        <span>Segundos por diapositiva</span>
                        <span className="font-mono font-bold" style={{ color: activeTheme.accentColor }}>
                          {slideDuration}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="30"
                        step="2"
                        value={slideDuration}
                        onChange={(e) => setSlideDuration(Number(e.target.value))}
                        className="w-full cursor-pointer accent-amber-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botón Pantalla Completa */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="w-8 h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
          style={{
            backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
            borderColor: activeTheme.cardBorder,
            color: activeTheme.textColor,
          }}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (TV)'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL A PANTALLA COMPLETA: ANIMACIÓN ENTRE SLIDES */}
      <main className="flex-1 min-h-0 relative z-10 px-6 sm:px-10 lg:px-12 py-4 sm:py-5 overflow-hidden flex flex-col justify-between h-full">
        <AnimatePresence mode="wait">
          {/* ======================================================== */}
          {/* SLIDE: VITRINA DESTACADOS / CARTELERA CINÉPOLIS          */}
          {/* ======================================================== */}
          {currentSlide.type === 'featured' && (
            <motion.div
              key="featured-slide"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
              className="h-full w-full flex flex-col justify-between"
            >
              {/* TÍTULO DE VITRINA ADAPTADO SEGÚN ESQUINA SUPERIOR DEL LOGO */}
              <div className="flex items-center justify-between mb-4 gap-6 shrink-0">
                {isLogoTopLeft ? (
                  <>
                    <div className="flex items-center gap-5 min-w-0">
                      {renderBrandLogo()}
                      <div className="h-12 w-px bg-white/15 hidden md:block shrink-0" />
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full animate-pulse shadow-md shrink-0"
                          style={{
                            backgroundColor: activeTheme.accentColor,
                            boxShadow: `0 0 14px ${activeTheme.accentColor}`,
                          }}
                        />
                        <div className="min-w-0">
                          <h2
                            className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-wider uppercase flex items-center gap-3 truncate"
                            style={{ color: activeTheme.textColor }}
                          >
                            <span>Cartelera de Temporada</span>
                            <span
                              className="text-xs lg:text-sm font-bold px-3 py-1 rounded-full text-white shadow-lg shrink-0"
                              style={{
                                background: `linear-gradient(to right, ${activeTheme.primaryColor}, ${activeTheme.accentColor})`,
                              }}
                            >
                              Edición Especial
                            </span>
                          </h2>
                        </div>
                      </div>
                    </div>
                    <div
                      className="hidden md:flex items-center gap-2 text-xs font-mono font-bold shrink-0"
                      style={{ color: activeTheme.accentColor }}
                    >
                      <Flame className="w-4 h-4 text-rose-500" />
                      <span>Lo más recomendado por nuestros baristas</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full animate-pulse shadow-md shrink-0"
                          style={{
                            backgroundColor: activeTheme.accentColor,
                            boxShadow: `0 0 14px ${activeTheme.accentColor}`,
                          }}
                        />
                        <h2
                          className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-wider uppercase flex items-center gap-3 truncate"
                          style={{ color: activeTheme.textColor }}
                        >
                          <span>Cartelera de Temporada</span>
                          <span
                            className="text-xs lg:text-sm font-bold px-3 py-1 rounded-full text-white shadow-lg shrink-0"
                            style={{
                              background: `linear-gradient(to right, ${activeTheme.primaryColor}, ${activeTheme.accentColor})`,
                            }}
                          >
                            Edición Especial
                          </span>
                        </h2>
                      </div>
                      <div
                        className="flex items-center gap-2 text-xs font-mono font-bold mt-1 ml-6.5"
                        style={{ color: activeTheme.accentColor }}
                      >
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        <span>Lo más recomendado por nuestros baristas</span>
                      </div>
                    </div>
                    {renderBrandLogo()}
                  </>
                )}
              </div>

              {/* GRID DE PRODUCTOS DESTACADOS CON FOTOS GRANDES Y SABORES DEBAJO DEL TÍTULO */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 overflow-hidden">
                {currentSlide.data.slice(0, 3).map((product) => {
                  const allModifiers = product.modifierGroups?.flatMap((mg) => mg.modifiers) || []

                  return (
                    <div
                      key={product.id}
                      className="relative rounded-3xl border p-4 sm:p-5 flex flex-col justify-between shadow-2xl backdrop-blur-xl overflow-hidden group transition-all duration-300 min-h-0"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
                      {/* BORDE SUPERIOR ADAPTABLE A LA TEMÁTICA */}
                      {showStickers && activeTheme.cardBorderAccent && (
                        <div
                          className="h-1.5 w-full absolute top-0 left-0 z-20 pointer-events-none transition-all duration-500 opacity-90 group-hover:opacity-100"
                          style={{ background: activeTheme.cardBorderAccent }}
                        />
                      )}

                      {/* Glow cálido en tarjeta */}
                      <div
                        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
                        style={{ backgroundColor: activeTheme.primaryColor }}
                      />

                      <div className="min-h-0">
                        {/* FOTO GRANDE DE IMPACTO */}
                        <div
                          className="relative w-full h-36 sm:h-44 lg:h-48 rounded-2xl overflow-hidden mb-3 border shadow-inner flex items-center justify-center bg-black/30 shrink-0"
                          style={{ borderColor: activeTheme.cardBorder }}
                        >
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-4">
                              {renderProductPlaceholder()}
                              <span
                                className="text-[10px] uppercase tracking-widest font-mono mt-2 font-bold"
                                style={{ color: activeTheme.mutedColor }}
                              >
                                Especialidad de la Casa
                              </span>
                            </div>
                          )}

                          {/* BADGES EN ESQUINA SUPERIOR DE LA IMAGEN */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
                            {product.isNew && (
                              <span
                                className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg"
                                style={{
                                  backgroundColor: activeTheme.accentColor,
                                  color: activeTheme.isLight ? '#FFFFFF' : '#000000',
                                }}
                              >
                                ✨ NUEVO
                              </span>
                            )}
                            {product.isSeasonal && (
                              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-lg">
                                🍁 TEMPORADA
                              </span>
                            )}
                          </div>

                          {/* STICKER TEMÁTICO EN ESQUINA SUPERIOR DERECHA (ÁREA SEGURA) */}
                          {showStickers && activeTheme.stickerEmoji && (
                            <div
                              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-xl border backdrop-blur-md transform rotate-3 group-hover:rotate-0 transition-transform select-none pointer-events-none"
                              style={{
                                backgroundColor: 'rgba(0,0,0,0.65)',
                                borderColor: activeTheme.cardBorder,
                                color: activeTheme.textColor,
                              }}
                            >
                              <span className="text-sm sm:text-base">{activeTheme.stickerEmoji}</span>
                              {activeTheme.stickerTag && (
                                <span
                                  className="text-[10px] font-black uppercase tracking-wider hidden sm:inline"
                                  style={{ color: activeTheme.accentColor }}
                                >
                                  {activeTheme.stickerTag}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* NOMBRE DEL PRODUCTO */}
                        <h3
                          className="text-2xl lg:text-3xl font-black tracking-tight leading-tight uppercase"
                          style={{ color: activeTheme.textColor }}
                        >
                          {product.name}
                        </h3>

                        {/* DESCRIPCIÓN DEL PRODUCTO */}
                        {product.description && (
                          <p
                            className="text-xs lg:text-sm line-clamp-2 mt-1 leading-relaxed italic"
                            style={{ color: activeTheme.mutedColor }}
                          >
                            {product.description}
                          </p>
                        )}

                        {/* ======================================================== */}
                        {/* SABORES EN LISTA DIRECTAMENTE DEBAJO DEL TÍTULO          */}
                        {/* ======================================================== */}
                        {product.modifierGroups && product.modifierGroups.length > 0 && (
                          <div
                            className="mt-3 p-3 rounded-2xl border space-y-2"
                            style={{
                              backgroundColor: activeTheme.isLight ? '#00000005' : 'rgba(255,255,255,0.04)',
                              borderColor: activeTheme.cardBorder,
                            }}
                          >
                            {product.modifierGroups.map((group) => (
                              <div key={group.id} className="space-y-1">
                                <span
                                  className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                                  style={{ color: activeTheme.accentColor }}
                                >
                                  <Sparkles className="w-3 h-3" />
                                  {group.name}:
                                </span>
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {group.modifiers.map((mod) => (
                                    <span
                                      key={mod.id}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl border shadow-xs"
                                      style={{
                                        backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                                        borderColor: activeTheme.cardBorder,
                                        color: activeTheme.textColor,
                                      }}
                                    >
                                      <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: activeTheme.accentColor }}
                                      />
                                      <span>{mod.name}</span>
                                      {mod.extraPrice > 0 && (
                                        <span
                                          className="font-bold text-[10px]"
                                          style={{ color: activeTheme.accentColor }}
                                        >
                                          (+${mod.extraPrice.toFixed(0)})
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* SECCIÓN DE TAMAÑOS / PRECIOS */}
                      <div
                        className="pt-3 border-t mt-3 space-y-2"
                        style={{ borderColor: activeTheme.cardBorder }}
                      >
                        {product.variants.length > 1 ? (
                          <div>
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                              style={{ color: activeTheme.accentColor }}
                            >
                              Tamaños Disponibles
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {product.variants.map((v) => (
                                <div
                                  key={v.id}
                                  className="border rounded-xl px-2.5 py-1.5 text-center flex flex-col justify-center shadow-sm"
                                  style={{
                                    backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                                    borderColor: activeTheme.cardBorder,
                                  }}
                                >
                                  <span
                                    className="text-[10px] uppercase font-semibold truncate"
                                    style={{ color: activeTheme.mutedColor }}
                                  >
                                    {v.name}
                                  </span>
                                  <strong
                                    className="text-base font-black"
                                    style={{ color: activeTheme.priceColor }}
                                  >
                                    ${v.price.toFixed(0)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-baseline justify-between">
                            <span
                              className="text-xs font-bold uppercase tracking-wider"
                              style={{ color: activeTheme.mutedColor }}
                            >
                              Precio
                            </span>
                            <strong
                              className="text-3xl font-black"
                              style={{ color: activeTheme.priceColor }}
                            >
                              ${product.minPrice.toFixed(2)}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* SLIDE: CATEGORÍA DETALLADA (FOTOS GRANDES, SABORES Y TAMAÑOS) */}
          {/* ======================================================== */}
          {currentSlide.type === 'category' && currentSlide.category && (
            <motion.div
              key={`${currentSlide.category.id}-p${currentSlide.pageNumber}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="h-full w-full flex flex-col justify-between"
            >
              {/* ENCABEZADO DE CATEGORÍA ADAPTADO SEGÚN ESQUINA DEL LOGO */}
              <div
                className="border-b pb-3 mb-4 flex items-center justify-between gap-6 shrink-0"
                style={{ borderColor: activeTheme.cardBorder }}
              >
                {isLogoTopLeft ? (
                  <>
                    <div className="flex items-center gap-5 min-w-0">
                      {renderBrandLogo()}
                      <div className="h-12 w-px bg-white/15 hidden md:block shrink-0" />
                      <div className="min-w-0">
                        <h2
                          className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-wide uppercase drop-shadow-sm flex items-center gap-3 truncate"
                          style={{ color: activeTheme.textColor }}
                        >
                          <span>{currentSlide.category.name}</span>
                          {currentSlide.totalPages > 1 && (
                            <span
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0"
                              style={{
                                backgroundColor: activeTheme.badgeBg,
                                color: activeTheme.badgeText,
                                borderColor: activeTheme.cardBorder,
                              }}
                            >
                              Pág {currentSlide.pageNumber}/{currentSlide.totalPages}
                            </span>
                          )}
                        </h2>
                        <p
                          className="text-xs uppercase tracking-widest font-semibold mt-0.5 truncate"
                          style={{ color: activeTheme.mutedColor }}
                        >
                          Elaborado artesanalmente con ingredientes selectos
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border font-mono"
                        style={{
                          backgroundColor: activeTheme.badgeBg,
                          color: activeTheme.badgeText,
                          borderColor: activeTheme.cardBorder,
                        }}
                      >
                        {currentSlide.category.products.length} {currentSlide.category.products.length === 1 ? 'Especialidad' : 'Especialidades'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full shadow-md shrink-0"
                          style={{
                            backgroundColor: activeTheme.primaryColor,
                            boxShadow: `0 0 14px ${activeTheme.primaryColor}`,
                          }}
                        />
                        <h2
                          className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-wide uppercase drop-shadow-sm flex items-center gap-3 truncate"
                          style={{ color: activeTheme.textColor }}
                        >
                          <span>{currentSlide.category.name}</span>
                          {currentSlide.totalPages > 1 && (
                            <span
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0"
                              style={{
                                backgroundColor: activeTheme.badgeBg,
                                color: activeTheme.badgeText,
                                borderColor: activeTheme.cardBorder,
                              }}
                            >
                              Pág {currentSlide.pageNumber}/{currentSlide.totalPages}
                            </span>
                          )}
                        </h2>
                        <span
                          className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border font-mono shrink-0 ml-2"
                          style={{
                            backgroundColor: activeTheme.badgeBg,
                            color: activeTheme.badgeText,
                            borderColor: activeTheme.cardBorder,
                          }}
                        >
                          {currentSlide.category.products.length} {currentSlide.category.products.length === 1 ? 'Especialidad' : 'Especialidades'}
                        </span>
                      </div>
                      <p
                        className="text-xs uppercase tracking-widest font-semibold mt-1 ml-6.5"
                        style={{ color: activeTheme.mutedColor }}
                      >
                        Elaborado artesanalmente con ingredientes selectos
                      </p>
                    </div>
                    {renderBrandLogo()}
                  </>
                )}
              </div>

              {/* LISTA DE PRODUCTOS EN GRID 2X2 DE ALTO IMPACTO (FOTOS GRANDES, SABORES DEBAJO DEL TÍTULO Y TAMAÑOS) */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 overflow-hidden content-start">
                {currentSlide.products.map((product) => {
                  const hasMultiSizes = product.variants.length > 1
                  const allModifiers = product.modifierGroups?.flatMap((mg) => mg.modifiers) || []

                  return (
                    <div
                      key={product.id}
                      className="rounded-3xl border p-4 sm:p-5 flex items-start sm:items-stretch gap-4 sm:gap-6 shadow-xl backdrop-blur-md relative overflow-hidden group transition-all duration-300"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
                      {/* BORDE SUPERIOR ADAPTABLE A LA TEMÁTICA */}
                      {showStickers && activeTheme.cardBorderAccent && (
                        <div
                          className="h-1.5 w-full absolute top-0 left-0 z-20 pointer-events-none transition-all duration-500 opacity-90 group-hover:opacity-100"
                          style={{ background: activeTheme.cardBorderAccent }}
                        />
                      )}

                      {/* FOTOGRAFÍA GRANDE DEL PRODUCTO */}
                      <div
                        className="relative w-28 h-28 sm:w-36 sm:h-36 lg:w-40 lg:h-40 shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden border shadow-lg bg-black/30 flex items-center justify-center group-hover:scale-102 transition-transform duration-500"
                        style={{ borderColor: activeTheme.cardBorder }}
                      >
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-center">
                            {renderProductPlaceholder(currentSlide.category.name)}
                            <span
                              className="text-[9px] uppercase font-mono mt-1 font-bold"
                              style={{ color: activeTheme.mutedColor }}
                            >
                              Artesanal
                            </span>
                          </div>
                        )}

                        {/* BADGES SOBRE LA FOTO (ARRIBA IZQUIERDA) */}
                        {(product.isNew || product.isSeasonal) && (
                          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                            {product.isNew && (
                              <span
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-md"
                                style={{
                                  backgroundColor: activeTheme.accentColor,
                                  color: activeTheme.isLight ? '#FFFFFF' : '#000000',
                                }}
                              >
                                NUEVO
                              </span>
                            )}
                            {product.isSeasonal && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-md bg-rose-600 text-white">
                                TEMPORADA
                              </span>
                            )}
                          </div>
                        )}

                        {/* STICKER TEMÁTICO SOBRE LA FOTO (ARRIBA DERECHA - SEGURO, NO TAPA TÍTULO NI PRECIOS) */}
                        {showStickers && activeTheme.stickerEmoji && (
                          <div
                            className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-lg border backdrop-blur-md transform rotate-6 group-hover:rotate-0 transition-transform select-none pointer-events-none"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.65)',
                              borderColor: activeTheme.cardBorder,
                            }}
                            title={activeTheme.stickerTag}
                          >
                            <span className="text-sm sm:text-base">{activeTheme.stickerEmoji}</span>
                          </div>
                        )}
                      </div>

                      {/* CONTENIDO DEL PRODUCTO: TÍTULO GRANDE, SABORES EN LISTA Y TAMAÑOS */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          {/* TÍTULO MÁS GRANDE Y CLARO */}
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-snug line-clamp-2"
                              style={{ color: activeTheme.textColor }}
                            >
                              {product.name}
                            </h3>

                            {/* Precio único en la esquina si no tiene variantes */}
                            {!hasMultiSizes && (
                              <span
                                className="text-xl sm:text-2xl font-black shrink-0"
                                style={{ color: activeTheme.priceColor }}
                              >
                                ${product.minPrice.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* DESCRIPCIÓN */}
                          {product.description && (
                            <p
                              className="text-xs sm:text-sm line-clamp-2 mt-1 italic leading-relaxed"
                              style={{ color: activeTheme.mutedColor }}
                            >
                              {product.description}
                            </p>
                          )}

                          {/* ======================================================== */}
                          {/* LOS SABORES EN LISTA DEBAJO DE CADA TÍTULO               */}
                          {/* ======================================================== */}
                          {product.modifierGroups && product.modifierGroups.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {product.modifierGroups.map((group) => (
                                <div key={group.id} className="space-y-0.5">
                                  <span
                                    className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
                                    style={{ color: activeTheme.accentColor }}
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    {group.name}:
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {group.modifiers.map((mod) => (
                                      <span
                                        key={mod.id}
                                        className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-xl border shadow-2xs"
                                        style={{
                                          backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                                          borderColor: activeTheme.cardBorder,
                                          color: activeTheme.textColor,
                                        }}
                                      >
                                        <span
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: activeTheme.accentColor }}
                                        />
                                        <span>{mod.name}</span>
                                        {mod.extraPrice > 0 && (
                                          <span
                                            className="font-bold text-[10px]"
                                            style={{ color: activeTheme.accentColor }}
                                          >
                                            (+${mod.extraPrice.toFixed(0)})
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* DESGLOSE DE TAMAÑOS CON PRECIOS */}
                        {hasMultiSizes && (
                          <div className="mt-3 pt-2 border-t" style={{ borderColor: activeTheme.cardBorder }}>
                            <div className="flex items-center gap-2 flex-wrap">
                              {product.variants.map((v) => (
                                <div
                                  key={v.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-xs"
                                  style={{
                                    backgroundColor: activeTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                                    borderColor: activeTheme.cardBorder,
                                  }}
                                >
                                  <span
                                    className="text-[10px] font-bold uppercase tracking-wider opacity-70"
                                    style={{ color: activeTheme.mutedColor }}
                                  >
                                    {v.name}
                                  </span>
                                  <span
                                    className="text-sm sm:text-base font-black"
                                    style={{ color: activeTheme.priceColor }}
                                  >
                                    ${v.price.toFixed(0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* SLIDE: MENÚ COMPLETO ESTÁTICO (TODAS LAS CATEGORÍAS)     */}
          {/* ======================================================== */}
          {currentSlide.type === 'all_static' && (
            <motion.div
              key="all-static"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full flex flex-col justify-between"
            >
              {/* ENCABEZADO ADAPTATIVO EN MODO ESTÁTICO */}
              <div className="flex items-center justify-between mb-4 gap-6 shrink-0">
                {isLogoTopLeft ? (
                  <div className="flex items-center gap-5">
                    {renderBrandLogo()}
                    <div className="h-12 w-px bg-white/15 hidden md:block" />
                    <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-wider" style={{ color: activeTheme.textColor }}>
                      Menú Completo de Especialidades
                    </h2>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-wider" style={{ color: activeTheme.textColor }}>
                      Menú Completo de Especialidades
                    </h2>
                    {renderBrandLogo()}
                  </>
                )}
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-hidden">
                {categories.slice(0, 3).map((cat) => (
                <div
                  key={cat.id}
                  className="border rounded-3xl p-5 flex flex-col h-full shadow-2xl backdrop-blur-md overflow-hidden relative"
                  style={{
                    backgroundColor: activeTheme.cardBg,
                    borderColor: activeTheme.cardBorder,
                  }}
                >
                  {/* BORDE SUPERIOR ADAPTABLE */}
                  {showStickers && activeTheme.cardBorderAccent && (
                    <div
                      className="h-1.5 w-full absolute top-0 left-0 z-20 pointer-events-none transition-all duration-500 opacity-90"
                      style={{ background: activeTheme.cardBorderAccent }}
                    />
                  )}

                  <div
                    className="border-b pb-3 mb-3 flex items-center justify-between"
                    style={{ borderColor: activeTheme.cardBorder }}
                  >
                    <h3
                      className="text-xl font-black uppercase flex items-center gap-1.5 truncate"
                      style={{ color: activeTheme.textColor }}
                    >
                      {showStickers && activeTheme.stickerEmoji && (
                        <span>{activeTheme.stickerEmoji}</span>
                      )}
                      <span>{cat.name}</span>
                    </h3>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: activeTheme.badgeBg,
                        color: activeTheme.badgeText,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
                      {cat.products.length} ítems
                    </span>
                  </div>

                  <div className="flex-1 overflow-hidden space-y-3">
                    {cat.products.slice(0, 6).map((p) => {
                      const allModifiers = p.modifierGroups?.flatMap((mg) => mg.modifiers) || []

                      return (
                        <div
                          key={p.id}
                          className="flex items-start gap-3 border-b pb-2.5 last:border-0"
                          style={{ borderColor: activeTheme.cardBorder }}
                        >
                          {/* Miniatura de foto */}
                          <div
                            className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border bg-black/30 flex items-center justify-center"
                            style={{ borderColor: activeTheme.cardBorder }}
                          >
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Coffee className="w-5 h-5 opacity-40" style={{ color: activeTheme.accentColor }} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <span
                                className="text-sm font-bold truncate uppercase"
                                style={{ color: activeTheme.textColor }}
                              >
                                {p.name}
                              </span>
                              <div className="shrink-0 text-right">
                                {p.variants.length > 1 ? (
                                  <div className="flex items-center gap-1 text-[11px] font-bold flex-wrap justify-end">
                                    {p.variants.map((v) => (
                                      <span
                                        key={v.id}
                                        className="px-1.5 py-0.5 rounded border"
                                        style={{
                                          borderColor: activeTheme.cardBorder,
                                          color: activeTheme.priceColor,
                                        }}
                                      >
                                        ${v.price.toFixed(0)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span
                                    className="text-sm font-black"
                                    style={{ color: activeTheme.priceColor }}
                                  >
                                    ${p.minPrice.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Sabores y modificadores en detalle completo debajo del título */}
                            {p.modifierGroups && p.modifierGroups.length > 0 && (
                              <div className="mt-1 space-y-0.5 text-[10px]">
                                {p.modifierGroups.map((group) => (
                                  <div key={group.id} className="flex items-baseline gap-1 flex-wrap">
                                    <span className="font-bold shrink-0" style={{ color: activeTheme.accentColor }}>
                                      {group.name}:
                                    </span>
                                    <span className="opacity-85">
                                      {group.modifiers
                                        .map((m) => `${m.name}${m.extraPrice > 0 ? ` (+$${m.extraPrice.toFixed(0)})` : ''}`)
                                        .join(', ')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER / TICKER DE PROMOCIONES Y CORTESÍAS */}
      <footer
        className="relative z-20 px-6 sm:px-10 py-2.5 sm:py-3 border-t backdrop-blur-xl flex items-center justify-between text-xs transition-colors duration-500 shrink-0"
        style={{
          backgroundColor: activeTheme.headerBg,
          borderColor: activeTheme.cardBorder,
          color: activeTheme.mutedColor,
        }}
      >
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-2 font-bold"
            style={{ color: activeTheme.accentColor }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Café de Especialidad 100% Mexicano</span>
          </div>
          <span className="hidden sm:inline opacity-30">•</span>
          <div className="hidden sm:flex items-center gap-2 font-medium">
            <Clock className="w-3.5 h-3.5" style={{ color: activeTheme.primaryColor }} />
            <span>Tostado artesanal y baristas certificados</span>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[11px] font-semibold">
          <span>Precios en {business.currency} con IVA incluido</span>
          {isUpdating && (
            <span className="flex items-center gap-1.5" style={{ color: activeTheme.accentColor }}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Sincronizando...</span>
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}

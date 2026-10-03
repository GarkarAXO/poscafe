// Utilidades y diccionarios en español para Unidades de Medida Gastronómicas

export interface UnitInfo {
  code: string
  label: string
  symbol: string
  desc: string
  type: 'Masa' | 'Volumen' | 'Conteo / Piezas'
}

export const UNIT_DEFINITIONS: Record<string, UnitInfo> = {
  GRAM: {
    code: 'GRAM',
    label: 'Gramos',
    symbol: 'g',
    desc: 'Café en grano/molido, azúcar, té, harinas y sólidos',
    type: 'Masa',
  },
  KG: {
    code: 'KG',
    label: 'Kilogramos',
    symbol: 'kg',
    desc: 'Costales de café, sacos de harina o azúcar a granel',
    type: 'Masa',
  },
  ML: {
    code: 'ML',
    label: 'Mililitros',
    symbol: 'ml',
    desc: 'Leche, jarabes, esencias, concentrados y líquidos',
    type: 'Volumen',
  },
  LITER: {
    code: 'LITER',
    label: 'Litros',
    symbol: 'L',
    desc: 'Garrafas, cajas de leche líquida, jugos',
    type: 'Volumen',
  },
  OZ: {
    code: 'OZ',
    label: 'Onzas Líquidas',
    symbol: 'oz',
    desc: 'Shots de espresso, jarabes y recetas de coctelería',
    type: 'Volumen',
  },
  CUP: {
    code: 'CUP',
    label: 'Tazas',
    symbol: 'tza',
    desc: 'Tazas gastronómicas para preparación',
    type: 'Volumen',
  },
  PIECE: {
    code: 'PIECE',
    label: 'Piezas',
    symbol: 'pza',
    desc: 'Vasos descartables, tapas, popotes, galletas individuales',
    type: 'Conteo / Piezas',
  },
  PORTION: {
    code: 'PORTION',
    label: 'Porciones',
    symbol: 'porc',
    desc: 'Rebanadas de tarta, bocadillos o raciones calculadas',
    type: 'Conteo / Piezas',
  },
  PACKAGE: {
    code: 'PACKAGE',
    label: 'Paquetes',
    symbol: 'paq',
    desc: 'Paquetes de servilletas, mangas de vasos o bolsas de té',
    type: 'Conteo / Piezas',
  },
  BOX: {
    code: 'BOX',
    label: 'Cajas',
    symbol: 'cja',
    desc: 'Cajas cerradas de insumos (ej. Caja de 12 leches)',
    type: 'Conteo / Piezas',
  },
  CAN: {
    code: 'CAN',
    label: 'Latas',
    symbol: 'lata',
    desc: 'Refrescos, leche condensada o evaporada en lata',
    type: 'Conteo / Piezas',
  },
  BOTTLE: {
    code: 'BOTTLE',
    label: 'Botellas',
    symbol: 'bot',
    desc: 'Botellas de agua mineral, siropes, salsas',
    type: 'Conteo / Piezas',
  },
  POUND: {
    code: 'POUND',
    label: 'Libras',
    symbol: 'lb',
    desc: 'Café o materias primas de exportación',
    type: 'Masa',
  },
}

export function formatUnitName(code: string | null | undefined): string {
  if (!code) return 'Piezas'
  const key = code.toUpperCase()
  return UNIT_DEFINITIONS[key]?.label || code
}

export function formatUnitSymbol(code: string | null | undefined): string {
  if (!code) return 'pza'
  const key = code.toUpperCase()
  return UNIT_DEFINITIONS[key]?.symbol || code.toLowerCase()
}

export function formatUnitFull(code: string | null | undefined): string {
  if (!code) return 'Piezas (pza)'
  const key = code.toUpperCase()
  const def = UNIT_DEFINITIONS[key]
  return def ? `${def.label} (${def.symbol})` : code
}

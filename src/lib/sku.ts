// Generador inteligente de SKU para Insumos y Productos a partir de su nombre comercial

const STOP_WORDS = new Set([
  'DE',
  'DEL',
  'LA',
  'EL',
  'LOS',
  'LAS',
  'UN',
  'UNA',
  'UNOS',
  'UNAS',
  'Y',
  'E',
  'O',
  'U',
  'EN',
  'PARA',
  'POR',
  'CON',
  'SIN',
  'SOBRE',
  'AL',
  'A',
])

/**
 * Genera un código SKU limpio y legible a partir de fragmentos del nombre del insumo o producto.
 * Ejemplos:
 * - "Café de grano de Chiapas" -> "CAF-GRA-CHI"
 * - "Leche entera Santa Clara" -> "LEC-ENT-SAN"
 * - "Azúcar morena estándar"   -> "AZU-MOR-EST"
 * - "Vasos 12 oz biodegradables" -> "VAS-12O-BIO"
 * - "Jarabe Vainilla"          -> "JAR-VAI"
 * - "Huevo"                    -> "HUEVO"
 */
export function generateSkuFromName(name: string): string {
  if (!name || typeof name !== 'string') {
    return `INS-${Math.floor(100 + Math.random() * 900)}`
  }

  // 1. Quitar acentos, tildes y caracteres diacríticos
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()

  // 2. Reemplazar símbolos o puntuaciones no alfanuméricas por espacios
  const alphanumeric = normalized.replace(/[^A-Z0-9\s]/g, ' ')

  // 3. Separar en palabras y excluir stop words (preposiciones, artículos)
  const tokens = alphanumeric
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))

  if (tokens.length === 0) {
    const rawTokens = alphanumeric
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0)
    if (rawTokens.length === 0) {
      return `INS-${Math.floor(100 + Math.random() * 900)}`
    }
    return rawTokens[0].slice(0, 6)
  }

  if (tokens.length === 1) {
    // Si es una sola palabra corta (ej: "HUEVO") la dejamos completa hasta 6 letras
    return tokens[0].slice(0, 7)
  }

  if (tokens.length === 2) {
    // Si son dos palabras (ej: "JARABE VAINILLA" -> "JAR-VAI")
    const p1 = tokens[0].slice(0, 3)
    const p2 = tokens[1].slice(0, 4)
    return `${p1}-${p2}`
  }

  // 3 o más palabras (ej: "CAFE GRANO CHIAPAS" -> "CAF-GRA-CHI")
  const parts = tokens.slice(0, 3).map((w) => w.slice(0, 3))
  return parts.join('-')
}

/**
 * Garantiza que un SKU sea único comparándolo con los existentes,
 * añadiendo sufijos numéricos (-02, -03) en caso de colisión.
 */
export function ensureUniqueSku(baseSku: string, existingSkus: string[]): string {
  const upperExisting = new Set(existingSkus.map((s) => s.toUpperCase()))
  if (!upperExisting.has(baseSku.toUpperCase())) {
    return baseSku
  }

  let counter = 2
  while (counter < 100) {
    const candidate = `${baseSku}-${counter.toString().padStart(2, '0')}`
    if (!upperExisting.has(candidate.toUpperCase())) {
      return candidate
    }
    counter++
  }

  return `${baseSku}-${Date.now().toString().slice(-4)}`
}

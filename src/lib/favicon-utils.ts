/**
 * Utilidades para generación y entrega de Favicons (.ico / svg / png)
 * Soporta favicon personalizado por sucursal con conversión automática desde el logo/isotipo
 */

/**
 * Empaqueta un buffer de imagen PNG en un archivo ICO (.ico) estándar de Windows.
 * Cumple con el estándar RFC/Microsoft Icon Format con payload PNG embebido.
 */
export function wrapPngInIco(pngBuffer: Buffer, width: number = 0, height: number = 0): Buffer {
  const headerSize = 6
  const dirEntrySize = 16
  const imageOffset = headerSize + dirEntrySize
  const bytesInRes = pngBuffer.length

  const icoBuffer = Buffer.alloc(imageOffset + bytesInRes)

  // 1. ICONDIR (6 bytes)
  icoBuffer.writeUInt16LE(0, 0) // Reserved (debe ser 0)
  icoBuffer.writeUInt16LE(1, 2) // Type: 1 = ICO
  icoBuffer.writeUInt16LE(1, 4) // Count: 1 imagen

  // 2. ICONDIRENTRY (16 bytes)
  // En ICO, un ancho/alto de 0 indica 256 píxeles o tamaño libre/escalable
  icoBuffer.writeUInt8(width >= 256 ? 0 : width, 6) // Width
  icoBuffer.writeUInt8(height >= 256 ? 0 : height, 7) // Height
  icoBuffer.writeUInt8(0, 8) // Color count (0 si >= 8bpp)
  icoBuffer.writeUInt8(0, 9) // Reserved (0)
  icoBuffer.writeUInt16LE(1, 10) // Color Planes (1)
  icoBuffer.writeUInt16LE(32, 12) // Bits per pixel (32-bit RGBA)
  icoBuffer.writeUInt32LE(bytesInRes, 14) // Size of image data
  icoBuffer.writeUInt32LE(imageOffset, 18) // Offset of image data (22)

  // 3. Payload de la imagen PNG
  pngBuffer.copy(icoBuffer, imageOffset)

  return icoBuffer
}

/**
 * Genera un SVG elegante para favicon con la inicial de la sucursal o icono de autor
 */
export function generateSvgFavicon(
  name: string,
  primaryColor: string = '#C08552',
  bgColor: string = '#14100E'
): string {
  const initial = (name.trim().charAt(0) || 'K').toUpperCase()

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor}" />
      <stop offset="100%" stop-color="#241B16" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" />
      <stop offset="100%" stop-color="#E5A66F" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="18" fill="url(#grad)" stroke="${primaryColor}" stroke-width="2" stroke-opacity="0.4" />
  <text x="32" y="42" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="url(#accentGrad)" text-anchor="middle">${initial}</text>
  <circle cx="50" cy="14" r="3" fill="${primaryColor}" />
</svg>`
}

/**
 * Convierte un DataURI (base64) o URL a un buffer
 */
export async function fetchImageBuffer(urlOrDataUri: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    if (urlOrDataUri.startsWith('data:')) {
      const matches = urlOrDataUri.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
      if (matches && matches[2]) {
        return {
          buffer: Buffer.from(matches[2], 'base64'),
          contentType: matches[1] || 'image/png',
        }
      }
    }

    const res = await fetch(urlOrDataUri, {
      headers: {
        'User-Agent': 'Mozilla/5.0 POSCafe Favicon Generator/1.0',
      },
    })

    if (!res.ok) return null

    const arrayBuffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/png'

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType,
    }
  } catch (error) {
    console.error('Error al descargar imagen para favicon:', error)
    return null
  }
}

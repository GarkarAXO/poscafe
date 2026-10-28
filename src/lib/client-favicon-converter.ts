/**
 * Utilidades del lado del cliente para convertir imágenes a Favicons (.ico) estándar.
 * Escala cualquier archivo o Data URL a una proporción cuadrada de 64x64 manteniendo canal alfa/transparencia.
 */

export async function convertImageToIco(fileOrDataUrl: File | string, size: number = 64): Promise<string> {
  // 1. Obtener Data URL de la imagen fuente
  let dataUrl: string
  if (typeof fileOrDataUrl === 'string') {
    dataUrl = fileOrDataUrl
  } else {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(fileOrDataUrl)
    })
  }

  // 2. Cargar en un elemento Image para renderizarlo en canvas
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = (err) => reject(new Error('No se pudo cargar la imagen para procesar el favicon: ' + String(err)))
    image.src = dataUrl
  })

  // 3. Renderizar en Canvas 2D preservando transparencia y aspect ratio centrado
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('El navegador no soporta Canvas 2D')

  ctx.clearRect(0, 0, size, size)

  // Calcular proporciones para centrar la imagen
  const hRatio = size / img.width
  const vRatio = size / img.height
  const ratio = Math.min(hRatio, vRatio)

  const centerShiftX = (size - img.width * ratio) / 2
  const centerShiftY = (size - img.height * ratio) / 2

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    img,
    0,
    0,
    img.width,
    img.height,
    centerShiftX,
    centerShiftY,
    img.width * ratio,
    img.height * ratio
  )

  const pngDataUri = canvas.toDataURL('image/png')

  // 4. Empaquetar como archivo ICO (.ico) nativo de Windows (RFC/Microsoft Icon Format)
  return wrapPngDataUriToIco(pngDataUri, size)
}

/**
 * Empaqueta un PNG Data URI en un archivo ICO (.ico) binario nativo con cabeceras ICONDIR e ICONDIRENTRY
 */
export function wrapPngDataUriToIco(pngDataUri: string, size: number = 64): string {
  const base64 = pngDataUri.split(',')[1]
  const binary = atob(base64)
  const pngBytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    pngBytes[i] = binary.charCodeAt(i)
  }

  const headerSize = 6
  const dirEntrySize = 16
  const imageOffset = headerSize + dirEntrySize
  const totalSize = imageOffset + pngBytes.length

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  const u8 = new Uint8Array(buffer)

  // 1. ICONDIR (6 bytes)
  view.setUint16(0, 0, true) // Reserved (debe ser 0)
  view.setUint16(2, 1, true) // Type: 1 = ICO
  view.setUint16(4, 1, true) // Count: 1 imagen contenida

  // 2. ICONDIRENTRY (16 bytes)
  view.setUint8(6, size >= 256 ? 0 : size) // Width (64px)
  view.setUint8(7, size >= 256 ? 0 : size) // Height (64px)
  view.setUint8(8, 0) // Color count (0 = 256 o más colores)
  view.setUint8(9, 0) // Reserved (0)
  view.setUint16(10, 1, true) // Color Planes = 1
  view.setUint16(12, 32, true) // Bits per pixel = 32 (RGBA con canal alfa)
  view.setUint32(14, pngBytes.length, true) // Tamaño de los datos PNG en bytes
  view.setUint32(18, imageOffset, true) // Offset hacia los datos de la imagen (22)

  // 3. Payload PNG embebido
  u8.set(pngBytes, imageOffset)

  // 4. Convertir a Data URI base64
  let binaryIco = ''
  const chunk = 8192
  for (let i = 0; i < u8.length; i += chunk) {
    binaryIco += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)))
  }

  return `data:image/x-icon;base64,${btoa(binaryIco)}`
}

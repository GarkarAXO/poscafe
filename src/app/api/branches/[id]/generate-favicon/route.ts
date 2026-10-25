import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { fetchImageBuffer, wrapPngInIco } from '@/lib/favicon-utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/branches/[id]/generate-favicon
 * Toma el logo o isotipo de la sucursal (o una URL provista en el body),
 * lo convierte en un archivo ICO (.ico) en formato Data URI y lo guarda en branch.faviconUrl.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const { id } = await params
    let body: { sourceUrl?: string; source?: 'logo' | 'isotype' } = {}
    try {
      body = await request.json()
    } catch {
      // Body opcional
    }

    const branch = await prisma.branch.findFirst({
      where: {
        id,
        businessId: session.businessId,
        deletedAt: null,
      },
    })

    if (!branch) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sucursal no encontrada' } },
        { status: 404 }
      )
    }

    // Determinar la URL fuente de la imagen
    const sourceUrl =
      body.sourceUrl ||
      (body.source === 'isotype' ? branch.isotypeUrl : branch.logoUrl) ||
      branch.isotypeUrl ||
      branch.logoUrl

    if (!sourceUrl) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'La sucursal no tiene logotipo ni isotipo configurado para generar el favicon. Agrega un logo o isotipo primero.',
          },
        },
        { status: 400 }
      )
    }

    // Descargar imagen fuente
    const imgData = await fetchImageBuffer(sourceUrl)
    if (!imgData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DOWNLOAD_FAILED',
            message: 'No se pudo descargar la imagen del logo/isotipo para la conversión a .ico.',
          },
        },
        { status: 502 }
      )
    }

    // Empaquetar como ICO estándar
    const icoBuffer = wrapPngInIco(imgData.buffer)
    const base64Ico = icoBuffer.toString('base64')
    const faviconDataUrl = `data:image/x-icon;base64,${base64Ico}`

    // Actualizar la sucursal en la base de datos
    const updated = await prisma.branch.update({
      where: { id },
      data: {
        faviconUrl: faviconDataUrl,
      },
      select: {
        id: true,
        name: true,
        faviconUrl: true,
        logoUrl: true,
        isotypeUrl: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Favicon .ico generado y asignado exitosamente a la sucursal',
    })
  } catch (error) {
    console.error('Error en POST /api/branches/[id]/generate-favicon:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al generar favicon' } },
      { status: 500 }
    )
  }
}

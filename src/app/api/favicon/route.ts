import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { wrapPngInIco, generateSvgFavicon, fetchImageBuffer } from '@/lib/favicon-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/favicon
 * Devuelve el favicon (.ico o .svg) correspondiente a la sucursal solicitada o activa en sesión.
 * Query params: ?branchId=... & ?businessId=...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchIdParam = searchParams.get('branchId')
    const businessIdParam = searchParams.get('businessId')

    let branchId = branchIdParam
    let businessId = businessIdParam

    // Si no se proporcionó branchId ni businessId, intentar obtenerlos de la sesión activa
    if (!branchId && !businessId) {
      try {
        const session = await getSession()
        if (session) {
          businessId = session.businessId || null
          branchId = session.activeBranchId || null
        }
      } catch {
        // Fallback sin sesión
      }
    }

    // Buscar la sucursal específica
    let branch = null
    if (branchId) {
      branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          id: true,
          name: true,
          isotypeUrl: true,
          logoUrl: true,
          primaryColor: true,
          bgColor: true,
          businessId: true,
        },
      })
      if (branch && !businessId) {
        businessId = branch.businessId
      }
    }

    // Si no encontramos sucursal pero tenemos businessId, buscar la primera sucursal activa
    if (!branch && businessId) {
      branch = await prisma.branch.findFirst({
        where: { businessId, active: true, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          isotypeUrl: true,
          logoUrl: true,
          primaryColor: true,
          bgColor: true,
          businessId: true,
        },
      })
    }

    // Si aún no tenemos sucursal, buscar cualquier sucursal activa del sistema
    if (!branch) {
      branch = await prisma.branch.findFirst({
        where: { active: true, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          isotypeUrl: true,
          logoUrl: true,
          primaryColor: true,
          bgColor: true,
          businessId: true,
        },
      })
    }

    // Buscar configuración general del negocio si existe
    let businessSetting = null
    if (businessId || branch?.businessId) {
      const bId = businessId || branch?.businessId
      if (bId) {
        businessSetting = await prisma.businessSetting.findUnique({
          where: { businessId: bId },
          select: {
            faviconUrl: true,
            isotypeUrl: true,
            logoUrl: true,
            primaryColor: true,
          },
        })
      }
    }

    // Prioridad del recurso visual:
    // 1. branch.isotypeUrl
    // 2. branch.logoUrl
    // 3. businessSetting.faviconUrl
    // 4. businessSetting.isotypeUrl
    // 5. businessSetting.logoUrl
    const targetUrl =
      branch?.isotypeUrl ||
      branch?.logoUrl ||
      businessSetting?.faviconUrl ||
      businessSetting?.isotypeUrl ||
      businessSetting?.logoUrl

    // Si hay una URL de imagen, intentamos servirla empaquetada como ICO o directamente
    if (targetUrl) {
      // Si la URL ya es un archivo .ico nativo, podemos redirigir directamente
      if (targetUrl.toLowerCase().endsWith('.ico')) {
        return NextResponse.redirect(targetUrl, {
          status: 307,
          headers: {
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        })
      }

      // Descargamos el buffer de la imagen (PNG / JPG / WebP) para empaquetarlo como ICO
      const imgData = await fetchImageBuffer(targetUrl)
      if (imgData) {
        // Empaquetar como ICO binario compatible universalmente
        const icoBuffer = wrapPngInIco(imgData.buffer)

        return new Response(new Uint8Array(icoBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'image/x-icon',
            'Content-Length': icoBuffer.length.toString(),
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
            'Content-Disposition': 'inline; filename="favicon.ico"',
          },
        })
      }
    }

    // Si no hay imagen o falló la descarga, generamos un SVG nítido con el monograma de la sucursal
    const branchName = branch?.name || 'POS Cafe'
    const primaryColor = branch?.primaryColor || businessSetting?.primaryColor || '#C08552'
    const bgColor = branch?.bgColor || '#14100E'

    const svgContent = generateSvgFavicon(branchName, primaryColor, bgColor)

    return new Response(svgContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800',
        'Content-Disposition': 'inline; filename="favicon.svg"',
      },
    })
  } catch (error) {
    console.error('Error en GET /api/favicon:', error)

    // Fallback de emergencia en SVG
    const fallbackSvg = generateSvgFavicon('K', '#C08552', '#14100E')
    return new Response(fallbackSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    })
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function DELETE(
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

    const existing = await prisma.product.findFirst({
      where: { id, businessId: session.businessId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } },
        { status: 404 }
      )
    }

    await prisma.product.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, message: 'Producto archivado correctamente' })
  } catch (error) {
    console.error('Error en DELETE /api/products/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar producto' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sin sucursal activa' } },
        { status: 401 }
      )
    }

    const { id: itemId } = await params
    const body = await request.json()
    const { status } = body // 'PENDING' | 'COOKING' | 'READY' | 'SERVED'

    if (!['PENDING', 'COOKING', 'READY', 'SERVED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_STATUS', message: 'Estado de cocina no válido' } },
        { status: 400 }
      )
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    })

    if (!item) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Platillo no encontrado' } },
        { status: 404 }
      )
    }

    // Actualizar estado del ítem
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { kitchenStatus: status },
    })

    // Actualizar estado general de la orden si corresponde
    if (status === 'COOKING' || status === 'READY') {
      await prisma.order.update({
        where: { id: item.orderId },
        data: { status: 'PREPARING' },
      })
    } else if (status === 'SERVED') {
      // Verificar si todos los ítems de la orden ya fueron servidos
      const pendingItems = await prisma.orderItem.count({
        where: {
          orderId: item.orderId,
          kitchenStatus: { not: 'SERVED' },
        },
      })
      if (pendingItems === 0) {
        await prisma.order.update({
          where: { id: item.orderId },
          data: { status: 'SERVED' },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: `Platillo marcado como ${status}`,
    })
  } catch (error) {
    console.error('Error en PATCH /api/kds/items/[id]/status:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar estado del platillo' } },
      { status: 500 }
    )
  }
}

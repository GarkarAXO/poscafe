import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
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

    const { id: orderId } = await params
    const branchId = session.activeBranchId

    const order = await prisma.order.findFirst({
      where: { id: orderId, branchId },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Orden no encontrada' } },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const requestedStatus = body?.status // 'COOKING' | 'READY' | 'SERVED'

    const hasPendingOrCooking = order.items.some(
      (it) => it.kitchenStatus === 'PENDING' || it.kitchenStatus === 'COOKING'
    )

    let newStatus = 'READY'
    let orderStatus = 'PREPARING'

    if (requestedStatus === 'COOKING') {
      newStatus = 'COOKING'
      orderStatus = 'PREPARING'
    } else if (requestedStatus === 'READY') {
      newStatus = 'READY'
      orderStatus = 'PREPARING'
    } else if (requestedStatus === 'SERVED') {
      newStatus = 'SERVED'
      orderStatus = 'SERVED'
    } else if (!hasPendingOrCooking) {
      // Si ya estaban todos listos, se despacha/sirve completamente
      newStatus = 'SERVED'
      orderStatus = 'SERVED'
    }

    // Actualizar los ítems correspondientes según la acción
    await prisma.$transaction([
      prisma.orderItem.updateMany({
        where: {
          orderId: order.id,
          ...(newStatus === 'COOKING' ? { kitchenStatus: 'PENDING' } : {}),
          ...(newStatus === 'READY' ? { kitchenStatus: { in: ['PENDING', 'COOKING'] } } : {}),
        },
        data: { kitchenStatus: newStatus },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: orderStatus as any },
      }),
    ])

    return NextResponse.json({
      success: true,
      message:
        newStatus === 'COOKING'
          ? 'Comanda puesta en marcha en cocina'
          : newStatus === 'READY'
          ? 'Todos los platillos marcados como LISTOS para entrega'
          : 'Comanda despachada / servida',
      targetStatus: newStatus,
    })
  } catch (error) {
    console.error('Error en POST /api/kds/orders/[id]/bump:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al procesar bump de orden' } },
      { status: 500 }
    )
  }
}

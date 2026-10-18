import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId') || searchParams.get('b')
    const tableId = searchParams.get('tableId')
    const tableName = searchParams.get('table') || searchParams.get('t')

    if (!branchId || (!tableId && !tableName)) {
      return NextResponse.json(
        { success: false, error: { message: 'Parámetros branchId y (tableId o table) requeridos' } },
        { status: 400 }
      )
    }

    const table = await prisma.table.findFirst({
      where: {
        branchId,
        active: true,
        ...(tableId ? { id: tableId } : { name: { equals: tableName || '', mode: 'insensitive' } }),
      },
      include: {
        area: true,
        currentWaiter: { select: { id: true, name: true } },
        assignedWaiter: { select: { id: true, name: true } },
        orders: {
          where: {
            status: { in: ['DRAFT', 'SENT', 'PREPARING', 'SERVED'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            waiter: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!table) {
      return NextResponse.json(
        { success: false, error: { message: 'Mesa no encontrada' } },
        { status: 404 }
      )
    }

    const activeOrder = table.orders[0] || null
    const isInitiated = Boolean(activeOrder || table.status === 'OCCUPIED' || table.currentWaiterId)
    const activeWaiter = activeOrder?.waiter || table.currentWaiter || table.assignedWaiter || null

    const callKey = `${branchId}:${table.id}`
    const callData = globalThis.__waiterCalls?.get(callKey) || null

    return NextResponse.json({
      success: true,
      data: {
        tableId: table.id,
        tableName: table.name,
        areaName: table.area?.name || null,
        status: table.status,
        isInitiated,
        activeOrderId: activeOrder?.id || null,
        orderNumber: activeOrder?.orderNumber || null,
        waiter: activeWaiter ? { id: activeWaiter.id, name: activeWaiter.name } : null,
        hasWaiterCall: Boolean(callData),
        calledAt: callData?.calledAt || null,
      },
    })
  } catch (err: any) {
    console.error('Error en /api/public/menu/table-status:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Error interno al consultar estado de la mesa' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Estructura global en memoria para llamadas activas de mesero por sucursal
declare global {
  // eslint-disable-next-line no-var
  var __waiterCalls: Map<string, {
    tableId: string
    tableName: string
    branchId: string
    waiterId: string | null
    waiterName: string | null
    isInitiated: boolean
    calledAt: string
    message: string
  }> | undefined
}

if (!globalThis.__waiterCalls) {
  globalThis.__waiterCalls = new Map()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { branchId, tableId, tableName, message } = body

    if (!branchId || (!tableId && !tableName)) {
      return NextResponse.json(
        { success: false, error: { message: 'Faltan parámetros requeridos (branchId, tableId o tableName)' } },
        { status: 400 }
      )
    }

    // Buscar la mesa en la base de datos
    const table = await prisma.table.findFirst({
      where: {
        branchId,
        active: true,
        ...(tableId ? { id: tableId } : { name: { equals: tableName, mode: 'insensitive' } }),
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
        { success: false, error: { message: 'Mesa no encontrada en esta sucursal' } },
        { status: 404 }
      )
    }

    const activeOrder = table.orders[0] || null
    const isInitiated = Boolean(activeOrder || table.status === 'OCCUPIED' || table.currentWaiterId)

    // Identificar el mesero responsable:
    // 1) El mesero que abrió la comanda (activeOrder.waiter)
    // 2) El mesero actual de la mesa (currentWaiter)
    // 3) El mesero titular asignado a la mesa (assignedWaiter)
    const activeWaiter = activeOrder?.waiter || table.currentWaiter || table.assignedWaiter || null

    const callKey = `${branchId}:${table.id}`
    const callData = {
      tableId: table.id,
      tableName: table.name,
      branchId,
      waiterId: activeWaiter?.id || null,
      waiterName: activeWaiter?.name || null,
      isInitiated,
      calledAt: new Date().toISOString(),
      message: message || (isInitiated ? 'Comensal solicita asistencia' : 'Comensal solicita apertura de mesa para ordenar'),
    }

    globalThis.__waiterCalls?.set(callKey, callData)

    return NextResponse.json({
      success: true,
      message: activeWaiter
        ? `Llamada enviada a tu mesero ${activeWaiter.name}`
        : 'Llamada enviada al personal de servicio',
      data: {
        tableId: table.id,
        tableName: table.name,
        waiterName: activeWaiter?.name || null,
        isInitiated,
        calledAt: callData.calledAt,
      },
    })
  } catch (err: any) {
    console.error('Error en /api/public/menu/call-waiter:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Error interno al solicitar mesero' } },
      { status: 500 }
    )
  }
}

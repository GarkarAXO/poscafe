import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { TableStatus, OrderStatus } from '@prisma/client'

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

    const { id: tableId } = await params
    const body = await request.json()
    const { action, targetTableId, targetWaiterId, waiterId } = body // REQUEST_BILL, RELEASE, DIRTY, TRANSFER, TRANSFER_WAITER, ASSIGN_WAITER

    const branchId = session.activeBranchId

    const table = await prisma.table.findFirst({
      where: { id: tableId, branchId },
      include: { assignedWaiter: true, currentWaiter: true },
    })

    if (!table) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Mesa no encontrada en la sucursal' } },
        { status: 404 }
      )
    }

    if (action === 'REQUEST_BILL') {
      const updated = await prisma.table.update({
        where: { id: tableId },
        data: { status: TableStatus.BILL_PRINTED },
      })
      return NextResponse.json({ success: true, data: updated, message: 'Pre-cuenta solicitada' })
    }

    if (action === 'RELEASE') {
      // Liberar mesa y regresar al mesero asignado titular
      const updated = await prisma.table.update({
        where: { id: tableId },
        data: {
          status: TableStatus.AVAILABLE,
          currentWaiterId: null, // Regresa automáticamente al mesero titular
        },
      })
      return NextResponse.json({
        success: true,
        data: updated,
        message: table.assignedWaiter
          ? `Mesa liberada y regresada al mesero titular (${table.assignedWaiter.name})`
          : 'Mesa liberada',
      })
    }

    if (action === 'DIRTY') {
      const updated = await prisma.table.update({
        where: { id: tableId },
        data: { status: TableStatus.DIRTY },
      })
      return NextResponse.json({ success: true, data: updated, message: 'Mesa marcada para limpieza' })
    }

    // Traspaso de mesa a otro mesero (temporal para este servicio)
    if (action === 'TRANSFER_WAITER') {
      if (!targetWaiterId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Debes seleccionar el mesero destino' } },
          { status: 400 }
        )
      }

      const targetWaiter = await prisma.user.findFirst({
        where: { id: targetWaiterId, businessId: session.businessId, active: true },
      })

      if (!targetWaiter) {
        return NextResponse.json(
          { success: false, error: { code: 'WAITER_NOT_FOUND', message: 'Mesero destino no encontrado o inactivo' } },
          { status: 404 }
        )
      }

      await prisma.$transaction(async (tx) => {
        // Asignar mesero temporal en la mesa
        await tx.table.update({
          where: { id: tableId },
          data: { currentWaiterId: targetWaiterId },
        })

        // Si hay una orden activa en la mesa, reasignar el mesero de la orden
        await tx.order.updateMany({
          where: {
            tableId,
            branchId,
            status: { in: [OrderStatus.DRAFT, OrderStatus.SENT, OrderStatus.PREPARING, OrderStatus.SERVED] },
          },
          data: { waiterId: targetWaiterId },
        })

        // Auditoría
        await tx.auditLog.create({
          data: {
            businessId: session.businessId!,
            userId: session.userId,
            action: 'TABLE_WAITER_TRANSFERRED',
            entityType: 'Table',
            entityId: tableId,
            payload: {
              tableName: table.name,
              originalWaiterId: table.assignedWaiterId,
              originalWaiterName: table.assignedWaiter?.name,
              transferredToWaiterId: targetWaiterId,
              transferredToWaiterName: targetWaiter.name,
            },
          },
        })
      }, {
        maxWait: 15000,
        timeout: 30000,
      })

      return NextResponse.json({
        success: true,
        message: `Mesa ${table.name} traspasada a ${targetWaiter.name}. Al cobrarse regresará a su mesero titular.`,
      })
    }

    // Asignación de mesero titular a la mesa
    if (action === 'ASSIGN_WAITER') {
      const newWaiterId = waiterId || null
      let waiterName = 'Ninguno'

      if (newWaiterId) {
        const assignedUser = await prisma.user.findFirst({
          where: { id: newWaiterId, businessId: session.businessId, active: true },
        })
        if (!assignedUser) {
          return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' } },
            { status: 404 }
          )
        }
        waiterName = assignedUser.name
      }

      const updated = await prisma.table.update({
        where: { id: tableId },
        data: {
          assignedWaiterId: newWaiterId,
          ...(table.status === TableStatus.AVAILABLE ? { currentWaiterId: null } : {}),
        },
      })

      return NextResponse.json({
        success: true,
        data: updated,
        message: newWaiterId ? `Mesa asignada a ${waiterName}` : 'Mesa desasignada',
      })
    }

    if (action === 'TRANSFER') {
      if (!targetTableId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Debes especificar la mesa destino' } },
          { status: 400 }
        )
      }

      const targetTable = await prisma.table.findFirst({
        where: { id: targetTableId, branchId, active: true },
      })

      if (!targetTable) {
        return NextResponse.json(
          { success: false, error: { code: 'TARGET_NOT_FOUND', message: 'Mesa destino no encontrada' } },
          { status: 404 }
        )
      }

      if (targetTable.status !== TableStatus.AVAILABLE) {
        return NextResponse.json(
          { success: false, error: { code: 'TARGET_OCCUPIED', message: 'La mesa destino no está disponible' } },
          { status: 400 }
        )
      }

      // Traspasar comanda en transacción
      await prisma.$transaction(async (tx) => {
        // Encontrar orden activa en la mesa origen
        const activeOrder = await tx.order.findFirst({
          where: {
            tableId,
            branchId,
            status: { in: [OrderStatus.DRAFT, OrderStatus.SENT, OrderStatus.PREPARING, OrderStatus.SERVED] },
          },
        })

        if (activeOrder) {
          await tx.order.update({
            where: { id: activeOrder.id },
            data: { tableId: targetTableId },
          })
        }

        // Mesa origen se libera y regresa al mesero titular
        await tx.table.update({
          where: { id: tableId },
          data: {
            status: TableStatus.AVAILABLE,
            currentWaiterId: null,
          },
        })

        // Mesa destino se ocupa y adopta al mesero que la atiende
        await tx.table.update({
          where: { id: targetTableId },
          data: {
            status: TableStatus.OCCUPIED,
            currentWaiterId: activeOrder?.waiterId || null,
          },
        })
      }, {
        maxWait: 15000,
        timeout: 30000,
      })

      return NextResponse.json({
        success: true,
        message: `Comanda traspasada con éxito a ${targetTable.name}`,
      })
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Acción no soportada' } },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error en POST /api/comandas/tables/[id]/status:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al cambiar estado de mesa' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const { id: branchId } = await params

    // 1. Obtener información de la sucursal y validar permisos
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        business: true,
        warehouses: true,
        cashRegisters: true,
      },
    })

    if (!branch) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sucursal no encontrada' } },
        { status: 404 }
      )
    }

    // Solo permitido para Super Administradores de plataforma o dueños/administradores del negocio
    const isPlatformAdmin = Boolean(session.isPlatformAdmin)
    const isBusinessAdmin =
      session.businessId === branch.businessId &&
      (session.roleCodes?.includes('ADMIN') ||
        session.roleCodes?.includes('SUPERADMIN') ||
        session.permissions?.canManageSettings)

    if (!isPlatformAdmin && !isBusinessAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Acceso denegado: se requieren privilegios administrativos de plataforma o del negocio',
          },
        },
        { status: 403 }
      )
    }

    // 2. Ejecutar reinicio de la sucursal en una transacción atómica
    const result = await prisma.$transaction(async (tx) => {
      const warehouseIds = branch.warehouses.map((w) => w.id)

      // A. Identificar órdenes de la sucursal
      const orders = await tx.order.findMany({
        where: { branchId },
        select: { id: true },
      })
      const orderIds = orders.map((o) => o.id)

      // B. Eliminar movimientos de inventario vinculados a almacenes de la sucursal o a las órdenes
      const deletedMovements = await tx.stockMovement.deleteMany({
        where: {
          OR: [
            ...(warehouseIds.length > 0
              ? [
                  { sourceWarehouseId: { in: warehouseIds } },
                  { targetWarehouseId: { in: warehouseIds } },
                ]
              : []),
            ...(orderIds.length > 0
              ? [{ referenceType: 'ORDER', referenceId: { in: orderIds } }]
              : []),
          ],
        },
      })

      // C. Poner el stock de los almacenes en 0
      let updatedStockCount = 0
      if (warehouseIds.length > 0) {
        const updateStockRes = await tx.warehouseStock.updateMany({
          where: { warehouseId: { in: warehouseIds } },
          data: { quantity: 0 },
        })
        updatedStockCount = updateStockRes.count
      }

      // D. Eliminar dependencias de órdenes (modificadores, items, pagos, descuentos, cortesías, cancelaciones)
      if (orderIds.length > 0) {
        await tx.orderItemModifier.deleteMany({
          where: { orderItem: { orderId: { in: orderIds } } },
        })

        await tx.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        })

        await tx.payment.deleteMany({
          where: { orderId: { in: orderIds } },
        })

        await tx.orderDiscount.deleteMany({
          where: { orderId: { in: orderIds } },
        })

        await tx.orderCourtesy.deleteMany({
          where: { orderId: { in: orderIds } },
        })

        await tx.orderCancellation.deleteMany({
          where: { orderId: { in: orderIds } },
        })
      }

      // E. Eliminar las órdenes
      const deletedOrders = await tx.order.deleteMany({
        where: { branchId },
      })

      // F. Eliminar pagos residuales vinculados a sesiones de caja de esta sucursal
      await tx.payment.deleteMany({
        where: { cashSession: { cashRegister: { branchId } } },
      })

      // G. Eliminar movimientos de caja y sesiones de caja
      await tx.cashMovement.deleteMany({
        where: { cashSession: { cashRegister: { branchId } } },
      })

      const deletedCashSessions = await tx.cashSession.deleteMany({
        where: { cashRegister: { branchId } },
      })

      // H. Liberar todas las mesas de la sucursal
      const updatedTables = await tx.table.updateMany({
        where: { branchId },
        data: {
          status: 'AVAILABLE',
          currentWaiterId: null,
        },
      })

      // I. Eliminar compras de inventario a proveedores
      await tx.purchaseItem.deleteMany({
        where: { purchase: { branchId } },
      })
      const deletedPurchases = await tx.purchase.deleteMany({
        where: { branchId },
      })

      // J. Eliminar gastos operativos
      const deletedExpenses = await tx.expense.deleteMany({
        where: { branchId },
      })

      return {
        ordersDeleted: deletedOrders.count,
        cashSessionsDeleted: deletedCashSessions.count,
        stockItemsReset: updatedStockCount,
        stockMovementsDeleted: deletedMovements.count,
        tablesReset: updatedTables.count,
        purchasesDeleted: deletedPurchases.count,
        expensesDeleted: deletedExpenses.count,
      }
    })

    return NextResponse.json({
      success: true,
      message: `La sucursal "${branch.name}" fue reiniciada exitosamente. Las ventas, turnos de caja, gastos y existencias fueron reseteados a 0.`,
      data: {
        branch: {
          id: branch.id,
          name: branch.name,
          code: branch.code,
        },
        summary: result,
      },
    })
  } catch (error: any) {
    console.error('Error en POST /api/admin/branches/[id]/reset:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error?.message || 'Error al reiniciar la sucursal',
        },
      },
      { status: 500 }
    )
  }
}

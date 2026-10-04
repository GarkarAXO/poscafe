import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sin sucursal activa' } },
        { status: 401 }
      )
    }

    const branchId = session.activeBranchId

    // 0. Sucursal y su modo de servicio
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        code: true,
        logoUrl: true,
        bgColor: true,
        primaryColor: true,
        secondaryColor: true,
        buttonColor: true,
      },
    })

    let tableServiceMode = 'FREE'
    let isotypeUrl: string | null = null
    let sidebarTheme = 'DARK'
    try {
      const modeRows = await prisma.$queryRawUnsafe<Array<{ tableServiceMode?: string; isotypeUrl?: string; sidebarTheme?: string }>>(
        `SELECT "tableServiceMode", "isotypeUrl", "sidebarTheme" FROM "branches" WHERE id = $1 LIMIT 1`,
        branchId
      )
      if (modeRows && modeRows[0]) {
        if (modeRows[0].tableServiceMode) tableServiceMode = modeRows[0].tableServiceMode
        if (modeRows[0].isotypeUrl) isotypeUrl = modeRows[0].isotypeUrl
        if (modeRows[0].sidebarTheme) sidebarTheme = modeRows[0].sidebarTheme
      }
    } catch (e) {
      console.warn('Advertencia al consultar atributos de branches en comandas:', e)
    }

    // 1. Obtener áreas con sus mesas (incluyendo mesero titular y temporal)
    const areas = await prisma.area.findMany({
      where: { branchId, active: true },
      include: {
        tables: {
          where: { active: true },
          include: {
            assignedWaiter: { select: { id: true, name: true } },
            currentWaiter: { select: { id: true, name: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // 2. Obtener órdenes activas (no pagadas ni canceladas) en las mesas
    const activeOrders = await prisma.order.findMany({
      where: {
        branchId,
        status: { in: ['DRAFT', 'SENT', 'PREPARING', 'SERVED'] },
        tableId: { not: null },
      },
      include: {
        table: true,
        waiter: { select: { id: true, name: true } },
        items: {
          include: {
            productVariant: {
              include: { product: { select: { id: true, name: true, categoryId: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { openedAt: 'asc' },
    })

    // 3. Obtener meseros y colaboradores disponibles en la sucursal activa
    const waiters = await prisma.user.findMany({
      where: {
        businessId: session.businessId,
        active: true,
        userBranches: { some: { branchId } },
      },
      select: {
        id: true,
        name: true,
        roles: {
          select: {
            role: {
              select: { code: true, name: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Mapear orden activa por mesa
    const ordersByTableId = new Map<string, any>()
    for (const order of activeOrders) {
      if (order.tableId) {
        ordersByTableId.set(order.tableId, {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          orderType: order.orderType,
          status: order.status,
          subtotal: Number(order.subtotal),
          total: Number(order.total),
          openedAt: order.openedAt,
          waiter: order.waiter,
          itemsCount: order.items.length,
          items: order.items.map((it) => ({
            id: it.id,
            productName: it.productVariant.product.name,
            variantName: it.productVariant.name,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            subtotal: Number(it.subtotal),
            notes: it.notes,
            kitchenStatus: it.kitchenStatus || 'PENDING',
          })),
        })
      }
    }

    // Estructurar respuesta con mesas enriquecidas con su orden
    const areasWithTables = areas.map((area) => ({
      id: area.id,
      name: area.name,
      tables: area.tables.map((table) => {
        const activeOrder = ordersByTableId.get(table.id) || null
        return {
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          status: activeOrder ? (table.status === 'AVAILABLE' ? 'OCCUPIED' : table.status) : table.status,
          assignedWaiter: table.assignedWaiter ? { id: table.assignedWaiter.id, name: table.assignedWaiter.name } : null,
          currentWaiter: table.currentWaiter ? { id: table.currentWaiter.id, name: table.currentWaiter.name } : null,
          activeOrder,
        }
      }),
    }))

    // Mesas sin área asignada (si las hay)
    const unassignedTables = await prisma.table.findMany({
      where: { branchId, active: true, areaId: null },
      include: {
        assignedWaiter: { select: { id: true, name: true } },
        currentWaiter: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })

    const unassignedWithOrders = unassignedTables.map((table) => {
      const activeOrder = ordersByTableId.get(table.id) || null
      return {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        status: activeOrder ? (table.status === 'AVAILABLE' ? 'OCCUPIED' : table.status) : table.status,
        assignedWaiter: table.assignedWaiter ? { id: table.assignedWaiter.id, name: table.assignedWaiter.name } : null,
        currentWaiter: table.currentWaiter ? { id: table.currentWaiter.id, name: table.currentWaiter.name } : null,
        activeOrder,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        branch: branch
          ? {
              id: branch.id,
              name: branch.name,
              code: branch.code,
              logoUrl: branch.logoUrl,
              bgColor: branch.bgColor,
              primaryColor: branch.primaryColor,
              secondaryColor: branch.secondaryColor,
              buttonColor: branch.buttonColor,
              isotypeUrl: isotypeUrl ?? (branch as any)?.isotypeUrl ?? null,
              sidebarTheme: sidebarTheme ?? (branch as any)?.sidebarTheme ?? 'DARK',
            }
          : null,
        areas: areasWithTables,
        unassignedTables: unassignedWithOrders,
        tableServiceMode,
        waiters: waiters.map(w => ({
          id: w.id,
          name: w.name,
          roles: w.roles.map(r => r.role.name),
        })),
      },
    })
  } catch (error) {
    console.error('Error en GET /api/comandas/tables:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar mesas y comandas' } },
      { status: 500 }
    )
  }
}

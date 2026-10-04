import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sin sucursal activa' } },
        { status: 401 }
      )
    }

    const branchId = session.activeBranchId

    // 1. Datos de la sucursal y modo de servicio
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
      console.warn('Advertencia al consultar atributos de branches:', e)
    }

    // 2. Áreas de la sucursal
    const areas = await prisma.area.findMany({
      where: { branchId, active: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    })

    // 3. Mesas con mesero titular y órdenes activas
    const tables = await prisma.table.findMany({
      where: { branchId, active: true },
      include: {
        area: { select: { id: true, name: true } },
        assignedWaiter: { select: { id: true, name: true } },
        currentWaiter: { select: { id: true, name: true } },
        orders: {
          where: { status: { in: ['DRAFT', 'SENT', 'PREPARING', 'SERVED'] } },
          select: {
            id: true,
            orderNumber: true,
            total: true,
            openedAt: true,
            waiter: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ areaId: 'asc' }, { name: 'asc' }],
    })

    // 4. Meseros y colaboradores asignables de la sucursal
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
            role: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        branch: {
          id: branch?.id,
          name: branch?.name,
          code: branch?.code,
          logoUrl: branch?.logoUrl,
          bgColor: branch?.bgColor,
          primaryColor: branch?.primaryColor,
          secondaryColor: branch?.secondaryColor,
          buttonColor: branch?.buttonColor,
          isotypeUrl: isotypeUrl ?? (branch as any)?.isotypeUrl ?? null,
          sidebarTheme: sidebarTheme ?? (branch as any)?.sidebarTheme ?? 'DARK',
          tableServiceMode,
        },
        areas,
        tables: tables.map((t) => ({
          id: t.id,
          name: t.name,
          capacity: t.capacity || 4,
          status: t.status,
          areaId: t.areaId,
          areaName: t.area?.name || 'General / Sin Área',
          assignedWaiter: t.assignedWaiter,
          currentWaiter: t.currentWaiter,
          activeOrder: t.orders[0]
            ? {
                id: t.orders[0].id,
                orderNumber: t.orders[0].orderNumber,
                total: Number(t.orders[0].total),
                openedAt: t.orders[0].openedAt,
                waiter: t.orders[0].waiter,
              }
            : null,
        })),
        waiters: waiters.map((w) => ({
          id: w.id,
          name: w.name,
          roles: w.roles.map((r) => r.role.name),
        })),
      },
    })
  } catch (error) {
    console.error('Error en GET /api/tables:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar mesas' } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sin sucursal activa' } },
        { status: 401 }
      )
    }

    const branchId = session.activeBranchId
    const body = await request.json()
    const { action } = body

    // Acción 1: Cambiar Modo de Servicio en Mesas (LIBRE vs ASIGNADO)
    if (action === 'UPDATE_SERVICE_MODE') {
      const mode = body.tableServiceMode === 'ASSIGNED' ? 'ASSIGNED' : 'FREE'

      await prisma.$executeRawUnsafe(
        `UPDATE "branches" SET "tableServiceMode" = $1 WHERE id = $2`,
        mode,
        branchId
      )

      return NextResponse.json({
        success: true,
        data: { id: branchId, tableServiceMode: mode },
        message:
          mode === 'ASSIGNED'
            ? 'Modo cambiado: Meseros asignados por mesa (titular)'
            : 'Modo cambiado: Servicio libre (cualquier mesero puede tomar cualquier mesa)',
      })
    }

    // Acción 2: Generación masiva rápida de mesas (ej: Crear 10 mesas numeradas)
    if (action === 'BULK_GENERATE') {
      const count = Math.min(Math.max(1, Number(body.count) || 1), 60)
      const prefix = body.prefix ? body.prefix.trim() : 'Mesa'
      const capacity = Number(body.capacity) || 4
      const areaId = body.areaId || null
      const startNumber = Number(body.startNumber) || 1

      const createdTables = []
      let skippedCount = 0

      for (let i = 0; i < count; i++) {
        const num = startNumber + i
        const name = `${prefix} ${num}`.trim()

        // Verificar si ya existe para evitar error de duplicado
        const exists = await prisma.table.findUnique({
          where: { branchId_name: { branchId, name } },
        })

        if (!exists) {
          const t = await prisma.table.create({
            data: {
              branchId,
              name,
              capacity,
              areaId,
              status: 'AVAILABLE',
            },
          })
          createdTables.push(t)
        } else {
          skippedCount++
        }
      }

      return NextResponse.json({
        success: true,
        data: { createdCount: createdTables.length, skippedCount },
        message: `Se generaron ${createdTables.length} mesas exitosamente${
          skippedCount > 0 ? ` (${skippedCount} ya existían)` : ''
        }`,
      })
    }

    // Acción 3: Crear mesa individual
    const { name, capacity, areaId, assignedWaiterId } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'El nombre de la mesa es requerido (ej: Mesa 1, Terraza 2)' } },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    // Validar nombre duplicado
    const existing = await prisma.table.findUnique({
      where: { branchId_name: { branchId, name: trimmedName } },
    })

    if (existing) {
      if (!existing.active) {
        // Reactivar si estaba inactiva
        const reactivated = await prisma.table.update({
          where: { id: existing.id },
          data: {
            active: true,
            capacity: Number(capacity) || 4,
            areaId: areaId || null,
            assignedWaiterId: assignedWaiterId || null,
            status: 'AVAILABLE',
          },
          include: {
            area: { select: { id: true, name: true } },
            assignedWaiter: { select: { id: true, name: true } },
          },
        })
        return NextResponse.json({
          success: true,
          data: reactivated,
          message: `Mesa ${trimmedName} reactivada`,
        })
      }
      return NextResponse.json(
        { success: false, error: { message: `Ya existe una mesa con el nombre "${trimmedName}" en esta sucursal` } },
        { status: 400 }
      )
    }

    const newTable = await prisma.table.create({
      data: {
        branchId,
        name: trimmedName,
        capacity: Number(capacity) || 4,
        areaId: areaId || null,
        assignedWaiterId: assignedWaiterId || null,
        status: 'AVAILABLE',
      },
      include: {
        area: { select: { id: true, name: true } },
        assignedWaiter: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: newTable,
      message: `Mesa ${trimmedName} creada exitosamente`,
    })
  } catch (error) {
    console.error('Error en POST /api/tables:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al procesar la solicitud de mesas' } },
      { status: 500 }
    )
  }
}

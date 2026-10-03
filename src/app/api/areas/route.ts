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

    const areas = await prisma.area.findMany({
      where: { branchId, active: true },
      include: {
        _count: {
          select: { tables: { where: { active: true } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: areas.map((a) => ({
        id: a.id,
        name: a.name,
        sortOrder: a.sortOrder,
        tablesCount: a._count.tables,
      })),
    })
  } catch (error) {
    console.error('Error en GET /api/areas:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar áreas' } },
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
    const { name, sortOrder, tablesCount, prefix, capacity, defaultWaiterId } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'El nombre del área es requerido (ej: Terraza, Salón Frontal, Patio)' } },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    // 1. Crear el Área
    const area = await prisma.area.create({
      data: {
        branchId,
        name: trimmedName,
        sortOrder: Number(sortOrder) || 0,
        active: true,
      },
    })

    // 2. Si se solicitó crear mesas para esta área, crearlas en lote
    const count = Math.min(Math.max(0, Number(tablesCount) || 0), 50)
    const createdTables = []
    let skippedCount = 0

    if (count > 0) {
      const tablePrefix = prefix && prefix.trim() ? prefix.trim() : trimmedName
      const tableCapacity = Number(capacity) || 4
      const waiterId = defaultWaiterId || null

      for (let i = 1; i <= count; i++) {
        const tableName = `${tablePrefix} ${i}`

        // Verificar existencia previa
        const existing = await prisma.table.findUnique({
          where: { branchId_name: { branchId, name: tableName } },
        })

        if (!existing) {
          const t = await prisma.table.create({
            data: {
              branchId,
              areaId: area.id,
              name: tableName,
              capacity: tableCapacity,
              assignedWaiterId: waiterId,
              status: 'AVAILABLE',
              active: true,
            },
          })
          createdTables.push(t)
        } else {
          skippedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        area: {
          id: area.id,
          name: area.name,
          tablesCount: createdTables.length,
        },
        createdTablesCount: createdTables.length,
        skippedCount,
      },
      message:
        count > 0
          ? `Área "${trimmedName}" creada con ${createdTables.length} mesas exitosamente${
              skippedCount > 0 ? ` (${skippedCount} ya existían con ese nombre)` : ''
            }`
          : `Área "${trimmedName}" creada exitosamente`,
    })
  } catch (error) {
    console.error('Error en POST /api/areas:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al crear el área' } },
      { status: 500 }
    )
  }
}

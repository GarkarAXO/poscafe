import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PUT(
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
    const branchId = session.activeBranchId
    const body = await request.json()

    // Verificar que la mesa pertenezca a la sucursal activa
    const table = await prisma.table.findFirst({
      where: { id: tableId, branchId },
    })

    if (!table) {
      return NextResponse.json(
        { success: false, error: { message: 'Mesa no encontrada en esta sucursal' } },
        { status: 404 }
      )
    }

    const { name, capacity, areaId, assignedWaiterId } = body

    // Si se cambia el nombre, validar duplicados
    if (name && name.trim() !== table.name) {
      const trimmed = name.trim()
      const existing = await prisma.table.findUnique({
        where: { branchId_name: { branchId, name: trimmed } },
      })
      if (existing && existing.id !== tableId) {
        return NextResponse.json(
          { success: false, error: { message: `Ya existe una mesa con el nombre "${trimmed}"` } },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.table.update({
      where: { id: tableId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(capacity !== undefined ? { capacity: Number(capacity) } : {}),
        ...(areaId !== undefined ? { areaId: areaId || null } : {}),
        ...(assignedWaiterId !== undefined ? { assignedWaiterId: assignedWaiterId || null } : {}),
      },
      include: {
        area: { select: { id: true, name: true } },
        assignedWaiter: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Mesa actualizada correctamente',
    })
  } catch (error) {
    console.error('Error en PUT /api/tables/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar la mesa' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const branchId = session.activeBranchId

    const table = await prisma.table.findFirst({
      where: { id: tableId, branchId },
      include: {
        orders: {
          where: { status: { in: ['DRAFT', 'SENT', 'PREPARING', 'SERVED'] } },
        },
      },
    })

    if (!table) {
      return NextResponse.json(
        { success: false, error: { message: 'Mesa no encontrada en esta sucursal' } },
        { status: 404 }
      )
    }

    // No permitir eliminar si hay comanda activa
    if (table.orders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `No se puede eliminar ${table.name} porque tiene una comanda activa en curso. Debe cerrarse o cobrarse primero en caja.`,
          },
        },
        { status: 400 }
      )
    }

    // Marcar inactiva para preservar histórico de órdenes pasadas
    await prisma.table.update({
      where: { id: tableId },
      data: {
        active: false,
        deletedAt: new Date(),
        assignedWaiterId: null,
        currentWaiterId: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Mesa ${table.name} eliminada exitosamente`,
    })
  } catch (error) {
    console.error('Error en DELETE /api/tables/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar la mesa' } },
      { status: 500 }
    )
  }
}

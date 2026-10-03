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

    const { id: areaId } = await params
    const branchId = session.activeBranchId
    const body = await request.json()
    const { name, sortOrder } = body

    const area = await prisma.area.findFirst({
      where: { id: areaId, branchId },
    })

    if (!area) {
      return NextResponse.json(
        { success: false, error: { message: 'Área no encontrada en esta sucursal' } },
        { status: 404 }
      )
    }

    const updated = await prisma.area.update({
      where: { id: areaId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Área actualizada correctamente',
    })
  } catch (error) {
    console.error('Error en PUT /api/areas/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar el área' } },
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

    const { id: areaId } = await params
    const branchId = session.activeBranchId

    const area = await prisma.area.findFirst({
      where: { id: areaId, branchId },
    })

    if (!area) {
      return NextResponse.json(
        { success: false, error: { message: 'Área no encontrada en esta sucursal' } },
        { status: 404 }
      )
    }

    // Desasociar mesas pertenecientes a esta área para no eliminarlas por accidente
    await prisma.table.updateMany({
      where: { areaId, branchId },
      data: { areaId: null },
    })

    // Eliminar el área
    await prisma.area.delete({
      where: { id: areaId },
    })

    return NextResponse.json({
      success: true,
      message: `Área "${area.name}" eliminada. Las mesas asociadas se conservaron en "Sin Área".`,
    })
  } catch (error) {
    console.error('Error en DELETE /api/areas/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar el área' } },
      { status: 500 }
    )
  }
}

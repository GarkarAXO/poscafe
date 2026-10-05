import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const existing = await prisma.cupSize.findFirst({
      where: { id, businessId: session.businessId, active: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tamaño de vaso no encontrado' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, capacityOz, cupItemId, lidItemId, sleeveItemId, sortOrder } = body

    const updated = await prisma.cupSize.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        capacityOz: capacityOz !== undefined ? (capacityOz ? Number(capacityOz) : null) : existing.capacityOz,
        cupItemId: cupItemId !== undefined ? cupItemId || null : existing.cupItemId,
        lidItemId: lidItemId !== undefined ? lidItemId || null : existing.lidItemId,
        sleeveItemId: sleeveItemId !== undefined ? sleeveItemId || null : existing.sleeveItemId,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Tamaño de vaso actualizado exitosamente',
    })
  } catch (error) {
    console.error('Error en PUT /api/cup-sizes/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar tamaño de vaso' } },
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
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const existing = await prisma.cupSize.findFirst({
      where: { id, businessId: session.businessId, active: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tamaño de vaso no encontrado' } },
        { status: 404 }
      )
    }

    await prisma.cupSize.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Tamaño de vaso eliminado exitosamente',
    })
  } catch (error) {
    console.error('Error en DELETE /api/cup-sizes/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar tamaño de vaso' } },
      { status: 500 }
    )
  }
}

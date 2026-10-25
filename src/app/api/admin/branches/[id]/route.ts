import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso restringido a Super Administradores' } },
        { status: 401 }
      )
    }

    const { id: branchId } = await params
    const body = await request.json()
    const { name, maxStaff } = body

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'ID de sucursal requerido' } },
        { status: 400 }
      )
    }

    const existingBranch = await prisma.branch.findUnique({
      where: { id: branchId },
    })

    if (!existingBranch) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sucursal no encontrada' } },
        { status: 404 }
      )
    }

    const dataToUpdate: { name?: string; maxStaff?: number } = {}
    if (typeof name === 'string' && name.trim().length > 0) {
      dataToUpdate.name = name.trim()
    }
    if (typeof maxStaff === 'number') {
      dataToUpdate.maxStaff = Math.max(1, Math.floor(maxStaff))
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_CHANGES', message: 'No se enviaron datos para actualizar' } },
        { status: 400 }
      )
    }

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        code: true,
        maxStaff: true,
        businessId: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Sucursal actualizada exitosamente',
    })
  } catch (error) {
    console.error('Error en PATCH /api/admin/branches/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar sucursal' } },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context)
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/suppliers/[id] - Obtener detalle de proveedor
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const supplier = await prisma.supplier.findFirst({
      where: { id, businessId: session.businessId },
      include: {
        purchases: {
          orderBy: { purchasedAt: 'desc' },
          take: 20,
          include: {
            branch: { select: { id: true, name: true } },
            items: {
              include: {
                inventoryItem: { select: { id: true, name: true, baseUnit: true } },
              },
            },
          },
        },
        _count: { select: { purchases: true } },
      },
    })

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Proveedor no encontrado' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    console.error('Error en GET /api/suppliers/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar proveedor' } },
      { status: 500 }
    )
  }
}

// PUT /api/suppliers/[id] - Actualizar proveedor
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, contact, phone, email, taxId, active } = body

    const existing = await prisma.supplier.findFirst({
      where: { id, businessId: session.businessId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Proveedor no encontrado' } },
        { status: 404 }
      )
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(contact !== undefined && { contact: contact?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(taxId !== undefined && { taxId: taxId?.trim() || null }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    })

    await prisma.auditLog.create({
      data: {
        businessId: session.businessId,
        userId: session.userId,
        action: 'SUPPLIER_UPDATED',
        entityType: 'Supplier',
        entityId: id,
        payload: { name: updated.name, active: updated.active },
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Proveedor actualizado correctamente',
    })
  } catch (error) {
    console.error('Error en PUT /api/suppliers/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar proveedor' } },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Eliminar o desactivar proveedor
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const existing = await prisma.supplier.findFirst({
      where: { id, businessId: session.businessId },
      include: { _count: { select: { purchases: true } } },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Proveedor no encontrado' } },
        { status: 404 }
      )
    }

    if (existing._count.purchases > 0) {
      // Si tiene compras asociadas, se desactiva para mantener la integridad contable
      await prisma.supplier.update({
        where: { id },
        data: { active: false },
      })
      return NextResponse.json({
        success: true,
        message: 'El proveedor tiene compras registradas. Se ha desactivado del directorio.',
      })
    }

    // Si no tiene compras, se puede eliminar de forma definitiva
    await prisma.supplier.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Proveedor eliminado del sistema',
    })
  } catch (error) {
    console.error('Error en DELETE /api/suppliers/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar proveedor' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
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
    const group = await prisma.modifierGroup.findFirst({
      where: { id, businessId: session.businessId, active: true },
    })

    if (!group) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Grupo no encontrado' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, extraPrice = 0, inventoryItemId, quantityBase } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El nombre de la opción es obligatorio' } },
        { status: 400 }
      )
    }

    const newModifier = await prisma.modifier.create({
      data: {
        modifierGroupId: id,
        name: name.trim(),
        extraPrice: Number(extraPrice) || 0,
        inventoryItemId: inventoryItemId || null,
        quantityBase: quantityBase ? Number(quantityBase) : null,
        active: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: newModifier,
      message: 'Opción agregada exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/modifier-groups/[id]/modifiers:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al agregar opción' } },
      { status: 500 }
    )
  }
}

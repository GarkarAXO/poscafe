import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
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
      include: {
        modifiers: { where: { active: true }, orderBy: { name: 'asc' } },
        products: { include: { product: true } },
      },
    })

    if (!group) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Grupo no encontrado' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: group })
  } catch (error) {
    console.error('Error en GET /api/modifier-groups/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener grupo' } },
      { status: 500 }
    )
  }
}

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
    const body = await request.json()
    const { name, minSelect, maxSelect, isRequired, modifiers } = body

    const existing = await prisma.modifierGroup.findFirst({
      where: { id, businessId: session.businessId, active: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Grupo no encontrado' } },
        { status: 404 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const grp = await tx.modifierGroup.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(minSelect !== undefined && { minSelect: Number(minSelect) }),
          ...(maxSelect !== undefined && { maxSelect: Number(maxSelect) }),
          ...(isRequired !== undefined && { isRequired: Boolean(isRequired) }),
        },
      })

      // Si se envían modificadores, sincronizar
      if (Array.isArray(modifiers)) {
        // Desactivar modificadores actuales que no estén en la lista
        const incomingIds = modifiers.map((m: any) => m.id).filter(Boolean) as string[]
        await tx.modifier.updateMany({
          where: {
            modifierGroupId: id,
            id: { notIn: incomingIds },
          },
          data: { active: false },
        })

        // Upsert de modificadores enviados
        for (const m of modifiers) {
          if (m.id) {
            await tx.modifier.update({
              where: { id: m.id },
              data: {
                name: m.name.trim(),
                extraPrice: Number(m.extraPrice) || 0,
                inventoryItemId: m.inventoryItemId || null,
                quantityBase: m.quantityBase ? Number(m.quantityBase) : null,
                active: true,
              },
            })
          } else {
            await tx.modifier.create({
              data: {
                modifierGroupId: id,
                name: m.name.trim(),
                extraPrice: Number(m.extraPrice) || 0,
                inventoryItemId: m.inventoryItemId || null,
                quantityBase: m.quantityBase ? Number(m.quantityBase) : null,
                active: true,
              },
            })
          }
        }
      }

      return grp
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Grupo de modificadores actualizado',
    })
  } catch (error) {
    console.error('Error en PUT /api/modifier-groups/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar grupo' } },
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
    const existing = await prisma.modifierGroup.findFirst({
      where: { id, businessId: session.businessId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Grupo no encontrado' } },
        { status: 404 }
      )
    }

    // Desactivar grupo y sus modificadores
    await prisma.$transaction([
      prisma.modifierGroup.update({
        where: { id },
        data: { active: false },
      }),
      prisma.modifier.updateMany({
        where: { modifierGroupId: id },
        data: { active: false },
      }),
      prisma.productModifierGroup.deleteMany({
        where: { modifierGroupId: id },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Grupo de modificadores eliminado correctamente',
    })
  } catch (error) {
    console.error('Error en DELETE /api/modifier-groups/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar grupo' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const groups = await prisma.modifierGroup.findMany({
      where: {
        businessId: session.businessId,
        active: true,
      },
      include: {
        modifiers: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
        products: {
          select: {
            productId: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Obtener los nombres de insumos para enriquecer la respuesta
    const inventoryItemIds = Array.from(
      new Set(
        groups
          .flatMap((g) => g.modifiers)
          .map((m) => m.inventoryItemId)
          .filter(Boolean) as string[]
      )
    )

    let inventoryMap = new Map<string, { id: string; name: string; baseUnit: string }>()
    if (inventoryItemIds.length > 0) {
      const items = await prisma.inventoryItem.findMany({
        where: { id: { in: inventoryItemIds } },
        select: { id: true, name: true, baseUnit: true },
      })
      inventoryMap = new Map(items.map((i) => [i.id, i]))
    }

    const enrichedGroups = groups.map((g) => ({
      ...g,
      modifiers: g.modifiers.map((m) => ({
        ...m,
        extraPrice: Number(m.extraPrice),
        quantityBase: m.quantityBase ? Number(m.quantityBase) : null,
        inventoryItem: m.inventoryItemId ? inventoryMap.get(m.inventoryItemId) || null : null,
      })),
      productsCount: g.products.length,
    }))

    return NextResponse.json({ success: true, data: enrichedGroups })
  } catch (error) {
    console.error('Error en GET /api/modifier-groups:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener grupos de modificadores' } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, minSelect = 0, maxSelect = 1, isRequired = false, modifiers = [] } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El nombre del grupo es obligatorio' } },
        { status: 400 }
      )
    }

    const newGroup = await prisma.$transaction(async (tx) => {
      const group = await tx.modifierGroup.create({
        data: {
          businessId: session.businessId!,
          name: name.trim(),
          minSelect: Number(minSelect) || 0,
          maxSelect: Number(maxSelect) || 1,
          isRequired: Boolean(isRequired),
          active: true,
        },
      })

      if (Array.isArray(modifiers) && modifiers.length > 0) {
        await tx.modifier.createMany({
          data: modifiers.map((m: any) => ({
            modifierGroupId: group.id,
            name: m.name.trim(),
            extraPrice: Number(m.extraPrice) || 0,
            inventoryItemId: m.inventoryItemId || null,
            quantityBase: m.quantityBase ? Number(m.quantityBase) : null,
            active: true,
          })),
        })
      }

      return group
    })

    return NextResponse.json({
      success: true,
      data: newGroup,
      message: 'Grupo de modificadores creado exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/modifier-groups:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al crear grupo de modificadores' } },
      { status: 500 }
    )
  }
}

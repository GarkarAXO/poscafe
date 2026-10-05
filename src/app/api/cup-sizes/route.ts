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

    const cupSizes = await prisma.cupSize.findMany({
      where: {
        businessId: session.businessId,
        active: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { capacityOz: 'asc' }, { createdAt: 'asc' }],
    })

    // Fetch related inventory items for cups and lids if specified
    const allItemIds = Array.from(
      new Set(
        cupSizes
          .flatMap((cs) => [cs.cupItemId, cs.lidItemId, cs.sleeveItemId])
          .filter(Boolean) as string[]
      )
    )

    let itemsMap = new Map<string, { id: string; name: string; baseUnit: string; costPerUnit: any }>()
    if (allItemIds.length > 0) {
      const invItems = await prisma.inventoryItem.findMany({
        where: { id: { in: allItemIds } },
        select: { id: true, name: true, baseUnit: true, costPerUnit: true },
      })
      itemsMap = new Map(invItems.map((i) => [i.id, i]))
    }

    const data = cupSizes.map((cs) => ({
      ...cs,
      capacityOz: cs.capacityOz ? Number(cs.capacityOz) : null,
      cupItem: cs.cupItemId ? itemsMap.get(cs.cupItemId) || null : null,
      lidItem: cs.lidItemId ? itemsMap.get(cs.lidItemId) || null : null,
      sleeveItem: cs.sleeveItemId ? itemsMap.get(cs.sleeveItemId) || null : null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error en GET /api/cup-sizes:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener tamaños de vasos' } },
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
    const { name, capacityOz, cupItemId, lidItemId, sleeveItemId, sortOrder = 0 } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El nombre del tamaño de vaso es obligatorio' } },
        { status: 400 }
      )
    }

    const newCupSize = await prisma.cupSize.create({
      data: {
        businessId: session.businessId,
        name: name.trim(),
        capacityOz: capacityOz ? Number(capacityOz) : null,
        cupItemId: cupItemId || null,
        lidItemId: lidItemId || null,
        sleeveItemId: sleeveItemId || null,
        sortOrder: Number(sortOrder) || 0,
        active: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: newCupSize,
      message: 'Tamaño de vaso creado exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/cup-sizes:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar tamaño de vaso' } },
      { status: 500 }
    )
  }
}

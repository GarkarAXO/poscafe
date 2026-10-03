import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { InventoryPolicy } from '@prisma/client'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const products = await prisma.product.findMany({
      where: { businessId: session.businessId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { deletedAt: null },
          include: {
            recipe: {
              include: {
                items: {
                  include: {
                    inventoryItem: { select: { id: true, name: true, baseUnit: true, costPerUnit: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    console.error('Error en GET /api/products:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener productos' } },
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
    const {
      categoryId,
      name,
      code,
      description,
      price,
      cost,
      inventoryPolicy,
      directItemId,
      directQuantity,
      recipeItems, // Array<{ inventoryItemId: string, quantityBase: number }>
    } = body

    if (!categoryId || !name || price === undefined) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Categoría, nombre y precio son requeridos' } },
        { status: 400 }
      )
    }

    const cleanCode = code ? code.trim().toUpperCase() : `PROD-${Date.now().toString().slice(-6)}`
    const policy = (inventoryPolicy as InventoryPolicy) || InventoryPolicy.NONE

    // Calcular costo automático si tiene receta
    let estimatedCost = Number(cost) || 0
    if (policy === InventoryPolicy.RECIPE && Array.isArray(recipeItems) && recipeItems.length > 0) {
      const itemIds = recipeItems.map((r: any) => r.inventoryItemId)
      const dbItems = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, costPerUnit: true },
      })

      const costMap = new Map(dbItems.map((i) => [i.id, Number(i.costPerUnit)]))
      estimatedCost = recipeItems.reduce((acc: number, r: any) => {
        const unitCost = costMap.get(r.inventoryItemId) || 0
        return acc + unitCost * Number(r.quantityBase)
      }, 0)
    }

    const product = await prisma.$transaction(async (tx) => {
      // 1. Crear Producto
      const prod = await tx.product.create({
        data: {
          businessId: session.businessId!,
          categoryId,
          name: name.trim(),
          code: cleanCode,
          description: description?.trim() || null,
          inventoryPolicy: policy,
          hasVariants: false,
          active: true,
        },
      })

      // 2. Crear Variante Principal
      const variant = await tx.productVariant.create({
        data: {
          productId: prod.id,
          name: 'Regular',
          price: Number(price),
          cost: estimatedCost,
          inventoryPolicy: policy,
          directItemId: policy === InventoryPolicy.DIRECT ? directItemId : null,
          directQuantity: policy === InventoryPolicy.DIRECT ? Number(directQuantity) || 1 : null,
          active: true,
        },
      })

      // 3. Crear Receta si aplica
      if (policy === InventoryPolicy.RECIPE && Array.isArray(recipeItems) && recipeItems.length > 0) {
        await tx.recipe.create({
          data: {
            productVariantId: variant.id,
            yieldServings: 1,
            items: {
              create: recipeItems.map((r: any) => ({
                inventoryItemId: r.inventoryItemId,
                quantityBase: Number(r.quantityBase),
              })),
            },
          },
        })
      }

      return prod
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Producto registrado exitosamente',
    })
  } catch (error: any) {
    console.error('Error en POST /api/products:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_CODE', message: 'Ya existe un producto con ese código' } },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error interno al registrar producto' } },
      { status: 500 }
    )
  }
}

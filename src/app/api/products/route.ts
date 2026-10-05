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
          orderBy: { sortOrder: 'asc' },
        },
        modifierGroups: {
          include: {
            modifierGroup: {
              include: {
                modifiers: {
                  where: { active: true },
                  orderBy: { name: 'asc' },
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
      imageUrl,
      price,
      cost,
      inventoryPolicy,
      directItemId,
      directQuantity,
      recipeItems, // Array<{ inventoryItemId: string, quantityBase: number }> (para variante única)
      variants, // Array<{ name: string, price: number, cost?: number, sku?: string, inventoryPolicy?: string, directItemId?: string, directQuantity?: number, recipeItems?: Array<{ inventoryItemId: string, quantityBase: number }> }>
      modifierGroupIds = [], // Array<string>
      ownFlavors = [], // Array<string | { name: string, extraPrice?: number }> (sabores propios del producto)
    } = body

    if (!categoryId || !name) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Categoría y nombre son requeridos' } },
        { status: 400 }
      )
    }

    // Normalizar variantes
    let parsedVariants: Array<any> = []
    if (Array.isArray(variants) && variants.length > 0) {
      parsedVariants = variants
    } else {
      if (price === undefined) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'El precio es requerido' } },
          { status: 400 }
        )
      }
      parsedVariants = [
        {
          name: 'Regular',
          price: Number(price),
          cost: Number(cost) || 0,
          inventoryPolicy: inventoryPolicy || InventoryPolicy.NONE,
          directItemId: directItemId || null,
          directQuantity: directQuantity || 1,
          recipeItems: recipeItems || [],
        },
      ]
    }

    const hasVariants = parsedVariants.length > 1
    const cleanCode = code ? code.trim().toUpperCase() : `PROD-${Date.now().toString().slice(-6)}`
    const mainPolicy = (inventoryPolicy as InventoryPolicy) || InventoryPolicy.NONE

    // Obtener catálogo de costos de insumos para calcular costo de recetas
    const allRecipeItemIds = Array.from(
      new Set(
        parsedVariants
          .flatMap((v) => v.recipeItems || [])
          .map((r: any) => r.inventoryItemId)
          .filter(Boolean)
      )
    )

    let costMap = new Map<string, number>()
    if (allRecipeItemIds.length > 0) {
      const dbItems = await prisma.inventoryItem.findMany({
        where: { id: { in: allRecipeItemIds } },
        select: { id: true, costPerUnit: true },
      })
      costMap = new Map(dbItems.map((i) => [i.id, Number(i.costPerUnit)]))
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
          imageUrl: imageUrl || null,
          inventoryPolicy: mainPolicy,
          hasVariants,
          active: true,
        },
      })

      // 2. Crear Variantes (Tamaños) y sus recetas
      for (let i = 0; i < parsedVariants.length; i++) {
        const v = parsedVariants[i]
        const vPolicy = (v.inventoryPolicy as InventoryPolicy) || mainPolicy

        let vCost = Number(v.cost) || 0
        if (vPolicy === InventoryPolicy.RECIPE && Array.isArray(v.recipeItems) && v.recipeItems.length > 0) {
          vCost = v.recipeItems.reduce((acc: number, r: any) => {
            const unitCost = costMap.get(r.inventoryItemId) || 0
            return acc + unitCost * Number(r.quantityBase)
          }, 0)
        }

        const variant = await tx.productVariant.create({
          data: {
            productId: prod.id,
            name: v.name.trim(),
            sku: v.sku?.trim() || `${cleanCode}-${(i + 1).toString().padStart(2, '0')}`,
            price: Number(v.price),
            cost: vCost,
            inventoryPolicy: vPolicy,
            directItemId: vPolicy === InventoryPolicy.DIRECT ? v.directItemId : null,
            directQuantity: vPolicy === InventoryPolicy.DIRECT ? Number(v.directQuantity) || 1 : null,
            sortOrder: i,
            active: true,
          },
        })

        // Crear Receta de la variante si aplica
        if (vPolicy === InventoryPolicy.RECIPE && Array.isArray(v.recipeItems) && v.recipeItems.length > 0) {
          await tx.recipe.create({
            data: {
              productVariantId: variant.id,
              yieldServings: 1,
              items: {
                create: v.recipeItems.map((r: any) => ({
                  inventoryItemId: r.inventoryItemId,
                  quantityBase: Number(r.quantityBase),
                  onlyTakeaway: Boolean(r.onlyTakeaway),
                })),
              },
            },
          })
        }
      }

      // 3. Vincular Grupos de Modificadores (Extras generales)
      if (Array.isArray(modifierGroupIds) && modifierGroupIds.length > 0) {
        await tx.productModifierGroup.createMany({
          data: modifierGroupIds.map((groupId: string) => ({
            productId: prod.id,
            modifierGroupId: groupId,
          })),
          skipDuplicates: true,
        })
      }

      // 4. Sabores propios del producto (creación automática en un solo paso)
      if (Array.isArray(ownFlavors) && ownFlavors.length > 0) {
        const cleanFlavors = ownFlavors
          .map((f: any) =>
            typeof f === 'string'
              ? { name: f.trim(), extraPrice: 0 }
              : { name: f.name?.trim() || '', extraPrice: Number(f.extraPrice) || 0 }
          )
          .filter((f) => f.name.length > 0)

        if (cleanFlavors.length > 0) {
          const flavorGroup = await tx.modifierGroup.create({
            data: {
              businessId: session.businessId!,
              name: `Sabores de ${prod.name}`,
              minSelect: 1,
              maxSelect: 1,
              isRequired: true,
              active: true,
              modifiers: {
                create: cleanFlavors.map((f) => ({
                  name: f.name,
                  extraPrice: f.extraPrice,
                  active: true,
                })),
              },
            },
          })

          await tx.productModifierGroup.create({
            data: {
              productId: prod.id,
              modifierGroupId: flavorGroup.id,
            },
          })
        }
      }

      return prod
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Producto registrado exitosamente con sus tamaños y modificadores',
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

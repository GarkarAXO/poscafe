import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { InventoryPolicy } from '@prisma/client'

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
    const product = await prisma.product.findFirst({
      where: { id, businessId: session.businessId, deletedAt: null },
      include: {
        category: true,
        variants: {
          where: { deletedAt: null },
          include: {
            recipe: {
              include: {
                items: {
                  include: { inventoryItem: true },
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
                modifiers: { where: { active: true }, orderBy: { name: 'asc' } },
              },
            },
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('Error en GET /api/products/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar producto' } },
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
    const {
      categoryId,
      name,
      code,
      description,
      imageUrl,
      inventoryPolicy,
      variants,
      modifierGroupIds,
      ownFlavors,
    } = body

    const existing = await prisma.product.findFirst({
      where: { id, businessId: session.businessId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } },
        { status: 404 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Actualizar datos base del producto
      const prod = await tx.product.update({
        where: { id },
        data: {
          ...(categoryId && { categoryId }),
          ...(name && { name: name.trim() }),
          ...(code && { code: code.trim().toUpperCase() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
          ...(inventoryPolicy && { inventoryPolicy }),
          ...(Array.isArray(variants) && { hasVariants: variants.length > 1 }),
        },
      })

      // 2. Si se actualizan variantes
      if (Array.isArray(variants) && variants.length > 0) {
        // Soft delete de variantes actuales
        await tx.productVariant.updateMany({
          where: { productId: id },
          data: { deletedAt: new Date(), active: false },
        })

        // Recrear variantes con sus recetas
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i]
          const vPolicy = (v.inventoryPolicy as InventoryPolicy) || prod.inventoryPolicy

          const createdVariant = await tx.productVariant.create({
            data: {
              productId: id,
              name: v.name.trim(),
              sku: v.sku?.trim() || `${prod.code}-${(i + 1).toString().padStart(2, '0')}`,
              price: Number(v.price),
              cost: Number(v.cost) || 0,
              inventoryPolicy: vPolicy,
              directItemId: vPolicy === InventoryPolicy.DIRECT ? v.directItemId : null,
              directQuantity: vPolicy === InventoryPolicy.DIRECT ? Number(v.directQuantity) || 1 : null,
              sortOrder: i,
              active: true,
            },
          })

          if (vPolicy === InventoryPolicy.RECIPE && Array.isArray(v.recipeItems) && v.recipeItems.length > 0) {
            await tx.recipe.create({
              data: {
                productVariantId: createdVariant.id,
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
      }

      // 3. Sincronizar grupos de modificadores y sabores propios
      let finalGroupIds: string[] = Array.isArray(modifierGroupIds) ? [...modifierGroupIds] : []

      if (Array.isArray(ownFlavors)) {
        const cleanFlavors = ownFlavors
          .map((f: any) =>
            typeof f === 'string'
              ? { name: f.trim(), extraPrice: 0 }
              : { name: f.name?.trim() || '', extraPrice: Number(f.extraPrice) || 0 }
          )
          .filter((f) => f.name.length > 0)

        // Buscar si ya tiene un grupo de sabores propio vinculado
        const currentGroups = await tx.productModifierGroup.findMany({
          where: { productId: id },
          include: { modifierGroup: true },
        })

        const existingFlavorGroup = currentGroups.find(
          (cg) =>
            cg.modifierGroup.name.startsWith('Sabores de ') ||
            cg.modifierGroup.name.startsWith('Sabores - ')
        )

        if (cleanFlavors.length > 0) {
          if (existingFlavorGroup) {
            // Actualizar opciones del grupo existente
            await tx.modifier.updateMany({
              where: { modifierGroupId: existingFlavorGroup.modifierGroupId },
              data: { active: false },
            })
            for (const f of cleanFlavors) {
              await tx.modifier.create({
                data: {
                  modifierGroupId: existingFlavorGroup.modifierGroupId,
                  name: f.name,
                  extraPrice: f.extraPrice,
                  active: true,
                },
              })
            }
            if (!finalGroupIds.includes(existingFlavorGroup.modifierGroupId)) {
              finalGroupIds.push(existingFlavorGroup.modifierGroupId)
            }
          } else {
            // Crear nuevo grupo de sabores
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
            finalGroupIds.push(flavorGroup.id)
          }
        } else if (existingFlavorGroup) {
          // Desactivar grupo de sabores si se eliminaron todos
          await tx.modifierGroup.update({
            where: { id: existingFlavorGroup.modifierGroupId },
            data: { active: false },
          })
          finalGroupIds = finalGroupIds.filter((gid) => gid !== existingFlavorGroup.modifierGroupId)
        }
      }

      if (Array.isArray(modifierGroupIds) || Array.isArray(ownFlavors)) {
        await tx.productModifierGroup.deleteMany({
          where: { productId: id },
        })

        if (finalGroupIds.length > 0) {
          await tx.productModifierGroup.createMany({
            data: finalGroupIds.map((groupId: string) => ({
              productId: id,
              modifierGroupId: groupId,
            })),
            skipDuplicates: true,
          })
        }
      }

      return prod
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Producto actualizado correctamente',
    })
  } catch (error: any) {
    console.error('Error en PUT /api/products/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar producto' } },
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

    const existing = await prisma.product.findFirst({
      where: { id, businessId: session.businessId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } },
        { status: 404 }
      )
    }

    await prisma.product.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, message: 'Producto archivado correctamente' })
  } catch (error) {
    console.error('Error en DELETE /api/products/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar producto' } },
      { status: 500 }
    )
  }
}

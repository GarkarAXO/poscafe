import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { InventoryUnit, StockMovementType } from '@prisma/client'

// GET /api/inventory/items - Lista insumos con stock y presentaciones
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const activeFilter = searchParams.get('active')

    const items = await prisma.inventoryItem.findMany({
      where: {
        businessId: session.businessId,
        deletedAt: null,
        ...(activeFilter === 'true' ? { active: true } : activeFilter === 'false' ? { active: false } : {}),
      },
      include: {
        presentations: { where: { active: true } },
        warehouseStock: {
          include: {
            warehouse: { select: { id: true, name: true, branchId: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Mapeo seguro con tipos numéricos para garantizar que no ocurra NaN
    const mapped = items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      baseUnit: item.baseUnit,
      costPerUnit: Number(item.costPerUnit) || 0,
      reorderPoint: item.reorderPoint !== null ? Number(item.reorderPoint) : null,
      optimalStock: item.optimalStock !== null ? Number(item.optimalStock) : null,
      yieldLossFactor: Number(item.yieldLossFactor) || 0,
      active: item.active,
      presentations: item.presentations.map((p) => ({
        id: p.id,
        name: p.name,
        factorToBase: Number(p.factorToBase) || 1,
        cost: p.cost !== null ? Number(p.cost) : null,
      })),
      warehouseStock: item.warehouseStock.map((ws) => {
        const qty = Number(ws.quantity) || 0
        return {
          id: ws.id,
          warehouseId: ws.warehouseId,
          quantity: qty,
          currentStock: qty, // Garantiza compatibilidad y elimina el error NaN
          warehouse: ws.warehouse,
        }
      }),
    }))

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error('Error en GET /api/inventory/items:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener insumos' } },
      { status: 500 }
    )
  }
}

// POST /api/inventory/items - Crea un nuevo insumo con unidad base y presentación inicial opcional
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
      name,
      sku,
      baseUnit,
      costPerUnit,
      reorderPoint,
      optimalStock,
      yieldLossFactor,
      presentationName,
      presentationFactor,
      presentationCost,
    } = body

    if (!name || !baseUnit) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Nombre y unidad base son obligatorios' } },
        { status: 400 }
      )
    }

    const cleanSku = sku ? sku.trim().toUpperCase() : `INS-${Date.now().toString().slice(-6)}`

    // Validar SKU único en el negocio
    const existing = await prisma.inventoryItem.findFirst({
      where: { businessId: session.businessId, sku: cleanSku, deletedAt: null },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_SKU', message: `El SKU "${cleanSku}" ya existe` } },
        { status: 409 }
      )
    }

    const item = await prisma.inventoryItem.create({
      data: {
        businessId: session.businessId,
        sku: cleanSku,
        name: name.trim(),
        baseUnit: baseUnit as InventoryUnit,
        costPerUnit: Number(costPerUnit) || 0,
        reorderPoint: reorderPoint ? Number(reorderPoint) : null,
        optimalStock: optimalStock ? Number(optimalStock) : null,
        yieldLossFactor: yieldLossFactor ? Number(yieldLossFactor) : 0,
        active: true,
        presentations:
          presentationName && presentationFactor
            ? {
                create: [
                  {
                    name: presentationName.trim(),
                    factorToBase: Number(presentationFactor),
                    cost: presentationCost ? Number(presentationCost) : null,
                    active: true,
                  },
                ],
              }
            : undefined,
      },
      include: {
        presentations: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: item,
      message: 'Insumo creado correctamente',
    })
  } catch (error) {
    console.error('Error en POST /api/inventory/items:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar insumo' } },
      { status: 500 }
    )
  }
}

// PUT /api/inventory/items - Actualiza un insumo, su estado activo/inactivo o ajusta stock
export async function PUT(request: Request) {
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
      id,
      name,
      sku,
      baseUnit,
      costPerUnit,
      reorderPoint,
      optimalStock,
      yieldLossFactor,
      active,
      newStockQuantity, // Corrección manual opcional de stock
      warehouseId,
    } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'ID del insumo es obligatorio' } },
        { status: 400 }
      )
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, businessId: session.businessId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Insumo no encontrado' } },
        { status: 404 }
      )
    }

    // Validar SKU si cambió
    if (sku && sku.trim().toUpperCase() !== existing.sku) {
      const cleanSku = sku.trim().toUpperCase()
      const skuExists = await prisma.inventoryItem.findFirst({
        where: {
          businessId: session.businessId,
          sku: cleanSku,
          id: { not: id },
          deletedAt: null,
        },
      })
      if (skuExists) {
        return NextResponse.json(
          { success: false, error: { code: 'DUPLICATE_SKU', message: `El SKU "${cleanSku}" ya está registrado en otro insumo` } },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(sku !== undefined && { sku: sku.trim().toUpperCase() }),
          ...(baseUnit !== undefined && { baseUnit: baseUnit as InventoryUnit }),
          ...(costPerUnit !== undefined && { costPerUnit: Number(costPerUnit) }),
          ...(reorderPoint !== undefined && { reorderPoint: reorderPoint !== null && reorderPoint !== '' ? Number(reorderPoint) : null }),
          ...(optimalStock !== undefined && { optimalStock: optimalStock !== null && optimalStock !== '' ? Number(optimalStock) : null }),
          ...(yieldLossFactor !== undefined && { yieldLossFactor: Number(yieldLossFactor) || 0 }),
          ...(active !== undefined && { active: Boolean(active) }),
        },
        include: {
          presentations: true,
          warehouseStock: {
            include: {
              warehouse: { select: { id: true, name: true, branchId: true } },
            },
          },
        },
      })

      // Corrección manual de stock en almacén si se especificó una nueva cantidad
      if (newStockQuantity !== undefined && newStockQuantity !== null && newStockQuantity !== '' && !isNaN(Number(newStockQuantity))) {
        const targetQty = Number(newStockQuantity)
        let targetWarehouseId = warehouseId

        if (!targetWarehouseId) {
          const defWarehouse =
            (await tx.warehouse.findFirst({
              where: {
                branch: { businessId: session.businessId },
                isDefault: true,
                active: true,
              },
            })) ||
            (await tx.warehouse.findFirst({
              where: {
                branch: { businessId: session.businessId },
                active: true,
              },
            }))
          targetWarehouseId = defWarehouse?.id
        }

        if (targetWarehouseId) {
          const currentStockRecord = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_inventoryItemId: {
                warehouseId: targetWarehouseId,
                inventoryItemId: id,
              },
            },
          })

          const previousQty = currentStockRecord ? Number(currentStockRecord.quantity) : 0
          const diff = targetQty - previousQty

          await tx.warehouseStock.upsert({
            where: {
              warehouseId_inventoryItemId: {
                warehouseId: targetWarehouseId,
                inventoryItemId: id,
              },
            },
            update: { quantity: targetQty },
            create: {
              warehouseId: targetWarehouseId,
              inventoryItemId: id,
              quantity: targetQty,
            },
          })

          if (diff !== 0) {
            await tx.stockMovement.create({
              data: {
                inventoryItemId: id,
                targetWarehouseId,
                type: diff > 0 ? StockMovementType.ADJUST_POSITIVE : StockMovementType.ADJUST_NEGATIVE,
                quantityBase: Math.abs(diff),
                unitCost: item.costPerUnit,
                totalCost: Math.abs(diff) * Number(item.costPerUnit),
                referenceType: 'MANUAL_ADJUSTMENT',
                notes: `Corrección manual de stock: de ${previousQty} a ${targetQty} ${item.baseUnit}`,
              },
            })
          }
        }
      }

      return item
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Insumo actualizado exitosamente',
    })
  } catch (error: any) {
    console.error('Error en PUT /api/inventory/items:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Error al actualizar insumo' } },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/items - Desactivar o archivar insumo
export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'ID del insumo es requerido' } },
        { status: 400 }
      )
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, businessId: session.businessId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Insumo no encontrado' } },
        { status: 404 }
      )
    }

    await prisma.inventoryItem.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: `El insumo "${existing.name}" ha sido archivado correctamente`,
    })
  } catch (error: any) {
    console.error('Error en DELETE /api/inventory/items:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Error al archivar insumo' } },
      { status: 500 }
    )
  }
}

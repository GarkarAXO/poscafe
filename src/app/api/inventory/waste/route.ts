import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { StockMovementType } from '@prisma/client'

// GET /api/inventory/waste - Lista el historial de mermas y desperdicios registrados
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
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const itemId = searchParams.get('itemId')

    const wastes = await prisma.stockMovement.findMany({
      where: {
        inventoryItem: {
          businessId: session.businessId,
          deletedAt: null,
          ...(itemId ? { id: itemId } : {}),
        },
        type: StockMovementType.SPOILAGE,
      },
      include: {
        inventoryItem: {
          select: {
            id: true,
            sku: true,
            name: true,
            baseUnit: true,
            costPerUnit: true,
          },
        },
        sourceWarehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const mapped = wastes.map((w) => ({
      id: w.id,
      itemId: w.inventoryItemId,
      itemName: w.inventoryItem.name,
      itemSku: w.inventoryItem.sku,
      baseUnit: w.inventoryItem.baseUnit,
      warehouseName: w.sourceWarehouse?.name || 'Almacén Principal',
      quantity: Number(w.quantityBase),
      unitCost: Number(w.unitCost),
      totalCost: Number(w.totalCost),
      reason: w.notes || 'Merma general',
      createdAt: w.createdAt,
    }))

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error('Error en GET /api/inventory/waste:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar historial de mermas' } },
      { status: 500 }
    )
  }
}

// POST /api/inventory/waste - Registra una merma de insumo y actualiza las existencias
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const businessId = session.businessId
    const userId = session.userId

    const body = await request.json()
    const { inventoryItemId, warehouseId, quantity, reason, notes } = body

    if (!inventoryItemId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El insumo es obligatorio' } },
        { status: 400 }
      )
    }

    const numQuantity = Number(quantity)
    if (!numQuantity || isNaN(numQuantity) || numQuantity <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_QUANTITY', message: 'La cantidad mermada debe ser mayor a 0' } },
        { status: 400 }
      )
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REASON', message: 'El motivo de la merma es obligatorio' } },
        { status: 400 }
      )
    }

    // Validar que el insumo exista y pertenezca al negocio
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: inventoryItemId,
        businessId: session.businessId,
        deletedAt: null,
      },
    })

    if (!item) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Insumo no encontrado' } },
        { status: 404 }
      )
    }

    // Resolver almacén
    let targetWarehouseId = warehouseId
    if (!targetWarehouseId) {
      const defWarehouse =
        (await prisma.warehouse.findFirst({
          where: {
            branch: { businessId: session.businessId },
            isDefault: true,
            active: true,
          },
        })) ||
        (await prisma.warehouse.findFirst({
          where: {
            branch: { businessId: session.businessId },
            active: true,
          },
        }))
      targetWarehouseId = defWarehouse?.id
    }

    if (!targetWarehouseId) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_WAREHOUSE', message: 'No se encontró un almacén activo' } },
        { status: 400 }
      )
    }

    const fullReason = notes && notes.trim() ? `${reason.trim()}: ${notes.trim()}` : reason.trim()
    const unitCost = Number(item.costPerUnit) || 0
    const totalCost = numQuantity * unitCost

    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener o crear registro de existencias en almacén
      const currentStockRecord = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_inventoryItemId: {
            warehouseId: targetWarehouseId,
            inventoryItemId: item.id,
          },
        },
      })

      const prevQty = currentStockRecord ? Number(currentStockRecord.quantity) : 0
      const newQty = prevQty - numQuantity

      await tx.warehouseStock.upsert({
        where: {
          warehouseId_inventoryItemId: {
            warehouseId: targetWarehouseId,
            inventoryItemId: item.id,
          },
        },
        update: { quantity: newQty },
        create: {
          warehouseId: targetWarehouseId,
          inventoryItemId: item.id,
          quantity: newQty,
        },
      })

      // 2. Registrar movimiento de stock con tipo SPOILAGE
      const movement = await tx.stockMovement.create({
        data: {
          inventoryItemId: item.id,
          sourceWarehouseId: targetWarehouseId,
          type: StockMovementType.SPOILAGE,
          quantityBase: numQuantity,
          unitCost,
          totalCost,
          referenceType: 'WASTE',
          notes: fullReason,
        },
      })

      // 3. Registrar auditoría
      await tx.auditLog.create({
        data: {
          businessId,
          userId,
          action: 'INVENTORY_WASTE_RECORDED',
          entityType: 'InventoryItem',
          entityId: item.id,
          payload: {
            itemName: item.name,
            sku: item.sku,
            quantity: numQuantity,
            unit: item.baseUnit,
            cost: totalCost,
            reason: fullReason,
            prevStock: prevQty,
            newStock: newQty,
            recordedBy: session.name,
          },
        },
      })

      return { movement, newStock: newQty }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.movement.id,
        itemId: item.id,
        itemName: item.name,
        quantity: numQuantity,
        baseUnit: item.baseUnit,
        cost: totalCost,
        newStock: result.newStock,
      },
      message: `Merma de ${numQuantity} ${item.baseUnit} de "${item.name}" registrada exitosamente`,
    })
  } catch (error) {
    console.error('Error en POST /api/inventory/waste:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar merma' } },
      { status: 500 }
    )
  }
}

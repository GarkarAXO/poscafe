import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { StockMovementType, InventoryUnit } from '@prisma/client'
import { generateSkuFromName, ensureUniqueSku } from '@/lib/sku'

// GET /api/purchases - Listar compras de la sucursal activa
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sin sucursal activa' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')
    const branchId = session.activeBranchId

    const purchases = await prisma.purchase.findMany({
      where: {
        branchId,
        ...(supplierId ? { supplierId } : {}),
      },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, contact: true },
        },
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, sku: true, baseUnit: true, costPerUnit: true },
            },
            presentation: {
              select: { id: true, name: true, factorToBase: true },
            },
          },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { purchasedAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      success: true,
      data: purchases.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoiceNumber || 'S/N',
        purchasedAt: p.purchasedAt,
        status: p.status,
        total: Number(p.total),
        notes: p.notes,
        supplier: p.supplier,
        branch: p.branch,
        entryType: (p as any).entryType || (p.supplierId ? 'SUPPLIER' : 'EMERGENCY_STORE'),
        itemsCount: p.items.length,
        items: p.items.map((it) => ({
          id: it.id,
          itemName: it.inventoryItem.name,
          baseUnit: it.inventoryItem.baseUnit,
          presentationName: it.presentation?.name || null,
          quantityBought: Number(it.quantityBought),
          unitCost: Number(it.unitCost),
          subtotal: Number(it.subtotal),
          quantityBaseCalculated: Number(it.quantityBaseCalculated),
        })),
      })),
    })
  } catch (error) {
    console.error('Error en GET /api/purchases:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar compras' } },
      { status: 500 }
    )
  }
}

// POST /api/purchases - Registrar una nueva compra de insumos
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sin sucursal activa' } },
        { status: 401 }
      )
    }

    const branchId = session.activeBranchId
    const body = await request.json()
    const {
      supplierId,
      invoiceNumber,
      purchasedAt,
      notes,
      warehouseId,
      entryType = 'SUPPLIER',
      items, // Array de { inventoryItemId, inventoryPresentationId, quantityBought, unitCost }
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'EMPTY_ITEMS', message: 'Debes agregar al menos un insumo a la compra' } },
        { status: 400 }
      )
    }

    // 1. Obtener almacén destino (especificado o default de la sucursal)
    let targetWarehouse = null
    if (warehouseId) {
      targetWarehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, branchId, active: true },
      })
    }
    if (!targetWarehouse) {
      targetWarehouse = await prisma.warehouse.findFirst({
        where: { branchId, isDefault: true, active: true },
      })
    }
    if (!targetWarehouse) {
      targetWarehouse = await prisma.warehouse.findFirst({
        where: { branchId, active: true },
      })
    }

    if (!targetWarehouse) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_WAREHOUSE', message: 'No hay un almacén activo en esta sucursal' } },
        { status: 400 }
      )
    }

    // 2. Validar y calcular total de la compra
    let totalPurchase = 0
    for (const item of items) {
      const hasExisting = Boolean(item.inventoryItemId)
      const hasNewName = Boolean(item.newItemName && item.newItemName.trim())
      if (!hasExisting && !hasNewName) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ITEM',
              message: 'Cada partida del ticket debe tener un insumo existente o un nombre de insumo nuevo',
            },
          },
          { status: 400 }
        )
      }

      const qty = Number(item.quantityBought)
      const cost = Number(item.unitCost)
      if (qty <= 0 || cost < 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ITEM',
              message: 'Las cantidades y costos de cada partida deben ser números mayores o iguales a cero',
            },
          },
          { status: 400 }
        )
      }
      totalPurchase += qty * cost
    }

    // 3. Ejecutar registro de compra y entrada de inventario en transacción atómica
    const result = await prisma.$transaction(async (tx) => {
      // A. Crear cabecera de la compra / entrada de inventario
      const defaultFolio =
        entryType === 'INITIAL_STOCK'
          ? `INI-${Date.now().toString().slice(-6)}`
          : entryType === 'EMERGENCY_STORE'
          ? `TDA-${Date.now().toString().slice(-6)}`
          : null

      const purchase = await tx.purchase.create({
        data: {
          branchId,
          supplierId: supplierId || null,
          invoiceNumber: invoiceNumber?.trim() || defaultFolio,
          total: totalPurchase,
          notes: notes?.trim() || null,
          entryType,
          status: 'COMPLETED',
          purchasedAt: purchasedAt ? new Date(purchasedAt) : new Date(),
        },
      })

      const stockDeductionsSummary: Array<{ item: string; added: number; unit: string }> = []

      // B. Procesar cada ítem
      for (const item of items) {
        const qtyBought = Number(item.quantityBought)
        const unitCost = Number(item.unitCost)
        const itemSubtotal = qtyBought * unitCost

        // Consultar el insumo base o crearlo al vuelo si es nuevo en el ticket
        let invItem = null
        if (item.inventoryItemId) {
          invItem = await tx.inventoryItem.findUnique({
            where: { id: item.inventoryItemId },
          })
        }

        // Si es un insumo nuevo reportado en el ticket de compra
        if (!invItem && (item.isNewItem || item.newItemName)) {
          const rawName = (item.newItemName || '').trim()
          if (!rawName) continue

          // Revisar si ya existe un insumo con ese nombre en este negocio
          const existingByName = await tx.inventoryItem.findFirst({
            where: {
              businessId: session.businessId!,
              name: { equals: rawName, mode: 'insensitive' },
            },
          })

          if (existingByName) {
            invItem = existingByName
          } else {
            // Autogenerar SKU único a partir de fragmentos del nombre
            const existingItems = await tx.inventoryItem.findMany({
              where: { businessId: session.businessId! },
              select: { sku: true },
            })
            const existingSkus = existingItems.map((e) => e.sku).filter(Boolean) as string[]
            const baseCandidateSku =
              item.sku && item.sku.trim()
                ? item.sku.trim().toUpperCase()
                : generateSkuFromName(rawName)
            const finalSku = ensureUniqueSku(baseCandidateSku, existingSkus)

            const allowedUnits = [
              'PIECE',
              'CAN',
              'BOTTLE',
              'PACKAGE',
              'BOX',
              'ML',
              'LITER',
              'GRAM',
              'KG',
              'OZ',
              'CUP',
              'PORTION',
              'POUND',
            ]
            let validUnit: InventoryUnit = 'PIECE'
            if (item.baseUnit && allowedUnits.includes(item.baseUnit.toUpperCase())) {
              validUnit = item.baseUnit.toUpperCase() as InventoryUnit
            }

            invItem = await tx.inventoryItem.create({
              data: {
                businessId: session.businessId!,
                name: rawName,
                sku: finalSku,
                baseUnit: validUnit,
                costPerUnit: unitCost,
                active: true,
              },
            })
          }
        }

        if (!invItem) continue

        let factorToBase = 1
        let presentationId = null

        // Si se seleccionó una presentación comercial (Ej: Caja x 12, Costal 25kg)
        if (item.inventoryPresentationId) {
          const presentation = await tx.inventoryPresentation.findUnique({
            where: { id: item.inventoryPresentationId },
          })
          if (presentation) {
            factorToBase = Number(presentation.factorToBase) || 1
            presentationId = presentation.id
          }
        }

        // Cantidad neta que ingresa al inventario en la unidad base (gramos, ml, unidades, etc.)
        const quantityBaseCalculated = qtyBought * factorToBase
        const unitCostBase = unitCost / factorToBase

        // Crear PurchaseItem
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            inventoryItemId: invItem.id,
            inventoryPresentationId: presentationId,
            quantityBought: qtyBought,
            unitCost,
            subtotal: itemSubtotal,
            quantityBaseCalculated,
          },
        })

        // Incrementar stock en almacén en warehouse_stock
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_inventoryItemId: {
              warehouseId: targetWarehouse.id,
              inventoryItemId: invItem.id,
            },
          },
          update: {
            quantity: { increment: quantityBaseCalculated },
          },
          create: {
            warehouseId: targetWarehouse.id,
            inventoryItemId: invItem.id,
            quantity: quantityBaseCalculated,
          },
        })

        // Registrar en el kardex / stock_movements
        const movementType =
          entryType === 'INITIAL_STOCK'
            ? StockMovementType.INITIAL
            : StockMovementType.PURCHASE

        let movementNote = `Entrada por compra proveedor: Factura ${purchase.invoiceNumber || 'S/N'}`
        if (entryType === 'INITIAL_STOCK') {
          movementNote = `Carga de Inventario Inicial / Apertura: ${qtyBought} ${presentationId ? 'presentaciones' : invItem.baseUnit}`
        } else if (entryType === 'EMERGENCY_STORE') {
          movementNote = `Compra rápida de emergencia / tiendita: ${purchase.invoiceNumber || 'Ticket tienda'} (${qtyBought} ${presentationId ? 'presentaciones' : invItem.baseUnit})`
        }

        await tx.stockMovement.create({
          data: {
            inventoryItemId: invItem.id,
            targetWarehouseId: targetWarehouse.id,
            type: movementType,
            quantityBase: quantityBaseCalculated,
            unitCost: unitCostBase,
            totalCost: itemSubtotal,
            referenceType: entryType,
            referenceId: purchase.id,
            notes: movementNote,
            idempotencyKey: `${purchase.id}-${invItem.id}-${presentationId || 'base'}`,
          },
        })

        // Actualizar el costo unitario del insumo base con el costo más reciente
        await tx.inventoryItem.update({
          where: { id: invItem.id },
          data: { costPerUnit: unitCostBase },
        })

        stockDeductionsSummary.push({
          item: invItem.name,
          added: quantityBaseCalculated,
          unit: invItem.baseUnit.toLowerCase(),
        })
      }

      // C. Registro de auditoría
      await tx.auditLog.create({
        data: {
          businessId: session.businessId!,
          userId: session.userId,
          action: 'PURCHASE_REGISTERED',
          entityType: 'Purchase',
          entityId: purchase.id,
          payload: {
            invoiceNumber: purchase.invoiceNumber,
            total: totalPurchase,
            warehouseName: targetWarehouse.name,
            itemsCount: items.length,
          },
        },
      })

      return { purchase, stockDeductionsSummary }
    }, {
      maxWait: 15000,
      timeout: 45000,
    })

    return NextResponse.json({
      success: true,
      data: {
        purchaseId: result.purchase.id,
        invoiceNumber: result.purchase.invoiceNumber,
        total: Number(result.purchase.total),
        warehouseName: targetWarehouse.name,
        stockSummary: result.stockDeductionsSummary,
      },
      message: `Compra registrada exitosamente. Se ingresó el stock al almacén ${targetWarehouse.name}`,
    })
  } catch (error: any) {
    console.error('Error en POST /api/purchases:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Error al registrar la compra' } },
      { status: 500 }
    )
  }
}

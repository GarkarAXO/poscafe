import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { StockMovementType } from '@prisma/client'

// GET /api/purchases/[id] - Detalle de compra
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sin sucursal activa' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const branchId = session.activeBranchId

    const purchase = await prisma.purchase.findFirst({
      where: { id, branchId },
      include: {
        supplier: true,
        branch: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, baseUnit: true, sku: true } },
            presentation: { select: { id: true, name: true, factorToBase: true } },
          },
        },
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Compra no encontrada' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: purchase.id,
        invoiceNumber: purchase.invoiceNumber,
        total: Number(purchase.total),
        notes: purchase.notes,
        status: purchase.status,
        entryType: (purchase as any).entryType || (purchase.supplierId ? 'SUPPLIER' : 'EMERGENCY_STORE'),
        purchasedAt: purchase.purchasedAt,
        createdAt: purchase.createdAt,
        supplier: purchase.supplier,
        branch: purchase.branch,
        items: purchase.items.map((it) => ({
          id: it.id,
          itemName: it.inventoryItem.name,
          sku: it.inventoryItem.sku,
          baseUnit: it.inventoryItem.baseUnit,
          presentationName: it.presentation?.name || null,
          quantityBought: Number(it.quantityBought),
          unitCost: Number(it.unitCost),
          subtotal: Number(it.subtotal),
          quantityBaseCalculated: Number(it.quantityBaseCalculated),
        })),
      },
    })
  } catch (error) {
    console.error('Error en GET /api/purchases/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar compra' } },
      { status: 500 }
    )
  }
}

// DELETE /api/purchases/[id] - Cancelar compra y revertir stock
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sin sucursal activa' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const branchId = session.activeBranchId

    const purchase = await prisma.purchase.findFirst({
      where: { id, branchId },
      include: {
        items: {
          include: { inventoryItem: true },
        },
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Compra no encontrada' } },
        { status: 404 }
      )
    }

    if (purchase.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_CANCELLED', message: 'Esta compra ya se encuentra cancelada' } },
        { status: 400 }
      )
    }

    // Obtener almacén default de la sucursal para revertir
    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { branchId, isDefault: true, active: true },
    }) || await prisma.warehouse.findFirst({
      where: { branchId, active: true },
    })

    if (!defaultWarehouse) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_WAREHOUSE', message: 'Almacén no encontrado' } },
        { status: 400 }
      )
    }

    // Revertir inventario y marcar como cancelada
    await prisma.$transaction(async (tx) => {
      // 1. Marcar compra como cancelada
      await tx.purchase.update({
        where: { id },
        data: { status: 'CANCELLED' },
      })

      // 2. Descontar el stock que ingresó por la compra
      for (const item of purchase.items) {
        const qtyToRevert = Number(item.quantityBaseCalculated)

        await tx.warehouseStock.upsert({
          where: {
            warehouseId_inventoryItemId: {
              warehouseId: defaultWarehouse.id,
              inventoryItemId: item.inventoryItemId,
            },
          },
          update: {
            quantity: { decrement: qtyToRevert },
          },
          create: {
            warehouseId: defaultWarehouse.id,
            inventoryItemId: item.inventoryItemId,
            quantity: -qtyToRevert,
          },
        })

        // Registrar movimiento de reversión
        await tx.stockMovement.create({
          data: {
            inventoryItemId: item.inventoryItemId,
            sourceWarehouseId: defaultWarehouse.id,
            type: StockMovementType.ADJUST_NEGATIVE,
            quantityBase: qtyToRevert,
            unitCost: item.unitCost,
            totalCost: item.subtotal,
            referenceType: 'PURCHASE_CANCEL',
            referenceId: purchase.id,
            notes: `Cancelación de compra: Factura ${purchase.invoiceNumber || 'S/N'}`,
          },
        })
      }

      // 3. Auditoría
      await tx.auditLog.create({
        data: {
          businessId: session.businessId!,
          userId: session.userId,
          action: 'PURCHASE_CANCELLED',
          entityType: 'Purchase',
          entityId: purchase.id,
          payload: { invoiceNumber: purchase.invoiceNumber, total: Number(purchase.total) },
        },
      })
    }, {
      maxWait: 15000,
      timeout: 45000,
    })

    return NextResponse.json({
      success: true,
      message: 'Compra cancelada e inventario revertido correctamente',
    })
  } catch (error: any) {
    console.error('Error en DELETE /api/purchases/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Error al cancelar la compra' } },
      { status: 500 }
    )
  }
}

// PUT /api/purchases/[id] - Editar metadatos de la compra
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sin sucursal activa' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const branchId = session.activeBranchId
    const body = await request.json()
    const { invoiceNumber, notes, supplierId, purchasedAt, entryType } = body

    const purchase = await prisma.purchase.findFirst({
      where: { id, branchId },
    })

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Compra no encontrada' } },
        { status: 404 }
      )
    }

    if (purchase.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: { code: 'CANCELLED', message: 'No se puede editar una compra cancelada' } },
        { status: 400 }
      )
    }

    const updated = await prisma.purchase.update({
      where: { id },
      data: {
        ...(invoiceNumber !== undefined && { invoiceNumber: invoiceNumber?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
        ...(purchasedAt && { purchasedAt: new Date(purchasedAt) }),
        ...(entryType && { entryType }),
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Compra actualizada correctamente',
    })
  } catch (error: any) {
    console.error('Error en PUT /api/purchases/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Error al actualizar compra' } },
      { status: 500 }
    )
  }
}


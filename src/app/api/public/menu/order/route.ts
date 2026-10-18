import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      branchId,
      tableId,
      tableName,
      items, // Array<{ variantId: string, quantity: number, unitPrice: number, notes?: string, modifiers?: string[] }>
    } = body

    if (!branchId || (!tableId && !tableName)) {
      return NextResponse.json(
        { success: false, error: { message: 'Faltan parámetros requeridos (branchId, tableId o tableName)' } },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Debes seleccionar al menos un producto para ordenar' } },
        { status: 400 }
      )
    }

    // 1. Buscar la mesa
    const table = await prisma.table.findFirst({
      where: {
        branchId,
        active: true,
        ...(tableId ? { id: tableId } : { name: { equals: tableName, mode: 'insensitive' } }),
      },
      include: {
        currentWaiter: { select: { id: true, name: true } },
        orders: {
          where: {
            status: { in: [OrderStatus.DRAFT, OrderStatus.SENT, OrderStatus.PREPARING, OrderStatus.SERVED] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            waiter: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!table) {
      return NextResponse.json(
        { success: false, error: { message: 'Mesa no encontrada en esta sucursal' } },
        { status: 404 }
      )
    }

    const existingOrder = table.orders[0] || null
    const isInitiated = Boolean(existingOrder || table.status === 'OCCUPIED' || table.currentWaiterId)

    // REGLA CLAVE: Si la mesa aún no está iniciada por el mesero, NO se le permite ordenar
    if (!isInitiated || !existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TABLE_NOT_INITIATED',
            message: 'La mesa aún no ha sido iniciada por el mesero. Por favor solicita al mesero que abra la comanda para poder ordenar.',
          },
        },
        { status: 403 }
      )
    }

    // 2. Agregar los artículos a la orden existente en transacción atómica
    const updatedOrder = await prisma.$transaction(async (tx) => {
      let addedSubtotal = 0

      for (const it of items) {
        const itemSubtotal = Number(it.unitPrice) * Number(it.quantity)
        addedSubtotal += itemSubtotal

        const createdItem = await tx.orderItem.create({
          data: {
            orderId: existingOrder.id,
            productVariantId: it.variantId,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            subtotal: itemSubtotal,
            notes: it.notes?.trim() ? `[Menú Digital] ${it.notes.trim()}` : '[Menú Digital]',
            kitchenStatus: 'PENDING',
          },
        })

        if (Array.isArray(it.modifiers) && it.modifiers.length > 0) {
          for (const mod of it.modifiers) {
            const modId = typeof mod === 'string' ? mod : mod.modifierId || mod.id
            if (!modId) continue
            const dbMod = await tx.modifier.findUnique({ where: { id: modId } })
            if (!dbMod) continue

            await tx.orderItemModifier.create({
              data: {
                orderItemId: createdItem.id,
                modifierId: modId,
                unitPrice: dbMod.extraPrice,
              },
            })
            addedSubtotal += Number(dbMod.extraPrice) * Number(it.quantity)
          }
        }
      }

      // Actualizar totales de la orden
      const newSubtotal = Number(existingOrder.subtotal) + addedSubtotal
      const newTotal = Number(existingOrder.total) + addedSubtotal

      return tx.order.update({
        where: { id: existingOrder.id },
        data: {
          subtotal: newSubtotal,
          total: newTotal,
          status: OrderStatus.PREPARING,
          updatedAt: new Date(),
        },
      })
    })

    // Limpiar llamada activa de mesero si existía
    const callKey = `${branchId}:${table.id}`
    globalThis.__waiterCalls?.delete(callKey)

    return NextResponse.json({
      success: true,
      message: '¡Tu orden ha sido enviada a la comanda de la mesa y a cocina exitosamente!',
      data: {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        itemsCount: items.length,
        waiterName: existingOrder.waiter?.name || table.currentWaiter?.name || null,
      },
    })
  } catch (err: any) {
    console.error('Error en /api/public/menu/order:', err)
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Error al procesar pedido desde el menú' } },
      { status: 500 }
    )
  }
}

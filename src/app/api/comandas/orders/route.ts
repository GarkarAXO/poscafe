import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { OrderStatus, OrderType, TableStatus } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sin sucursal activa' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      tableId,
      orderType = 'DINE_IN',
      customerName,
      notes,
      items, // Array<{ variantId: string, quantity: number, unitPrice: number, notes?: string }>
    } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'La comanda debe contener al menos un platillo o bebida' } },
        { status: 400 }
      )
    }

    const branchId = session.activeBranchId

    // Ejecutar en transacción atómica
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar si ya existe una orden activa en esta mesa
      let existingOrder = null
      if (orderType === 'DINE_IN' && tableId) {
        existingOrder = await tx.order.findFirst({
          where: {
            branchId,
            tableId,
            status: { in: [OrderStatus.DRAFT, OrderStatus.SENT, OrderStatus.PREPARING, OrderStatus.SERVED] },
          },
          include: { items: true },
        })
      }

      let order: any

      if (existingOrder) {
        // Añadir ítems a la orden existente (Nueva ronda de comanda)
        let addedSubtotal = 0

        for (const it of items) {
          const itemSubtotal = Number(it.unitPrice) * Number(it.quantity)
          addedSubtotal += itemSubtotal

          await tx.orderItem.create({
            data: {
              orderId: existingOrder.id,
              productVariantId: it.variantId,
              quantity: Number(it.quantity),
              unitPrice: Number(it.unitPrice),
              subtotal: itemSubtotal,
              notes: it.notes?.trim() || null,
              kitchenStatus: 'PENDING', // Nuevo ítem enviado a cocina
            },
          })
        }

        const newSubtotal = Number(existingOrder.subtotal) + addedSubtotal
        const newTotal = Number(existingOrder.total) + addedSubtotal

        order = await tx.order.update({
          where: { id: existingOrder.id },
          data: {
            subtotal: newSubtotal,
            total: newTotal,
            status: OrderStatus.SENT, // Actualizar a enviada para alertar a cocina
            customerName: customerName ? customerName.trim() : existingOrder.customerName,
            notes: notes ? notes.trim() : existingOrder.notes,
          },
          include: {
            table: true,
            waiter: { select: { id: true, name: true } },
            items: {
              include: {
                productVariant: {
                  include: { product: { select: { id: true, name: true } } },
                },
              },
            },
          },
        })
      } else {
        // Crear una nueva comanda
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const todayOrdersCount = await tx.order.count({
          where: {
            branchId,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        })
        const orderNumber = `ORD-${datePrefix}-${(todayOrdersCount + 1).toString().padStart(4, '0')}`

        let subtotal = 0
        for (const it of items) {
          subtotal += Number(it.unitPrice) * Number(it.quantity)
        }

        order = await tx.order.create({
          data: {
            branchId,
            tableId: orderType === 'DINE_IN' ? tableId : null,
            waiterId: session.userId,
            orderNumber,
            customerName: customerName?.trim() || null,
            orderType: orderType as OrderType,
            status: OrderStatus.SENT,
            subtotal,
            total: subtotal,
            notes: notes?.trim() || null,
          },
        })

        // Crear los ítems de la orden
        for (const it of items) {
          const itemSubtotal = Number(it.unitPrice) * Number(it.quantity)
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productVariantId: it.variantId,
              quantity: Number(it.quantity),
              unitPrice: Number(it.unitPrice),
              subtotal: itemSubtotal,
              notes: it.notes?.trim() || null,
              kitchenStatus: 'PENDING',
            },
          })
        }

        // Marcar la mesa como ocupada si es DINE_IN
        if (orderType === 'DINE_IN' && tableId) {
          await tx.table.update({
            where: { id: tableId },
            data: { status: TableStatus.OCCUPIED },
          })
        }
      }

      return order
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Comanda marchada a cocina exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/comandas/orders:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al enviar la comanda' } },
      { status: 500 }
    )
  }
}

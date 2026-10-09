import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { OrderStatus, PaymentMethod, TableStatus, StockMovementType } from '@prisma/client'
import crypto from 'crypto'

export async function POST(
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

    const { id: tableId } = await params
    const body = await request.json()
    const {
      paymentMethod = 'CASH',
      amountReceived,
      notes,
    } = body

    const branchId = session.activeBranchId

    // 1. Obtener la mesa y su orden activa
    const table = await prisma.table.findFirst({
      where: { id: tableId, branchId },
      include: {
        assignedWaiter: true,
        currentWaiter: true,
      },
    })

    if (!table) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Mesa no encontrada' } },
        { status: 404 }
      )
    }

    const activeOrder = await prisma.order.findFirst({
      where: {
        tableId,
        branchId,
        status: { in: [OrderStatus.DRAFT, OrderStatus.SENT, OrderStatus.PREPARING, OrderStatus.SERVED] },
      },
      include: {
        items: {
          include: {
            modifiers: {
              include: { modifier: true },
            },
            productVariant: {
              include: {
                product: true,
                recipe: {
                  include: {
                    items: {
                      include: { inventoryItem: true },
                    },
                  },
                },
              },
            },
          },
        },
        waiter: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!activeOrder || activeOrder.items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_ACTIVE_ORDER', message: 'La mesa no tiene consumos registrados por cobrar' } },
        { status: 400 }
      )
    }

    // 2. Obtener almacén por defecto de la sucursal para deducciones de inventario si aplica
    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { branchId, active: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })

    // 3. Obtener o crear sesión de caja abierta
    let cashSession = await prisma.cashSession.findFirst({
      where: {
        cashRegister: { branchId },
        status: 'OPEN',
      },
    })

    if (!cashSession) {
      const cashRegister = await prisma.cashRegister.findFirst({
        where: { branchId, active: true },
      })
      if (cashRegister) {
        cashSession = await prisma.cashSession.create({
          data: {
            cashRegisterId: cashRegister.id,
            userId: session.userId,
            openingBalance: 0,
            status: 'OPEN',
            notes: 'Apertura automática desde Comandera de Piso',
          },
        })
      }
    }

    const total = Number(activeOrder.total)
    const idempotencyKey = crypto.randomUUID()

    // 4. Procesar cobro, deducción de inventario, pago y liberación de mesa en transacción atómica
    const result = await prisma.$transaction(async (tx) => {
      // A. Si hay platillos no servidos, marcarlos como servidos
      await tx.orderItem.updateMany({
        where: {
          orderId: activeOrder.id,
          kitchenStatus: { in: ['PENDING', 'COOKING', 'READY'] },
        },
        data: {
          kitchenStatus: 'SERVED',
        },
      })

      // B. Procesar deducción de inventario por receta/venta para cada ítem de la comanda
      if (defaultWarehouse) {
        for (const item of activeOrder.items) {
          const variant = item.productVariant
          if (!variant) continue

          const qty = Number(item.quantity)

          // Receta
          if (variant.inventoryPolicy === 'RECIPE' && variant.recipe) {
            for (const rItem of variant.recipe.items) {
              if (rItem.onlyTakeaway && activeOrder.orderType === 'DINE_IN') continue

              const deduction = Number(rItem.quantityBase) * qty
              const invItem = rItem.inventoryItem
              const unitCost = Number(invItem?.costPerUnit || 0)
              const totalCost = deduction * unitCost

              await tx.warehouseStock.upsert({
                where: {
                  warehouseId_inventoryItemId: {
                    warehouseId: defaultWarehouse.id,
                    inventoryItemId: rItem.inventoryItemId,
                  },
                },
                update: { quantity: { decrement: deduction } },
                create: {
                  warehouseId: defaultWarehouse.id,
                  inventoryItemId: rItem.inventoryItemId,
                  quantity: -deduction,
                },
              })

              await tx.stockMovement.create({
                data: {
                  inventoryItemId: rItem.inventoryItemId,
                  sourceWarehouseId: defaultWarehouse.id,
                  type: StockMovementType.RECIPE_CONSUME,
                  quantityBase: deduction,
                  unitCost,
                  totalCost,
                  referenceType: 'ORDER',
                  referenceId: activeOrder.id,
                  notes: `Consumo comanda mesa: ${variant.name} (${activeOrder.orderNumber})`,
                  idempotencyKey: `${activeOrder.id}-${item.id}-${rItem.id}`,
                },
              })
            }
          } else if (variant.inventoryPolicy === 'DIRECT' && variant.directItemId) {
            // Venta directa
            const directQty = Number(variant.directQuantity || 1) * qty
            const invItem = await tx.inventoryItem.findUnique({ where: { id: variant.directItemId } })
            const unitCost = Number(invItem?.costPerUnit || 0)
            const totalCost = directQty * unitCost

            await tx.warehouseStock.upsert({
              where: {
                warehouseId_inventoryItemId: {
                  warehouseId: defaultWarehouse.id,
                  inventoryItemId: variant.directItemId,
                },
              },
              update: { quantity: { decrement: directQty } },
              create: {
                warehouseId: defaultWarehouse.id,
                inventoryItemId: variant.directItemId,
                quantity: -directQty,
              },
            })

            await tx.stockMovement.create({
              data: {
                inventoryItemId: variant.directItemId,
                sourceWarehouseId: defaultWarehouse.id,
                type: StockMovementType.SALE,
                quantityBase: directQty,
                unitCost,
                totalCost,
                referenceType: 'ORDER',
                referenceId: activeOrder.id,
                notes: `Venta comanda mesa: ${variant.name} (${activeOrder.orderNumber})`,
                idempotencyKey: `${activeOrder.id}-${item.id}-direct`,
              },
            })
          }
        }

        // B.2 Descontar empaques generales para llevar si la orden es para llevar
        if (activeOrder.orderType !== 'DINE_IN') {
          const settings = await tx.businessSetting.findUnique({
            where: { businessId: session.businessId! },
          })

          const deductPackaging = async (itemId: string, qty: number, label: string) => {
            if (qty <= 0) return
            const invItem = await tx.inventoryItem.findUnique({ where: { id: itemId } })
            if (!invItem) return

            const unitCost = Number(invItem.costPerUnit || 0)
            const totalCost = qty * unitCost

            await tx.warehouseStock.upsert({
              where: {
                warehouseId_inventoryItemId: {
                  warehouseId: defaultWarehouse.id,
                  inventoryItemId: itemId,
                },
              },
              update: { quantity: { decrement: qty } },
              create: {
                warehouseId: defaultWarehouse.id,
                inventoryItemId: itemId,
                quantity: -qty,
              },
            })

            await tx.stockMovement.create({
              data: {
                inventoryItemId: itemId,
                sourceWarehouseId: defaultWarehouse.id,
                type: StockMovementType.RECIPE_CONSUME,
                quantityBase: qty,
                unitCost,
                totalCost,
                referenceType: 'ORDER',
                referenceId: activeOrder.id,
                notes: `Empaque para llevar comanda: ${label} (${activeOrder.orderNumber})`,
                idempotencyKey: `${activeOrder.id}-pkg-${itemId}`,
              },
            })
          }

          if (settings?.takeawayBagItemId) {
            await deductPackaging(settings.takeawayBagItemId, 1, 'Bolsa')
          }

          const totalItemsCount = activeOrder.items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)
          const defaultTrays = totalItemsCount >= 2 ? 1 : 0
          if (settings?.takeawayTrayItemId && defaultTrays > 0) {
            await deductPackaging(settings.takeawayTrayItemId, defaultTrays, 'Charola portavasos')
          }

          if (settings?.takeawayFoodTrayItemId) {
            await deductPackaging(settings.takeawayFoodTrayItemId, 1, 'Charola de comida')
          }

          if (settings?.takeawayCutleryItemId) {
            await deductPackaging(settings.takeawayCutleryItemId, 1, 'Cubiertos')
          }

          if (settings?.takeawayStrawItemId) {
            await deductPackaging(settings.takeawayStrawItemId, 1, 'Popotes')
          }
        }
      }

      // C. Registrar el pago
      const payment = await tx.payment.create({
        data: {
          orderId: activeOrder.id,
          cashSessionId: cashSession?.id,
          method: (total === 0 ? 'OTHER' : paymentMethod) as PaymentMethod,
          amount: total,
          idempotencyKey,
          reference:
            paymentMethod === 'CASH' && amountReceived
              ? `Efectivo recibido: $${Number(amountReceived).toFixed(2)} - Cambio: $${Math.max(
                  0,
                  Number(amountReceived) - total
                ).toFixed(2)}`
              : notes || 'Cobro desde Comandera de Piso',
        },
      })

      // D. Marcar orden como pagada y cerrada
      const updatedOrder = await tx.order.update({
        where: { id: activeOrder.id },
        data: {
          status: OrderStatus.PAID,
          paidTotal: total,
          closedAt: new Date(),
          cashSessionId: cashSession?.id,
        },
      })

      // E. Liberar la mesa inmediatamente y retornar al mesero titular
      await tx.table.update({
        where: { id: tableId },
        data: {
          status: TableStatus.AVAILABLE,
          currentWaiterId: null,
        },
      })

      // F. Registro de Auditoría
      await tx.auditLog.create({
        data: {
          businessId: session.businessId!,
          userId: session.userId,
          action: 'SALE_COMPLETED',
          entityType: 'Order',
          entityId: activeOrder.id,
          payload: {
            orderNumber: activeOrder.orderNumber,
            tableId,
            tableName: table.name,
            total,
            paymentMethod,
            amountReceived,
            origin: 'COMANDERA_FLOOR',
          },
        },
      })

      return {
        order: updatedOrder,
        payment,
      }
    }, {
      maxWait: 10000,
      timeout: 25000,
    })

    const receivedNum = amountReceived ? Number(amountReceived) : total
    const change = Math.max(0, receivedNum - total)

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        tableName: table.name,
        total,
        amountReceived: receivedNum,
        change,
        paymentMethod,
        closedAt: result.order.closedAt,
      },
      message: `Mesa ${table.name} cobrada exitosamente por $${total.toFixed(2)} MXN`,
    })
  } catch (error) {
    console.error('Error en POST /api/comandas/tables/[id]/checkout:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al procesar cobro de la mesa' } },
      { status: 500 }
    )
  }
}

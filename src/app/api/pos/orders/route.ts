import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  StockMovementType,
  TableStatus,
} from '@prisma/client'
import crypto from 'crypto'

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
      paymentMethod = 'CASH',
      amountReceived,
      idempotencyKey,
      discount, // { amount: number, reason: string, approvedBy?: string }
      courtesy, // { amount: number, reason: string, beneficiary?: string, approvedBy?: string }
      takeawayPackaging, // { bags?: number, cupTrays?: number, cutlerySets?: number }
    } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'La orden debe contener al menos un producto' } },
        { status: 400 }
      )
    }

    const branchId = session.activeBranchId

    // 1. Obtener almacén por defecto de la sucursal para deducir inventario
    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { branchId, active: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })

    if (!defaultWarehouse) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_WAREHOUSE', message: 'La sucursal no tiene un almacén activo asignado' } },
        { status: 400 }
      )
    }

    // 2. Obtener o crear sesión de caja abierta en la sucursal
    let cashSession = await prisma.cashSession.findFirst({
      where: {
        cashRegister: { branchId },
        status: 'OPEN',
      },
    })

    if (!cashSession) {
      // Auto-abrir caja si no hay sesión abierta para no bloquear la operación de venta rápida
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
            notes: 'Apertura automática de terminal POS',
          },
        })
      }
    }

    // 3. Generar número de orden consecutivo diario
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const todayOrdersCount = await prisma.order.count({
      where: {
        branchId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    })
    const orderNumber = `ORD-${datePrefix}-${(todayOrdersCount + 1).toString().padStart(4, '0')}`

    // 4. Calcular totales, descuentos y cortesías
    let subtotal = 0
    for (const item of items) {
      subtotal += Number(item.unitPrice) * Number(item.quantity)
    }

    const discountAmount = discount && Number(discount.amount) > 0 ? Number(discount.amount) : 0
    const courtesyAmount = courtesy && Number(courtesy.amount) > 0 ? Number(courtesy.amount) : 0
    const totalDeductions = discountAmount + courtesyAmount
    const total = Math.max(0, subtotal - totalDeductions)
    const key = idempotencyKey || crypto.randomUUID()

    // 5. Ejecutar la venta y el motor de inventario en una sola transacción atómica
    const result = await prisma.$transaction(async (tx) => {
      // A. Crear la Orden
      const order = await tx.order.create({
        data: {
          branchId,
          tableId: orderType === 'DINE_IN' ? tableId : null,
          waiterId: session.userId,
          cashSessionId: cashSession?.id,
          orderNumber,
          customerName: customerName?.trim() || null,
          orderType: orderType as OrderType,
          status: OrderStatus.PAID,
          subtotal,
          discountTotal: discountAmount,
          courtesyTotal: courtesyAmount,
          total,
          paidTotal: total,
          notes: notes?.trim() || null,
          closedAt: new Date(),
        },
      })

      // Registrar Descuento si aplica
      if (discountAmount > 0) {
        await tx.orderDiscount.create({
          data: {
            orderId: order.id,
            amount: discountAmount,
            reason: discount?.reason?.trim() || 'Descuento autorizado',
            approvedBy: discount?.approvedBy || session.name,
          },
        })
      }

      // Registrar Cortesía si aplica
      if (courtesyAmount > 0) {
        await tx.orderCourtesy.create({
          data: {
            orderId: order.id,
            amount: courtesyAmount,
            reason: courtesy?.reason?.trim() || 'Cortesía de la casa / Sin cobro',
            beneficiary: courtesy?.beneficiary?.trim() || customerName?.trim() || null,
            approvedBy: courtesy?.approvedBy || session.name,
          },
        })
      }

      // B. Crear ítems de la orden y procesar descuentos de inventario
      const inventoryMovementsSummary: Array<{ item: string; deducted: number; unit: string }> = []

      for (const item of items) {
        const itemSubtotal = Number(item.unitPrice) * Number(item.quantity)
        const createdOrderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productVariantId: item.variantId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            subtotal: itemSubtotal,
            notes: item.notes || null,
            kitchenStatus: 'READY',
          },
        })

        // Procesar modificadores / sabores / extras asociados al ítem
        if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
          for (const mod of item.modifiers) {
            const modId = typeof mod === 'string' ? mod : mod.modifierId || mod.id
            if (!modId) continue

            const dbMod = await tx.modifier.findUnique({
              where: { id: modId },
            })
            if (!dbMod) continue

            const modUnitPrice =
              mod.unitPrice !== undefined ? Number(mod.unitPrice) : Number(dbMod.extraPrice)

            await tx.orderItemModifier.create({
              data: {
                orderItemId: createdOrderItem.id,
                modifierId: dbMod.id,
                unitPrice: modUnitPrice,
              },
            })

            // Descuento de inventario automático si el sabor/extra tiene insumo asignado
            if (dbMod.inventoryItemId && dbMod.quantityBase) {
              const modDeduction = Number(dbMod.quantityBase) * Number(item.quantity)
              const invItem = await tx.inventoryItem.findUnique({
                where: { id: dbMod.inventoryItemId },
              })
              const unitCost = Number(invItem?.costPerUnit || 0)
              const totalCost = modDeduction * unitCost

              await tx.warehouseStock.upsert({
                where: {
                  warehouseId_inventoryItemId: {
                    warehouseId: defaultWarehouse.id,
                    inventoryItemId: dbMod.inventoryItemId,
                  },
                },
                update: {
                  quantity: { decrement: modDeduction },
                },
                create: {
                  warehouseId: defaultWarehouse.id,
                  inventoryItemId: dbMod.inventoryItemId,
                  quantity: -modDeduction,
                },
              })

              await tx.stockMovement.create({
                data: {
                  inventoryItemId: dbMod.inventoryItemId,
                  sourceWarehouseId: defaultWarehouse.id,
                  type: StockMovementType.RECIPE_CONSUME,
                  quantityBase: modDeduction,
                  unitCost,
                  totalCost,
                  referenceType: 'ORDER',
                  referenceId: order.id,
                  notes: `Consumo extra/sabor: ${dbMod.name} (+${modDeduction}) (${order.orderNumber})`,
                  idempotencyKey: `${order.id}-mod-${createdOrderItem.id}-${dbMod.id}`,
                },
              })

              if (invItem) {
                inventoryMovementsSummary.push({
                  item: `${invItem.name} (${dbMod.name})`,
                  deducted: modDeduction,
                  unit: invItem.baseUnit.toLowerCase(),
                })
              }
            }
          }
        }

        // Consultar variante con su receta e insumos
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: {
            recipe: {
              include: {
                items: {
                  include: { inventoryItem: true },
                },
              },
            },
          },
        })

        if (!variant) continue

        // POLÍTICA 1: RECETA (Descuenta cada ingrediente proporcional a la cantidad vendida)
        if (variant.inventoryPolicy === 'RECIPE' && variant.recipe) {
          for (const recipeItem of variant.recipe.items) {
            // Si el insumo está marcado como solo para llevar (vaso desechable, tapa, manga) y el cliente come en salón/mesa (DINE_IN), NO se descuenta stock
            if (recipeItem.onlyTakeaway && orderType === 'DINE_IN') {
              continue
            }

            const totalDeduction = Number(recipeItem.quantityBase) * Number(item.quantity)
            const unitCost = Number(recipeItem.inventoryItem.costPerUnit)
            const totalCost = totalDeduction * unitCost

            // Descontar del almacén en warehouse_stock
            await tx.warehouseStock.upsert({
              where: {
                warehouseId_inventoryItemId: {
                  warehouseId: defaultWarehouse.id,
                  inventoryItemId: recipeItem.inventoryItemId,
                },
              },
              update: {
                quantity: { decrement: totalDeduction },
              },
              create: {
                warehouseId: defaultWarehouse.id,
                inventoryItemId: recipeItem.inventoryItemId,
                quantity: -totalDeduction,
              },
            })

            // Registrar en el ledger inmutable de stock_movements
            await tx.stockMovement.create({
              data: {
                inventoryItemId: recipeItem.inventoryItemId,
                sourceWarehouseId: defaultWarehouse.id,
                type: StockMovementType.RECIPE_CONSUME,
                quantityBase: totalDeduction,
                unitCost,
                totalCost,
                referenceType: 'ORDER',
                referenceId: order.id,
                notes: `Consumo receta: ${Number(item.quantity)}x ${variant.name} (${order.orderNumber})`,
                idempotencyKey: `${order.id}-${recipeItem.id}-${item.variantId}`,
              },
            })

            inventoryMovementsSummary.push({
              item: recipeItem.inventoryItem.name,
              deducted: totalDeduction,
              unit: recipeItem.inventoryItem.baseUnit.toLowerCase(),
            })
          }
        }

        // POLÍTICA 2: DIRECTO (Descuenta 1 unidad de insumo por producto)
        else if (variant.inventoryPolicy === 'DIRECT' && variant.directItemId) {
          const directQty = Number(variant.directQuantity || 1) * Number(item.quantity)
          const invItem = await tx.inventoryItem.findUnique({
            where: { id: variant.directItemId },
          })

          const unitCost = Number(invItem?.costPerUnit || 0)
          const totalCost = directQty * unitCost

          await tx.warehouseStock.upsert({
            where: {
              warehouseId_inventoryItemId: {
                warehouseId: defaultWarehouse.id,
                inventoryItemId: variant.directItemId,
              },
            },
            update: {
              quantity: { decrement: directQty },
            },
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
              referenceId: order.id,
              notes: `Venta directa: ${variant.name} (${order.orderNumber})`,
              idempotencyKey: `${order.id}-direct-${variant.id}`,
            },
          })

          if (invItem) {
            inventoryMovementsSummary.push({
              item: invItem.name,
              deducted: directQty,
              unit: invItem.baseUnit.toLowerCase(),
            })
          }
        }
      }

      // Descontar empaques generales para llevar (Bolsas, Charolas portavasos, Cubiertos)
      if (orderType !== 'DINE_IN') {
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
            update: {
              quantity: { decrement: qty },
            },
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
              referenceId: order.id,
              notes: `Empaque para llevar: ${label} (${order.orderNumber})`,
              idempotencyKey: `${order.id}-pkg-${itemId}`,
            },
          })

          inventoryMovementsSummary.push({
            item: `${invItem.name} (${label})`,
            deducted: qty,
            unit: invItem.baseUnit.toLowerCase(),
          })
        }

        // 1. Bolsas
        const bagQty = takeawayPackaging?.bags !== undefined
          ? Number(takeawayPackaging.bags)
          : (settings?.takeawayBagItemId ? 1 : 0)
        if (settings?.takeawayBagItemId && bagQty > 0) {
          await deductPackaging(settings.takeawayBagItemId, bagQty, 'Bolsa')
        }

        // 2. Charolas portavasos (por defecto 1 cada 2 bebidas si no se especifica)
        const totalItemsCount = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)
        const defaultTrays = totalItemsCount >= 2 ? 1 : 0
        const trayQty = takeawayPackaging?.cupTrays !== undefined
          ? Number(takeawayPackaging.cupTrays)
          : defaultTrays
        if (settings?.takeawayTrayItemId && trayQty > 0) {
          await deductPackaging(settings.takeawayTrayItemId, trayQty, 'Charola portavasos')
        }

        // 3. Cubiertos desechables
        const cutleryQty = takeawayPackaging?.cutlerySets !== undefined
          ? Number(takeawayPackaging.cutlerySets)
          : 0
        if (settings?.takeawayCutleryItemId && cutleryQty > 0) {
          await deductPackaging(settings.takeawayCutleryItemId, cutleryQty, 'Cubiertos')
        }
      }

      // C. Registrar el Pago
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          cashSessionId: cashSession?.id,
          method: (total === 0 ? 'OTHER' : paymentMethod) as PaymentMethod,
          amount: total,
          idempotencyKey: key,
          reference:
            total === 0
              ? 'Cuenta sin cobro / Cortesía total'
              : paymentMethod === 'CASH' && amountReceived
              ? `Efectivo recibido: $${Number(amountReceived).toFixed(2)} - Cambio: $${(
                  Number(amountReceived) - total
                ).toFixed(2)}`
              : null,
        },
      })

      // D. Si se asignó mesa en comedor y ya se cobró, dejarla lista y regresar al mesero titular
      if (tableId && orderType === 'DINE_IN') {
        await tx.table.update({
          where: { id: tableId },
          data: {
            status: TableStatus.AVAILABLE,
            currentWaiterId: null, // Regresa automáticamente al mesero que la tenía asignada
          },
        })

        // Cerrar cualquier orden abierta previa de esa mesa
        await tx.order.updateMany({
          where: {
            tableId,
            branchId,
            id: { not: order.id },
            status: { in: [OrderStatus.DRAFT, OrderStatus.SENT, OrderStatus.PREPARING, OrderStatus.SERVED] },
          },
          data: {
            status: OrderStatus.PAID,
            closedAt: new Date(),
          },
        })
      }

      // E. Registro de Auditoría
      await tx.auditLog.create({
        data: {
          businessId: session.businessId!,
          userId: session.userId,
          action: 'SALE_COMPLETED',
          entityType: 'Order',
          entityId: order.id,
          payload: {
            orderNumber: order.orderNumber,
            total,
            paymentMethod,
            itemsCount: items.length,
            inventoryMovementsCount: inventoryMovementsSummary.length,
          },
        },
      })

      return {
        order,
        payment,
        inventoryMovementsSummary,
      }
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        total: result.order.total,
        paymentMethod: result.payment.method,
        inventoryDeductions: result.inventoryMovementsSummary,
      },
      message: 'Venta registrada y cobrada exitosamente con descuento automático de inventario',
    })
  } catch (error: any) {
    console.error('Error en POST /api/pos/orders:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Error al procesar la venta' } },
      { status: 500 }
    )
  }
}

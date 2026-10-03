import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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
    const branchId = searchParams.get('branchId')
    const range = searchParams.get('range') || 'today' // today, 7days, 30days, all

    let startDate: Date | undefined
    const now = new Date()

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    } else if (range === '7days') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0)
    } else if (range === '30days') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0)
    }

    const branchFilter = branchId ? { id: branchId } : {}

    // 1. Órdenes pagadas
    const orders = await prisma.order.findMany({
      where: {
        branch: {
          businessId: session.businessId,
          ...branchFilter,
        },
        status: 'PAID',
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        table: { select: { id: true, name: true } },
        waiter: { select: { id: true, name: true } },
        payments: true,
        items: {
          include: {
            productVariant: {
              include: { product: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 2. Historial de Cortes de Caja (Arqueos)
    const cashCuts = await prisma.cashSession.findMany({
      where: {
        cashRegister: {
          branch: {
            businessId: session.businessId,
            ...branchFilter,
          },
        },
        ...(startDate ? { openedAt: { gte: startDate } } : {}),
      },
      include: {
        cashRegister: {
          include: {
            branch: { select: { id: true, name: true, code: true } },
          },
        },
        user: { select: { id: true, name: true, username: true } },
        payments: true,
      },
      orderBy: { openedAt: 'desc' },
    })

    // Métricas calculadas
    let totalSales = 0
    const paymentMethodsSummary: Record<string, number> = {
      CASH: 0,
      CARD_DEBIT: 0,
      CARD_CREDIT: 0,
      TRANSFER: 0,
      QR: 0,
      OTHER: 0,
    }

    const productSalesMap: Record<string, { name: string; quantity: number; total: number }> = {}

    for (const order of orders) {
      const orderTotal = Number(order.total)
      totalSales += orderTotal

      for (const p of order.payments) {
        paymentMethodsSummary[p.method] = (paymentMethodsSummary[p.method] || 0) + Number(p.amount)
      }

      for (const it of order.items) {
        const prodName = it.productVariant.product.name
        const qty = Number(it.quantity)
        const sub = Number(it.subtotal)

        if (!productSalesMap[prodName]) {
          productSalesMap[prodName] = { name: prodName, quantity: 0, total: 0 }
        }
        productSalesMap[prodName].quantity += qty
        productSalesMap[prodName].total += sub
      }
    }

    const ordersCount = orders.length
    const avgTicket = ordersCount > 0 ? totalSales / ordersCount : 0

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalSales,
          ordersCount,
          avgTicket,
          paymentMethodsSummary,
        },
        topProducts,
        cashCuts: cashCuts.map((cut) => ({
          id: cut.id,
          branchName: cut.cashRegister.branch.name,
          registerName: cut.cashRegister.name,
          cashierName: cut.user.name,
          status: cut.status,
          openedAt: cut.openedAt,
          closedAt: cut.closedAt,
          openingBalance: Number(cut.openingBalance),
          expectedBalance: cut.expectedBalance !== null ? Number(cut.expectedBalance) : null,
          closingBalance: cut.closingBalance !== null ? Number(cut.closingBalance) : null,
          difference: cut.difference !== null ? Number(cut.difference) : null,
          notes: cut.notes,
        })),
        recentOrders: orders.slice(0, 15).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          branchName: o.branch.name,
          tableName: o.table?.name || 'Mostrador',
          orderType: o.orderType,
          total: Number(o.total),
          waiterName: o.waiter?.name || 'Sistema',
          createdAt: o.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error en GET /api/reports/sales:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al generar reporte de ventas' } },
      { status: 500 }
    )
  }
}

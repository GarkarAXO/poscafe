import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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
    const view = searchParams.get('view') || 'active' // 'active' | 'history'
    const branchId = session.activeBranchId

    let orders: any[] = []

    if (view === 'active') {
      // Órdenes activas en cocina
      orders = await prisma.order.findMany({
        where: {
          branchId,
          status: { in: ['SENT', 'PREPARING'] },
          items: {
            some: {
              kitchenStatus: { in: ['PENDING', 'COOKING', 'READY'] },
            },
          },
        },
        include: {
          table: {
            include: { area: true },
          },
          waiter: { select: { id: true, name: true } },
          items: {
            include: {
              productVariant: {
                include: {
                  product: {
                    include: { category: true },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { openedAt: 'asc' }, // FIFO: las más antiguas primero
      })
    } else {
      // Historial reciente de órdenes despachadas
      orders = await prisma.order.findMany({
        where: {
          branchId,
          status: { in: ['SERVED', 'PAID'] },
          items: {
            some: {
              kitchenStatus: 'SERVED',
            },
          },
        },
        include: {
          table: {
            include: { area: true },
          },
          waiter: { select: { id: true, name: true } },
          items: {
            include: {
              productVariant: {
                include: {
                  product: {
                    include: { category: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      })
    }

    const formatted = orders.map((o) => {
      const now = new Date().getTime()
      const openedTime = new Date(o.openedAt).getTime()
      const elapsedMinutes = Math.floor((now - openedTime) / 60000)

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        orderType: o.orderType,
        status: o.status,
        notes: o.notes,
        openedAt: o.openedAt,
        elapsedMinutes,
        table: o.table
          ? {
              id: o.table.id,
              name: o.table.name,
              areaName: o.table.area?.name || 'General',
            }
          : null,
        waiter: o.waiter ? { id: o.waiter.id, name: o.waiter.name } : null,
        items: o.items.map((it: any) => ({
          id: it.id,
          productName: it.productVariant.product.name,
          variantName: it.productVariant.name,
          categoryName: it.productVariant.product.category?.name || 'Varios',
          quantity: Number(it.quantity),
          notes: it.notes,
          kitchenStatus: it.kitchenStatus || 'PENDING',
          createdAt: it.createdAt,
        })),
      }
    })

    return NextResponse.json({
      success: true,
      data: formatted,
    })
  } catch (error) {
    console.error('Error en GET /api/kds/orders:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar órdenes KDS' } },
      { status: 500 }
    )
  }
}

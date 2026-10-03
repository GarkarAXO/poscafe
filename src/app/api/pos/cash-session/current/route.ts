import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/pos/cash-session/current - Obtiene el balance y arqueo del turno actual
export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const branchId = session.activeBranchId

    // Buscar sesión de caja abierta
    const cashSession = await prisma.cashSession.findFirst({
      where: {
        cashRegister: { branchId },
        status: 'OPEN',
      },
      include: {
        cashRegister: true,
        user: { select: { id: true, name: true, username: true } },
        payments: true,
        movements: true,
        orders: { where: { status: 'PAID' } },
      },
      orderBy: { openedAt: 'desc' },
    })

    if (!cashSession) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No hay ninguna sesión de caja abierta en esta sucursal',
      })
    }

    // Calcular totales del turno
    const openingBalance = Number(cashSession.openingBalance)

    let cashSales = 0
    let cardSales = 0
    let transferSales = 0
    let otherSales = 0

    for (const payment of cashSession.payments) {
      const amount = Number(payment.amount)
      if (payment.method === 'CASH') cashSales += amount
      else if (payment.method === 'CARD_DEBIT' || payment.method === 'CARD_CREDIT') cardSales += amount
      else if (payment.method === 'TRANSFER' || payment.method === 'QR') transferSales += amount
      else otherSales += amount
    }

    let cashIn = 0
    let cashOut = 0
    for (const mov of cashSession.movements) {
      const amt = Number(mov.amount)
      if (mov.type === 'CASH_IN') cashIn += amt
      else if (mov.type === 'CASH_OUT') cashOut += amt
    }

    // Efectivo esperado en el cajón físico = Fondo inicial + Ventas en efectivo + Entradas de efectivo - Salidas/Gastos
    const expectedCashInDrawer = openingBalance + cashSales + cashIn - cashOut
    const totalSalesAllMethods = cashSales + cardSales + transferSales + otherSales

    return NextResponse.json({
      success: true,
      data: {
        sessionId: cashSession.id,
        registerName: cashSession.cashRegister.name,
        openedBy: cashSession.user.name,
        openedAt: cashSession.openedAt,
        openingBalance,
        cashSales,
        cardSales,
        transferSales,
        otherSales,
        totalSales: totalSalesAllMethods,
        cashIn,
        cashOut,
        expectedCashInDrawer,
        ordersCount: cashSession.orders.length,
      },
    })
  } catch (error) {
    console.error('Error en GET /api/pos/cash-session/current:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar arqueo de caja' } },
      { status: 500 }
    )
  }
}

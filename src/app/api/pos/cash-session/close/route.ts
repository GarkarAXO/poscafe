import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, clearAuthCookie } from '@/lib/auth'
import { CashSessionStatus } from '@prisma/client'

// POST /api/pos/cash-session/close - Cierra el turno de caja y genera el corte Z
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { closingBalance, notes, logoutAfter = true } = body

    if (closingBalance === undefined || closingBalance === null) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El conteo físico de efectivo es requerido' } },
        { status: 400 }
      )
    }

    const branchId = session.activeBranchId

    // 1. Obtener la sesión abierta
    const cashSession = await prisma.cashSession.findFirst({
      where: {
        cashRegister: { branchId },
        status: CashSessionStatus.OPEN,
      },
      include: {
        payments: true,
        movements: true,
        orders: true,
      },
    })

    if (!cashSession) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_OPEN_SESSION', message: 'No hay ninguna sesión de caja abierta para cerrar' } },
        { status: 400 }
      )
    }

    // 2. Calcular el balance esperado
    const opening = Number(cashSession.openingBalance)
    const cashSales = cashSession.payments
      .filter((p) => p.method === 'CASH')
      .reduce((acc, p) => acc + Number(p.amount), 0)

    const cashIn = cashSession.movements
      .filter((m) => m.type === 'CASH_IN')
      .reduce((acc, m) => acc + Number(m.amount), 0)

    const cashOut = cashSession.movements
      .filter((m) => m.type === 'CASH_OUT')
      .reduce((acc, m) => acc + Number(m.amount), 0)

    const expectedBalance = opening + cashSales + cashIn - cashOut
    const countedBalance = Number(closingBalance)
    const difference = countedBalance - expectedBalance // Positivo = sobrante, Negativo = faltante

    // 3. Cerrar la sesión en la base de datos
    const closedSession = await prisma.cashSession.update({
      where: { id: cashSession.id },
      data: {
        closingBalance: countedBalance,
        expectedBalance,
        difference,
        status: CashSessionStatus.CLOSED,
        closedAt: new Date(),
        notes: notes?.trim() || null,
      },
      include: {
        cashRegister: true,
        user: { select: { id: true, name: true } },
      },
    })

    // 4. Auditoría
    await prisma.auditLog.create({
      data: {
        businessId: session.businessId,
        userId: session.userId,
        action: 'CASH_SESSION_CLOSED',
        entityType: 'CashSession',
        entityId: closedSession.id,
        payload: {
          register: closedSession.cashRegister.name,
          closedBy: session.name,
          openingBalance: opening,
          expectedBalance,
          countedBalance,
          difference,
          ordersCount: cashSession.orders.length,
        },
      },
    })

    // 5. Cerrar sesión de usuario si se solicitó
    if (logoutAfter) {
      await clearAuthCookie()
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: closedSession.id,
        registerName: closedSession.cashRegister.name,
        closedBy: session.name,
        closedAt: closedSession.closedAt,
        openingBalance: opening,
        expectedBalance,
        countedBalance,
        difference,
        differenceType: difference === 0 ? 'EXACT' : difference > 0 ? 'SURPLUS' : 'DEFICIT',
      },
      message: 'Turno de caja cerrado exitosamente con registro de arqueo',
    })
  } catch (error) {
    console.error('Error en POST /api/pos/cash-session/close:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al cerrar turno de caja' } },
      { status: 500 }
    )
  }
}

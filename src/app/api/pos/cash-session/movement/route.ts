import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { CashMovementType, CashSessionStatus } from '@prisma/client'

// GET /api/pos/cash-session/movement - Lista los movimientos de la sesión de caja actual
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

    const cashSession = await prisma.cashSession.findFirst({
      where: {
        cashRegister: { branchId },
        status: CashSessionStatus.OPEN,
      },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!cashSession) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No hay ninguna sesión de caja abierta',
      })
    }

    return NextResponse.json({
      success: true,
      data: cashSession.movements.map((m) => ({
        id: m.id,
        type: m.type,
        amount: Number(m.amount),
        reason: m.reason,
        authorizedBy: m.authorizedBy,
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error en GET /api/pos/cash-session/movement:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar movimientos de caja' } },
      { status: 500 }
    )
  }
}

// POST /api/pos/cash-session/movement - Registra entrada o salida de efectivo (Fondo adicional, retiro de caja, etc.)
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || !session.userId || !session.activeBranchId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const businessId = session.businessId
    const userId = session.userId

    const body = await request.json()
    const { type, amount, reason, authorizedBy } = body

    if (!type || (type !== CashMovementType.CASH_IN && type !== CashMovementType.CASH_OUT)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'Tipo de movimiento inválido (CASH_IN o CASH_OUT)' } },
        { status: 400 }
      )
    }

    const numAmount = Number(amount)
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_AMOUNT', message: 'El monto debe ser un número mayor a 0' } },
        { status: 400 }
      )
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REASON', message: 'El motivo o concepto del movimiento es obligatorio' } },
        { status: 400 }
      )
    }

    const branchId = session.activeBranchId

    // Buscar sesión activa de caja
    const cashSession = await prisma.cashSession.findFirst({
      where: {
        cashRegister: { branchId },
        status: CashSessionStatus.OPEN,
      },
      include: {
        cashRegister: true,
        payments: true,
        movements: true,
      },
    })

    if (!cashSession) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_OPEN_SESSION', message: 'No hay ninguna sesión de caja abierta en esta sucursal' } },
        { status: 400 }
      )
    }

    // Calcular efectivo actual antes del retiro
    const opening = Number(cashSession.openingBalance)
    const cashSales = cashSession.payments
      .filter((p) => p.method === 'CASH')
      .reduce((acc, p) => acc + Number(p.amount), 0)
    const prevCashIn = cashSession.movements
      .filter((m) => m.type === CashMovementType.CASH_IN)
      .reduce((acc, m) => acc + Number(m.amount), 0)
    const prevCashOut = cashSession.movements
      .filter((m) => m.type === CashMovementType.CASH_OUT)
      .reduce((acc, m) => acc + Number(m.amount), 0)

    const currentDrawerCash = opening + cashSales + prevCashIn - prevCashOut

    // Advertencia si retiro supera el efectivo disponible
    if (type === CashMovementType.CASH_OUT && numAmount > currentDrawerCash) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_CASH',
            message: `El retiro de $${numAmount.toFixed(2)} excede el efectivo actual disponible en cajón ($${currentDrawerCash.toFixed(2)})`,
          },
        },
        { status: 400 }
      )
    }

    // Crear el movimiento
    const movement = await prisma.cashMovement.create({
      data: {
        cashSessionId: cashSession.id,
        type: type as CashMovementType,
        amount: numAmount,
        reason: reason.trim(),
        authorizedBy: authorizedBy?.trim() || session.name || null,
      },
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        businessId,
        userId,
        action: type === CashMovementType.CASH_IN ? 'CASH_IN_REGISTERED' : 'CASH_OUT_REGISTERED',
        entityType: 'CashMovement',
        entityId: movement.id,
        payload: {
          sessionId: cashSession.id,
          registerName: cashSession.cashRegister.name,
          type,
          amount: numAmount,
          reason: reason.trim(),
          authorizedBy: authorizedBy || session.name,
          drawerBalanceBefore: currentDrawerCash,
          drawerBalanceAfter: type === CashMovementType.CASH_IN ? currentDrawerCash + numAmount : currentDrawerCash - numAmount,
        },
      },
    })

    const newExpectedDrawer =
      type === CashMovementType.CASH_IN ? currentDrawerCash + numAmount : currentDrawerCash - numAmount

    return NextResponse.json({
      success: true,
      data: {
        id: movement.id,
        type: movement.type,
        amount: Number(movement.amount),
        reason: movement.reason,
        authorizedBy: movement.authorizedBy,
        createdAt: movement.createdAt,
        expectedCashInDrawer: newExpectedDrawer,
      },
      message:
        type === CashMovementType.CASH_IN
          ? `Entrada de $${numAmount.toFixed(2)} registrada exitosamente`
          : `Salida de $${numAmount.toFixed(2)} registrada exitosamente`,
    })
  } catch (error) {
    console.error('Error en POST /api/pos/cash-session/movement:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar movimiento de efectivo' } },
      { status: 500 }
    )
  }
}

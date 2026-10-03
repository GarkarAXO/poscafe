import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { signToken, setAuthCookie, AuthSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Credenciales incompletas' } },
        { status: 400 }
      )
    }

    const platformUser = await prisma.platformUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (!platformUser || !platformUser.active) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_FAILED', message: 'Credenciales inválidas' } },
        { status: 401 }
      )
    }

    const match = await bcrypt.compare(password, platformUser.passwordHash)
    if (!match) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_FAILED', message: 'Credenciales inválidas' } },
        { status: 401 }
      )
    }

    const sessionPayload: AuthSession = {
      userId: platformUser.id,
      name: platformUser.name,
      email: platformUser.email,
      isPlatformAdmin: true,
      roleCodes: ['SUPER_ADMIN'],
      permissions: {
        canAccessPOS: true,
        canManageCatalog: true,
        canManageInventory: true,
        canManagePurchases: true,
        canManageExpenses: true,
        canManageCashRegisters: true,
        canViewReports: true,
        canManageUsers: true,
        canManageSettings: true,
        canAuthorizeDiscounts: true,
        canAuthorizeCourtesies: true,
        canAuthorizeCancellations: true,
        canTransferTables: true,
      },
    }

    const token = await signToken(sessionPayload)
    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: platformUser.id,
          name: platformUser.name,
          email: platformUser.email,
          isPlatformAdmin: true,
        },
      },
    })
  } catch (error) {
    console.error('Error en POST /api/auth/platform-login:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' } },
      { status: 500 }
    )
  }
}

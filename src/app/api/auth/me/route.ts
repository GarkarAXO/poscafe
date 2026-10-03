import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    if (session.isPlatformAdmin) {
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: session.userId,
            name: session.name,
            email: session.email,
            isPlatformAdmin: true,
            roleCodes: session.roleCodes,
            permissions: session.permissions,
          },
        },
      })
    }

    // Usuario de Tenant / Negocio
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        business: {
          include: {
            settings: true,
            subscription: { include: { plan: true } },
          },
        },
        userBranches: {
          include: { branch: true },
        },
        roles: {
          include: { role: true },
        },
      },
    })

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_INACTIVE', message: 'Usuario no disponible' } },
        { status: 403 }
      )
    }

    const activeBranch =
      user.userBranches.find((ub) => ub.branchId === session.activeBranchId)?.branch ||
      user.userBranches.find((ub) => ub.isDefault)?.branch ||
      user.userBranches[0]?.branch

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          businessId: user.businessId,
          business: {
            id: user.business.id,
            name: user.business.name,
            businessType: user.business.businessType,
            currencyCode: user.business.currencyCode,
            settings: user.business.settings,
            plan: user.business.subscription?.plan,
          },
          activeBranch: activeBranch
            ? {
                id: activeBranch.id,
                name: activeBranch.name,
                code: activeBranch.code,
                logoUrl: activeBranch.logoUrl,
                bgColor: activeBranch.bgColor,
                primaryColor: activeBranch.primaryColor,
                secondaryColor: activeBranch.secondaryColor,
                buttonColor: activeBranch.buttonColor,
              }
            : null,
          branches: user.userBranches
            .filter((ub) => ub.branch.active)
            .map((ub) => ({
              id: ub.branch.id,
              name: ub.branch.name,
              code: ub.branch.code,
              isDefault: ub.isDefault,
            })),
          roleCodes: session.roleCodes,
          permissions: session.permissions,
        },
      },
    })
  } catch (error) {
    console.error('Error en GET /api/auth/me:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' } },
      { status: 500 }
    )
  }
}

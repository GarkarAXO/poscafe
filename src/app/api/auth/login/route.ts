import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { mergePermissions, signToken, setAuthCookie, AuthSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { login, password } = body

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Credenciales incompletas' } },
        { status: 400 }
      )
    }

    // Buscar usuario por email o username (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: login.trim(), mode: 'insensitive' } },
          { username: { equals: login.trim(), mode: 'insensitive' } },
        ],
        active: true,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            businessType: true,
            currencyCode: true,
            active: true,
          },
        },
        userBranches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
                active: true,
              },
            },
          },
        },
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user || !user.business.active) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_FAILED', message: 'Usuario o contraseña incorrectos' } },
        { status: 401 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_FAILED', message: 'Usuario o contraseña incorrectos' } },
        { status: 401 }
      )
    }

    // Determinar sucursal activa por defecto
    const activeBranch =
      user.userBranches.find((ub) => ub.isDefault && ub.branch.active)?.branch ||
      user.userBranches.find((ub) => ub.branch.active)?.branch

    const permissions = mergePermissions(user.roles)
    const roleCodes = user.roles.map((r) => r.role.code)

    const sessionPayload: AuthSession = {
      userId: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      gender: user.gender || 'MALE',
      isPlatformAdmin: false,
      businessId: user.businessId,
      activeBranchId: activeBranch?.id,
      roleCodes,
      permissions,
    }

    const token = await signToken(sessionPayload)
    await setAuthCookie(token)

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          gender: user.gender || 'MALE',
          businessId: user.businessId,
          businessName: user.business.name,
          businessType: user.business.businessType,
          activeBranch: activeBranch
            ? { id: activeBranch.id, name: activeBranch.name, code: activeBranch.code }
            : null,
          branches: user.userBranches
            .filter((ub) => ub.branch.active)
            .map((ub) => ({
              id: ub.branch.id,
              name: ub.branch.name,
              code: ub.branch.code,
              isDefault: ub.isDefault,
            })),
          roleCodes,
          permissions,
        },
      },
    })
  } catch (error) {
    console.error('Error en POST /api/auth/login:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' } },
      { status: 500 }
    )
  }
}

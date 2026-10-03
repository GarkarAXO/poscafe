import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    // 1. Obtener información de la suscripción y límites del plan
    const subscription = await prisma.subscription.findUnique({
      where: { businessId: session.businessId },
      include: { plan: true },
    })

    const maxUsers = subscription?.plan?.maxUsers ?? 3

    // 2. Obtener usuarios del negocio
    const users = await prisma.user.findMany({
      where: {
        businessId: session.businessId,
        deletedAt: null,
      },
      include: {
        roles: {
          include: {
            role: true,
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
      },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    })

    const activeUsersCount = users.filter((u) => u.active).length

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username,
        active: u.active,
        hasPin: Boolean(u.pinHash),
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        roles: u.roles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
          isSystem: ur.role.isSystem,
          canAccessPOS: ur.role.canAccessPOS,
          canAuthorizeDiscounts: ur.role.canAuthorizeDiscounts,
          canAuthorizeCourtesies: ur.role.canAuthorizeCourtesies,
          canAuthorizeCancellations: ur.role.canAuthorizeCancellations,
        })),
        branches: u.userBranches.map((ub) => ({
          id: ub.branch.id,
          name: ub.branch.name,
          code: ub.branch.code,
          isDefault: ub.isDefault,
        })),
      })),
      planLimits: {
        maxUsers,
        activeUsers: activeUsersCount,
        canAddUser: activeUsersCount < maxUsers,
        planName: subscription?.plan?.name || 'Plan Estándar',
      },
    })
  } catch (error) {
    console.error('Error en GET /api/users:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar personal' } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    if (!session.permissions.canManageUsers && !session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permisos para registrar nuevo personal' } },
        { status: 403 }
      )
    }

    // 1. Validar límite de usuarios según el plan SaaS
    const subscription = await prisma.subscription.findUnique({
      where: { businessId: session.businessId },
      include: { plan: true },
    })

    const maxUsers = subscription?.plan?.maxUsers ?? 3
    const activeUsersCount = await prisma.user.count({
      where: {
        businessId: session.businessId,
        active: true,
        deletedAt: null,
      },
    })

    if (activeUsersCount >= maxUsers) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PLAN_LIMIT_REACHED',
            message: `Has alcanzado el límite de usuarios de tu plan (${maxUsers} usuarios permitidos). Actualiza tu plan para registrar más personal.`,
          },
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      email,
      username,
      password,
      pin,
      roleId,
      branchIds = [],
      defaultBranchId,
    } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El nombre es obligatorio' } },
        { status: 400 }
      )
    }

    if (!email?.trim() && !username?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Debes proporcionar al menos un correo o un usuario' } },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'La contraseña debe tener al menos 6 caracteres' } },
        { status: 400 }
      )
    }

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Debes asignar un rol al empleado' } },
        { status: 400 }
      )
    }

    // Validar PIN si se proporciona (debe ser numérico de 4 dígitos)
    let pinHash: string | null = null
    if (pin) {
      const cleanPin = String(pin).trim()
      if (!/^\d{4}$/.test(cleanPin)) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_PIN', message: 'El PIN debe ser un código numérico exacto de 4 dígitos' } },
          { status: 400 }
        )
      }
      pinHash = await bcrypt.hash(cleanPin, 10)
    }

    // Validar duplicidad de email o username dentro del mismo negocio
    const normalizedEmail = email?.trim().toLowerCase() || null
    const normalizedUsername = username?.trim().toLowerCase() || null

    if (normalizedEmail) {
      const existingEmail = await prisma.user.findFirst({
        where: { businessId: session.businessId, email: normalizedEmail, deletedAt: null },
      })
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: { code: 'DUPLICATE_EMAIL', message: 'Ya existe un usuario con este correo electrónico' } },
          { status: 400 }
        )
      }
    }

    if (normalizedUsername) {
      const existingUsername = await prisma.user.findFirst({
        where: { businessId: session.businessId, username: normalizedUsername, deletedAt: null },
      })
      if (existingUsername) {
        return NextResponse.json(
          { success: false, error: { code: 'DUPLICATE_USERNAME', message: 'Ya existe un usuario con este nombre de usuario' } },
          { status: 400 }
        )
      }
    }

    // Validar existencia del rol
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ isSystem: true }, { businessId: session.businessId }],
      },
    })

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ROLE', message: 'El rol seleccionado no es válido' } },
        { status: 400 }
      )
    }

    // Validar sucursales
    const validBranches = await prisma.branch.findMany({
      where: {
        businessId: session.businessId,
        ...(branchIds.length > 0 ? { id: { in: branchIds } } : {}),
      },
      select: { id: true },
    })

    if (validBranches.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_BRANCHES', message: 'Debes asignar al menos una sucursal al usuario' } },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Crear usuario en transacción
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          businessId: session.businessId!,
          name: name.trim(),
          email: normalizedEmail,
          username: normalizedUsername,
          passwordHash,
          pinHash,
          active: true,
        },
      })

      // Asignar rol
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      })

      // Asignar sucursales
      const finalDefaultBranchId = defaultBranchId && validBranches.some((b) => b.id === defaultBranchId)
        ? defaultBranchId
        : validBranches[0].id

      for (const branch of validBranches) {
        await tx.userBranch.create({
          data: {
            userId: user.id,
            branchId: branch.id,
            isDefault: branch.id === finalDefaultBranchId,
          },
        })
      }

      return user
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        hasPin: Boolean(pinHash),
      },
      message: 'Empleado registrado con éxito',
    })
  } catch (error) {
    console.error('Error en POST /api/users:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar personal' } },
      { status: 500 }
    )
  }
}

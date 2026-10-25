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

    // 1. Obtener límite de colaboradores (prioriza el maxStaff de la sucursal activa)
    let maxUsers = 10
    if (session.activeBranchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: session.activeBranchId },
        select: { maxStaff: true },
      })
      if (branch?.maxStaff && branch.maxStaff > 0) {
        maxUsers = branch.maxStaff
      }
    } else {
      const subscription = await prisma.subscription.findUnique({
        where: { businessId: session.businessId },
        include: { plan: true },
      })
      if (subscription?.plan?.maxUsers) {
        maxUsers = subscription.plan.maxUsers
      }
    }

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
        kitchenStations: {
          include: {
            station: {
              select: {
                id: true,
                name: true,
                code: true,
                color: true,
                icon: true,
              },
            },
          },
        },
      },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    })

    // Contar usuarios activos en la sucursal actual
    const activeUsersCount = users.filter((u: any) =>
      u.active && (!session.activeBranchId || u.userBranches.some((ub: any) => ub.branch.id === session.activeBranchId))
    ).length

    return NextResponse.json({
      success: true,
      data: users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username,
        gender: u.gender || 'MALE',
        age: u.age ?? null,
        active: u.active,
        hasPin: Boolean(u.pinHash),
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        roles: u.roles.map((ur: any) => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
          isSystem: ur.role.isSystem,
          canAccessPOS: ur.role.canAccessPOS,
          canAuthorizeDiscounts: ur.role.canAuthorizeDiscounts,
          canAuthorizeCourtesies: ur.role.canAuthorizeCourtesies,
          canAuthorizeCancellations: ur.role.canAuthorizeCancellations,
          canTransferTables: ur.role.canTransferTables,
          canAccessKDS: ur.role.canAccessKDS,
          canManageKitchen: ur.role.canManageKitchen,
        })),
        branches: u.userBranches.map((ub: any) => ({
          id: ub.branch.id,
          name: ub.branch.name,
          code: ub.branch.code,
          isDefault: ub.isDefault,
        })),
        kitchenStations: (u.kitchenStations || []).map((ks: any) => ({
          id: ks.station.id,
          name: ks.station.name,
          code: ks.station.code,
          color: ks.station.color,
          icon: ks.station.icon,
        })),
      })),
      planLimits: {
        maxUsers,
        activeUsers: activeUsersCount,
        canAddUser: activeUsersCount < maxUsers,
        planName: 'Capacidad de Personal',
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
      gender = 'MALE',
      age,
      roleId,
      operationalPermissions,
      branchIds = [],
      kitchenStationIds = [],
      defaultBranchId,
    } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El nombre es obligatorio' } },
        { status: 400 }
      )
    }

    if (!password?.trim() && !pin?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Debes asignar un PIN de 4 dígitos para el acceso del colaborador' } },
        { status: 400 }
      )
    }

    if (password && password.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'La contraseña debe tener al menos 6 caracteres' } },
        { status: 400 }
      )
    }

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Debes asignar un puesto de trabajo al colaborador' } },
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

    const effectivePassword = password?.trim() || crypto.randomUUID()
    const passwordHash = await bcrypt.hash(effectivePassword, 10)

    // Crear usuario en transacción
    const newUser = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          businessId: session.businessId!,
          name: name.trim(),
          email: normalizedEmail,
          username: normalizedUsername,
          passwordHash,
          pinHash,
          gender: gender === 'FEMALE' ? 'FEMALE' : 'MALE',
          age: typeof age === 'number' && age > 0 ? Math.floor(age) : null,
          active: true,
        },
      })

      // Asignar rol (creando rol personalizado individual si se modificaron permisos operativos)
      let finalRoleId = role.id
      const hasCustomOps =
        operationalPermissions &&
        (
          (operationalPermissions.canAccessPOS !== undefined && operationalPermissions.canAccessPOS !== role.canAccessPOS) ||
          (operationalPermissions.canAuthorizeDiscounts !== undefined && operationalPermissions.canAuthorizeDiscounts !== role.canAuthorizeDiscounts) ||
          (operationalPermissions.canAuthorizeCourtesies !== undefined && operationalPermissions.canAuthorizeCourtesies !== role.canAuthorizeCourtesies) ||
          (operationalPermissions.canAuthorizeCancellations !== undefined && operationalPermissions.canAuthorizeCancellations !== role.canAuthorizeCancellations) ||
          (operationalPermissions.canTransferTables !== undefined && operationalPermissions.canTransferTables !== role.canTransferTables)
        )

      if (hasCustomOps) {
        const staffCode = `STAFF_${user.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 20)}`
        const customRole = await tx.role.create({
          data: {
            businessId: session.businessId,
            name: role.name,
            code: staffCode,
            description: `Puesto ${role.name} con permisos operativos personalizados`,
            isSystem: false,
            canAccessPOS: operationalPermissions.canAccessPOS ?? role.canAccessPOS,
            canManageCatalog: role.canManageCatalog,
            canManageInventory: role.canManageInventory,
            canManagePurchases: role.canManagePurchases,
            canManageExpenses: role.canManageExpenses,
            canManageCashRegisters: role.canManageCashRegisters,
            canViewReports: role.canViewReports,
            canManageUsers: role.canManageUsers,
            canManageSettings: role.canManageSettings,
            canAuthorizeDiscounts: operationalPermissions.canAuthorizeDiscounts ?? role.canAuthorizeDiscounts,
            canAuthorizeCourtesies: operationalPermissions.canAuthorizeCourtesies ?? role.canAuthorizeCourtesies,
            canAuthorizeCancellations: operationalPermissions.canAuthorizeCancellations ?? role.canAuthorizeCancellations,
            canTransferTables: operationalPermissions.canTransferTables ?? role.canTransferTables,
            canAccessKDS: role.canAccessKDS,
            canManageKitchen: role.canManageKitchen,
          },
        })

        // Copiar y ajustar permisos en role_permissions
        const baseRolePerms = await tx.rolePermission.findMany({
          where: { roleId: role.id },
          include: { permission: true },
        })
        const permCodes = new Set<string>(baseRolePerms.map((rp: any) => rp.permission.code))

        // Ajustar según permisos operativos
        if (customRole.canAccessPOS) {
          permCodes.add('acceso_pos')
          permCodes.add('acceso_comandera')
        } else {
          permCodes.delete('acceso_pos')
          permCodes.delete('acceso_comandera')
        }
        if (customRole.canAuthorizeDiscounts) permCodes.add('autorizar_descuentos')
        else permCodes.delete('autorizar_descuentos')

        if (customRole.canAuthorizeCourtesies) permCodes.add('autorizar_cortesias')
        else permCodes.delete('autorizar_cortesias')

        if (customRole.canAuthorizeCancellations) permCodes.add('autorizar_cancelaciones')
        else permCodes.delete('autorizar_cancelaciones')

        if (customRole.canTransferTables) permCodes.add('traspaso_mesas')
        else permCodes.delete('traspaso_mesas')

        const permsToLink = await tx.permission.findMany({
          where: { code: { in: Array.from(permCodes) } },
          select: { id: true },
        })

        if (permsToLink.length > 0) {
          await tx.rolePermission.createMany({
            data: permsToLink.map((p: any) => ({
              roleId: customRole.id,
              permissionId: p.id,
            })),
            skipDuplicates: true,
          })
        }

        finalRoleId = customRole.id
      }

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: finalRoleId,
        },
      })

      // Asignar sucursales
      const finalDefaultBranchId = defaultBranchId && validBranches.some((b: any) => b.id === defaultBranchId)
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

      // Asignar estaciones de cocina si se enviaron
      if (Array.isArray(kitchenStationIds) && kitchenStationIds.length > 0) {
        const validStations = await tx.kitchenStation.findMany({
          where: {
            businessId: session.businessId,
            id: { in: kitchenStationIds },
          },
          select: { id: true },
        })

        for (const st of validStations) {
          await tx.userKitchenStation.create({
            data: {
              userId: user.id,
              stationId: st.id,
            },
          })
        }
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

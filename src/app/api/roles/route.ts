import { NextResponse } from 'next/server'
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

    // 1. Obtener roles propios creados o personalizados por este negocio
    const businessRoles = await prisma.role.findMany({
      where: { businessId: session.businessId },
      include: {
        _count: {
          select: {
            users: {
              where: {
                user: {
                  businessId: session.businessId,
                  active: true,
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const customRoleCodes = businessRoles.map((r) => r.code)

    // 2. Obtener roles del sistema que NO hayan sido personalizados por este negocio
    const systemRoles = await prisma.role.findMany({
      where: {
        isSystem: true,
        ...(customRoleCodes.length > 0 ? { code: { notIn: customRoleCodes } } : {}),
      },
      include: {
        _count: {
          select: {
            users: {
              where: {
                user: {
                  businessId: session.businessId,
                  active: true,
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const roles = [...systemRoles, ...businessRoles]

    return NextResponse.json({
      success: true,
      data: roles.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        isSystem: r.isSystem,
        isCustomizedSystemRole: Boolean(!r.isSystem && ['ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'WAITER'].includes(r.code)),
        businessId: r.businessId,
        userCount: r._count.users,
        permissions: {
          canAccessPOS: r.canAccessPOS,
          canManageCatalog: r.canManageCatalog,
          canManageInventory: r.canManageInventory,
          canManagePurchases: r.canManagePurchases,
          canManageExpenses: r.canManageExpenses,
          canManageCashRegisters: r.canManageCashRegisters,
          canViewReports: r.canViewReports,
          canManageUsers: r.canManageUsers,
          canManageSettings: r.canManageSettings,
          canAuthorizeDiscounts: r.canAuthorizeDiscounts,
          canAuthorizeCourtesies: r.canAuthorizeCourtesies,
          canAuthorizeCancellations: r.canAuthorizeCancellations,
          canTransferTables: r.canTransferTables,
        },
        createdAt: r.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error en GET /api/roles:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar roles' } },
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

    if (!session.permissions.canManageUsers && !session.isPlatformAdmin && !session.roleCodes.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permiso para administrar roles' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, code, permissions } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El nombre del rol es requerido' } },
        { status: 400 }
      )
    }

    // Generar código único en mayúsculas
    const normalizedCode = (code?.trim() || name.trim())
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '_')
      .slice(0, 30)

    // Verificar si ya existe un rol con ese código en el negocio
    const existing = await prisma.role.findFirst({
      where: {
        businessId: session.businessId,
        code: normalizedCode,
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'Ya existe un rol con este código en tu negocio' } },
        { status: 400 }
      )
    }

    const p = permissions || {}

    const newRole = await prisma.role.create({
      data: {
        businessId: session.businessId,
        name: name.trim(),
        code: normalizedCode,
        isSystem: false,
        canAccessPOS: Boolean(p.canAccessPOS),
        canManageCatalog: Boolean(p.canManageCatalog),
        canManageInventory: Boolean(p.canManageInventory),
        canManagePurchases: Boolean(p.canManagePurchases),
        canManageExpenses: Boolean(p.canManageExpenses),
        canManageCashRegisters: Boolean(p.canManageCashRegisters),
        canViewReports: Boolean(p.canViewReports),
        canManageUsers: Boolean(p.canManageUsers),
        canManageSettings: Boolean(p.canManageSettings),
        canAuthorizeDiscounts: Boolean(p.canAuthorizeDiscounts),
        canAuthorizeCourtesies: Boolean(p.canAuthorizeCourtesies),
        canAuthorizeCancellations: Boolean(p.canAuthorizeCancellations),
        canTransferTables: Boolean(p.canTransferTables),
      },
    })

    return NextResponse.json({
      success: true,
      data: newRole,
      message: 'Rol creado exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/roles:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar rol' } },
      { status: 500 }
    )
  }
}

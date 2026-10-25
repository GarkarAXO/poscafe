import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureSystemModulesAndPermissions } from '@/lib/permissions-service'
import { PERMISSIONS } from '@/lib/constants/permissions'

function mapCodesToBooleans(codes: string[]) {
  return {
    canAccessPOS: codes.includes(PERMISSIONS.ACCESO_POS) || codes.includes(PERMISSIONS.ACCESO_COMANDERA),
    canManageCatalog: codes.includes(PERMISSIONS.GESTIONAR_CATALOGO),
    canManageInventory: codes.includes(PERMISSIONS.GESTIONAR_INVENTARIO),
    canManagePurchases: codes.includes(PERMISSIONS.GESTIONAR_COMPRAS),
    canManageExpenses: codes.includes(PERMISSIONS.GESTIONAR_GASTOS),
    canManageCashRegisters: codes.includes(PERMISSIONS.GESTIONAR_CAJAS),
    canViewReports: codes.includes(PERMISSIONS.VER_REPORTES),
    canManageUsers: codes.includes(PERMISSIONS.GESTIONAR_PERSONAL),
    canManageSettings: codes.includes(PERMISSIONS.ACCESO_DASHBOARD) || codes.includes(PERMISSIONS.GESTIONAR_CONFIGURACION),
    canAuthorizeDiscounts: codes.includes(PERMISSIONS.AUTORIZAR_DESCUENTOS),
    canAuthorizeCourtesies: codes.includes(PERMISSIONS.AUTORIZAR_CORTESIAS),
    canAuthorizeCancellations: codes.includes(PERMISSIONS.AUTORIZAR_CANCELACIONES),
    canTransferTables: codes.includes(PERMISSIONS.TRASPASO_MESAS),
    canAccessKDS: codes.includes(PERMISSIONS.ACCESO_KDS),
    canManageKitchen: codes.includes(PERMISSIONS.GESTIONAR_COCINA),
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    // Asegurar módulos y permisos sincronizados
    await ensureSystemModulesAndPermissions()

    // 1. Obtener catálogo de módulos y permisos disponibles
    const modules = await prisma.module.findMany({
      where: { active: true },
      include: {
        permissions: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // 2. Obtener roles propios creados o personalizados por este negocio
    const businessRoles = await prisma.role.findMany({
      where: {
        businessId: session.businessId,
        NOT: { code: { startsWith: 'STAFF_' } },
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
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

    const customRoleCodes = businessRoles.map((r: any) => r.code)

    // 3. Obtener roles del sistema que NO hayan sido personalizados por este negocio
    const systemRoles = await prisma.role.findMany({
      where: {
        isSystem: true,
        ...(customRoleCodes.length > 0 ? { code: { notIn: customRoleCodes } } : {}),
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
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
      data: roles.map((r: any) => {
        // Extraer códigos de permisos vinculados
        const permissionCodes: string[] = r.rolePermissions.map((rp: any) => rp.permission.code)

        // Si es rol de sistema como ADMIN y no tenía permisos en BD, aseguramos que tenga todos
        if ((r.code === 'ADMIN' || r.code === 'SUPERADMIN') && permissionCodes.length === 0) {
          modules.forEach((m) => m.permissions.forEach((p) => permissionCodes.push(p.code)))
        }

        return {
          id: r.id,
          name: r.name,
          code: r.code,
          description: r.description,
          isSystem: r.isSystem,
          isCustomizedSystemRole: Boolean(!r.isSystem && ['ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'WAITER'].includes(r.code)),
          businessId: r.businessId,
          userCount: r._count.users,
          permissionCodes,
          permissions: {
            canAccessPOS: r.canAccessPOS || permissionCodes.includes(PERMISSIONS.ACCESO_POS),
            canManageCatalog: r.canManageCatalog || permissionCodes.includes(PERMISSIONS.GESTIONAR_CATALOGO),
            canManageInventory: r.canManageInventory || permissionCodes.includes(PERMISSIONS.GESTIONAR_INVENTARIO),
            canManagePurchases: r.canManagePurchases || permissionCodes.includes(PERMISSIONS.GESTIONAR_COMPRAS),
            canManageExpenses: r.canManageExpenses || permissionCodes.includes(PERMISSIONS.GESTIONAR_GASTOS),
            canManageCashRegisters: r.canManageCashRegisters || permissionCodes.includes(PERMISSIONS.GESTIONAR_CAJAS),
            canViewReports: r.canViewReports || permissionCodes.includes(PERMISSIONS.VER_REPORTES),
            canManageUsers: r.canManageUsers || permissionCodes.includes(PERMISSIONS.GESTIONAR_PERSONAL),
            canManageSettings: r.canManageSettings || permissionCodes.includes(PERMISSIONS.ACCESO_DASHBOARD),
            canAuthorizeDiscounts: r.canAuthorizeDiscounts || permissionCodes.includes(PERMISSIONS.AUTORIZAR_DESCUENTOS),
            canAuthorizeCourtesies: r.canAuthorizeCourtesies || permissionCodes.includes(PERMISSIONS.AUTORIZAR_CORTESIAS),
            canAuthorizeCancellations: r.canAuthorizeCancellations || permissionCodes.includes(PERMISSIONS.AUTORIZAR_CANCELACIONES),
            canTransferTables: r.canTransferTables || permissionCodes.includes(PERMISSIONS.TRASPASO_MESAS),
            canAccessKDS: r.canAccessKDS || permissionCodes.includes(PERMISSIONS.ACCESO_KDS),
            canManageKitchen: r.canManageKitchen || permissionCodes.includes(PERMISSIONS.GESTIONAR_COCINA),
          },
          createdAt: r.createdAt,
        }
      }),
      modulesCatalog: modules,
    })
  } catch (error) {
    console.error('Error en GET /api/roles:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar puestos / roles' } },
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
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permiso para registrar puestos' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, code, description, permissionCodes = [], permissions = {} } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El nombre del puesto es requerido' } },
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
        { success: false, error: { code: 'DUPLICATE', message: 'Ya existe un puesto con este identificador en tu negocio' } },
        { status: 400 }
      )
    }

    // Recolectar códigos de permisos (de permissionCodes o de permissions booleans)
    const effectiveCodes = new Set<string>(permissionCodes)
    if (permissions.canAccessPOS) effectiveCodes.add(PERMISSIONS.ACCESO_POS)
    if (permissions.canManageCatalog) effectiveCodes.add(PERMISSIONS.GESTIONAR_CATALOGO)
    if (permissions.canManageInventory) effectiveCodes.add(PERMISSIONS.GESTIONAR_INVENTARIO)
    if (permissions.canManagePurchases) effectiveCodes.add(PERMISSIONS.GESTIONAR_COMPRAS)
    if (permissions.canManageExpenses) effectiveCodes.add(PERMISSIONS.GESTIONAR_GASTOS)
    if (permissions.canManageCashRegisters) effectiveCodes.add(PERMISSIONS.GESTIONAR_CAJAS)
    if (permissions.canViewReports) effectiveCodes.add(PERMISSIONS.VER_REPORTES)
    if (permissions.canManageUsers) effectiveCodes.add(PERMISSIONS.GESTIONAR_PERSONAL)
    if (permissions.canManageSettings) effectiveCodes.add(PERMISSIONS.GESTIONAR_CONFIGURACION)
    if (permissions.canAuthorizeDiscounts) effectiveCodes.add(PERMISSIONS.AUTORIZAR_DESCUENTOS)
    if (permissions.canAuthorizeCourtesies) effectiveCodes.add(PERMISSIONS.AUTORIZAR_CORTESIAS)
    if (permissions.canAuthorizeCancellations) effectiveCodes.add(PERMISSIONS.AUTORIZAR_CANCELACIONES)
    if (permissions.canTransferTables) effectiveCodes.add(PERMISSIONS.TRASPASO_MESAS)
    if (permissions.canAccessKDS) effectiveCodes.add(PERMISSIONS.ACCESO_KDS)
    if (permissions.canManageKitchen) effectiveCodes.add(PERMISSIONS.GESTIONAR_COCINA)

    const finalCodesList = Array.from(effectiveCodes)
    const flags = mapCodesToBooleans(finalCodesList)

    // Buscar IDs de los permisos en BD
    const dbPermissions = await prisma.permission.findMany({
      where: { code: { in: finalCodesList } },
      select: { id: true },
    })

    const newRole = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          businessId: session.businessId,
          name: name.trim(),
          code: normalizedCode,
          description: description?.trim() || null,
          isSystem: false,
          ...flags,
        },
      })

      if (dbPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dbPermissions.map((p) => ({
            roleId: created.id,
            permissionId: p.id,
          })),
        })
      }

      return created
    })

    return NextResponse.json({
      success: true,
      data: newRole,
      message: 'Puesto creado exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/roles:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar puesto' } },
      { status: 500 }
    )
  }
}

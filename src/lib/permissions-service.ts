import prisma from '@/lib/prisma'
import { SYSTEM_MODULES_CATALOG, PERMISSIONS, PermissionCode } from '@/lib/constants/permissions'
import { AuthSession } from '@/lib/auth'

/**
 * Asegura que los módulos del sistema y su catálogo de permisos base
 * existan en la base de datos PostgreSQL.
 */
export async function ensureSystemModulesAndPermissions() {
  for (const modDef of SYSTEM_MODULES_CATALOG) {
    // 1. Crear o actualizar módulo
    const dbModule = await prisma.module.upsert({
      where: { code: modDef.code },
      update: {
        name: modDef.name,
        description: modDef.description,
        icon: modDef.icon,
        route: modDef.route,
        sortOrder: modDef.sortOrder,
      },
      create: {
        code: modDef.code,
        name: modDef.name,
        description: modDef.description,
        icon: modDef.icon,
        route: modDef.route,
        sortOrder: modDef.sortOrder,
        active: true,
      },
    })

    // 2. Crear o actualizar los permisos de este módulo
    for (const permDef of modDef.permissions) {
      await prisma.permission.upsert({
        where: { code: permDef.code },
        update: {
          moduleId: dbModule.id,
          name: permDef.name,
          description: permDef.description,
          isAccessFlag: permDef.isAccessFlag,
          sortOrder: permDef.sortOrder,
        },
        create: {
          moduleId: dbModule.id,
          code: permDef.code,
          name: permDef.name,
          description: permDef.description,
          isAccessFlag: permDef.isAccessFlag,
          sortOrder: permDef.sortOrder,
        },
      })
    }
  }

  // 3. Sincronizar roles existentes si no tienen RolePermission asociados
  await syncExistingRolesPermissions()
}

/**
 * Asocia RolePermission a roles existentes en base a sus flags booleanos históricos.
 */
async function syncExistingRolesPermissions() {
  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: true,
    },
  })

  // Obtener catálogo de todos los permisos en BD
  const allPermissions = await prisma.permission.findMany()
  const permMap = new Map<string, string>(allPermissions.map((p) => [p.code, p.id]))

  for (const role of roles) {
    if (role.rolePermissions.length > 0) continue

    const permCodesToAssign: string[] = []

    if (role.code === 'ADMIN' || role.code === 'SUPERADMIN') {
      // Otorgar todos los permisos
      permCodesToAssign.push(...allPermissions.map((p) => p.code))
    } else {
      if (role.canAccessPOS) {
        permCodesToAssign.push(PERMISSIONS.ACCESO_POS)
        permCodesToAssign.push(PERMISSIONS.ACCESO_COMANDERA)
      }
      if (role.canManageCatalog) permCodesToAssign.push(PERMISSIONS.GESTIONAR_CATALOGO)
      if (role.canManageInventory) permCodesToAssign.push(PERMISSIONS.GESTIONAR_INVENTARIO)
      if (role.canManagePurchases) permCodesToAssign.push(PERMISSIONS.GESTIONAR_COMPRAS)
      if (role.canManageExpenses) permCodesToAssign.push(PERMISSIONS.GESTIONAR_GASTOS)
      if (role.canManageCashRegisters) permCodesToAssign.push(PERMISSIONS.GESTIONAR_CAJAS)
      if (role.canViewReports) permCodesToAssign.push(PERMISSIONS.VER_REPORTES)
      if (role.canManageUsers) permCodesToAssign.push(PERMISSIONS.GESTIONAR_PERSONAL)
      if (role.canManageSettings) {
        permCodesToAssign.push(PERMISSIONS.ACCESO_DASHBOARD)
        permCodesToAssign.push(PERMISSIONS.GESTIONAR_CONFIGURACION)
      }
      if (role.canAuthorizeDiscounts) permCodesToAssign.push(PERMISSIONS.AUTORIZAR_DESCUENTOS)
      if (role.canAuthorizeCourtesies) permCodesToAssign.push(PERMISSIONS.AUTORIZAR_CORTESIAS)
      if (role.canAuthorizeCancellations) permCodesToAssign.push(PERMISSIONS.AUTORIZAR_CANCELACIONES)
      if (role.canTransferTables) permCodesToAssign.push(PERMISSIONS.TRASPASO_MESAS)
      if (role.canAccessKDS) permCodesToAssign.push(PERMISSIONS.ACCESO_KDS)
      if (role.canManageKitchen) permCodesToAssign.push(PERMISSIONS.GESTIONAR_COCINA)

      // Si tiene acceso a algo de catálogo, inventario, reportes, etc., dar acceso a dashboard
      if (
        role.canManageCatalog ||
        role.canManageInventory ||
        role.canManagePurchases ||
        role.canManageExpenses ||
        role.canManageCashRegisters ||
        role.canViewReports ||
        role.canManageUsers
      ) {
        if (!permCodesToAssign.includes(PERMISSIONS.ACCESO_DASHBOARD)) {
          permCodesToAssign.push(PERMISSIONS.ACCESO_DASHBOARD)
        }
      }
    }

    const permissionIds = permCodesToAssign
      .map((code) => permMap.get(code))
      .filter((id): id is string => Boolean(id))

    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      })
    }
  }
}

/**
 * Obtiene todos los códigos de permisos asignados a un usuario a través de sus puestos/roles.
 */
export async function getUserPermissionCodes(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  })

  const codeSet = new Set<string>()

  for (const ur of userRoles) {
    // Si es ADMIN, tiene todos los permisos
    if (ur.role.code === 'ADMIN' || ur.role.code === 'SUPERADMIN') {
      for (const val of Object.values(PERMISSIONS)) {
        codeSet.add(val)
      }
      return Array.from(codeSet)
    }

    for (const rp of ur.role.rolePermissions) {
      codeSet.add(rp.permission.code)
    }

    // Compatibilidad adicional con flags booleanos
    if (ur.role.canAccessPOS) {
      codeSet.add(PERMISSIONS.ACCESO_POS)
      codeSet.add(PERMISSIONS.ACCESO_COMANDERA)
    }
    if (ur.role.canManageCatalog) codeSet.add(PERMISSIONS.GESTIONAR_CATALOGO)
    if (ur.role.canManageInventory) codeSet.add(PERMISSIONS.GESTIONAR_INVENTARIO)
    if (ur.role.canManagePurchases) codeSet.add(PERMISSIONS.GESTIONAR_COMPRAS)
    if (ur.role.canManageExpenses) codeSet.add(PERMISSIONS.GESTIONAR_GASTOS)
    if (ur.role.canManageCashRegisters) codeSet.add(PERMISSIONS.GESTIONAR_CAJAS)
    if (ur.role.canViewReports) codeSet.add(PERMISSIONS.VER_REPORTES)
    if (ur.role.canManageUsers) codeSet.add(PERMISSIONS.GESTIONAR_PERSONAL)
    if (ur.role.canManageSettings) {
      codeSet.add(PERMISSIONS.ACCESO_DASHBOARD)
      codeSet.add(PERMISSIONS.GESTIONAR_CONFIGURACION)
    }
    if (ur.role.canAuthorizeDiscounts) codeSet.add(PERMISSIONS.AUTORIZAR_DESCUENTOS)
    if (ur.role.canAuthorizeCourtesies) codeSet.add(PERMISSIONS.AUTORIZAR_CORTESIAS)
    if (ur.role.canAuthorizeCancellations) codeSet.add(PERMISSIONS.AUTORIZAR_CANCELACIONES)
    if (ur.role.canTransferTables) codeSet.add(PERMISSIONS.TRASPASO_MESAS)
    if (ur.role.canAccessKDS) codeSet.add(PERMISSIONS.ACCESO_KDS)
    if (ur.role.canManageKitchen) codeSet.add(PERMISSIONS.GESTIONAR_COCINA)
  }

  return Array.from(codeSet)
}

/**
 * Verifica si una sesión activa cuenta con un permiso específico por constante.
 */
export function hasPermission(session: AuthSession | null, permissionCode: string): boolean {
  if (!session) return false
  if (session.isPlatformAdmin) return true
  if (session.roleCodes?.includes('ADMIN') || session.roleCodes?.includes('SUPERADMIN')) return true

  // 1. Revisar lista de constantes permissionCodes si existe en la sesión
  if (session.permissionCodes && session.permissionCodes.includes(permissionCode)) {
    return true
  }

  // 2. Fallback de retrocompatibilidad con flags booleanos en session.permissions
  const p = session.permissions
  if (!p) return false

  switch (permissionCode) {
    case PERMISSIONS.ACCESO_DASHBOARD:
      return Boolean(
        p.canManageSettings ||
        p.canManageCatalog ||
        p.canManageInventory ||
        p.canManagePurchases ||
        p.canManageExpenses ||
        p.canManageCashRegisters ||
        p.canViewReports ||
        p.canManageUsers
      )
    case PERMISSIONS.ACCESO_POS:
      return Boolean(p.canAccessPOS)
    case PERMISSIONS.ACCESO_COMANDERA:
      return Boolean(p.canAccessPOS)
    case PERMISSIONS.ACCESO_KDS:
      return Boolean(p.canAccessKDS)
    case PERMISSIONS.GESTIONAR_CATALOGO:
      return Boolean(p.canManageCatalog)
    case PERMISSIONS.GESTIONAR_INVENTARIO:
      return Boolean(p.canManageInventory)
    case PERMISSIONS.GESTIONAR_COMPRAS:
      return Boolean(p.canManagePurchases)
    case PERMISSIONS.GESTIONAR_GASTOS:
      return Boolean(p.canManageExpenses)
    case PERMISSIONS.GESTIONAR_CAJAS:
      return Boolean(p.canManageCashRegisters)
    case PERMISSIONS.VER_REPORTES:
      return Boolean(p.canViewReports)
    case PERMISSIONS.GESTIONAR_PERSONAL:
      return Boolean(p.canManageUsers)
    case PERMISSIONS.GESTIONAR_CONFIGURACION:
      return Boolean(p.canManageSettings)
    case PERMISSIONS.AUTORIZAR_DESCUENTOS:
      return Boolean(p.canAuthorizeDiscounts)
    case PERMISSIONS.AUTORIZAR_CORTESIAS:
      return Boolean(p.canAuthorizeCourtesies)
    case PERMISSIONS.AUTORIZAR_CANCELACIONES:
      return Boolean(p.canAuthorizeCancellations)
    case PERMISSIONS.TRASPASO_MESAS:
      return Boolean(p.canTransferTables)
    case PERMISSIONS.GESTIONAR_COCINA:
      return Boolean(p.canManageKitchen)
    default:
      return false
  }
}

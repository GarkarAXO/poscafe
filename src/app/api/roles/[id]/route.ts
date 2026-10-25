import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar puestos' } },
        { status: 403 }
      )
    }

    const { id: roleId } = await params
    const body = await request.json()
    const { name, description, permissionCodes, permissions } = body

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Puesto no encontrado' } },
        { status: 404 }
      )
    }

    // Determinar códigos de permisos a asignar
    let targetCodes: string[] = []
    if (Array.isArray(permissionCodes)) {
      targetCodes = permissionCodes
    } else if (permissions) {
      const p = permissions
      if (p.canAccessPOS) {
        targetCodes.push(PERMISSIONS.ACCESO_POS)
        targetCodes.push(PERMISSIONS.ACCESO_COMANDERA)
      }
      if (p.canManageCatalog) targetCodes.push(PERMISSIONS.GESTIONAR_CATALOGO)
      if (p.canManageInventory) targetCodes.push(PERMISSIONS.GESTIONAR_INVENTARIO)
      if (p.canManagePurchases) targetCodes.push(PERMISSIONS.GESTIONAR_COMPRAS)
      if (p.canManageExpenses) targetCodes.push(PERMISSIONS.GESTIONAR_GASTOS)
      if (p.canManageCashRegisters) targetCodes.push(PERMISSIONS.GESTIONAR_CAJAS)
      if (p.canViewReports) targetCodes.push(PERMISSIONS.VER_REPORTES)
      if (p.canManageUsers) targetCodes.push(PERMISSIONS.GESTIONAR_PERSONAL)
      if (p.canManageSettings) targetCodes.push(PERMISSIONS.GESTIONAR_CONFIGURACION)
      if (p.canAuthorizeDiscounts) targetCodes.push(PERMISSIONS.AUTORIZAR_DESCUENTOS)
      if (p.canAuthorizeCourtesies) targetCodes.push(PERMISSIONS.AUTORIZAR_CORTESIAS)
      if (p.canAuthorizeCancellations) targetCodes.push(PERMISSIONS.AUTORIZAR_CANCELACIONES)
      if (p.canTransferTables) targetCodes.push(PERMISSIONS.TRASPASO_MESAS)
      if (p.canAccessKDS) targetCodes.push(PERMISSIONS.ACCESO_KDS)
      if (p.canManageKitchen) targetCodes.push(PERMISSIONS.GESTIONAR_COCINA)
    }

    const flags = mapCodesToBooleans(targetCodes)

    // Buscar IDs de permisos correspondientes
    const dbPermissions = await prisma.permission.findMany({
      where: { code: { in: targetCodes } },
      select: { id: true },
    })

    // Caso 1: El rol ya es propio de este negocio
    if (role.businessId === session.businessId) {
      const updatedRole = await prisma.$transaction(async (tx) => {
        const updated = await tx.role.update({
          where: { id: roleId },
          data: {
            ...(name?.trim() && { name: name.trim() }),
            ...(description !== undefined && { description: description?.trim() || null }),
            ...(targetCodes.length > 0 && flags),
          },
        })

        if (Array.isArray(permissionCodes) || permissions) {
          // Reemplazar permisos
          await tx.rolePermission.deleteMany({
            where: { roleId },
          })

          if (dbPermissions.length > 0) {
            await tx.rolePermission.createMany({
              data: dbPermissions.map((p) => ({
                roleId,
                permissionId: p.id,
              })),
            })
          }
        }

        return updated
      })

      return NextResponse.json({
        success: true,
        data: updatedRole,
        message: 'Permisos del puesto actualizados exitosamente',
      })
    }

    // Caso 2: El rol es una plantilla global del sistema (isSystem: true)
    if (role.isSystem) {
      let businessRole = await prisma.role.findFirst({
        where: {
          businessId: session.businessId,
          code: role.code,
        },
      })

      const finalRole = await prisma.$transaction(async (tx) => {
        let currentBusinessRole = businessRole

        if (currentBusinessRole) {
          currentBusinessRole = await tx.role.update({
            where: { id: currentBusinessRole.id },
            data: {
              ...(name?.trim() && { name: name.trim() }),
              ...(description !== undefined && { description: description?.trim() || null }),
              ...flags,
            },
          })
        } else {
          currentBusinessRole = await tx.role.create({
            data: {
              businessId: session.businessId,
              name: name?.trim() || role.name,
              code: role.code,
              description: description?.trim() || role.description,
              isSystem: false,
              ...flags,
            },
          })
        }

        // Reemplazar permisos
        await tx.rolePermission.deleteMany({
          where: { roleId: currentBusinessRole.id },
        })

        if (dbPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: dbPermissions.map((p) => ({
              roleId: currentBusinessRole.id,
              permissionId: p.id,
            })),
          })
        }

        // Reasignar usuarios
        const userRolesToMigrate = await tx.userRole.findMany({
          where: {
            roleId: role.id,
            user: { businessId: session.businessId },
          },
        })

        for (const ur of userRolesToMigrate) {
          await tx.userRole.delete({
            where: {
              userId_roleId: {
                userId: ur.userId,
                roleId: ur.roleId,
              },
            },
          })
          await tx.userRole.upsert({
            where: {
              userId_roleId: {
                userId: ur.userId,
                roleId: currentBusinessRole.id,
              },
            },
            update: {},
            create: {
              userId: ur.userId,
              roleId: currentBusinessRole.id,
            },
          })
        }

        return currentBusinessRole
      })

      return NextResponse.json({
        success: true,
        data: finalRole,
        message: `Los permisos del puesto "${role.name}" fueron personalizados exitosamente para tu negocio.`,
      })
    }

    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'No puedes modificar un puesto que no pertenece a tu negocio' } },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error en PUT /api/roles/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar puesto' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar puestos' } },
        { status: 403 }
      )
    }

    const { id: roleId } = await params

    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        businessId: session.businessId,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    })

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Puesto no encontrado o no pertenece a tu negocio' } },
        { status: 404 }
      )
    }

    if (role._count.users > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ROLE_IN_USE',
            message: `No se puede eliminar el puesto "${role.name}" porque tiene ${role._count.users} colaborador(es) asignado(s). Reasigna su puesto primero.`,
          },
        },
        { status: 400 }
      )
    }

    await prisma.role.delete({
      where: { id: roleId },
    })

    return NextResponse.json({
      success: true,
      message: 'Puesto eliminado exitosamente',
    })
  } catch (error) {
    console.error('Error en DELETE /api/roles/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar puesto' } },
      { status: 500 }
    )
  }
}

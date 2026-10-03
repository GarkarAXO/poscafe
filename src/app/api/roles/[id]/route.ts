import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar roles' } },
        { status: 403 }
      )
    }

    const { id: roleId } = await params
    const body = await request.json()
    const { name, permissions } = body

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Rol no encontrado' } },
        { status: 404 }
      )
    }

    const p = permissions || {}
    const permissionData = {
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
    }

    // Caso 1: El rol ya es propio de este negocio
    if (role.businessId === session.businessId) {
      const updatedRole = await prisma.role.update({
        where: { id: roleId },
        data: {
          ...(name?.trim() && { name: name.trim() }),
          ...(permissions && permissionData),
        },
      })

      return NextResponse.json({
        success: true,
        data: updatedRole,
        message: 'Permisos del rol actualizados exitosamente',
      })
    }

    // Caso 2: El rol es una plantilla global del sistema (isSystem: true)
    // Creamos o actualizamos una copia personalizada exclusiva para este negocio
    if (role.isSystem) {
      let businessRole = await prisma.role.findFirst({
        where: {
          businessId: session.businessId,
          code: role.code,
        },
      })

      if (businessRole) {
        businessRole = await prisma.role.update({
          where: { id: businessRole.id },
          data: {
            ...(name?.trim() && { name: name.trim() }),
            ...(permissions && permissionData),
          },
        })
      } else {
        businessRole = await prisma.role.create({
          data: {
            businessId: session.businessId,
            name: name?.trim() || role.name,
            code: role.code,
            isSystem: false,
            ...permissionData,
          },
        })
      }

      // Reasignar usuarios de este negocio que tenían el rol del sistema al nuevo rol personalizado
      const userRolesToMigrate = await prisma.userRole.findMany({
        where: {
          roleId: role.id,
          user: { businessId: session.businessId },
        },
      })

      for (const ur of userRolesToMigrate) {
        await prisma.userRole.delete({
          where: {
            userId_roleId: {
              userId: ur.userId,
              roleId: ur.roleId,
            },
          },
        })
        await prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: ur.userId,
              roleId: businessRole.id,
            },
          },
          update: {},
          create: {
            userId: ur.userId,
            roleId: businessRole.id,
          },
        })
      }

      return NextResponse.json({
        success: true,
        data: businessRole,
        message: `Los permisos de "${role.name}" fueron personalizados exitosamente para tu negocio.`,
      })
    }

    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'No puedes modificar un rol que no pertenece a tu negocio' } },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error en PUT /api/roles/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar rol' } },
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
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar roles' } },
        { status: 403 }
      )
    }

    const { id: roleId } = await params
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    })

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Rol no encontrado' } },
        { status: 404 }
      )
    }

    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: { code: 'PROTECTED', message: 'No puedes eliminar un rol estándar del sistema' } },
        { status: 400 }
      )
    }

    if (role.businessId !== session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permiso sobre este rol' } },
        { status: 403 }
      )
    }

    // Si era un rol personalizado que sobreescribió un rol del sistema, restablecemos al rol original del sistema
    const systemRole = await prisma.role.findFirst({
      where: { isSystem: true, code: role.code },
    })

    if (systemRole) {
      const userRoles = await prisma.userRole.findMany({
        where: {
          roleId: role.id,
          user: { businessId: session.businessId },
        },
      })
      for (const ur of userRoles) {
        await prisma.userRole.delete({
          where: {
            userId_roleId: {
              userId: ur.userId,
              roleId: ur.roleId,
            },
          },
        })
        await prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: ur.userId,
              roleId: systemRole.id,
            },
          },
          update: {},
          create: {
            userId: ur.userId,
            roleId: systemRole.id,
          },
        })
      }

      await prisma.role.delete({
        where: { id: roleId },
      })

      return NextResponse.json({
        success: true,
        message: `El rol "${role.name}" fue restablecido a los permisos estándar del sistema.`,
      })
    }

    // Rol personalizado propio creado desde cero
    if (role._count.users > 0) {
      return NextResponse.json(
        { success: false, error: { code: 'ROLE_IN_USE', message: `No se puede eliminar porque tiene ${role._count.users} colaborador(es) asignado(s). Reasigna a los usuarios primero.` } },
        { status: 400 }
      )
    }

    await prisma.role.delete({
      where: { id: roleId },
    })

    return NextResponse.json({
      success: true,
      message: 'Rol eliminado exitosamente',
    })
  } catch (error) {
    console.error('Error en DELETE /api/roles/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar rol' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
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

    if (!session.permissions.canManageUsers && !session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permisos para modificar personal' } },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const body = await request.json()
    const {
      name,
      email,
      username,
      password,
      pin,
      roleId,
      branchIds,
      defaultBranchId,
      active,
    } = body

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        businessId: session.businessId,
        deletedAt: null,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' } },
        { status: 404 }
      )
    }

    // Validar duplicidad de email o username si cambiaron
    const normalizedEmail = email !== undefined ? (email?.trim().toLowerCase() || null) : undefined
    const normalizedUsername = username !== undefined ? (username?.trim().toLowerCase() || null) : undefined

    if (normalizedEmail && normalizedEmail !== user.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { businessId: session.businessId, email: normalizedEmail, id: { not: userId }, deletedAt: null },
      })
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: { code: 'DUPLICATE_EMAIL', message: 'Ya existe un usuario con este correo electrónico' } },
          { status: 400 }
        )
      }
    }

    if (normalizedUsername && normalizedUsername !== user.username) {
      const existingUsername = await prisma.user.findFirst({
        where: { businessId: session.businessId, username: normalizedUsername, id: { not: userId }, deletedAt: null },
      })
      if (existingUsername) {
        return NextResponse.json(
          { success: false, error: { code: 'DUPLICATE_USERNAME', message: 'Ya existe un usuario con este nombre de usuario' } },
          { status: 400 }
        )
      }
    }

    // Hashear contraseña si fue proporcionada
    let newPasswordHash: string | undefined
    if (password && password.trim().length >= 6) {
      newPasswordHash = await bcrypt.hash(password.trim(), 10)
    }

    // Hashear PIN si fue proporcionado, o limpiar si se envía null/empty
    let newPinHash: string | null | undefined
    if (pin !== undefined) {
      if (pin === null || pin === '') {
        newPinHash = null
      } else {
        const cleanPin = String(pin).trim()
        if (!/^\d{4}$/.test(cleanPin)) {
          return NextResponse.json(
            { success: false, error: { code: 'INVALID_PIN', message: 'El PIN debe ser exactamente de 4 dígitos numéricos' } },
            { status: 400 }
          )
        }
        newPinHash = await bcrypt.hash(cleanPin, 10)
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar datos base del usuario
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(name?.trim() && { name: name.trim() }),
          ...(normalizedEmail !== undefined && { email: normalizedEmail }),
          ...(normalizedUsername !== undefined && { username: normalizedUsername }),
          ...(newPasswordHash && { passwordHash: newPasswordHash }),
          ...(newPinHash !== undefined && { pinHash: newPinHash }),
          ...(active !== undefined && { active: Boolean(active) }),
        },
      })

      // 2. Actualizar rol si se proporcionó
      if (roleId) {
        const role = await tx.role.findFirst({
          where: {
            id: roleId,
            OR: [{ isSystem: true }, { businessId: session.businessId }],
          },
        })

        if (role) {
          await tx.userRole.deleteMany({ where: { userId } })
          await tx.userRole.create({
            data: { userId, roleId: role.id },
          })
        }
      }

      // 3. Actualizar sucursales si se enviaron
      if (Array.isArray(branchIds) && branchIds.length > 0) {
        const validBranches = await tx.branch.findMany({
          where: { businessId: session.businessId, id: { in: branchIds } },
          select: { id: true },
        })

        if (validBranches.length > 0) {
          await tx.userBranch.deleteMany({ where: { userId } })
          const finalDefault = defaultBranchId && validBranches.some((b) => b.id === defaultBranchId)
            ? defaultBranchId
            : validBranches[0].id

          for (const b of validBranches) {
            await tx.userBranch.create({
              data: {
                userId,
                branchId: b.id,
                isDefault: b.id === finalDefault,
              },
            })
          }
        }
      }
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      message: 'Personal actualizado correctamente',
    })
  } catch (error) {
    console.error('Error en PUT /api/users/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar usuario' } },
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

    if (!session.permissions.canManageUsers && !session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permisos para desactivar personal' } },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    if (userId === session.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'CANNOT_DELETE_SELF', message: 'No puedes desactivar tu propia cuenta en sesión' } },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, businessId: session.businessId, deletedAt: null },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' } },
        { status: 404 }
      )
    }

    // Soft delete para mantener histórico de ventas y cierres de caja
    await prisma.user.update({
      where: { id: userId },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Personal desactivado del sistema',
    })
  } catch (error) {
    console.error('Error en DELETE /api/users/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar usuario' } },
      { status: 500 }
    )
  }
}

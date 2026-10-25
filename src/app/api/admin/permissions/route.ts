import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const isAuthorized =
      session &&
      (session.isPlatformAdmin ||
        session.roleCodes.includes('SUPERADMIN') ||
        session.roleCodes.includes('SUPER_ADMIN') ||
        session.roleCodes.includes('ADMIN'))

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso restringido a Administradores' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { moduleId, code, name, description, isAccessFlag, sortOrder } = body

    if (!moduleId || !code?.trim() || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Módulo, constante (código) y nombre son requeridos' } },
        { status: 400 }
      )
    }

    // Normalizar la constante en minúsculas con guiones bajos (ej: acceso_dashboard)
    const normalizedCode = code
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    // Validar duplicidad
    const existing = await prisma.permission.findUnique({
      where: { code: normalizedCode },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: `La constante "${normalizedCode}" ya está en uso por otro permiso` } },
        { status: 400 }
      )
    }

    // Validar módulo
    const moduleItem = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { _count: { select: { permissions: true } } },
    })

    if (!moduleItem) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Módulo no encontrado' } },
        { status: 404 }
      )
    }

    const finalSortOrder =
      typeof sortOrder === 'number' && !isNaN(sortOrder) ? sortOrder : moduleItem._count.permissions + 1

    const newPermission = await prisma.permission.create({
      data: {
        moduleId,
        code: normalizedCode,
        name: name.trim(),
        description: description?.trim() || null,
        isAccessFlag: Boolean(isAccessFlag),
        sortOrder: finalSortOrder,
      },
    })

    return NextResponse.json({
      success: true,
      data: newPermission,
      message: 'Permiso creado y registrado en el catálogo',
    })
  } catch (error: any) {
    console.error('Error en POST /api/admin/permissions:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error?.message || 'Error al crear permiso' } },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession()
    const isAuthorized =
      session &&
      (session.isPlatformAdmin ||
        session.roleCodes.includes('SUPERADMIN') ||
        session.roleCodes.includes('SUPER_ADMIN') ||
        session.roleCodes.includes('ADMIN'))

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso restringido a Administradores' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, name, description, isAccessFlag, sortOrder } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'ID del permiso requerido' } },
        { status: 400 }
      )
    }

    const updated = await prisma.permission.update({
      where: { id },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isAccessFlag !== undefined && { isAccessFlag: Boolean(isAccessFlag) }),
        ...(typeof sortOrder === 'number' && { sortOrder }),
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Permiso actualizado correctamente',
    })
  } catch (error: any) {
    console.error('Error en PUT /api/admin/permissions:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error?.message || 'Error al actualizar permiso' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    const isAuthorized =
      session &&
      (session.isPlatformAdmin ||
        session.roleCodes.includes('SUPERADMIN') ||
        session.roleCodes.includes('SUPER_ADMIN') ||
        session.roleCodes.includes('ADMIN'))

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso restringido a Administradores' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'ID del permiso requerido' } },
        { status: 400 }
      )
    }

    await prisma.permission.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Permiso eliminado del catálogo',
    })
  } catch (error: any) {
    console.error('Error en DELETE /api/admin/permissions:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error?.message || 'Error al eliminar permiso' } },
      { status: 500 }
    )
  }
}

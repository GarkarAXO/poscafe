import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureSystemModulesAndPermissions } from '@/lib/permissions-service'

export async function GET() {
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

    // Aseguramos que los módulos y permisos predeterminados existan en la BD
    await ensureSystemModulesAndPermissions()

    const modules = await prisma.module.findMany({
      include: {
        permissions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: {
              select: { rolePermissions: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: modules,
    })
  } catch (error: any) {
    console.error('Error en GET /api/admin/modules:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error?.message || 'Error al consultar módulos' } },
      { status: 500 }
    )
  }
}

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
    const { code, name, description, icon, route, sortOrder } = body

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El código identificador y el nombre del módulo son obligatorios' } },
        { status: 400 }
      )
    }

    const normalizedCode = code
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    if (!normalizedCode) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CODE', message: 'El código del módulo no es válido' } },
        { status: 400 }
      )
    }

    const existing = await prisma.module.findUnique({
      where: { code: normalizedCode },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: `Ya existe un módulo con el identificador "${normalizedCode}"` } },
        { status: 400 }
      )
    }

    const count = await prisma.module.count()
    const finalSortOrder = typeof sortOrder === 'number' && !isNaN(sortOrder) ? sortOrder : count + 1

    const newModule = await prisma.module.create({
      data: {
        code: normalizedCode,
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || 'Layers',
        route: route?.trim() || null,
        sortOrder: finalSortOrder,
        active: true,
      },
      include: {
        permissions: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: newModule,
      message: 'Módulo registrado exitosamente',
    })
  } catch (error: any) {
    console.error('Error en POST /api/admin/modules:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error?.message || 'Error al registrar módulo' } },
      { status: 500 }
    )
  }
}

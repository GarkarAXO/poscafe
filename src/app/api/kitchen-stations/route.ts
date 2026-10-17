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

    const stations = await prisma.kitchenStation.findMany({
      where: {
        businessId: session.businessId,
      },
      include: {
        _count: {
          select: {
            products: {
              where: { deletedAt: null },
            },
            userStations: {
              where: {
                user: {
                  active: true,
                  deletedAt: null,
                },
              },
            },
          },
        },
        userStations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      data: stations.map((st) => ({
        id: st.id,
        name: st.name,
        code: st.code,
        description: st.description,
        color: st.color || '#3B82F6',
        icon: st.icon || 'Utensils',
        sortOrder: st.sortOrder,
        active: st.active,
        branchId: st.branchId,
        productsCount: st._count.products,
        usersCount: st._count.userStations,
        assignedUsers: st.userStations.map((us) => us.user),
        createdAt: st.createdAt,
        updatedAt: st.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Error en GET /api/kitchen-stations:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar estaciones de cocina' } },
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

    const hasPermission =
      session.isPlatformAdmin ||
      session.roleCodes.includes('ADMIN') ||
      session.roleCodes.includes('SUPERADMIN') ||
      session.permissions?.canManageKitchen ||
      session.permissions?.canManageCatalog

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permiso para administrar áreas de cocina' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, code, description, color, icon, sortOrder = 0, branchId } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El nombre del área de cocina es requerido' } },
        { status: 400 }
      )
    }

    const normalizedCode = (code?.trim() || name.trim())
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '_')
      .slice(0, 30)

    const existing = await prisma.kitchenStation.findFirst({
      where: {
        businessId: session.businessId,
        code: normalizedCode,
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'Ya existe un área con este código en tu negocio' } },
        { status: 400 }
      )
    }

    const station = await prisma.kitchenStation.create({
      data: {
        businessId: session.businessId,
        branchId: branchId || null,
        name: name.trim(),
        code: normalizedCode,
        description: description?.trim() || null,
        color: color || '#3B82F6',
        icon: icon || 'Utensils',
        sortOrder: Number(sortOrder) || 0,
        active: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        businessId: session.businessId,
        userId: session.userId,
        action: 'KITCHEN_STATION_CREATE',
        entityType: 'KitchenStation',
        entityId: station.id,
        payload: { name: station.name, code: station.code },
      },
    })

    return NextResponse.json({
      success: true,
      data: station,
      message: 'Área de cocina creada exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/kitchen-stations:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar área de cocina' } },
      { status: 500 }
    )
  }
}

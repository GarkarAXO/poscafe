import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')

    const warehouses = await prisma.warehouse.findMany({
      where: {
        branch: {
          businessId: session.businessId,
          ...(branchId ? { id: branchId } : {}),
        },
        active: true,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        _count: { select: { stocks: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: warehouses })
  } catch (error) {
    console.error('Error en GET /api/warehouses:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener almacenes' } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    if (!session.permissions.canManageInventory && !session.roleCodes.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Permisos insuficientes' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { branchId, name, code, isDefault } = body

    if (!branchId || !name || !code) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'branchId, name y code son obligatorios' } },
        { status: 400 }
      )
    }

    const cleanCode = code.trim().toUpperCase()

    // Verificar que la sucursal pertenezca al negocio del usuario
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, businessId: session.businessId, deletedAt: null },
    })

    if (!branch) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sucursal no encontrada' } },
        { status: 404 }
      )
    }

    // Verificar código único de almacén en esa sucursal
    const existing = await prisma.warehouse.findFirst({
      where: { branchId, code: cleanCode },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_CODE', message: `El código "${cleanCode}" ya existe en esta sucursal` } },
        { status: 409 }
      )
    }

    // Si se marca como default, desmarcar otros de la misma sucursal
    if (isDefault) {
      await prisma.warehouse.updateMany({
        where: { branchId },
        data: { isDefault: false },
      })
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        branchId,
        name: name.trim(),
        code: cleanCode,
        isDefault: Boolean(isDefault),
        active: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: warehouse,
      message: 'Almacén creado exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/warehouses:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al crear almacén' } },
      { status: 500 }
    )
  }
}

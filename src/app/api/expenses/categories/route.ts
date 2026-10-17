import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const DEFAULT_EXPENSE_CATEGORIES = [
  'Renta de Local',
  'Electricidad / Luz',
  'Gas L.P.',
  'Agua Potable',
  'Internet & Teléfono',
  'Mantenimiento & Reparaciones',
  'Papelería & Impresos',
  'Artículos de Limpieza',
  'Nómina / Honorarios',
  'Otros Gastos Operativos',
]

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    let categories = await prisma.expenseCategory.findMany({
      where: { businessId: session.businessId },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Si el negocio no tiene categorías, inicializar las categorías predeterminadas
    if (categories.length === 0) {
      const created = await Promise.all(
        DEFAULT_EXPENSE_CATEGORIES.map((name) =>
          prisma.expenseCategory.create({
            data: {
              businessId: session.businessId!,
              name,
            },
          })
        )
      )

      categories = created.map((c) => ({
        ...c,
        _count: { expenses: 0 },
      }))
    }

    return NextResponse.json({
      success: true,
      data: { categories },
    })
  } catch (error) {
    console.error('Error en GET /api/expenses/categories:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener categorías de gastos' } },
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

    const isOwnerOrAdmin =
      session.roleCodes.includes('ADMIN') ||
      session.roleCodes.includes('SUPERADMIN') ||
      session.roleCodes.includes('BRANCH_MANAGER')

    if (!isOwnerOrAdmin && !session.permissions?.canManageExpenses) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Sin permisos para crear categorías de gastos' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const name = String(body.name || '').trim()

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'El nombre de la categoría es obligatorio' } },
        { status: 400 }
      )
    }

    // Verificar si ya existe
    const existing = await prisma.expenseCategory.findFirst({
      where: {
        businessId: session.businessId,
        name: { equals: name, mode: 'insensitive' },
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'Ya existe una categoría con este nombre' } },
        { status: 409 }
      )
    }

    const category = await prisma.expenseCategory.create({
      data: {
        businessId: session.businessId,
        name,
      },
    })

    return NextResponse.json({
      success: true,
      data: { category },
      message: 'Categoría de gasto creada exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/expenses/categories:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al crear categoría de gasto' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const categories = await prisma.category.findMany({
      where: { businessId: session.businessId, deletedAt: null },
      include: {
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    console.error('Error en GET /api/categories:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener categorías' } },
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

    const body = await request.json()
    const { name, slug, sortOrder, visiblePOS, visibleWeb } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El nombre es obligatorio' } },
        { status: 400 }
      )
    }

    const cleanSlug = slug
      ? slug.trim().toLowerCase()
      : name
          .trim()
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')

    const category = await prisma.category.create({
      data: {
        businessId: session.businessId,
        name: name.trim(),
        slug: cleanSlug,
        sortOrder: sortOrder ? Number(sortOrder) : 0,
        visiblePOS: visiblePOS ?? true,
        visibleWeb: visibleWeb ?? true,
      },
    })

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Categoría creada exitosamente',
    })
  } catch (error: any) {
    console.error('Error en POST /api/categories:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_SLUG', message: 'Ya existe una categoría con ese slug' } },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar categoría' } },
      { status: 500 }
    )
  }
}

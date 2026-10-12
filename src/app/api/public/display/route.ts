import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('business_id') || searchParams.get('b')
    const categoryFilter = searchParams.get('category') || searchParams.get('cat')

    // 1. Obtener negocio
    let business = null
    if (businessIdParam) {
      business = await prisma.business.findUnique({
        where: { id: businessIdParam, active: true },
        include: {
          settings: true,
          branches: { where: { active: true }, orderBy: { createdAt: 'asc' }, take: 1 },
        },
      })
    }

    if (!business) {
      business = await prisma.business.findFirst({
        where: { active: true },
        include: {
          settings: true,
          branches: { where: { active: true }, orderBy: { createdAt: 'asc' }, take: 1 },
        },
      })
    }

    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Negocio no encontrado o inactivo' } },
        { status: 404 }
      )
    }

    const settings = business.settings

    // 2. Consultar categorías activas para pantallas (visibleDisplay)
    const categories = await prisma.category.findMany({
      where: {
        businessId: business.id,
        active: true,
        visibleDisplay: true,
        deletedAt: null,
        ...(categoryFilter ? { slug: categoryFilter } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: {
            active: true,
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            variants: {
              where: { active: true, deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            },
            modifierGroups: {
              include: {
                modifierGroup: {
                  include: {
                    modifiers: {
                      where: { active: true },
                      orderBy: { name: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const formattedCategories = categories
      .filter((cat) => cat.products.length > 0)
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        imageUrl: cat.imageUrl,
        products: cat.products.map((p) => {
          const variants = p.variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: Number(v.price),
          }))

          const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0
          const maxPrice = variants.length > 0 ? Math.max(...variants.map((v) => v.price)) : 0

          const modifierGroups = p.modifierGroups.map((pmg) => ({
            id: pmg.modifierGroup.id,
            name: pmg.modifierGroup.name,
            minSelect: pmg.modifierGroup.minSelect,
            maxSelect: pmg.modifierGroup.maxSelect,
            isRequired: pmg.modifierGroup.isRequired,
            modifiers: pmg.modifierGroup.modifiers.map((m) => ({
              id: m.id,
              name: m.name,
              extraPrice: Number(m.extraPrice),
            })),
          }))

          return {
            id: p.id,
            name: p.name,
            code: p.code,
            description: p.description,
            imageUrl: p.imageUrl,
            isNew: p.isNew,
            isSeasonal: p.isSeasonal,
            hasVariants: p.hasVariants,
            minPrice,
            maxPrice,
            variants,
            modifierGroups,
          }
        }),
      }))

    const activeBranch = business.branches?.[0] || null

    return NextResponse.json({
      success: true,
      data: {
        business: {
          id: business.id,
          name: business.name,
          legalName: business.legalName,
          logoUrl: activeBranch?.logoUrl || settings?.logoUrl || null,
          isotypeUrl: activeBranch?.isotypeUrl || settings?.isotypeUrl || null,
          currency: business.currencyCode || 'MXN',
          timezone: business.timezone || 'America/Mexico_City',
          theme: {
            primaryColor: activeBranch?.primaryColor || settings?.primaryColor || '#C08552',
            secondaryColor: activeBranch?.secondaryColor || settings?.secondaryColor || '#5E3023',
            accentColor: activeBranch?.buttonColor || settings?.accentColor || '#C08552',
            darkMode: settings?.darkMode || false,
          },
        },
        refreshSeconds: 60,
        categories: formattedCategories,
      },
    })
  } catch (error: any) {
    console.error('Error fetching display data:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar datos de pantalla digital' } },
      { status: 500 }
    )
  }
}

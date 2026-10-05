import prisma from '@/lib/prisma'
import DisplayClient from './display-client'

export const dynamic = 'force-dynamic'

interface DisplayPageProps {
  searchParams: Promise<{
    b?: string
    business_id?: string
    cat?: string
    category?: string
  }>
}

export default async function DisplayPage(props: DisplayPageProps) {
  const searchParams = await props.searchParams
  const businessIdParam = searchParams.business_id || searchParams.b
  const categoryFilter = searchParams.category || searchParams.cat

  // 1. Obtener negocio
  let business = null
  if (businessIdParam) {
    business = await prisma.business.findUnique({
      where: { id: businessIdParam, active: true },
      include: { settings: true },
    })
  }

  if (!business) {
    business = await prisma.business.findFirst({
      where: { active: true },
      include: { settings: true },
    })
  }

  if (!business) {
    return (
      <div className="h-screen w-screen bg-[#0E0C0A] flex items-center justify-center text-white text-center p-4">
        <div>
          <h1 className="text-2xl font-bold">Pantalla no disponible</h1>
          <p className="text-sm mt-1 text-slate-400">
            No se encontró un negocio activo configurado para este tablero digital.
          </p>
        </div>
      </div>
    )
  }

  const settings = business.settings

  // 2. Consultar categorías activas para pantallas (visibleDisplay: true)
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

        return {
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          imageUrl: p.imageUrl,
          hasVariants: p.hasVariants,
          minPrice,
          variants,
        }
      }),
    }))

  const businessData = {
    id: business.id,
    name: business.name,
    legalName: business.legalName,
    logoUrl: settings?.logoUrl || null,
    currency: business.currencyCode || 'MXN',
    timezone: business.timezone || 'America/Mexico_City',
    theme: {
      primaryColor: settings?.primaryColor || '#C08552',
      secondaryColor: settings?.secondaryColor || '#5E3023',
      accentColor: settings?.accentColor || '#C08552',
      darkMode: settings?.darkMode || false,
    },
  }

  // Serializar a objetos planos para el Client Component
  const serializedBusiness = JSON.parse(JSON.stringify(businessData))
  const serializedCategories = JSON.parse(JSON.stringify(formattedCategories))

  return (
    <DisplayClient
      initialBusiness={serializedBusiness}
      initialCategories={serializedCategories}
    />
  )
}

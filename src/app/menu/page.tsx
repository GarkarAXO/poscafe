import prisma from '@/lib/prisma'
import MenuClient from './menu-client'

export const dynamic = 'force-dynamic'

interface MenuPageProps {
  searchParams: Promise<{
    b?: string
    business_id?: string
    table?: string
    t?: string
    branch_id?: string
  }>
}

export default async function PublicMenuPage(props: MenuPageProps) {
  const searchParams = await props.searchParams
  const businessIdParam = searchParams.business_id || searchParams.b
  const branchIdParam = searchParams.branch_id
  const tableParam = searchParams.table || searchParams.t

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
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-4 text-[#5E3023] text-center">
        <div>
          <h1 className="text-xl font-bold">Cafetería no disponible</h1>
          <p className="text-sm mt-1 text-slate-500">
            No se encontró un negocio activo configurado para este menú digital.
          </p>
        </div>
      </div>
    )
  }

  const settings = business.settings

  // 2. Información de mesa
  let tableInfo = null
  if (tableParam) {
    const activeBranchId = branchIdParam || business.branches[0]?.id
    const table = await prisma.table.findFirst({
      where: {
        OR: [{ id: tableParam }, { name: { equals: tableParam, mode: 'insensitive' } }],
        ...(activeBranchId ? { branchId: activeBranchId } : { branch: { businessId: business.id } }),
        active: true,
      },
      include: {
        area: true,
        currentWaiter: { select: { id: true, name: true } },
        assignedWaiter: { select: { id: true, name: true } },
        orders: {
          where: {
            status: { in: ['DRAFT', 'SENT', 'PREPARING', 'SERVED'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            waiter: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (table) {
      const activeOrder = table.orders[0] || null
      const isInitiated = Boolean(activeOrder || table.status === 'OCCUPIED' || table.currentWaiterId)
      const assignedWaiter = activeOrder?.waiter || table.currentWaiter || table.assignedWaiter || null

      tableInfo = {
        id: table.id,
        name: table.name,
        area: table.area?.name || null,
        branchId: table.branchId,
        isInitiated,
        activeOrderId: activeOrder?.id || null,
        orderNumber: activeOrder?.orderNumber || null,
        waiterId: assignedWaiter?.id || null,
        waiterName: assignedWaiter?.name || null,
      }
    }
  }

  // 3. Consultar categorías y productos activos para la web
  const categories = await prisma.category.findMany({
    where: {
      businessId: business.id,
      active: true,
      visibleWeb: true,
      deletedAt: null,
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
            include: {
              recipe: {
                include: {
                  items: {
                    where: { onlyTakeaway: false },
                    include: {
                      inventoryItem: {
                        select: { name: true },
                      },
                    },
                  },
                },
              },
            },
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

  // 4. Formatear y sanitizar respuesta pública
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

        // Recopilar nombres únicos de ingredientes desde las recetas del producto
        const ingredientsSet = new Set<string>()
        p.variants.forEach((v: any) => {
          if (v.recipe?.items) {
            v.recipe.items.forEach((item: any) => {
              if (item.inventoryItem?.name) {
                ingredientsSet.add(item.inventoryItem.name.trim())
              }
            })
          }
        })
        const ingredients = Array.from(ingredientsSet)

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
          ingredients,
          isAvailable: true,
        }
      }),
    }))

  const activeBranch = branchIdParam
    ? await prisma.branch.findFirst({ where: { id: branchIdParam, businessId: business.id } })
    : business.branches[0] || null

  let extraMenuConfig: {
    heroWallpaperUrl?: string | null
    heroWallpaperOpacity?: number | null
    instagramUrl?: string | null
    facebookUrl?: string | null
    tiktokUrl?: string | null
    whatsappNumber?: string | null
    mapsUrl?: string | null
  } = {}

  if (activeBranch?.addressLine2) {
    try {
      const parsed = JSON.parse(activeBranch.addressLine2)
      if (typeof parsed === 'object' && parsed !== null) {
        extraMenuConfig = parsed
      }
    } catch {}
  }

  const businessData = {
    id: business.id,
    name: business.name,
    branchId: activeBranch?.id || null,
    logoUrl: activeBranch?.logoUrl || settings?.logoUrl || null,
    isotypeUrl: activeBranch?.isotypeUrl || settings?.isotypeUrl || null,
    faviconUrl: activeBranch?.faviconUrl || settings?.faviconUrl || null,
    currency: business.currencyCode || 'MXN',
    timezone: business.timezone || 'America/Mexico_City',
    socialLinks: {
      instagram: extraMenuConfig.instagramUrl || null,
      facebook: extraMenuConfig.facebookUrl || null,
      tiktok: extraMenuConfig.tiktokUrl || null,
      whatsapp: extraMenuConfig.whatsappNumber || activeBranch?.phone || business.phone || null,
      maps: extraMenuConfig.mapsUrl || null,
    },
    heroWallpaperUrl: extraMenuConfig.heroWallpaperUrl || null,
    heroWallpaperOpacity: extraMenuConfig.heroWallpaperOpacity ?? 0.35,
    theme: {
      primaryColor: activeBranch?.primaryColor || settings?.primaryColor || '#C08552',
      secondaryColor: activeBranch?.secondaryColor || settings?.secondaryColor || '#5E3023',
      buttonColor: activeBranch?.buttonColor || settings?.primaryColor || '#C08552',
      bgColor: activeBranch?.bgColor || '#14100E',
      menuCoverColor: activeBranch?.menuCoverColor || settings?.menuCoverColor || '#18120F',
      menuPaperColor: activeBranch?.menuPaperColor || settings?.menuPaperColor || '#FDFBF7',
      menuTextColor: activeBranch?.menuTextColor || settings?.menuTextColor || '#2C1810',
      menuAccentColor: activeBranch?.menuAccentColor || settings?.menuAccentColor || '#D4AF37',
      menuCoverTitle: activeBranch?.menuCoverTitle || settings?.menuCoverTitle || 'CARTA DE ESPECIALIDADES',
      menuCoverSubtitle: activeBranch?.menuCoverSubtitle || settings?.menuCoverSubtitle || 'Café de especialidad y gastronomía artesanal',
      businessHours: activeBranch?.businessHours || settings?.businessHours || 'Lunes a Domingo: 8:00 AM - 10:00 PM',
      phone: activeBranch?.phone || business.phone || null,
      address: activeBranch?.addressLine1 || null,
      heroWallpaperUrl: extraMenuConfig.heroWallpaperUrl || null,
      heroWallpaperOpacity: extraMenuConfig.heroWallpaperOpacity ?? 0.35,
      instagramUrl: extraMenuConfig.instagramUrl || null,
      facebookUrl: extraMenuConfig.facebookUrl || null,
      tiktokUrl: extraMenuConfig.tiktokUrl || null,
      whatsappNumber: extraMenuConfig.whatsappNumber || null,
      mapsUrl: extraMenuConfig.mapsUrl || null,
    },
  }

  // Serializar para evitar errores de Decimal
  const serializedBusiness = JSON.parse(JSON.stringify(businessData))
  const serializedCategories = JSON.parse(JSON.stringify(formattedCategories))
  const serializedTable = tableInfo ? JSON.parse(JSON.stringify(tableInfo)) : null

  return (
    <MenuClient
      business={serializedBusiness}
      categories={serializedCategories}
      table={serializedTable}
    />
  )
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.businessId || session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const business = await prisma.business.findUnique({
      where: { id: session.businessId },
      select: {
        id: true,
        name: true,
        businessType: true,
        settings: true,
        subscription: {
          select: {
            status: true,
            plan: {
              select: {
                id: true,
                code: true,
                name: true,
                maxBranches: true,
                maxUsers: true,
              },
            },
          },
        },
      },
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Negocio no encontrado' } },
        { status: 404 }
      )
    }

    let multiBranchEnabled = (business.settings as any)?.multiBranchEnabled ?? true
    let canCustomizeColors = (business.settings as any)?.canCustomizeColors ?? true

    if ((business.settings as any)?.multiBranchEnabled === undefined) {
      try {
        const raw = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "multiBranchEnabled", "canCustomizeColors" FROM business_settings WHERE "businessId" = $1 LIMIT 1`,
          session.businessId
        )
        if (raw && raw.length > 0) {
          if (raw[0].multiBranchEnabled !== undefined) multiBranchEnabled = Boolean(raw[0].multiBranchEnabled)
          if (raw[0].canCustomizeColors !== undefined) canCustomizeColors = Boolean(raw[0].canCustomizeColors)
        }
      } catch {
        // Fallback silencioso
      }
    }

    const currentSettings = business.settings
      ? {
          ...business.settings,
          multiBranchEnabled,
          canCustomizeColors,
        }
      : {
          logoUrl: null,
          primaryColor: '#7c3aed',
          secondaryColor: '#4f46e5',
          accentColor: '#f59e0b',
          multiBranchEnabled,
          canCustomizeColors,
          recipesEnabled: true,
          tablesEnabled: true,
          waitersEnabled: true,
          kitchenEnabled: false,
          cashRegisterEnabled: true,
          inventoryEnabled: true,
          digitalMenuEnabled: true,
        }

    return NextResponse.json({
      success: true,
      data: {
        id: business.id,
        name: business.name,
        businessType: business.businessType,
        settings: currentSettings,
        subscription: business.subscription,
      },
    })
  } catch (error) {
    console.error('Error en GET /api/business/settings:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar configuración' } },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      takeawayBagItemId,
      takeawayTrayItemId,
      takeawayFoodTrayItemId,
      takeawayCutleryItemId,
      takeawayStrawItemId,
      recipesEnabled,
      inventoryEnabled,
      negativeStockEnabled,
      primaryColor,
      secondaryColor,
      accentColor,
    } = body

    const updated = await prisma.businessSetting.upsert({
      where: { businessId: session.businessId },
      update: {
        ...(takeawayBagItemId !== undefined ? { takeawayBagItemId: takeawayBagItemId || null } : {}),
        ...(takeawayTrayItemId !== undefined ? { takeawayTrayItemId: takeawayTrayItemId || null } : {}),
        ...(takeawayFoodTrayItemId !== undefined ? { takeawayFoodTrayItemId: takeawayFoodTrayItemId || null } : {}),
        ...(takeawayCutleryItemId !== undefined ? { takeawayCutleryItemId: takeawayCutleryItemId || null } : {}),
        ...(takeawayStrawItemId !== undefined ? { takeawayStrawItemId: takeawayStrawItemId || null } : {}),
        ...(recipesEnabled !== undefined ? { recipesEnabled: Boolean(recipesEnabled) } : {}),
        ...(inventoryEnabled !== undefined ? { inventoryEnabled: Boolean(inventoryEnabled) } : {}),
        ...(negativeStockEnabled !== undefined ? { negativeStockEnabled: Boolean(negativeStockEnabled) } : {}),
        ...(primaryColor !== undefined ? { primaryColor } : {}),
        ...(secondaryColor !== undefined ? { secondaryColor } : {}),
        ...(accentColor !== undefined ? { accentColor } : {}),
      },
      create: {
        businessId: session.businessId,
        takeawayBagItemId: takeawayBagItemId || null,
        takeawayTrayItemId: takeawayTrayItemId || null,
        takeawayFoodTrayItemId: takeawayFoodTrayItemId || null,
        takeawayCutleryItemId: takeawayCutleryItemId || null,
        takeawayStrawItemId: takeawayStrawItemId || null,
        recipesEnabled: recipesEnabled !== undefined ? Boolean(recipesEnabled) : true,
        inventoryEnabled: inventoryEnabled !== undefined ? Boolean(inventoryEnabled) : true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Configuración actualizada exitosamente',
    })
  } catch (error) {
    console.error('Error en PUT /api/business/settings:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar configuración' } },
      { status: 500 }
    )
  }
}

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import DashboardLayoutClient from '@/components/dashboard-layout-client'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session || session.isPlatformAdmin || !session.businessId) {
    redirect('/login')
  }

  // Restricción de roles: Mesero y Cajero no deben acceder al dashboard administrativo
  const isOwnerOrAdmin =
    session.roleCodes.includes('ADMIN') || session.roleCodes.includes('BRANCH_MANAGER')
  const hasManagementPermission =
    session.permissions.canManageSettings ||
    session.permissions.canManageUsers ||
    session.permissions.canManageCatalog ||
    session.permissions.canViewReports ||
    session.permissions.canManageInventory

  if (!isOwnerOrAdmin && !hasManagementPermission) {
    if (session.roleCodes.includes('WAITER')) {
      redirect('/comandera')
    }
    if (session.permissions.canAccessPOS || session.roleCodes.includes('CASHIER')) {
      redirect('/pos')
    }
    redirect('/login')
  }

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
    select: {
      id: true,
      name: true,
      businessType: true,
      branches: {
        where: { active: true },
        select: {
          id: true,
          name: true,
          code: true,
          bgColor: true,
          primaryColor: true,
          secondaryColor: true,
          buttonColor: true,
          logoUrl: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      subscription: {
        select: {
          plan: {
            select: { name: true },
          },
        },
      },
      settings: true,
    },
  })

  if (!business) {
    redirect('/login')
  }

  // Garantizar lectura de campos nuevos aunque el worker en memoria de Next.js esté cacheado
  let multiBranchEnabled = (business.settings as any)?.multiBranchEnabled ?? true
  let canCustomizeColors = (business.settings as any)?.canCustomizeColors ?? true

  if ((business.settings as any)?.multiBranchEnabled === undefined) {
    try {
      const rawRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "multiBranchEnabled", "canCustomizeColors" FROM business_settings WHERE "businessId" = $1 LIMIT 1`,
        session.businessId
      )
      if (rawRows && rawRows.length > 0) {
        if (rawRows[0].multiBranchEnabled !== undefined) {
          multiBranchEnabled = Boolean(rawRows[0].multiBranchEnabled)
        }
        if (rawRows[0].canCustomizeColors !== undefined) {
          canCustomizeColors = Boolean(rawRows[0].canCustomizeColors)
        }
      }
    } catch {
      // Fallback silencioso
    }
  }

  const mergedBusiness = {
    ...business,
    settings: business.settings
      ? {
          ...business.settings,
          multiBranchEnabled,
          canCustomizeColors,
        }
      : null,
  }

  return (
    <DashboardLayoutClient
      business={mergedBusiness}
      user={{
        name: session.name,
        roleCodes: session.roleCodes,
        permissions: session.permissions,
      }}
      activeBranchId={session.activeBranchId}
    >
      {children}
    </DashboardLayoutClient>
  )
}

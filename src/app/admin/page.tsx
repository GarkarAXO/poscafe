import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import AdminPanelClient, {
  SerializedBusiness,
  SerializedPlan,
} from '@/components/admin/admin-panel-client'

export default async function AdminPlatformPage() {
  const session = await getSession()

  if (!session || !session.isPlatformAdmin) {
    const isEnabled =
      process.env.ENABLE_PLATFORM_ADMIN_LOGIN === 'true' ||
      process.env.ENABLE_ADMIN_LOGIN === 'true'
    if (!isEnabled) {
      notFound()
    }
    redirect('/admin/login')
  }

  const businesses = await prisma.business.findMany({
    include: {
      settings: true,
      branches: {
        select: { id: true, name: true, code: true, maxStaff: true },
        where: { deletedAt: null },
      },
      users: {
        select: { id: true, name: true, email: true },
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
      subscription: {
        select: {
          id: true,
          planId: true,
          status: true,
          plan: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
      _count: {
        select: {
          users: true,
          products: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const plans = await prisma.plan.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      maxBranches: true,
      maxUsers: true,
    },
    orderBy: { maxBranches: 'asc' },
  })

  // Serialización segura sin objetos Decimal
  const serializedBusinesses: SerializedBusiness[] = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    businessType: b.businessType,
    email: b.email,
    ownerName: b.users[0]?.name || null,
    ownerEmail: b.users[0]?.email || b.email,
    active: b.active,
    createdAt: b.createdAt.toISOString(),
    branchesCount: b.branches.length,
    branches: b.branches.map((br) => ({
      id: br.id,
      name: br.name,
      code: br.code,
      maxStaff: br.maxStaff ?? 10,
    })),
    usersCount: b._count.users,
    productsCount: b._count.products,
    settings: b.settings
      ? {
          logoUrl: b.settings.logoUrl,
          primaryColor: b.settings.primaryColor,
          secondaryColor: b.settings.secondaryColor,
          accentColor: b.settings.accentColor,
          multiBranchEnabled: Boolean(b.settings.multiBranchEnabled),
          canCustomizeColors: Boolean(b.settings.canCustomizeColors),
          recipesEnabled: Boolean(b.settings.recipesEnabled),
          tablesEnabled: Boolean(b.settings.tablesEnabled),
          waitersEnabled: Boolean(b.settings.waitersEnabled),
          kitchenEnabled: Boolean(b.settings.kitchenEnabled),
          cashRegisterEnabled: Boolean(b.settings.cashRegisterEnabled),
          inventoryEnabled: Boolean(b.settings.inventoryEnabled),
          digitalMenuEnabled: Boolean(b.settings.digitalMenuEnabled),
        }
      : null,
    subscription: b.subscription
      ? {
          id: b.subscription.id,
          planId: b.subscription.planId,
          status: b.subscription.status,
          planName: b.subscription.plan.name,
          planCode: b.subscription.plan.code,
        }
      : null,
  }))

  const serializedPlans: SerializedPlan[] = plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    maxBranches: p.maxBranches,
    maxUsers: p.maxUsers,
  }))

  return (
    <AdminPanelClient
      initialBusinesses={serializedBusinesses}
      plans={serializedPlans}
      adminName={session.name}
    />
  )
}

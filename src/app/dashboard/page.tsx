import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import DashboardHomeClient from '@/components/dashboard-home-client'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session || !session.businessId) return null

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
    include: {
      settings: true,
      branches: { where: { active: true } },
      subscription: { include: { plan: true } },
    },
  })

  if (!business) return null

  // Serializamos a objetos planos para evitar que instancias de Prisma.Decimal
  // o tipos complejos no serializables causen errores en los Client Components de Next.js
  const serializedBusiness = JSON.parse(JSON.stringify(business))

  const activeBranch =
    serializedBusiness.branches.find((b: any) => b.id === session.activeBranchId) ||
    serializedBusiness.branches[0]

  const tableCount = activeBranch
    ? await prisma.table.count({
        where: { branchId: activeBranch.id, active: true },
      })
    : 0

  const settings = serializedBusiness.settings
  const isMultiBranch = settings?.multiBranchEnabled !== false

  return (
    <DashboardHomeClient
      sessionName={session.name}
      sessionGender={session.gender}
      business={serializedBusiness}
      activeBranch={activeBranch}
      tableCount={tableCount}
      isMultiBranch={isMultiBranch}
    />
  )
}

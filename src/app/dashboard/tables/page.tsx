import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardTablesManager from '@/components/dashboard-tables-manager'
import DashboardPageHeader from '@/components/dashboard-page-header'

export const metadata = {
  title: 'Control de Mesas | POS Café',
  description: 'Gestión de mesas, modo de servicio y asignación de meseros',
}

export default async function DashboardTablesPage() {
  const session = await getSession()
  if (!session || !session.businessId) {
    redirect('/login')
  }

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
    include: {
      settings: true,
      branches: { where: { active: true } },
    },
  })

  if (!business) {
    redirect('/login')
  }

  const activeBranch =
    business.branches.find((b: any) => b.id === session.activeBranchId) ||
    business.branches[0]

  const settings = business.settings
  const primaryColor = activeBranch?.primaryColor || settings?.primaryColor || '#C08552'

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6 w-full max-w-7xl mx-auto">
      {/* Migas de pan y retorno */}
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Panel General', href: '/dashboard' },
          { label: 'Control de Mesas' },
        ]}
        title=""
        backHref="/dashboard"
        backLabel="Volver al Panel"
      />

      {/* Gestor interactivo de mesas, áreas y meseros */}
      <DashboardTablesManager
        branchId={activeBranch.id}
        branchName={activeBranch.name}
        primaryColor={primaryColor}
      />
    </div>
  )
}

import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardTablesManager from '@/components/dashboard-tables-manager'
import Link from 'next/link'
import { ChevronRight, ArrowLeft } from 'lucide-react'

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
  const primaryColor = activeBranch?.primaryColor || settings?.primaryColor || '#7c3aed'

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6 w-full max-w-7xl mx-auto">
      {/* Migas de pan y retorno */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/dashboard" className="hover:text-slate-200 transition-colors">
            Panel General
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-200 font-medium">Control de Mesas</span>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al Panel
        </Link>
      </div>

      {/* Gestor interactivo de mesas, áreas y meseros */}
      <DashboardTablesManager
        branchId={activeBranch.id}
        branchName={activeBranch.name}
        primaryColor={primaryColor}
      />
    </div>
  )
}

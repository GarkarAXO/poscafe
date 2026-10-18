import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, LayoutGrid, QrCode, UtensilsCrossed } from 'lucide-react'
import DashboardTablesManager from '@/components/dashboard-tables-manager'

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
  const buttonColor = activeBranch?.buttonColor || '#C08552'

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* Top Navbar estandarizado con retorno al Dashboard idéntico a catalog/page.tsx */}
      <header className="border-b pl-14 sm:pl-16 lg:pl-6 pr-4 sm:pr-6 py-3.5 sm:py-4 flex items-center justify-between sticky top-0 z-30 transition-colors backdrop-blur-md bg-[#14100E]/95 border-[#2D1B15]">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            href="/dashboard"
            className="hidden lg:inline-flex p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0 text-white active:scale-95 touch-manipulation select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="hidden lg:block h-5 w-px border-l border-white/10 shrink-0"></div>

          <div className="min-w-0">
            <h1 className="font-bold text-sm sm:text-base flex items-center gap-1.5 truncate text-white">
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" style={{ color: buttonColor }} />
              <span className="inline sm:hidden">Mesas</span>
              <span className="hidden sm:inline">Control de Mesas y Meseros</span>
            </h1>
            <p className="text-[11px] sm:text-xs truncate hidden sm:block text-slate-400">
              Distribución de sala, códigos QR para mesas y modo de servicio de {activeBranch.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/comandera"
            style={{ backgroundColor: primaryColor }}
            className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:opacity-95 active:scale-95 touch-manipulation text-white"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span className="hidden sm:inline">Ir a Comandera</span>
          </Link>
          <a
            href={`/menu?branch_id=${activeBranch.id}`}
            target="_blank"
            className="px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation text-white"
            title="Abrir Menú Digital para Clientes"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Menú QR</span>
          </a>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <DashboardTablesManager
          branchId={activeBranch.id}
          branchName={activeBranch.name}
          primaryColor={primaryColor}
        />
      </main>
    </div>
  )
}

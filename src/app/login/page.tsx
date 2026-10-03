import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import LoginForm from './login-form'

export default async function LoginPage() {
  const session = await getSession()

  // Si ya inició sesión, no debe poder ver ni volver a la pantalla de login
  if (session) {
    if (session.isPlatformAdmin) {
      redirect('/admin')
    }

    const isOwnerOrAdmin =
      session.roleCodes.includes('ADMIN') || session.roleCodes.includes('BRANCH_MANAGER')
    const hasManagementPermission =
      session.permissions.canManageSettings ||
      session.permissions.canManageUsers ||
      session.permissions.canManageCatalog ||
      session.permissions.canViewReports ||
      session.permissions.canManageInventory

    if (!isOwnerOrAdmin && !hasManagementPermission) {
      // Mesero: enviar directo a su comandera
      if (session.roleCodes.includes('WAITER')) {
        redirect('/comandera')
      }
      // Cajero o personal POS: enviar directo a su terminal de cobro
      if (session.permissions.canAccessPOS || session.roleCodes.includes('CASHIER')) {
        redirect('/pos')
      }
    }

    // Dueño o usuario con permisos administrativos
    redirect('/dashboard')
  }

  return <LoginForm />
}

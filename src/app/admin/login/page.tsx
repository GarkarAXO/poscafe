import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AdminLoginForm from './admin-login-form'

export default async function AdminLoginPage() {
  const isEnabled =
    process.env.ENABLE_PLATFORM_ADMIN_LOGIN === 'true' ||
    process.env.ENABLE_ADMIN_LOGIN === 'true'

  if (!isEnabled) {
    notFound()
  }

  const session = await getSession()
  if (session && session.isPlatformAdmin) {
    redirect('/admin')
  }

  return <AdminLoginForm />
}

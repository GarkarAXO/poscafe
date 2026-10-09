import { NextResponse, NextRequest } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  await clearAuthCookie()

  const acceptHeader = req.headers.get('accept') || ''
  const contentType = req.headers.get('content-type') || ''
  const isFormPost = contentType.includes('application/x-www-form-urlencoded')
  const targetUrl = req.nextUrl.searchParams.get('to') || '/login'

  // Si proviene de navegación HTML o formulario directo en el navegador
  if (isFormPost || acceptHeader.includes('text/html')) {
    return NextResponse.redirect(new URL(targetUrl, req.url), 303)
  }

  return NextResponse.json({
    success: true,
    message: 'Sesión cerrada correctamente',
    redirect: targetUrl,
  })
}

export async function GET(req: NextRequest) {
  await clearAuthCookie()
  const targetUrl = req.nextUrl.searchParams.get('to') || '/login'
  return NextResponse.redirect(new URL(targetUrl, req.url), 303)
}

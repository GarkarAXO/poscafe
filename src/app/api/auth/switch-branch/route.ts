import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, signToken, setAuthCookie, AuthSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const { branch_id } = await request.json()
    if (!branch_id) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'ID de sucursal requerido' } },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga asignada esa sucursal
    const userBranch = await prisma.userBranch.findFirst({
      where: {
        userId: session.userId,
        branchId: branch_id,
        branch: { active: true },
      },
      include: {
        branch: true,
      },
    })

    if (!userBranch) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes acceso a esta sucursal' } },
        { status: 403 }
      )
    }

    // Re-firmar token con la nueva sucursal activa
    const updatedPayload: AuthSession = {
      ...session,
      activeBranchId: userBranch.branchId,
    }

    const token = await signToken(updatedPayload)
    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      data: {
        activeBranch: {
          id: userBranch.branch.id,
          name: userBranch.branch.name,
          code: userBranch.branch.code,
        },
      },
    })
  } catch (error) {
    console.error('Error en POST /api/auth/switch-branch:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' } },
      { status: 500 }
    )
  }
}

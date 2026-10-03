import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { getSession, mergePermissions, UserPermissions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { pin, requiredPermission } = body

    if (!pin || String(pin).trim().length !== 4) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PIN', message: 'Debes ingresar un PIN de 4 dígitos' } },
        { status: 400 }
      )
    }

    if (!requiredPermission) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Se requiere especificar la acción a autorizar' } },
        { status: 400 }
      )
    }

    // Buscar usuarios activos del negocio con PIN configurado
    const candidateUsers = await prisma.user.findMany({
      where: {
        businessId: session.businessId,
        active: true,
        deletedAt: null,
        pinHash: { not: null },
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    let authorizer = null
    for (const candidate of candidateUsers) {
      if (candidate.pinHash && (await bcrypt.compare(String(pin).trim(), candidate.pinHash))) {
        authorizer = candidate
        break
      }
    }

    if (!authorizer) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PIN', message: 'PIN de autorización no reconocido' } },
        { status: 401 }
      )
    }

    // Verificar si el autorizador cuenta con el permiso requerido
    const merged = mergePermissions(authorizer.roles)
    const hasPerm = Boolean(merged[requiredPermission as keyof UserPermissions])

    if (!hasPerm) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `${authorizer.name} no cuenta con el permiso para autorizar esta acción`,
          },
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: authorizer.id,
        name: authorizer.name,
        role: authorizer.roles[0]?.role.name || 'Supervisor',
      },
      message: `Autorizado exitosamente por ${authorizer.name}`,
    })
  } catch (error) {
    console.error('Error en POST /api/auth/authorize-action:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al validar autorización' } },
      { status: 500 }
    )
  }
}

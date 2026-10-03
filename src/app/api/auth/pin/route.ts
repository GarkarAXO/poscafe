import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { mergePermissions, signToken, setAuthCookie, AuthSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pin, user_id, branch_id } = body

    if (!pin) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'El PIN es requerido' } },
        { status: 400 }
      )
    }

    let user = null

    // Caso A: Se especifica user_id
    if (user_id) {
      user = await prisma.user.findFirst({
        where: {
          id: user_id,
          active: true,
          ...(branch_id ? { userBranches: { some: { branchId: branch_id } } } : {}),
        },
        include: {
          business: { select: { id: true, name: true, businessType: true, active: true } },
          userBranches: { include: { branch: true } },
          roles: { include: { role: true } },
        },
      })

      if (!user || !user.pinHash) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AUTH_FAILED',
              message: branch_id
                ? 'El usuario no está asignado a esta sucursal o no tiene PIN'
                : 'PIN o usuario no válido',
            },
          },
          { status: 401 }
        )
      }

      const pinValid = await bcrypt.compare(pin, user.pinHash)
      if (!pinValid) {
        return NextResponse.json(
          { success: false, error: { code: 'AUTH_FAILED', message: 'PIN incorrecto' } },
          { status: 401 }
        )
      }
    }
    // Caso B: Búsqueda por PIN (filtrado por branch_id si se proporciona, o búsqueda general de usuario)
    else {
      const candidates = await prisma.user.findMany({
        where: {
          active: true,
          pinHash: { not: null },
          ...(branch_id ? { userBranches: { some: { branchId: branch_id } } } : {}),
        },
        include: {
          business: { select: { id: true, name: true, businessType: true, active: true } },
          userBranches: { include: { branch: true } },
          roles: { include: { role: true } },
        },
      })

      for (const candidate of candidates) {
        if (candidate.pinHash && (await bcrypt.compare(pin, candidate.pinHash))) {
          user = candidate
          break
        }
      }

      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AUTH_FAILED',
              message: branch_id
                ? 'PIN no reconocido en esta sucursal'
                : 'PIN incorrecto o no registrado',
            },
          },
          { status: 401 }
        )
      }
    }

    // Determinar sucursal activa
    const selectedBranchId = branch_id || user.userBranches.find((ub) => ub.isDefault)?.branchId || user.userBranches[0]?.branchId

    const permissions = mergePermissions(user.roles)
    const roleCodes = user.roles.map((r) => r.role.code)

    const sessionPayload: AuthSession = {
      userId: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      isPlatformAdmin: false,
      businessId: user.businessId,
      activeBranchId: selectedBranchId,
      roleCodes,
      permissions,
    }

    const token = await signToken(sessionPayload)
    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          businessId: user.businessId,
          activeBranchId: selectedBranchId,
          roleCodes,
          permissions,
        },
      },
    })
  } catch (error) {
    console.error('Error en POST /api/auth/pin:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const { id } = await params

    const branch = await prisma.branch.findFirst({
      where: {
        id,
        businessId: session.businessId,
        deletedAt: null,
      },
      include: {
        warehouses: true,
        cashRegisters: true,
        areas: { include: { tables: true } },
        userBranches: { include: { user: { select: { id: true, name: true, email: true, username: true } } } },
      },
    })

    if (!branch) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sucursal no encontrada' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: branch })
  } catch (error) {
    console.error('Error en GET /api/branches/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener sucursal' } },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    if (!session.permissions.canManageSettings && !session.roleCodes.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Permisos insuficientes' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      phone,
      email,
      addressLine1,
      city,
      state,
      postalCode,
      active,
      logoUrl,
      primaryColor,
      secondaryColor,
      buttonColor,
      bgColor,
    } = body

    const existing = await prisma.branch.findFirst({
      where: { id, businessId: session.businessId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sucursal no encontrada' } },
        { status: 404 }
      )
    }

    const hasColorChanges =
      primaryColor !== undefined ||
      secondaryColor !== undefined ||
      buttonColor !== undefined ||
      bgColor !== undefined ||
      logoUrl !== undefined

    if (hasColorChanges) {
      const biz = await prisma.business.findUnique({
        where: { id: session.businessId },
        include: { settings: true },
      })
      if (biz?.settings?.canCustomizeColors === false) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message:
                'La personalización de colores por sucursal no está permitida en este negocio. La identidad visual es gestionada centralmente por el administrador.',
            },
          },
          { status: 403 }
        )
      }
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(addressLine1 !== undefined && { addressLine1: addressLine1?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(state !== undefined && { state: state?.trim() || null }),
        ...(postalCode !== undefined && { postalCode: postalCode?.trim() || null }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl?.trim() || null }),
        ...(primaryColor !== undefined && { primaryColor: primaryColor?.trim() || null }),
        ...(secondaryColor !== undefined && { secondaryColor: secondaryColor?.trim() || null }),
        ...(buttonColor !== undefined && { buttonColor: buttonColor?.trim() || null }),
        ...(bgColor !== undefined && { bgColor: bgColor?.trim() || null }),
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Sucursal actualizada correctamente',
    })
  } catch (error) {
    console.error('Error en PUT /api/branches/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar sucursal' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    if (!session.permissions.canManageSettings && !session.roleCodes.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Permisos insuficientes' } },
        { status: 403 }
      )
    }

    const { id } = await params

    const existing = await prisma.branch.findFirst({
      where: { id, businessId: session.businessId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sucursal no encontrada' } },
        { status: 404 }
      )
    }

    // Soft delete
    await prisma.branch.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Sucursal desactivada y archivada correctamente',
    })
  } catch (error) {
    console.error('Error en DELETE /api/branches/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar sucursal' } },
      { status: 500 }
    )
  }
}

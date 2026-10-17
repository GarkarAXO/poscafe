import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const hasPermission =
      session.isPlatformAdmin ||
      session.roleCodes.includes('ADMIN') ||
      session.roleCodes.includes('SUPERADMIN') ||
      session.permissions?.canManageKitchen

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar áreas de cocina' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const station = await prisma.kitchenStation.findUnique({
      where: { id },
    })

    if (!station || station.businessId !== session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Área de cocina no encontrada' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, code, description, color, icon, sortOrder, active, productIds, userIds } = body

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (color !== undefined) updateData.color = color
    if (icon !== undefined) updateData.icon = icon
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder) || 0
    if (active !== undefined) updateData.active = Boolean(active)

    if (code) {
      const normalizedCode = code
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]/g, '_')
        .slice(0, 30)

      const duplicate = await prisma.kitchenStation.findFirst({
        where: {
          businessId: session.businessId,
          code: normalizedCode,
          id: { not: id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: { code: 'DUPLICATE', message: 'Ya existe otra área con este código' } },
          { status: 400 }
        )
      }

      updateData.code = normalizedCode
    }

    const updated = await prisma.$transaction(async (tx) => {
      const st = await tx.kitchenStation.update({
        where: { id },
        data: updateData,
      })

      // Asignar productos si se proporcionó lista
      if (Array.isArray(productIds)) {
        // Desvincular productos que ya no estén
        await tx.product.updateMany({
          where: {
            businessId: session.businessId,
            kitchenStationId: id,
            id: { notIn: productIds },
          },
          data: {
            kitchenStationId: null,
          },
        })
        // Vincular los nuevos
        if (productIds.length > 0) {
          await tx.product.updateMany({
            where: {
              businessId: session.businessId,
              id: { in: productIds },
            },
            data: {
              kitchenStationId: id,
            },
          })
        }
      }

      // Asignar usuarios si se proporcionó lista
      if (Array.isArray(userIds)) {
        await tx.userKitchenStation.deleteMany({
          where: { stationId: id },
        })
        if (userIds.length > 0) {
          await tx.userKitchenStation.createMany({
            data: userIds.map((uId: string) => ({
              userId: uId,
              stationId: id,
            })),
            skipDuplicates: true,
          })
        }
      }

      return st
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Área de cocina actualizada correctamente',
    })
  } catch (error) {
    console.error('Error en PUT /api/kitchen-stations/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar área de cocina' } },
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
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const hasPermission =
      session.isPlatformAdmin ||
      session.roleCodes.includes('ADMIN') ||
      session.roleCodes.includes('SUPERADMIN') ||
      session.permissions?.canManageKitchen

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar áreas de cocina' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const station = await prisma.kitchenStation.findUnique({
      where: { id },
    })

    if (!station || station.businessId !== session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Área de cocina no encontrada' } },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Desvincular productos
      await tx.product.updateMany({
        where: { kitchenStationId: id },
        data: { kitchenStationId: null },
      })

      // Eliminar asignaciones de usuarios
      await tx.userKitchenStation.deleteMany({
        where: { stationId: id },
      })

      // Eliminar estación
      await tx.kitchenStation.delete({
        where: { id },
      })

      await tx.auditLog.create({
        data: {
          businessId: station.businessId,
          userId: session.userId,
          action: 'KITCHEN_STATION_DELETE',
          entityType: 'KitchenStation',
          entityId: id,
          payload: { name: station.name, code: station.code },
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `El área de cocina "${station.name}" fue eliminada exitosamente`,
    })
  } catch (error) {
    console.error('Error en DELETE /api/kitchen-stations/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar área de cocina' } },
      { status: 500 }
    )
  }
}

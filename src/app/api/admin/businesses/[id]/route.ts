import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso restringido a Super Administradores' } },
        { status: 401 }
      )
    }

    const { id: businessId } = await params
    const body = await request.json()
    const {
      name,
      businessType,
      active,
      planId,
      subscriptionStatus,
      settings, // Objeto con logoUrl, primaryColor, secondaryColor, accentColor, multiBranchEnabled, canCustomizeColors, recipesEnabled, tablesEnabled, kitchenEnabled, etc.
      newOwnerPassword,
    } = body

    if (newOwnerPassword !== undefined && newOwnerPassword !== null && newOwnerPassword.trim() !== '') {
      if (newOwnerPassword.trim().length < 6) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_PASSWORD', message: 'La nueva contraseña debe tener al menos 6 caracteres' } },
          { status: 400 }
        )
      }
    }

    const existingBiz = await prisma.business.findUnique({
      where: { id: businessId },
      include: { settings: true, subscription: true },
    })

    if (!existingBiz) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Negocio no encontrado' } },
        { status: 404 }
      )
    }

    // Actualizar negocio, suscripción y configuración en una sola transacción
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Actualizar datos base del negocio
      const biz = await tx.business.update({
        where: { id: businessId },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(businessType !== undefined && { businessType }),
          ...(active !== undefined && { active: Boolean(active) }),
        },
      })

      // 2. Ajustar plan de suscripción
      let effectivePlanId = planId
      const isMultiBranchDisabled = settings?.multiBranchEnabled === false

      // Si se desactiva multi-sucursal desde el super usuario:
      // Modificar automáticamente su plan a Plan Básico (1 sucursal)
      if (isMultiBranchDisabled) {
        const basicPlan = await tx.plan.findFirst({
          where: { code: 'BASIC', active: true },
        })
        if (basicPlan) {
          if (!effectivePlanId) {
            effectivePlanId = basicPlan.id
          } else {
            const requestedPlan = await tx.plan.findUnique({ where: { id: effectivePlanId } })
            if (requestedPlan && requestedPlan.maxBranches > 1) {
              effectivePlanId = basicPlan.id
            }
          }
        }
      }

      if (effectivePlanId || subscriptionStatus) {
        if (existingBiz.subscription) {
          await tx.subscription.update({
            where: { id: existingBiz.subscription.id },
            data: {
              ...(effectivePlanId && { planId: effectivePlanId }),
              ...(subscriptionStatus && { status: subscriptionStatus }),
            },
          })
        } else if (effectivePlanId) {
          await tx.subscription.create({
            data: {
              businessId,
              planId: effectivePlanId,
              status: subscriptionStatus || 'ACTIVE',
            },
          })
        }
      }

      // Si se desactiva multi-sucursal:
      // Mantener solo 1 sucursal activa y desactivar (active: false) todas las demás para que desaparezca la multisucursal
      if (isMultiBranchDisabled) {
        const branches = await tx.branch.findMany({
          where: { businessId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
        })

        if (branches.length > 1) {
          const [primaryBranch, ...otherBranches] = branches
          // Mantener activa únicamente la sucursal matriz/primera
          await tx.branch.update({
            where: { id: primaryBranch.id },
            data: { active: true },
          })
          // Las sucursales secundarias se mantienen inactivas (no se borran, quedan active = false)
          await tx.branch.updateMany({
            where: {
              id: { in: otherBranches.map((b) => b.id) },
            },
            data: { active: false },
          })
        }
      }

      // 3. Actualizar configuraciones y módulos SaaS (branding, multi-sucursal, recetario, colores, etc.)
      if (settings) {
        await tx.businessSetting.upsert({
          where: { businessId },
          update: {
            ...(settings.logoUrl !== undefined && { logoUrl: settings.logoUrl?.trim() || null }),
            ...(settings.primaryColor !== undefined && { primaryColor: settings.primaryColor }),
            ...(settings.secondaryColor !== undefined && { secondaryColor: settings.secondaryColor }),
            ...(settings.accentColor !== undefined && { accentColor: settings.accentColor }),
            ...(settings.multiBranchEnabled !== undefined && { multiBranchEnabled: Boolean(settings.multiBranchEnabled) }),
            ...(settings.canCustomizeColors !== undefined && { canCustomizeColors: Boolean(settings.canCustomizeColors) }),
            ...(settings.recipesEnabled !== undefined && { recipesEnabled: Boolean(settings.recipesEnabled) }),
            ...(settings.inventoryEnabled !== undefined && { inventoryEnabled: Boolean(settings.inventoryEnabled) }),
            ...(settings.tablesEnabled !== undefined && { tablesEnabled: Boolean(settings.tablesEnabled) }),
            ...(settings.waitersEnabled !== undefined && { waitersEnabled: Boolean(settings.waitersEnabled) }),
            ...(settings.kitchenEnabled !== undefined && { kitchenEnabled: Boolean(settings.kitchenEnabled) }),
            ...(settings.cashRegisterEnabled !== undefined && { cashRegisterEnabled: Boolean(settings.cashRegisterEnabled) }),
            ...(settings.digitalMenuEnabled !== undefined && { digitalMenuEnabled: Boolean(settings.digitalMenuEnabled) }),
          },
          create: {
            businessId,
            logoUrl: settings.logoUrl?.trim() || null,
            primaryColor: settings.primaryColor || '#7c3aed',
            secondaryColor: settings.secondaryColor || '#4f46e5',
            accentColor: settings.accentColor || '#f59e0b',
            multiBranchEnabled: settings.multiBranchEnabled !== undefined ? Boolean(settings.multiBranchEnabled) : true,
            canCustomizeColors: settings.canCustomizeColors !== undefined ? Boolean(settings.canCustomizeColors) : true,
            recipesEnabled: settings.recipesEnabled !== undefined ? Boolean(settings.recipesEnabled) : true,
            inventoryEnabled: settings.inventoryEnabled !== undefined ? Boolean(settings.inventoryEnabled) : true,
            tablesEnabled: settings.tablesEnabled !== undefined ? Boolean(settings.tablesEnabled) : true,
            waitersEnabled: settings.waitersEnabled !== undefined ? Boolean(settings.waitersEnabled) : true,
            kitchenEnabled: settings.kitchenEnabled !== undefined ? Boolean(settings.kitchenEnabled) : false,
            cashRegisterEnabled: settings.cashRegisterEnabled !== undefined ? Boolean(settings.cashRegisterEnabled) : true,
            digitalMenuEnabled: settings.digitalMenuEnabled !== undefined ? Boolean(settings.digitalMenuEnabled) : true,
          },
        })
      }

      // 4. Actualizar contraseña del dueño si se proporcionó una nueva
      if (newOwnerPassword && newOwnerPassword.trim().length >= 6) {
        const passwordHash = await bcrypt.hash(newOwnerPassword.trim(), 10)
        const ownerUser = await tx.user.findFirst({
          where: {
            businessId,
            OR: [
              { email: existingBiz.email },
              { roles: { some: { role: { code: 'ADMIN' } } } },
            ],
          },
          orderBy: { createdAt: 'asc' },
        })

        if (ownerUser) {
          await tx.user.update({
            where: { id: ownerUser.id },
            data: { passwordHash },
          })
        }
      }

      return biz
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Configuración del negocio actualizada exitosamente',
    })
  } catch (error) {
    console.error('Error en PUT /api/admin/businesses/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al actualizar configuración del negocio' } },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/businesses/[id] - Eliminar negocio y todos sus datos
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso restringido a Super Administradores' } },
        { status: 401 }
      )
    }

    const { id: businessId } = await params

    const existingBiz = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        branches: { select: { id: true } },
      },
    })

    if (!existingBiz) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Negocio no encontrado' } },
        { status: 404 }
      )
    }

    await prisma.$transaction(
      async (tx) => {
        const branchIds = existingBiz.branches.map((b) => b.id)

        // 0. Eliminar logs de auditoría vinculados al negocio
        await tx.auditLog.deleteMany({
          where: { businessId },
        })

        if (branchIds.length > 0) {
          // Compras e items de compras de las sucursales
          await tx.purchaseItem.deleteMany({
            where: { purchase: { branchId: { in: branchIds } } },
          })
          await tx.purchase.deleteMany({
            where: { branchId: { in: branchIds } },
          })

          // Gastos de las sucursales
          await tx.expense.deleteMany({
            where: { branchId: { in: branchIds } },
          })

          // Eliminar pagos, items de orden y órdenes de las sucursales
          const orders = await tx.order.findMany({
            where: { branchId: { in: branchIds } },
            select: { id: true },
          })
          const orderIds = orders.map((o) => o.id)

          if (orderIds.length > 0) {
            await tx.orderItemModifier.deleteMany({
              where: { orderItem: { orderId: { in: orderIds } } },
            })
            await tx.orderItem.deleteMany({
              where: { orderId: { in: orderIds } },
            })
            await tx.payment.deleteMany({
              where: { orderId: { in: orderIds } },
            })
            await tx.orderDiscount.deleteMany({
              where: { orderId: { in: orderIds } },
            })
            await tx.orderCourtesy.deleteMany({
              where: { orderId: { in: orderIds } },
            })
            await tx.orderCancellation.deleteMany({
              where: { orderId: { in: orderIds } },
            })
            await tx.order.deleteMany({
              where: { id: { in: orderIds } },
            })
          }

          // Movimientos de efectivo y sesiones
          await tx.cashMovement.deleteMany({
            where: { cashSession: { cashRegister: { branchId: { in: branchIds } } } },
          })
          await tx.cashSession.deleteMany({
            where: { cashRegister: { branchId: { in: branchIds } } },
          })
          await tx.cashRegister.deleteMany({
            where: { branchId: { in: branchIds } },
          })

          // Movimientos de stock y stock por almacén
          await tx.stockMovement.deleteMany({
            where: {
              OR: [
                { sourceWarehouse: { branchId: { in: branchIds } } },
                { targetWarehouse: { branchId: { in: branchIds } } },
              ],
            },
          })
          await tx.warehouseStock.deleteMany({
            where: { warehouse: { branchId: { in: branchIds } } },
          })
          await tx.warehouse.deleteMany({
            where: { branchId: { in: branchIds } },
          })

          // Mesas y Áreas
          await tx.table.deleteMany({
            where: { branchId: { in: branchIds } },
          })
          await tx.area.deleteMany({
            where: { branchId: { in: branchIds } },
          })

          // Asignaciones de usuarios a sucursales
          await tx.userBranch.deleteMany({
            where: { branchId: { in: branchIds } },
          })

          // Sucursales
          await tx.branch.deleteMany({
            where: { id: { in: branchIds } },
          })
        }

        // Proveedores y categorías de gastos
        await tx.supplier.deleteMany({
          where: { businessId },
        })
        await tx.expenseCategory.deleteMany({
          where: { businessId },
        })

        // 2. Eliminar recetas, productos, categorías e insumos del negocio
        await tx.recipeItem.deleteMany({
          where: { recipe: { productVariant: { product: { businessId } } } },
        })
        await tx.recipe.deleteMany({
          where: { productVariant: { product: { businessId } } },
        })
        await tx.productVariant.deleteMany({
          where: { product: { businessId } },
        })
        await tx.productModifierGroup.deleteMany({
          where: { product: { businessId } },
        })
        await tx.product.deleteMany({
          where: { businessId },
        })
        await tx.modifier.deleteMany({
          where: { modifierGroup: { businessId } },
        })
        await tx.modifierGroup.deleteMany({
          where: { businessId },
        })
        await tx.category.deleteMany({
          where: { businessId },
        })
        await tx.inventoryPresentation.deleteMany({
          where: { inventoryItem: { businessId } },
        })
        await tx.inventoryItem.deleteMany({
          where: { businessId },
        })

        // Integraciones API y Webhooks
        await tx.tenantApiKey.deleteMany({
          where: { businessId },
        })
        await tx.webhookSubscription.deleteMany({
          where: { businessId },
        })

        // 3. Eliminar usuarios, roles, settings y suscripción
        await tx.userRole.deleteMany({
          where: { user: { businessId } },
        })
        await tx.user.deleteMany({
          where: { businessId },
        })
        await tx.role.deleteMany({
          where: { businessId },
        })
        await tx.businessSetting.deleteMany({
          where: { businessId },
        })
        await tx.subscription.deleteMany({
          where: { businessId },
        })

        // 4. Eliminar el Negocio final
        await tx.business.delete({
          where: { id: businessId },
        })
      },
      {
        maxWait: 20000,
        timeout: 120000,
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Negocio y todos sus datos asociados fueron eliminados correctamente',
    })
  } catch (error) {
    console.error('Error en DELETE /api/admin/businesses/[id]:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar el negocio' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// GET /api/admin/businesses - Listar todos los negocios con sus módulos y branding
export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso restringido a Super Administradores' } },
        { status: 401 }
      )
    }

    const businesses = await prisma.business.findMany({
      include: {
        settings: true,
        branches: {
          select: { id: true, name: true, code: true, active: true },
        },
        users: {
          select: { id: true, name: true, email: true },
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
        subscription: {
          include: {
            plan: {
              select: {
                id: true,
                code: true,
                name: true,
                maxBranches: true,
                maxUsers: true,
              },
            },
          },
        },
        _count: {
          select: { users: true, products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const plans = await prisma.plan.findMany({
      select: { id: true, code: true, name: true, maxBranches: true },
      orderBy: { maxBranches: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        businesses,
        plans,
      },
    })
  } catch (error) {
    console.error('Error en GET /api/admin/businesses:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar negocios' } },
      { status: 500 }
    )
  }
}

// POST /api/admin/businesses - Crear nuevo Tenant desde Super Admin
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Acceso restringido a Super Administradores' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      businessType = 'CAFE',
      planId,
      ownerName,
      ownerEmail,
      ownerPassword,
      primaryColor = '#7c3aed',
      secondaryColor = '#4f46e5',
      accentColor = '#f59e0b',
      multiBranchEnabled,
      canCustomizeColors = true,
      recipesEnabled = true,
      tablesEnabled = true,
      waitersEnabled = true,
      kitchenEnabled = false,
      inventoryEnabled = true,
      cashRegisterEnabled = true,
      digitalMenuEnabled = true,
    } = body

    if (!name || !ownerEmail || !ownerPassword || !planId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Nombre, plan, correo y contraseña del dueño son requeridos' } },
        { status: 400 }
      )
    }

    if (ownerPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'La contraseña inicial del dueño debe contener al menos 6 caracteres' } },
        { status: 400 }
      )
    }

    const targetPlan = await prisma.plan.findUnique({ where: { id: planId } })
    const isMultiBranch = multiBranchEnabled !== undefined
      ? Boolean(multiBranchEnabled)
      : (targetPlan ? targetPlan.maxBranches > 1 : false)

    const passwordHash = await bcrypt.hash(ownerPassword, 10)

    const newBusiness = await prisma.$transaction(async (tx) => {
      // 1. Crear Negocio
      const biz = await tx.business.create({
        data: {
          name: name.trim(),
          email: ownerEmail.trim(),
          businessType,
          subscription: {
            create: {
              planId,
              status: 'ACTIVE',
            },
          },
        },
      })

      // 1.1 Crear settings con todos los módulos
      await tx.businessSetting.create({
        data: {
          businessId: biz.id,
          primaryColor,
          secondaryColor,
          accentColor,
          multiBranchEnabled: isMultiBranch,
          canCustomizeColors: isMultiBranch ? Boolean(canCustomizeColors) : false,
          recipesEnabled: Boolean(recipesEnabled),
          tablesEnabled: Boolean(tablesEnabled),
          waitersEnabled: Boolean(waitersEnabled),
          kitchenEnabled: Boolean(kitchenEnabled),
          inventoryEnabled: Boolean(inventoryEnabled),
          cashRegisterEnabled: Boolean(cashRegisterEnabled),
          digitalMenuEnabled: Boolean(digitalMenuEnabled),
        },
      })

      // 2. Rol ADMIN de negocio
      const adminRole = await tx.role.findFirst({
        where: { isSystem: true, code: 'ADMIN' },
      })

      // 3. Sucursal inicial
      const branch = await tx.branch.create({
        data: {
          businessId: biz.id,
          name: 'Sucursal Matriz',
          code: 'MATRIZ',
          primaryColor,
          secondaryColor,
          buttonColor: accentColor,
        },
      })

      // 4. Almacén y Caja
      await tx.warehouse.create({
        data: {
          branchId: branch.id,
          name: 'Almacén General',
          code: 'ALM-MATRIZ',
          isDefault: true,
        },
      })

      await tx.cashRegister.create({
        data: {
          branchId: branch.id,
          name: 'Caja Principal 1',
          code: 'CAJA-MATRIZ-1',
        },
      })

      // 5. Usuario Dueño
      const user = await tx.user.create({
        data: {
          businessId: biz.id,
          name: ownerName || 'Propietario',
          email: ownerEmail.trim(),
          passwordHash,
          roles: adminRole ? { create: [{ roleId: adminRole.id }] } : undefined,
          userBranches: {
            create: [{ branchId: branch.id, isDefault: true }],
          },
        },
      })

      return biz
    }, {
      maxWait: 20000,
      timeout: 60000,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...newBusiness,
        credentials: {
          email: ownerEmail.trim(),
          password: ownerPassword,
        },
      },
      message: 'Nuevo negocio creado exitosamente en la plataforma',
    })
  } catch (error) {
    console.error('Error en POST /api/admin/businesses:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar el nuevo negocio' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/branches - Lista todas las sucursales del negocio en sesión
export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.businessId || session.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const business = await prisma.business.findUnique({
      where: { id: session.businessId },
      include: {
        settings: true,
        subscription: { include: { plan: true } },
      },
    })

    const isMultiBranchEnabled = business?.settings?.multiBranchEnabled ?? true

    const branches = await prisma.branch.findMany({
      where: {
        businessId: session.businessId,
        deletedAt: null,
        // Si no tiene multisucursal, solo devolver la sucursal activa
        ...(!isMultiBranchEnabled ? { active: true } : {}),
      },
      include: {
        warehouses: { where: { active: true } },
        cashRegisters: { where: { active: true } },
        _count: {
          select: {
            tables: { where: { deletedAt: null } },
            userBranches: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        branches,
        planLimit: {
          maxBranches: business?.subscription?.plan.maxBranches || 1,
          currentBranches: branches.length,
          planName: business?.subscription?.plan.name || 'Básico',
        },
        settings: {
          multiBranchEnabled: business?.settings?.multiBranchEnabled ?? true,
          canCustomizeColors: business?.settings?.canCustomizeColors ?? true,
        },
      },
    })
  } catch (error) {
    console.error('Error en GET /api/branches:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener sucursales' } },
      { status: 500 }
    )
  }
}

// POST /api/branches - Crea una nueva sucursal con validación de límites de plan SaaS
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId || session.isPlatformAdmin) {
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

    const body = await request.json()
    const {
      name,
      code,
      phone,
      email,
      addressLine1,
      city,
      state,
      postalCode,
      countryCode,
      logoUrl,
      primaryColor,
      secondaryColor,
      buttonColor,
      bgColor,
    } = body

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Nombre y código son obligatorios' } },
        { status: 400 }
      )
    }

    const cleanCode = code.trim().toUpperCase()

    // 1. Validar si la funcionalidad multisucursal está habilitada y el límite del plan
    const business = await prisma.business.findUnique({
      where: { id: session.businessId },
      include: {
        settings: true,
        branches: { where: { deletedAt: null } },
        subscription: { include: { plan: true } },
      },
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Negocio no encontrado' } },
        { status: 404 }
      )
    }

    if (business.settings?.multiBranchEnabled === false && business.branches.length >= 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FEATURE_DISABLED',
            message: 'La función multisucursal no está habilitada para tu cuenta. Contacta al administrador para activar este módulo.',
          },
        },
        { status: 403 }
      )
    }

    const maxBranches = business.subscription?.plan.maxBranches || 1
    if (business.branches.length >= maxBranches) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PLAN_LIMIT_REACHED',
            message: `Has alcanzado el límite de ${maxBranches} sucursales de tu plan ${business.subscription?.plan.name}. Actualiza tu suscripción para dar de alta más sucursales.`,
          },
        },
        { status: 403 }
      )
    }

    // 2. Validar que el código no exista en este negocio
    const existingCode = await prisma.branch.findFirst({
      where: {
        businessId: session.businessId,
        code: cleanCode,
        deletedAt: null,
      },
    })

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_CODE', message: `El código "${cleanCode}" ya está en uso en otra sucursal` } },
        { status: 409 }
      )
    }

    // 3. Crear la sucursal y automáticamente su Almacén Principal y Caja por defecto
    const newBranch = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          businessId: session.businessId!,
          name: name.trim(),
          code: cleanCode,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          addressLine1: addressLine1?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          postalCode: postalCode?.trim() || null,
          countryCode: countryCode?.trim().toUpperCase() || 'MX',
          active: true,
          logoUrl: logoUrl?.trim() || null,
          primaryColor: primaryColor?.trim() || '#7c3aed',
          secondaryColor: secondaryColor?.trim() || '#4f46e5',
          buttonColor: buttonColor?.trim() || '#f59e0b',
          bgColor: bgColor?.trim() || '#020617',
        },
      })

      // Almacén por defecto de la sucursal
      await tx.warehouse.create({
        data: {
          branchId: branch.id,
          name: `Almacén Principal - ${branch.name}`,
          code: `ALM-${cleanCode}`,
          isDefault: true,
          active: true,
        },
      })

      // Caja registradora por defecto de la sucursal
      await tx.cashRegister.create({
        data: {
          branchId: branch.id,
          name: 'Caja Principal 1',
          code: `CAJA-${cleanCode}-1`,
          active: true,
        },
      })

      // Asignar al usuario creador acceso a la nueva sucursal
      await tx.userBranch.upsert({
        where: {
          userId_branchId: {
            userId: session.userId,
            branchId: branch.id,
          },
        },
        update: {},
        create: {
          userId: session.userId,
          branchId: branch.id,
          isDefault: false,
        },
      })

      return branch
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      data: newBranch,
      message: 'Sucursal creada exitosamente con almacén y caja principal iniciales',
    })
  } catch (error) {
    console.error('Error en POST /api/branches:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error interno al crear sucursal' } },
      { status: 500 }
    )
  }
}

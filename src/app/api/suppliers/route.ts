import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/suppliers - Listar proveedores del negocio
export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sesión inválida' } },
        { status: 401 }
      )
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        businessId: session.businessId,
      },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: suppliers,
    })
  } catch (error) {
    console.error('Error en GET /api/suppliers:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar proveedores' } },
      { status: 500 }
    )
  }
}

// POST /api/suppliers - Crear un nuevo proveedor
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado o sesión inválida' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, contact, phone, email, taxId } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_NAME', message: 'El nombre comercial del proveedor es obligatorio' } },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.create({
      data: {
        businessId: session.businessId,
        name: name.trim(),
        contact: contact?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        taxId: taxId?.trim() || null,
      },
    })

    await prisma.auditLog.create({
      data: {
        businessId: session.businessId,
        userId: session.userId,
        action: 'SUPPLIER_CREATED',
        entityType: 'Supplier',
        entityId: supplier.id,
        payload: { name: supplier.name, contact: supplier.contact },
      },
    })

    return NextResponse.json({
      success: true,
      data: supplier,
      message: 'Proveedor registrado exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/suppliers:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar proveedor' } },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')
    const categoryId = searchParams.get('categoryId')
    const range = searchParams.get('range') || 'month' // today, 7days, month, all
    const search = searchParams.get('search') || ''

    let startDate: Date | undefined
    const now = new Date()

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    } else if (range === '7days') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0)
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    }

    const branchFilter = branchId ? { id: branchId } : {}
    const categoryFilter = categoryId ? { categoryId } : {}

    const expenses = await prisma.expense.findMany({
      where: {
        branch: {
          businessId: session.businessId,
          ...branchFilter,
        },
        ...categoryFilter,
        ...(startDate ? { expensedAt: { gte: startDate } } : {}),
        ...(search.trim()
          ? {
              OR: [
                { notes: { contains: search.trim(), mode: 'insensitive' } },
                { category: { name: { contains: search.trim(), mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { expensedAt: 'desc' },
    })

    // Calcular KPIs
    let totalExpenses = 0
    const byCategory: Record<string, { name: string; total: number; count: number }> = {}

    for (const exp of expenses) {
      const amt = Number(exp.amount)
      totalExpenses += amt

      const catName = exp.category.name
      if (!byCategory[catName]) {
        byCategory[catName] = { name: catName, total: 0, count: 0 }
      }
      byCategory[catName].total += amt
      byCategory[catName].count += 1
    }

    const topCategories = Object.values(byCategory).sort((a, b) => b.total - a.total)
    const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0

    return NextResponse.json({
      success: true,
      data: {
        expenses: expenses.map((e) => ({
          id: e.id,
          branchId: e.branchId,
          branchName: e.branch.name,
          branchCode: e.branch.code,
          categoryId: e.categoryId,
          categoryName: e.category.name,
          amount: Number(e.amount),
          notes: e.notes,
          receiptUrl: e.receiptUrl,
          expensedAt: e.expensedAt,
          createdAt: e.createdAt,
        })),
        metrics: {
          totalExpenses,
          count: expenses.length,
          averageExpense,
          topCategory: topCategories[0] || null,
          byCategory: topCategories,
        },
      },
    })
  } catch (error) {
    console.error('Error en GET /api/expenses:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al consultar gastos operativos' } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const isOwnerOrAdmin =
      session.roleCodes.includes('ADMIN') ||
      session.roleCodes.includes('SUPERADMIN') ||
      session.roleCodes.includes('BRANCH_MANAGER')

    if (!isOwnerOrAdmin && !session.permissions?.canManageExpenses) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Sin permisos para registrar gastos' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { branchId, categoryId, amount, notes, receiptUrl, expensedAt } = body

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'La sucursal es obligatoria' } },
        { status: 400 }
      )
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'La categoría de gasto es obligatoria' } },
        { status: 400 }
      )
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'El importe debe ser un número mayor a cero' } },
        { status: 400 }
      )
    }

    // Verificar que la sucursal pertenece al negocio
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, businessId: session.businessId },
    })

    if (!branch) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sucursal no encontrada' } },
        { status: 404 }
      )
    }

    // Verificar que la categoría pertenece al negocio
    const category = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, businessId: session.businessId },
    })

    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Categoría no encontrada' } },
        { status: 404 }
      )
    }

    const expenseDate = expensedAt ? new Date(expensedAt) : new Date()

    const expense = await prisma.expense.create({
      data: {
        branchId,
        categoryId,
        amount: numericAmount,
        notes: notes ? String(notes).trim() : null,
        receiptUrl: receiptUrl ? String(receiptUrl).trim() : null,
        expensedAt: expenseDate,
      },
      include: {
        branch: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: { expense },
      message: 'Gasto operativo registrado exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/expenses:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al registrar el gasto operativo' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.businessId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autorizado' } },
        { status: 401 }
      )
    }

    const isOwnerOrAdmin =
      session.roleCodes.includes('ADMIN') ||
      session.roleCodes.includes('SUPERADMIN') ||
      session.roleCodes.includes('BRANCH_MANAGER')

    if (!isOwnerOrAdmin && !session.permissions?.canManageExpenses) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Sin permisos para eliminar gastos' } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'ID de gasto no especificado' } },
        { status: 400 }
      )
    }

    // Verificar que el gasto pertenezca al negocio del usuario
    const expense = await prisma.expense.findFirst({
      where: {
        id,
        branch: { businessId: session.businessId },
      },
    })

    if (!expense) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Gasto no encontrado' } },
        { status: 404 }
      )
    }

    await prisma.expense.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Gasto eliminado correctamente',
    })
  } catch (error) {
    console.error('Error en DELETE /api/expenses:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar gasto' } },
      { status: 500 }
    )
  }
}

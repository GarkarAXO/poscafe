import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const body = await request.json()
    const branchId = session?.activeBranchId || body.branchId
    const { tableId } = body

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: { message: 'No autenticado o sucursal no especificada' } },
        { status: 401 }
      )
    }

    if (!tableId) {
      return NextResponse.json(
        { success: false, error: { message: 'tableId requerido' } },
        { status: 400 }
      )
    }

    const callKey = `${branchId}:${tableId}`
    globalThis.__waiterCalls?.delete(callKey)

    return NextResponse.json({
      success: true,
      message: 'Llamada de mesa atendida',
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Error al limpiar llamada' } },
      { status: 500 }
    )
  }
}

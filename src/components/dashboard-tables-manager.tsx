'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Sparkles,
  CheckCircle2,
  UserCheck,
  Trash2,
  Edit2,
  Loader2,
  Coffee,
  AlertCircle,
  HelpCircle,
  Hash,
  Layers,
  MapPin,
} from 'lucide-react'
import { notify } from '@/lib/notify'

interface AreaOption {
  id: string
  name: string
}

interface WaiterOption {
  id: string
  name: string
  roles: string[]
}

interface TableItem {
  id: string
  name: string
  capacity: number
  status: string
  areaId: string | null
  areaName: string
  assignedWaiter: { id: string; name: string } | null
  currentWaiter: { id: string; name: string } | null
  activeOrder: {
    id: string
    orderNumber: string
    total: number
    openedAt: string
    waiter: { id: string; name: string } | null
  } | null
}

interface DashboardTablesManagerProps {
  branchId: string
  branchName: string
  primaryColor?: string
}

export default function DashboardTablesManager({
  branchId,
  branchName,
  primaryColor = '#C08552',
}: DashboardTablesManagerProps) {
  const [loading, setLoading] = useState(true)
  const [tableServiceMode, setTableServiceMode] = useState<'FREE' | 'ASSIGNED'>('FREE')
  const [tables, setTables] = useState<TableItem[]>([])
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [waiters, setWaiters] = useState<WaiterOption[]>([])
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL')

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showAreaModal, setShowAreaModal] = useState(false)
  const [editingTable, setEditingTable] = useState<TableItem | null>(null)

  // Formulario y Gestión de Áreas
  const [areaFormData, setAreaFormData] = useState({
    name: '',
    generateTables: true,
    tablesCount: 6,
    capacity: 4,
    prefix: '',
    defaultWaiterId: '',
  })
  const [submittingArea, setSubmittingArea] = useState(false)
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null)

  const popularAreaSuggestions = [
    { name: 'Terraza', prefix: 'Terraza' },
    { name: 'Parte Frontal', prefix: 'Frontal' },
    { name: 'Parte Trasera', prefix: 'Trasera' },
    { name: 'Salón Principal', prefix: 'Mesa' },
    { name: 'Barra', prefix: 'Barra' },
    { name: 'Patio Exterior', prefix: 'Patio' },
    { name: 'Planta Alta', prefix: 'Alta' },
  ]

  // Formulario de Mesa Individual
  const [formData, setFormData] = useState({
    name: '',
    capacity: 4,
    areaId: '',
    assignedWaiterId: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Formulario Generación Masiva
  const [bulkData, setBulkData] = useState({
    count: 6,
    prefix: 'Mesa',
    capacity: 4,
    areaId: '',
    startNumber: 1,
  })
  const [submittingBulk, setSubmittingBulk] = useState(false)

  // Estado de actualización de mesero en tarjeta individual
  const [assigningTableId, setAssigningTableId] = useState<string | null>(null)
  const [updatingMode, setUpdatingMode] = useState(false)

  // Cargar datos de mesas de la sucursal
  const fetchTablesData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/tables')
      const json = await res.json()
      if (json.success && json.data) {
        setTables(json.data.tables || [])
        setAreas(json.data.areas || [])
        setWaiters(json.data.waiters || [])
        setTableServiceMode(json.data.branch?.tableServiceMode || 'FREE')
      }
    } catch {
      notify.error('Error', 'No se pudieron cargar las mesas de la sucursal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTablesData()
  }, [branchId])

  // Cambiar modo de servicio (LIBRE vs ASIGNADO)
  const handleToggleServiceMode = async (newMode: 'FREE' | 'ASSIGNED') => {
    if (newMode === tableServiceMode || updatingMode) return
    setUpdatingMode(true)
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SERVICE_MODE',
          tableServiceMode: newMode,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setTableServiceMode(newMode)
        notify.success('Modo de atención actualizado', json.message)
      } else {
        notify.error('Error al actualizar', json.error?.message || 'No se pudo cambiar el modo')
      }
    } catch {
      notify.error('Error de red', 'No se pudo comunicar con el servidor')
    } finally {
      setUpdatingMode(false)
    }
  }

  // Asignar mesero titular a una mesa desde el selector rápido de la tarjeta
  const handleQuickAssignWaiter = async (tableId: string, waiterId: string) => {
    setAssigningTableId(tableId)
    try {
      const res = await fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedWaiterId: waiterId || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        const assignedUser = waiters.find((w) => w.id === waiterId)
        setTables((prev) =>
          prev.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  assignedWaiter: assignedUser
                    ? { id: assignedUser.id, name: assignedUser.name }
                    : null,
                }
              : t
          )
        )
        notify.success(
          'Mesero asignado',
          assignedUser ? `${assignedUser.name} asignado a la mesa` : 'Mesa desasignada'
        )
      } else {
        notify.error('Error al asignar', json.error?.message || 'No se pudo guardar la asignación')
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible guardar el mesero')
    } finally {
      setAssigningTableId(null)
    }
  }

  // Crear o editar mesa individual
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      notify.warning('Nombre requerido', 'Ingresa un nombre para la mesa (ej: Mesa 1, Barra 2)')
      return
    }

    setSubmitting(true)
    try {
      if (editingTable) {
        // Actualizar
        const res = await fetch(`/api/tables/${editingTable.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            capacity: Number(formData.capacity) || 4,
            areaId: formData.areaId || null,
            assignedWaiterId: formData.assignedWaiterId || null,
          }),
        })
        const json = await res.json()
        if (json.success) {
          notify.success('Mesa actualizada', json.message)
          setShowCreateModal(false)
          setEditingTable(null)
          await fetchTablesData()
        } else {
          notify.error('Error al guardar', json.error?.message)
        }
      } else {
        // Crear
        const res = await fetch('/api/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            capacity: Number(formData.capacity) || 4,
            areaId: formData.areaId || null,
            assignedWaiterId: formData.assignedWaiterId || null,
          }),
        })
        const json = await res.json()
        if (json.success) {
          notify.success('Mesa creada', json.message)
          setShowCreateModal(false)
          setFormData({ name: '', capacity: 4, areaId: '', assignedWaiterId: '' })
          await fetchTablesData()
        } else {
          notify.error('Error al crear', json.error?.message)
        }
      }
    } catch {
      notify.error('Error', 'No se pudo conectar con el servidor')
    } finally {
      setSubmitting(false)
    }
  }

  // Generar mesas en lote (Bulk)
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingBulk(true)
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_GENERATE',
          count: bulkData.count,
          prefix: bulkData.prefix,
          capacity: bulkData.capacity,
          areaId: bulkData.areaId || null,
          startNumber: bulkData.startNumber,
        }),
      })
      const json = await res.json()
      if (json.success) {
        notify.success('Mesas generadas', json.message)
        setShowBulkModal(false)
        await fetchTablesData()
      } else {
        notify.error('Error al generar', json.error?.message)
      }
    } catch {
      notify.error('Error de conexión', 'No se pudieron generar las mesas')
    } finally {
      setSubmittingBulk(false)
    }
  }

  // Eliminar mesa
  const handleDeleteTable = async (table: TableItem) => {
    if (table.activeOrder) {
      notify.warning(
        'Comanda abierta',
        `La ${table.name} tiene una comanda activa. Debe cerrarse o cobrarse en caja antes de eliminarla.`
      )
      return
    }

    if (!confirm(`¿Estás seguro de eliminar la ${table.name}?`)) return

    try {
      const res = await fetch(`/api/tables/${table.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        notify.success('Mesa eliminada', json.message)
        setTables((prev) => prev.filter((t) => t.id !== table.id))
      } else {
        notify.error('No se pudo eliminar', json.error?.message)
      }
    } catch {
      notify.error('Error', 'Error al comunicar con el servidor')
    }
  }

  // Guardar nueva área / zona (con opción de generar mesas)
  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!areaFormData.name.trim()) return

    setSubmittingArea(true)
    try {
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: areaFormData.name.trim(),
          tablesCount: areaFormData.generateTables ? areaFormData.tablesCount : 0,
          prefix: areaFormData.prefix ? areaFormData.prefix.trim() : areaFormData.name.trim(),
          capacity: areaFormData.capacity,
          defaultWaiterId: areaFormData.defaultWaiterId || null,
        }),
      })

      const json = await res.json()
      if (json.success) {
        notify.success('Área creada', json.message)
        setShowAreaModal(false)
        const newAreaId = json.data?.area?.id
        setAreaFormData({
          name: '',
          generateTables: true,
          tablesCount: 6,
          capacity: 4,
          prefix: '',
          defaultWaiterId: '',
        })
        await fetchTablesData()
        if (newAreaId) {
          setSelectedAreaFilter(newAreaId)
        }
      } else {
        notify.error('Error al crear área', json.error?.message)
      }
    } catch {
      notify.error('Error de red', 'No se pudo comunicar con el servidor')
    } finally {
      setSubmittingArea(false)
    }
  }

  // Eliminar área / zona
  const handleDeleteArea = async (areaId: string, areaName: string) => {
    const count = tables.filter((t) => t.areaId === areaId).length
    const msg =
      count > 0
        ? `¿Estás seguro de eliminar el área "${areaName}"? Sus ${count} mesas no se borrarán, quedarán registradas en "Sin Área".`
        : `¿Estás seguro de eliminar el área "${areaName}"?`

    if (!confirm(msg)) return

    setDeletingAreaId(areaId)
    try {
      const res = await fetch(`/api/areas/${areaId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        notify.success('Área eliminada', json.message)
        if (selectedAreaFilter === areaId) setSelectedAreaFilter('ALL')
        await fetchTablesData()
      } else {
        notify.error('No se pudo eliminar', json.error?.message)
      }
    } catch {
      notify.error('Error de conexión', 'No se pudo comunicar con el servidor')
    } finally {
      setDeletingAreaId(null)
    }
  }

  // Mesas filtradas por área seleccionada
  const filteredTables = tables.filter((t) => {
    if (selectedAreaFilter === 'ALL') return true
    if (selectedAreaFilter === 'UNASSIGNED') return !t.areaId
    return t.areaId === selectedAreaFilter
  })

  // Estadísticas rápidas
  const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 0), 0)
  const assignedCount = tables.filter((t) => !!t.assignedWaiter).length
  const unassignedCount = tables.length - assignedCount

  return (
    <div className="p-6 rounded-3xl bg-[#14100e] border border-[#382b25] space-y-6 shadow-xl relative overflow-hidden">
      {/* Cabecera Principal de la Sección de Mesas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#2a201c] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border border-[#C08552]/30 bg-[#C08552]/10 text-[#C08552] mb-2">
            <Coffee className="w-3.5 h-3.5" />
            Configuración de Servicio en Salón • {branchName}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Control de Mesas y Asignación de Meseros
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Define cuántas mesas tiene tu sucursal y el modo de atención del equipo: asigna meseros fijos
            por mesa o permite servicio libre donde cualquier colaborador puede tomar cualquier mesa.
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setAreaFormData({
                name: '',
                generateTables: true,
                tablesCount: 6,
                capacity: 4,
                prefix: '',
                defaultWaiterId: '',
              })
              setShowAreaModal(true)
            }}
            className="px-3.5 py-2 rounded-xl bg-[#251e1b] hover:bg-[#332924] border border-[#382b25] text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Layers className="w-3.5 h-3.5 text-[#C08552]" />
            <span>Zonas / Áreas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              // Calcular sugerencia de siguiente número
              const nextNum = tables.length + 1
              setBulkData((prev) => ({ ...prev, startNumber: nextNum }))
              setShowBulkModal(true)
            }}
            className="px-3.5 py-2 rounded-xl bg-[#251e1b] hover:bg-[#332924] border border-[#382b25] text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C08552]" />
            <span>Generar Lote</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTable(null)
              setFormData({
                name: `Mesa ${tables.length + 1}`,
                capacity: 4,
                areaId: areas[0]?.id || '',
                assignedWaiterId: '',
              })
              setShowCreateModal(true)
            }}
            style={{ backgroundColor: primaryColor }}
            className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#C08552]/20 hover:opacity-95 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Mesa</span>
          </button>
        </div>
      </div>

      {/* Selector de Modo de Atención: MODO LIBRE vs MODO ASIGNADO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span>Modo de Atención de Meseros:</span>
            {updatingMode && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C08552]" />}
          </label>
          <span className="text-[11px] text-slate-400">
            Aplica a la comandera de piso y terminales touch
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Opción 1: Servicio Libre */}
          <button
            type="button"
            onClick={() => handleToggleServiceMode('FREE')}
            disabled={updatingMode}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
              tableServiceMode === 'FREE'
                ? 'bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'bg-[#1c1715] border-[#382b25] hover:border-slate-700 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    tableServiceMode === 'FREE'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Servicio Libre / Colaborativo
                    {tableServiceMode === 'FREE' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ACTIVO
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cualquier mesero puede tomar y atender cualquier mesa
                  </p>
                </div>
              </div>

              {tableServiceMode === 'FREE' && (
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400/90 mt-3 pt-2.5 border-t border-[#2a201c] leading-relaxed">
              Ideal para cafeterías ágiles, barras y turnos donde el equipo comparte el piso. Al abrir
              una comanda, se registra temporalmente al mesero que tomó el pedido.
            </p>
          </button>

          {/* Opción 2: Meseros Asignados por Mesa */}
          <button
            type="button"
            onClick={() => handleToggleServiceMode('ASSIGNED')}
            disabled={updatingMode}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
              tableServiceMode === 'ASSIGNED'
                ? 'bg-[#C08552]/15 border-[#C08552] shadow-lg shadow-[#C08552]/15 ring-1 ring-[#C08552]/40'
                : 'bg-[#1c1715] border-[#382b25] hover:border-slate-700 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    tableServiceMode === 'ASSIGNED'
                      ? 'bg-[#C08552]/20 text-[#C08552]'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Meseros Asignados por Mesa
                    {tableServiceMode === 'ASSIGNED' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#C08552]/20 text-[#C08552] border border-[#C08552]/30">
                        ACTIVO
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cada mesa tiene un mesero titular responsable
                  </p>
                </div>
              </div>

              {tableServiceMode === 'ASSIGNED' && (
                <div className="w-6 h-6 rounded-full bg-[#C08552] text-white flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400/90 mt-3 pt-2.5 border-t border-[#2a201c] leading-relaxed">
              Ideal para restaurantes por secciones o turnos con propinas por rango. En la comandera,
              los meseros pueden filtrar con un toque en &quot;Mis Mesas&quot; para ver sus mesas a cargo.
            </p>
          </button>
        </div>
      </div>

      {/* Métricas y Filtros de Áreas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1a1412] p-3 sm:p-4 rounded-2xl border border-[#382b25]">
        {/* Contadores */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-xl bg-[#251e1b] text-slate-300 font-bold border border-[#382b25]">
            Total: <strong className="text-white">{tables.length} mesas</strong>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-[#251e1b] text-slate-300 font-bold border border-[#382b25]">
            Capacidad: <strong className="text-[#C08552]">{totalCapacity} comensales</strong>
          </span>
          {tableServiceMode === 'ASSIGNED' && (
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
              Asignadas: {assignedCount} / {tables.length}
              {unassignedCount > 0 && ` (${unassignedCount} libres)`}
            </span>
          )}
        </div>

        {/* Filtro por Áreas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedAreaFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedAreaFilter === 'ALL'
                ? 'bg-[#C08552] text-white shadow-sm'
                : 'bg-[#251e1b] text-slate-400 hover:text-white border border-[#382b25]'
            }`}
          >
            Todas ({tables.length})
          </button>
          {areas.map((a) => {
            const count = tables.filter((t) => t.areaId === a.id).length
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAreaFilter(a.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedAreaFilter === a.id
                    ? 'bg-[#C08552] text-white shadow-sm'
                    : 'bg-[#251e1b] text-slate-400 hover:text-white border border-[#382b25]'
                }`}
              >
                {a.name} ({count})
              </button>
            )
          })}
          {tables.some((t) => !t.areaId) && (
            <button
              type="button"
              onClick={() => setSelectedAreaFilter('UNASSIGNED')}
              className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedAreaFilter === 'UNASSIGNED'
                  ? 'bg-[#C08552] text-white shadow-sm'
                  : 'bg-[#251e1b] text-slate-400 hover:text-white border border-[#382b25]'
              }`}
            >
              Sin Área ({tables.filter((t) => !t.areaId).length})
            </button>
          )}

          {/* Botón rápido "+ Área" */}
          <button
            type="button"
            onClick={() => {
              setAreaFormData({
                name: '',
                generateTables: true,
                tablesCount: 6,
                capacity: 4,
                prefix: '',
                defaultWaiterId: '',
              })
              setShowAreaModal(true)
            }}
            className="px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 bg-[#C08552]/15 text-[#C08552] hover:bg-[#C08552]/25 border border-[#C08552]/30 flex items-center gap-1 transition-all cursor-pointer"
            title="Añadir nueva área (ej: Terraza, Frente, Trasera)"
          >
            <Plus className="w-3 h-3" />
            <span>Área</span>
          </button>
        </div>
      </div>

      {/* Banner de Área Seleccionada */}
      {selectedAreaFilter !== 'ALL' && selectedAreaFilter !== 'UNASSIGNED' && (
        (() => {
          const currentArea = areas.find((a) => a.id === selectedAreaFilter)
          if (!currentArea) return null
          const areaTablesCount = tables.filter((t) => t.areaId === currentArea.id).length
          return (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1a1412] px-4 py-3 rounded-2xl border border-[#382b25]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#C08552]/20 text-[#C08552] flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    Zona: {currentArea.name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#251e1b] text-[#C08552] border border-[#382b25]">
                      {areaTablesCount} mesas
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Mesas ubicadas en la sección {currentArea.name}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = tables.length + 1
                    setBulkData({
                      count: 4,
                      prefix: currentArea.name,
                      capacity: 4,
                      areaId: currentArea.id,
                      startNumber: nextNum,
                    })
                    setShowBulkModal(true)
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#251e1b] hover:bg-[#332924] text-[#C08552] text-xs font-bold flex items-center gap-1.5 border border-[#382b25] transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Mesas</span>
                </button>

                <button
                  type="button"
                  disabled={deletingAreaId === currentArea.id}
                  onClick={() => handleDeleteArea(currentArea.id, currentArea.name)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#251e1b] hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-bold flex items-center gap-1.5 border border-[#382b25] transition-all cursor-pointer"
                  title="Eliminar esta zona"
                >
                  {deletingAreaId === currentArea.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Eliminar Zona</span>
                </button>
              </div>
            </div>
          )
        })()
      )}

      {/* Grid de Mesas */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#C08552]" />
          <span className="text-xs">Cargando mesas de la sucursal...</span>
        </div>
      ) : tables.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-[#382b25] rounded-3xl p-8 space-y-3 bg-[#1a1412]/40">
          <div className="w-12 h-12 rounded-2xl bg-[#C08552]/10 text-[#C08552] flex items-center justify-center mx-auto">
            <Coffee className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No hay mesas configuradas aún</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Agrega las mesas de tu salón para que los meseros puedan tomar comandas y gestionar consumos.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 rounded-xl bg-[#C08552] text-white text-xs font-bold shadow-md cursor-pointer hover:opacity-90"
            >
              Generar Lote Rápido (ej. 6 o 10 Mesas)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredTables.map((table) => {
            const isAssigned = !!table.assignedWaiter
            const isOccupied = !!table.activeOrder

            return (
              <div
                key={table.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative group ${
                  isOccupied
                    ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'bg-[#1c1715] border-[#382b25] hover:border-[#C08552]/50'
                }`}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-black text-white">{table.name}</h4>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C08552]" />
                      {table.areaName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Badge de Capacidad */}
                    <span className="px-2 py-0.5 rounded-lg bg-[#251e1b] border border-[#382b25] text-[11px] text-slate-300 font-bold flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {table.capacity}
                    </span>

                    {/* Badge Estado */}
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isOccupied ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                      }`}
                      title={isOccupied ? 'Mesa Ocupada con comanda' : 'Mesa Libre'}
                    />
                  </div>
                </div>

                {/* Sección de Asignación de Mesero Titular */}
                <div className="space-y-1.5 bg-[#14100e] p-2.5 rounded-xl border border-[#2a201c]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-[#C08552]" />
                      Mesero Titular:
                    </span>
                    {tableServiceMode === 'FREE' && (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        Modo Libre
                      </span>
                    )}
                  </div>

                  {tableServiceMode === 'ASSIGNED' ? (
                    <div className="relative">
                      <select
                        value={table.assignedWaiter?.id || ''}
                        disabled={assigningTableId === table.id}
                        onChange={(e) => handleQuickAssignWaiter(table.id, e.target.value)}
                        className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#1c1715] border text-white transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#C08552] ${
                          isAssigned
                            ? 'border-[#C08552]/40 text-amber-200'
                            : 'border-slate-700/80 text-slate-400'
                        }`}
                      >
                        <option value="">(Sin asignar - Mesa Libre)</option>
                        {waiters.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.roles.length > 0 ? `(${w.roles.join(', ')})` : ''}
                          </option>
                        ))}
                      </select>
                      {assigningTableId === table.id && (
                        <div className="absolute right-2 top-2">
                          <Loader2 className="w-3 h-3 animate-spin text-[#C08552]" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      {isAssigned
                        ? `Preferente: ${table.assignedWaiter?.name}`
                        : 'Abierta para cualquier mesero'}
                    </p>
                  )}
                </div>

                {/* Comanda en curso si está ocupada */}
                {table.activeOrder && (
                  <div className="text-[11px] bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl flex items-center justify-between text-amber-300">
                    <span>Comanda #{table.activeOrder.orderNumber}</span>
                    <strong className="font-mono">${table.activeOrder.total.toFixed(2)}</strong>
                  </div>
                )}

                {/* Acciones Editar / Eliminar */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#251e1b]">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTable(table)
                      setFormData({
                        name: table.name,
                        capacity: table.capacity,
                        areaId: table.areaId || '',
                        assignedWaiterId: table.assignedWaiter?.id || '',
                      })
                      setShowCreateModal(true)
                    }}
                    className="p-1.5 rounded-lg bg-[#251e1b] hover:bg-[#332924] text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Editar mesa"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTable(table)}
                    className="p-1.5 rounded-lg bg-[#251e1b] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                    title="Eliminar mesa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR MESA INDIVIDUAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#14100e] border border-[#382b25] p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#2a201c] pb-3">
              <h3 className="text-base font-bold text-white">
                {editingTable ? `Editar ${editingTable.name}` : 'Nueva Mesa de Salón'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-xl bg-[#251e1b] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Nombre o Número de Mesa *</label>
                <input
                  type="text"
                  placeholder="Ej: Mesa 1, Barra 2, Terraza A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Capacidad (Personas)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) || 4 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold">Área / Zona</label>
                    <button
                      type="button"
                      onClick={() => setShowAreaModal(true)}
                      className="text-[10px] text-[#C08552] hover:underline font-bold cursor-pointer"
                    >
                      + Nueva Zona
                    </button>
                  </div>
                  <select
                    value={formData.areaId}
                    onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                  >
                    <option value="">General (Sin área)</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold flex items-center justify-between">
                  <span>Mesero Titular Responsable</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {tableServiceMode === 'FREE' ? 'Opcional (Modo Libre activo)' : 'Recomendado'}
                  </span>
                </label>
                <select
                  value={formData.assignedWaiterId}
                  onChange={(e) => setFormData({ ...formData, assignedWaiterId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                >
                  <option value="">(Sin mesero asignado - Libre)</option>
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.roles.length > 0 ? `(${w.roles.join(', ')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#2a201c]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#251e1b] text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: primaryColor }}
                  className="px-5 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTable ? 'Actualizar Mesa' : 'Crear Mesa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GENERACIÓN RÁPIDA EN LOTE */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#14100e] border border-[#382b25] p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#2a201c] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#C08552]/20 text-[#C08552] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Generar Lote de Mesas</h3>
                  <p className="text-[11px] text-slate-400">Crea múltiples mesas numeradas en 1 clic</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="w-7 h-7 rounded-xl bg-[#251e1b] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkGenerate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">¿Cuántas mesas crear?</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={bulkData.count}
                    onChange={(e) => setBulkData({ ...bulkData, count: Number(e.target.value) || 1 })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Número Inicial</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkData.startNumber}
                    onChange={(e) => setBulkData({ ...bulkData, startNumber: Number(e.target.value) || 1 })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Prefijo de Nombre</label>
                  <input
                    type="text"
                    placeholder="Mesa"
                    value={bulkData.prefix}
                    onChange={(e) => setBulkData({ ...bulkData, prefix: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Capacidad (Comensales)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={bulkData.capacity}
                    onChange={(e) => setBulkData({ ...bulkData, capacity: Number(e.target.value) || 4 })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Área / Zona de Destino</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkModal(false)
                      setShowAreaModal(true)
                    }}
                    className="text-[10px] text-[#C08552] hover:underline font-bold cursor-pointer"
                  >
                    + Nueva Zona
                  </button>
                </div>
                <select
                  value={bulkData.areaId}
                  onChange={(e) => setBulkData({ ...bulkData, areaId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                >
                  <option value="">General (Sin área asignada)</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Previsualización */}
              <div className="p-3 rounded-2xl bg-[#1c1715] border border-[#2a201c] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Previsualización del lote:</span>
                <p className="text-[11px]">
                  Se generarán: <strong className="text-white">{bulkData.prefix} {bulkData.startNumber}</strong> hasta{' '}
                  <strong className="text-white">
                    {bulkData.prefix} {bulkData.startNumber + bulkData.count - 1}
                  </strong>{' '}
                  con capacidad de {bulkData.capacity} comensales.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#2a201c]">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#251e1b] text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingBulk}
                  style={{ backgroundColor: primaryColor }}
                  className="px-5 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submittingBulk && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generar {bulkData.count} Mesas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTIÓN Y CREACIÓN DE ÁREAS / ZONAS */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#14100e] border border-[#382b25] p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2a201c] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C08552]/20 text-[#C08552] flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Zonas y Áreas de Salón</h3>
                  <p className="text-[11px] text-slate-400">
                    Crea áreas (Terraza, Frente, Salón) y genera sus mesas en un solo clic
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAreaModal(false)}
                className="w-7 h-7 rounded-xl bg-[#251e1b] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulario de Nueva Área */}
            <form onSubmit={handleSaveArea} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-slate-300 font-bold block">
                  Sugerencias rápidas de zonas:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {popularAreaSuggestions.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setAreaFormData((prev) => ({
                          ...prev,
                          name: item.name,
                          prefix: item.prefix,
                        }))
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                        areaFormData.name === item.name
                          ? 'bg-[#C08552] text-white border-[#C08552]'
                          : 'bg-[#1c1715] text-slate-300 border-[#382b25] hover:border-slate-600'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Nombre del Área / Zona *</label>
                <input
                  type="text"
                  placeholder="Ej: Terraza, Parte Frontal, Patio Trasero"
                  value={areaFormData.name}
                  onChange={(e) =>
                    setAreaFormData({
                      ...areaFormData,
                      name: e.target.value,
                      prefix: areaFormData.prefix || e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#1c1715] border border-[#382b25] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                />
              </div>

              {/* Opción de crear mesas automáticamente */}
              <div className="p-3.5 rounded-2xl bg-[#1c1715] border border-[#2a201c] space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C08552]" />
                    <span className="font-bold text-white text-xs">
                      ¿Generar mesas automáticamente en esta área?
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={areaFormData.generateTables}
                    onChange={(e) =>
                      setAreaFormData({ ...areaFormData, generateTables: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#C08552] rounded cursor-pointer"
                  />
                </label>

                {areaFormData.generateTables && (
                  <div className="space-y-3 pt-2 border-t border-[#2a201c] animate-in fade-in-50">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold">Cantidad de mesas</label>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={areaFormData.tablesCount}
                          onChange={(e) =>
                            setAreaFormData({
                              ...areaFormData,
                              tablesCount: Number(e.target.value) || 1,
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-[#251e1b] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold">Capacidad por mesa</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={areaFormData.capacity}
                          onChange={(e) =>
                            setAreaFormData({
                              ...areaFormData,
                              capacity: Number(e.target.value) || 4,
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-[#251e1b] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold">Prefijo de las mesas</label>
                        <input
                          type="text"
                          placeholder={areaFormData.name || 'Mesa'}
                          value={areaFormData.prefix}
                          onChange={(e) =>
                            setAreaFormData({ ...areaFormData, prefix: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-[#251e1b] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold">Mesero titular (Opcional)</label>
                        <select
                          value={areaFormData.defaultWaiterId}
                          onChange={(e) =>
                            setAreaFormData({
                              ...areaFormData,
                              defaultWaiterId: e.target.value,
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-[#251e1b] border border-[#382b25] text-white focus:outline-none focus:ring-1 focus:ring-[#C08552]"
                        >
                          <option value="">(Sin asignar)</option>
                          {waiters.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-200/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                      💡 Se creará la zona <strong>{areaFormData.name || 'Nueva'}</strong> con{' '}
                      <strong>{areaFormData.tablesCount} mesas</strong> ({areaFormData.prefix || areaFormData.name || 'Mesa'} 1 a {areaFormData.prefix || areaFormData.name || 'Mesa'}{' '}
                      {areaFormData.tablesCount}) para {areaFormData.capacity} comensales.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-[#2a201c]">
                <button
                  type="button"
                  onClick={() => setShowAreaModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#251e1b] text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingArea || !areaFormData.name.trim()}
                  style={{ backgroundColor: primaryColor }}
                  className="px-5 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submittingArea && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {areaFormData.generateTables
                      ? `Crear Área con ${areaFormData.tablesCount} Mesas`
                      : 'Crear Área'}
                  </span>
                </button>
              </div>
            </form>

            {/* Listado de Áreas Actuales */}
            {areas.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[#2a201c]">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Áreas existentes ({areas.length})
                </h4>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {areas.map((a) => {
                    const count = tables.filter((t) => t.areaId === a.id).length
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c1715] border border-[#2a201c]"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-[#C08552]" />
                          <span className="font-bold text-white text-xs">{a.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#251e1b] text-slate-400 border border-[#382b25]">
                            {count} {count === 1 ? 'mesa' : 'mesas'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAreaFilter(a.id)
                              setShowAreaModal(false)
                            }}
                            className="px-2 py-1 rounded-lg bg-[#251e1b] hover:bg-[#332924] text-xs text-slate-300 font-semibold cursor-pointer"
                          >
                            Ver mesas
                          </button>
                          <button
                            type="button"
                            disabled={deletingAreaId === a.id}
                            onClick={() => handleDeleteArea(a.id, a.name)}
                            className="p-1 rounded-lg bg-[#251e1b] hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                            title="Eliminar área"
                          >
                            {deletingAreaId === a.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

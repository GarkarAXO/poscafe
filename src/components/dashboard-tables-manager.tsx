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
  QrCode,
  Printer,
  Download,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react'
import QRCode from 'qrcode'
import { notify } from '@/lib/notify'
import { useDashboardTheme } from '@/context/dashboard-theme-context'
import { getStatusBadgeStyles, getContrastTextColor } from '@/lib/theme-utils'

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
  const theme = useDashboardTheme()
  const activePrimary = primaryColor || theme.primaryColor
  const { isLight, buttonColor, classes } = theme

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

  // Modal de Código QR de Mesa
  const [qrModalTable, setQrModalTable] = useState<TableItem | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [generatingQr, setGeneratingQr] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

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

  // Generar y abrir Código QR para comensales en mesa
  const handleOpenTableQR = async (table: TableItem) => {
    setQrModalTable(table)
    setGeneratingQr(true)
    setCopiedLink(false)
    try {
      const url = `${window.location.origin}/menu?table=${encodeURIComponent(table.name)}`
      const dataUrl = await QRCode.toDataURL(url, {
        width: 360,
        margin: 2,
        color: {
          dark: '#3E2723',
          light: '#FFFFFF',
        },
      })
      setQrCodeDataUrl(dataUrl)
    } catch (err) {
      console.error('Error generando QR de mesa:', err)
      notify.error('Error', 'No se pudo generar el código QR')
    } finally {
      setGeneratingQr(false)
    }
  }

  const handleCopyLink = () => {
    if (!qrModalTable) return
    const url = `${window.location.origin}/menu?table=${encodeURIComponent(qrModalTable.name)}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    notify.success('Copiado', 'Enlace copiado al portapapeles')
    setTimeout(() => setCopiedLink(false), 3000)
  }

  const handlePrintQR = () => {
    if (!qrModalTable || !qrCodeDataUrl) return
    const printWindow = window.open('', '_blank', 'width=600,height=700')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR ${qrModalTable.name} - ${branchName}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              text-align: center;
              padding: 24px;
              color: #2A1810;
              margin: 0;
            }
            .card {
              border: 2px dashed #C08552;
              border-radius: 24px;
              padding: 30px;
              max-width: 340px;
              margin: 0 auto;
              background: #FAF6F0;
            }
            .tag {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 2px;
              font-weight: 800;
              color: #895737;
              margin-bottom: 6px;
            }
            h1 {
              margin: 0 0 2px 0;
              font-size: 26px;
              font-weight: 900;
              color: #5E3023;
            }
            .subtitle {
              font-size: 13px;
              color: #7A5B4F;
              margin-bottom: 20px;
              font-weight: 600;
            }
            img {
              width: 220px;
              height: 220px;
              border-radius: 16px;
              border: 1px solid #E6D5C3;
              background: white;
              padding: 10px;
              box-shadow: 0 4px 14px rgba(0,0,0,0.06);
            }
            .instructions {
              margin-top: 18px;
              font-size: 13px;
              font-weight: 700;
              color: #5E3023;
              line-height: 1.4;
            }
            .brand {
              margin-top: 20px;
              font-size: 12px;
              color: #A88C7D;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="tag">Menú Digital</div>
            <h1>${qrModalTable.name}</h1>
            <div class="subtitle">${qrModalTable.areaName || branchName}</div>
            <img src="${qrCodeDataUrl}" alt="QR ${qrModalTable.name}" />
            <div class="instructions">📱 Escanea con tu cámara para explorar el menú y ordenar</div>
            <div class="brand">${branchName}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
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
    <div className={`p-6 rounded-3xl border space-y-6 shadow-xl relative overflow-hidden backdrop-blur-md ${classes.card}`}>
      {/* Cabecera Principal de la Sección de Mesas */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 ${classes.divider}`}>
        <div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mb-2 ${
              isLight
                ? 'border-[#C08552]/30 bg-[#C08552]/10 text-[#895737]'
                : 'border-white/15 bg-white/10 text-amber-300'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            Configuración de Servicio en Salón • {branchName}
          </div>
          <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
            Control de Mesas y Asignación de Meseros
          </h2>
          <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${classes.textMuted}`}>
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
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${classes.buttonGhost}`}
          >
            <Layers className="w-3.5 h-3.5" style={{ color: buttonColor }} />
            <span>Zonas / Áreas</span>
          </button>

          <a
            href="/menu"
            target="_blank"
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${classes.buttonGhost}`}
            title="Abrir Menú Digital para Clientes"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ver Menú QR</span>
          </a>

          <button
            type="button"
            onClick={() => {
              // Calcular sugerencia de siguiente número
              const nextNum = tables.length + 1
              setBulkData((prev) => ({ ...prev, startNumber: nextNum }))
              setShowBulkModal(true)
            }}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${classes.buttonGhost}`}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: buttonColor }} />
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
            style={{
              backgroundColor: activePrimary,
              color: getContrastTextColor(activePrimary),
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:opacity-95 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Mesa</span>
          </button>
        </div>
      </div>

      {/* Selector de Modo de Atención: MODO LIBRE vs MODO ASIGNADO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${classes.textMuted}`}>
            <span>Modo de Atención de Meseros:</span>
            {updatingMode && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: buttonColor }} />}
          </label>
          <span className={`text-[11px] ${classes.textSub}`}>
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
                ? isLight
                  ? 'bg-emerald-50/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-emerald-950/20 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/30'
                : `${classes.subCard} ${classes.subCardHover} opacity-85 hover:opacity-100`
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    tableServiceMode === 'FREE'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : isLight
                      ? 'bg-stone-100 text-stone-600'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                    Servicio Libre / Colaborativo
                    {tableServiceMode === 'FREE' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        ACTIVO
                      </span>
                    )}
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${classes.textMuted}`}>
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

            <p className={`text-[11px] mt-3 pt-2.5 border-t leading-relaxed ${classes.divider} ${classes.textMuted}`}>
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
                ? isLight
                  ? 'bg-amber-50/90 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-[#C08552]/15 border-[#C08552] shadow-lg ring-1 ring-[#C08552]/40'
                : `${classes.subCard} ${classes.subCardHover} opacity-85 hover:opacity-100`
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    tableServiceMode === 'ASSIGNED'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                      : isLight
                      ? 'bg-stone-100 text-stone-600'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                    Meseros Asignados por Mesa
                    {tableServiceMode === 'ASSIGNED' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-[#C08552] border border-amber-500/30">
                        ACTIVO
                      </span>
                    )}
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${classes.textMuted}`}>
                    Cada mesa tiene un mesero titular responsable
                  </p>
                </div>
              </div>

              {tableServiceMode === 'ASSIGNED' && (
                <div
                  style={{ backgroundColor: buttonColor }}
                  className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            <p className={`text-[11px] mt-3 pt-2.5 border-t leading-relaxed ${classes.divider} ${classes.textMuted}`}>
              Ideal para restaurantes por secciones o turnos con propinas por rango. En la comandera,
              los meseros pueden filtrar con un toque en &quot;Mis Mesas&quot; para ver sus mesas a cargo.
            </p>
          </button>
        </div>
      </div>

      {/* Métricas y Filtros de Áreas */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl border ${classes.card}`}>
        {/* Contadores */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`px-2.5 py-1 rounded-xl font-bold border ${classes.badge}`}>
            Total: <strong className={isLight ? 'text-[#2B1712]' : 'text-white'}>{tables.length} mesas</strong>
          </span>
          <span className={`px-2.5 py-1 rounded-xl font-bold border ${classes.badge}`}>
            Capacidad: <strong style={{ color: buttonColor }}>{totalCapacity} comensales</strong>
          </span>
          {tableServiceMode === 'ASSIGNED' && (
            <span
              className={`px-2.5 py-1 rounded-xl font-bold border ${
                isLight
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              }`}
            >
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
            style={
              selectedAreaFilter === 'ALL'
                ? {
                    backgroundColor: buttonColor,
                    color: getContrastTextColor(buttonColor),
                  }
                : undefined
            }
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedAreaFilter === 'ALL'
                ? 'shadow-sm'
                : classes.buttonGhost
            }`}
          >
            Todas ({tables.length})
          </button>
          {areas.map((a) => {
            const count = tables.filter((t) => t.areaId === a.id).length
            const isSel = selectedAreaFilter === a.id
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAreaFilter(a.id)}
                style={
                  isSel
                    ? {
                        backgroundColor: buttonColor,
                        color: getContrastTextColor(buttonColor),
                      }
                    : undefined
                }
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isSel ? 'shadow-sm' : classes.buttonGhost
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
              style={
                selectedAreaFilter === 'UNASSIGNED'
                  ? {
                      backgroundColor: buttonColor,
                      color: getContrastTextColor(buttonColor),
                    }
                  : undefined
              }
              className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedAreaFilter === 'UNASSIGNED'
                  ? 'shadow-sm'
                  : classes.buttonGhost
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
            className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 border flex items-center gap-1 transition-all cursor-pointer ${
              isLight
                ? 'bg-[#C08552]/15 text-[#895737] hover:bg-[#C08552]/25 border-[#C08552]/30'
                : 'bg-white/10 text-amber-300 hover:bg-white/15 border-white/20'
            }`}
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
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${classes.subCard}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: `${buttonColor}25`,
                    color: buttonColor,
                  }}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-bold flex items-center gap-2 ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                    Zona: {currentArea.name}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${classes.badge}`}>
                      {areaTablesCount} mesas
                    </span>
                  </h4>
                  <p className={`text-[11px] ${classes.textMuted}`}>
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
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${classes.buttonGhost}`}
                >
                  <Plus className="w-3.5 h-3.5" style={{ color: buttonColor }} />
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
        <div className={`py-12 flex flex-col items-center justify-center gap-2 ${classes.textMuted}`}>
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: buttonColor }} />
          <span className="text-xs">Cargando mesas de la sucursal...</span>
        </div>
      ) : tables.length === 0 ? (
        <div className={`py-12 text-center border border-dashed rounded-3xl p-8 space-y-3 ${classes.card}`}>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
            style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
          >
            <Coffee className="w-6 h-6" />
          </div>
          <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>No hay mesas configuradas aún</h3>
          <p className={`text-xs max-w-sm mx-auto ${classes.textMuted}`}>
            Agrega las mesas de tu salón para que los meseros puedan tomar comandas y gestionar consumos.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              style={{
                backgroundColor: buttonColor,
                color: getContrastTextColor(buttonColor),
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer hover:opacity-90"
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
                    ? isLight
                      ? 'bg-amber-50/90 border-amber-300 shadow-md ring-1 ring-amber-300/40 text-[#2B1712]'
                      : 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-500/10 text-white'
                    : `${classes.card} hover:border-[#C08552]/60`
                }`}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`text-base font-black ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>{table.name}</h4>
                    <span className={`text-[11px] flex items-center gap-1.5 mt-0.5 ${classes.textMuted}`}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: buttonColor }} />
                      {table.areaName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Badge de Capacidad */}
                    <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${classes.badge}`}>
                      <Users className="w-3 h-3" />
                      {table.capacity}
                    </span>

                    {/* Badge Estado */}
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isOccupied ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                      title={isOccupied ? 'Mesa Ocupada con comanda' : 'Mesa Libre'}
                    />
                  </div>
                </div>

                {/* Sección de Asignación de Mesero Titular */}
                <div className={`space-y-1.5 p-2.5 rounded-xl border ${classes.subCard}`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-medium flex items-center gap-1 ${classes.textMuted}`}>
                      <UserCheck className="w-3 h-3" style={{ color: buttonColor }} />
                      Mesero Titular:
                    </span>
                    {tableServiceMode === 'FREE' && (
                      <span className={`text-[10px] font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
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
                        className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-1 ${classes.input}`}
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
                          <Loader2 className="w-3 h-3 animate-spin" style={{ color: buttonColor }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className={`text-[11px] italic ${classes.textMuted}`}>
                      {isAssigned
                        ? `Preferente: ${table.assignedWaiter?.name}`
                        : 'Abierta para cualquier mesero'}
                    </p>
                  )}
                </div>

                {/* Comanda en curso si está ocupada */}
                {table.activeOrder && (
                  <div
                    className={`text-[11px] p-2 rounded-xl flex items-center justify-between border ${
                      isLight
                        ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    }`}
                  >
                    <span>Comanda #{table.activeOrder.orderNumber}</span>
                    <strong className="font-mono">${table.activeOrder.total.toFixed(2)}</strong>
                  </div>
                )}

                {/* Acciones Editar / Eliminar */}
                <div className={`flex items-center justify-end gap-1.5 pt-1 border-t ${classes.divider}`}>
                  <button
                    type="button"
                    onClick={() => handleOpenTableQR(table)}
                    className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer"
                    title="Código QR del Menú para esta mesa"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>

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
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${classes.buttonGhost}`}
                    title="Editar mesa"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTable(table)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
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

      {/* MODAL CÓDIGO QR DE MESA */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border text-center ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Menú Digital Interactivo
                </span>
                <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                  QR de {qrModalTable.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQrModalTable(null)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            {generatingQr ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span className="text-xs text-slate-400">Generando código QR...</span>
              </div>
            ) : qrCodeDataUrl ? (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-2xl border inline-block shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeDataUrl}
                    alt={`Código QR ${qrModalTable.name}`}
                    className="w-52 h-52 mx-auto"
                  />
                </div>

                <div className="space-y-1">
                  <p className={`text-xs font-semibold ${classes.textMain}`}>
                    Tus comensales verán directamente el menú de {qrModalTable.name}
                  </p>
                  <p className={`text-[11px] ${classes.textMuted}`}>
                    Podrán explorar platillos, precios, variantes y solicitar asistencia a su mesero.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePrintQR}
                    style={{ backgroundColor: buttonColor }}
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Código QR para Mesa</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`py-2 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${classes.buttonGhost}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedLink ? '¡Copiado!' : 'Copiar Link'}</span>
                    </button>

                    <a
                      href={qrCodeDataUrl}
                      download={`QR-${qrModalTable.name.replace(/\s+/g, '-')}.png`}
                      className={`py-2 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${classes.buttonGhost}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar PNG</span>
                    </a>
                  </div>

                  <a
                    href={`/menu?table=${encodeURIComponent(qrModalTable.name)}`}
                    target="_blank"
                    className={`py-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center justify-center gap-1`}
                  >
                    <span>Probar vista de cliente en nueva pestaña</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR MESA INDIVIDUAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
              <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
                {editingTable ? `Editar ${editingTable.name}` : 'Nueva Mesa de Salón'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className={`font-bold block ${classes.textMain}`}>Nombre o Número de Mesa *</label>
                <input
                  type="text"
                  placeholder="Ej: Mesa 1, Barra 2, Terraza A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`font-bold block ${classes.textMain}`}>Capacidad (Personas)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) || 4 })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`font-bold block ${classes.textMain}`}>Área / Zona</label>
                    <button
                      type="button"
                      onClick={() => setShowAreaModal(true)}
                      style={{ color: buttonColor }}
                      className="text-[10px] hover:underline font-bold cursor-pointer"
                    >
                      + Nueva Zona
                    </button>
                  </div>
                  <select
                    value={formData.areaId}
                    onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
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
                <label className={`font-bold flex items-center justify-between ${classes.textMain}`}>
                  <span>Mesero Titular Responsable</span>
                  <span className={`text-[10px] font-normal ${classes.textSub}`}>
                    {tableServiceMode === 'FREE' ? 'Opcional (Modo Libre activo)' : 'Recomendado'}
                  </span>
                </label>
                <select
                  value={formData.assignedWaiterId}
                  onChange={(e) => setFormData({ ...formData, assignedWaiterId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                >
                  <option value="">(Sin mesero asignado - Libre)</option>
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.roles.length > 0 ? `(${w.roles.join(', ')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`pt-2 flex justify-end gap-2 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: activePrimary,
                    color: getContrastTextColor(activePrimary),
                  }}
                  className="px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>Generar Lote de Mesas</h3>
                  <p className={`text-[11px] ${classes.textMuted}`}>Crea múltiples mesas numeradas en 1 clic</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkGenerate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`font-bold block ${classes.textMain}`}>¿Cuántas mesas crear?</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={bulkData.count}
                    onChange={(e) => setBulkData({ ...bulkData, count: Number(e.target.value) || 1 })}
                    required
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`font-bold block ${classes.textMain}`}>Número Inicial</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkData.startNumber}
                    onChange={(e) => setBulkData({ ...bulkData, startNumber: Number(e.target.value) || 1 })}
                    required
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`font-bold block ${classes.textMain}`}>Prefijo de Nombre</label>
                  <input
                    type="text"
                    placeholder="Mesa"
                    value={bulkData.prefix}
                    onChange={(e) => setBulkData({ ...bulkData, prefix: e.target.value })}
                    required
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`font-bold block ${classes.textMain}`}>Capacidad (Comensales)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={bulkData.capacity}
                    onChange={(e) => setBulkData({ ...bulkData, capacity: Number(e.target.value) || 4 })}
                    required
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={`font-bold block ${classes.textMain}`}>Área / Zona de Destino</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkModal(false)
                      setShowAreaModal(true)
                    }}
                    style={{ color: buttonColor }}
                    className="text-[10px] hover:underline font-bold cursor-pointer"
                  >
                    + Nueva Zona
                  </button>
                </div>
                <select
                  value={bulkData.areaId}
                  onChange={(e) => setBulkData({ ...bulkData, areaId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
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
              <div className={`p-3 rounded-2xl border space-y-1 ${classes.subCard}`}>
                <span className={`font-semibold block ${classes.textMain}`}>Previsualización del lote:</span>
                <p className={`text-[11px] ${classes.textMuted}`}>
                  Se generarán: <strong className={isLight ? 'text-[#2B1712]' : 'text-white'}>{bulkData.prefix} {bulkData.startNumber}</strong> hasta{' '}
                  <strong className={isLight ? 'text-[#2B1712]' : 'text-white'}>
                    {bulkData.prefix} {bulkData.startNumber + bulkData.count - 1}
                  </strong>{' '}
                  con capacidad de {bulkData.capacity} comensales.
                </p>
              </div>

              <div className={`pt-2 flex justify-end gap-2 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingBulk}
                  style={{
                    backgroundColor: activePrimary,
                    color: getContrastTextColor(activePrimary),
                  }}
                  className="px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto border ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-3.5 ${classes.divider}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>Zonas y Áreas de Salón</h3>
                  <p className={`text-[11px] ${classes.textMuted}`}>
                    Crea áreas (Terraza, Frente, Salón) y genera sus mesas en un solo clic
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAreaModal(false)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            {/* Formulario de Nueva Área */}
            <form onSubmit={handleSaveArea} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className={`font-bold block ${classes.textMain}`}>
                  Sugerencias rápidas de zonas:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {popularAreaSuggestions.map((item) => {
                    const isSelected = areaFormData.name === item.name
                    return (
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
                        style={
                          isSelected
                            ? {
                                backgroundColor: buttonColor,
                                color: getContrastTextColor(buttonColor),
                                borderColor: buttonColor,
                              }
                            : undefined
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                          isSelected ? 'shadow-xs' : classes.buttonGhost
                        }`}
                      >
                        {item.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className={`font-bold block ${classes.textMain}`}>Nombre del Área / Zona *</label>
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
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                />
              </div>

              {/* Opción de crear mesas automáticamente */}
              <div className={`p-3.5 rounded-2xl border space-y-3 ${classes.subCard}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: buttonColor }} />
                    <span className={`font-bold text-xs ${classes.textMain}`}>
                      ¿Generar mesas automáticamente en esta área?
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={areaFormData.generateTables}
                    onChange={(e) =>
                      setAreaFormData({ ...areaFormData, generateTables: e.target.checked })
                    }
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: buttonColor }}
                  />
                </label>

                {areaFormData.generateTables && (
                  <div className={`space-y-3 pt-2 border-t animate-in fade-in-50 ${classes.divider}`}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={`font-bold block ${classes.textMain}`}>Cantidad de mesas</label>
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
                          className={`w-full px-3 py-1.5 rounded-xl border focus:outline-none ${classes.input}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className={`font-bold block ${classes.textMain}`}>Capacidad por mesa</label>
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
                          className={`w-full px-3 py-1.5 rounded-xl border focus:outline-none ${classes.input}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={`font-bold block ${classes.textMain}`}>Prefijo de las mesas</label>
                        <input
                          type="text"
                          placeholder={areaFormData.name || 'Mesa'}
                          value={areaFormData.prefix}
                          onChange={(e) =>
                            setAreaFormData({ ...areaFormData, prefix: e.target.value })
                          }
                          className={`w-full px-3 py-1.5 rounded-xl border focus:outline-none ${classes.input}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className={`font-bold block ${classes.textMain}`}>Mesero titular (Opcional)</label>
                        <select
                          value={areaFormData.defaultWaiterId}
                          onChange={(e) =>
                            setAreaFormData({
                              ...areaFormData,
                              defaultWaiterId: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-1.5 rounded-xl border focus:outline-none ${classes.input}`}
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

                    <p
                      className={`text-[11px] p-2.5 rounded-xl border ${
                        isLight
                          ? 'bg-amber-50 text-amber-950 border-amber-300'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}
                    >
                      💡 Se creará la zona <strong>{areaFormData.name || 'Nueva'}</strong> con{' '}
                      <strong>{areaFormData.tablesCount} mesas</strong> ({areaFormData.prefix || areaFormData.name || 'Mesa'} 1 a {areaFormData.prefix || areaFormData.name || 'Mesa'}{' '}
                      {areaFormData.tablesCount}) para {areaFormData.capacity} comensales.
                    </p>
                  </div>
                )}
              </div>

              <div className={`flex justify-end gap-2 pt-1 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowAreaModal(false)}
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingArea || !areaFormData.name.trim()}
                  style={{
                    backgroundColor: activePrimary,
                    color: getContrastTextColor(activePrimary),
                  }}
                  className="px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
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
              <div className={`space-y-2 pt-3 border-t ${classes.divider}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider ${classes.textMuted}`}>
                  Áreas existentes ({areas.length})
                </h4>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {areas.map((a) => {
                    const count = tables.filter((t) => t.areaId === a.id).length
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border ${classes.subCard}`}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5" style={{ color: buttonColor }} />
                          <span className={`font-bold text-xs ${classes.textMain}`}>{a.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border ${classes.badge}`}>
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
                            className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer ${classes.buttonGhost}`}
                          >
                            Ver mesas
                          </button>
                          <button
                            type="button"
                            disabled={deletingAreaId === a.id}
                            onClick={() => handleDeleteArea(a.id, a.name)}
                            className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-500 cursor-pointer"
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

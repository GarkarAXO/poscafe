'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  UtensilsCrossed,
  ArrowLeft,
  Plus,
  Search,
  Coffee,
  Flame,
  Salad,
  Cake,
  Edit2,
  Trash2,
  Users,
  Package,
  Layers,
  Sparkles,
  CheckCircle,
  X,
  Loader2,
  Check,
  ShieldCheck,
  MonitorPlay,
  SlidersHorizontal,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { useDashboardTheme } from '@/context/dashboard-theme-context'
import ModalPortal from '@/components/modal-portal'

interface KitchenStation {
  id: string
  name: string
  code: string
  description: string | null
  color: string
  icon: string
  sortOrder: number
  active: boolean
  productsCount: number
  usersCount: number
  assignedUsers: Array<{ id: string; name: string; email: string | null }>
  createdAt: string
  updatedAt: string
}

interface ProductItem {
  id: string
  name: string
  code: string
  category: { id: string; name: string }
  kitchenStationId?: string | null
}

interface UserItem {
  id: string
  name: string
  email: string | null
  roles: Array<{ name: string; code: string }>
}

const PRESET_COLORS = [
  '#3B82F6', // Azul
  '#10B981', // Verde Esmeralda
  '#F97316', // Naranja Fuego
  '#EC4899', // Rosa
  '#8B5CF6', // Púrpura
  '#EAB308', // Ámbar / Dorado
  '#06B6D4', // Cian
  '#EF4444', // Rojo
]

const PRESET_ICONS = [
  { id: 'Coffee', label: 'Bebidas / Café', icon: Coffee },
  { id: 'Flame', label: 'Caliente / Fuego', icon: Flame },
  { id: 'Salad', label: 'Fría / Ensaladas', icon: Salad },
  { id: 'Cake', label: 'Repostería / Postre', icon: Cake },
  { id: 'Utensils', label: 'General / Cocina', icon: UtensilsCrossed },
  { id: 'Package', label: 'Empaque / Barra', icon: Package },
]

export default function KitchenStationsPage() {
  const { isLight, buttonColor, primaryColor, contrastTextButton, classes } = useDashboardTheme()

  const [stations, setStations] = useState<KitchenStation[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modales
  const [stationModalOpen, setStationModalOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<KitchenStation | null>(null)
  const [savingStation, setSavingStation] = useState(false)

  // Formulario Estación
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [icon, setIcon] = useState('Utensils')
  const [sortOrder, setSortOrder] = useState('0')
  const [active, setActive] = useState(true)

  // Modal Asignar Productos
  const [productsModalOpen, setProductsModalOpen] = useState(false)
  const [targetStationForProducts, setTargetStationForProducts] = useState<KitchenStation | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL')
  const [savingProducts, setSavingProducts] = useState(false)

  // Modal Asignar Personal
  const [usersModalOpen, setUsersModalOpen] = useState(false)
  const [targetStationForUsers, setTargetStationForUsers] = useState<KitchenStation | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [savingUsers, setSavingUsers] = useState(false)

  // Bloquear scroll de la página cuando haya modales abiertos
  useEffect(() => {
    const isAnyModalOpen = stationModalOpen || productsModalOpen || usersModalOpen
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [stationModalOpen, productsModalOpen, usersModalOpen])

  // Carga inicial
  const loadData = async () => {
    setLoading(true)
    try {
      const [resStations, resProducts, resUsers] = await Promise.all([
        fetch('/api/kitchen-stations').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
      ])

      if (resStations.success) {
        setStations(resStations.data)
      }
      if (resProducts.success) {
        setProducts(resProducts.data)
      }
      if (resUsers.success) {
        setUsers(resUsers.data)
      }
    } catch {
      notify.error('Error de conexión', 'No se pudieron sincronizar las estaciones de cocina')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Abrir modal de creación/edición de estación
  const handleOpenStationModal = (st?: KitchenStation) => {
    if (st) {
      setEditingStation(st)
      setName(st.name)
      setCode(st.code)
      setDescription(st.description || '')
      setColor(st.color || '#3B82F6')
      setIcon(st.icon || 'Utensils')
      setSortOrder(st.sortOrder.toString())
      setActive(st.active)
    } else {
      setEditingStation(null)
      setName('')
      setCode('')
      setDescription('')
      setColor('#3B82F6')
      setIcon('Utensils')
      setSortOrder(stations.length.toString())
      setActive(true)
    }
    setStationModalOpen(true)
  }

  // Guardar Estación
  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      notify.error('Campo requerido', 'El nombre del área es obligatorio')
      return
    }

    setSavingStation(true)
    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || null,
        color,
        icon,
        sortOrder: parseInt(sortOrder) || 0,
        active,
      }

      const url = editingStation
        ? `/api/kitchen-stations/${editingStation.id}`
        : '/api/kitchen-stations'
      const method = editingStation ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json())

      if (res.success) {
        notify.success(
          editingStation ? 'Área actualizada' : 'Área creada',
          editingStation
            ? `Se actualizó "${name}" exitosamente.`
            : `El área "${name}" está lista para operar.`
        )
        setStationModalOpen(false)
        loadData()
      } else {
        notify.error('Error al guardar', res.error?.message || 'No se pudo guardar el área')
      }
    } catch {
      notify.error('Error de comunicación', 'Verifica tu conexión con el servidor')
    } finally {
      setSavingStation(false)
    }
  }

  // Eliminar Estación
  const handleDeleteStation = async (st: KitchenStation) => {
    if (
      !confirm(
        `¿Eliminar el área "${st.name}"? Los productos asignados pasarán a estar sin estación asignada.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/kitchen-stations/${st.id}`, {
        method: 'DELETE',
      }).then((r) => r.json())

      if (res.success) {
        notify.success('Área eliminada', res.message)
        loadData()
      } else {
        notify.error('Error al eliminar', res.error?.message || 'No se pudo eliminar el área')
      }
    } catch {
      notify.error('Error de comunicación', 'Error al procesar la solicitud')
    }
  }

  // Abrir modal de asignación de productos
  const handleOpenProductsModal = (st: KitchenStation) => {
    setTargetStationForProducts(st)
    const currentAssigned = products
      .filter((p) => p.kitchenStationId === st.id)
      .map((p) => p.id)
    setSelectedProductIds(currentAssigned)
    setProductSearch('')
    setProductCategoryFilter('ALL')
    setProductsModalOpen(true)
  }

  // Guardar asignación de productos
  const handleSaveProducts = async () => {
    if (!targetStationForProducts) return
    setSavingProducts(true)
    try {
      const res = await fetch(`/api/kitchen-stations/${targetStationForProducts.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedProductIds,
        }),
      }).then((r) => r.json())

      if (res.success) {
        notify.success(
          'Preparaciones asignadas',
          `Se asignaron ${selectedProductIds.length} producto(s) a ${targetStationForProducts.name}`
        )
        setProductsModalOpen(false)
        loadData()
      } else {
        notify.error('Error al asignar', res.error?.message || 'No se pudieron asignar los productos')
      }
    } catch {
      notify.error('Error de red', 'No se pudo guardar la asignación')
    } finally {
      setSavingProducts(false)
    }
  }

  // Abrir modal de asignación de personal
  const handleOpenUsersModal = (st: KitchenStation) => {
    setTargetStationForUsers(st)
    const currentAssigned = st.assignedUsers.map((u) => u.id)
    setSelectedUserIds(currentAssigned)
    setUsersModalOpen(true)
  }

  // Guardar asignación de personal
  const handleSaveUsers = async () => {
    if (!targetStationForUsers) return
    setSavingUsers(true)
    try {
      const res = await fetch(`/api/kitchen-stations/${targetStationForUsers.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
        }),
      }).then((r) => r.json())

      if (res.success) {
        notify.success(
          'Personal asignado',
          `Se asignaron ${selectedUserIds.length} colaborador(es) a ${targetStationForUsers.name}`
        )
        setUsersModalOpen(false)
        loadData()
      } else {
        notify.error('Error al asignar', res.error?.message || 'No se pudo asignar el personal')
      }
    } catch {
      notify.error('Error de red', 'No se pudo guardar la asignación')
    } finally {
      setSavingUsers(false)
    }
  }

  // Filtrado de estaciones
  const filteredStations = stations.filter((st) => {
    const q = searchQuery.toLowerCase()
    return (
      st.name.toLowerCase().includes(q) ||
      st.code.toLowerCase().includes(q) ||
      (st.description && st.description.toLowerCase().includes(q))
    )
  })

  // Obtener categorías únicas de productos para el filtro
  const productCategories = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean))
  )

  // Filtrar productos para el modal de asignación
  const modalFilteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase()
    const matchQuery =
      p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q))
    const matchCat =
      productCategoryFilter === 'ALL' || p.category?.name === productCategoryFilter
    return matchQuery && matchCat
  })

  const totalAssignedProducts = stations.reduce((acc, st) => acc + st.productsCount, 0)
  const totalAssignedUsers = new Set(
    stations.flatMap((st) => st.assignedUsers.map((u) => u.id))
  ).size

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8  space-y-6`}>
      {/* Top Navbar unificada con botón hacia Dashboard */}
      <div className={`p-4 sm:p-5 rounded-3xl ${classes.card} shadow-sm backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              isLight
                ? 'bg-[#F3E9DC] hover:bg-[#E8DCC9] border-[#DECEBD] text-[#5E3023]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
            }`}
            title="Volver al Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                <UtensilsCrossed className="w-5 h-5" />
              </span>
              <h1 className={`text-xl sm:text-2xl font-black ${classes.textMain}`}>
                Áreas y Estaciones de Cocina
              </h1>
            </div>
            <p className={`text-xs sm:text-sm ${classes.textMuted} mt-0.5`}>
              Divide tu cocina en estaciones de preparación (Bebidas, Fría, Caliente, etc.) y asigna preparaciones y personal.
            </p>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/kds"
            target="_blank"
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isLight
                ? 'bg-[#F3E9DC] hover:bg-[#E8DCC9] border-[#DECEBD] text-[#5E3023]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
            }`}
          >
            <MonitorPlay className="w-4 h-4 text-emerald-500" />
            <span>Abrir Monitor KDS</span>
          </Link>

          <button
            type="button"
            onClick={() => handleOpenStationModal()}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            style={{
              backgroundColor: buttonColor,
              color: contrastTextButton,
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Área</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-3xl ${classes.card}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${classes.textMuted}`}>Áreas Activas</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-black ${classes.textMain}`}>
              {stations.filter((s) => s.active).length}
            </span>
            <span className={`text-xs ${classes.textMuted} ml-1.5`}>estaciones configuradas</span>
          </div>
        </div>

        <div className={`p-4 rounded-3xl ${classes.card}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${classes.textMuted}`}>Preparaciones Asignadas</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-black ${classes.textMain}`}>
              {totalAssignedProducts}
            </span>
            <span className={`text-xs ${classes.textMuted} ml-1.5`}>de {products.length} productos</span>
          </div>
        </div>

        <div className={`p-4 rounded-3xl ${classes.card}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${classes.textMuted}`}>Personal Asignado</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-black ${classes.textMain}`}>
              {totalAssignedUsers}
            </span>
            <span className={`text-xs ${classes.textMuted} ml-1.5`}>colaboradores de cocina</span>
          </div>
        </div>

        <div className={`p-4 rounded-3xl ${classes.card}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${classes.textMuted}`}>Sincronización KDS</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`text-sm font-bold ${classes.textMain}`}>Tiempo Real Activo</span>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className={`p-4 rounded-3xl ${classes.card} flex items-center gap-3`}>
        <Search className={`w-5 h-5 ${classes.textMuted}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar área por nombre, código o descripción..."
          className={`w-full bg-transparent outline-hidden text-sm ${classes.textMain}`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className={`p-1 rounded-lg ${classes.textMuted} hover:text-white cursor-pointer`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid de Estaciones */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className={`text-xs ${classes.textMuted} mt-2`}>Cargando áreas de cocina...</span>
        </div>
      ) : filteredStations.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl ${classes.card}`}>
          <UtensilsCrossed className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className={`text-base font-bold ${classes.textMain}`}>No se encontraron áreas de cocina</h3>
          <p className={`text-xs ${classes.textMuted} mt-1 max-w-sm mx-auto`}>
            {searchQuery
              ? 'Intenta con otro término de búsqueda.'
              : 'Comienza creando la primera estación como Bebidas, Cocina Fría o Cocina Caliente.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => handleOpenStationModal()}
              className="mt-4 px-4 py-2 rounded-2xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: buttonColor, color: contrastTextButton }}
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primera Área</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStations.map((st) => {
            const IconComponent =
              PRESET_ICONS.find((i) => i.id === st.icon)?.icon || UtensilsCrossed

            return (
              <div
                key={st.id}
                className={`rounded-3xl ${classes.card} overflow-hidden shadow-xs flex flex-col justify-between transition-all hover:shadow-md`}
              >
                <div>
                  {/* Banner de color superior */}
                  <div
                    className="h-2.5 w-full"
                    style={{ backgroundColor: st.color || '#3B82F6' }}
                  />

                  <div className="p-5">
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                          style={{
                            backgroundColor: `${st.color || '#3B82F6'}20`,
                            color: st.color || '#3B82F6',
                          }}
                        >
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`text-base font-bold ${classes.textMain}`}>
                              {st.name}
                            </h3>
                            {!st.active && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400">
                                Inactiva
                              </span>
                            )}
                          </div>
                          <span
                            className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block mt-0.5"
                            style={{
                              backgroundColor: `${st.color || '#3B82F6'}15`,
                              color: st.color || '#3B82F6',
                            }}
                          >
                            COD: {st.code}
                          </span>
                        </div>
                      </div>

                      {/* Botones de acción rápida */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenStationModal(st)}
                          className={`p-2 rounded-xl ${classes.subCardHover} ${classes.textMuted} hover:text-white transition-colors cursor-pointer`}
                          title="Editar Área"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStation(st)}
                          className={`p-2 rounded-xl ${classes.subCardHover} text-red-400/70 hover:text-red-400 transition-colors cursor-pointer`}
                          title="Eliminar Área"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Descripción */}
                    {st.description && (
                      <p className={`text-xs ${classes.textMuted} mt-3 line-clamp-2`}>
                        {st.description}
                      </p>
                    )}

                    {/* Estadísticas de la estación */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                      <div
                        onClick={() => handleOpenProductsModal(st)}
                        className={`p-3 rounded-2xl border ${classes.subCardHover} cursor-pointer transition-all ${
                          isLight ? 'bg-[#FDFBF9] border-[#E8DCC9]' : 'bg-black/20 border-white/5'
                        }`}
                        title="Clic para gestionar preparaciones"
                      >
                        <span className={`text-[11px] font-medium block ${classes.textMuted}`}>
                          Preparaciones
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-lg font-black ${classes.textMain}`}>
                            {st.productsCount}
                          </span>
                          <span className="text-[10px] font-bold text-blue-400 hover:underline">
                            Asignar →
                          </span>
                        </div>
                      </div>

                      <div
                        onClick={() => handleOpenUsersModal(st)}
                        className={`p-3 rounded-2xl border ${classes.subCardHover} cursor-pointer transition-all ${
                          isLight ? 'bg-[#FDFBF9] border-[#E8DCC9]' : 'bg-black/20 border-white/5'
                        }`}
                        title="Clic para gestionar personal asignado"
                      >
                        <span className={`text-[11px] font-medium block ${classes.textMuted}`}>
                          Personal de Cocina
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-lg font-black ${classes.textMain}`}>
                            {st.usersCount}
                          </span>
                          <span className="text-[10px] font-bold text-purple-400 hover:underline">
                            Asignar →
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lista rápida de colaboradores asignados */}
                    {st.assignedUsers.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold ${classes.textMuted}`}>
                          Atendido por:
                        </span>
                        {st.assignedUsers.map((u) => (
                          <span
                            key={u.id}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isLight
                                ? 'bg-purple-100 text-purple-900 border-purple-200'
                                : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            }`}
                          >
                            {u.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer de la tarjeta con acciones */}
                <div
                  className={`p-3 border-t flex items-center justify-between gap-2 text-xs ${
                    isLight ? 'bg-[#F3E9DC]/40 border-[#DECEBD]' : 'bg-black/20 border-white/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenProductsModal(st)}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl border font-bold text-center transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-white/80 border-[#DECEBD] text-[#5E3023]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                    }`}
                  >
                    📦 Asignar Productos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenUsersModal(st)}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl border font-bold text-center transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-white/80 border-[#DECEBD] text-[#5E3023]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                    }`}
                  >
                    🧑‍🍳 Asignar Personal
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal 1: Crear / Editar Área de Cocina */}
      {stationModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div
              className={`w-full max-w-lg rounded-3xl ${classes.card} shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    <UtensilsCrossed className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className={`text-base font-bold ${classes.textMain}`}>
                      {editingStation ? 'Editar Área de Cocina' : 'Nueva Área de Cocina'}
                    </h3>
                    <p className={`text-xs ${classes.textMuted}`}>
                      Define la estación de trabajo y su estilo en el monitor KDS.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStationModalOpen(false)}
                  className={`p-2 rounded-xl ${classes.subCardHover} ${classes.textMuted} hover:text-white cursor-pointer`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStation} className="p-5 space-y-4">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${classes.textMain}`}>
                    Nombre del Área *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Cocina Caliente, Bebidas y Barista, Cocina Fría..."
                    className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm outline-hidden ${
                      isLight
                        ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                        : 'bg-slate-900 border-white/10 text-white'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-bold block mb-1 ${classes.textMain}`}>
                      Código Identificador
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Ej: CALIENTE"
                      className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm font-mono outline-hidden ${
                        isLight
                          ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                          : 'bg-slate-900 border-white/10 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-xs font-bold block mb-1 ${classes.textMain}`}>
                      Orden de Visualización
                    </label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm outline-hidden ${
                        isLight
                          ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                          : 'bg-slate-900 border-white/10 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-bold block mb-1 ${classes.textMain}`}>
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej: Crepas, paninis, sandwiches, plancha y desayunos calientes..."
                    className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm outline-hidden ${
                      isLight
                        ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                        : 'bg-slate-900 border-white/10 text-white'
                    }`}
                  />
                </div>

                {/* Selector de Color Temático */}
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${classes.textMain}`}>
                    Color de Identificación
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                          color === c ? 'scale-110 border-white shadow-md' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded-full border-0 cursor-pointer p-0 bg-transparent"
                      title="Color personalizado"
                    />
                  </div>
                </div>

                {/* Selector de Icono */}
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${classes.textMain}`}>
                    Icono Representativo
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_ICONS.map((item) => {
                      const IconComp = item.icon
                      const isSelected = icon === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setIcon(item.id)}
                          className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                              : isLight
                              ? 'bg-white border-[#DECEBD] text-[#5E3023]'
                              : 'bg-slate-900 border-white/10 text-slate-300'
                          }`}
                        >
                          <IconComp className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Estado Activo */}
                <div className="flex items-center justify-between pt-2">
                  <span className={`text-xs font-bold ${classes.textMain}`}>Área Activa</span>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setStationModalOpen(false)}
                    className={`px-4 py-2.5 rounded-2xl border text-xs font-bold cursor-pointer ${
                      isLight
                        ? 'bg-white border-[#DECEBD] text-[#5E3023]'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingStation}
                    className="px-5 py-2.5 rounded-2xl font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  >
                    {savingStation && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{editingStation ? 'Guardar Cambios' : 'Crear Área'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal 2: Asignación Masiva de Preparaciones / Productos */}
      {productsModalOpen && targetStationForProducts && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div
              className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl ${classes.card} shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="p-2 rounded-xl"
                    style={{
                      backgroundColor: `${targetStationForProducts.color}20`,
                      color: targetStationForProducts.color,
                    }}
                  >
                    <Package className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className={`text-base font-bold ${classes.textMain}`}>
                      Asignar Preparaciones a &quot;{targetStationForProducts.name}&quot;
                    </h3>
                    <p className={`text-xs ${classes.textMuted}`}>
                      Selecciona los productos que se despacharán y prepararán en esta estación.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProductsModalOpen(false)}
                  className={`p-2 rounded-xl ${classes.subCardHover} ${classes.textMuted} hover:text-white cursor-pointer`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filtros de Productos */}
              <div className="p-4 border-b border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex-1 flex items-center gap-2 px-3.5 py-2 rounded-2xl border ${
                      isLight ? 'bg-white border-[#DECEBD]' : 'bg-slate-900 border-white/10'
                    }`}
                  >
                    <Search className={`w-4 h-4 ${classes.textMuted}`} />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Buscar por nombre o código de producto..."
                      className={`w-full bg-transparent outline-hidden text-xs ${classes.textMain}`}
                    />
                  </div>

                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className={`px-3 py-2 rounded-2xl border text-xs outline-hidden cursor-pointer ${
                      isLight
                        ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                        : 'bg-slate-900 border-white/10 text-white'
                    }`}
                  >
                    <option value="ALL">Todas las Categorías</option>
                    {productCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botones de selección rápida */}
                <div className="flex items-center justify-between text-xs">
                  <span className={classes.textMuted}>
                    {selectedProductIds.length} seleccionados de {products.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const idsToAdd = modalFilteredProducts.map((p) => p.id)
                        setSelectedProductIds((prev) => Array.from(new Set([...prev, ...idsToAdd])))
                      }}
                      className="text-orange-400 hover:underline font-bold cursor-pointer"
                    >
                      Seleccionar visibles
                    </button>
                    <span className={classes.textMuted}>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const idsToRemove = new Set(modalFilteredProducts.map((p) => p.id))
                        setSelectedProductIds((prev) => prev.filter((id) => !idsToRemove.has(id)))
                      }}
                      className="text-slate-400 hover:underline font-medium cursor-pointer"
                    >
                      Deseleccionar visibles
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista scrolleable de productos */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {modalFilteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                    <span className={`text-xs ${classes.textMuted}`}>
                      No se encontraron productos coincidentes
                    </span>
                  </div>
                ) : (
                  modalFilteredProducts.map((prod) => {
                    const isSelected = selectedProductIds.includes(prod.id)
                    const otherStation =
                      prod.kitchenStationId &&
                      prod.kitchenStationId !== targetStationForProducts.id
                        ? stations.find((s) => s.id === prod.kitchenStationId)
                        : null

                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          setSelectedProductIds((prev) =>
                            isSelected ? prev.filter((id) => id !== prod.id) : [...prev, prod.id]
                          )
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                            : isLight
                            ? 'bg-white hover:bg-slate-50 border-[#DECEBD] text-[#2B1712]'
                            : 'bg-slate-900/60 hover:bg-slate-900 border-white/5 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : 'border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs block">{prod.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] ${classes.textMuted}`}>
                                Cat: {prod.category?.name || 'General'}
                              </span>
                              {otherStation && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-white/10 text-slate-400">
                                  Actualmente en: {otherStation.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                            isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          {prod.code}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer con Guardar */}
              <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductsModalOpen(false)}
                  className={`px-4 py-2.5 rounded-2xl border text-xs font-bold cursor-pointer ${
                    isLight
                      ? 'bg-white border-[#DECEBD] text-[#5E3023]'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveProducts}
                  disabled={savingProducts}
                  className="px-5 py-2.5 rounded-2xl font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                >
                  {savingProducts && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Guardar Asignación ({selectedProductIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal 3: Asignación de Personal de Cocina */}
      {usersModalOpen && targetStationForUsers && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div
              className={`w-full max-w-lg rounded-3xl ${classes.card} shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="p-2 rounded-xl"
                    style={{
                      backgroundColor: `${targetStationForUsers.color}20`,
                      color: targetStationForUsers.color,
                    }}
                  >
                    <Users className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className={`text-base font-bold ${classes.textMain}`}>
                      Personal Asignado a &quot;{targetStationForUsers.name}&quot;
                    </h3>
                    <p className={`text-xs ${classes.textMuted}`}>
                      Selecciona los colaboradores responsables de preparar los pedidos de esta estación.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUsersModalOpen(false)}
                  className={`p-2 rounded-xl ${classes.subCardHover} ${classes.textMuted} hover:text-white cursor-pointer`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                {users.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                    <span className={`text-xs ${classes.textMuted}`}>
                      No hay colaboradores registrados
                    </span>
                  </div>
                ) : (
                  users.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id)
                    const roleName = u.roles?.map((r) => r.name).join(', ') || 'Sin Rol'

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setSelectedUserIds((prev) =>
                            isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                            : isLight
                            ? 'bg-white hover:bg-slate-50 border-[#DECEBD] text-[#2B1712]'
                            : 'bg-slate-900/60 hover:bg-slate-900 border-white/5 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-purple-500 border-purple-500 text-white'
                                : 'border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs block">{u.name}</span>
                            <span className={`text-[10px] ${classes.textMuted}`}>
                              {roleName} {u.email ? `• ${u.email}` : ''}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-purple-500/20 text-purple-300'
                              : isLight
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          {isSelected ? 'Asignado' : 'Sin asignar'}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUsersModalOpen(false)}
                  className={`px-4 py-2.5 rounded-2xl border text-xs font-bold cursor-pointer ${
                    isLight
                      ? 'bg-white border-[#DECEBD] text-[#5E3023]'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveUsers}
                  disabled={savingUsers}
                  className="px-5 py-2.5 rounded-2xl font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                >
                  {savingUsers && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Guardar Personal ({selectedUserIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

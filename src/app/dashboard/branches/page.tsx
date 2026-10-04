'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Store,
  MapPin,
  Plus,
  ArrowLeft,
  Warehouse,
  Users,
  CreditCard,
  UtensilsCrossed,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Building2,
  Trash2,
  Sparkles,
  Palette,
  Eye,
  Check,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { useDashboardTheme } from '@/context/dashboard-theme-context'
import { getContrastTextColor } from '@/lib/theme-utils'

interface Branch {
  id: string
  name: string
  code: string
  phone: string | null
  email: string | null
  addressLine1: string | null
  city: string | null
  state: string | null
  countryCode: string
  active: boolean
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  buttonColor?: string | null
  bgColor?: string | null
  createdAt: string
  warehouses: Array<{ id: string; name: string; code: string; isDefault: boolean }>
  cashRegisters: Array<{ id: string; name: string; code: string }>
  _count: {
    tables: number
    userBranches: number
  }
}

interface PlanLimit {
  maxBranches: number
  currentBranches: number
  planName: string
}

export default function BranchesManagerPage() {
  const { isLight, buttonColor, primaryColor, classes } = useDashboardTheme()
  const [branches, setBranches] = useState<Branch[]>([])
  const [planLimit, setPlanLimit] = useState<PlanLimit | null>(null)
  const [businessSettings, setBusinessSettings] = useState<{
    multiBranchEnabled: boolean
    canCustomizeColors: boolean
  }>({
    multiBranchEnabled: true,
    canCustomizeColors: true,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal Crear Sucursal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    addressLine1: '',
    city: '',
    state: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Modal Crear Almacén
  const [selectedBranchForWarehouse, setSelectedBranchForWarehouse] = useState<Branch | null>(null)
  const [warehouseData, setWarehouseData] = useState({ name: '', code: '', isDefault: false })
  const [submittingWarehouse, setSubmittingWarehouse] = useState(false)

  // Modal Branding / Personalización de Sucursal
  const [brandingBranch, setBrandingBranch] = useState<Branch | null>(null)
  const [brandingData, setBrandingData] = useState({
    name: '',
    logoUrl: '',
    bgColor: '#14100E',
    primaryColor: '#C08552',
    secondaryColor: '#5E3023',
    buttonColor: '#C08552',
  })
  const [savingBranding, setSavingBranding] = useState(false)

  const openBrandingModal = (branch: Branch) => {
    setBrandingBranch(branch)
    setBrandingData({
      name: branch.name,
      logoUrl: branch.logoUrl || '',
      bgColor: branch.bgColor || '#14100E',
      primaryColor: branch.primaryColor || '#C08552',
      secondaryColor: branch.secondaryColor || '#5E3023',
      buttonColor: branch.buttonColor || '#C08552',
    })
  }

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brandingBranch) return
    setError(null)
    setSavingBranding(true)

    try {
      const res = await fetch(`/api/branches/${brandingBranch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandingData),
      })
      const json = await res.json()
      if (json.success) {
        setBrandingBranch(null)
        notify.success('Identidad guardada', 'Los colores y el logotipo de la sucursal fueron actualizados.')
        fetchBranches()
      } else {
        const errMsg = json.error?.message || 'Error al guardar branding de la sucursal'
        setError(errMsg)
        notify.error('Error al guardar', errMsg)
      }
    } catch {
      setError('Error de comunicación con el servidor')
      notify.error('Error de conexión', 'No se pudo guardar la configuración')
    } finally {
      setSavingBranding(false)
    }
  }

  const fetchBranches = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/branches')
      const json = await res.json()
      if (json.success) {
        setBranches(json.data.branches)
        setPlanLimit(json.data.planLimit)
        if (json.data.settings) {
          setBusinessSettings(json.data.settings)
        }
      } else {
        setError(json.error?.message || 'Error al cargar sucursales')
      }
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  // Crear Sucursal
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const branchName = formData.name

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()

      if (json.success) {
        setShowCreateModal(false)
        notify.success('Sucursal creada', `Se registró la sucursal "${branchName}" exitosamente.`)
        setFormData({ name: '', code: '', phone: '', email: '', addressLine1: '', city: '', state: '' })
        fetchBranches()
      } else {
        const errMsg = json.error?.message || 'Error al crear sucursal'
        setError(errMsg)
        notify.error('Error al crear', errMsg)
      }
    } catch {
      setError('Error de red al crear sucursal')
      notify.error('Error de conexión', 'No fue posible crear la sucursal')
    } finally {
      setSubmitting(false)
    }
  }

  // Crear Almacén
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBranchForWarehouse) return
    setError(null)
    setSubmittingWarehouse(true)

    const whName = warehouseData.name

    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranchForWarehouse.id,
          ...warehouseData,
        }),
      })
      const json = await res.json()

      if (json.success) {
        setSelectedBranchForWarehouse(null)
        notify.success('Almacén creado', `Se ha registrado la bodega "${whName}".`)
        setWarehouseData({ name: '', code: '', isDefault: false })
        fetchBranches()
      } else {
        const errMsg = json.error?.message || 'Error al crear almacén'
        setError(errMsg)
        notify.error('Error al crear almacén', errMsg)
      }
    } catch {
      setError('Error de red al crear almacén')
      notify.error('Error de conexión', 'No fue posible registrar el almacén')
    } finally {
      setSubmittingWarehouse(false)
    }
  }

  // Desactivar Sucursal
  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    notify.action({
      title: `¿Desactivar "${branchName}"?`,
      description: 'La sucursal pasará a estado inactivo y no operará ventas.',
      buttonText: 'Confirmar',
      onAction: async () => {
        try {
          const res = await fetch(`/api/branches/${branchId}`, { method: 'DELETE' })
          const json = await res.json()
          if (json.success) {
            notify.success('Sucursal desactivada', `"${branchName}" fue marcada como inactiva.`)
            fetchBranches()
          } else {
            notify.error('No se pudo desactivar', json.error?.message || 'Error al desactivar')
          }
        } catch {
          notify.error('Error de conexión', 'No fue posible comunicar con el servidor.')
        }
      },
    })
  }

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* Top Navbar */}
      <header className={`px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b ${classes.header}`}>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium border ${classes.buttonGhost}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Dashboard</span>
          </Link>
          <div className={`h-5 w-px ${isLight ? 'bg-[#DECEBD]' : 'bg-white/10'}`} />
          <div>
            <h1 className={`font-bold text-base flex items-center gap-2 ${classes.textMain}`}>
              <Store className="w-5 h-5" style={{ color: buttonColor }} />
              Gestión de Sucursales y Almacenes
            </h1>
            <p className={`text-xs ${classes.textMuted}`}>Control de ubicaciones físicas y bodegas de inventario</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {businessSettings.multiBranchEnabled ? (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setShowCreateModal(true)
              }}
              disabled={planLimit ? planLimit.currentBranches >= planLimit.maxBranches : false}
              style={{
                backgroundColor: buttonColor,
                color: getContrastTextColor(buttonColor),
              }}
              className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sucursal</span>
            </button>
          ) : (
            <span
              className={`text-[11px] px-3 py-1.5 rounded-xl font-bold border ${classes.badge}`}
            >
              Modo Sucursal Única
            </span>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full p-6 sm:p-8 space-y-6 transition-all duration-300">
        {/* Plan Limits Banner */}
        {planLimit && (
          <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${classes.card}`}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border font-bold"
                style={{
                  backgroundColor: `${buttonColor}20`,
                  color: buttonColor,
                  borderColor: `${buttonColor}30`,
                }}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${classes.textMain}`}>
                  {businessSettings.multiBranchEnabled ? 'Capacidad de Sucursales' : 'Sucursal Matriz'}
                </h3>
                <p className={`text-xs ${classes.textMuted}`}>
                  {businessSettings.multiBranchEnabled ? (
                    <>
                      Has configurado <strong>{planLimit.currentBranches}</strong> de <strong>{planLimit.maxBranches}</strong> sucursales permitidas.
                    </>
                  ) : (
                    <>Tu negocio opera con 1 única sucursal activa en la plataforma.</>
                  )}
                </p>
              </div>
            </div>

            {/* Progress Bar (Solo en modo multisucursal) */}
            {businessSettings.multiBranchEnabled && (
              <div className="w-full sm:w-64 space-y-1.5">
                <div className={`h-2 w-full rounded-full overflow-hidden ${isLight ? 'bg-stone-200' : 'bg-slate-800'}`}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (planLimit.currentBranches / planLimit.maxBranches) * 100)}%`,
                      backgroundColor: buttonColor,
                    }}
                  />
                </div>
                <div className={`text-[11px] text-right ${classes.textSub}`}>
                  {planLimit.maxBranches - planLimit.currentBranches > 0
                    ? `${planLimit.maxBranches - planLimit.currentBranches} disponible(s)`
                    : 'Límite alcanzado'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className={`py-20 flex flex-col items-center justify-center space-y-3 ${classes.textMuted}`}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: buttonColor }} />
            <p className="text-xs">Cargando sucursales de tu negocio...</p>
          </div>
        )}

        {/* Branches Grid */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className={`rounded-3xl border p-6 space-y-5 transition-all ${classes.card}`}
              >
                {/* Branch Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs px-2 py-0.5 rounded border font-semibold ${classes.badge}`}>
                        {branch.code}
                      </span>
                      {branch.active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Activa
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${classes.badge}`}>
                          <XCircle className="w-3 h-3" /> Inactiva
                        </span>
                      )}
                    </div>
                    <h3 className={`text-lg font-bold ${classes.textMain}`}>{branch.name}</h3>
                    <p className={`text-xs flex items-center gap-1 ${classes.textMuted}`}>
                      <MapPin className="w-3.5 h-3.5" style={{ color: buttonColor }} />
                      {branch.addressLine1 || 'Sin dirección registrada'}
                      {branch.city ? `, ${branch.city}` : ''}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-xs"
                        style={{ backgroundColor: branch.bgColor || '#020617' }}
                        title="Color de Fondo"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-xs"
                        style={{ backgroundColor: branch.primaryColor || '#7c3aed' }}
                        title="Color Principal"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-xs"
                        style={{ backgroundColor: branch.buttonColor || '#f59e0b' }}
                        title="Color de Botones"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {businessSettings.canCustomizeColors ? (
                      <button
                        type="button"
                        onClick={() => openBrandingModal(branch)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${classes.buttonGhost}`}
                        title="Personalizar logo, colores y nombre de la sucursal"
                      >
                        <Palette className="w-3.5 h-3.5" style={{ color: buttonColor }} />
                        <span>Colores & Logo</span>
                      </button>
                    ) : (
                      <span
                        className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-medium flex items-center gap-1 ${classes.badge}`}
                        title="La identidad de colores es gestionada centralmente por el administrador de la plataforma"
                      >
                        <Palette className="w-3 h-3 opacity-60" />
                        <span>Colores globales</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteBranch(branch.id, branch.name)}
                      className="p-2 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-500 border border-transparent hover:border-red-500/30 transition-all cursor-pointer"
                      title="Desactivar sucursal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Branch Metrics */}
                <div className={`grid grid-cols-3 gap-2 p-3 rounded-2xl border text-center text-xs ${classes.subCard}`}>
                  <div>
                    <span className={`text-[10px] block ${classes.textSub}`}>Cajas</span>
                    <span className={`font-bold flex items-center justify-center gap-1 mt-0.5 ${classes.textMain}`}>
                      <CreditCard className="w-3 h-3" style={{ color: buttonColor }} /> {branch.cashRegisters.length}
                    </span>
                  </div>
                  <div>
                    <span className={`text-[10px] block ${classes.textSub}`}>Mesas</span>
                    <span className={`font-bold flex items-center justify-center gap-1 mt-0.5 ${classes.textMain}`}>
                      <UtensilsCrossed className="w-3 h-3 text-cyan-500" /> {branch._count.tables}
                    </span>
                  </div>
                  <div>
                    <span className={`text-[10px] block ${classes.textSub}`}>Personal</span>
                    <span className={`font-bold flex items-center justify-center gap-1 mt-0.5 ${classes.textMain}`}>
                      <Users className="w-3 h-3 text-violet-500" /> {branch._count.userBranches}
                    </span>
                  </div>
                </div>

                {/* Warehouses list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold flex items-center gap-1.5 ${classes.textMain}`}>
                      <Warehouse className="w-3.5 h-3.5" style={{ color: buttonColor }} />
                      Almacenes de Inventario ({branch.warehouses.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranchForWarehouse(branch)
                        setWarehouseData({
                          name: '',
                          code: `ALM-${branch.code}-${branch.warehouses.length + 1}`,
                          isDefault: false,
                        })
                      }}
                      style={{ color: buttonColor }}
                      className="hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Agregar almacén
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {branch.warehouses.map((wh) => (
                      <div
                        key={wh.id}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs ${classes.subCard}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${classes.badge}`}>
                            {wh.code}
                          </span>
                          <span className={`font-medium ${classes.textMain}`}>{wh.name}</span>
                        </div>
                        {wh.isDefault && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
                            Principal
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL CREAR SUCURSAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 border ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${classes.textMain}`}>Nueva Sucursal</h3>
                  <p className={`text-xs ${classes.textMuted}`}>Se creará con un almacén y una caja por defecto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${classes.textMain}`}>Nombre de Sucursal *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Sucursal Polanco"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${classes.textMain}`}>Código Único *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ej: SUC-POLANCO"
                    className={`w-full px-3 py-2 rounded-xl border font-mono uppercase focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${classes.textMain}`}>Dirección (Calle y Número)</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Ej: Av. Horacio 340"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${classes.textMain}`}>Ciudad</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ej: Ciudad de México"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${classes.textMain}`}>Estado</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Ej: CDMX"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${classes.textMain}`}>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+52 55 ..."
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${classes.textMain}`}>Correo de Contacto</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="polanco@negocio.com"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              <div className={`pt-4 flex justify-end gap-2 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`px-4 py-2 rounded-xl font-medium cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: buttonColor,
                    color: getContrastTextColor(buttonColor),
                  }}
                  className="px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-lg hover:opacity-95 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Crear Sucursal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR ALMACÉN */}
      {selectedBranchForWarehouse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 border ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${classes.textMain}`}>Nuevo Almacén</h3>
                  <p className={`text-[11px] ${classes.textMuted}`}>
                    Sucursal: <strong>{selectedBranchForWarehouse.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBranchForWarehouse(null)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-4 text-xs">
              <div>
                <label className={`block font-bold mb-1 ${classes.textMain}`}>Nombre del Almacén *</label>
                <input
                  type="text"
                  required
                  value={warehouseData.name}
                  onChange={(e) => setWarehouseData({ ...warehouseData, name: e.target.value })}
                  placeholder="Ej: Barra Principal, Bodega Fría, Cava"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${classes.textMain}`}>Código Único *</label>
                <input
                  type="text"
                  required
                  value={warehouseData.code}
                  onChange={(e) => setWarehouseData({ ...warehouseData, code: e.target.value.toUpperCase() })}
                  placeholder="Ej: ALM-BARRA-1"
                  className={`w-full px-3 py-2 rounded-xl border font-mono uppercase focus:outline-none ${classes.input}`}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={warehouseData.isDefault}
                  onChange={(e) => setWarehouseData({ ...warehouseData, isDefault: e.target.checked })}
                  style={{ accentColor: buttonColor }}
                  className="rounded cursor-pointer"
                />
                <label htmlFor="isDefault" className={`cursor-pointer ${classes.textMain}`}>
                  Establecer como almacén principal de la sucursal
                </label>
              </div>

              <div className={`pt-3 flex justify-end gap-2 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setSelectedBranchForWarehouse(null)}
                  className={`px-4 py-2 rounded-xl font-medium cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingWarehouse}
                  style={{
                    backgroundColor: buttonColor,
                    color: getContrastTextColor(buttonColor),
                  }}
                  className="px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-lg hover:opacity-95 cursor-pointer disabled:opacity-50"
                >
                  {submittingWarehouse && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Almacén</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL PERSONALIZAR BRANDING DE SUCURSAL */}
      {brandingBranch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto border ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${classes.textMain}`}>Identidad Visual de Sucursal</h3>
                  <p className={`text-xs ${classes.textMuted}`}>Personaliza colores de interfaz, logo y nombre en la BD</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBrandingBranch(null)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer ${classes.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-4 text-xs">
              {/* Acceso directo al Personalizador Completo de Temas */}
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${classes.subCard}`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" style={{ color: buttonColor }} />
                  <span className={`text-[11px] font-medium leading-snug ${classes.textMain}`}>
                    ¿Buscas paletas prediseñadas o vista previa completa de comandera?
                  </span>
                </div>
                <Link
                  href="/dashboard/theme"
                  style={{
                    backgroundColor: buttonColor,
                    color: getContrastTextColor(buttonColor),
                  }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all shadow-xs hover:opacity-95"
                >
                  Abrir Temas
                </Link>
              </div>

              {/* Nombre y Logo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block font-bold mb-1 ${classes.textMain}`}>Nombre de la Sucursal *</label>
                  <input
                    type="text"
                    required
                    value={brandingData.name}
                    onChange={(e) => setBrandingData({ ...brandingData, name: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1 ${classes.textMain}`}>URL del Logo (Opcional)</label>
                  <input
                    type="url"
                    value={brandingData.logoUrl}
                    onChange={(e) => setBrandingData({ ...brandingData, logoUrl: e.target.value })}
                    placeholder="https://ejemplo.com/logo.png"
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              {/* Colores */}
              <div className={`space-y-3 pt-2 border-t ${classes.divider}`}>
                <span className={`font-bold block uppercase tracking-wider text-[11px] ${classes.textMuted}`}>
                  Paleta de Colores de la Sucursal
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Color de Fondo */}
                  <div className={`p-3 rounded-2xl border space-y-2 ${classes.subCard}`}>
                    <label className={`block font-medium ${classes.textMain}`}>Color de Fondo</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandingData.bgColor}
                        onChange={(e) => setBrandingData({ ...brandingData, bgColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={brandingData.bgColor}
                        onChange={(e) => setBrandingData({ ...brandingData, bgColor: e.target.value })}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] uppercase ${classes.input}`}
                      />
                    </div>
                  </div>

                  {/* Color de Botones / Acento */}
                  <div className={`p-3 rounded-2xl border space-y-2 ${classes.subCard}`}>
                    <label className={`block font-medium ${classes.textMain}`}>Color de Botones / Acento</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandingData.buttonColor}
                        onChange={(e) => setBrandingData({ ...brandingData, buttonColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={brandingData.buttonColor}
                        onChange={(e) => setBrandingData({ ...brandingData, buttonColor: e.target.value })}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] uppercase ${classes.input}`}
                      />
                    </div>
                  </div>

                  {/* Color Principal */}
                  <div className={`p-3 rounded-2xl border space-y-2 ${classes.subCard}`}>
                    <label className={`block font-medium ${classes.textMain}`}>Color Principal (Primario)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandingData.primaryColor}
                        onChange={(e) => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={brandingData.primaryColor}
                        onChange={(e) => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] uppercase ${classes.input}`}
                      />
                    </div>
                  </div>

                  {/* Color Secundario */}
                  <div className={`p-3 rounded-2xl border space-y-2 ${classes.subCard}`}>
                    <label className={`block font-medium ${classes.textMain}`}>Color Secundario</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandingData.secondaryColor}
                        onChange={(e) => setBrandingData({ ...brandingData, secondaryColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={brandingData.secondaryColor}
                        onChange={(e) => setBrandingData({ ...brandingData, secondaryColor: e.target.value })}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] uppercase ${classes.input}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Previsualización en Vivo */}
              <div className={`pt-2 border-t space-y-2 ${classes.divider}`}>
                <span className={`font-medium flex items-center gap-1.5 text-[11px] ${classes.textMuted}`}>
                  <Eye className="w-3.5 h-3.5" style={{ color: buttonColor }} /> Previsualización en Tiempo Real:
                </span>

                <div
                  className="p-5 rounded-2xl border border-black/10 shadow-lg flex items-center justify-between"
                  style={{ backgroundColor: brandingData.bgColor }}
                >
                  <div className="flex items-center gap-3">
                    {brandingData.logoUrl ? (
                      <img
                        src={brandingData.logoUrl}
                        alt="Logo Preview"
                        className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 border border-white/20"
                        onError={(e) => {
                          ;(e.target as any).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
                        style={{ backgroundColor: brandingData.primaryColor }}
                      >
                        {brandingData.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4
                        className="font-bold text-sm"
                        style={{ color: getContrastTextColor(brandingData.bgColor) }}
                      >
                        {brandingData.name}
                      </h4>
                      <p
                        className="text-[10px]"
                        style={{ color: getContrastTextColor(brandingData.bgColor) === '#FFFFFF' ? '#cbd5e1' : '#6b7280' }}
                      >
                        Terminal POS & Comandera
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      backgroundColor: brandingData.buttonColor,
                      color: getContrastTextColor(brandingData.buttonColor),
                    }}
                    className="px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-transform"
                  >
                    Botón de Acción
                  </button>
                </div>
              </div>

              {/* Botones Guardar */}
              <div className={`pt-3 flex justify-end gap-2 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setBrandingBranch(null)}
                  className={`px-4 py-2 rounded-xl font-medium cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBranding}
                  style={{
                    backgroundColor: buttonColor,
                    color: getContrastTextColor(buttonColor),
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-lg hover:opacity-95 cursor-pointer disabled:opacity-50"
                >
                  {savingBranding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Guardar Personalización</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

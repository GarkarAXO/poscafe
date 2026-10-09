'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  Store,
  Layers,
  Users,
  LogOut,
  CheckCircle,
  Plus,
  Search,
  Settings,
  Palette,
  Eye,
  EyeOff,
  Copy,
  Key,
  Check,
  Loader2,
  AlertTriangle,
  Building2,
  UtensilsCrossed,
  MonitorPlay,
  CreditCard,
  Package,
  Sparkles,
  Smartphone,
  QrCode,
  Lock,
  Mail,
  X,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { notify } from '@/lib/notify'

export interface SerializedBusiness {
  id: string
  name: string
  businessType: string
  email: string | null
  ownerName?: string | null
  ownerEmail?: string | null
  active: boolean
  createdAt: string
  branchesCount: number
  branches?: Array<{
    id: string
    name: string
    code: string
    maxStaff: number
  }>
  usersCount: number
  productsCount: number
  settings: {
    logoUrl: string | null
    primaryColor: string | null
    secondaryColor: string | null
    accentColor: string | null
    multiBranchEnabled: boolean
    canCustomizeColors: boolean
    recipesEnabled: boolean
    tablesEnabled: boolean
    waitersEnabled: boolean
    kitchenEnabled: boolean
    cashRegisterEnabled: boolean
    inventoryEnabled: boolean
    digitalMenuEnabled: boolean
  } | null
  subscription: {
    id: string
    planId: string
    status: string
    planName: string
    planCode: string
  } | null
}

export interface SerializedPlan {
  id: string
  code: string
  name: string
  maxBranches: number
  maxUsers: number
}

interface AdminPanelClientProps {
  initialBusinesses: SerializedBusiness[]
  plans: SerializedPlan[]
  adminName: string
}

// Paletas predefinidas para sugerir al Super Admin
const COLOR_PRESETS = [
  { name: 'Café & Ámbar', primary: '#b45309', secondary: '#78350f', accent: '#f59e0b' },
  { name: 'Violeta Tecnológico', primary: '#7c3aed', secondary: '#4f46e5', accent: '#ec4899' },
  { name: 'Esmeralda Matcha', primary: '#059669', secondary: '#065f46', accent: '#10b981' },
  { name: 'Azul Bistro', primary: '#2563eb', secondary: '#1e40af', accent: '#38bdf8' },
  { name: 'Rojo Gourmet', primary: '#dc2626', secondary: '#991b1b', accent: '#f97316' },
  { name: 'Dorado Nocturno', primary: '#d97706', secondary: '#1e293b', accent: '#fbbf24' },
]

export default function AdminPanelClient({
  initialBusinesses,
  plans,
  adminName,
}: AdminPanelClientProps) {
  const [businesses, setBusinesses] = useState<SerializedBusiness[]>(initialBusinesses)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  const initialPlan = plans[0]
  const initialAllowsMulti = (initialPlan?.maxBranches ?? 1) > 1

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
    let pass = ''
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

  // Modales
  const [selectedBusiness, setSelectedBusiness] = useState<SerializedBusiness | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'access' | 'branding' | 'modules'>('info')
  const [savingBusiness, setSavingBusiness] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [editOwnerPassword, setEditOwnerPassword] = useState('')
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [branchesStaff, setBranchesStaff] = useState<Array<{ id: string; name: string; code: string; maxStaff: number }>>([])

  // Modal Nuevo Negocio
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createActiveTab, setCreateActiveTab] = useState<'general' | 'access' | 'branding' | 'modules'>('general')
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{
    businessName: string
    email: string
    password: string
    planName: string
  } | null>(null)

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2500)
      notify.success('Copiado', 'Texto copiado al portapapeles.')
    } catch {
      notify.error('Error', 'No se pudo copiar al portapapeles.')
    }
  }

  // Estado del formulario de edición de tenant
  const [editForm, setEditForm] = useState({
    name: '',
    businessType: 'CAFE',
    active: true,
    planId: '',
    subscriptionStatus: 'ACTIVE',
    settings: {
      logoUrl: '',
      primaryColor: '#7c3aed',
      secondaryColor: '#4f46e5',
      accentColor: '#f59e0b',
      multiBranchEnabled: true,
      canCustomizeColors: true,
      recipesEnabled: true,
      tablesEnabled: true,
      waitersEnabled: true,
      kitchenEnabled: false,
      cashRegisterEnabled: true,
      inventoryEnabled: true,
      digitalMenuEnabled: true,
    },
  })

  // Modal Nuevo Negocio
  const [createForm, setCreateForm] = useState({
    name: '',
    businessType: 'CAFE',
    planId: initialPlan?.id || '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    primaryColor: '#7c3aed',
    secondaryColor: '#4f46e5',
    accentColor: '#f59e0b',
    multiBranchEnabled: initialAllowsMulti,
    canCustomizeColors: initialAllowsMulti,
    recipesEnabled: true,
    tablesEnabled: true,
    waitersEnabled: true,
    kitchenEnabled: false,
    cashRegisterEnabled: true,
    inventoryEnabled: true,
    digitalMenuEnabled: true,
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Abrir Modal de Configuración
  const handleOpenConfig = (biz: SerializedBusiness) => {
    setSelectedBusiness(biz)
    setActiveTab('info')
    setModalError(null)
    setSaveSuccessMsg(null)
    setEditOwnerPassword('')
    setBranchesStaff(
      biz.branches ? biz.branches.map((b) => ({ ...b, maxStaff: b.maxStaff ?? 10 })) : []
    )

    setEditForm({
      name: biz.name,
      businessType: biz.businessType,
      active: biz.active,
      planId: biz.subscription?.planId || plans[0]?.id || '',
      subscriptionStatus: biz.subscription?.status || 'ACTIVE',
      settings: {
        logoUrl: biz.settings?.logoUrl || '',
        primaryColor: biz.settings?.primaryColor || '#7c3aed',
        secondaryColor: biz.settings?.secondaryColor || '#4f46e5',
        accentColor: biz.settings?.accentColor || '#f59e0b',
        multiBranchEnabled: Boolean(biz.settings?.multiBranchEnabled),
        canCustomizeColors: Boolean(biz.settings?.canCustomizeColors),
        recipesEnabled: biz.settings?.recipesEnabled ?? true,
        tablesEnabled: biz.settings?.tablesEnabled ?? true,
        waitersEnabled: biz.settings?.waitersEnabled ?? true,
        kitchenEnabled: biz.settings?.kitchenEnabled ?? false,
        cashRegisterEnabled: biz.settings?.cashRegisterEnabled ?? true,
        inventoryEnabled: biz.settings?.inventoryEnabled ?? true,
        digitalMenuEnabled: biz.settings?.digitalMenuEnabled ?? true,
      },
    })
  }

  // Guardar Cambios del Tenant
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBusiness) return

    setSavingBusiness(true)
    setModalError(null)
    setSaveSuccessMsg(null)

    try {
      const payload: any = { ...editForm }
      if (editOwnerPassword.trim()) {
        payload.newOwnerPassword = editOwnerPassword.trim()
      }
      if (branchesStaff.length > 0) {
        payload.branchesStaffLimits = branchesStaff.map((b) => ({
          id: b.id,
          maxStaff: Number(b.maxStaff) || 10,
        }))
      }

      const res = await fetch(`/api/admin/businesses/${selectedBusiness.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (json.success) {
        setSaveSuccessMsg('¡Configuración guardada exitosamente!')
        notify.success('Configuración guardada', 'Los cambios en el negocio se aplicaron correctamente.')
        setEditOwnerPassword('')

        // Actualizar lista local reactiva
        setBusinesses((prev) =>
          prev.map((b) => {
            if (b.id === selectedBusiness.id) {
              const selectedPlanObj = plans.find((p) => p.id === editForm.planId)
              return {
                ...b,
                name: editForm.name,
                businessType: editForm.businessType,
                active: editForm.active,
                settings: {
                  ...b.settings,
                  ...editForm.settings,
                },
                branches: b.branches
                  ? b.branches.map((br) => {
                      const updated = branchesStaff.find((bs) => bs.id === br.id)
                      return updated ? { ...br, maxStaff: Number(updated.maxStaff) || 10 } : br
                    })
                  : b.branches,
                subscription: b.subscription
                  ? {
                      ...b.subscription,
                      planId: editForm.planId,
                      status: editForm.subscriptionStatus,
                      planName: selectedPlanObj?.name || b.subscription.planName,
                      planCode: selectedPlanObj?.code || b.subscription.planCode,
                    }
                  : null,
              }
            }
            return b
          })
        )

        // Limpiar mensaje tras 3 segundos
        setTimeout(() => {
          setSaveSuccessMsg(null)
        }, 3000)
      } else {
        const errMsg = json.error?.message || 'Error al guardar configuración'
        setModalError(errMsg)
        notify.error('Error al guardar', errMsg)
      }
    } catch {
      setModalError('Error de conexión con el servidor')
      notify.error('Error de red', 'No se pudo conectar con el servidor')
    } finally {
      setSavingBusiness(false)
    }
  }

  // Eliminar Negocio
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const executeDelete = async (businessId: string, businessName: string) => {
    setDeletingId(businessId)
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (json.success) {
        setBusinesses((prev) => prev.filter((b) => b.id !== businessId))
        if (selectedBusiness?.id === businessId) {
          setSelectedBusiness(null)
        }
        notify.success('Negocio eliminado', `Se eliminó "${businessName}" y todos sus datos asociados.`)
      } else {
        notify.error('No se pudo eliminar', json.error?.message || 'Error al eliminar el negocio')
      }
    } catch {
      notify.error('Error de red', 'No se pudo conectar con el servidor para eliminar el negocio')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteBusiness = async (businessId: string, businessName: string) => {
    notify.action({
      title: `¿Eliminar "${businessName}"?`,
      description: 'Acción irreversible: eliminará todas las sucursales, usuarios, comandas e inventarios.',
      buttonText: 'Confirmar Eliminación',
      onAction: () => executeDelete(businessId, businessName),
    })
  }

  // Crear Nuevo Tenant
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!createForm.name.trim()) {
      setCreateError('El nombre del negocio es obligatorio')
      setCreateActiveTab('general')
      return
    }
    if (!createForm.ownerEmail.trim()) {
      setCreateError('El correo del dueño es obligatorio')
      setCreateActiveTab('access')
      return
    }
    if (!createForm.ownerPassword || createForm.ownerPassword.length < 6) {
      setCreateError('La contraseña inicial del dueño debe contener al menos 6 caracteres')
      setCreateActiveTab('access')
      return
    }

    setCreating(true)
    setCreateError(null)

    const createdBizName = createForm.name
    const targetPlan = plans.find((p) => p.id === createForm.planId)

    try {
      const res = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const json = await res.json()

      if (json.success) {
        setShowCreateModal(false)
        notify.success('Negocio registrado', `Se creó "${createdBizName}" exitosamente con sucursal matriz y usuario dueño.`)

        setCreatedCredentials({
          businessName: createdBizName,
          email: createForm.ownerEmail.trim(),
          password: createForm.ownerPassword,
          planName: targetPlan?.name || 'Plan Activo',
        })

        const defPlan = plans[0]
        const defAllowsMulti = (defPlan?.maxBranches ?? 1) > 1
        setCreateForm({
          name: '',
          businessType: 'CAFE',
          planId: defPlan?.id || '',
          ownerName: '',
          ownerEmail: '',
          ownerPassword: '',
          primaryColor: '#7c3aed',
          secondaryColor: '#4f46e5',
          accentColor: '#f59e0b',
          multiBranchEnabled: defAllowsMulti,
          canCustomizeColors: defAllowsMulti,
          recipesEnabled: true,
          tablesEnabled: true,
          waitersEnabled: true,
          kitchenEnabled: false,
          cashRegisterEnabled: true,
          inventoryEnabled: true,
          digitalMenuEnabled: true,
        })
        setCreateActiveTab('general')

        // Recargar datos actualizados
        refreshBusinessesList()
      } else {
        const errMsg = json.error?.message || 'Error al registrar nuevo negocio'
        setCreateError(errMsg)
        notify.error('Error al registrar', errMsg)
      }
    } catch {
      setCreateError('Error de red al intentar registrar el negocio')
      notify.error('Error de conexión', 'No se pudo completar el registro del negocio')
    } finally {
      setCreating(false)
    }
  }

  const refreshBusinessesList = async () => {
    try {
      const res = await fetch('/api/admin/businesses')
      const json = await res.json()
      if (json.success && json.data.businesses) {
        const transformed: SerializedBusiness[] = json.data.businesses.map((b: any) => ({
          id: b.id,
          name: b.name,
          businessType: b.businessType,
          email: b.email,
          ownerName: b.users?.[0]?.name || null,
          ownerEmail: b.users?.[0]?.email || b.email,
          active: b.active,
          createdAt: b.createdAt,
          branchesCount: b.branches?.length || 0,
          branches: Array.isArray(b.branches)
            ? b.branches.map((br: any) => ({
                id: br.id,
                name: br.name,
                code: br.code,
                maxStaff: br.maxStaff ?? 10,
              }))
            : [],
          usersCount: b._count?.users || 0,
          productsCount: b._count?.products || 0,
          settings: b.settings
            ? {
                logoUrl: b.settings.logoUrl,
                primaryColor: b.settings.primaryColor,
                secondaryColor: b.settings.secondaryColor,
                accentColor: b.settings.accentColor,
                multiBranchEnabled: Boolean(b.settings.multiBranchEnabled),
                canCustomizeColors: Boolean(b.settings.canCustomizeColors),
                recipesEnabled: Boolean(b.settings.recipesEnabled),
                tablesEnabled: Boolean(b.settings.tablesEnabled),
                waitersEnabled: Boolean(b.settings.waitersEnabled),
                kitchenEnabled: Boolean(b.settings.kitchenEnabled),
                cashRegisterEnabled: Boolean(b.settings.cashRegisterEnabled),
                inventoryEnabled: Boolean(b.settings.inventoryEnabled),
                digitalMenuEnabled: Boolean(b.settings.digitalMenuEnabled),
              }
            : null,
          subscription: b.subscription
            ? {
                id: b.subscription.id,
                planId: b.subscription.planId,
                status: b.subscription.status,
                planName: b.subscription.plan?.name || 'Básico',
                planCode: b.subscription.plan?.code || 'BASIC',
              }
            : null,
        }))
        setBusinesses(transformed)
      }
    } catch (e) {
      console.error('Error al refrescar lista de negocios:', e)
    }
  }

  // Filtrado de negocios
  const filteredBusinesses = businesses.filter((b) => {
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.email && b.email.toLowerCase().includes(search.toLowerCase()))

    const matchPlan =
      filterPlan === 'ALL' || b.subscription?.planCode === filterPlan

    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && b.active) ||
      (filterStatus === 'INACTIVE' && !b.active)

    return matchSearch && matchPlan && matchStatus
  })

  // KPIs
  const totalTenants = businesses.length
  const activeTenants = businesses.filter((b) => b.active).length
  const totalBranches = businesses.reduce((acc, b) => acc + b.branchesCount, 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar Super Admin */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 border border-violet-500/30 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-white">Super Administrador SaaS</h1>
              <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-semibold">
                Control Central
              </span>
            </div>
            <p className="text-xs text-slate-400">Gestión de identidad, módulos y franquicias activas</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCreateError(null)
              setShowCreateModal(true)
            }}
            className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Negocio</span>
          </button>

          <div className="h-6 w-px bg-slate-800"></div>

          <span className="text-xs text-slate-300 font-medium hidden sm:inline">{adminName}</span>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Negocios Registrados</span>
              <Store className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-white">{totalTenants}</p>
              <span className="text-xs text-emerald-400 font-medium">
                ({activeTenants} operativos)
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total de Sucursales</span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{totalBranches}</p>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Planes Disponibles</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{plans.length}</p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar negocio por nombre o correo del dueño..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Todos los Planes</option>
              {plans.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVE">Solo Activos</option>
              <option value="INACTIVE">Solo Inactivos</option>
            </select>
          </div>
        </div>

        {/* Tenants List */}
        <div className="rounded-3xl bg-slate-900/40 border border-slate-800 overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-violet-400" />
              Directorio de Negocios y Franquicias ({filteredBusinesses.length})
            </h2>
            <span className="text-xs text-slate-400">
              Personaliza colores, logotipo y módulos habilitados por negocio
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Negocio & Identidad</th>
                  <th className="p-4">Giro</th>
                  <th className="p-4">Plan SaaS</th>
                  <th className="p-4">Capacidad</th>
                  <th className="p-4">Módulos Habilitados</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No se encontraron negocios con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map((biz) => {
                    const primaryColor = biz.settings?.primaryColor || '#7c3aed'
                    const secondaryColor = biz.settings?.secondaryColor || '#4f46e5'
                    const accentColor = biz.settings?.accentColor || '#f59e0b'

                    return (
                      <tr key={biz.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Negocio & Identidad */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {biz.settings?.logoUrl ? (
                              <img
                                src={biz.settings.logoUrl}
                                alt={biz.name}
                                className="w-10 h-10 rounded-xl object-contain bg-slate-950 border border-slate-800 p-1"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                                style={{
                                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                }}
                              >
                                {biz.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <strong className="text-white text-xs block">{biz.name}</strong>
                              <span className="text-[11px] text-slate-400">{biz.email || 'Sin correo registrado'}</span>
                              <div className="flex items-center gap-1 mt-1">
                                <span
                                  className="w-2.5 h-2.5 rounded-full inline-block border border-slate-700"
                                  style={{ backgroundColor: primaryColor }}
                                  title={`Color Primario: ${primaryColor}`}
                                />
                                <span
                                  className="w-2.5 h-2.5 rounded-full inline-block border border-slate-700"
                                  style={{ backgroundColor: secondaryColor }}
                                  title={`Color Secundario: ${secondaryColor}`}
                                />
                                <span
                                  className="w-2.5 h-2.5 rounded-full inline-block border border-slate-700"
                                  style={{ backgroundColor: accentColor }}
                                  title={`Color Acento: ${accentColor}`}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Giro */}
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium">
                            {biz.businessType}
                          </span>
                        </td>

                        {/* Plan */}
                        <td className="p-4">
                          <span className="font-semibold text-amber-300 text-xs block">
                            {biz.subscription?.planName || 'Sin Plan'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Estado: {biz.subscription?.status || 'ACTIVO'}
                          </span>
                        </td>

                        {/* Capacidad */}
                        <td className="p-4 text-[11px] text-slate-300">
                          <div>
                            <strong>{biz.branchesCount}</strong> sucursales
                          </div>
                          <div className="text-slate-500">
                            {biz.usersCount} usuarios • {biz.productsCount} productos
                          </div>
                        </td>

                        {/* Módulos Habilitados */}
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {biz.settings?.multiBranchEnabled && (
                              <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[9px] font-medium" title="Multisucursal Habilitada">
                                Multisucursal
                              </span>
                            )}
                            {biz.settings?.canCustomizeColors && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-medium" title="Colores por Sucursal">
                                Colores
                              </span>
                            )}
                            {biz.settings?.recipesEnabled && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-medium" title="Recetas e Insumos">
                                Recetario
                              </span>
                            )}
                            {biz.settings?.tablesEnabled && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-medium" title="Control de Mesas">
                                Mesas
                              </span>
                            )}
                            {biz.settings?.kitchenEnabled && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-medium" title="Monitor Cocina KDS">
                                Cocina KDS
                              </span>
                            )}
                            {biz.settings?.cashRegisterEnabled && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-medium" title="Cajas y Arqueos">
                                Arqueos
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="p-4">
                          {biz.active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                              <CheckCircle className="w-3 h-3" /> Operativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold">
                              Bloqueado
                            </span>
                          )}
                        </td>

                        {/* Acción */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenConfig(biz)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-violet-600/20 text-slate-300 hover:text-violet-300 border border-slate-700 hover:border-violet-500/40 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Configurar identidad y módulos"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              <span>Configurar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBusiness(biz.id, biz.name)}
                              disabled={deletingId === biz.id}
                              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition-all cursor-pointer disabled:opacity-50"
                              title={`Eliminar negocio "${biz.name}"`}
                            >
                              {deletingId === biz.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* MODAL MAESTRO DE CONFIGURACIÓN DE TENANT */}
      {/* ========================================================= */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md"
                  style={{
                    backgroundColor: editForm.settings.primaryColor,
                  }}
                >
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Configuración de Negocio: {editForm.name || selectedBusiness.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Control maestro de identidad, colores y módulos habilitados
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBusiness(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas de Navegación del Modal (Segmented Control sin Scroll) */}
            <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-950/40 shrink-0">
              <nav className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'info'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">1. General & Plan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('access')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'access'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">2. Acceso Dueño</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('branding')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'branding'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">3. Identidad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('modules')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'modules'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">4. Módulos</span>
                </button>
              </nav>
            </div>

            {/* Contenido del Formulario */}
            <form onSubmit={handleSaveBusiness} className="flex-1 overflow-y-auto p-6 space-y-6">
              {modalError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* TAB 1: INFORMACIÓN Y PLAN */}
              {activeTab === 'info' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Nombre Comercial del Negocio *
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Giro / Tipo de Establecimiento
                      </label>
                      <select
                        value={editForm.businessType}
                        onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="CAFE">Cafetería de Especialidad</option>
                        <option value="RESTAURANT">Restaurante / Cafetería Bistró</option>
                        <option value="BAKERY">Panadería y Repostería</option>
                        <option value="BAR">Bar y Coctelería</option>
                        <option value="FAST_FOOD">Comida Rápida / Mostrador</option>
                        <option value="OTHER">Otro Giro</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Plan SaaS Asignado *
                      </label>
                      <select
                        value={editForm.planId}
                        onChange={(e) => {
                          const newPlanId = e.target.value
                          const targetPlan = plans.find((p) => p.id === newPlanId)
                          const allowsMulti = targetPlan ? targetPlan.maxBranches > 1 : false
                          setEditForm({
                            ...editForm,
                            planId: newPlanId,
                            settings: {
                              ...editForm.settings,
                              multiBranchEnabled: allowsMulti,
                              canCustomizeColors: allowsMulti ? editForm.settings.canCustomizeColors : false,
                            },
                          })
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.maxBranches > 1 ? `Hasta ${p.maxBranches} sucursales` : '1 sucursal única'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Estado de Suscripción
                      </label>
                      <select
                        value={editForm.subscriptionStatus}
                        onChange={(e) =>
                          setEditForm({ ...editForm, subscriptionStatus: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="ACTIVE">Activo</option>
                        <option value="TRIAL">Periodo de Prueba</option>
                        <option value="SUSPENDED">Suspendido por Pago</option>
                        <option value="CANCELED">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  {/* Estado Activo en Plataforma */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div>
                        <strong className="text-white text-xs block">
                          Estado en la Plataforma
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          Si se desactiva, los usuarios del negocio no podrán acceder al sistema.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.active}
                          onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Límite de Personal por Sucursal */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-3">
                    <div>
                      <strong className="text-white text-xs flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-violet-400" />
                        Límite de Personal por Sucursal (Cupo de Empleados)
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        Define el número máximo de colaboradores activos autorizados para cada sucursal de este negocio.
                      </span>
                    </div>

                    {branchesStaff.length === 0 ? (
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 text-center">
                        Este negocio no tiene sucursales registradas aún.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {branchesStaff.map((branch, idx) => (
                          <div
                            key={branch.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-white block truncate">
                                  {branch.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Código: {branch.code}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <label className="text-[11px] text-slate-400 whitespace-nowrap">
                                Máx. Personal:
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={500}
                                value={branch.maxStaff}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1)
                                  setBranchesStaff((prev) =>
                                    prev.map((b, i) => (i === idx ? { ...b, maxStaff: val } : b))
                                  )
                                }}
                                className="w-20 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
                              />
                              <span className="text-[10px] text-slate-500">colaboradores</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ACCESO Y CONTRASEÑA DEL DUEÑO */}
              {activeTab === 'access' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
                    <Key className="w-4 h-4 shrink-0 text-blue-400" />
                    <span>
                      Gestiona la cuenta de acceso del cliente. Puedes ver su correo registrado y restablecer su contraseña de acceso cuando lo solicite.
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Propietario / Dueño</span>
                        <strong className="text-white text-xs block mt-1">{selectedBusiness.ownerName || 'Dueño Registrado'}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Correo de Inicio de Sesión</span>
                        <div className="flex items-center gap-2 mt-1">
                          <strong className="text-white text-xs">{selectedBusiness.ownerEmail || selectedBusiness.email || 'Sin correo registrado'}</strong>
                          {(selectedBusiness.ownerEmail || selectedBusiness.email) && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedBusiness.ownerEmail || selectedBusiness.email || '', 'edit-owner-email')}
                              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                              title="Copiar correo"
                            >
                              {copiedKey === 'edit-owner-email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-300 font-semibold block">
                          Restablecer Contraseña del Dueño
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditOwnerPassword(generatePassword())}
                          className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Generar contraseña aleatoria
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={showEditPassword ? 'text' : 'password'}
                          value={editOwnerPassword}
                          onChange={(e) => setEditOwnerPassword(e.target.value)}
                          placeholder="Escribe la nueva contraseña para cambiarla (mínimo 6 caracteres)"
                          className="w-full px-3.5 py-2.5 pr-20 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono text-xs"
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                          {editOwnerPassword && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(editOwnerPassword, 'edit-pass')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                              title="Copiar contraseña"
                            >
                              {copiedKey === 'edit-pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowEditPassword(!showEditPassword)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            title={showEditPassword ? 'Ocultar' : 'Mostrar'}
                          >
                            {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1.5 block">
                        Deja este campo vacío si no deseas modificar la contraseña actual. Si ingresas una contraseña, se guardará cifrada al dar clic en &quot;Guardar Cambios&quot;.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BRANDING Y COLORES DEL DASHBOARD */}
              {activeTab === 'branding' && (
                <div className="space-y-5 text-xs">
                  {/* Logo URL */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      URL del Logotipo del Negocio (Opcional)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="url"
                        value={editForm.settings.logoUrl}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            settings: { ...editForm.settings, logoUrl: e.target.value },
                          })
                        }
                        placeholder="https://ejemplo.com/logo.png"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      {editForm.settings.logoUrl && (
                        <img
                          src={editForm.settings.logoUrl}
                          alt="Logo Preview"
                          className="w-10 h-10 rounded-xl object-contain bg-slate-950 border border-slate-800 p-1 shrink-0"
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Aparecerá en el encabezado del dashboard, comandera y terminal POS del cliente.
                    </span>
                  </div>

                  {/* Sugerencias Rápidas de Paletas */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-2">
                      Paletas de Colores Rápidas
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {COLOR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setEditForm({
                              ...editForm,
                              settings: {
                                ...editForm.settings,
                                primaryColor: preset.primary,
                                secondaryColor: preset.secondary,
                                accentColor: preset.accent,
                              },
                            })
                          }}
                          className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-left transition-all cursor-pointer group"
                        >
                          <span className="text-[11px] text-slate-300 font-medium group-hover:text-white truncate">
                            {preset.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: preset.primary }}
                            />
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: preset.secondary }}
                            />
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: preset.accent }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pickers de Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {/* Color Primario */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="block text-slate-300 font-semibold">
                        Color Primario
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editForm.settings.primaryColor}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              settings: { ...editForm.settings, primaryColor: e.target.value },
                            })
                          }
                          className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={editForm.settings.primaryColor}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              settings: { ...editForm.settings, primaryColor: e.target.value },
                            })
                          }
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-white uppercase"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Botones principales y barra lateral
                      </span>
                    </div>

                    {/* Color Secundario */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="block text-slate-300 font-semibold">
                        Color Secundario
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editForm.settings.secondaryColor}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              settings: { ...editForm.settings, secondaryColor: e.target.value },
                            })
                          }
                          className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={editForm.settings.secondaryColor}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              settings: { ...editForm.settings, secondaryColor: e.target.value },
                            })
                          }
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-white uppercase"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Gradientes y elementos secundarios
                      </span>
                    </div>

                    {/* Color de Acento */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="block text-slate-300 font-semibold">
                        Color de Acento
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editForm.settings.accentColor}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              settings: { ...editForm.settings, accentColor: e.target.value },
                            })
                          }
                          className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={editForm.settings.accentColor}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              settings: { ...editForm.settings, accentColor: e.target.value },
                            })
                          }
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-white uppercase"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Destacados, terminal POS y badges
                      </span>
                    </div>
                  </div>

                  {/* Previsualización en Vivo de la Identidad Visual */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Previsualización en Vivo de la Identidad
                    </span>
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {editForm.settings.logoUrl ? (
                          <img
                            src={editForm.settings.logoUrl}
                            alt="Logo preview"
                            className="w-9 h-9 rounded-xl object-contain bg-slate-950 border border-slate-800 p-0.5"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm"
                            style={{
                              backgroundColor: editForm.settings.primaryColor,
                            }}
                          >
                            {editForm.name.charAt(0).toUpperCase() || 'C'}
                          </div>
                        )}
                        <div>
                          <strong className="text-white text-xs block">
                            {editForm.name || 'Nombre del Negocio'}
                          </strong>
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: editForm.settings.accentColor }}
                          >
                            Terminal Activa
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          style={{ backgroundColor: editForm.settings.primaryColor }}
                          className="px-3 py-1.5 rounded-xl text-white font-bold text-[11px] shadow-sm"
                        >
                          Botón Primario
                        </button>
                        <button
                          type="button"
                          style={{
                            borderColor: editForm.settings.accentColor,
                            color: editForm.settings.accentColor,
                          }}
                          className="px-3 py-1.5 rounded-xl border bg-transparent font-semibold text-[11px]"
                        >
                          Acción Acento
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MÓDULOS Y CAPACIDADES HABILITADAS (FEATURE FLAGS SAAS) */}
              {activeTab === 'modules' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      Activa o desactiva módulos según el acuerdo comercial o plan contratado con el cliente.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Switch Multisucursal */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
                            <strong className="text-white text-xs">Modo Multisucursal</strong>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Permite crear múltiples sucursales físicas y almacenes en la plataforma.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={editForm.settings.multiBranchEnabled}
                          onChange={(e) => {
                            const isChecked = e.target.checked
                            let updatedPlanId = editForm.planId
                            if (!isChecked) {
                              const basicPlan = plans.find((p) => p.code === 'BASIC' || p.maxBranches <= 1)
                              if (basicPlan) updatedPlanId = basicPlan.id
                            } else {
                              const currentPlan = plans.find((p) => p.id === editForm.planId)
                              if (!currentPlan || currentPlan.maxBranches <= 1) {
                                const proPlan = plans.find((p) => p.code === 'PRO' || p.maxBranches > 1)
                                if (proPlan) updatedPlanId = proPlan.id
                              }
                            }
                            setEditForm({
                              ...editForm,
                              planId: updatedPlanId,
                              settings: {
                                ...editForm.settings,
                                multiBranchEnabled: isChecked,
                                canCustomizeColors: isChecked ? editForm.settings.canCustomizeColors : false,
                              },
                            })
                          }}
                          className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                        />
                      </div>

                      {!editForm.settings.multiBranchEnabled && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                          <div>
                            <strong>Ajuste a Sucursal Única:</strong> Al desactivar este permiso, el plan se ajusta a Básico (1 sucursal) y todas las sucursales secundarias pasarán a estado inactivo (active: false), manteniendo activa únicamente la sucursal matriz principal.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Switch Colores por Sucursal */}
                    <div className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 ${!editForm.settings.multiBranchEnabled ? 'opacity-50' : ''}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-amber-400 shrink-0" />
                          <strong className="text-white text-xs">Colores por Sucursal</strong>
                          {!editForm.settings.multiBranchEnabled && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Requiere Multisucursal</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Permite que cada sucursal personalice su propio logo y colores independientes.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        disabled={!editForm.settings.multiBranchEnabled}
                        checked={editForm.settings.multiBranchEnabled && editForm.settings.canCustomizeColors}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            settings: {
                              ...editForm.settings,
                              canCustomizeColors: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Switch Recetario e Insumos */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                          <strong className="text-white text-xs">Recetario e Insumos</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Permite costear recetas y descontar materia prima por gramaje o mililitro.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editForm.settings.recipesEnabled}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            settings: {
                              ...editForm.settings,
                              recipesEnabled: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Switch Control de Mesas */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed className="w-4 h-4 text-cyan-400 shrink-0" />
                          <strong className="text-white text-xs">Control de Mesas</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Habilita la administración de zonas, mesas y cuentas abiertas de comensales.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editForm.settings.tablesEnabled}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            settings: {
                              ...editForm.settings,
                              tablesEnabled: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Switch Comandera Móvil para Meseros */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-violet-400 shrink-0" />
                          <strong className="text-white text-xs">Comandera de Meseros</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Habilita la aplicación móvil de comandas para meseros en piso.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editForm.settings.waitersEnabled}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            settings: {
                              ...editForm.settings,
                              waitersEnabled: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-violet-500 focus:ring-violet-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Switch Monitor KDS Cocina */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MonitorPlay className="w-4 h-4 text-rose-400 shrink-0" />
                          <strong className="text-white text-xs">Monitor KDS de Cocina</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Pantalla digital de preparación de pedidos para cocineros y baristas.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editForm.settings.kitchenEnabled}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            settings: {
                              ...editForm.settings,
                              kitchenEnabled: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Switch Cajas y Arqueos */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
                          <strong className="text-white text-xs">Cajas y Arqueos de Turno</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Control de apertura, movimientos en efectivo, retiros y corte de caja.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editForm.settings.cashRegisterEnabled}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            settings: {
                              ...editForm.settings,
                              cashRegisterEnabled: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Switch Inventario y Control de Stock */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-amber-400 shrink-0" />
                          <strong className="text-white text-xs">Inventario y Stock</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Control de existencias de almacén, entradas, transferencias y mermas.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editForm.settings.inventoryEnabled}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            settings: {
                              ...editForm.settings,
                              inventoryEnabled: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Switch Menú Digital QR */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                          <strong className="text-white text-xs">Menú Digital Web / QR</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Catálogo web público con QR para que los clientes consulten el menú.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editForm.settings.digitalMenuEnabled}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            settings: {
                              ...editForm.settings,
                              digitalMenuEnabled: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de Acción del Modal */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBusiness(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs cursor-pointer"
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBusiness(selectedBusiness.id, selectedBusiness.name)}
                    disabled={deletingId === selectedBusiness.id}
                    className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === selectedBusiness.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Eliminar Negocio</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={savingBusiness}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingBusiness && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE ALTA DE NUEVO NEGOCIO / TENANT */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dar de Alta Nuevo Negocio</h3>
                  <p className="text-xs text-slate-400">
                    Crea el tenant con su sucursal matriz, caja y cuenta de acceso del dueño
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas de Navegación del Modal de Creación (Segmented Control sin Scroll) */}
            <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-950/40 shrink-0">
              <nav className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setCreateActiveTab('general')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    createActiveTab === 'general'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">1. General & Plan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateActiveTab('access')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    createActiveTab === 'access'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">2. Acceso Dueño *</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateActiveTab('branding')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    createActiveTab === 'branding'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">3. Identidad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateActiveTab('modules')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    createActiveTab === 'modules'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">4. Módulos</span>
                </button>
              </nav>
            </div>

            {/* Contenido del Formulario de Creación */}
            <form onSubmit={handleCreateBusiness} className="flex-1 overflow-y-auto p-6 space-y-6">
              {createError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* TAB 1: DATOS Y PLAN */}
              {createActiveTab === 'general' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Nombre Comercial del Negocio *
                      </label>
                      <input
                        type="text"
                        required
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="Ej: Cafetería El Rincón"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Giro</label>
                      <select
                        value={createForm.businessType}
                        onChange={(e) => setCreateForm({ ...createForm, businessType: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="CAFE">Cafetería de Especialidad</option>
                        <option value="RESTAURANT">Restaurante / Bistró</option>
                        <option value="BAKERY">Panadería y Repostería</option>
                        <option value="BAR">Bar y Coctelería</option>
                        <option value="FAST_FOOD">Comida Rápida</option>
                        <option value="OTHER">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Plan SaaS Asignado *
                    </label>
                    <select
                      value={createForm.planId}
                      onChange={(e) => {
                        const newPlanId = e.target.value
                        const targetPlan = plans.find((p) => p.id === newPlanId)
                        const allowsMulti = targetPlan ? targetPlan.maxBranches > 1 : false
                        setCreateForm({
                          ...createForm,
                          planId: newPlanId,
                          multiBranchEnabled: allowsMulti,
                          canCustomizeColors: allowsMulti ? createForm.canCustomizeColors : false,
                        })
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.maxBranches > 1 ? `Hasta ${p.maxBranches} sucursales - Multisucursal` : '1 sucursal única'})
                        </option>
                      ))}
                    </select>

                    <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Modalidad de Sucursales inicial:</span>
                      {createForm.multiBranchEnabled ? (
                        <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold text-[10px]">
                          Multisucursal Habilitada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold text-[10px]">
                          Sucursal Única (Solo Matriz)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ACCESO Y CREDENCIALES DEL DUEÑO */}
              {createActiveTab === 'access' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
                    <Key className="w-4 h-4 shrink-0 text-blue-400" />
                    <span>
                      Define las credenciales para que el cliente inicie sesión en la plataforma (<code className="bg-blue-900/40 px-1 py-0.5 rounded">/login</code>).
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Nombre del Propietario / Encargado
                    </label>
                    <input
                      type="text"
                      value={createForm.ownerName}
                      onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                      placeholder="Ej: Carlos Ramírez"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Correo Electrónico (Usuario) *
                      </label>
                      <input
                        type="email"
                        required
                        value={createForm.ownerEmail}
                        onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                        placeholder="dueno@negocio.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-300 font-semibold">
                          Contraseña de Acceso *
                        </label>
                        <button
                          type="button"
                          onClick={() => setCreateForm({ ...createForm, ownerPassword: generatePassword() })}
                          className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Sparkles className="w-3 h-3" /> Generar aleatoria
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={showCreatePassword ? 'text' : 'password'}
                          required
                          value={createForm.ownerPassword}
                          onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full px-3.5 py-2.5 pr-20 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono text-xs"
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                          {createForm.ownerPassword && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(createForm.ownerPassword, 'create-pass')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                              title="Copiar contraseña"
                            >
                              {copiedKey === 'create-pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowCreatePassword(!showCreatePassword)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            title={showCreatePassword ? 'Ocultar' : 'Mostrar'}
                          >
                            {showCreatePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Al registrarse el negocio, podrás copiar estas credenciales para enviarlas por WhatsApp o correo.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: IDENTIDAD VISUAL Y COLORES */}
              {createActiveTab === 'branding' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-2">
                      Paletas de Colores Sugeridas
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {COLOR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCreateForm({
                              ...createForm,
                              primaryColor: preset.primary,
                              secondaryColor: preset.secondary,
                              accentColor: preset.accent,
                            })
                          }}
                          className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-left transition-all cursor-pointer group"
                        >
                          <span className="text-[11px] text-slate-300 font-medium group-hover:text-white truncate">
                            {preset.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.secondary }} />
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accent }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="block text-slate-300 font-semibold">Color Primario</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={createForm.primaryColor}
                          onChange={(e) => setCreateForm({ ...createForm, primaryColor: e.target.value })}
                          className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={createForm.primaryColor}
                          onChange={(e) => setCreateForm({ ...createForm, primaryColor: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-white uppercase"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="block text-slate-300 font-semibold">Color Secundario</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={createForm.secondaryColor}
                          onChange={(e) => setCreateForm({ ...createForm, secondaryColor: e.target.value })}
                          className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={createForm.secondaryColor}
                          onChange={(e) => setCreateForm({ ...createForm, secondaryColor: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-white uppercase"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="block text-slate-300 font-semibold">Color de Acento</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={createForm.accentColor}
                          onChange={(e) => setCreateForm({ ...createForm, accentColor: e.target.value })}
                          className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={createForm.accentColor}
                          onChange={(e) => setCreateForm({ ...createForm, accentColor: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-white uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Previsualización en vivo */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm"
                        style={{ backgroundColor: createForm.primaryColor }}
                      >
                        {createForm.name ? createForm.name.charAt(0).toUpperCase() : 'N'}
                      </div>
                      <div>
                        <strong className="text-white text-xs block">{createForm.name || 'Nombre del Negocio'}</strong>
                        <span className="text-[10px] font-semibold" style={{ color: createForm.accentColor }}>
                          Terminal POS
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{ backgroundColor: createForm.primaryColor }}
                      className="px-3 py-1.5 rounded-xl text-white font-bold text-[11px]"
                    >
                      Botón de Muestra
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: MÓDULOS Y CAPACIDADES HABILITADAS */}
              {createActiveTab === 'modules' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      Selecciona qué módulos SaaS estarán disponibles para el negocio desde su primer día de uso.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Multisucursal */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
                            <strong className="text-white text-xs">Modo Multisucursal</strong>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Habilita crear más sucursales y almacenes vinculados.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={createForm.multiBranchEnabled}
                          onChange={(e) => {
                            const isChecked = e.target.checked
                            let updatedPlanId = createForm.planId
                            if (!isChecked) {
                              const basicPlan = plans.find((p) => p.code === 'BASIC' || p.maxBranches <= 1)
                              if (basicPlan) updatedPlanId = basicPlan.id
                            } else {
                              const currentPlan = plans.find((p) => p.id === createForm.planId)
                              if (!currentPlan || currentPlan.maxBranches <= 1) {
                                const proPlan = plans.find((p) => p.code === 'PRO' || p.maxBranches > 1)
                                if (proPlan) updatedPlanId = proPlan.id
                              }
                            }
                            setCreateForm({
                              ...createForm,
                              planId: updatedPlanId,
                              multiBranchEnabled: isChecked,
                              canCustomizeColors: isChecked ? createForm.canCustomizeColors : false,
                            })
                          }}
                          className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                        />
                      </div>
                      {!createForm.multiBranchEnabled && (
                        <span className="text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                          Sucursal única: Solo operará la matriz principal.
                        </span>
                      )}
                    </div>

                    {/* Colores por Sucursal */}
                    <div className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 ${!createForm.multiBranchEnabled ? 'opacity-50' : ''}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-amber-400 shrink-0" />
                          <strong className="text-white text-xs">Colores por Sucursal</strong>
                          {!createForm.multiBranchEnabled && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Requiere Multisucursal</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Permite a cada sucursal personalizar su logotipo y paleta.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        disabled={!createForm.multiBranchEnabled}
                        checked={createForm.multiBranchEnabled && createForm.canCustomizeColors}
                        onChange={(e) => setCreateForm({ ...createForm, canCustomizeColors: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Recetario e Insumos */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                          <strong className="text-white text-xs">Recetario e Insumos</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Costeo de recetas y deducción de insumos por gramaje/mililitro.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={createForm.recipesEnabled}
                        onChange={(e) => setCreateForm({ ...createForm, recipesEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Control de Mesas */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed className="w-4 h-4 text-cyan-400 shrink-0" />
                          <strong className="text-white text-xs">Control de Mesas</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Gestión de salones, mesas y apertura de cuentas abiertas.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={createForm.tablesEnabled}
                        onChange={(e) => setCreateForm({ ...createForm, tablesEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Comandera Meseros */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-violet-400 shrink-0" />
                          <strong className="text-white text-xs">Comandera de Meseros</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          App web móvil para toma de comandas en mesa por meseros.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={createForm.waitersEnabled}
                        onChange={(e) => setCreateForm({ ...createForm, waitersEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-violet-500 focus:ring-violet-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Monitor KDS Cocina */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MonitorPlay className="w-4 h-4 text-rose-400 shrink-0" />
                          <strong className="text-white text-xs">Monitor KDS de Cocina</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Pantalla digital de preparación de pedidos para cocina y barra.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={createForm.kitchenEnabled}
                        onChange={(e) => setCreateForm({ ...createForm, kitchenEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Cajas y Arqueos */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
                          <strong className="text-white text-xs">Cajas y Arqueos</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Control de turnos, efectivo, entradas, retiros y cortes de caja.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={createForm.cashRegisterEnabled}
                        onChange={(e) => setCreateForm({ ...createForm, cashRegisterEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Inventario y Stock */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-amber-400 shrink-0" />
                          <strong className="text-white text-xs">Inventario y Stock</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Control de existencias de almacén, entradas y mermas.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={createForm.inventoryEnabled}
                        onChange={(e) => setCreateForm({ ...createForm, inventoryEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Menú Digital QR */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                          <strong className="text-white text-xs">Menú Digital Web / QR</strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Catálogo web público con QR para consulta de comensales.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={createForm.digitalMenuEnabled}
                        onChange={(e) => setCreateForm({ ...createForm, digitalMenuEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 mt-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botones del Modal de Creación */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  {createActiveTab !== 'modules' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (createActiveTab === 'general') setCreateActiveTab('access')
                        else if (createActiveTab === 'access') setCreateActiveTab('branding')
                        else if (createActiveTab === 'branding') setCreateActiveTab('modules')
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
                    >
                      Siguiente
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Crear Negocio</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMACIÓN Y CREDENCIALES CREADAS */}
      {/* ========================================================= */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¡Negocio Creado Exitosamente!</h3>
                <p className="text-xs text-slate-400">
                  Comparte estas credenciales de acceso con tu cliente
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Negocio</span>
                <strong className="text-white text-sm">{createdCredentials.businessName}</strong>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Usuario / Correo de Acceso</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-slate-200 font-mono text-xs">{createdCredentials.email}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.email, 'cred-email')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    title="Copiar correo"
                  >
                    {copiedKey === 'cred-email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Contraseña Asignada</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                    {createdCredentials.password}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.password, 'cred-pass')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    title="Copiar contraseña"
                  >
                    {copiedKey === 'cred-pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Enlace de Inicio de Sesión</span>
                <span className="text-violet-400 font-mono text-[11px] block mt-0.5">
                  {typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'
                  const message = `¡Hola! Tu cuenta en TuPOS para "${createdCredentials.businessName}" ha sido creada exitosamente.\n\nPuedes acceder desde aquí:\n🔗 URL: ${url}\n👤 Usuario: ${createdCredentials.email}\n🔑 Contraseña: ${createdCredentials.password}\n\n¡Bienvenido!`
                  copyToClipboard(message, 'whatsapp-msg')
                }}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 cursor-pointer"
              >
                {copiedKey === 'whatsapp-msg' ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'whatsapp-msg' ? '¡Mensaje Copiado al Portapapeles!' : 'Copiar Mensaje para Enviar al Cliente'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

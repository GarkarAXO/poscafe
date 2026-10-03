'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Shield,
  Plus,
  ArrowLeft,
  KeyRound,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Pencil,
  Power,
  Trash2,
  Lock,
  Search,
  Building2,
  BadgePercent,
  Gift,
  X,
  CreditCard,
  Package,
  BarChart3,
  Settings,
  UtensilsCrossed,
  Sliders,
  Sparkles,
} from 'lucide-react'
import { notify } from '@/lib/notify'

interface RolePermissions {
  canAccessPOS: boolean
  canManageCatalog: boolean
  canManageInventory: boolean
  canManagePurchases: boolean
  canManageExpenses: boolean
  canManageCashRegisters: boolean
  canViewReports: boolean
  canManageUsers: boolean
  canManageSettings: boolean
  canAuthorizeDiscounts: boolean
  canAuthorizeCourtesies: boolean
  canAuthorizeCancellations: boolean
  canTransferTables: boolean
}

interface RoleItem {
  id: string
  name: string
  code: string
  isSystem: boolean
  isCustomizedSystemRole?: boolean
  businessId: string | null
  userCount: number
  permissions: RolePermissions
}

interface UserItem {
  id: string
  name: string
  email: string | null
  username: string | null
  active: boolean
  hasPin: boolean
  lastLoginAt: string | null
  createdAt: string
  roles: Array<{
    id: string
    name: string
    code: string
    isSystem: boolean
    canAccessPOS: boolean
    canAuthorizeDiscounts: boolean
    canAuthorizeCourtesies: boolean
    canAuthorizeCancellations: boolean
  }>
  branches: Array<{
    id: string
    name: string
    code: string
    isDefault: boolean
  }>
}

interface PlanLimits {
  maxUsers: number
  activeUsers: number
  canAddUser: boolean
  planName: string
}

interface BranchOption {
  id: string
  name: string
  code: string
}

export default function UsersAndRolesPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserItem[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('ALL')

  // Modales
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [savingUser, setSavingUser] = useState(false)

  // Formulario Usuario
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userUsername, setUserUsername] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userPin, setUserPin] = useState('')
  const [userRoleId, setUserRoleId] = useState('')
  const [userBranchIds, setUserBranchIds] = useState<string[]>([])
  const [userDefaultBranchId, setUserDefaultBranchId] = useState('')

  // Modal PIN rápido
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinTargetUser, setPinTargetUser] = useState<UserItem | null>(null)
  const [quickPin, setQuickPin] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  // Modal Rol personalizado
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null)
  const [savingRole, setSavingRole] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [roleCode, setRoleCode] = useState('')
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({
    canAccessPOS: false,
    canManageCatalog: false,
    canManageInventory: false,
    canManagePurchases: false,
    canManageExpenses: false,
    canManageCashRegisters: false,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canAuthorizeDiscounts: false,
    canAuthorizeCourtesies: false,
    canAuthorizeCancellations: false,
    canTransferTables: false,
  })

  // Carga inicial
  const loadData = async () => {
    setLoading(true)
    try {
      const [resUsers, resRoles, resBranches] = await Promise.all([
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/roles').then((r) => r.json()),
        fetch('/api/branches').then((r) => r.json()),
      ])

      if (resUsers.success) {
        setUsers(resUsers.data)
        setPlanLimits(resUsers.planLimits)
      }
      if (resRoles.success) {
        setRoles(resRoles.data)
      }
      if (resBranches.success) {
        const branchList = Array.isArray(resBranches.data?.branches)
          ? resBranches.data.branches
          : Array.isArray(resBranches.data)
          ? resBranches.data
          : []
        setBranches(branchList)
      }
    } catch {
      notify.error('Error de conexión', 'No se pudieron sincronizar el personal y los roles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Abrir modal de usuario
  const openUserModal = (user?: UserItem) => {
    if (user) {
      setEditingUser(user)
      setUserName(user.name)
      setUserEmail(user.email || '')
      setUserUsername(user.username || '')
      setUserPassword('')
      setUserPin('')
      setUserRoleId(user.roles[0]?.id || '')
      setUserBranchIds(Array.isArray(user.branches) ? user.branches.map((b) => b.id) : [])
      const defBranch = user.branches?.find((b) => b.isDefault)?.id || user.branches?.[0]?.id || ''
      setUserDefaultBranchId(defBranch)
    } else {
      if (planLimits && !planLimits.canAddUser) {
        notify.warning(
          'Límite de plan alcanzado',
          `Tu plan ${planLimits.planName} permite hasta ${planLimits.maxUsers} usuarios. Actualiza tu plan para registrar más personal.`
        )
        return
      }
      setEditingUser(null)
      setUserName('')
      setUserEmail('')
      setUserUsername('')
      setUserPassword('')
      setUserPin('')
      setUserRoleId(roles[0]?.id || '')
      const initialBranchIds = Array.isArray(branches) ? branches.map((b) => b.id) : []
      setUserBranchIds(initialBranchIds)
      setUserDefaultBranchId(Array.isArray(branches) && branches[0] ? branches[0].id : '')
    }
    setUserModalOpen(true)
  }

  // Guardar usuario
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userName.trim()) {
      notify.warning('Campo requerido', 'Ingresa el nombre del colaborador')
      return
    }
    if (!userEmail.trim() && !userUsername.trim()) {
      notify.warning('Campo requerido', 'Ingresa al menos un usuario o correo')
      return
    }
    if (!editingUser && (!userPassword || userPassword.length < 6)) {
      notify.warning('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (userPin && !/^\d{4}$/.test(userPin.trim())) {
      notify.warning('PIN inválido', 'El PIN de acceso debe ser de 4 dígitos numéricos')
      return
    }
    if (userBranchIds.length === 0) {
      notify.warning('Sucursal requerida', 'Asigna al menos una sucursal')
      return
    }

    setSavingUser(true)
    try {
      const payload = {
        name: userName.trim(),
        email: userEmail.trim() || null,
        username: userUsername.trim() || null,
        ...(userPassword.trim() ? { password: userPassword.trim() } : {}),
        ...(userPin.trim() ? { pin: userPin.trim() } : {}),
        roleId: userRoleId,
        branchIds: userBranchIds,
        defaultBranchId: userDefaultBranchId,
      }

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        notify.success(
          editingUser ? 'Personal actualizado' : 'Colaborador registrado',
          json.message || 'Los cambios fueron guardados exitosamente.'
        )
        setUserModalOpen(false)
        loadData()
      } else {
        notify.error('No se pudo guardar', json.error?.message || 'Verifica los datos')
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible guardar el colaborador')
    } finally {
      setSavingUser(false)
    }
  }

  // Abrir modal de PIN rápido
  const openPinModal = (user: UserItem) => {
    setPinTargetUser(user)
    setQuickPin('')
    setPinModalOpen(true)
  }

  // Guardar PIN rápido
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinTargetUser) return
    if (quickPin && !/^\d{4}$/.test(quickPin.trim())) {
      notify.warning('PIN inválido', 'El PIN debe ser exactamente de 4 dígitos numéricos')
      return
    }

    setSavingPin(true)
    try {
      const res = await fetch(`/api/users/${pinTargetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: quickPin ? quickPin.trim() : null,
        }),
      })
      const json = await res.json()

      if (json.success) {
        notify.success(
          quickPin ? 'PIN configurado' : 'PIN eliminado',
          quickPin
            ? `Se actualizó el código de acceso rápido para ${pinTargetUser.name}`
            : `Se removió el PIN de ${pinTargetUser.name}`
        )
        setPinModalOpen(false)
        loadData()
      } else {
        notify.error('Error al guardar PIN', json.error?.message)
      }
    } catch {
      notify.error('Error de conexión', 'No fue posible actualizar el PIN')
    } finally {
      setSavingPin(false)
    }
  }

  // Activar / Desactivar Usuario
  const toggleUserStatus = (user: UserItem) => {
    const newStatus = !user.active

    if (!newStatus) {
      notify.action({
        title: `¿Desactivar a ${user.name}?`,
        description: 'El colaborador no podrá iniciar sesión ni acceder al POS.',
        buttonText: 'Confirmar Desactivación',
        onAction: async () => {
          try {
            const res = await fetch(`/api/users/${user.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ active: false }),
            })
            const json = await res.json()
            if (json.success) {
              notify.success('Personal desactivado', `${user.name} ahora está inactivo.`)
              loadData()
            } else {
              notify.error('Error al desactivar', json.error?.message)
            }
          } catch {
            notify.error('Error de conexión', 'No se pudo desactivar el colaborador')
          }
        },
      })
    } else {
      // Activar
      if (planLimits && !planLimits.canAddUser) {
        notify.warning(
          'Límite de plan',
          `Has alcanzado el límite de ${planLimits.maxUsers} usuarios activos en tu plan. Desactiva otro colaborador o actualiza tu plan.`
        )
        return
      }

      fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            notify.success('Personal reactivado', `${user.name} ahora está activo.`)
            loadData()
          } else {
            notify.error('Error', json.error?.message)
          }
        })
        .catch(() => notify.error('Error', 'No se pudo activar el colaborador'))
    }
  }

  // Abrir modal de Rol personalizado
  const openRoleModal = (role?: RoleItem) => {
    if (role) {
      setEditingRole(role)
      setRoleName(role.name)
      setRoleCode(role.code)
      setRolePermissions(role.permissions)
    } else {
      setEditingRole(null)
      setRoleName('')
      setRoleCode('')
      setRolePermissions({
        canAccessPOS: true,
        canManageCatalog: false,
        canManageInventory: false,
        canManagePurchases: false,
        canManageExpenses: false,
        canManageCashRegisters: false,
        canViewReports: false,
        canManageUsers: false,
        canManageSettings: false,
        canAuthorizeDiscounts: false,
        canAuthorizeCourtesies: false,
        canAuthorizeCancellations: false,
        canTransferTables: false,
      })
    }
    setRoleModalOpen(true)
  }

  // Guardar Rol
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleName.trim()) {
      notify.warning('Nombre requerido', 'Ingresa el nombre del rol')
      return
    }

    setSavingRole(true)
    try {
      const payload = {
        name: roleName.trim(),
        code: roleCode.trim() || undefined,
        permissions: rolePermissions,
      }

      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles'
      const method = editingRole ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        notify.success(
          editingRole ? 'Rol actualizado' : 'Rol creado',
          json.message || 'Permisos guardados correctamente'
        )
        setRoleModalOpen(false)
        loadData()
      } else {
        notify.error('Error al guardar rol', json.error?.message)
      }
    } catch {
      notify.error('Error de conexión', 'No se pudo guardar el rol')
    } finally {
      setSavingRole(false)
    }
  }

  // Eliminar o restablecer Rol
  const handleDeleteRole = (role: RoleItem) => {
    const isReset = Boolean(role.isCustomizedSystemRole)
    notify.action({
      title: isReset ? `¿Restablecer permisos de ${role.name}?` : `¿Eliminar rol ${role.name}?`,
      description: isReset
        ? 'Se restaurarán los permisos estándar originales del sistema para este puesto en tu negocio.'
        : 'Esta acción no se puede deshacer. Verifica que ningún usuario lo tenga asignado.',
      buttonText: isReset ? 'Restablecer Valores' : 'Confirmar Eliminación',
      onAction: async () => {
        try {
          const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' })
          const json = await res.json()
          if (json.success) {
            notify.success(
              isReset ? 'Permisos restablecidos' : 'Rol eliminado',
              json.message || 'Operación completada exitosamente.'
            )
            loadData()
          } else {
            notify.error('No se pudo completar', json.error?.message)
          }
        } catch {
          notify.error('Error', 'No fue posible completar la operación')
        }
      },
    })
  }

  // Filtrado de usuarios
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.roles.some((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesBranch =
      branchFilter === 'ALL' || u.branches.some((b) => b.id === branchFilter)

    return matchesSearch && matchesBranch
  })

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Volver al panel principal"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-violet-400" />
              Personal y Roles
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Administra empleados, credenciales, códigos PIN de acceso rápido y permisos de autorización.
          </p>
        </div>

        {/* Indicador de límite de plan */}
        {planLimits && (
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-2xl">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Límite de Personal:</span>
                <span className="font-semibold text-white">
                  {planLimits.activeUsers} / {planLimits.maxUsers}
                </span>
              </div>
              <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    planLimits.activeUsers >= planLimits.maxUsers ? 'bg-amber-400' : 'bg-violet-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (planLimits.activeUsers / planLimits.maxUsers) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
              {planLimits.planName}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Colaboradores ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Roles y Permisos ({roles.length})</span>
        </button>
      </div>

      {/* TAB 1: PERSONAL / EMPLEADOS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Acciones */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar colaborador por nombre, usuario o rol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {branches.length > 1 && (
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-violet-500"
                >
                  <option value="ALL">Todas las sucursales</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={() => openUserModal()}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Colaborador</span>
            </button>
          </div>

          {/* Grid / Lista de Usuarios */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              <p className="text-xs">Cargando personal...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No se encontraron colaboradores</p>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? 'Intenta con otro término de búsqueda.'
                  : 'Comienza registrando a tu personal de cajas, comandas o administración.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => {
                const primaryRole = user.roles[0]
                return (
                  <div
                    key={user.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      user.active
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{user.name}</h3>
                          {!user.active && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Inactivo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {user.username && (
                            <span className="font-mono text-slate-300">@{user.username}</span>
                          )}
                          {user.email && <span>• {user.email}</span>}
                        </div>
                      </div>

                      {/* Badge de Rol */}
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 whitespace-nowrap">
                        {primaryRole?.name || 'Sin Rol'}
                      </span>
                    </div>

                    {/* PIN y Autorizaciones Rápidas */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Código de Acceso (PIN):</span>
                        {user.hasPin ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            PIN Configurado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <XCircle className="w-3.5 h-3.5" />
                            Sin PIN
                          </span>
                        )}
                      </div>

                      {/* Permisos Críticos Destacados */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {primaryRole?.canAuthorizeDiscounts && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                            <BadgePercent className="w-3 h-3" />
                            Descuentos
                          </span>
                        )}
                        {primaryRole?.canAuthorizeCourtesies && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            Cortesías ($0)
                          </span>
                        )}
                        {primaryRole?.canAuthorizeCancellations && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            Cancelaciones
                          </span>
                        )}
                      </div>

                      {/* Sucursales Asignadas */}
                      <div className="text-xs text-slate-400 pt-1">
                        <span className="text-slate-500">Sucursales: </span>
                        {user.branches.map((b) => b.name).join(', ') || 'Sin sucursal'}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openPinModal(user)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Asignar o cambiar PIN de 4 dígitos"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>PIN</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openUserModal(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar colaborador"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(user)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            user.active
                              ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                              : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={user.active ? 'Desactivar colaborador' : 'Activar colaborador'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROLES Y PERMISOS */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-400">
              Configura los permisos de cada puesto. Puedes usar los roles estándar o crear roles a la medida de tu cafetería.
            </p>

            <button
              type="button"
              onClick={() => openRoleModal()}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-violet-600/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Rol</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => (
              <div
                key={role.id}
                className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{role.name}</h3>
                      {role.isSystem ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Plantilla Base
                        </span>
                      ) : role.isCustomizedSystemRole ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <Sliders className="w-3 h-3" />
                          Personalizado
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          Rol Creado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Código: <span className="font-mono text-slate-300">{role.code}</span> •{' '}
                      {role.userCount} colaborador(es) asignado(s)
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openRoleModal(role)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title={role.isSystem ? 'Personalizar permisos de este puesto' : 'Editar permisos del rol'}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={role.isCustomizedSystemRole ? 'Restablecer a permisos estándar de fábrica' : 'Eliminar rol'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Desglose de Permisos */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    {role.permissions.canAccessPOS ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={role.permissions.canAccessPOS ? 'text-slate-200' : 'text-slate-500'}>
                      Terminal POS (Cobro)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canAuthorizeDiscounts ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={role.permissions.canAuthorizeDiscounts ? 'text-slate-200' : 'text-slate-500'}>
                      Autorizar Descuentos
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canAuthorizeCourtesies ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={role.permissions.canAuthorizeCourtesies ? 'text-slate-200' : 'text-slate-500'}>
                      Cuentas sin Cobro ($0)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canAuthorizeCancellations ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={role.permissions.canAuthorizeCancellations ? 'text-slate-200' : 'text-slate-500'}>
                      Cancelaciones
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canManageCashRegisters ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={role.permissions.canManageCashRegisters ? 'text-slate-200' : 'text-slate-500'}>
                      Cajas y Arqueos
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canTransferTables ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={role.permissions.canTransferTables ? 'text-slate-200' : 'text-slate-500'}>
                      Traspaso de Mesas
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canManageCatalog ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={role.permissions.canManageCatalog ? 'text-slate-200' : 'text-slate-500'}>
                      Catálogo y Recetas
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canManageInventory ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={role.permissions.canManageInventory ? 'text-slate-200' : 'text-slate-500'}>
                      Inventario y Stock
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canViewReports ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={role.permissions.canViewReports ? 'text-slate-200' : 'text-slate-500'}>
                      Reportes de Venta
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canManageUsers ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={role.permissions.canManageUsers ? 'text-slate-200' : 'text-slate-500'}>
                      Administrar Personal
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR COLABORADOR */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-400" />
                {editingUser ? 'Editar Colaborador' : 'Nuevo Colaborador'}
              </h2>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ana Lucía Martínez"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Usuario (Login Rápido)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: ana, mesero1"
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="ana@cafeteria.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña de Acceso *'}
                  </label>
                  <input
                    type="password"
                    placeholder={editingUser ? 'Dejar en blanco para conservar' : 'Mínimo 6 caracteres'}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Código PIN (4 dígitos)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="Ej: 1234"
                    value={userPin}
                    onChange={(e) => setUserPin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Para cambio rápido en POS</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rol Asignado *
                </label>
                <select
                  value={userRoleId}
                  onChange={(e) => setUserRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.isSystem ? '(Estándar)' : '(Personalizado)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sucursales */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Sucursales Autorizadas *
                </label>
                <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  {branches.map((b) => {
                    const isChecked = userBranchIds.includes(b.id)
                    return (
                      <label
                        key={b.id}
                        className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded-lg hover:bg-slate-900"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserBranchIds([...userBranchIds, b.id])
                              } else {
                                setUserBranchIds(userBranchIds.filter((id) => id !== b.id))
                              }
                            }}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-0"
                          />
                          <span>{b.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">({b.code})</span>
                        </div>

                        {isChecked && (
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.preventDefault()
                              setUserDefaultBranchId(b.id)
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded transition-all cursor-pointer ${
                              userDefaultBranchId === b.id
                                ? 'bg-violet-600 text-white font-semibold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {userDefaultBranchId === b.id ? 'Por defecto' : 'Hacer principal'}
                          </button>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/20"
                >
                  {savingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingUser ? 'Actualizar' : 'Registrar Colaborador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASIGNAR / CAMBIAR PIN RÁPIDO */}
      {pinModalOpen && pinTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                Código PIN de Acceso
              </h2>
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-400">Colaborador:</p>
                <p className="text-sm font-bold text-white">{pinTargetUser.name}</p>
                <p className="text-xs text-slate-500">
                  Introduce 4 dígitos numéricos para login y autorizaciones rápidas en caja.
                </p>
              </div>

              <div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  placeholder="••••"
                  value={quickPin}
                  onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                {pinTargetUser.hasPin && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickPin('')
                      handleSavePin({ preventDefault: () => {} } as React.FormEvent)
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                  >
                    Remover PIN
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setPinModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPin}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                  >
                    {savingPin && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Guardar PIN</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR ROL PERSONALIZADO */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-400" />
                {editingRole
                  ? editingRole.isSystem
                    ? `Personalizar Permisos: ${editingRole.name}`
                    : `Editar Permisos: ${editingRole.name}`
                  : 'Nuevo Rol Personalizado'}
              </h2>
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-5">
              {editingRole?.isSystem && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Estás personalizando una plantilla base del sistema. Se creará una versión exclusiva con estos permisos para los colaboradores de tu negocio.
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Puesto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Supervisor de Turno"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Código Identificador
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: SUPERVISOR"
                    value={roleCode}
                    disabled={Boolean(editingRole)}
                    onChange={(e) => setRoleCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-violet-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* SECCIÓN 1: AUTORIZACIONES CRÍTICAS DE CAJA */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Autorizaciones Críticas de Caja y Cobro
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canAuthorizeDiscounts}
                      onChange={(e) =>
                        setRolePermissions({
                          ...rolePermissions,
                          canAuthorizeDiscounts: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                    />
                    <span>Autorizar Descuentos (% o $)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canAuthorizeCourtesies}
                      onChange={(e) =>
                        setRolePermissions({
                          ...rolePermissions,
                          canAuthorizeCourtesies: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
                    />
                    <span>Autorizar Cortesías / Sin Cobro ($0)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canAuthorizeCancellations}
                      onChange={(e) =>
                        setRolePermissions({
                          ...rolePermissions,
                          canAuthorizeCancellations: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-rose-500 focus:ring-0"
                    />
                    <span>Autorizar Cancelaciones</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canTransferTables}
                      onChange={(e) =>
                        setRolePermissions({
                          ...rolePermissions,
                          canTransferTables: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
                    />
                    <span>Traspasar Mesas</span>
                  </label>
                </div>
              </div>

              {/* SECCIÓN 2: OPERACIONES DIARIAS */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                  Operaciones Diarias
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canAccessPOS}
                      onChange={(e) =>
                        setRolePermissions({ ...rolePermissions, canAccessPOS: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-violet-600 focus:ring-0"
                    />
                    <span>Acceso al Terminal POS</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canManageCashRegisters}
                      onChange={(e) =>
                        setRolePermissions({
                          ...rolePermissions,
                          canManageCashRegisters: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-violet-600 focus:ring-0"
                    />
                    <span>Cajas, Arqueos y Retiros</span>
                  </label>
                </div>
              </div>

              {/* SECCIÓN 3: ADMINISTRACIÓN Y CATÁLOGO */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Catálogo, Inventarios y Reportes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canManageCatalog}
                      onChange={(e) =>
                        setRolePermissions({
                          ...rolePermissions,
                          canManageCatalog: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-violet-600 focus:ring-0"
                    />
                    <span>Productos y Recetario</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canManageInventory}
                      onChange={(e) =>
                        setRolePermissions({
                          ...rolePermissions,
                          canManageInventory: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-violet-600 focus:ring-0"
                    />
                    <span>Almacenes e Inventarios</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canViewReports}
                      onChange={(e) =>
                        setRolePermissions({
                          ...rolePermissions,
                          canViewReports: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-violet-600 focus:ring-0"
                    />
                    <span>Reportes de Ventas</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canManageUsers}
                      onChange={(e) =>
                        setRolePermissions({
                          ...rolePermissions,
                          canManageUsers: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-violet-600 focus:ring-0"
                    />
                    <span>Administrar Personal</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/20"
                >
                  {savingRole && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingRole ? 'Guardar Cambios' : 'Crear Rol'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

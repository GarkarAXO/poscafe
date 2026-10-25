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
  LayoutDashboard,
  Calendar,
  MonitorPlay,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { useDashboardTheme } from '@/context/dashboard-theme-context'
import ModalPortal from '@/components/modal-portal'

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
  canAccessKDS: boolean
  canManageKitchen: boolean
}

interface RoleItem {
  id: string
  name: string
  code: string
  description?: string | null
  isSystem: boolean
  isCustomizedSystemRole?: boolean
  businessId: string | null
  userCount: number
  permissionCodes?: string[]
  permissions: RolePermissions
}

interface UserItem {
  id: string
  name: string
  email: string | null
  username: string | null
  gender?: string
  age?: number | null
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
    canTransferTables?: boolean
    canAccessKDS?: boolean
    canManageKitchen?: boolean
  }>
  branches: Array<{
    id: string
    name: string
    code: string
    isDefault: boolean
  }>
  kitchenStations?: Array<{
    id: string
    name: string
    code: string
    color: string
    icon: string
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
  const { isLight, buttonColor, primaryColor, contrastTextButton, classes } = useDashboardTheme()
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserItem[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [modulesCatalog, setModulesCatalog] = useState<any[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('ALL')

  // Modales
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userModalStep, setUserModalStep] = useState<1 | 2 | 3>(1)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [savingUser, setSavingUser] = useState(false)

  // Formulario Usuario (RH)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userUsername, setUserUsername] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userPin, setUserPin] = useState('')
  const [userGender, setUserGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [userAge, setUserAge] = useState<string>('')
  const [userRoleId, setUserRoleId] = useState('')
  const [userBranchIds, setUserBranchIds] = useState<string[]>([])
  const [userDefaultBranchId, setUserDefaultBranchId] = useState('')
  const [userKitchenStationIds, setUserKitchenStationIds] = useState<string[]>([])
  const [kitchenStations, setKitchenStations] = useState<any[]>([])

  // Permisos operativos personales para POS y Comandera
  const [userOpAccessPOS, setUserOpAccessPOS] = useState(false)
  const [userOpDiscounts, setUserOpDiscounts] = useState(false)
  const [userOpCancellations, setUserOpCancellations] = useState(false)
  const [userOpCourtesies, setUserOpCourtesies] = useState(false)
  const [userOpTransfers, setUserOpTransfers] = useState(false)

  // Modal PIN rápido
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinTargetUser, setPinTargetUser] = useState<UserItem | null>(null)
  const [quickPin, setQuickPin] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  // Modal Puesto / Rol
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null)
  const [savingRole, setSavingRole] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [roleCode, setRoleCode] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [roleSelectedPerms, setRoleSelectedPerms] = useState<string[]>([])
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
    canAccessKDS: false,
    canManageKitchen: false,
  })

  // Carga inicial
  const loadData = async () => {
    setLoading(true)
    try {
      const [resUsers, resRoles, resBranches, resStations] = await Promise.all([
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/roles').then((r) => r.json()),
        fetch('/api/branches').then((r) => r.json()),
        fetch('/api/kitchen-stations').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      ])

      if (resUsers.success) {
        setUsers(resUsers.data)
        setPlanLimits(resUsers.planLimits)
      }
      if (resRoles.success) {
        setRoles(resRoles.data)
        if (Array.isArray(resRoles.modulesCatalog)) {
          setModulesCatalog(resRoles.modulesCatalog)
        }
      }
      if (resStations.success && Array.isArray(resStations.data)) {
        setKitchenStations(resStations.data)
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

  // Bloquear scroll de la página de fondo cuando cualquier modal esté abierto
  useEffect(() => {
    const isAnyModalOpen = userModalOpen || pinModalOpen || roleModalOpen
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [userModalOpen, pinModalOpen, roleModalOpen])

  // Abrir modal de usuario
  const openUserModal = (user?: UserItem) => {
    setUserModalStep(1)
    if (user) {
      setEditingUser(user)
      setUserName(user.name)
      setUserEmail(user.email || '')
      setUserUsername(user.username || '')
      setUserGender(user.gender === 'FEMALE' ? 'FEMALE' : 'MALE')
      setUserAge(user.age ? String(user.age) : '')
      setUserPassword('')
      setUserPin('')
      const primaryRole = user.roles[0]
      setUserRoleId(primaryRole?.id || (roles[0]?.id || ''))
      setUserBranchIds(Array.isArray(user.branches) ? user.branches.map((b) => b.id) : [])
      const defBranch = user.branches?.find((b) => b.isDefault)?.id || user.branches?.[0]?.id || ''
      setUserDefaultBranchId(defBranch)
      setUserKitchenStationIds(user.kitchenStations?.map((ks) => ks.id) || [])

      // Cargar permisos operativos personales del colaborador
      setUserOpAccessPOS(Boolean(primaryRole?.canAccessPOS))
      setUserOpDiscounts(Boolean(primaryRole?.canAuthorizeDiscounts))
      setUserOpCancellations(Boolean(primaryRole?.canAuthorizeCancellations))
      setUserOpCourtesies(Boolean(primaryRole?.canAuthorizeCourtesies))
      setUserOpTransfers(Boolean(primaryRole?.canTransferTables))
    } else {
      if (planLimits && !planLimits.canAddUser) {
        notify.warning(
          'Límite de colaboradores alcanzado',
          `Esta sucursal permite un máximo de ${planLimits.maxUsers} colaboradores activos. Consulta con el administrador para ampliar el cupo de personal.`
        )
        return
      }
      setEditingUser(null)
      setUserName('')
      setUserEmail('')
      setUserUsername('')
      setUserGender('MALE')
      setUserAge('')
      setUserPassword('')
      setUserPin('')
      const defaultRole = roles[0]
      setUserRoleId(defaultRole?.id || '')
      setUserKitchenStationIds([])
      const initialBranchIds = Array.isArray(branches) ? branches.map((b) => b.id) : []
      setUserBranchIds(initialBranchIds)
      setUserDefaultBranchId(Array.isArray(branches) && branches[0] ? branches[0].id : '')

      // Permisos iniciales según puesto por defecto
      setUserOpAccessPOS(Boolean(defaultRole?.permissions?.canAccessPOS || defaultRole?.permissionCodes?.includes('acceso_pos')))
      setUserOpDiscounts(Boolean(defaultRole?.permissions?.canAuthorizeDiscounts || defaultRole?.permissionCodes?.includes('autorizar_descuentos')))
      setUserOpCancellations(Boolean(defaultRole?.permissions?.canAuthorizeCancellations || defaultRole?.permissionCodes?.includes('autorizar_cancelaciones')))
      setUserOpCourtesies(Boolean(defaultRole?.permissions?.canAuthorizeCourtesies || defaultRole?.permissionCodes?.includes('autorizar_cortesias')))
      setUserOpTransfers(Boolean(defaultRole?.permissions?.canTransferTables || defaultRole?.permissionCodes?.includes('traspaso_mesas')))
    }
    setUserModalOpen(true)
  }

  // Guardar usuario
  const handleSaveUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!userName.trim()) {
      setUserModalStep(1)
      notify.warning('Campo requerido', 'Ingresa el nombre del colaborador')
      return
    }
    if (!editingUser && (!userPin || !/^\d{4}$/.test(userPin.trim()))) {
      setUserModalStep(1)
      notify.warning('PIN requerido', 'Ingresa un PIN numérico de exactamente 4 dígitos')
      return
    }
    if (userPin && !/^\d{4}$/.test(userPin.trim())) {
      setUserModalStep(1)
      notify.warning('PIN inválido', 'El PIN de acceso debe ser de 4 dígitos numéricos')
      return
    }
    if (!userRoleId) {
      setUserModalStep(2)
      notify.warning('Puesto requerido', 'Selecciona un puesto de trabajo para el colaborador')
      return
    }
    if (userBranchIds.length === 0) {
      setUserModalStep(2)
      notify.warning('Sucursal requerida', 'Asigna al menos una sucursal al colaborador')
      return
    }

    setSavingUser(true)
    try {
      const ageNum = userAge ? parseInt(userAge, 10) : null
      const payload = {
        name: userName.trim(),
        email: userEmail.trim() || null,
        username: userUsername.trim() || null,
        gender: userGender,
        age: ageNum && !isNaN(ageNum) && ageNum > 0 ? ageNum : null,
        ...(userPassword.trim() ? { password: userPassword.trim() } : {}),
        ...(userPin.trim() ? { pin: userPin.trim() } : {}),
        roleId: userRoleId,
        branchIds: userBranchIds,
        defaultBranchId: userDefaultBranchId,
        kitchenStationIds: userKitchenStationIds,
        operationalPermissions: {
          canAccessPOS: userOpAccessPOS,
          canAuthorizeDiscounts: userOpDiscounts,
          canAuthorizeCourtesies: userOpCourtesies,
          canAuthorizeCancellations: userOpCancellations,
          canTransferTables: userOpTransfers,
        },
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
          'Límite de colaboradores alcanzado',
          `Has alcanzado el límite de ${planLimits.maxUsers} colaboradores activos en esta sucursal. Desactiva otro colaborador o solicita al administrador aumentar el cupo.`
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

  // Toggle de código de permiso
  const togglePermissionCode = (code: string) => {
    setRoleSelectedPerms((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      setRolePermissions({
        canAccessPOS: next.includes('acceso_pos') || next.includes('acceso_comandera'),
        canManageCatalog: next.includes('gestionar_catalogo'),
        canManageInventory: next.includes('gestionar_inventario'),
        canManagePurchases: next.includes('gestionar_compras'),
        canManageExpenses: next.includes('gestionar_gastos'),
        canManageCashRegisters: next.includes('gestionar_cajas'),
        canViewReports: next.includes('ver_reportes'),
        canManageUsers: next.includes('gestionar_personal'),
        canManageSettings: next.includes('acceso_dashboard') || next.includes('gestionar_configuracion'),
        canAuthorizeDiscounts: next.includes('autorizar_descuentos'),
        canAuthorizeCourtesies: next.includes('autorizar_cortesias'),
        canAuthorizeCancellations: next.includes('autorizar_cancelaciones'),
        canTransferTables: next.includes('traspaso_mesas'),
        canAccessKDS: next.includes('acceso_kds'),
        canManageKitchen: next.includes('gestionar_cocina'),
      })
      return next
    })
  }

  // Activar o desactivar todos los permisos de un módulo
  const toggleModulePermissions = (modulePermCodes: string[]) => {
    setRoleSelectedPerms((prev) => {
      const allActive = modulePermCodes.every((c) => prev.includes(c))
      let next: string[]
      if (allActive) {
        // Desactivar todos
        next = prev.filter((c) => !modulePermCodes.includes(c))
      } else {
        // Activar todos
        const set = new Set([...prev, ...modulePermCodes])
        next = Array.from(set)
      }
      setRolePermissions({
        canAccessPOS: next.includes('acceso_pos') || next.includes('acceso_comandera'),
        canManageCatalog: next.includes('gestionar_catalogo'),
        canManageInventory: next.includes('gestionar_inventario'),
        canManagePurchases: next.includes('gestionar_compras'),
        canManageExpenses: next.includes('gestionar_gastos'),
        canManageCashRegisters: next.includes('gestionar_cajas'),
        canViewReports: next.includes('ver_reportes'),
        canManageUsers: next.includes('gestionar_personal'),
        canManageSettings: next.includes('acceso_dashboard') || next.includes('gestionar_configuracion'),
        canAuthorizeDiscounts: next.includes('autorizar_descuentos'),
        canAuthorizeCourtesies: next.includes('autorizar_cortesias'),
        canAuthorizeCancellations: next.includes('autorizar_cancelaciones'),
        canTransferTables: next.includes('traspaso_mesas'),
        canAccessKDS: next.includes('acceso_kds'),
        canManageKitchen: next.includes('gestionar_cocina'),
      })
      return next
    })
  }

  // Abrir modal de Puesto / Rol
  const openRoleModal = (role?: RoleItem) => {
    if (role) {
      setEditingRole(role)
      setRoleName(role.name)
      setRoleCode(role.code)
      setRoleDescription(role.description || '')

      const initialCodes: string[] = []
      if (role.permissionCodes && role.permissionCodes.length > 0) {
        initialCodes.push(...role.permissionCodes)
      } else {
        if (role.permissions?.canAccessPOS) initialCodes.push('acceso_pos', 'acceso_comandera')
        if (role.permissions?.canAuthorizeDiscounts) initialCodes.push('autorizar_descuentos')
        if (role.permissions?.canAuthorizeCourtesies) initialCodes.push('autorizar_cortesias')
        if (role.permissions?.canAuthorizeCancellations) initialCodes.push('autorizar_cancelaciones')
        if (role.permissions?.canTransferTables) initialCodes.push('traspaso_mesas')
        if (role.permissions?.canAccessKDS) initialCodes.push('acceso_kds')
        if (role.permissions?.canManageKitchen) initialCodes.push('gestionar_cocina')
        if (role.permissions?.canManageCatalog) initialCodes.push('gestionar_catalogo')
        if (role.permissions?.canManageInventory) initialCodes.push('gestionar_inventario')
        if (role.permissions?.canManagePurchases) initialCodes.push('gestionar_compras')
        if (role.permissions?.canManageExpenses) initialCodes.push('gestionar_gastos')
        if (role.permissions?.canManageCashRegisters) initialCodes.push('gestionar_cajas')
        if (role.permissions?.canViewReports) initialCodes.push('ver_reportes')
        if (role.permissions?.canManageUsers) initialCodes.push('gestionar_personal')
        if (role.permissions?.canManageSettings) initialCodes.push('acceso_dashboard', 'gestionar_configuracion')
      }
      setRoleSelectedPerms(initialCodes)

      setRolePermissions({
        canAccessPOS: Boolean(role.permissions?.canAccessPOS),
        canManageCatalog: Boolean(role.permissions?.canManageCatalog),
        canManageInventory: Boolean(role.permissions?.canManageInventory),
        canManagePurchases: Boolean(role.permissions?.canManagePurchases),
        canManageExpenses: Boolean(role.permissions?.canManageExpenses),
        canManageCashRegisters: Boolean(role.permissions?.canManageCashRegisters),
        canViewReports: Boolean(role.permissions?.canViewReports),
        canManageUsers: Boolean(role.permissions?.canManageUsers),
        canManageSettings: Boolean(role.permissions?.canManageSettings),
        canAuthorizeDiscounts: Boolean(role.permissions?.canAuthorizeDiscounts),
        canAuthorizeCourtesies: Boolean(role.permissions?.canAuthorizeCourtesies),
        canAuthorizeCancellations: Boolean(role.permissions?.canAuthorizeCancellations),
        canTransferTables: Boolean(role.permissions?.canTransferTables),
        canAccessKDS: Boolean(role.permissions?.canAccessKDS),
        canManageKitchen: Boolean(role.permissions?.canManageKitchen),
      })
    } else {
      setEditingRole(null)
      setRoleName('')
      setRoleCode('')
      setRoleDescription('')
      setRoleSelectedPerms(['acceso_pos', 'acceso_comandera'])
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
        canAccessKDS: false,
        canManageKitchen: false,
      })
    }
    setRoleModalOpen(true)
  }

  // Guardar Puesto / Rol
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleName.trim()) {
      notify.warning('Nombre requerido', 'Ingresa el nombre del puesto')
      return
    }

    setSavingRole(true)
    try {
      const payload = {
        name: roleName.trim(),
        code: roleCode.trim() || undefined,
        description: roleDescription.trim() || null,
        permissionCodes: roleSelectedPerms,
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
    <div className={`flex-1 flex flex-col w-full max-w-full overflow-x-hidden ${classes.textMain}`}>
      {/* Top Navbar */}
      <header className={`border-b pl-14 sm:pl-16 lg:pl-6 pr-4 sm:pr-6 py-3.5 sm:py-4 flex items-center justify-between sticky top-0 z-30 transition-colors backdrop-blur-md ${classes.header}`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            href="/dashboard"
            className={`hidden lg:inline-flex p-2 rounded-xl border transition-all items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0 active:scale-95 touch-manipulation select-none ${classes.buttonGhost}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className={`hidden lg:block h-5 w-px border-l ${classes.divider} shrink-0`}></div>

          <div className="min-w-0">
            <h1 className={`font-bold text-sm sm:text-base flex items-center gap-1.5 truncate ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" style={{ color: buttonColor }} />
              <span className="inline sm:hidden">RH & Puestos</span>
              <span className="hidden sm:inline">Recursos Humanos (RH)</span>
            </h1>
            <p className={`text-[11px] sm:text-xs truncate hidden sm:block ${classes.textMuted}`}>
              Puestos de trabajo con módulos y permisos, y administración del personal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Botón de carga / sincronización general */}
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 active:scale-95 ${classes.buttonGhost}`}
            title="Actualizar datos de colaboradores y puestos"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={loading ? { color: buttonColor } : undefined} />
            <span className="hidden sm:inline">{loading ? 'Cargando...' : 'Actualizar'}</span>
          </button>

          {/* Indicador de límite de plan en cabecera */}
          {planLimits && (
            <div className={`flex items-center gap-2.5 border px-3 py-1.5 rounded-xl text-xs shrink-0 ${classes.card}`}>
              <span className={`text-[11px] font-semibold hidden md:inline ${classes.textMuted}`}>Cupo Personal:</span>
              <span className={`font-bold text-xs ${classes.textMain}`}>
                {planLimits.activeUsers} / {planLimits.maxUsers}
              </span>
              <div className={`w-16 sm:w-24 h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-[#DECEBD]' : 'bg-slate-800'}`}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    backgroundColor: planLimits.activeUsers >= planLimits.maxUsers ? '#F59E0B' : buttonColor,
                    width: `${Math.min(100, (planLimits.activeUsers / planLimits.maxUsers) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Tabs Principales de RH: 1. Puestos de Trabajo (Padres) y 2. Personal */}
      <div className={`flex items-center gap-2 border-b pb-3 ${classes.divider}`}>
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          style={activeTab === 'roles' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'roles'
              ? 'shadow-lg font-bold'
              : `${classes.buttonGhost} ${classes.textMuted}`
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>1. Puestos de Trabajo ({roles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={activeTab === 'users' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'shadow-lg font-bold'
              : `${classes.buttonGhost} ${classes.textMuted}`
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2. Personal ({users.length})</span>
        </button>
      </div>

      {/* TAB 1: PERSONAL / EMPLEADOS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Acciones */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${classes.textSub}`} />
                <input
                  type="text"
                  placeholder="Buscar colaborador por nombre, usuario o rol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none ${classes.input}`}
                />
              </div>

              {branches.length > 1 && (
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none ${classes.input}`}
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadData()}
                disabled={loading}
                className={`px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 active:scale-95 ${classes.buttonGhost}`}
                title="Recargar lista de colaboradores"
              >
                <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={loading ? { color: buttonColor } : undefined} />
                <span>{loading ? 'Cargando...' : 'Actualizar'}</span>
              </button>

              <button
                type="button"
                onClick={() => openUserModal()}
                style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Colaborador</span>
              </button>
            </div>
          </div>

          {/* Grid / Lista de Usuarios */}
          {loading ? (
            <div className={`p-12 text-center flex flex-col items-center gap-3 ${classes.textMuted}`}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: buttonColor }} />
              <p className="text-xs">Cargando personal...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className={`p-12 rounded-3xl border text-center space-y-3 ${classes.card}`}>
              <Users className={`w-10 h-10 mx-auto ${classes.textSub}`} />
              <p className={`text-sm font-semibold ${classes.textMain}`}>No se encontraron colaboradores</p>
              <p className={`text-xs ${classes.textMuted}`}>
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
                    className={`p-4 sm:p-5 rounded-3xl border transition-all overflow-hidden ${classes.card} ${
                      !user.active ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-sm sm:text-base font-bold truncate ${classes.textMain}`}>
                            {user.name}
                          </h3>
                          {!user.active && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                              Inactivo
                            </span>
                          )}
                        </div>

                        {/* Puesto, Edad y Sexo debajo del nombre */}
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 shrink-0 ${classes.badge}`}>
                            <Shield className="w-3 h-3 opacity-75" />
                            {primaryRole?.name || 'Sin Puesto'}
                          </span>
                          {user.age && (
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1 shrink-0 ${classes.badge}`}>
                              <Calendar className="w-3 h-3 opacity-75" />
                              {user.age} años
                            </span>
                          )}
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1 shrink-0 ${classes.badge}`}>
                            {user.gender === 'FEMALE' ? '👩 Femenino' : '👨 Masculino'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PIN y Autorizaciones Rápidas */}
                    <div className={`mt-4 pt-3 border-t space-y-2 ${classes.divider}`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className={classes.textMuted}>Código de Acceso (PIN):</span>
                        {user.hasPin ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            PIN Configurado
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 ${classes.textSub}`}>
                            <XCircle className="w-3.5 h-3.5" />
                            Sin PIN
                          </span>
                        )}
                      </div>

                      {/* Permisos Críticos Destacados */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {primaryRole?.canAuthorizeDiscounts && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                            <BadgePercent className="w-3 h-3" />
                            Descuentos
                          </span>
                        )}
                        {primaryRole?.canAuthorizeCourtesies && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            Cortesías ($0)
                          </span>
                        )}
                        {primaryRole?.canAuthorizeCancellations && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            Cancelaciones
                          </span>
                        )}
                      </div>

                      {/* Sucursales Asignadas */}
                      <div
                        className={`text-xs pt-1 truncate block ${classes.textMuted}`}
                        title={user.branches.map((b) => b.name).join(', ') || 'Sin sucursal'}
                      >
                        <span className={classes.textSub}>Sucursales: </span>
                        {user.branches.map((b) => b.name).join(', ') || 'Sin sucursal'}
                      </div>

                      {/* Áreas de Cocina Asignadas */}
                      {user.kitchenStations && user.kitchenStations.length > 0 && (
                        <div className="pt-2 flex flex-wrap items-center gap-1.5">
                          <span className={`text-[11px] font-semibold ${classes.textSub} flex items-center gap-1`}>
                            <UtensilsCrossed className="w-3 h-3 text-amber-500" />
                            Cocina:
                          </span>
                          {user.kitchenStations.map((ks) => (
                            <span
                              key={ks.id}
                              style={{
                                backgroundColor: `${ks.color}15`,
                                borderColor: `${ks.color}40`,
                                color: ks.color,
                              }}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md border inline-flex items-center gap-1"
                            >
                              <span>{ks.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${classes.divider}`}>
                      <button
                        type="button"
                        onClick={() => openPinModal(user)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${classes.buttonGhost}`}
                        title="Asignar o cambiar PIN de 4 dígitos"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        <span>PIN</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openUserModal(user)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${classes.buttonGhost}`}
                          title="Editar colaborador"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(user)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${classes.buttonGhost} ${
                            user.active
                              ? 'text-rose-500'
                              : 'text-emerald-500'
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className={`text-xs sm:text-sm ${classes.textMuted}`}>
              Configura los puestos de trabajo del negocio, sus módulos autorizados y permisos de operación.
            </p>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => loadData()}
                disabled={loading}
                className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 active:scale-95 ${classes.buttonGhost}`}
                title="Recargar datos de puestos"
              >
                <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={loading ? { color: buttonColor } : undefined} />
                <span>{loading ? 'Cargando...' : 'Actualizar'}</span>
              </button>

              <button
                type="button"
                onClick={() => openRoleModal()}
                style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                className="px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap hover:opacity-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Puesto</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className={`p-12 text-center flex flex-col items-center gap-3 ${classes.textMuted}`}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: buttonColor }} />
              <p className="text-xs">Cargando puestos de trabajo...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className={`p-12 rounded-3xl border text-center space-y-3 ${classes.card}`}>
              <Shield className={`w-10 h-10 mx-auto ${classes.textSub}`} />
              <p className={`text-sm font-semibold ${classes.textMain}`}>No hay puestos configurados</p>
              <p className={`text-xs ${classes.textMuted}`}>Crea los puestos de trabajo de tu cafetería o restaurante.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => {
              const hasPOS = role.permissions.canAccessPOS || (role.permissionCodes && role.permissionCodes.includes('acceso_pos'))
              const hasComandera = role.permissions.canAccessPOS || (role.permissionCodes && role.permissionCodes.includes('acceso_comandera'))
              const hasKDS = role.permissions.canAccessKDS || (role.permissionCodes && role.permissionCodes.includes('acceso_kds'))
              const hasDashboard =
                role.permissions.canManageSettings ||
                role.permissions.canManageCatalog ||
                role.permissions.canManageInventory ||
                role.permissions.canViewReports ||
                role.permissions.canManageUsers ||
                (role.permissionCodes && role.permissionCodes.includes('acceso_dashboard'))

              return (
                <div
                  key={role.id}
                  className={`p-5 rounded-3xl border space-y-4 ${classes.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-base font-bold ${classes.textMain}`}>{role.name}</h3>
                        {role.isSystem ? (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${classes.badge}`}>
                            <Lock className="w-3 h-3" />
                            Plantilla Base
                          </span>
                        ) : role.isCustomizedSystemRole ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                            <Sliders className="w-3 h-3" />
                            Personalizado
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                            Puesto Propio
                          </span>
                        )}
                      </div>

                      {role.description && (
                        <p className={`text-xs mt-1 ${classes.textMuted}`}>{role.description}</p>
                      )}

                      <p className={`text-xs mt-1 ${classes.textMuted}`}>
                        Código: <span className={`font-mono ${classes.textSub}`}>{role.code}</span> •{' '}
                        {role.userCount} colaborador(es) asignado(s)
                      </p>

                      {/* Badges de Módulos Autorizados */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-2">
                        <span className={`text-[10px] font-semibold uppercase ${classes.textSub}`}>Módulos:</span>
                        {hasPOS && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <CreditCard className="w-2.5 h-2.5" />
                            POS
                          </span>
                        )}
                        {hasComandera && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <UtensilsCrossed className="w-2.5 h-2.5" />
                            Comandera
                          </span>
                        )}
                        {hasKDS && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                            <MonitorPlay className="w-2.5 h-2.5" />
                            KDS
                          </span>
                        )}
                        {hasDashboard && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center gap-1">
                            <LayoutDashboard className="w-2.5 h-2.5" />
                            Dashboard
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openRoleModal(role)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${classes.buttonGhost}`}
                        title={role.isSystem ? 'Personalizar permisos de este puesto' : 'Editar permisos del puesto'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!role.isSystem && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
                          title={role.isCustomizedSystemRole ? 'Restablecer a permisos estándar de fábrica' : 'Eliminar puesto'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                {/* Desglose de Permisos */}
                <div className={`grid grid-cols-2 gap-2 text-xs pt-2 border-t ${classes.divider}`}>
                  <div className="flex items-center gap-2">
                    {role.permissions.canAccessPOS ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canAccessPOS ? classes.textMain : classes.textSub}>
                      Terminal POS (Cobro)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canAuthorizeDiscounts ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canAuthorizeDiscounts ? classes.textMain : classes.textSub}>
                      Autorizar Descuentos
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canAuthorizeCourtesies ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canAuthorizeCourtesies ? classes.textMain : classes.textSub}>
                      Cuentas sin Cobro ($0)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canAuthorizeCancellations ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canAuthorizeCancellations ? classes.textMain : classes.textSub}>
                      Cancelaciones
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canManageCashRegisters ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canManageCashRegisters ? classes.textMain : classes.textSub}>
                      Cajas y Arqueos
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canTransferTables ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canTransferTables ? classes.textMain : classes.textSub}>
                      Traspaso de Mesas
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canManageCatalog ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canManageCatalog ? classes.textMain : classes.textSub}>
                      Catálogo y Recetas
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canManageInventory ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canManageInventory ? classes.textMain : classes.textSub}>
                      Inventario y Stock
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canViewReports ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canViewReports ? classes.textMain : classes.textSub}>
                      Reportes de Venta
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canManageUsers ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canManageUsers ? classes.textMain : classes.textSub}>
                      Administrar Personal
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canAccessKDS ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canAccessKDS ? classes.textMain : classes.textSub}>
                      Monitor KDS Cocina
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.permissions.canManageKitchen ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className={`w-4 h-4 opacity-40 shrink-0 ${classes.textSub}`} />
                    )}
                    <span className={role.permissions.canManageKitchen ? classes.textMain : classes.textSub}>
                      Gestionar Áreas Cocina
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        )}
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR COLABORADOR (FLUJO POR PASOS) */}
      {userModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className={`border rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 my-auto shadow-2xl ${classes.modalContent}`}>
              {/* Header con Título y Cerrar */}
              <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: buttonColor }}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-base sm:text-lg font-bold ${classes.textMain}`}>
                      {editingUser ? 'Editar Colaborador' : 'Nuevo Colaborador'}
                    </h2>
                    <p className={`text-[11px] ${classes.textSub}`}>
                      Paso {userModalStep} de 3 • {userModalStep === 1 ? 'Datos Personales & PIN' : userModalStep === 2 ? 'Puesto & Sucursales' : 'Permisos & Áreas'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className={`p-1.5 rounded-xl cursor-pointer hover:opacity-75 transition-colors ${classes.buttonGhost}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stepper Visual de Pasos */}
              <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs select-none">
                <button
                  type="button"
                  onClick={() => setUserModalStep(1)}
                  className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    userModalStep === 1
                      ? 'bg-[#C08552] text-white shadow-md'
                      : userModalStep > 1
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-black/5 dark:hover:bg-white/5'
                      : `${classes.textSub} hover:bg-black/5 dark:hover:bg-white/5`
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    userModalStep === 1
                      ? 'bg-white/20 text-white'
                      : userModalStep > 1
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-black/10 dark:bg-white/10'
                  }`}>
                    {userModalStep > 1 ? '✓' : '1'}
                  </span>
                  <span className="truncate hidden sm:inline">Datos & PIN</span>
                  <span className="sm:hidden">Datos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!userName.trim()) {
                      notify.warning('Paso 1 incompleto', 'Ingresa primero el nombre del colaborador')
                      return
                    }
                    if (!editingUser && (!userPin || !/^\d{4}$/.test(userPin.trim()))) {
                      notify.warning('Paso 1 incompleto', 'Ingresa el PIN de 4 dígitos')
                      return
                    }
                    setUserModalStep(2)
                  }}
                  className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    userModalStep === 2
                      ? 'bg-[#C08552] text-white shadow-md'
                      : userModalStep > 2
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-black/5 dark:hover:bg-white/5'
                      : `${classes.textSub} hover:bg-black/5 dark:hover:bg-white/5`
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    userModalStep === 2
                      ? 'bg-white/20 text-white'
                      : userModalStep > 2
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-black/10 dark:bg-white/10'
                  }`}>
                    {userModalStep > 2 ? '✓' : '2'}
                  </span>
                  <span className="truncate hidden sm:inline">Puesto & Sucursales</span>
                  <span className="sm:hidden">Puesto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!userName.trim()) {
                      notify.warning('Paso 1 incompleto', 'Ingresa primero el nombre del colaborador')
                      return
                    }
                    if (!editingUser && (!userPin || !/^\d{4}$/.test(userPin.trim()))) {
                      notify.warning('Paso 1 incompleto', 'Ingresa el PIN de 4 dígitos')
                      return
                    }
                    if (!userRoleId || userBranchIds.length === 0) {
                      notify.warning('Paso 2 incompleto', 'Selecciona el puesto y al menos una sucursal')
                      return
                    }
                    setUserModalStep(3)
                  }}
                  className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    userModalStep === 3
                      ? 'bg-[#C08552] text-white shadow-md'
                      : `${classes.textSub} hover:bg-black/5 dark:hover:bg-white/5`
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    userModalStep === 3
                      ? 'bg-white/20 text-white'
                      : 'bg-black/10 dark:bg-white/10'
                  }`}>
                    3
                  </span>
                  <span className="truncate hidden sm:inline">Permisos & Áreas</span>
                  <span className="sm:hidden">Permisos</span>
                </button>
              </div>

              {/* PASO 1: DATOS PERSONALES Y PIN */}
              {userModalStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${classes.textMuted}`}>
                      Nombre Completo del Colaborador *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Ana Lucía Martínez"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C08552] ${classes.input}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Sexo */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${classes.textMuted}`}>
                        Sexo *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setUserGender('MALE')}
                          className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            userGender === 'MALE'
                              ? 'bg-[#C08552] text-white border-[#C08552] shadow-sm ring-1 ring-[#C08552]'
                              : `${classes.subCard} ${classes.textMuted} hover:${classes.textMain}`
                          }`}
                        >
                          <span>👨 Masculino</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserGender('FEMALE')}
                          className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            userGender === 'FEMALE'
                              ? 'bg-[#C08552] text-white border-[#C08552] shadow-sm ring-1 ring-[#C08552]'
                              : `${classes.subCard} ${classes.textMuted} hover:${classes.textMain}`
                          }`}
                        >
                          <span>👩 Femenino</span>
                        </button>
                      </div>
                    </div>

                    {/* Edad */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${classes.textMuted}`}>
                        Edad (Años)
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="99"
                        placeholder="Ej: 24"
                        value={userAge}
                        onChange={(e) => setUserAge(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C08552] ${classes.input}`}
                      />
                    </div>
                  </div>

                  {/* PIN de Acceso (4 dígitos) */}
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${classes.subCard}`}>
                    <div className="flex items-center justify-between">
                      <label className={`block text-xs font-bold flex items-center gap-1.5 ${classes.textMain}`}>
                        <KeyRound className="w-4 h-4 text-amber-500" />
                        <span>Código PIN de Acceso (4 dígitos) {editingUser ? '' : '*'}</span>
                      </label>
                      {editingUser && editingUser.hasPin && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          ✓ PIN Configurado
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder={editingUser && editingUser.hasPin ? '•••• (Conservar PIN actual)' : 'Ingresa 4 dígitos (Ej: 1234)'}
                        value={userPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setUserPin(val)
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-center font-mono font-bold text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#C08552] ${classes.input}`}
                      />
                    </div>
                    <p className={`text-[11px] leading-tight ${classes.textSub}`}>
                      {editingUser
                        ? 'Ingresa un nuevo PIN de 4 dígitos si deseas cambiarlo. De lo contrario, déjalo vacío.'
                        : 'El colaborador utilizará este PIN de 4 dígitos para acceder y relevar turno en la Terminal POS y Comandera.'}
                    </p>
                  </div>

                  {/* Botones del Paso 1 */}
                  <div className={`flex items-center justify-between pt-4 border-t ${classes.divider}`}>
                    <button
                      type="button"
                      onClick={() => setUserModalOpen(false)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${classes.buttonGhost}`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!userName.trim()) {
                          notify.warning('Campo requerido', 'Ingresa el nombre del colaborador')
                          return
                        }
                        if (!editingUser && (!userPin || !/^\d{4}$/.test(userPin.trim()))) {
                          notify.warning('PIN requerido', 'Ingresa un PIN numérico de 4 dígitos')
                          return
                        }
                        if (userPin && !/^\d{4}$/.test(userPin.trim())) {
                          notify.warning('PIN inválido', 'El PIN debe contener exactamente 4 números')
                          return
                        }
                        setUserModalStep(2)
                      }}
                      style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer hover:opacity-95"
                    >
                      <span>Siguiente: Puesto & Sucursales</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 2: PUESTO ASIGNADO Y SUCURSALES */}
              {userModalStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Puesto Asignado (sin rol padre) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-semibold ${classes.textMuted}`}>
                        Puesto de Trabajo Asignado *
                      </label>
                      <span className={`text-[11px] ${classes.textSub}`}>
                        {roles.length} puesto(s) disponible(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
                      {roles.map((r) => {
                        const isSelected = userRoleId === r.id
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setUserRoleId(r.id)
                              setUserOpAccessPOS(Boolean(r.permissions?.canAccessPOS || r.permissionCodes?.includes('acceso_pos')))
                              setUserOpDiscounts(Boolean(r.permissions?.canAuthorizeDiscounts || r.permissionCodes?.includes('autorizar_descuentos')))
                              setUserOpCancellations(Boolean(r.permissions?.canAuthorizeCancellations || r.permissionCodes?.includes('autorizar_cancelaciones')))
                              setUserOpCourtesies(Boolean(r.permissions?.canAuthorizeCourtesies || r.permissionCodes?.includes('autorizar_cortesias')))
                              setUserOpTransfers(Boolean(r.permissions?.canTransferTables || r.permissionCodes?.includes('traspaso_mesas')))
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-[#C08552]/15 border-[#C08552] text-[#C08552] shadow-sm ring-1 ring-[#C08552]'
                                : `${classes.subCard} ${classes.textMain} hover:border-[#C08552]/50`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs truncate">{r.name}</span>
                              {isSelected ? (
                                <CheckCircle className="w-4 h-4 text-[#C08552] shrink-0" />
                              ) : (
                                <Shield className="w-3.5 h-3.5 opacity-40 shrink-0" />
                              )}
                            </div>
                            <span className={`text-[10px] mt-1 line-clamp-1 ${classes.textSub}`}>
                              {r.description || (r.isSystem ? 'Puesto base del sistema' : 'Puesto personalizado')}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <p className={`text-[11px] mt-1.5 ${classes.textSub}`}>
                      El puesto asignado define automáticamente los módulos activos y autorizaciones del colaborador.
                    </p>
                  </div>

                  {/* Sucursales Autorizadas */}
                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${classes.textMuted}`}>
                      Sucursales Autorizadas *
                    </label>
                    <div className={`space-y-2 p-3 rounded-2xl border max-h-48 overflow-y-auto ${classes.subCard}`}>
                      {branches.map((b) => {
                        const isChecked = userBranchIds.includes(b.id)
                        const isDefault = userDefaultBranchId === b.id
                        return (
                          <div
                            key={b.id}
                            className={`flex items-center justify-between text-xs p-2 rounded-xl border transition-colors ${
                              isChecked
                                ? 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10'
                                : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const next = [...userBranchIds, b.id]
                                    setUserBranchIds(next)
                                    if (!userDefaultBranchId) setUserDefaultBranchId(b.id)
                                  } else {
                                    const next = userBranchIds.filter((id) => id !== b.id)
                                    setUserBranchIds(next)
                                    if (userDefaultBranchId === b.id) {
                                      setUserDefaultBranchId(next[0] || '')
                                    }
                                  }
                                }}
                                className="w-4 h-4 rounded text-[#C08552] focus:ring-0 cursor-pointer"
                              />
                              <div className="truncate">
                                <span className={`font-semibold block ${classes.textMain}`}>{b.name}</span>
                                <span className={`font-mono text-[10px] ${classes.textSub}`}>Código: {b.code}</span>
                              </div>
                            </label>

                            {isChecked && (
                              <button
                                type="button"
                                onClick={() => setUserDefaultBranchId(b.id)}
                                style={isDefault ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
                                className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                                  isDefault
                                    ? 'shadow-sm'
                                    : `${classes.buttonGhost} ${classes.textSub} hover:${classes.textMain}`
                                }`}
                              >
                                {isDefault ? '✓ Sucursal Principal' : 'Hacer principal'}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Botones del Paso 2 */}
                  <div className={`flex items-center justify-between pt-4 border-t ${classes.divider}`}>
                    <button
                      type="button"
                      onClick={() => setUserModalStep(1)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${classes.buttonGhost}`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Anterior</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!userRoleId) {
                          notify.warning('Puesto requerido', 'Selecciona el puesto de trabajo del colaborador')
                          return
                        }
                        if (userBranchIds.length === 0) {
                          notify.warning('Sucursal requerida', 'Asigna al menos una sucursal al colaborador')
                          return
                        }
                        setUserModalStep(3)
                      }}
                      style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer hover:opacity-95"
                    >
                      <span>Siguiente: Permisos & Áreas</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 3: ÁREAS DE COCINA & PERMISOS OPERATIVOS CONDICIONALES */}
              {userModalStep === 3 && (() => {
                const selectedRole = roles.find((r) => r.id === userRoleId)

                const hasKdsAccess = Boolean(
                  selectedRole?.permissions?.canAccessKDS ||
                  selectedRole?.permissions?.canManageKitchen ||
                  selectedRole?.permissionCodes?.includes('acceso_kds') ||
                  selectedRole?.permissionCodes?.includes('gestionar_cocina') ||
                  ['CHEF', 'COOK', 'KITCHEN', 'COCINERO', 'BARISTA'].includes(selectedRole?.code || '')
                )

                const hasPosOrComanderaAccess = Boolean(
                  selectedRole?.permissions?.canAccessPOS ||
                  selectedRole?.permissionCodes?.includes('acceso_pos') ||
                  selectedRole?.permissionCodes?.includes('acceso_comandera') ||
                  ['ADMIN', 'SUPERADMIN', 'BRANCH_MANAGER', 'CASHIER', 'WAITER', 'CAJERO', 'MESERO'].includes(selectedRole?.code || '')
                )

                // Permisos operativos específicos otorgados por el puesto
                const opDiscounts = Boolean(
                  selectedRole?.permissions?.canAuthorizeDiscounts ||
                  selectedRole?.permissionCodes?.includes('autorizar_descuentos')
                )
                const opCancellations = Boolean(
                  selectedRole?.permissions?.canAuthorizeCancellations ||
                  selectedRole?.permissionCodes?.includes('autorizar_cancelaciones')
                )
                const opCourtesies = Boolean(
                  selectedRole?.permissions?.canAuthorizeCourtesies ||
                  selectedRole?.permissionCodes?.includes('autorizar_cortesias')
                )
                const opTransfers = Boolean(
                  selectedRole?.permissions?.canTransferTables ||
                  selectedRole?.permissionCodes?.includes('traspaso_mesas')
                )
                const opMergeTables = Boolean(
                  selectedRole?.permissions?.canTransferTables ||
                  selectedRole?.permissionCodes?.includes('traspaso_mesas') ||
                  selectedRole?.permissionCodes?.includes('unir_mesas')
                )

                return (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Badge informativo de Puesto */}
                    <div className="p-3 rounded-2xl bg-[#C08552]/10 border border-[#C08552]/25 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#C08552]" />
                        <span className={`font-medium ${classes.textMain}`}>Puesto Asignado:</span>
                        <strong className="font-bold text-[#C08552]">{selectedRole?.name || 'Puesto Asignado'}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUserModalStep(2)}
                        className="text-[11px] font-semibold text-[#C08552] hover:underline cursor-pointer"
                      >
                        Cambiar Puesto
                      </button>
                    </div>

                    {/* CONDICIONAL 1: ÁREAS DE COCINA (SOLO SI TIENE ACCESO A KDS) */}
                    {hasKdsAccess ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className={`block text-xs font-bold flex items-center gap-1.5 ${classes.textMain}`}>
                            <UtensilsCrossed className="w-4 h-4 text-amber-500" />
                            <span>Áreas de Cocina Asignadas (Monitor KDS)</span>
                          </label>
                          <span className={`text-[11px] ${classes.textSub}`}>
                            {userKitchenStationIds.length === 0
                              ? 'Atiende todas las áreas'
                              : `${userKitchenStationIds.length} área(s) asignada(s)`}
                          </span>
                        </div>

                        {kitchenStations.length === 0 ? (
                          <div className={`p-3 rounded-xl border border-dashed text-center text-xs ${classes.subCard} ${classes.textSub}`}>
                            No hay estaciones de cocina creadas aún. El colaborador verá todos los pedidos.
                          </div>
                        ) : (
                          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl border ${classes.subCard}`}>
                            {kitchenStations.map((station) => {
                              const isChecked = userKitchenStationIds.includes(station.id)
                              return (
                                <label
                                  key={station.id}
                                  className={`flex items-center gap-2.5 text-xs cursor-pointer p-2 rounded-xl border transition-all ${
                                    isChecked
                                      ? 'ring-1 font-semibold'
                                      : `${classes.buttonGhost} opacity-80 hover:opacity-100`
                                  }`}
                                  style={
                                    isChecked
                                      ? {
                                          backgroundColor: `${station.color}15`,
                                          borderColor: `${station.color}60`,
                                          color: station.color,
                                        }
                                      : undefined
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setUserKitchenStationIds([...userKitchenStationIds, station.id])
                                      } else {
                                        setUserKitchenStationIds(
                                          userKitchenStationIds.filter((id) => id !== station.id)
                                        )
                                      }
                                    }}
                                    className="w-4 h-4 rounded focus:ring-0"
                                    style={{ accentColor: station.color }}
                                  />
                                  <span className="truncate font-semibold">{station.name}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                        <p className={`text-[10px] ${classes.textSub}`}>
                          Si no seleccionas ninguna, el colaborador verá y despachará comandas de todas las áreas de cocina.
                        </p>
                      </div>
                    ) : null}

                    {/* CONDICIONAL 2: PERMISOS OPERATIVOS PERSONALES (POS / COMANDERA) */}
                    {hasPosOrComanderaAccess ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className={`block text-xs font-bold flex items-center gap-1.5 ${classes.textMain}`}>
                            <CreditCard className="w-4 h-4 text-emerald-500" />
                            <span>Permisos Operativos Personales (POS y Comandera)</span>
                          </label>
                          <span className={`text-[10px] font-semibold ${classes.textSub}`}>
                            Habilitar / Deshabilitar por colaborador
                          </span>
                        </div>
                        <p className={`text-[11px] ${classes.textSub}`}>
                          Permisos personales que provienen del módulo. Puedes activar o desactivar cada autorización operativa independientemente del puesto:
                        </p>

                        <div className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${classes.subCard}`}>
                          {/* 1. Cobro de Cuentas & Terminal POS */}
                          <div
                            onClick={() => setUserOpAccessPOS((prev) => !prev)}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              userOpAccessPOS ? 'border-emerald-500/40 bg-emerald-500/5' : `${classes.buttonGhost} opacity-80 hover:opacity-100`
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                userOpAccessPOS ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/5 text-slate-400'
                              }`}>
                                <CreditCard className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-bold text-xs ${classes.textMain}`}>Cobrar Cuentas & Apertura POS</span>
                                  {userOpAccessPOS ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      <CheckCircle className="w-3 h-3" /> Habilitado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/5 text-slate-500 border border-black/10 dark:border-white/10">
                                      <Lock className="w-3 h-3" /> Requiere PIN Supervisor
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] block ${classes.textSub}`}>Cobro directo en mesas de comandera y acceso al punto de venta</span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <div className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${userOpAccessPOS ? 'bg-emerald-500' : isLight ? 'bg-slate-300' : 'bg-slate-700'}`}>
                                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transform transition-transform ${userOpAccessPOS ? 'translate-x-4.5' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          </div>

                          {/* 2. Aplicar Descuentos */}
                          <div
                            onClick={() => setUserOpDiscounts((prev) => !prev)}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              userOpDiscounts ? 'border-amber-500/40 bg-amber-500/5' : `${classes.buttonGhost} opacity-80 hover:opacity-100`
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                userOpDiscounts ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-black/5 dark:bg-white/5 text-slate-400'
                              }`}>
                                <BadgePercent className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-bold text-xs ${classes.textMain}`}>Aplicar Descuentos</span>
                                  {userOpDiscounts ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      <CheckCircle className="w-3 h-3" /> Habilitado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/5 text-slate-500 border border-black/10 dark:border-white/10">
                                      <Lock className="w-3 h-3" /> Requiere PIN Supervisor
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] block ${classes.textSub}`}>Descuentos porcentuales o en monto en comandas y tickets</span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <div className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${userOpDiscounts ? 'bg-amber-500' : isLight ? 'bg-slate-300' : 'bg-slate-700'}`}>
                                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transform transition-transform ${userOpDiscounts ? 'translate-x-4.5' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          </div>

                          {/* 3. Cancelaciones */}
                          <div
                            onClick={() => setUserOpCancellations((prev) => !prev)}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              userOpCancellations ? 'border-rose-500/40 bg-rose-500/5' : `${classes.buttonGhost} opacity-80 hover:opacity-100`
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                userOpCancellations ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-black/5 dark:bg-white/5 text-slate-400'
                              }`}>
                                <X className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-bold text-xs ${classes.textMain}`}>Autorizar Cancelaciones</span>
                                  {userOpCancellations ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      <CheckCircle className="w-3 h-3" /> Habilitado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/5 text-slate-500 border border-black/10 dark:border-white/10">
                                      <Lock className="w-3 h-3" /> Requiere PIN Supervisor
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] block ${classes.textSub}`}>Cancelar platillos marchados o comandas enviadas a cocina</span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <div className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${userOpCancellations ? 'bg-rose-500' : isLight ? 'bg-slate-300' : 'bg-slate-700'}`}>
                                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transform transition-transform ${userOpCancellations ? 'translate-x-4.5' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          </div>

                          {/* 4. Cortesías */}
                          <div
                            onClick={() => setUserOpCourtesies((prev) => !prev)}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              userOpCourtesies ? 'border-emerald-500/40 bg-emerald-500/5' : `${classes.buttonGhost} opacity-80 hover:opacity-100`
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                userOpCourtesies ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/5 text-slate-400'
                              }`}>
                                <Gift className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-bold text-xs ${classes.textMain}`}>Autorizar Cortesías ($0)</span>
                                  {userOpCourtesies ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      <CheckCircle className="w-3 h-3" /> Habilitado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/5 text-slate-500 border border-black/10 dark:border-white/10">
                                      <Lock className="w-3 h-3" /> Requiere PIN Supervisor
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] block ${classes.textSub}`}>Consumo 100% cortesía de la casa en productos o tickets</span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <div className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${userOpCourtesies ? 'bg-emerald-500' : isLight ? 'bg-slate-300' : 'bg-slate-700'}`}>
                                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transform transition-transform ${userOpCourtesies ? 'translate-x-4.5' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          </div>

                          {/* 5. Traspaso y Unión de Mesas */}
                          <div
                            onClick={() => setUserOpTransfers((prev) => !prev)}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              userOpTransfers ? 'border-cyan-500/40 bg-cyan-500/5' : `${classes.buttonGhost} opacity-80 hover:opacity-100`
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                userOpTransfers ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'bg-black/5 dark:bg-white/5 text-slate-400'
                              }`}>
                                <UtensilsCrossed className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-bold text-xs ${classes.textMain}`}>Traspaso y Unión de Mesas</span>
                                  {userOpTransfers ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      <CheckCircle className="w-3 h-3" /> Habilitado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/5 text-slate-500 border border-black/10 dark:border-white/10">
                                      <Lock className="w-3 h-3" /> Requiere PIN Supervisor
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] block ${classes.textSub}`}>Mover comandas entre mesas y juntar cuentas de salón</span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <div className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${userOpTransfers ? 'bg-cyan-500' : isLight ? 'bg-slate-300' : 'bg-slate-700'}`}>
                                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transform transition-transform ${userOpTransfers ? 'translate-x-4.5' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className={`text-[10px] ${classes.textSub}`}>
                          💡 Puedes personalizar individualmente las autorizaciones operativas de este colaborador sin alterar la plantilla global del puesto.
                        </p>
                      </div>
                    ) : null}

                    {/* Si ni KDS ni POS/Comandera aplican */}
                    {!hasKdsAccess && !hasPosOrComanderaAccess && (
                      <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${classes.subCard}`}>
                        <Shield className="w-6 h-6 text-[#C08552] mx-auto" />
                        <h4 className={`text-xs font-bold ${classes.textMain}`}>
                          Puesto Administrativo: {selectedRole?.name}
                        </h4>
                        <p className={`text-[11px] ${classes.textSub}`}>
                          Este puesto tiene funciones administrativas en el Dashboard general y no requiere configuración operativa de cocina o piso.
                        </p>
                      </div>
                    )}

                    {/* Botones del Paso 3 */}
                    <div className={`flex items-center justify-between pt-4 border-t ${classes.divider}`}>
                      <button
                        type="button"
                        onClick={() => setUserModalStep(2)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${classes.buttonGhost}`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Anterior</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveUser()}
                        disabled={savingUser}
                        style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
                      >
                        {savingUser ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        <span>{editingUser ? 'Guardar Cambios' : 'Registrar Colaborador'}</span>
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: ASIGNAR / CAMBIAR PIN RÁPIDO */}
      {pinModalOpen && pinTargetUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className={`border rounded-3xl w-full max-w-sm p-6 space-y-5 my-auto shadow-2xl ${classes.modalContent}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
              <h2 className={`text-base font-bold flex items-center gap-2 ${classes.textMain}`}>
                <KeyRound className="w-5 h-5 text-amber-500" />
                Código PIN de Acceso
              </h2>
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className={`p-1 cursor-pointer hover:opacity-75 ${classes.textSub}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="text-center space-y-1">
                <p className={`text-xs ${classes.textSub}`}>Colaborador:</p>
                <p className={`text-sm font-bold ${classes.textMain}`}>{pinTargetUser.name}</p>
                <p className={`text-xs ${classes.textMuted}`}>
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
                  className={`w-full text-center text-2xl tracking-[0.5em] font-mono py-3 rounded-2xl border focus:outline-none ${classes.input}`}
                />
              </div>

              <div className={`flex items-center justify-between gap-3 pt-2 border-t ${classes.divider}`}>
                {pinTargetUser.hasPin && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickPin('')
                      handleSavePin({ preventDefault: () => {} } as React.FormEvent)
                    }}
                    className="text-rose-500 hover:text-rose-600 text-xs font-semibold cursor-pointer"
                  >
                    Remover PIN
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setPinModalOpen(false)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${classes.buttonGhost}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPin}
                    style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                    className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer hover:opacity-95"
                  >
                    {savingPin && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Guardar PIN</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* MODAL: CREAR / EDITAR ROL PERSONALIZADO */}
      {roleModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className={`border rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 my-auto shadow-2xl ${classes.modalContent}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${classes.divider}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${classes.textMain}`}>
                <Shield className="w-5 h-5" style={{ color: buttonColor }} />
                {editingRole
                  ? editingRole.isSystem
                    ? `Personalizar Permisos: ${editingRole.name}`
                    : `Editar Permisos: ${editingRole.name}`
                  : 'Nuevo Rol Personalizado'}
              </h2>
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className={`p-1 cursor-pointer hover:opacity-75 ${classes.textSub}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-5">
              {editingRole?.isSystem && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>
                    Estás personalizando una plantilla base del sistema. Se creará una versión exclusiva con estos permisos para los colaboradores de tu negocio.
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${classes.textMuted}`}>
                    Nombre del Puesto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cajero Principal, Mesero de Barra"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none ${classes.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${classes.textMuted}`}>
                    Código Identificador
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: CAJERO_PRINCIPAL"
                    value={roleCode}
                    disabled={Boolean(editingRole)}
                    onChange={(e) => setRoleCode(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono focus:outline-none disabled:opacity-50 ${classes.input}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${classes.textMuted}`}>
                  Descripción del Puesto (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Responsable de la apertura de turno, cobro y cortes de caja"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none ${classes.input}`}
                />
              </div>

              {/* AVISO DE ESTRUCTURA PADRE */}
              <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-xs flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-violet-400 shrink-0" />
                <span className={classes.textMuted}>
                  Los puestos definen los módulos accesibles y las autorizaciones de los colaboradores asignados.
                </span>
              </div>

              {/* MÓDULO 1: TERMINAL POS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Módulo 1: Terminal POS
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      toggleModulePermissions([
                        'acceso_pos',
                        'autorizar_descuentos',
                        'autorizar_cortesias',
                        'autorizar_cancelaciones',
                      ])
                    }
                    className="text-[11px] font-semibold text-amber-500 hover:underline cursor-pointer"
                  >
                    Alternar Módulo
                  </button>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl border ${classes.subCard}`}>
                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('acceso_pos')}
                      onChange={() => togglePermissionCode('acceso_pos')}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                    />
                    <span className="font-semibold">Acceso a Terminal POS</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('autorizar_descuentos')}
                      onChange={() => togglePermissionCode('autorizar_descuentos')}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                    />
                    <span>Autorizar Descuentos (% o $)</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('autorizar_cortesias')}
                      onChange={() => togglePermissionCode('autorizar_cortesias')}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
                    />
                    <span>Autorizar Cortesías ($0)</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('autorizar_cancelaciones')}
                      onChange={() => togglePermissionCode('autorizar_cancelaciones')}
                      className="w-4 h-4 rounded text-rose-500 focus:ring-0"
                    />
                    <span>Autorizar Cancelaciones</span>
                  </label>
                </div>
              </div>

              {/* MÓDULO 2: COMANDERA DE MESAS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Módulo 2: Comandera de Mesas
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      toggleModulePermissions(['acceso_comandera', 'traspaso_mesas'])
                    }
                    className="text-[11px] font-semibold text-emerald-500 hover:underline cursor-pointer"
                  >
                    Alternar Módulo
                  </button>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl border ${classes.subCard}`}>
                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('acceso_comandera')}
                      onChange={() => togglePermissionCode('acceso_comandera')}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
                    />
                    <span className="font-semibold">Acceso a Comandera de Mesas</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('traspaso_mesas')}
                      onChange={() => togglePermissionCode('traspaso_mesas')}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
                    />
                    <span>Traspaso y Unión de Mesas</span>
                  </label>
                </div>
              </div>

              {/* MÓDULO 3: MONITOR KDS COCINA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      <MonitorPlay className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      Módulo 3: Monitor KDS Cocina
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      toggleModulePermissions(['acceso_kds', 'gestionar_cocina'])
                    }
                    className="text-[11px] font-semibold text-cyan-500 hover:underline cursor-pointer"
                  >
                    Alternar Módulo
                  </button>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl border ${classes.subCard}`}>
                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('acceso_kds')}
                      onChange={() => togglePermissionCode('acceso_kds')}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
                    />
                    <span className="font-semibold">Acceso a Monitor KDS</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('gestionar_cocina')}
                      onChange={() => togglePermissionCode('gestionar_cocina')}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
                    />
                    <span>Gestionar y Despachar Cocina</span>
                  </label>
                </div>
              </div>

              {/* MÓDULO 4: DASHBOARD GENERAL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      Módulo 4: Dashboard General
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      toggleModulePermissions([
                        'acceso_dashboard',
                        'gestionar_catalogo',
                        'gestionar_inventario',
                        'gestionar_compras',
                        'gestionar_gastos',
                        'gestionar_cajas',
                        'ver_reportes',
                        'gestionar_personal',
                        'gestionar_configuracion',
                      ])
                    }
                    className="text-[11px] font-semibold text-violet-500 hover:underline cursor-pointer"
                  >
                    Alternar Módulo
                  </button>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl border ${classes.subCard}`}>
                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('acceso_dashboard')}
                      onChange={() => togglePermissionCode('acceso_dashboard')}
                      className="w-4 h-4 rounded text-violet-500 focus:ring-0"
                    />
                    <span className="font-semibold">Acceso al Dashboard</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('gestionar_catalogo')}
                      onChange={() => togglePermissionCode('gestionar_catalogo')}
                      className="w-4 h-4 rounded text-violet-500 focus:ring-0"
                    />
                    <span>Productos y Recetario</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('gestionar_inventario')}
                      onChange={() => togglePermissionCode('gestionar_inventario')}
                      className="w-4 h-4 rounded text-violet-500 focus:ring-0"
                    />
                    <span>Almacenes e Inventarios</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('gestionar_compras')}
                      onChange={() => togglePermissionCode('gestionar_compras')}
                      className="w-4 h-4 rounded text-violet-500 focus:ring-0"
                    />
                    <span>Registro de Compras</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('gestionar_gastos')}
                      onChange={() => togglePermissionCode('gestionar_gastos')}
                      className="w-4 h-4 rounded text-violet-500 focus:ring-0"
                    />
                    <span>Control de Gastos</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('gestionar_cajas')}
                      onChange={() => togglePermissionCode('gestionar_cajas')}
                      className="w-4 h-4 rounded text-violet-500 focus:ring-0"
                    />
                    <span>Cajas, Arqueos y Retiros</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('ver_reportes')}
                      onChange={() => togglePermissionCode('ver_reportes')}
                      className="w-4 h-4 rounded text-violet-500 focus:ring-0"
                    />
                    <span>Reportes y Finanzas</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('gestionar_personal')}
                      onChange={() => togglePermissionCode('gestionar_personal')}
                      className="w-4 h-4 rounded text-violet-500 focus:ring-0"
                    />
                    <span>Personal y Puestos (RH)</span>
                  </label>

                  <label className={`flex items-center gap-2.5 text-xs cursor-pointer p-1 ${classes.textMain}`}>
                    <input
                      type="checkbox"
                      checked={roleSelectedPerms.includes('gestionar_configuracion')}
                      onChange={() => togglePermissionCode('gestionar_configuracion')}
                      className="w-4 h-4 rounded text-violet-500 focus:ring-0"
                    />
                    <span>Configuración General</span>
                  </label>
                </div>
              </div>

              <div className={`flex items-center justify-end gap-3 pt-3 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
                >
                  {savingRole && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingRole ? 'Guardar Cambios' : 'Crear Rol'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    )}
      </main>
    </div>
  )
}

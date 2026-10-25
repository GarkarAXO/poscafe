'use client'

import { useState, useEffect } from 'react'
import {
  Layers,
  Plus,
  Key,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  LayoutDashboard,
  CreditCard,
  UtensilsCrossed,
  MonitorPlay,
  Pencil,
  Trash2,
  Shield,
  HelpCircle,
  ExternalLink,
  Code2,
  Lock,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import ModalPortal from '@/components/modal-portal'

interface PermissionItem {
  id: string
  moduleId: string
  code: string
  name: string
  description: string | null
  isAccessFlag: boolean
  sortOrder: number
  _count?: {
    rolePermissions: number
  }
}

interface ModuleItem {
  id: string
  code: string
  name: string
  description: string | null
  icon: string | null
  route: string | null
  sortOrder: number
  active: boolean
  permissions: PermissionItem[]
}

const MODULE_ICONS: Record<string, any> = {
  LayoutDashboard,
  CreditCard,
  UtensilsCrossed,
  MonitorPlay,
  Layers,
  Shield,
}

export default function AdminModulesManagement() {
  const [modules, setModules] = useState<ModuleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Modales
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [showPermModal, setShowPermModal] = useState(false)
  const [selectedModuleForPerm, setSelectedModuleForPerm] = useState<ModuleItem | null>(null)
  const [editingPerm, setEditingPerm] = useState<PermissionItem | null>(null)

  // Formulario Módulo
  const [modForm, setModForm] = useState({
    code: '',
    name: '',
    description: '',
    icon: 'Layers',
    route: '',
  })
  const [savingModule, setSavingModule] = useState(false)

  // Formulario Permiso
  const [permForm, setPermForm] = useState({
    name: '',
    code: '',
    description: '',
    isAccessFlag: false,
  })
  const [savingPerm, setSavingPerm] = useState(false)

  useEffect(() => {
    fetchModules()
  }, [])

  async function fetchModules() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/modules')
      const json = await res.json()
      if (json.success) {
        setModules(json.data)
      } else {
        setError(json.error?.message || 'Error al cargar módulos')
      }
    } catch {
      setError('Error de conexión al cargar módulos')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedCode(text)
    notify.success(`Constante "${text}" copiada al portapapeles`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Generar constante en snake_case
  function handlePermNameChange(name: string) {
    const autoCode = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    setPermForm((prev) => ({
      ...prev,
      name,
      code: editingPerm ? prev.code : autoCode,
    }))
  }

  async function handleSaveModule(e: React.FormEvent) {
    e.preventDefault()
    if (!modForm.code.trim() || !modForm.name.trim()) {
      notify.error('Código y nombre son obligatorios')
      return
    }

    setSavingModule(true)
    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modForm),
      })
      const json = await res.json()
      if (json.success) {
        notify.success('Módulo registrado exitosamente')
        setShowModuleModal(false)
        setModForm({ code: '', name: '', description: '', icon: 'Layers', route: '' })
        fetchModules()
      } else {
        notify.error(json.error?.message || 'Error al guardar módulo')
      }
    } catch {
      notify.error('Error de conexión')
    } finally {
      setSavingModule(false)
    }
  }

  async function handleSavePermission(e: React.FormEvent) {
    e.preventDefault()
    if (!permForm.name.trim() || !permForm.code.trim()) {
      notify.error('Nombre y constante de permiso son obligatorios')
      return
    }

    setSavingPerm(true)
    try {
      if (editingPerm) {
        // Actualizar
        const res = await fetch('/api/admin/permissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPerm.id,
            name: permForm.name,
            description: permForm.description,
            isAccessFlag: permForm.isAccessFlag,
          }),
        })
        const json = await res.json()
        if (json.success) {
          notify.success('Permiso actualizado')
          setShowPermModal(false)
          fetchModules()
        } else {
          notify.error(json.error?.message || 'Error al actualizar')
        }
      } else {
        // Crear
        if (!selectedModuleForPerm) return
        const res = await fetch('/api/admin/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleId: selectedModuleForPerm.id,
            code: permForm.code,
            name: permForm.name,
            description: permForm.description,
            isAccessFlag: permForm.isAccessFlag,
          }),
        })
        const json = await res.json()
        if (json.success) {
          notify.success('Permiso creado en el catálogo')
          setShowPermModal(false)
          fetchModules()
        } else {
          notify.error(json.error?.message || 'Error al crear permiso')
        }
      }
    } catch {
      notify.error('Error de conexión')
    } finally {
      setSavingPerm(false)
    }
  }

  async function handleDeletePermission(permId: string, permName: string) {
    if (!confirm(`¿Estás seguro de eliminar el permiso "${permName}" del catálogo del sistema?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/permissions?id=${permId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        notify.success('Permiso eliminado')
        fetchModules()
      } else {
        notify.error(json.error?.message || 'Error al eliminar')
      }
    } catch {
      notify.error('Error de conexión')
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Explicativo de la Arquitectura */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-950/40 via-slate-900/80 to-slate-900/60 border border-violet-800/30 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                Catálogo de Módulos & Constantes
              </span>
              <span className="text-xs text-slate-400 font-mono">RBAC Centralizado</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Control de Accesos, Módulos y Constantes del Sistema
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cada módulo del sistema representa un apartado accesible (Dashboard, POS, Comandera, KDS). Los permisos se identifican mediante <strong className="text-violet-300 font-mono">constantes fijas en código</strong> (ej. <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">acceso_dashboard</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">autorizar_descuentos</code>). En la administración de RH, cada negocio asignará estos permisos a sus Puestos de trabajo.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setModForm({ code: '', name: '', description: '', icon: 'Layers', route: '' })
                setShowModuleModal(true)
              }}
              className="w-full md:w-auto px-4 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Módulo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Estados de Carga / Error */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <p className="text-xs">Sincronizando módulos y constantes del sistema...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Módulos */}
      {!loading && !error && (
        <div className="space-y-6">
          {modules.map((mod) => {
            const IconComp = MODULE_ICONS[mod.icon || ''] || Layers

            return (
              <div
                key={mod.id}
                className="rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-md overflow-hidden transition-all hover:border-slate-700/80"
              >
                {/* Header del Módulo */}
                <div className="p-5 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-violet-950/60 border border-violet-700/30 flex items-center justify-center text-violet-300 shadow-md">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-base text-white">{mod.name}</h3>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-[11px] text-amber-300 font-semibold">
                          ID: {mod.code.toUpperCase()}
                        </span>
                        {mod.route && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300">
                            Ruta: {mod.route}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {mod.description || 'Sin descripción'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModuleForPerm(mod)
                        setEditingPerm(null)
                        setPermForm({
                          name: '',
                          code: '',
                          description: '',
                          isAccessFlag: false,
                        })
                        setShowPermModal(true)
                      }}
                      className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Permiso</span>
                    </button>
                  </div>
                </div>

                {/* Tabla de Permisos de este Módulo */}
                <div className="p-4 sm:p-6">
                  {mod.permissions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      Este módulo aún no tiene permisos registrados.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {mod.permissions.map((perm) => (
                        <div
                          key={perm.id}
                          className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 flex flex-col justify-between transition-all group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-semibold text-xs text-white block">
                                  {perm.name}
                                </span>
                                {perm.isAccessFlag && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md mt-1">
                                    <Lock className="w-2.5 h-2.5" />
                                    Acceso Principal al Módulo
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPerm(perm)
                                    setSelectedModuleForPerm(mod)
                                    setPermForm({
                                      name: perm.name,
                                      code: perm.code,
                                      description: perm.description || '',
                                      isAccessFlag: perm.isAccessFlag,
                                    })
                                    setShowPermModal(true)
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                                  title="Editar permiso"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePermission(perm.id, perm.name)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                  title="Eliminar permiso"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                              {perm.description || 'Sin descripción detallada'}
                            </p>
                          </div>

                          {/* Badge de la Constante Copiable */}
                          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">
                              Constante:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(perm.code)}
                              className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 font-mono text-[11px] text-amber-300 flex items-center gap-1.5 transition-all cursor-pointer group-hover:border-amber-500/40"
                              title="Copiar constante para usar en el código"
                            >
                              <span>{perm.code}</span>
                              {copiedCode === perm.code ? (
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-amber-300 shrink-0" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Registrar Módulo */}
      {showModuleModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Nuevo Módulo del Sistema</h3>
                    <p className="text-xs text-slate-400">Define una nueva sección accesible de la plataforma</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveModule} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Identificador / Código del Módulo *
                  </label>
                  <input
                    type="text"
                    required
                    value={modForm.code}
                    onChange={(e) => setModForm({ ...modForm, code: e.target.value })}
                    placeholder="ej: reportes_avanzados"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    En minúsculas sin espacios (ej: pos, comandera, kds, facturacion)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre Descriptivo *
                  </label>
                  <input
                    type="text"
                    required
                    value={modForm.name}
                    onChange={(e) => setModForm({ ...modForm, name: e.target.value })}
                    placeholder="ej: Facturación Electrónica"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ruta en Frontend (URL)
                  </label>
                  <input
                    type="text"
                    value={modForm.route}
                    onChange={(e) => setModForm({ ...modForm, route: e.target.value })}
                    placeholder="ej: /dashboard/billing"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Icono Lucide
                  </label>
                  <select
                    value={modForm.icon}
                    onChange={(e) => setModForm({ ...modForm, icon: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-violet-500"
                  >
                    <option value="Layers">Layers (General)</option>
                    <option value="LayoutDashboard">LayoutDashboard (Panel)</option>
                    <option value="CreditCard">CreditCard (POS / Pagos)</option>
                    <option value="UtensilsCrossed">UtensilsCrossed (Mesas / Salón)</option>
                    <option value="MonitorPlay">MonitorPlay (KDS / Pantalla)</option>
                    <option value="Shield">Shield (Seguridad)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={modForm.description}
                    onChange={(e) => setModForm({ ...modForm, description: e.target.value })}
                    placeholder="Descripción funcional del módulo..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModuleModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingModule}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {savingModule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Guardar Módulo</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Agregar / Editar Permiso */}
      {showPermModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      {editingPerm ? 'Editar Permiso' : `Nuevo Permiso para ${selectedModuleForPerm?.name}`}
                    </h3>
                    <p className="text-xs text-slate-400">Constante para control de autorización en código</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPermModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePermission} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Permiso *
                  </label>
                  <input
                    type="text"
                    required
                    value={permForm.name}
                    onChange={(e) => handlePermNameChange(e.target.value)}
                    placeholder="ej: Autorizar Cancelaciones"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Constante en Código (Slug único) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPerm)}
                    value={permForm.code}
                    onChange={(e) => setPermForm({ ...permForm, code: e.target.value })}
                    placeholder="ej: autorizar_cancelaciones"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500 disabled:opacity-60"
                  />
                  <span className="text-[10px] text-slate-500">
                    Esta constante se usa exactamente en el código (ej: hasPermission(session, &apos;{permForm.code || 'constante'}&apos;))
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Descripción de la Acción
                  </label>
                  <textarea
                    rows={2}
                    value={permForm.description}
                    onChange={(e) => setPermForm({ ...permForm, description: e.target.value })}
                    placeholder="Describe qué acción o botón desbloquea este permiso..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <input
                    type="checkbox"
                    id="isAccessFlag"
                    checked={permForm.isAccessFlag}
                    onChange={(e) => setPermForm({ ...permForm, isAccessFlag: e.target.checked })}
                    className="w-4 h-4 rounded text-violet-600 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="isAccessFlag" className="text-xs text-slate-300 cursor-pointer">
                    <span className="font-semibold block text-white">¿Es permiso de acceso principal?</span>
                    <span className="text-[11px] text-slate-400">
                      Otorga permiso para entrar y ver la pantalla de este módulo en el menú.
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPermModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPerm}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {savingPerm && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingPerm ? 'Actualizar Permiso' : 'Crear Permiso'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

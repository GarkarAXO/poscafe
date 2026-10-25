// Constantes centrales del sistema de Módulos y Permisos

export const MODULES = {
  DASHBOARD: 'dashboard',
  POS: 'pos',
  COMANDERA: 'comandera',
  KDS: 'kds',
} as const

export type ModuleCode = (typeof MODULES)[keyof typeof MODULES]

export const PERMISSIONS = {
  // Módulo: Dashboard General
  ACCESO_DASHBOARD: 'acceso_dashboard',
  GESTIONAR_CATALOGO: 'gestionar_catalogo',
  GESTIONAR_INVENTARIO: 'gestionar_inventario',
  GESTIONAR_COMPRAS: 'gestionar_compras',
  GESTIONAR_GASTOS: 'gestionar_gastos',
  GESTIONAR_CAJAS: 'gestionar_cajas',
  VER_REPORTES: 'ver_reportes',
  GESTIONAR_PERSONAL: 'gestionar_personal',
  GESTIONAR_CONFIGURACION: 'gestionar_configuracion',

  // Módulo: Terminal POS
  ACCESO_POS: 'acceso_pos',
  AUTORIZAR_DESCUENTOS: 'autorizar_descuentos',
  AUTORIZAR_CORTESIAS: 'autorizar_cortesias',
  AUTORIZAR_CANCELACIONES: 'autorizar_cancelaciones',

  // Módulo: Comandera de Mesas
  ACCESO_COMANDERA: 'acceso_comandera',
  TRASPASO_MESAS: 'traspaso_mesas',

  // Módulo: Monitor KDS Cocina
  ACCESO_KDS: 'acceso_kds',
  GESTIONAR_COCINA: 'gestionar_cocina',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export interface DefaultModuleWithPermissions {
  code: string
  name: string
  description: string
  icon: string
  route: string
  sortOrder: number
  permissions: Array<{
    code: string
    name: string
    description: string
    isAccessFlag: boolean
    sortOrder: number
    legacyField?: string
  }>
}

export const SYSTEM_MODULES_CATALOG: DefaultModuleWithPermissions[] = [
  {
    code: MODULES.DASHBOARD,
    name: 'Dashboard General',
    description: 'Panel central de control, catálogos, inventarios, compras, finanzas y reportes.',
    icon: 'LayoutDashboard',
    route: '/dashboard',
    sortOrder: 1,
    permissions: [
      {
        code: PERMISSIONS.ACCESO_DASHBOARD,
        name: 'Acceso al Dashboard',
        description: 'Permite iniciar sesión e ingresar al panel de administración del negocio.',
        isAccessFlag: true,
        sortOrder: 1,
        legacyField: 'canManageSettings',
      },
      {
        code: PERMISSIONS.GESTIONAR_CATALOGO,
        name: 'Gestionar Catálogo',
        description: 'Crear, editar y eliminar productos, categorías, tamaños y modificadores.',
        isAccessFlag: false,
        sortOrder: 2,
        legacyField: 'canManageCatalog',
      },
      {
        code: PERMISSIONS.GESTIONAR_INVENTARIO,
        name: 'Gestionar Inventario',
        description: 'Control de stock de insumos, recetas, almacenes y registro de mermas.',
        isAccessFlag: false,
        sortOrder: 3,
        legacyField: 'canManageInventory',
      },
      {
        code: PERMISSIONS.GESTIONAR_COMPRAS,
        name: 'Gestionar Compras',
        description: 'Registro de órdenes de compra, entrada de materias primas y proveedores.',
        isAccessFlag: false,
        sortOrder: 4,
        legacyField: 'canManagePurchases',
      },
      {
        code: PERMISSIONS.GESTIONAR_GASTOS,
        name: 'Gestionar Gastos',
        description: 'Registro de egresos operativos y control de categorías de gastos.',
        isAccessFlag: false,
        sortOrder: 5,
        legacyField: 'canManageExpenses',
      },
      {
        code: PERMISSIONS.GESTIONAR_CAJAS,
        name: 'Gestionar Cajas',
        description: 'Apertura, arqueos, cortes de turno y movimientos de efectivo.',
        isAccessFlag: false,
        sortOrder: 6,
        legacyField: 'canManageCashRegisters',
      },
      {
        code: PERMISSIONS.VER_REPORTES,
        name: 'Ver Reportes y Finanzas',
        description: 'Acceso a métricas de ventas, ingresos, tickets promedio y reportes.',
        isAccessFlag: false,
        sortOrder: 7,
        legacyField: 'canViewReports',
      },
      {
        code: PERMISSIONS.GESTIONAR_PERSONAL,
        name: 'Gestión de Personal y Puestos (RH)',
        description: 'Administración de colaboradores, asignación de puestos, PINs y contraseñas.',
        isAccessFlag: false,
        sortOrder: 8,
        legacyField: 'canManageUsers',
      },
      {
        code: PERMISSIONS.GESTIONAR_CONFIGURACION,
        name: 'Configuración General',
        description: 'Ajustes del negocio, sucursales, personalización de colores y menús.',
        isAccessFlag: false,
        sortOrder: 9,
        legacyField: 'canManageSettings',
      },
    ],
  },
  {
    code: MODULES.POS,
    name: 'Terminal POS',
    description: 'Punto de venta para cobro rápido de mostrador, tickets y facturación.',
    icon: 'CreditCard',
    route: '/pos',
    sortOrder: 2,
    permissions: [
      {
        code: PERMISSIONS.ACCESO_POS,
        name: 'Acceso a Terminal POS',
        description: 'Permite abrir y operar la pantalla del punto de venta para cobrar pedidos.',
        isAccessFlag: true,
        sortOrder: 1,
        legacyField: 'canAccessPOS',
      },
      {
        code: PERMISSIONS.AUTORIZAR_DESCUENTOS,
        name: 'Autorizar Descuentos',
        description: 'Aplicar porcentajes o montos de descuento en el ticket de venta.',
        isAccessFlag: false,
        sortOrder: 2,
        legacyField: 'canAuthorizeDiscounts',
      },
      {
        code: PERMISSIONS.AUTORIZAR_CORTESIAS,
        name: 'Autorizar Cortesías',
        description: 'Aplicar cortesías (100% de descuento) a productos o cuentas completas.',
        isAccessFlag: false,
        sortOrder: 3,
        legacyField: 'canAuthorizeCourtesies',
      },
      {
        code: PERMISSIONS.AUTORIZAR_CANCELACIONES,
        name: 'Autorizar Cancelaciones',
        description: 'Cancelar pedidos ya enviados a cocina o tickets registrados.',
        isAccessFlag: false,
        sortOrder: 4,
        legacyField: 'canAuthorizeCancellations',
      },
    ],
  },
  {
    code: MODULES.COMANDERA,
    name: 'Comandera de Mesas',
    description: 'Toma de pedidos en mesas para meseros y servicio de salón.',
    icon: 'UtensilsCrossed',
    route: '/comandera',
    sortOrder: 3,
    permissions: [
      {
        code: PERMISSIONS.ACCESO_COMANDERA,
        name: 'Acceso a Comandera',
        description: 'Permite abrir el mapa de mesas y tomar comandas para enviar a cocina.',
        isAccessFlag: true,
        sortOrder: 1,
        legacyField: 'canAccessPOS', // Los meseros accedían con esto o sin él a comandera
      },
      {
        code: PERMISSIONS.TRASPASO_MESAS,
        name: 'Traspaso y Unión de Mesas',
        description: 'Cambiar comandas entre mesas o unir cuentas de distintas mesas.',
        isAccessFlag: false,
        sortOrder: 2,
        legacyField: 'canTransferTables',
      },
    ],
  },
  {
    code: MODULES.KDS,
    name: 'Monitor KDS Cocina',
    description: 'Pantalla de producción para cocineros, baristas y estaciones de preparación.',
    icon: 'MonitorPlay',
    route: '/kds',
    sortOrder: 4,
    permissions: [
      {
        code: PERMISSIONS.ACCESO_KDS,
        name: 'Acceso a Monitor KDS',
        description: 'Visualizar comandas en tiempo real por estación de preparación en cocina.',
        isAccessFlag: true,
        sortOrder: 1,
        legacyField: 'canAccessKDS',
      },
      {
        code: PERMISSIONS.GESTIONAR_COCINA,
        name: 'Gestionar Cocina',
        description: 'Marcar platillos listos, despachar órdenes completas o reabrir comandas.',
        isAccessFlag: false,
        sortOrder: 2,
        legacyField: 'canManageKitchen',
      },
    ],
  },
]

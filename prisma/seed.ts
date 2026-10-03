import bcrypt from 'bcryptjs'
import prisma from '../src/lib/prisma'
import {
  BusinessType,
  InventoryPolicy,
  InventoryUnit,
  StockMovementType,
  SubscriptionStatus,
  TableStatus,
} from '@prisma/client'

async function main() {
  console.log('🌱 Iniciando semilla de datos iniciales...')

  // ==========================================
  // 1. PLANES SAAS DE LA PLATAFORMA
  // ==========================================
  console.log('📦 Creando planes SaaS...')

  const basicPlan = await prisma.plan.upsert({
    where: { code: 'BASIC' },
    update: {},
    create: {
      code: 'BASIC',
      name: 'Plan Inicial Cafetería',
      description: 'Ideal para 1 cafetería pequeña o food truck.',
      priceMonthly: 499.0,
      priceYearly: 4990.0,
      maxBranches: 1,
      maxUsers: 3,
      maxWarehouses: 1,
      hasApiAccess: false,
      hasWebhooks: false,
    },
  })

  const proPlan = await prisma.plan.upsert({
    where: { code: 'PRO' },
    update: {},
    create: {
      code: 'PRO',
      name: 'Plan Pro Multisucursal',
      description: 'Para negocios con varias sucursales, control de recetas y APIs externas.',
      priceMonthly: 1199.0,
      priceYearly: 11990.0,
      maxBranches: 5,
      maxUsers: 15,
      maxWarehouses: 5,
      hasApiAccess: true,
      hasWebhooks: true,
    },
  })

  await prisma.plan.upsert({
    where: { code: 'ENTERPRISE' },
    update: {},
    create: {
      code: 'ENTERPRISE',
      name: 'Plan Enterprise Franquicias',
      description: 'Para cadenas y franquicias con sucursales y terminales ilimitadas.',
      priceMonthly: 2499.0,
      priceYearly: 24990.0,
      maxBranches: 999,
      maxUsers: 999,
      maxWarehouses: 999,
      hasApiAccess: true,
      hasWebhooks: true,
    },
  })

  // ==========================================
  // 2. SUPER ADMIN DE LA PLATAFORMA
  // ==========================================
  console.log('👤 Creando Super Admin SaaS...')

  const superAdminPassword = await bcrypt.hash('SuperAdmin2026!', 10)
  await prisma.platformUser.upsert({
    where: { email: 'admin@poscafe.app' },
    update: {},
    create: {
      email: 'admin@poscafe.app',
      name: 'Super Administrador SaaS',
      passwordHash: superAdminPassword,
      active: true,
    },
  })

  // ==========================================
  // 3. PLANTILLAS DE ROLES DEL SISTEMA
  // ==========================================
  console.log('🛡️ Creando roles base del sistema...')

  let systemAdminRole = await prisma.role.findFirst({
    where: { isSystem: true, code: 'ADMIN' },
  })
  if (!systemAdminRole) {
    systemAdminRole = await prisma.role.create({
      data: {
        name: 'Administrador General / Propietario',
        code: 'ADMIN',
        isSystem: true,
        canAccessPOS: true,
        canManageCatalog: true,
        canManageInventory: true,
        canManagePurchases: true,
        canManageExpenses: true,
        canManageCashRegisters: true,
        canViewReports: true,
        canManageUsers: true,
        canManageSettings: true,
        canAuthorizeDiscounts: true,
        canAuthorizeCourtesies: true,
        canAuthorizeCancellations: true,
        canTransferTables: true,
      },
    })
  }

  let systemManagerRole = await prisma.role.findFirst({
    where: { isSystem: true, code: 'BRANCH_MANAGER' },
  })
  if (!systemManagerRole) {
    systemManagerRole = await prisma.role.create({
      data: {
        name: 'Gerente de Sucursal',
        code: 'BRANCH_MANAGER',
        isSystem: true,
        canAccessPOS: true,
        canManageCatalog: false,
        canManageInventory: true,
        canManagePurchases: true,
        canManageExpenses: true,
        canManageCashRegisters: true,
        canViewReports: true,
        canManageUsers: false,
        canManageSettings: false,
        canAuthorizeDiscounts: true,
        canAuthorizeCourtesies: true,
        canAuthorizeCancellations: true,
        canTransferTables: true,
      },
    })
  }

  let systemCashierRole = await prisma.role.findFirst({
    where: { isSystem: true, code: 'CASHIER' },
  })
  if (!systemCashierRole) {
    systemCashierRole = await prisma.role.create({
      data: {
        name: 'Cajero',
        code: 'CASHIER',
        isSystem: true,
        canAccessPOS: true,
        canManageCatalog: false,
        canManageInventory: false,
        canManagePurchases: false,
        canManageExpenses: false,
        canManageCashRegisters: true,
        canViewReports: false,
        canManageUsers: false,
        canManageSettings: false,
        canAuthorizeDiscounts: false,
        canAuthorizeCourtesies: false,
        canAuthorizeCancellations: false,
        canTransferTables: false,
      },
    })
  }

  let systemWaiterRole = await prisma.role.findFirst({
    where: { isSystem: true, code: 'WAITER' },
  })
  if (!systemWaiterRole) {
    systemWaiterRole = await prisma.role.create({
      data: {
        name: 'Mesero / Comandero',
        code: 'WAITER',
        isSystem: true,
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
        canTransferTables: true,
      },
    })
  }

  // ==========================================
  // 4. NEGOCIO DEMO (TENANT)
  // ==========================================
  console.log('☕ Creando negocio demo: Café Aroma...')

  let demoBusiness = await prisma.business.findFirst({
    where: { name: 'Café Aroma Demo' },
  })

  if (!demoBusiness) {
    demoBusiness = await prisma.business.create({
      data: {
        name: 'Café Aroma Demo',
        legalName: 'Café Aroma Especialidades S.A.S.',
        taxId: 'ARO240215XYZ',
        phone: '+52 55 1234 5678',
        email: 'contacto@cafearoma.demo',
        timezone: 'America/Mexico_City',
        currencyCode: 'MXN',
        businessType: BusinessType.CAFE,
        settings: {
          create: {
            primaryColor: '#7c3aed',
            secondaryColor: '#4f46e5',
            accentColor: '#f59e0b',
            fontFamily: 'Inter',
            inventoryEnabled: true,
            recipesEnabled: true,
            tablesEnabled: true,
            waitersEnabled: true,
            kitchenEnabled: true,
            purchasesEnabled: true,
            expensesEnabled: true,
            digitalMenuEnabled: true,
            displaysEnabled: true,
            cashRegisterEnabled: true,
            discountsEnabled: true,
            courtesiesEnabled: true,
            negativeStockEnabled: false,
          },
        },
        subscription: {
          create: {
            planId: proPlan.id,
            status: SubscriptionStatus.ACTIVE,
          },
        },
      },
    })
  }

  // ==========================================
  // 5. SUCURSALES (MULTISUCURSAL REAL)
  // ==========================================
  console.log('📍 Creando sucursales...')

  const branchCentro = await prisma.branch.upsert({
    where: { businessId_code: { businessId: demoBusiness.id, code: 'SUC-CENTRO' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Matriz Roma Norte',
      code: 'SUC-CENTRO',
      addressLine1: 'Av. Álvaro Obregón 120',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06700',
      countryCode: 'MX',
    },
  })

  const branchCondesa = await prisma.branch.upsert({
    where: { businessId_code: { businessId: demoBusiness.id, code: 'SUC-CONDESA' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Sucursal Condesa',
      code: 'SUC-CONDESA',
      addressLine1: 'Calle Michoacán 45',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06140',
      countryCode: 'MX',
    },
  })

  // ==========================================
  // 6. ALMACENES Y CAJAS REGISTRADORAS
  // ==========================================
  console.log('🏪 Creando almacenes y cajas...')

  const warehouseCentro = await prisma.warehouse.upsert({
    where: { branchId_code: { branchId: branchCentro.id, code: 'ALM-ROMA' } },
    update: {},
    create: {
      branchId: branchCentro.id,
      name: 'Bodega Principal Roma',
      code: 'ALM-ROMA',
      isDefault: true,
    },
  })

  const warehouseCondesa = await prisma.warehouse.upsert({
    where: { branchId_code: { branchId: branchCondesa.id, code: 'ALM-COND' } },
    update: {},
    create: {
      branchId: branchCondesa.id,
      name: 'Almacén Barra Condesa',
      code: 'ALM-COND',
      isDefault: true,
    },
  })

  const cashRegisterCentro = await prisma.cashRegister.upsert({
    where: { branchId_code: { branchId: branchCentro.id, code: 'CAJA-ROMA-1' } },
    update: {},
    create: {
      branchId: branchCentro.id,
      name: 'Caja Barra 1',
      code: 'CAJA-ROMA-1',
    },
  })

  // ==========================================
  // 7. USUARIOS DEL NEGOCIO
  // ==========================================
  console.log('👥 Creando usuarios del negocio...')

  const ownerPassword = await bcrypt.hash('Owner2026!', 10)
  const pinCashier = await bcrypt.hash('1234', 10)
  const pinWaiter = await bcrypt.hash('4321', 10)

  // Propietario con acceso a ambas sucursales
  const ownerUser = await prisma.user.upsert({
    where: { businessId_email: { businessId: demoBusiness.id, email: 'propietario@cafearoma.demo' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Rodrigo Propietario',
      email: 'propietario@cafearoma.demo',
      username: 'rodrigo_owner',
      passwordHash: ownerPassword,
      userBranches: {
        create: [
          { branchId: branchCentro.id, isDefault: true },
          { branchId: branchCondesa.id, isDefault: false },
        ],
      },
      roles: {
        create: [{ roleId: systemAdminRole.id }],
      },
    },
  })

  // Cajero Roma
  await prisma.user.upsert({
    where: { businessId_email: { businessId: demoBusiness.id, email: 'cajero.roma@cafearoma.demo' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Carlos Cajero',
      email: 'cajero.roma@cafearoma.demo',
      username: 'carlos_pos',
      passwordHash: ownerPassword,
      pinHash: pinCashier,
      userBranches: {
        create: [{ branchId: branchCentro.id, isDefault: true }],
      },
      roles: {
        create: [{ roleId: systemCashierRole.id }],
      },
    },
  })

  // Mesero Roma
  await prisma.user.upsert({
    where: { businessId_email: { businessId: demoBusiness.id, email: 'mesero.roma@cafearoma.demo' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Ana Mesera',
      email: 'mesero.roma@cafearoma.demo',
      username: 'ana_mesas',
      passwordHash: ownerPassword,
      pinHash: pinWaiter,
      userBranches: {
        create: [{ branchId: branchCentro.id, isDefault: true }],
      },
      roles: {
        create: [{ roleId: systemWaiterRole.id }],
      },
    },
  })

  // ==========================================
  // 8. MESAS Y ÁREAS
  // ==========================================
  console.log('🪑 Creando áreas y mesas...')

  const salonArea = await prisma.area.create({
    data: {
      branchId: branchCentro.id,
      name: 'Salón Principal',
      sortOrder: 1,
      tables: {
        create: [
          { branchId: branchCentro.id, name: 'Mesa 1', capacity: 2, status: TableStatus.AVAILABLE },
          { branchId: branchCentro.id, name: 'Mesa 2', capacity: 4, status: TableStatus.AVAILABLE },
          { branchId: branchCentro.id, name: 'Mesa 3', capacity: 4, status: TableStatus.AVAILABLE },
        ],
      },
    },
  })

  await prisma.area.create({
    data: {
      branchId: branchCentro.id,
      name: 'Terraza Exterior',
      sortOrder: 2,
      tables: {
        create: [
          { branchId: branchCentro.id, name: 'Mesa 4 (Terraza)', capacity: 2, status: TableStatus.AVAILABLE },
          { branchId: branchCentro.id, name: 'Mesa 5 (Terraza)', capacity: 6, status: TableStatus.AVAILABLE },
        ],
      },
    },
  })

  // ==========================================
  // 9. INVENTARIO (UNIDAD BASE + PRESENTACIONES + RECETARIO)
  // ==========================================
  console.log('📊 Creando insumos e inventario...')

  // 1. Café en grano (Base: GRAM)
  const coffeeItem = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: demoBusiness.id, sku: 'INS-CAFE-01' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      sku: 'INS-CAFE-01',
      name: 'Café de Especialidad Veracruz (Grano)',
      baseUnit: InventoryUnit.GRAM,
      costPerUnit: 0.35, // $0.35 por gramo ($350 por kg)
      reorderPoint: 2000,
      optimalStock: 10000,
      yieldLossFactor: 0.02,
      presentations: {
        create: [
          {
            name: 'Bolsa 1 kg',
            factorToBase: 1000,
            cost: 350.0,
            barcode: '750100010001',
          },
        ],
      },
    },
  })

  // 2. Leche entera (Base: ML)
  const milkItem = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: demoBusiness.id, sku: 'INS-LECHE-01' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      sku: 'INS-LECHE-01',
      name: 'Leche Entera Pasteurisada',
      baseUnit: InventoryUnit.ML,
      costPerUnit: 0.025, // $25 por litro
      reorderPoint: 5000,
      optimalStock: 24000,
      presentations: {
        create: [
          {
            name: 'Caja x 12 Litros',
            factorToBase: 12000,
            cost: 300.0,
            barcode: '750100020012',
          },
          {
            name: 'Envase Tetrapack 1 Litro',
            factorToBase: 1000,
            cost: 25.0,
            barcode: '750100020001',
          },
        ],
      },
    },
  })

  // 3. Vaso 12oz (Base: PIECE)
  const cupItem = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: demoBusiness.id, sku: 'INS-VASO-12' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      sku: 'INS-VASO-12',
      name: 'Vaso Caliente Biodegradable 12oz',
      baseUnit: InventoryUnit.PIECE,
      costPerUnit: 1.5,
      reorderPoint: 100,
      optimalStock: 500,
      presentations: {
        create: [
          {
            name: 'Manga x 50 Piezas',
            factorToBase: 50,
            cost: 75.0,
          },
        ],
      },
    },
  })

  // 4. Tapa 12oz (Base: PIECE)
  const lidItem = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: demoBusiness.id, sku: 'INS-TAPA-12' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      sku: 'INS-TAPA-12',
      name: 'Tapa para Vaso 12oz',
      baseUnit: InventoryUnit.PIECE,
      costPerUnit: 0.6,
      reorderPoint: 100,
      optimalStock: 500,
    },
  })

  // 5. Lata Refresco (Base: CAN - Direct Stock)
  const cokeItem = await prisma.inventoryItem.upsert({
    where: { businessId_sku: { businessId: demoBusiness.id, sku: 'INS-COKE-355' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      sku: 'INS-COKE-355',
      name: 'Coca-Cola Regular 355ml',
      baseUnit: InventoryUnit.CAN,
      costPerUnit: 14.0,
      reorderPoint: 24,
      optimalStock: 96,
      presentations: {
        create: [
          {
            name: 'Charola x 24 Latas',
            factorToBase: 24,
            cost: 336.0,
          },
        ],
      },
    },
  })

  // Stock inicial en almacén
  console.log('📈 Registrando stock inicial de prueba...')
  const initialStockData = [
    { item: coffeeItem, qty: 5000, cost: 0.35 },
    { item: milkItem, qty: 12000, cost: 0.025 },
    { item: cupItem, qty: 250, cost: 1.5 },
    { item: lidItem, qty: 250, cost: 0.6 },
    { item: cokeItem, qty: 48, cost: 14.0 },
  ]

  for (const s of initialStockData) {
    await prisma.warehouseStock.upsert({
      where: {
        warehouseId_inventoryItemId: {
          warehouseId: warehouseCentro.id,
          inventoryItemId: s.item.id,
        },
      },
      update: { quantity: s.qty },
      create: {
        warehouseId: warehouseCentro.id,
        inventoryItemId: s.item.id,
        quantity: s.qty,
      },
    })

    await prisma.stockMovement.create({
      data: {
        inventoryItemId: s.item.id,
        targetWarehouseId: warehouseCentro.id,
        type: StockMovementType.INITIAL,
        quantityBase: s.qty,
        unitCost: s.cost,
        totalCost: Number(s.qty) * Number(s.cost),
        notes: 'Carga de stock inicial de demostración',
      },
    })
  }

  // ==========================================
  // 10. PRODUCTOS VENDIBLES, VARIANTES Y RECETAS
  // ==========================================
  console.log('🏷️ Creando catálogo de productos...')

  // Categoría Cafetería
  const catCafe = await prisma.category.upsert({
    where: { businessId_slug: { businessId: demoBusiness.id, slug: 'cafeteria' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Cafetería de Especialidad',
      slug: 'cafeteria',
      sortOrder: 1,
    },
  })

  // Categoría Bebidas Frías
  const catFrias = await prisma.category.upsert({
    where: { businessId_slug: { businessId: demoBusiness.id, slug: 'bebidas-frias' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Bebidas Frías y Embotelladas',
      slug: 'bebidas-frias',
      sortOrder: 2,
    },
  })

  // Producto 1: Café Americano (RECETA)
  const productAmericano = await prisma.product.upsert({
    where: { businessId_code: { businessId: demoBusiness.id, code: 'PROD-AME-12' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      categoryId: catCafe.id,
      name: 'Café Americano 12oz',
      code: 'PROD-AME-12',
      description: 'Extracción doble de espresso con agua caliente filtrada.',
      inventoryPolicy: InventoryPolicy.RECIPE,
      variants: {
        create: [
          {
            name: 'Regular',
            price: 48.0,
            cost: 8.4, // (18g * 0.35 = 6.30) + (1 vaso 1.50) + (1 tapa 0.60)
            inventoryPolicy: InventoryPolicy.RECIPE,
            recipe: {
              create: {
                yieldServings: 1,
                items: {
                  create: [
                    { inventoryItemId: coffeeItem.id, quantityBase: 18 }, // 18 gramos de café
                    { inventoryItemId: cupItem.id, quantityBase: 1 },    // 1 vaso
                    { inventoryItemId: lidItem.id, quantityBase: 1 },    // 1 tapa
                  ],
                },
              },
            },
          },
        ],
      },
    },
  })

  // Producto 2: Café Latte (RECETA con Leche)
  const productLatte = await prisma.product.upsert({
    where: { businessId_code: { businessId: demoBusiness.id, code: 'PROD-LAT-12' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      categoryId: catCafe.id,
      name: 'Café Latte 12oz',
      code: 'PROD-LAT-12',
      description: 'Espresso doble con leche emulsionada sedosa.',
      inventoryPolicy: InventoryPolicy.RECIPE,
      variants: {
        create: [
          {
            name: 'Regular',
            price: 65.0,
            cost: 15.4, // 6.30 café + 7.00 leche (280ml) + 1.50 vaso + 0.60 tapa
            inventoryPolicy: InventoryPolicy.RECIPE,
            recipe: {
              create: {
                yieldServings: 1,
                items: {
                  create: [
                    { inventoryItemId: coffeeItem.id, quantityBase: 18 },  // 18 gramos
                    { inventoryItemId: milkItem.id, quantityBase: 280 },   // 280 ml leche
                    { inventoryItemId: cupItem.id, quantityBase: 1 },     // 1 vaso
                    { inventoryItemId: lidItem.id, quantityBase: 1 },     // 1 tapa
                  ],
                },
              },
            },
          },
        ],
      },
    },
  })

  // Producto 3: Coca-Cola (DIRECT - 1 unidad)
  const productCoke = await prisma.product.upsert({
    where: { businessId_code: { businessId: demoBusiness.id, code: 'PROD-COKE-355' } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      categoryId: catFrias.id,
      name: 'Coca-Cola Regular 355ml',
      code: 'PROD-COKE-355',
      description: 'Refresco en lata de 355ml bien frío.',
      inventoryPolicy: InventoryPolicy.DIRECT,
      variants: {
        create: [
          {
            name: 'Lata 355ml',
            price: 38.0,
            cost: 14.0,
            inventoryPolicy: InventoryPolicy.DIRECT,
            directItemId: cokeItem.id,
            directQuantity: 1,
          },
        ],
      },
    },
  })

  // ==========================================
  // 11. API KEY DE EJEMPLO PARA INTEGRACIONES EXTERNAS
  // ==========================================
  console.log('🔑 Creando API Key demo para integraciones...')

  await prisma.tenantApiKey.create({
    data: {
      businessId: demoBusiness.id,
      name: 'Integración E-Commerce Web',
      keyPrefix: 'pos_live',
      keyHash: 'dummy_hash_for_seed_verification',
      scopes: ['orders:read', 'orders:write', 'catalog:read', 'inventory:read'],
    },
  })

  console.log('\n✅ ¡Semilla de datos completada con éxito!')
  console.log('----------------------------------------------------')
  console.log('👑 Super Admin: admin@poscafe.app (Password: SuperAdmin2026!)')
  console.log('🏢 Tenant Demo: Café Aroma Demo')
  console.log('👔 Propietario: propietario@cafearoma.demo (Password: Owner2026!)')
  console.log('💳 Cajero Roma: carlos_pos (PIN: 1234)')
  console.log('🍽️ Mesero Roma: ana_mesas (PIN: 4321)')
  console.log('📍 Sucursales : Matriz Roma Norte, Sucursal Condesa')
  console.log('----------------------------------------------------\n')
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando semilla:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

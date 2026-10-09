'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Coffee,
  Package,
  Plus,
  ArrowLeft,
  Tag,
  Trash2,
  Loader2,
  AlertTriangle,
  Scale,
  Sparkles,
  Layers,
  UtensilsCrossed,
  CheckCircle,
  Edit2,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from 'lucide-react'
import { UNIT_DEFINITIONS, formatUnitName, formatUnitSymbol, formatUnitFull } from '@/lib/units'
import { useDashboardTheme } from '@/context/dashboard-theme-context'
import { notify } from '@/lib/notify'

interface InventoryItem {
  id: string
  sku: string
  name: string
  baseUnit: string
  costPerUnit: number
  reorderPoint: number | null
  presentations: Array<{ id: string; name: string; factorToBase: number; cost: number | null }>
}

interface Category {
  id: string
  name: string
  slug: string
  _count?: { products: number }
}

interface ModifierOption {
  id?: string
  name: string
  extraPrice: number
  inventoryItemId?: string | null
  quantityBase?: number | null
  active?: boolean
  inventoryItem?: { id: string; name: string; baseUnit: string } | null
}

interface ModifierGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  isRequired: boolean
  active: boolean
  modifiers: ModifierOption[]
  productsCount?: number
}

interface ProductVariant {
  id: string
  name: string
  price: number
  cost: number
  inventoryPolicy?: 'NONE' | 'DIRECT' | 'RECIPE'
  directItemId?: string | null
  directQuantity?: number | null
  recipe?: {
    items: Array<{
      id: string
      quantityBase: number
      inventoryItem: { id?: string; name: string; baseUnit: string; costPerUnit: number }
    }>
  }
}

interface Product {
  id: string
  name: string
  code: string
  description: string | null
  inventoryPolicy: 'NONE' | 'DIRECT' | 'RECIPE'
  hasVariants?: boolean
  category: { id: string; name: string }
  variants: ProductVariant[]
  modifierGroups?: Array<{
    modifierGroupId: string
    modifierGroup: ModifierGroup
  }>
}

interface MultiSizeRow {
  name: string
  price: string
  cost: string
  inventoryPolicy: 'NONE' | 'DIRECT' | 'RECIPE'
  directItemId: string
  directQuantity: string
  recipeItems: Array<{ inventoryItemId: string; quantityBase: string; onlyTakeaway?: boolean }>
}

interface CupSize {
  id: string
  name: string
  capacityOz: number | null
  cupItemId: string | null
  lidItemId: string | null
  sleeveItemId: string | null
  sortOrder: number
  active: boolean
  cupItem?: { id: string; name: string; baseUnit: string; costPerUnit: number } | null
  lidItem?: { id: string; name: string; baseUnit: string; costPerUnit: number } | null
  sleeveItem?: { id: string; name: string; baseUnit: string; costPerUnit: number } | null
}

export default function CatalogManagerPage() {
  const { isLight, buttonColor, primaryColor, contrastTextButton, classes } = useDashboardTheme()
  const [activeTab, setActiveTab] = useState<'products' | 'cupSizes' | 'ingredients' | 'modifiers' | 'categories'>('products')

  const [products, setProducts] = useState<Product[]>([])
  const [ingredients, setIngredients] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([])
  const [cupSizes, setCupSizes] = useState<CupSize[]>([])
  const [takeawaySettings, setTakeawaySettings] = useState({
    takeawayBagItemId: '',
    takeawayTrayItemId: '',
    takeawayFoodTrayItemId: '',
    takeawayCutleryItemId: '',
    takeawayStrawItemId: '',
  })
  const [businessSettings, setBusinessSettings] = useState<{ recipesEnabled: boolean }>({
    recipesEnabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modales
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)

  const [showItemModal, setShowItemModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const [showModGroupModal, setShowModGroupModal] = useState(false)
  const [editingModGroupId, setEditingModGroupId] = useState<string | null>(null)

  // Cup Size Modal state
  const [showCupSizeModal, setShowCupSizeModal] = useState(false)
  const [editingCupSizeId, setEditingCupSizeId] = useState<string | null>(null)
  const [cupSizeForm, setCupSizeForm] = useState({
    name: '',
    capacityOz: '',
    cupItemId: '',
    lidItemId: '',
    sleeveItemId: '',
  })
  const [submittingCupSize, setSubmittingCupSize] = useState(false)
  const [savingPackagingSettings, setSavingPackagingSettings] = useState(false)

  // Product Form state
  const [prodForm, setProdForm] = useState({
    categoryId: '',
    name: '',
    code: '',
    description: '',
    price: '',
    inventoryPolicy: 'RECIPE' as 'NONE' | 'DIRECT' | 'RECIPE',
    directItemId: '',
    directQuantity: '1',
    recipeItems: [] as Array<{ inventoryItemId: string; quantityBase: string; onlyTakeaway?: boolean }>,
    hasVariants: false,
    variants: [] as MultiSizeRow[],
    modifierGroupIds: [] as string[],
    ownFlavors: [] as Array<{ name: string; extraPrice: string }>,
  })
  const [flavorInput, setFlavorInput] = useState('')
  const [quickOptionInputs, setQuickOptionInputs] = useState<Record<string, string>>({})
  const [savingQuickOption, setSavingQuickOption] = useState<string | null>(null)
  const [submittingProduct, setSubmittingProduct] = useState(false)

  // Ingredient Form state
  const [itemForm, setItemForm] = useState({
    name: '',
    sku: '',
    baseUnit: 'GRAM',
    costPerUnit: '',
    reorderPoint: '',
    presentationName: '',
    presentationFactor: '',
    presentationCost: '',
  })
  const [submittingItem, setSubmittingItem] = useState(false)

  // Category Form state
  const [catName, setCatName] = useState('')
  const [submittingCategory, setSubmittingCategory] = useState(false)

  // Modifier Group Form state
  const [modGroupForm, setModGroupForm] = useState({
    name: '',
    minSelect: 0,
    maxSelect: 1,
    isRequired: false,
    modifiers: [
      { name: '', extraPrice: '0', inventoryItemId: '', quantityBase: '' },
    ] as Array<{ id?: string; name: string; extraPrice: string; inventoryItemId: string; quantityBase: string }>,
  })
  const [submittingModGroup, setSubmittingModGroup] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [resProd, resIng, resCat, resModGroups, resSettings, resCupSizes] = await Promise.all([
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/inventory/items').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/modifier-groups').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/business/settings').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/cup-sizes').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      ])

      if (resProd.success) setProducts(resProd.data)
      if (resIng.success) setIngredients(resIng.data)
      if (resCat.success) setCategories(resCat.data)
      if (resModGroups.success && Array.isArray(resModGroups.data)) setModifierGroups(resModGroups.data)
      if (resCupSizes.success && Array.isArray(resCupSizes.data)) setCupSizes(resCupSizes.data)
      if (resSettings.success && resSettings.data?.settings) {
        setBusinessSettings({
          recipesEnabled: resSettings.data.settings.recipesEnabled ?? true,
        })
        setTakeawaySettings({
          takeawayBagItemId: resSettings.data.settings.takeawayBagItemId || '',
          takeawayTrayItemId: resSettings.data.settings.takeawayTrayItemId || '',
          takeawayFoodTrayItemId: resSettings.data.settings.takeawayFoodTrayItemId || '',
          takeawayCutleryItemId: resSettings.data.settings.takeawayCutleryItemId || '',
          takeawayStrawItemId: resSettings.data.settings.takeawayStrawItemId || '',
        })
      }
    } catch {
      setError('Error al sincronizar datos del catálogo')
    } finally {
      setLoading(false)
    }
  }

  // Handlers para Tamaños de Vasos y Empaques
  const handleOpenCreateCupSize = () => {
    setError(null)
    setEditingCupSizeId(null)
    setCupSizeForm({
      name: '',
      capacityOz: '12',
      cupItemId: '',
      lidItemId: '',
      sleeveItemId: '',
    })
    setShowCupSizeModal(true)
  }

  const handleOpenEditCupSize = (cs: CupSize) => {
    setError(null)
    setEditingCupSizeId(cs.id)
    setCupSizeForm({
      name: cs.name,
      capacityOz: cs.capacityOz ? cs.capacityOz.toString() : '',
      cupItemId: cs.cupItemId || '',
      lidItemId: cs.lidItemId || '',
      sleeveItemId: cs.sleeveItemId || '',
    })
    setShowCupSizeModal(true)
  }

  const handleSaveCupSize = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmittingCupSize(true)

    try {
      const payload = {
        name: cupSizeForm.name.trim(),
        capacityOz: cupSizeForm.capacityOz ? Number(cupSizeForm.capacityOz) : null,
        cupItemId: cupSizeForm.cupItemId || null,
        lidItemId: cupSizeForm.lidItemId || null,
        sleeveItemId: cupSizeForm.sleeveItemId || null,
      }

      const url = editingCupSizeId ? `/api/cup-sizes/${editingCupSizeId}` : '/api/cup-sizes'
      const method = editingCupSizeId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        notify.success(
          editingCupSizeId ? 'Tamaño actualizado' : 'Tamaño creado',
          `"${cupSizeForm.name}" guardado exitosamente`
        )
        setShowCupSizeModal(false)
        setEditingCupSizeId(null)
        fetchData()
      } else {
        notify.error('Error al guardar', json.error?.message || 'Error al guardar tamaño de vaso')
        setError(json.error?.message || 'Error al guardar tamaño de vaso')
      }
    } catch {
      notify.error('Error de red', 'Error de red al guardar tamaño de vaso')
      setError('Error de red al guardar tamaño de vaso')
    } finally {
      setSubmittingCupSize(false)
    }
  }

  const handleDeleteCupSize = (id: string, name: string) => {
    notify.action({
      title: `¿Eliminar "${name}"?`,
      description: 'El tamaño de vaso se marcará como inactivo.',
      buttonText: 'Confirmar y Eliminar',
      onAction: async () => {
        try {
          const res = await fetch(`/api/cup-sizes/${id}`, { method: 'DELETE' })
          const json = await res.json()
          if (json.success) {
            notify.success('Tamaño eliminado', `Se eliminó "${name}"`)
            fetchData()
          } else {
            notify.error('Error al eliminar', json.error?.message || 'No se pudo eliminar el tamaño de vaso')
          }
        } catch {
          notify.error('Error de red', 'Falla al eliminar tamaño de vaso')
        }
      },
    })
  }

  const handleSaveTakeawaySettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPackagingSettings(true)
    try {
      const res = await fetch('/api/business/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(takeawaySettings),
      })
      const json = await res.json()
      if (json.success) {
        notify.success('Empaques guardados', 'Configuración de empaques para llevar guardada exitosamente')
        fetchData()
      } else {
        notify.error('Error al guardar', json.error?.message || 'Error al guardar empaques para llevar')
      }
    } catch {
      notify.error('Error de red', 'Falla de red al guardar empaques')
    } finally {
      setSavingPackagingSettings(false)
    }
  }

  const addVariantFromCupSize = (cupSize: CupSize) => {
    const newItems: Array<{ inventoryItemId: string; quantityBase: string; onlyTakeaway: boolean }> = []

    if (cupSize.cupItemId) {
      newItems.push({ inventoryItemId: cupSize.cupItemId, quantityBase: '1', onlyTakeaway: true })
    }
    if (cupSize.lidItemId) {
      newItems.push({ inventoryItemId: cupSize.lidItemId, quantityBase: '1', onlyTakeaway: true })
    }
    if (cupSize.sleeveItemId) {
      newItems.push({ inventoryItemId: cupSize.sleeveItemId, quantityBase: '1', onlyTakeaway: true })
    }

    setProdForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          name: cupSize.name,
          price: (45 + prev.variants.length * 10).toFixed(2),
          cost: '0',
          inventoryPolicy: 'RECIPE',
          directItemId: '',
          directQuantity: '1',
          recipeItems: newItems,
        },
      ],
    }))
  }

  useEffect(() => {
    fetchData()
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab === 'cupSizes' || tab === 'products' || tab === 'ingredients' || tab === 'modifiers' || tab === 'categories') {
        setActiveTab(tab)
      }
    }
  }, [])

  useEffect(() => {
    if (!businessSettings.recipesEnabled && activeTab === 'ingredients') {
      setActiveTab('products')
    }
  }, [businessSettings.recipesEnabled, activeTab])

  // Helper para agregar ingrediente a la receta simple
  const addRecipeRow = () => {
    if (ingredients.length === 0) return
    setProdForm((prev) => ({
      ...prev,
      recipeItems: [...prev.recipeItems, { inventoryItemId: ingredients[0].id, quantityBase: '10', onlyTakeaway: false }],
    }))
  }

  const removeRecipeRow = (idx: number) => {
    setProdForm((prev) => ({
      ...prev,
      recipeItems: prev.recipeItems.filter((_, i) => i !== idx),
    }))
  }

  // Helper para tamaños múltiples
  const addVariantRow = () => {
    setProdForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          name: prev.variants.length === 0 ? 'Chico 8oz' : prev.variants.length === 1 ? 'Mediano 12oz' : 'Grande 16oz',
          price: '55.00',
          cost: '0',
          inventoryPolicy: prev.inventoryPolicy,
          directItemId: '',
          directQuantity: '1',
          recipeItems: ingredients.length > 0 ? [{ inventoryItemId: ingredients[0].id, quantityBase: '10', onlyTakeaway: false }] : [],
        },
      ],
    }))
  }

  const removeVariantRow = (idx: number) => {
    setProdForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }))
  }

  const addVariantRecipeRow = (varIdx: number) => {
    if (ingredients.length === 0) return
    setProdForm((prev) => {
      const copy = [...prev.variants]
      copy[varIdx].recipeItems.push({ inventoryItemId: ingredients[0].id, quantityBase: '10', onlyTakeaway: false })
      return { ...prev, variants: copy }
    })
  }

  const removeVariantRecipeRow = (varIdx: number, itemIdx: number) => {
    setProdForm((prev) => {
      const copy = [...prev.variants]
      copy[varIdx].recipeItems = copy[varIdx].recipeItems.filter((_, i) => i !== itemIdx)
      return { ...prev, variants: copy }
    })
  }

  // Costo calculado en tiempo real para producto simple
  const liveRecipeCost = prodForm.recipeItems.reduce((acc, curr) => {
    const ing = ingredients.find((i) => i.id === curr.inventoryItemId)
    if (!ing) return acc
    return acc + Number(ing.costPerUnit) * (Number(curr.quantityBase) || 0)
  }, 0)

  // Costo por variante
  const getVariantCost = (varRow: MultiSizeRow) => {
    return varRow.recipeItems.reduce((acc, curr) => {
      const ing = ingredients.find((i) => i.id === curr.inventoryItemId)
      if (!ing) return acc
      return acc + Number(ing.costPerUnit) * (Number(curr.quantityBase) || 0)
    }, 0)
  }

  // Handlers para Sabores propios del producto
  const handleAddFlavors = () => {
    if (!flavorInput.trim()) return
    const splitted = flavorInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    if (splitted.length === 0) return

    setProdForm((prev) => {
      const existingNames = new Set(prev.ownFlavors.map((f) => f.name.toLowerCase()))
      const toAdd = splitted
        .filter((name) => !existingNames.has(name.toLowerCase()))
        .map((name) => ({ name, extraPrice: '0' }))

      return {
        ...prev,
        ownFlavors: [...prev.ownFlavors, ...toAdd],
      }
    })
    setFlavorInput('')
  }

  const handleRemoveFlavor = (index: number) => {
    setProdForm((prev) => ({
      ...prev,
      ownFlavors: prev.ownFlavors.filter((_, i) => i !== index),
    }))
  }

  // Helper para agregar una opción rápida a un grupo desde su tarjeta
  const handleQuickAddOption = async (groupId: string) => {
    const text = quickOptionInputs[groupId]?.trim()
    if (!text) return

    setSavingQuickOption(groupId)
    try {
      const res = await fetch(`/api/modifier-groups/${groupId}/modifiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: text, extraPrice: 0 }),
      })
      const json = await res.json()
      if (json.success) {
        notify.success('Opción agregada', `Se agregó "${text}"`)
        setQuickOptionInputs((prev) => ({ ...prev, [groupId]: '' }))
        fetchData()
      } else {
        notify.error('Error al agregar', json.error?.message || 'Error al agregar opción')
      }
    } catch {
      notify.error('Error de red', 'Error de red al agregar opción')
    } finally {
      setSavingQuickOption(null)
    }
  }

  // Abrir modal de creación de producto
  const handleOpenCreateProduct = () => {
    setError(null)
    setEditingProductId(null)
    setFlavorInput('')
    setProdForm({
      categoryId: categories[0]?.id || '',
      name: '',
      code: '',
      description: '',
      price: '',
      inventoryPolicy: 'RECIPE',
      directItemId: '',
      directQuantity: '1',
      recipeItems: [],
      hasVariants: false,
      variants: [
        {
          name: 'Chico 8oz',
          price: '45.00',
          cost: '0',
          inventoryPolicy: 'RECIPE',
          directItemId: '',
          directQuantity: '1',
          recipeItems: [],
        },
        {
          name: 'Mediano 12oz',
          price: '55.00',
          cost: '0',
          inventoryPolicy: 'RECIPE',
          directItemId: '',
          directQuantity: '1',
          recipeItems: [],
        },
      ],
      modifierGroupIds: [],
      ownFlavors: [],
    })
    setShowProductModal(true)
  }

  // Abrir modal de edición de producto
  const handleOpenEditProduct = (prod: Product) => {
    setError(null)
    setEditingProductId(prod.id)
    setFlavorInput('')

    const hasMulti = Boolean(prod.hasVariants && prod.variants.length > 1)
    const firstVariant = prod.variants[0]

    // Buscar si ya tiene un grupo de sabores propios asociado ("Sabores de [nombre]")
    const ownFlavorGroup = prod.modifierGroups?.find(
      (mg) =>
        mg.modifierGroup.name.toLowerCase().startsWith('sabores de ') ||
        mg.modifierGroup.name.toLowerCase() === `sabores de ${prod.name.toLowerCase()}`
    )?.modifierGroup

    const ownFlavorsList = ownFlavorGroup
      ? ownFlavorGroup.modifiers.map((m) => ({
          name: m.name,
          extraPrice: m.extraPrice.toString(),
        }))
      : []

    // Grupos asignados (excluyendo el grupo de sabores propios para no duplicar en extras generales)
    const assignedGroupIds = prod.modifierGroups
      ? prod.modifierGroups
          .filter((mg) => mg.modifierGroupId !== ownFlavorGroup?.id)
          .map((mg) => mg.modifierGroupId)
      : []

    const singleRecipeItems =
      firstVariant?.recipe?.items?.map((it: any) => ({
        inventoryItemId: it.inventoryItem?.id || '',
        quantityBase: it.quantityBase.toString(),
        onlyTakeaway: Boolean(it.onlyTakeaway),
      })) || []

    const multiVariants: MultiSizeRow[] = prod.variants.map((v) => ({
      name: v.name,
      price: v.price.toString(),
      cost: v.cost.toString(),
      inventoryPolicy: v.inventoryPolicy || prod.inventoryPolicy,
      directItemId: v.directItemId || '',
      directQuantity: (v.directQuantity || 1).toString(),
      recipeItems:
        v.recipe?.items?.map((it: any) => ({
          inventoryItemId: it.inventoryItem?.id || '',
          quantityBase: it.quantityBase.toString(),
          onlyTakeaway: Boolean(it.onlyTakeaway),
        })) || [],
    }))

    setProdForm({
      categoryId: prod.category.id,
      name: prod.name,
      code: prod.code,
      description: prod.description || '',
      price: firstVariant ? firstVariant.price.toString() : '0',
      inventoryPolicy: prod.inventoryPolicy,
      directItemId: firstVariant?.directItemId || '',
      directQuantity: (firstVariant?.directQuantity || 1).toString(),
      recipeItems: singleRecipeItems,
      hasVariants: hasMulti,
      variants: multiVariants.length > 0 ? multiVariants : [
        {
          name: 'Chico 8oz',
          price: '45.00',
          cost: '0',
          inventoryPolicy: prod.inventoryPolicy,
          directItemId: '',
          directQuantity: '1',
          recipeItems: [],
        },
      ],
      modifierGroupIds: assignedGroupIds,
      ownFlavors: ownFlavorsList,
    })

    setShowProductModal(true)
  }

  // Guardar Producto (Crear o Actualizar)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmittingProduct(true)

    try {
      let payload: any = {
        categoryId: prodForm.categoryId,
        name: prodForm.name,
        code: prodForm.code,
        description: prodForm.description,
        inventoryPolicy: prodForm.inventoryPolicy,
        modifierGroupIds: prodForm.modifierGroupIds,
        ownFlavors: prodForm.ownFlavors.map((f) => ({
          name: f.name.trim(),
          extraPrice: Number(f.extraPrice) || 0,
        })),
      }

      if (prodForm.hasVariants) {
        if (prodForm.variants.length === 0) {
          setError('Agrega al menos un tamaño o variante')
          setSubmittingProduct(false)
          return
        }
        payload.variants = prodForm.variants.map((v) => ({
          name: v.name.trim(),
          price: Number(v.price) || 0,
          cost: getVariantCost(v),
          inventoryPolicy: v.inventoryPolicy || prodForm.inventoryPolicy,
          directItemId: v.directItemId || null,
          directQuantity: Number(v.directQuantity) || 1,
          recipeItems: v.recipeItems.map((r) => ({
            inventoryItemId: r.inventoryItemId,
            quantityBase: Number(r.quantityBase) || 0,
            onlyTakeaway: Boolean(r.onlyTakeaway),
          })),
        }))
      } else {
        payload.price = Number(prodForm.price) || 0
        payload.cost = liveRecipeCost
        payload.directItemId = prodForm.directItemId || null
        payload.directQuantity = Number(prodForm.directQuantity) || 1
        payload.recipeItems = prodForm.recipeItems.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantityBase: Number(r.quantityBase) || 0,
          onlyTakeaway: Boolean(r.onlyTakeaway),
        }))
        payload.variants = [
          {
            name: 'Regular',
            price: Number(prodForm.price) || 0,
            cost: liveRecipeCost,
            inventoryPolicy: prodForm.inventoryPolicy,
            directItemId: prodForm.directItemId || null,
            directQuantity: Number(prodForm.directQuantity) || 1,
            recipeItems: payload.recipeItems,
          },
        ]
      }

      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products'
      const method = editingProductId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        setShowProductModal(false)
        setEditingProductId(null)
        fetchData()
      } else {
        setError(json.error?.message || 'Error al guardar producto')
      }
    } catch {
      setError('Error de red al guardar producto')
    } finally {
      setSubmittingProduct(false)
    }
  }

  // Eliminar producto
  const handleDeleteProduct = (id: string, name: string) => {
    notify.action({
      title: `¿Archivar "${name}"?`,
      description: 'El producto se marcará como inactivo en el catálogo.',
      buttonText: 'Confirmar y Archivar',
      onAction: async () => {
        try {
          const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
          const json = await res.json()
          if (json.success) {
            notify.success('Producto archivado', `"${name}" fue archivado exitosamente`)
            fetchData()
          } else {
            notify.error('Error al archivar', json.error?.message || 'No se pudo eliminar el producto')
          }
        } catch {
          notify.error('Error de red', 'Falla de red al archivar producto')
        }
      },
    })
  }

  // Submit Insumo
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmittingItem(true)

    try {
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm),
      })
      const json = await res.json()

      if (json.success) {
        setShowItemModal(false)
        setItemForm({
          name: '',
          sku: '',
          baseUnit: 'GRAM',
          costPerUnit: '',
          reorderPoint: '',
          presentationName: '',
          presentationFactor: '',
          presentationCost: '',
        })
        fetchData()
      } else {
        setError(json.error?.message || 'Error al guardar insumo')
      }
    } catch {
      setError('Error de red al guardar insumo')
    } finally {
      setSubmittingItem(false)
    }
  }

  // Submit Categoría
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return
    setError(null)
    setSubmittingCategory(true)

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName }),
      })
      const json = await res.json()

      if (json.success) {
        setShowCategoryModal(false)
        setCatName('')
        fetchData()
      } else {
        setError(json.error?.message || 'Error al crear categoría')
      }
    } catch {
      setError('Error de red al crear categoría')
    } finally {
      setSubmittingCategory(false)
    }
  }

  // MODIFIERS / SABORES Y EXTRAS CRUD
  const handleOpenCreateModGroup = () => {
    setError(null)
    setEditingModGroupId(null)
    setModGroupForm({
      name: '',
      minSelect: 0,
      maxSelect: 1,
      isRequired: false,
      modifiers: [
        { name: 'Vainilla Francesa', extraPrice: '10.00', inventoryItemId: '', quantityBase: '15' },
        { name: 'Caramelo Toffee', extraPrice: '10.00', inventoryItemId: '', quantityBase: '15' },
      ],
    })
    setShowModGroupModal(true)
  }

  const handleOpenEditModGroup = (group: ModifierGroup) => {
    setError(null)
    setEditingModGroupId(group.id)
    setModGroupForm({
      name: group.name,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      isRequired: group.isRequired,
      modifiers: group.modifiers.map((m) => ({
        id: m.id,
        name: m.name,
        extraPrice: m.extraPrice.toString(),
        inventoryItemId: m.inventoryItemId || '',
        quantityBase: m.quantityBase ? m.quantityBase.toString() : '',
      })),
    })
    setShowModGroupModal(true)
  }

  const handleSaveModGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmittingModGroup(true)

    try {
      const payload = {
        name: modGroupForm.name.trim(),
        minSelect: Number(modGroupForm.minSelect) || 0,
        maxSelect: Number(modGroupForm.maxSelect) || 1,
        isRequired: Boolean(modGroupForm.isRequired),
        modifiers: modGroupForm.modifiers
          .filter((m) => m.name.trim().length > 0)
          .map((m) => ({
            id: m.id,
            name: m.name.trim(),
            extraPrice: Number(m.extraPrice) || 0,
            inventoryItemId: m.inventoryItemId || null,
            quantityBase: m.quantityBase ? Number(m.quantityBase) : null,
          })),
      }

      const url = editingModGroupId ? `/api/modifier-groups/${editingModGroupId}` : '/api/modifier-groups'
      const method = editingModGroupId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        setShowModGroupModal(false)
        setEditingModGroupId(null)
        fetchData()
      } else {
        setError(json.error?.message || 'Error al guardar grupo de modificadores')
      }
    } catch {
      setError('Error de red al guardar grupo de modificadores')
    } finally {
      setSubmittingModGroup(false)
    }
  }

  const handleDeleteModGroup = (id: string, name: string) => {
    notify.action({
      title: `¿Eliminar "${name}"?`,
      description: 'Se eliminarán sus opciones asociadas.',
      buttonText: 'Confirmar y Eliminar',
      onAction: async () => {
        try {
          const res = await fetch(`/api/modifier-groups/${id}`, { method: 'DELETE' })
          const json = await res.json()
          if (json.success) {
            notify.success('Grupo eliminado', `"${name}" fue eliminado`)
            fetchData()
          } else {
            notify.error('Error al eliminar', json.error?.message || 'No se pudo eliminar el grupo')
          }
        } catch {
          notify.error('Error de red', 'Falla de red al eliminar grupo')
        }
      },
    })
  }

  const addModifierRow = () => {
    setModGroupForm((prev) => ({
      ...prev,
      modifiers: [
        ...prev.modifiers,
        { name: '', extraPrice: '0', inventoryItemId: '', quantityBase: '' },
      ],
    }))
  }

  const removeModifierRow = (idx: number) => {
    setModGroupForm((prev) => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, i) => i !== idx),
    }))
  }

  return (
    <div className={`flex-1 flex flex-col w-full ${classes.textMain}`}>
      {/* Top Navbar */}
      <header className={`border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30 transition-colors ${classes.header}`}>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer ${classes.buttonGhost}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className={`h-5 w-px border-l ${classes.divider}`}></div>
          <div>
            <h1 className={`font-bold text-base flex items-center gap-2 ${isLight ? 'text-[#2B1712]' : 'text-white'}`}>
              <Package className="w-5 h-5" style={{ color: buttonColor }} />
              Catálogo, Recetas y Modificadores
            </h1>
            <p className={`text-xs ${classes.textMuted}`}>
              Productos, tamaños, escandallos, insumos base y sabores con descuento de stock
            </p>
          </div>
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'products' && (
            <button
              type="button"
              onClick={handleOpenCreateProduct}
              style={{ backgroundColor: buttonColor, color: contrastTextButton }}
              className="px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          )}

          {activeTab === 'cupSizes' && (
            <button
              type="button"
              onClick={handleOpenCreateCupSize}
              style={{ backgroundColor: buttonColor, color: contrastTextButton }}
              className="px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Tamaño de Vaso</span>
            </button>
          )}

          {activeTab === 'ingredients' && businessSettings.recipesEnabled && (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setShowItemModal(true)
              }}
              style={{ backgroundColor: buttonColor, color: contrastTextButton }}
              className="px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Insumo Base</span>
            </button>
          )}

          {activeTab === 'modifiers' && (
            <button
              type="button"
              onClick={handleOpenCreateModGroup}
              style={{ backgroundColor: buttonColor, color: contrastTextButton }}
              className="px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Grupo de Sabores / Extras</span>
            </button>
          )}

          {activeTab === 'categories' && (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setShowCategoryModal(true)
              }}
              style={{ backgroundColor: buttonColor, color: contrastTextButton }}
              className="px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Categoría</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full p-6 sm:p-8 space-y-6 transition-all duration-300">
        {/* Navigation Tabs */}
        <div className={`flex flex-wrap gap-2 border-b pb-3 ${classes.divider}`}>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            style={activeTab === 'products' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'shadow-md font-bold'
                : `${classes.buttonGhost} ${classes.textMuted}`
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Productos Vendibles ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cupSizes')}
            style={activeTab === 'cupSizes' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'cupSizes'
                ? 'shadow-md font-bold'
                : `${classes.buttonGhost} ${classes.textMuted}`
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Vasos y Empaques ({cupSizes.length})</span>
          </button>

          {businessSettings.recipesEnabled && (
            <button
              type="button"
              onClick={() => setActiveTab('ingredients')}
              style={activeTab === 'ingredients' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ingredients'
                  ? 'shadow-md font-bold'
                  : `${classes.buttonGhost} ${classes.textMuted}`
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Insumos y Unidad Base ({ingredients.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('modifiers')}
            style={activeTab === 'modifiers' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'modifiers'
                ? 'shadow-md font-bold'
                : `${classes.buttonGhost} ${classes.textMuted}`
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Sabores y Extras ({modifierGroups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            style={activeTab === 'categories' ? { backgroundColor: buttonColor, color: contrastTextButton } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'shadow-md font-bold'
                : `${classes.buttonGhost} ${classes.textMuted}`
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categorías ({categories.length})</span>
          </button>
        </div>

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
            <p className="text-xs">Cargando catálogo, recetas y modificadores...</p>
          </div>
        )}

        {/* TAB 1: PRODUCTOS VENDIBLES */}
        {!loading && activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => {
              const hasMultiSizes = Boolean(p.hasVariants && p.variants.length > 1)
              const firstVariant = p.variants[0]
              const price = firstVariant ? Number(firstVariant.price) : 0
              const cost = firstVariant ? Number(firstVariant.cost) : 0
              const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(0) : '0'

              return (
                <div
                  key={p.id}
                  className={`rounded-3xl border p-5 space-y-4 transition-all flex flex-col justify-between ${classes.card}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${classes.badge}`}>
                          {p.category.name}
                        </span>
                        <h3 className={`text-base font-bold mt-1 ${classes.textMain}`}>{p.name}</h3>
                        <span className={`text-[10px] font-mono ${classes.textSub}`}>{p.code}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(p)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer hover:bg-amber-500/10 hover:text-amber-500 ${classes.textSub}`}
                          title="Editar producto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer hover:bg-rose-500/10 hover:text-rose-500 ${classes.textSub}`}
                          title="Archivar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className={`text-xs line-clamp-2 ${classes.textMuted}`}>
                      {p.description || 'Sin descripción'}
                    </p>

                    {/* Múltiples Tamaños o Receta Simple */}
                    {hasMultiSizes ? (
                      <div className={`p-3 rounded-2xl border space-y-2 ${classes.subCard}`}>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          {p.variants.length} Tamaños Configurados:
                        </span>
                        <div className="space-y-1.5">
                          {p.variants.map((v) => (
                            <div key={v.id} className="flex items-center justify-between text-xs">
                              <span className={`font-medium ${classes.textMain}`}>{v.name}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] ${classes.textSub}`}>
                                  Receta: {v.recipe?.items?.length || 0} insumos
                                </span>
                                <strong className="font-bold text-emerald-600 dark:text-emerald-400">
                                  ${Number(v.price).toFixed(2)}
                                </strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {p.inventoryPolicy === 'RECIPE' && firstVariant?.recipe && (
                          <div className={`p-2.5 rounded-xl border space-y-1.5 ${classes.subCard}`}>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Receta ({firstVariant.recipe.items.length} insumos):
                            </span>
                            <div className={`text-[11px] space-y-0.5 ${classes.textMuted}`}>
                              {firstVariant.recipe.items.map((it) => (
                                <div key={it.id} className="flex justify-between">
                                  <span>{it.inventoryItem.name}</span>
                                  <strong className={`font-semibold ${classes.textMain}`}>
                                    {Number(it.quantityBase)} {formatUnitSymbol(it.inventoryItem.baseUnit)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {p.inventoryPolicy === 'DIRECT' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            📦 Inventario Directo (1 unidad)
                          </span>
                        )}

                        {p.inventoryPolicy === 'NONE' && (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border ${classes.badge}`}>
                            🚫 Sin Inventario
                          </span>
                        )}
                      </div>
                    )}

                    {/* Modificadores Vinculados */}
                    {p.modifierGroups && p.modifierGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {p.modifierGroups.map((mg) => (
                          <span
                            key={mg.modifierGroupId}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                          >
                            + {mg.modifierGroup.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Financial Metrics Footer */}
                  <div className={`pt-3 border-t flex items-center justify-between text-xs ${classes.divider}`}>
                    <div>
                      <span className={`text-[10px] block ${classes.textSub}`}>
                        {hasMultiSizes ? 'Rango de Precios' : 'Precio Venta'}
                      </span>
                      <strong className={`text-sm font-bold ${classes.textMain}`}>
                        {hasMultiSizes
                          ? `$${Math.min(...p.variants.map((v) => Number(v.price))).toFixed(2)} - $${Math.max(...p.variants.map((v) => Number(v.price))).toFixed(2)}`
                          : `$${price.toFixed(2)} MXN`}
                      </strong>
                    </div>

                    {!hasMultiSizes && (
                      <>
                        <div className="text-center">
                          <span className={`text-[10px] block ${classes.textSub}`}>Costo Insumos</span>
                          <span className={`text-xs font-semibold ${classes.textMuted}`}>${cost.toFixed(2)}</span>
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] block ${classes.textSub}`}>Margen</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{margin}%</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB VASOS Y EMPAQUES (TAMAÑOS Y DESECHABLES) */}
        {!loading && activeTab === 'cupSizes' && (
          <div className="space-y-6">
            {/* Header info */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${classes.card}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${classes.textMain}`}>
                    Tamaños de Vasos y Empaques Desechables
                  </h3>
                  <p className={`text-xs ${classes.textMuted}`}>
                    Define tus tamaños de vasos (Chico, Mediano, Grande) y asócialos con sus vasos desechables y tapas de almacén. En consumo en salón (Comer aquí) NO se descontará vaso ni tapa; en órdenes para llevar sí se descontarán automáticamente.
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: Tamaños de Vasos Registrados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-sm font-bold ${classes.textMain}`}>Tamaños de Vasos</h4>
                  <p className={`text-xs ${classes.textMuted}`}>
                    Vasos y tapas precargables en las recetas de tus bebidas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateCupSize}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md hover:opacity-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Tamaño</span>
                </button>
              </div>

              {cupSizes.length === 0 ? (
                <div className={`py-10 rounded-3xl border text-center space-y-3 ${classes.card}`}>
                  <Package className="w-8 h-8 mx-auto opacity-40" style={{ color: buttonColor }} />
                  <h4 className={`text-sm font-bold ${classes.textMain}`}>Sin tamaños de vasos configurados</h4>
                  <p className={`text-xs max-w-sm mx-auto ${classes.textMuted}`}>
                    Crea tamaños estándar como &quot;Chico 8oz&quot;, &quot;Mediano 12oz&quot; o &quot;Grande 16oz&quot; para precargar rápidamente sus vasos y tapas en las recetas.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateCupSize}
                    style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Plus className="w-4 h-4" /> Crear Primer Tamaño
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cupSizes.map((cs) => (
                    <div
                      key={cs.id}
                      className={`p-5 rounded-3xl border space-y-3 flex flex-col justify-between ${classes.card}`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${classes.badge}`}>
                              {cs.capacityOz ? `${Number(cs.capacityOz)} oz` : 'Tamaño'}
                            </span>
                            <h3 className={`text-base font-bold mt-1.5 ${classes.textMain}`}>{cs.name}</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCupSize(cs)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer hover:bg-amber-500/10 hover:text-amber-500 ${classes.textSub}`}
                              title="Editar tamaño"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCupSize(cs.id, cs.name)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer hover:bg-rose-500/10 hover:text-rose-500 ${classes.textSub}`}
                              title="Eliminar tamaño"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Insumos asociados */}
                        <div className="space-y-1.5 pt-1">
                          <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${classes.subCard}`}>
                            <div>
                              <span className={`text-[10px] font-semibold block ${classes.textSub}`}>📦 Vaso Desechable:</span>
                              <span className={`font-semibold ${classes.textMain}`}>
                                {cs.cupItem ? cs.cupItem.name : 'Sin insumo asignado'}
                              </span>
                            </div>
                            {cs.cupItem && (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                ${Number(cs.cupItem.costPerUnit).toFixed(2)}/pza
                              </span>
                            )}
                          </div>

                          <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${classes.subCard}`}>
                            <div>
                              <span className={`text-[10px] font-semibold block ${classes.textSub}`}>📦 Tapa Desechable:</span>
                              <span className={`font-semibold ${classes.textMain}`}>
                                {cs.lidItem ? cs.lidItem.name : 'Sin tapa asignada'}
                              </span>
                            </div>
                            {cs.lidItem && (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                ${Number(cs.lidItem.costPerUnit).toFixed(2)}/pza
                              </span>
                            )}
                          </div>

                          {cs.sleeveItem && (
                            <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${classes.subCard}`}>
                              <div>
                                <span className={`text-[10px] font-semibold block ${classes.textSub}`}>📦 Manga de Cartón:</span>
                                <span className={`font-semibold ${classes.textMain}`}>{cs.sleeveItem.name}</span>
                              </div>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                ${Number(cs.sleeveItem.costPerUnit).toFixed(2)}/pza
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`pt-2.5 border-t text-[11px] flex justify-between ${classes.divider} ${classes.textMuted}`}>
                        <span>Descuento condicional:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">Solo para llevar 🥡</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN 2: Empaques Generales para Llevar (Bolsas, Charolas, Cubiertos) */}
            <div className={`p-6 rounded-3xl border space-y-4 ${classes.card}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-sm font-bold flex items-center gap-2 ${classes.textMain}`}>
                    <Package className="w-4 h-4 text-amber-500" />
                    Empaques Generales de Pedidos Para Llevar
                  </h4>
                  <p className={`text-xs ${classes.textMuted}`}>
                    Asocia los insumos de stock que se consumen en tickets y comandas para llevar (bolsas, charolas portavasos y cubiertos)
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveTakeawaySettings} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className={`block font-semibold mb-1 text-xs ${classes.textMain}`}>
                    🛍️ Bolsa para Llevar
                  </label>
                  <p className={`text-[10px] mb-1.5 ${classes.textSub}`}>
                    Se descuenta 1 unidad por cada orden para llevar
                  </p>
                  <select
                    value={takeawaySettings.takeawayBagItemId}
                    onChange={(e) => setTakeawaySettings({ ...takeawaySettings, takeawayBagItemId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${classes.input}`}
                  >
                    <option value="">Ninguno (No descontar bolsa)</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({formatUnitSymbol(ing.baseUnit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 text-xs ${classes.textMain}`}>
                    ☕ Charola Portavasos
                  </label>
                  <p className={`text-[10px] mb-1.5 ${classes.textSub}`}>
                    Se descuenta en pedidos para llevar con 2 o más bebidas
                  </p>
                  <select
                    value={takeawaySettings.takeawayTrayItemId}
                    onChange={(e) => setTakeawaySettings({ ...takeawaySettings, takeawayTrayItemId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${classes.input}`}
                  >
                    <option value="">Ninguno (No descontar charola)</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({formatUnitSymbol(ing.baseUnit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 text-xs ${classes.textMain}`}>
                    🍴 Cubiertos Desechables
                  </label>
                  <p className={`text-[10px] mb-1.5 ${classes.textSub}`}>
                    Insumo para kits de cubiertos biodegradables o de plástico
                  </p>
                  <select
                    value={takeawaySettings.takeawayCutleryItemId}
                    onChange={(e) => setTakeawaySettings({ ...takeawaySettings, takeawayCutleryItemId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${classes.input}`}
                  >
                    <option value="">Ninguno (No descontar cubiertos)</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({formatUnitSymbol(ing.baseUnit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 text-xs ${classes.textMain}`}>
                    🍱 Charola / Contenedor para Comida
                  </label>
                  <p className={`text-[10px] mb-1.5 ${classes.textSub}`}>
                    Charola térmica o caja de comida para platillos y alimentos
                  </p>
                  <select
                    value={takeawaySettings.takeawayFoodTrayItemId}
                    onChange={(e) => setTakeawaySettings({ ...takeawaySettings, takeawayFoodTrayItemId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${classes.input}`}
                  >
                    <option value="">Ninguno (No descontar charola de comida)</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({formatUnitSymbol(ing.baseUnit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 text-xs ${classes.textMain}`}>
                    🥤 Popotes / Pajillas Desechables
                  </label>
                  <p className={`text-[10px] mb-1.5 ${classes.textSub}`}>
                    Popotes biodegradables o de papel para bebidas para llevar
                  </p>
                  <select
                    value={takeawaySettings.takeawayStrawItemId}
                    onChange={(e) => setTakeawaySettings({ ...takeawaySettings, takeawayStrawItemId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${classes.input}`}
                  >
                    <option value="">Ninguno (No descontar popotes)</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({formatUnitSymbol(ing.baseUnit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 lg:col-span-3 flex justify-end pt-2 border-t border-dashed border-white/10">
                  <button
                    type="submit"
                    disabled={savingPackagingSettings}
                    style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                    className="px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer hover:opacity-95 disabled:opacity-50"
                  >
                    {savingPackagingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Guardar Configuración de Empaques</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: INSUMOS EN UNIDAD BASE */}
        {!loading && activeTab === 'ingredients' && (
          <div className={`rounded-3xl border overflow-hidden ${classes.card}`}>
            <div className={`p-5 border-b flex items-center justify-between ${classes.divider}`}>
              <div>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${classes.textMain}`}>
                  <Scale className="w-4 h-4 text-amber-500" /> Insumos Base de Inventario
                </h3>
                <p className={`text-xs ${classes.textMuted}`}>
                  Todo insumo se registra en una única unidad base (ml, g, piezas) para alimentar recetas y compras.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full text-left text-xs ${classes.textMain}`}>
                <thead className={`uppercase font-semibold text-[10px] border-b ${classes.tableHeader}`}>
                  <tr>
                    <th className="p-3.5">SKU / Insumo</th>
                    <th className="p-3.5">Unidad Base</th>
                    <th className="p-3.5">Costo Unitario Base</th>
                    <th className="p-3.5">Presentación de Compra</th>
                    <th className="p-3.5">Factor a Base</th>
                    <th className="p-3.5">Pto. Reorden</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-[#E6D5C3]/60' : 'divide-white/5'}`}>
                  {ingredients.map((item) => (
                    <tr key={item.id} className={`transition-colors ${classes.tableRow}`}>
                      <td className={`p-3.5 font-semibold ${classes.textMain}`}>
                        <span className={`font-mono text-[10px] block ${classes.textSub}`}>{item.sku}</span>
                        {item.name}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded border font-mono text-[11px] ${classes.badge}`}>
                          {formatUnitFull(item.baseUnit)}
                        </span>
                      </td>
                      <td
                        className={`p-3.5 font-medium ${classes.textMuted}`}
                        title={`Costo matemático exacto: $${Number(item.costPerUnit)} MXN / ${formatUnitSymbol(item.baseUnit)}`}
                      >
                        ${Number(item.costPerUnit).toFixed(2)} / {formatUnitSymbol(item.baseUnit)}
                      </td>
                      <td className="p-3.5">
                        {item.presentations.length > 0 ? (
                          <div className="space-y-0.5">
                            {item.presentations.map((pr) => (
                              <span key={pr.id} className={`block ${classes.textMuted}`}>
                                {pr.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={classes.textSub}>Unitaria</span>
                        )}
                      </td>
                      <td className={`p-3.5 font-mono ${classes.textSub}`}>
                        {item.presentations.length > 0
                          ? `1 = ${Number(item.presentations[0].factorToBase)} ${formatUnitSymbol(item.baseUnit)}`
                          : '1 a 1'}
                      </td>
                      <td className={`p-3.5 ${classes.textSub}`}>
                        {item.reorderPoint ? `${item.reorderPoint} ${formatUnitSymbol(item.baseUnit)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SABORES Y EXTRAS (MODIFICADORES) */}
        {!loading && activeTab === 'modifiers' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${classes.card}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${classes.textMain}`}>
                    Grupos de Sabores, Opciones y Extras
                  </h3>
                  <p className={`text-xs ${classes.textMuted}`}>
                    Asocia sabores a insumos de almacén (ej. Jarabe de Vainilla 15ml) para descontar stock automáticamente al vender en POS o Comandera.
                  </p>
                </div>
              </div>
            </div>

            {modifierGroups.length === 0 ? (
              <div className={`py-12 rounded-3xl border text-center space-y-3 ${classes.card}`}>
                <Sparkles className="w-8 h-8 mx-auto opacity-40" style={{ color: buttonColor }} />
                <h4 className={`text-sm font-bold ${classes.textMain}`}>Sin grupos de modificadores</h4>
                <p className={`text-xs max-w-sm mx-auto ${classes.textMuted}`}>
                  Crea grupos como &quot;Sabores de Jarabe&quot;, &quot;Tipo de Leche&quot; o &quot;Extras Dulces&quot; para personalizar tus bebidas y alimentos.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModGroup}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Crear Primer Grupo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {modifierGroups.map((group) => {
                  const isProductFlavors = group.name.toLowerCase().startsWith('sabores de ')
                  return (
                    <div
                      key={group.id}
                      className={`rounded-3xl border p-5 space-y-4 flex flex-col justify-between ${classes.card}`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  group.isRequired
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    : classes.badge
                                }`}
                              >
                                {group.isRequired ? 'Obligatorio' : 'Opcional'}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${classes.badge}`}>
                                {group.maxSelect === 1 ? '1 Opción' : `Hasta ${group.maxSelect}`}
                              </span>
                              {isProductFlavors && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-medium">
                                  Propio de Producto
                                </span>
                              )}
                            </div>
                            <h3 className={`text-base font-bold mt-2 ${classes.textMain}`}>{group.name}</h3>
                            <span className={`text-[11px] ${classes.textMuted}`}>
                              {group.modifiers.length} opción(es) registrada(s)
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModGroup(group)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer hover:bg-amber-500/10 hover:text-amber-500 ${classes.textSub}`}
                              title="Configurar opciones completas"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteModGroup(group.id, group.name)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer hover:bg-rose-500/10 hover:text-rose-500 ${classes.textSub}`}
                              title="Eliminar grupo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Opciones en formato píldora conciso */}
                        <div className="space-y-1.5">
                          {group.modifiers.length === 0 ? (
                            <p className={`text-xs italic py-2 ${classes.textSub}`}>Sin opciones registradas aún</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {group.modifiers.slice(0, 10).map((mod) => (
                                <span
                                  key={mod.id || mod.name}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs ${classes.subCard}`}
                                >
                                  <span className={`font-medium ${classes.textMain}`}>{mod.name}</span>
                                  {Number(mod.extraPrice) > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                      +${Number(mod.extraPrice).toFixed(0)}
                                    </span>
                                  )}
                                  {mod.inventoryItemId && (
                                    <span className="text-[10px] opacity-75" title="Descuenta stock en almacén">
                                      📦
                                    </span>
                                  )}
                                </span>
                              ))}
                              {group.modifiers.length > 10 && (
                                <span className={`px-2 py-1 rounded-xl text-xs font-semibold ${classes.textSub}`}>
                                  +{group.modifiers.length - 10} más...
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer con Añadir Opción Rápida a la mano */}
                      <div className={`pt-3 border-t space-y-2.5 ${classes.divider}`}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="+ Escribe nueva opción..."
                            value={quickOptionInputs[group.id] || ''}
                            onChange={(e) =>
                              setQuickOptionInputs((prev) => ({ ...prev, [group.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleQuickAddOption(group.id)
                              }
                            }}
                            className={`flex-1 px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                          />
                          <button
                            type="button"
                            disabled={savingQuickOption === group.id || !quickOptionInputs[group.id]?.trim()}
                            onClick={() => handleQuickAddOption(group.id)}
                            style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 hover:opacity-90 shadow-sm shrink-0"
                            title="Añadir opción a este grupo"
                          >
                            {savingQuickOption === group.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Añadir</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className={`flex items-center justify-between text-[11px] ${classes.textMuted}`}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModGroup(group)}
                            className="hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Configurar stock / precios</span>
                          </button>
                          <span>{group.productsCount || 0} producto(s)</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CATEGORÍAS */}
        {!loading && activeTab === 'categories' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`p-5 rounded-2xl border flex items-center justify-between ${classes.card}`}
              >
                <div>
                  <span className={`font-mono text-[10px] block ${classes.textSub}`}>{cat.slug}</span>
                  <h4 className={`text-sm font-bold mt-0.5 ${classes.textMain}`}>{cat.name}</h4>
                  <p className={`text-xs mt-1 ${classes.textMuted}`}>
                    {cat._count?.products || 0} producto(s) asignados
                  </p>
                </div>
                <Tag className="w-5 h-5 opacity-70" style={{ color: buttonColor }} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL PRODUCTO (CON TAMAÑOS / VARIANTES Y MODIFICADORES) */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 sm:p-8 space-y-6 shadow-2xl ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-4 ${classes.divider}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${classes.textMain}`}>
                    {editingProductId ? 'Editar Producto' : 'Registrar Producto'}
                  </h3>
                  <p className={`text-xs ${classes.textMuted}`}>
                    Configura tamaños, recetas, insumos y sabores de personalización
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className={`text-lg cursor-pointer hover:opacity-75 ${classes.textMuted}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-medium mb-1 ${classes.textMuted}`}>Categoría *</label>
                  <select
                    value={prodForm.categoryId}
                    onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
                    required
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  >
                    <option value="">Selecciona categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-medium mb-1 ${classes.textMuted}`}>Código / SKU</label>
                  <input
                    type="text"
                    value={prodForm.code}
                    onChange={(e) => setProdForm({ ...prodForm, code: e.target.value.toUpperCase() })}
                    placeholder="Ej: BEB-LATTE"
                    className={`w-full px-3 py-2 rounded-xl border font-mono uppercase focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-medium mb-1 ${classes.textMuted}`}>Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  placeholder="Ej: Café Latte, Frappe Moka, Sandwich Jamón"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                />
              </div>

              <div>
                <label className={`block font-medium mb-1 ${classes.textMuted}`}>Descripción</label>
                <textarea
                  rows={2}
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  placeholder="Notas para el menú público o detalles de preparación..."
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                />
              </div>

              {/* SABORES PROPIOS DEL PRODUCTO (DIRECTO EN EL MODAL) */}
              <div className={`p-4 rounded-2xl border space-y-3 ${classes.subCard}`}>
                <div>
                  <span className={`font-semibold flex items-center gap-1.5 ${classes.textMain}`}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Sabores Propios de este Producto (Opcional)
                  </span>
                  <p className={`text-[11px] ${classes.textMuted}`}>
                    Para productos con sabores a elegir (ej: Taro, Amaretto, Caramelo, Baileys, Chai Verde, Mango). Escribe uno o varios separados por coma y presiona Enter o Añadir.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={flavorInput}
                    onChange={(e) => setFlavorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddFlavors()
                      }
                    }}
                    placeholder="Ej: Taro, Amaretto, Caramelo, Coco, Vainilla..."
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none ${classes.input}`}
                  />
                  <button
                    type="button"
                    onClick={handleAddFlavors}
                    style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 hover:opacity-90 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Sabores</span>
                  </button>
                </div>

                {prodForm.ownFlavors.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {prodForm.ownFlavors.map((flavor, fIdx) => (
                      <span
                        key={fIdx}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${classes.card}`}
                      >
                        <span className="font-semibold">{flavor.name}</span>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <span>+$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={flavor.extraPrice}
                            onChange={(e) => {
                              const copy = [...prodForm.ownFlavors]
                              copy[fIdx].extraPrice = e.target.value
                              setProdForm({ ...prodForm, ownFlavors: copy })
                            }}
                            className="w-12 text-center bg-transparent border-b border-dashed border-emerald-500/40 focus:outline-none text-xs font-semibold"
                            title="Precio extra del sabor (0 para incluido)"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFlavor(fIdx)}
                          className="text-rose-500 hover:text-rose-400 ml-1 p-0.5 rounded cursor-pointer"
                          title="Quitar sabor"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {prodForm.ownFlavors.length > 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    ✓ Se generará automáticamente la regla para exigir 1 sabor obligatorio al tomar la orden.
                  </p>
                )}
              </div>

              {/* EXTRAS GENERALES ADICIONALES (SEPARADOS DE LOS SABORES PROPIOS) */}
              {modifierGroups.filter((mg) => !mg.name.toLowerCase().startsWith('sabores de ')).length > 0 && (
                <div className={`p-4 rounded-2xl border space-y-2.5 ${classes.subCard}`}>
                  <span className={`font-semibold flex items-center gap-1.5 ${classes.textMain}`}>
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                    Extras Generales Adicionales
                  </span>
                  <p className={`text-[11px] ${classes.textMuted}`}>
                    Grupos reutilizables de opciones y extras (ej: Tipo de Leche, Jarabes Extras, Toppings).
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {modifierGroups
                      .filter((mg) => !mg.name.toLowerCase().startsWith('sabores de '))
                      .map((mg) => {
                        const isSelected = prodForm.modifierGroupIds.includes(mg.id)
                        return (
                          <button
                            key={mg.id}
                            type="button"
                            onClick={() => {
                              setProdForm((prev) => ({
                                ...prev,
                                modifierGroupIds: isSelected
                                  ? prev.modifierGroupIds.filter((id) => id !== mg.id)
                                  : [...prev.modifierGroupIds, mg.id],
                              }))
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                                : `${classes.buttonGhost} ${classes.textMuted}`
                            }`}
                          >
                            <CheckCircle className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-500' : 'opacity-30'}`} />
                            <span>{mg.name}</span>
                            <span className="text-[10px] opacity-70">({mg.modifiers.length} ops)</span>
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* TOGGLE TAMAÑOS / VARIANTES */}
              <div className={`p-4 rounded-2xl border space-y-4 ${classes.subCard}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <label className={`font-bold flex items-center gap-2 cursor-pointer ${classes.textMain}`}>
                      <input
                        type="checkbox"
                        checked={prodForm.hasVariants}
                        onChange={(e) => setProdForm({ ...prodForm, hasVariants: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>¿Maneja múltiples tamaños o presentaciones?</span>
                    </label>
                    <p className={`text-[11px] mt-0.5 ${classes.textMuted}`}>
                      Ejemplo: Chico (8oz), Mediano (12oz), Grande (16oz), cada uno con precio y receta independiente.
                    </p>
                  </div>
                </div>

                {/* MÚLTIPLES TAMAÑOS */}
                {prodForm.hasVariants ? (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className={`text-xs font-bold ${classes.textMain}`}>Tamaños del Producto</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cupSizes.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] ${classes.textMuted}`}>Vasos:</span>
                            {cupSizes.map((cs) => (
                              <button
                                key={cs.id}
                                type="button"
                                onClick={() => addVariantFromCupSize(cs)}
                                className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                title={`Agregar tamaño ${cs.name} (${cs.capacityOz || 0}oz) con sus empaques vinculados`}
                              >
                                <Coffee className="w-3 h-3" /> +{cs.name}
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={addVariantRow}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar Tamaño
                        </button>
                      </div>
                    </div>

                    {prodForm.variants.map((variant, varIdx) => {
                      const varCost = getVariantCost(variant)
                      return (
                        <div
                          key={varIdx}
                          className={`p-3.5 rounded-2xl border space-y-3 ${classes.card}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className={`block text-[10px] font-semibold mb-0.5 ${classes.textSub}`}>
                                  Nombre del Tamaño
                                </label>
                                <input
                                  type="text"
                                  value={variant.name}
                                  onChange={(e) => {
                                    const copy = [...prodForm.variants]
                                    copy[varIdx].name = e.target.value
                                    setProdForm({ ...prodForm, variants: copy })
                                  }}
                                  placeholder="Ej: Mediano 12oz"
                                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${classes.input}`}
                                />
                              </div>

                              <div>
                                <label className={`block text-[10px] font-semibold mb-0.5 ${classes.textSub}`}>
                                  Precio Venta ($ MXN)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.price}
                                  onChange={(e) => {
                                    const copy = [...prodForm.variants]
                                    copy[varIdx].price = e.target.value
                                    setProdForm({ ...prodForm, variants: copy })
                                  }}
                                  placeholder="Ej: 55.00"
                                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${classes.input}`}
                                />
                              </div>
                            </div>

                            {prodForm.variants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVariantRow(varIdx)}
                                className="text-rose-500 hover:text-rose-400 p-1.5 cursor-pointer"
                                title="Eliminar tamaño"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Receta de este tamaño */}
                          <div className={`p-2.5 rounded-xl border space-y-2 ${classes.subCard}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Insumos para {variant.name || 'este tamaño'}:
                              </span>
                              <button
                                type="button"
                                onClick={() => addVariantRecipeRow(varIdx)}
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Insumo
                              </button>
                            </div>

                            {variant.recipeItems.length === 0 ? (
                              <p className={`text-[10px] ${classes.textSub}`}>Sin insumos asignados a este tamaño.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {variant.recipeItems.map((r, itemIdx) => {
                                  const selectedIng = ingredients.find((i) => i.id === r.inventoryItemId)
                                  return (
                                    <div key={itemIdx} className="flex items-center gap-2">
                                      <select
                                        value={r.inventoryItemId}
                                        onChange={(e) => {
                                          const copy = [...prodForm.variants]
                                          copy[varIdx].recipeItems[itemIdx].inventoryItemId = e.target.value
                                          setProdForm({ ...prodForm, variants: copy })
                                        }}
                                        className={`flex-1 px-2 py-1 rounded-md border text-xs ${classes.input}`}
                                      >
                                        {ingredients.map((ing) => (
                                          <option key={ing.id} value={ing.id}>
                                            {ing.name} ({formatUnitSymbol(ing.baseUnit)})
                                          </option>
                                        ))}
                                      </select>

                                      <div className="flex items-center gap-1 w-24">
                                        <input
                                          type="number"
                                          step="any"
                                          value={r.quantityBase}
                                          onChange={(e) => {
                                            const copy = [...prodForm.variants]
                                            copy[varIdx].recipeItems[itemIdx].quantityBase = e.target.value
                                            setProdForm({ ...prodForm, variants: copy })
                                          }}
                                          placeholder="Cant"
                                          className={`w-full px-2 py-1 rounded-md border text-right text-xs ${classes.input}`}
                                        />
                                        <span className={`text-[10px] font-mono w-6 ${classes.textSub}`}>
                                          {formatUnitSymbol(selectedIng?.baseUnit)}
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const copy = [...prodForm.variants]
                                          copy[varIdx].recipeItems[itemIdx].onlyTakeaway = !copy[varIdx].recipeItems[itemIdx].onlyTakeaway
                                          setProdForm({ ...prodForm, variants: copy })
                                        }}
                                        className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors border ${
                                          r.onlyTakeaway
                                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                        }`}
                                        title={
                                          r.onlyTakeaway
                                            ? '🥡 Solo para llevar (NO se descuenta si el cliente pide comer en sucursal)'
                                            : '🍵 Siempre (Se descuenta siempre, sea comer aquí o para llevar)'
                                        }
                                      >
                                        {r.onlyTakeaway ? '🥡 Solo llevar' : '🍵 Siempre'}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => removeVariantRecipeRow(varIdx, itemIdx)}
                                        className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )
                                })}

                                <div className={`pt-1 border-t flex justify-between text-[11px] ${classes.divider}`}>
                                  <span className={classes.textSub}>Costo estimado tamaño:</span>
                                  <strong className="text-emerald-600 dark:text-emerald-400">${varCost.toFixed(2)} MXN</strong>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* PRODUCTO DE TAMAÑO ÚNICO */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block font-medium mb-1 ${classes.textMuted}`}>Precio de Venta ($ MXN) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required={!prodForm.hasVariants}
                          value={prodForm.price}
                          onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                          placeholder="Ej: 65.00"
                          className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                        />
                      </div>

                      <div>
                        <label className={`block font-medium mb-1 ${classes.textMuted}`}>Política de Inventario *</label>
                        <select
                          value={prodForm.inventoryPolicy}
                          onChange={(e) =>
                            setProdForm({
                              ...prodForm,
                              inventoryPolicy: e.target.value as any,
                            })
                          }
                          className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                        >
                          <option value="RECIPE">RECETA (Descuenta ingredientes por porción)</option>
                          <option value="DIRECT">DIRECTO (Descuenta 1 unidad de insumo)</option>
                          <option value="NONE">SIN INVENTARIO (Solo cobro)</option>
                        </select>
                      </div>
                    </div>

                    {/* CONSTRUCTOR DE RECETAS INTERACTIVO */}
                    {prodForm.inventoryPolicy === 'RECIPE' && (
                      <div className={`p-4 rounded-2xl border space-y-3 ${classes.card}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`font-semibold flex items-center gap-1.5 ${classes.textMain}`}>
                              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                              Ingredientes de la Receta
                            </span>
                            <p className={`text-[11px] ${classes.textMuted}`}>
                              Insumos que se descontarán en cada venta
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={addRecipeRow}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Agregar Insumo
                          </button>
                        </div>

                        {prodForm.recipeItems.length === 0 ? (
                          <div className={`py-4 text-center text-[11px] ${classes.textSub}`}>
                            Haz clic en &quot;Agregar Insumo&quot; para definir los ingredientes de este producto.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {prodForm.recipeItems.map((r, idx) => {
                              const selectedIng = ingredients.find((i) => i.id === r.inventoryItemId)
                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <select
                                    value={r.inventoryItemId}
                                    onChange={(e) => {
                                      const newItems = [...prodForm.recipeItems]
                                      newItems[idx].inventoryItemId = e.target.value
                                      setProdForm({ ...prodForm, recipeItems: newItems })
                                    }}
                                    className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs ${classes.input}`}
                                  >
                                    {ingredients.map((ing) => (
                                      <option key={ing.id} value={ing.id}>
                                        {ing.name} ({formatUnitName(ing.baseUnit)}) — ${Number(ing.costPerUnit).toFixed(2)}/{formatUnitSymbol(ing.baseUnit)}
                                      </option>
                                    ))}
                                  </select>

                                  <div className="flex items-center gap-1 w-28">
                                    <input
                                      type="number"
                                      step="any"
                                      value={r.quantityBase}
                                      onChange={(e) => {
                                        const newItems = [...prodForm.recipeItems]
                                        newItems[idx].quantityBase = e.target.value
                                        setProdForm({ ...prodForm, recipeItems: newItems })
                                      }}
                                      className={`w-full px-2 py-1.5 rounded-lg border text-right text-xs ${classes.input}`}
                                    />
                                    <span className={`text-[10px] font-mono w-8 ${classes.textSub}`}>
                                      {formatUnitSymbol(selectedIng?.baseUnit)}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItems = [...prodForm.recipeItems]
                                      newItems[idx].onlyTakeaway = !newItems[idx].onlyTakeaway
                                      setProdForm({ ...prodForm, recipeItems: newItems })
                                    }}
                                    className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors border ${
                                      r.onlyTakeaway
                                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                    }`}
                                    title={
                                      r.onlyTakeaway
                                        ? '🥡 Solo para llevar (NO se descuenta si el cliente come en sucursal)'
                                        : '🍵 Siempre (Se descuenta siempre, sea comer aquí o llevar)'
                                    }
                                  >
                                    {r.onlyTakeaway ? '🥡 Solo llevar' : '🍵 Siempre'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => removeRecipeRow(idx)}
                                    className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )
                            })}

                            <div className={`pt-2 border-t flex justify-between text-xs ${classes.divider}`}>
                              <span className={classes.textMuted}>Costo estimado de insumos:</span>
                              <strong className="text-emerald-600 dark:text-emerald-400">${liveRecipeCost.toFixed(2)} MXN</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DIRECT POLICY */}
                    {prodForm.inventoryPolicy === 'DIRECT' && (
                      <div className={`p-4 rounded-2xl border space-y-2 ${classes.card}`}>
                        <label className={`block font-medium ${classes.textMuted}`}>Insumo a descontar por venta</label>
                        <select
                          value={prodForm.directItemId}
                          onChange={(e) => setProdForm({ ...prodForm, directItemId: e.target.value })}
                          required={!prodForm.hasVariants && prodForm.inventoryPolicy === 'DIRECT'}
                          className={`w-full px-3 py-2 rounded-xl border ${classes.input}`}
                        >
                          <option value="">Selecciona un insumo</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({formatUnitName(ing.baseUnit)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={`pt-3 flex justify-end gap-2 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className={`px-4 py-2 rounded-xl border font-medium cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-5 py-2 rounded-xl font-medium flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50 hover:opacity-95"
                >
                  {submittingProduct && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProductId ? 'Actualizar Producto' : 'Guardar Producto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR GRUPO DE MODIFICADORES */}
      {showModGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 sm:p-8 space-y-6 shadow-2xl ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-4 ${classes.divider}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${classes.textMain}`}>
                    {editingModGroupId ? 'Editar Grupo de Sabores / Extras' : 'Nuevo Grupo de Sabores / Extras'}
                  </h3>
                  <p className={`text-xs ${classes.textMuted}`}>
                    Configura opciones, precios adicionales y enlace directo con insumos de almacén
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModGroupModal(false)}
                className={`text-lg cursor-pointer hover:opacity-75 ${classes.textMuted}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModGroup} className="space-y-5 text-xs">
              <div>
                <label className={`block font-medium mb-1 ${classes.textMuted}`}>Nombre del Grupo *</label>
                <input
                  type="text"
                  required
                  value={modGroupForm.name}
                  onChange={(e) => setModGroupForm({ ...modGroupForm, name: e.target.value })}
                  placeholder="Ej: Sabores de Jarabe, Tipo de Leche, Endulzantes, Toppings"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block font-medium mb-1 ${classes.textMuted}`}>Selección Mínima</label>
                  <input
                    type="number"
                    min="0"
                    value={modGroupForm.minSelect}
                    onChange={(e) => setModGroupForm({ ...modGroupForm, minSelect: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                  <span className={`text-[10px] ${classes.textSub}`}>0 = Opcional</span>
                </div>

                <div>
                  <label className={`block font-medium mb-1 ${classes.textMuted}`}>Selección Máxima</label>
                  <input
                    type="number"
                    min="1"
                    value={modGroupForm.maxSelect}
                    onChange={(e) => setModGroupForm({ ...modGroupForm, maxSelect: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                  <span className={`text-[10px] ${classes.textSub}`}>1 = Único sabor, &gt;1 = Múltiples</span>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={modGroupForm.isRequired}
                      onChange={(e) => setModGroupForm({ ...modGroupForm, isRequired: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>¿Es Obligatorio?</span>
                  </label>
                </div>
              </div>

              {/* LISTA DINÁMICA DE OPCIONES / MODIFICADORES */}
              <div className={`p-4 rounded-2xl border space-y-3 ${classes.subCard}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`font-semibold flex items-center gap-1.5 ${classes.textMain}`}>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Opciones del Grupo
                    </span>
                    <p className={`text-[11px] ${classes.textMuted}`}>
                      Define los sabores o extras y qué insumo de almacén descuentan al ordenarse
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addModifierRow}
                    style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                    className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer hover:opacity-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Opción</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {modGroupForm.modifiers.map((mod, idx) => {
                    const selectedIng = ingredients.find((i) => i.id === mod.inventoryItemId)
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border space-y-2.5 ${classes.card}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            required
                            value={mod.name}
                            onChange={(e) => {
                              const copy = [...modGroupForm.modifiers]
                              copy[idx].name = e.target.value
                              setModGroupForm({ ...modGroupForm, modifiers: copy })
                            }}
                            placeholder="Nombre (Ej: Jarabe de Avellana)"
                            className={`flex-1 px-3 py-1.5 rounded-lg border text-xs ${classes.input}`}
                          />

                          <div className="flex items-center gap-1 w-28">
                            <span className={`text-[11px] ${classes.textSub}`}>+$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={mod.extraPrice}
                              onChange={(e) => {
                                const copy = [...modGroupForm.modifiers]
                                copy[idx].extraPrice = e.target.value
                                setModGroupForm({ ...modGroupForm, modifiers: copy })
                              }}
                              placeholder="0.00"
                              className={`w-full px-2 py-1.5 rounded-lg border text-right text-xs ${classes.input}`}
                            />
                          </div>

                          {modGroupForm.modifiers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeModifierRow(idx)}
                              className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Descuento de Insumo */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-dashed border-white/10">
                          <div>
                            <label className={`block text-[10px] ${classes.textSub} mb-0.5`}>
                              Insumo a descontar (Opcional):
                            </label>
                            <select
                              value={mod.inventoryItemId}
                              onChange={(e) => {
                                const copy = [...modGroupForm.modifiers]
                                copy[idx].inventoryItemId = e.target.value
                                setModGroupForm({ ...modGroupForm, modifiers: copy })
                              }}
                              className={`w-full px-2 py-1 rounded-lg border text-xs ${classes.input}`}
                            >
                              <option value="">Ninguno (Sin descuento de stock)</option>
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name} ({formatUnitSymbol(ing.baseUnit)})
                                </option>
                              ))}
                            </select>
                          </div>

                          {mod.inventoryItemId && (
                            <div>
                              <label className={`block text-[10px] ${classes.textSub} mb-0.5`}>
                                Cantidad a descontar ({formatUnitSymbol(selectedIng?.baseUnit)}):
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={mod.quantityBase}
                                onChange={(e) => {
                                  const copy = [...modGroupForm.modifiers]
                                  copy[idx].quantityBase = e.target.value
                                  setModGroupForm({ ...modGroupForm, modifiers: copy })
                                }}
                                placeholder="Ej: 15"
                                className={`w-full px-2 py-1 rounded-lg border text-xs ${classes.input}`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-1 flex justify-center">
                  <button
                    type="button"
                    onClick={addModifierRow}
                    className={`w-full py-2 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${classes.buttonGhost}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Agregar otra opción a este grupo</span>
                  </button>
                </div>
              </div>

              <div className={`pt-3 flex justify-end gap-2 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowModGroupModal(false)}
                  className={`px-4 py-2 rounded-xl border font-medium cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingModGroup}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-5 py-2 rounded-xl font-medium flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50 hover:opacity-95"
                >
                  {submittingModGroup && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingModGroupId ? 'Actualizar Grupo' : 'Guardar Grupo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO INSUMO BASE */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl border p-6 sm:p-8 space-y-6 shadow-2xl ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-4 ${classes.divider}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${classes.textMain}`}>Nuevo Insumo de Inventario</h3>
                  <p className={`text-xs ${classes.textMuted}`}>Definido en unidad base para recetas exactas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className={`text-lg cursor-pointer hover:opacity-75 ${classes.textMuted}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-medium mb-1 ${classes.textMuted}`}>Nombre del Insumo *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="Ej: Jarabe de Vainilla"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>

                <div>
                  <label className={`block font-medium mb-1 ${classes.textMuted}`}>SKU / Código</label>
                  <input
                    type="text"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value.toUpperCase() })}
                    placeholder="Ej: INS-JAR-VAIN"
                    className={`w-full px-3 py-2 rounded-xl border font-mono uppercase focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-medium mb-1 ${classes.textMuted}`}>Unidad Base *</label>
                  <select
                    value={itemForm.baseUnit}
                    onChange={(e) => setItemForm({ ...itemForm, baseUnit: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  >
                    {Object.values(UNIT_DEFINITIONS).map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-medium mb-1 ${classes.textMuted}`}>Costo por Unidad Base ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={itemForm.costPerUnit}
                    onChange={(e) => setItemForm({ ...itemForm, costPerUnit: e.target.value })}
                    placeholder="Ej: 0.1500"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              {/* Presentación de compra */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${classes.subCard}`}>
                <span className={`font-semibold block ${classes.textMain}`}>
                  Presentación de Compra (Opcional)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={itemForm.presentationName}
                    onChange={(e) => setItemForm({ ...itemForm, presentationName: e.target.value })}
                    placeholder="Ej: Botella 750ml"
                    className={`px-2.5 py-1.5 rounded-lg border ${classes.input}`}
                  />
                  <input
                    type="number"
                    value={itemForm.presentationFactor}
                    onChange={(e) => setItemForm({ ...itemForm, presentationFactor: e.target.value })}
                    placeholder="Factor (Ej: 750)"
                    className={`px-2.5 py-1.5 rounded-lg border ${classes.input}`}
                  />
                </div>
              </div>

              <div className={`pt-3 flex justify-end gap-2 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className={`px-4 py-2 rounded-xl border font-medium cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingItem}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-5 py-2 rounded-xl font-medium flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50 hover:opacity-95"
                >
                  {submittingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Insumo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA CATEGORÍA */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 space-y-4 shadow-2xl ${classes.modalContent}`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${classes.textMain}`}>
              <Tag className="w-4 h-4" style={{ color: buttonColor }} /> Nueva Categoría
            </h3>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className={`block font-medium mb-1 ${classes.textMuted}`}>Nombre de Categoría *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ej: Panadería, Postres, Frappes"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                />
              </div>

              <div className={`flex justify-end gap-2 pt-2 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className={`px-3 py-1.5 rounded-xl border font-medium cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCategory}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-4 py-1.5 rounded-xl font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:opacity-95"
                >
                  {submittingCategory && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMAÑO DE VASO Y EMPAQUE */}
      {showCupSizeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl ${classes.modalContent}`}>
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <h3 className={`text-base font-bold flex items-center gap-2 ${classes.textMain}`}>
                <Coffee className="w-5 h-5 text-amber-500" />
                {editingCupSizeId ? 'Editar Tamaño de Vaso' : 'Nuevo Tamaño de Vaso y Empaques'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCupSizeModal(false)}
                className={`p-1 rounded-lg hover:bg-neutral-500/20 text-xs ${classes.textMuted}`}
              >
                ✕
              </button>
            </div>

            <p className={`text-xs ${classes.textMuted}`}>
              Define cómo se compone este tamaño en inventario. Al preparar bebidas para llevar, el sistema descontará automáticamente el vaso, tapa y faja seleccionados. Si el cliente pide para comer aquí, estos empaques desechables NO se descontarán.
            </p>

            <form onSubmit={handleSaveCupSize} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${classes.textSub}`}>Nombre de Presentación *</label>
                  <input
                    type="text"
                    required
                    value={cupSizeForm.name}
                    onChange={(e) => setCupSizeForm({ ...cupSizeForm, name: e.target.value })}
                    placeholder="Ej: Chico 8oz, Mediano 12oz, Grande 16oz"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${classes.textSub}`}>Capacidad en Onzas (oz)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cupSizeForm.capacityOz}
                    onChange={(e) => setCupSizeForm({ ...cupSizeForm, capacityOz: e.target.value })}
                    placeholder="Ej: 12"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border space-y-3 ${classes.subCard}`}>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">
                  Insumos Desechables Vinculados (Inventario):
                </span>

                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${classes.textMuted}`}>
                    Vaso / Contenedor Desechable
                  </label>
                  <select
                    value={cupSizeForm.cupItemId}
                    onChange={(e) => setCupSizeForm({ ...cupSizeForm, cupItemId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border ${classes.input}`}
                  >
                    <option value="">-- Ninguno (No descontar vaso) --</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({formatUnitSymbol(ing.baseUnit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${classes.textMuted}`}>
                    Tapa Desechable
                  </label>
                  <select
                    value={cupSizeForm.lidItemId}
                    onChange={(e) => setCupSizeForm({ ...cupSizeForm, lidItemId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border ${classes.input}`}
                  >
                    <option value="">-- Ninguna (No descontar tapa) --</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({formatUnitSymbol(ing.baseUnit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${classes.textMuted}`}>
                    Faja / Manga Térmica
                  </label>
                  <select
                    value={cupSizeForm.sleeveItemId}
                    onChange={(e) => setCupSizeForm({ ...cupSizeForm, sleeveItemId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border ${classes.input}`}
                  >
                    <option value="">-- Ninguna (No descontar faja) --</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({formatUnitSymbol(ing.baseUnit)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`flex justify-end gap-2 pt-3 border-t ${classes.divider}`}>
                <button
                  type="button"
                  onClick={() => setShowCupSizeModal(false)}
                  className={`px-4 py-2 rounded-xl border font-medium cursor-pointer ${classes.buttonGhost}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCupSize}
                  style={{ backgroundColor: buttonColor, color: contrastTextButton }}
                  className="px-5 py-2 rounded-xl font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:opacity-95 shadow-md"
                >
                  {submittingCupSize && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Tamaño</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

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
} from 'lucide-react'
import { UNIT_DEFINITIONS, formatUnitName, formatUnitSymbol, formatUnitFull } from '@/lib/units'
import { useDashboardTheme } from '@/context/dashboard-theme-context'

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

interface Product {
  id: string
  name: string
  code: string
  description: string | null
  inventoryPolicy: 'NONE' | 'DIRECT' | 'RECIPE'
  category: { id: string; name: string }
  variants: Array<{
    id: string
    name: string
    price: number
    cost: number
    recipe?: {
      items: Array<{
        id: string
        quantityBase: number
        inventoryItem: { name: string; baseUnit: string; costPerUnit: number }
      }>
    }
  }>
}

export default function CatalogManagerPage() {
  const { isLight, buttonColor, primaryColor, contrastTextButton, classes } = useDashboardTheme()
  const [activeTab, setActiveTab] = useState<'products' | 'ingredients' | 'categories'>('products')

  const [products, setProducts] = useState<Product[]>([])
  const [ingredients, setIngredients] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [businessSettings, setBusinessSettings] = useState<{ recipesEnabled: boolean }>({
    recipesEnabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modales
  const [showProductModal, setShowProductModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

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
    recipeItems: [] as Array<{ inventoryItemId: string; quantityBase: string }>,
  })
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

  const fetchData = async () => {
    try {
      setLoading(true)
      const [resProd, resIng, resCat, resSettings] = await Promise.all([
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/inventory/items').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/business/settings').then((r) => r.json()).catch(() => ({ success: false })),
      ])

      if (resProd.success) setProducts(resProd.data)
      if (resIng.success) setIngredients(resIng.data)
      if (resCat.success) setCategories(resCat.data)
      if (resSettings.success && resSettings.data?.settings) {
        setBusinessSettings({
          recipesEnabled: resSettings.data.settings.recipesEnabled ?? true,
        })
      }
    } catch {
      setError('Error al sincronizar datos del catálogo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!businessSettings.recipesEnabled && activeTab === 'ingredients') {
      setActiveTab('products')
    }
  }, [businessSettings.recipesEnabled, activeTab])

  // Helper para agregar ingrediente a la receta
  const addRecipeRow = () => {
    if (ingredients.length === 0) return
    setProdForm((prev) => ({
      ...prev,
      recipeItems: [...prev.recipeItems, { inventoryItemId: ingredients[0].id, quantityBase: '10' }],
    }))
  }

  const removeRecipeRow = (idx: number) => {
    setProdForm((prev) => ({
      ...prev,
      recipeItems: prev.recipeItems.filter((_, i) => i !== idx),
    }))
  }

  // Costo calculado en tiempo real
  const liveRecipeCost = prodForm.recipeItems.reduce((acc, curr) => {
    const ing = ingredients.find((i) => i.id === curr.inventoryItemId)
    if (!ing) return acc
    return acc + Number(ing.costPerUnit) * (Number(curr.quantityBase) || 0)
  }, 0)

  // Submit Producto
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmittingProduct(true)

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prodForm),
      })
      const json = await res.json()

      if (json.success) {
        setShowProductModal(false)
        setProdForm({
          categoryId: '',
          name: '',
          code: '',
          description: '',
          price: '',
          inventoryPolicy: 'RECIPE',
          directItemId: '',
          directQuantity: '1',
          recipeItems: [],
        })
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

  // Eliminar producto
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`¿Deseas archivar el producto "${name}"?`)) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        fetchData()
      } else {
        alert(json.error?.message || 'No se pudo eliminar el producto')
      }
    } catch {
      alert('Error de red al eliminar producto')
    }
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
              {businessSettings.recipesEnabled
                ? 'Catálogo, Insumos y Recetario'
                : 'Catálogo de Productos'}
            </h1>
            <p className={`text-xs ${classes.textMuted}`}>
              {businessSettings.recipesEnabled
                ? 'Motor de productos con desglose de ingredientes por porción'
                : 'Gestión de productos y categorías de venta'}
            </p>
          </div>
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'products' && (
            <button
              type="button"
              onClick={() => {
                setError(null)
                if (categories.length > 0 && !prodForm.categoryId) {
                  setProdForm((p) => ({ ...p, categoryId: categories[0].id }))
                }
                setShowProductModal(true)
              }}
              style={{ backgroundColor: buttonColor, color: contrastTextButton }}
              className="px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
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
        <div className={`flex gap-2 border-b pb-3 ${classes.divider}`}>
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
            <p className="text-xs">Cargando catálogo e inventario...</p>
          </div>
        )}

        {/* TAB 1: PRODUCTOS VENDIBLES */}
        {!loading && activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => {
              const variant = p.variants[0]
              const price = variant ? Number(variant.price) : 0
              const cost = variant ? Number(variant.cost) : 0
              const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(0) : '0'
              const recipe = variant?.recipe

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

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer hover:bg-rose-500/10 hover:text-rose-500 ${classes.textSub}`}
                        title="Archivar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className={`text-xs line-clamp-2 ${classes.textMuted}`}>
                      {p.description || 'Sin descripción'}
                    </p>

                    {/* Policy Badge & Recipe Details */}
                    <div>
                      {p.inventoryPolicy === 'RECIPE' && recipe && (
                        <div className={`p-2.5 rounded-xl border space-y-1.5 ${classes.subCard}`}>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Receta ({recipe.items.length} insumos):
                          </span>
                          <div className={`text-[11px] space-y-0.5 ${classes.textMuted}`}>
                            {recipe.items.map((it) => (
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
                  </div>

                  {/* Financial Metrics Footer */}
                  <div className={`pt-3 border-t flex items-center justify-between text-xs ${classes.divider}`}>
                    <div>
                      <span className={`text-[10px] block ${classes.textSub}`}>Precio Venta</span>
                      <strong className={`text-sm font-bold ${classes.textMain}`}>${price.toFixed(2)} MXN</strong>
                    </div>

                    <div className="text-center">
                      <span className={`text-[10px] block ${classes.textSub}`}>Costo Insumos</span>
                      <span className={`text-xs font-semibold ${classes.textMuted}`}>${cost.toFixed(2)}</span>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] block ${classes.textSub}`}>Margen</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{margin}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
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
                      <td className={`p-3.5 font-medium ${classes.textMuted}`}>
                        ${Number(item.costPerUnit).toFixed(4)} / {formatUnitSymbol(item.baseUnit)}
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

        {/* TAB 3: CATEGORÍAS */}
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

      {/* MODAL NUEVO PRODUCTO Y CONSTRUCTOR DE RECETAS */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 sm:p-8 space-y-6 shadow-2xl ${classes.modalContent}`}>
            <div className={`flex items-center justify-between border-b pb-4 ${classes.divider}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
                >
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${classes.textMain}`}>Registrar Producto</h3>
                  <p className={`text-xs ${classes.textMuted}`}>Con cálculo automático de costos e inventario</p>
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

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
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
                    placeholder="Ej: BEB-LATTE-12"
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
                  placeholder="Ej: Café Mocha 12oz"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${classes.input}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-medium mb-1 ${classes.textMuted}`}>Precio de Venta ($ MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
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
                <div className={`p-4 rounded-2xl border space-y-3 ${classes.subCard}`}>
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
                                  {ing.name} ({formatUnitName(ing.baseUnit)}) — ${Number(ing.costPerUnit).toFixed(4)}/{formatUnitSymbol(ing.baseUnit)}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1 w-32">
                              <input
                                type="number"
                                step="any"
                                value={r.quantityBase}
                                onChange={(e) => {
                                  const newItems = [...prodForm.recipeItems]
                                  newItems[idx].quantityBase = e.target.value
                                  setProdForm({ ...prodForm, recipeItems: newItems })
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg border text-right ${classes.input}`}
                              />
                              <span className={`text-[10px] font-mono w-10 ${classes.textSub}`}>
                                {formatUnitSymbol(selectedIng?.baseUnit)}
                              </span>
                            </div>

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
                        <span className={classes.textMuted}>Costo estimado de insumos por porción:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">${liveRecipeCost.toFixed(2)} MXN</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SELECCIÓN DE INVENTARIO DIRECTO */}
              {prodForm.inventoryPolicy === 'DIRECT' && (
                <div className={`p-4 rounded-2xl border space-y-2 ${classes.subCard}`}>
                  <label className={`block font-medium ${classes.textMuted}`}>Insumo a descontar por venta</label>
                  <select
                    value={prodForm.directItemId}
                    onChange={(e) => setProdForm({ ...prodForm, directItemId: e.target.value })}
                    required
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
                  <span>Guardar Producto</span>
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
    </div>
  )
}

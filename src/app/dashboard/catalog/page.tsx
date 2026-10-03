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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="h-5 w-px bg-slate-800"></div>
          <div>
            <h1 className="font-bold text-base text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-400" />
              {businessSettings.recipesEnabled
                ? 'Catálogo, Insumos y Recetario'
                : 'Catálogo de Productos'}
            </h1>
            <p className="text-xs text-slate-400">
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
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
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
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
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
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
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
        <div className="flex gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Productos Vendibles ({products.length})</span>
          </button>

          {businessSettings.recipesEnabled && (
            <button
              type="button"
              onClick={() => setActiveTab('ingredients')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ingredients'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Insumos y Unidad Base ({ingredients.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categorías ({categories.length})</span>
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
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
                  className="rounded-3xl bg-slate-900/60 border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-violet-300">
                          {p.category.name}
                        </span>
                        <h3 className="text-base font-bold text-white mt-1">{p.name}</h3>
                        <span className="text-[10px] font-mono text-slate-500">{p.code}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Archivar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {p.description || 'Sin descripción'}
                    </p>

                    {/* Policy Badge & Recipe Details */}
                    <div>
                      {p.inventoryPolicy === 'RECIPE' && recipe && (
                        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850 space-y-1.5">
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Receta ({recipe.items.length} insumos):
                          </span>
                          <div className="text-[11px] text-slate-400 space-y-0.5">
                            {recipe.items.map((it) => (
                              <div key={it.id} className="flex justify-between">
                                <span>{it.inventoryItem.name}</span>
                                <strong className="text-slate-300">
                                  {Number(it.quantityBase)} {formatUnitSymbol(it.inventoryItem.baseUnit)}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.inventoryPolicy === 'DIRECT' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          📦 Inventario Directo (1 unidad)
                        </span>
                      )}

                      {p.inventoryPolicy === 'NONE' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400">
                          🚫 Sin Inventario
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial Metrics Footer */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Precio Venta</span>
                      <strong className="text-sm font-bold text-white">${price.toFixed(2)} MXN</strong>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block">Costo Insumos</span>
                      <span className="text-xs text-slate-300 font-semibold">${cost.toFixed(2)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Margen</span>
                      <span className="text-xs font-bold text-emerald-400">{margin}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 2: INSUMOS EN UNIDAD BASE */}
        {!loading && activeTab === 'ingredients' && (
          <div className="rounded-3xl bg-slate-900/50 border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" /> Insumos Base de Inventario
                </h3>
                <p className="text-xs text-slate-400">
                  Todo insumo se registra en una única unidad base (ml, g, piezas) para alimentar recetas y compras.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">SKU / Insumo</th>
                    <th className="p-3.5">Unidad Base</th>
                    <th className="p-3.5">Costo Unitario Base</th>
                    <th className="p-3.5">Presentación de Compra</th>
                    <th className="p-3.5">Factor a Base</th>
                    <th className="p-3.5">Pto. Reorden</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ingredients.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-semibold text-white">
                        <span className="font-mono text-[10px] text-slate-500 block">{item.sku}</span>
                        {item.name}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px]">
                          {formatUnitFull(item.baseUnit)}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-200">
                        ${Number(item.costPerUnit).toFixed(4)} / {formatUnitSymbol(item.baseUnit)}
                      </td>
                      <td className="p-3.5">
                        {item.presentations.length > 0 ? (
                          <div className="space-y-0.5">
                            {item.presentations.map((pr) => (
                              <span key={pr.id} className="block text-slate-300">
                                {pr.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">Unitaria</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">
                        {item.presentations.length > 0
                          ? `1 = ${Number(item.presentations[0].factorToBase)} ${formatUnitSymbol(item.baseUnit)}`
                          : '1 a 1'}
                      </td>
                      <td className="p-3.5 text-slate-400">
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
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-mono text-[10px] text-slate-500 block">{cat.slug}</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{cat.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {cat._count?.products || 0} producto(s) asignados
                  </p>
                </div>
                <Tag className="w-5 h-5 text-violet-400" />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL NUEVO PRODUCTO Y CONSTRUCTOR DE RECETAS */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registrar Producto</h3>
                  <p className="text-xs text-slate-400">Con cálculo automático de costos e inventario</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Categoría *</label>
                  <select
                    value={prodForm.categoryId}
                    onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  <label className="block text-slate-300 font-medium mb-1">Código / SKU</label>
                  <input
                    type="text"
                    value={prodForm.code}
                    onChange={(e) => setProdForm({ ...prodForm, code: e.target.value.toUpperCase() })}
                    placeholder="Ej: BEB-LATTE-12"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  placeholder="Ej: Café Mocha 12oz"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Precio de Venta ($ MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodForm.price}
                    onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                    placeholder="Ej: 65.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Política de Inventario *</label>
                  <select
                    value={prodForm.inventoryPolicy}
                    onChange={(e) =>
                      setProdForm({
                        ...prodForm,
                        inventoryPolicy: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="RECIPE">RECETA (Descuenta ingredientes por porción)</option>
                    <option value="DIRECT">DIRECTO (Descuenta 1 unidad de insumo)</option>
                    <option value="NONE">SIN INVENTARIO (Solo cobro)</option>
                  </select>
                </div>
              </div>

              {/* CONSTRUCTOR DE RECETAS INTERACTIVO */}
              {prodForm.inventoryPolicy === 'RECIPE' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Ingredientes de la Receta
                      </span>
                      <p className="text-[11px] text-slate-400">
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
                    <div className="py-4 text-center text-slate-500 text-[11px]">
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
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
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
                                className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-right"
                              />
                              <span className="text-[10px] text-slate-400 font-mono w-10">
                                {formatUnitSymbol(selectedIng?.baseUnit)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeRecipeRow(idx)}
                              className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}

                      <div className="pt-2 border-t border-slate-850 flex justify-between text-xs text-slate-400">
                        <span>Costo estimado de insumos por porción:</span>
                        <strong className="text-emerald-400">${liveRecipeCost.toFixed(2)} MXN</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SELECCIÓN DE INVENTARIO DIRECTO */}
              {prodForm.inventoryPolicy === 'DIRECT' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-2">
                  <label className="block text-slate-300 font-medium">Insumo a descontar por venta</label>
                  <select
                    value={prodForm.directItemId}
                    onChange={(e) => setProdForm({ ...prodForm, directItemId: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
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

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium flex items-center gap-1.5 shadow-lg shadow-violet-600/30 cursor-pointer disabled:opacity-50"
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
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nuevo Insumo de Inventario</h3>
                  <p className="text-xs text-slate-400">Definido en unidad base para recetas exactas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nombre del Insumo *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="Ej: Jarabe de Vainilla"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">SKU / Código</label>
                  <input
                    type="text"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value.toUpperCase() })}
                    placeholder="Ej: INS-JAR-VAIN"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Unidad Base *</label>
                  <select
                    value={itemForm.baseUnit}
                    onChange={(e) => setItemForm({ ...itemForm, baseUnit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {Object.values(UNIT_DEFINITIONS).map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Costo por Unidad Base ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={itemForm.costPerUnit}
                    onChange={(e) => setItemForm({ ...itemForm, costPerUnit: e.target.value })}
                    placeholder="Ej: 0.1500"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Presentación de compra */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-850 space-y-2.5">
                <span className="font-semibold text-slate-300 block">
                  Presentación de Compra (Opcional)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={itemForm.presentationName}
                    onChange={(e) => setItemForm({ ...itemForm, presentationName: e.target.value })}
                    placeholder="Ej: Botella 750ml"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                  />
                  <input
                    type="number"
                    value={itemForm.presentationFactor}
                    onChange={(e) => setItemForm({ ...itemForm, presentationFactor: e.target.value })}
                    placeholder="Factor (Ej: 750)"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingItem}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center gap-1.5 shadow-lg shadow-amber-600/30 cursor-pointer disabled:opacity-50"
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
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-400" /> Nueva Categoría
            </h3>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre de Categoría *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ej: Panadería, Postres, Frappes"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCategory}
                  className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  AlertTriangle,
  Minus,
  Plus,
  Check,
  X,
  ShieldAlert,
  Coffee,
  CheckCircle2,
} from 'lucide-react'

export interface CustomizerVariant {
  id: string
  name: string
  price: number
}

export interface CustomizerModifier {
  id: string
  name: string
  extraPrice: number
  inventoryItemId?: string | null
  quantityBase?: number | null
}

export interface CustomizerModifierGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  isRequired: boolean
  modifiers: CustomizerModifier[]
}

export interface CustomizerProduct {
  id: string
  name: string
  variants: CustomizerVariant[]
  modifierGroups?: Array<{
    modifierGroup: CustomizerModifierGroup
  }>
}

export interface CustomizedItemResult {
  variantId: string
  variantName: string
  unitPrice: number
  quantity: number
  notes: string
  modifiers: Array<{
    modifierId: string
    name: string
    unitPrice: number
  }>
}

interface ProductCustomizerModalProps {
  isOpen: boolean
  onClose: () => void
  product: CustomizerProduct | null
  initialQuantity?: number
  isLight?: boolean
  primaryColor?: string
  buttonColor?: string
  onConfirm: (result: CustomizedItemResult) => void
}

const COMMON_EXCLUSIONS = [
  'Sin azúcar',
  'Sin hielo',
  'Poco hielo',
  'Sin canela',
  'Sin crema batida',
  'Extra caliente',
  'Para llevar',
  'Término medio',
  'Bien cocido',
  'Sin sal',
]

export default function ProductCustomizerModal({
  isOpen,
  onClose,
  product,
  initialQuantity = 1,
  isLight = false,
  primaryColor = '#C08552',
  buttonColor = '#C08552',
  onConfirm,
}: ProductCustomizerModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('')
  // Map of modifierGroupId -> Array of selected modifierIds
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({})
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>([])
  const [customNotes, setCustomNotes] = useState<string>('')
  const [hasAllergy, setHasAllergy] = useState<boolean>(false)
  const [allergyDetails, setAllergyDetails] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(initialQuantity)

  // Reset or initialize state when product changes
  useEffect(() => {
    if (product) {
      const defaultVariant = product.variants[0]
      setSelectedVariantId(defaultVariant ? defaultVariant.id : '')
      setSelectedModifiers({})
      setSelectedExclusions([])
      setCustomNotes('')
      setHasAllergy(false)
      setAllergyDetails('')
      setQuantity(initialQuantity || 1)
    }
  }, [product, initialQuantity])

  const selectedVariant = useMemo(() => {
    if (!product) return null
    return product.variants.find((v) => v.id === selectedVariantId) || product.variants[0] || null
  }, [product, selectedVariantId])

  // Extract modifier groups cleanly
  const groups = useMemo(() => {
    if (!product || !product.modifierGroups) return []
    return product.modifierGroups
      .map((g) => g.modifierGroup)
      .filter((g) => g && Array.isArray(g.modifiers) && g.modifiers.length > 0)
  }, [product])

  // Toggle or select modifier in a group
  const handleToggleModifier = (groupId: string, modifierId: string, maxSelect: number) => {
    setSelectedModifiers((prev) => {
      const current = prev[groupId] || []
      if (maxSelect === 1) {
        // Radio behavior: if already selected, deselect; otherwise replace
        if (current.includes(modifierId)) {
          return { ...prev, [groupId]: [] }
        }
        return { ...prev, [groupId]: [modifierId] }
      } else {
        // Multi-select behavior up to maxSelect
        if (current.includes(modifierId)) {
          return { ...prev, [groupId]: current.filter((id) => id !== modifierId) }
        }
        if (current.length < maxSelect) {
          return { ...prev, [groupId]: [...current, modifierId] }
        }
        return prev
      }
    })
  }

  // Toggle fast exclusion pill
  const handleToggleExclusion = (exc: string) => {
    setSelectedExclusions((prev) =>
      prev.includes(exc) ? prev.filter((e) => e !== exc) : [...prev, exc]
    )
  }

  // Validation: are all required groups satisfied?
  const validationError = useMemo(() => {
    for (const group of groups) {
      const selected = selectedModifiers[group.id] || []
      if (group.isRequired && selected.length < (group.minSelect || 1)) {
        return `Por favor elige al menos ${group.minSelect || 1} opción de "${group.name}".`
      }
      if (group.minSelect > 0 && selected.length < group.minSelect) {
        return `El grupo "${group.name}" requiere un mínimo de ${group.minSelect} opciones.`
      }
    }
    if (hasAllergy && !allergyDetails.trim()) {
      return 'Especifica el ingrediente o alérgeno del comensal.'
    }
    return null
  }, [groups, selectedModifiers, hasAllergy, allergyDetails])

  // Flat list of selected modifiers with details
  const chosenModifiersList = useMemo(() => {
    const list: Array<{ modifierId: string; name: string; unitPrice: number }> = []
    for (const group of groups) {
      const ids = selectedModifiers[group.id] || []
      for (const id of ids) {
        const mod = group.modifiers.find((m) => m.id === id)
        if (mod) {
          list.push({
            modifierId: mod.id,
            name: mod.name,
            unitPrice: Number(mod.extraPrice) || 0,
          })
        }
      }
    }
    return list
  }, [groups, selectedModifiers])

  // Calculation
  const basePrice = selectedVariant ? Number(selectedVariant.price) : 0
  const modifiersPriceTotal = chosenModifiersList.reduce((acc, m) => acc + m.unitPrice, 0)
  const unitPrice = basePrice + modifiersPriceTotal
  const finalTotal = unitPrice * quantity

  const handleConfirm = () => {
    if (!product || !selectedVariant || validationError) return

    // Compose formatted notes
    const noteParts: string[] = []

    if (hasAllergy && allergyDetails.trim()) {
      noteParts.push(`⚠️ ALERGIA: ${allergyDetails.trim()}`)
    }

    if (selectedExclusions.length > 0) {
      noteParts.push(selectedExclusions.join(', '))
    }

    if (customNotes.trim()) {
      noteParts.push(customNotes.trim())
    }

    const composedNotes = noteParts.join(' • ')

    onConfirm({
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      unitPrice,
      quantity,
      notes: composedNotes,
      modifiers: chosenModifiersList,
    })

    onClose()
  }

  if (!isOpen || !product) return null

  const hasVariants = product.variants.length > 1

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        className={`w-full max-w-xl max-h-[92vh] overflow-hidden rounded-3xl border flex flex-col shadow-2xl transition-all ${
          isLight
            ? 'bg-[#FDFBF9] border-[#DECEBD] text-[#2B1712]'
            : 'bg-[#181412] border-[#382b25] text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-start justify-between shrink-0 ${
            isLight ? 'bg-white border-[#DECEBD]' : 'bg-[#211a17] border-[#382b25]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: `${buttonColor}20`, color: buttonColor }}
            >
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black leading-tight">{product.name}</h3>
              <p className={`text-xs ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                Personaliza tamaño, sabores, extras y alergias
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
              isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-slate-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
          {/* 1. SELECCIÓN DE TAMAÑO / VARIANTE (Si tiene más de 1 tamaño) */}
          {hasVariants && (
            <div className="space-y-2.5">
              <span className={`font-bold text-xs uppercase tracking-wider block ${isLight ? 'text-[#5E3023]' : 'text-amber-400'}`}>
                1. Elige el Tamaño
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = v.id === selectedVariantId
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? isLight
                            ? 'bg-amber-500/10 border-amber-600 shadow-md ring-1 ring-amber-500'
                            : 'bg-amber-500/15 border-amber-500 shadow-md ring-1 ring-amber-500'
                          : isLight
                          ? 'bg-white border-[#DECEBD] hover:border-amber-400'
                          : 'bg-[#201815] border-[#382b25] hover:border-white/20'
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2
                          className="w-4 h-4 absolute top-2 right-2"
                          style={{ color: buttonColor }}
                        />
                      )}
                      <span className="font-bold text-xs block truncate pr-4">{v.name}</span>
                      <strong className={`font-mono text-sm block mt-1 ${isLight ? 'text-[#5E3023]' : 'text-amber-400'}`}>
                        ${Number(v.price).toFixed(2)}
                      </strong>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 2. GRUPOS DE MODIFICADORES (Sabores, Leches, Extras) */}
          {groups.map((group) => {
            const chosen = selectedModifiers[group.id] || []
            const max = group.maxSelect || 1
            const min = group.minSelect || 0
            const isSingle = max === 1

            return (
              <div
                key={group.id}
                className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-white border-[#DECEBD]' : 'bg-[#201815] border-[#382b25]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-xs">{group.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {group.isRequired ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        Obligatorio
                      </span>
                    ) : (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isLight ? 'bg-[#F3E9DC] border-[#DECEBD] text-[#7A5A43]' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        Opcional
                      </span>
                    )}

                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${isLight ? 'bg-[#F3E9DC] border-[#DECEBD] text-[#7A5A43]' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                      {isSingle ? 'Elige 1' : `Máx ${max}`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.modifiers.map((mod) => {
                    const isSelected = chosen.includes(mod.id)
                    const extra = Number(mod.extraPrice) || 0
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => handleToggleModifier(group.id, mod.id, max)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? isLight
                              ? 'bg-amber-500/15 border-amber-600 font-bold shadow-xs'
                              : 'bg-amber-500/20 border-amber-500 text-white font-bold shadow-xs'
                            : isLight
                            ? 'bg-[#FDFBF9] border-[#DECEBD] hover:border-amber-400 text-[#5E3023]'
                            : 'bg-[#181412] border-[#382b25] hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : isLight
                                ? 'border-[#DECEBD] bg-white'
                                : 'border-[#382b25] bg-[#221c19]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{mod.name}</span>
                        </div>

                        <strong
                          className={`font-mono text-xs shrink-0 ${
                            extra > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isLight
                              ? 'text-[#7A5A43]'
                              : 'text-slate-500'
                          }`}
                        >
                          {extra > 0 ? `+$${extra.toFixed(2)}` : 'Gratis'}
                        </strong>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* 3. EXCLUSIONES RÁPIDAS ("SIN...") */}
          <div className="space-y-2">
            <span className={`font-bold text-xs uppercase tracking-wider block ${isLight ? 'text-[#5E3023]' : 'text-amber-400'}`}>
              Quitar / Exclusiones de la receta
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_EXCLUSIONS.map((exc) => {
                const active = selectedExclusions.includes(exc)
                return (
                  <button
                    key={exc}
                    type="button"
                    onClick={() => handleToggleExclusion(exc)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-300 font-bold'
                        : isLight
                        ? 'bg-white border-[#DECEBD] text-[#7A5A43] hover:bg-[#F3E9DC]'
                        : 'bg-[#201815] border-[#382b25] text-slate-400 hover:text-white'
                    }`}
                  >
                    {active ? `✓ ${exc}` : exc}
                  </button>
                )
              })}
            </div>

            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Otra indicación especial para cocina / barra..."
              className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                isLight
                  ? 'bg-white border-[#DECEBD] text-[#2B1712]'
                  : 'bg-[#201815] border-[#382b25] text-slate-100 placeholder-slate-500'
              }`}
            />
          </div>

          {/* 4. ALERTA DE ALERGIA ALIMENTARIA (ALTA PRIORIDAD EN COCINA) */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition-all ${
              hasAllergy
                ? 'bg-rose-500/10 border-rose-500 ring-1 ring-rose-500'
                : isLight
                ? 'bg-white border-[#DECEBD]'
                : 'bg-[#201815] border-[#382b25]'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                <input
                  type="checkbox"
                  checked={hasAllergy}
                  onChange={(e) => setHasAllergy(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-black">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  ¿El comensal tiene alguna alergia o intolerancia?
                </span>
              </label>

              {hasAllergy && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                  ALERTA COCINA
                </span>
              )}
            </div>

            {hasAllergy && (
              <div className="space-y-1 pt-1">
                <input
                  type="text"
                  required
                  value={allergyDetails}
                  onChange={(e) => setAllergyDetails(e.target.value)}
                  placeholder="Especifica el alérgeno (Ej: Cacahuate, Mariscos, Lácteos, Gluten, Nuez)..."
                  className="w-full px-3 py-2 rounded-xl border border-rose-500/50 bg-rose-500/5 text-rose-700 dark:text-rose-300 font-bold placeholder-rose-400/60 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                />
                <p className="text-[10px] text-rose-600 dark:text-rose-400">
                  ⚠️ Esta advertencia se mostrará en rojo parpadeante prioritario en el monitor KDS y comanda.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer con Cantidad, Total y Botón Confirmar */}
        <div
          className={`p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            isLight ? 'bg-white border-[#DECEBD]' : 'bg-[#211a17] border-[#382b25]'
          }`}
        >
          {/* Stepper Cantidad */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
              Cantidad:
            </span>
            <div
              className={`flex items-center p-1 rounded-2xl border ${
                isLight ? 'bg-[#FDFBF9] border-[#DECEBD]' : 'bg-[#181412] border-[#382b25]'
              }`}
            >
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black cursor-pointer active:scale-95 ${
                  isLight ? 'hover:bg-[#F3E9DC] text-[#5E3023]' : 'hover:bg-white/10 text-white'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono font-bold text-sm px-3">{quantity}</span>

              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black cursor-pointer active:scale-95 ${
                  isLight ? 'hover:bg-[#F3E9DC] text-[#5E3023]' : 'hover:bg-white/10 text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="text-right">
              <span className={`text-[10px] block ${isLight ? 'text-[#7A5A43]' : 'text-slate-400'}`}>
                ${unitPrice.toFixed(2)} c/u
              </span>
              <strong className="text-base font-black font-mono" style={{ color: buttonColor }}>
                ${finalTotal.toFixed(2)} MXN
              </strong>
            </div>

            <button
              type="button"
              disabled={Boolean(validationError)}
              onClick={handleConfirm}
              style={{ backgroundColor: buttonColor, color: '#FFFFFF' }}
              className="px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
              title={validationError || 'Agregar a la orden'}
            >
              <Check className="w-4 h-4" />
              <span>Agregar a Orden</span>
            </button>
          </div>
        </div>

        {/* Validation Error Toast */}
        {validationError && (
          <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>
    </div>
  )
}

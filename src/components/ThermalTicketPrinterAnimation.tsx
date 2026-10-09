'use client'

import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Printer, CheckCircle2, X } from 'lucide-react'

export interface ThermalTicketData {
  tableName: string
  orderNumber: string
  businessName?: string
  branchName?: string
  logoUrl?: string | null
  waiterName: string
  customerName?: string | null
  items: Array<{
    id?: string
    productName: string
    quantity: number
    subtotal: number
    notes?: string | null
  }>
  subtotal: number
  total: number
  paymentMethod?: string
  amountReceived?: number
  change?: number
  isPaid?: boolean
  date?: string
}

interface ThermalTicketPrinterAnimationProps {
  isOpen: boolean
  ticket: ThermalTicketData | null
  onClose: () => void
  onReprint?: () => void
  autoCloseDelay?: number // milisegundos para auto-cerrar (0 para no auto-cerrar)
}

export default function ThermalTicketPrinterAnimation({
  isOpen,
  ticket,
  onClose,
  onReprint,
  autoCloseDelay = 0,
}: ThermalTicketPrinterAnimationProps) {
  const [isAnimationFinished, setIsAnimationFinished] = useState(false)
  const [reprintCount, setReprintCount] = useState(0)

  // Referencias estables para evitar re-ejecución del useEffect por re-renders
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const prevIsOpenRef = useRef(false)

  useEffect(() => {
    // Solo disparar cuando isOpen cambia de false a true
    if (isOpen && !prevIsOpenRef.current) {
      prevIsOpenRef.current = true
      setIsAnimationFinished(false)

      const animTimer = setTimeout(() => {
        setIsAnimationFinished(true)
      }, 2100)

      let closeTimer: NodeJS.Timeout | null = null
      if (autoCloseDelay > 0) {
        closeTimer = setTimeout(() => {
          onCloseRef.current()
        }, autoCloseDelay)
      }

      return () => {
        clearTimeout(animTimer)
        if (closeTimer) clearTimeout(closeTimer)
      }
    } else if (!isOpen) {
      prevIsOpenRef.current = false
      setIsAnimationFinished(false)
    }
  }, [isOpen, autoCloseDelay])

  if (!isOpen || !ticket) return null

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    TRANSFER: 'Transferencia',
  }

  const handleReprintClick = () => {
    setIsAnimationFinished(false)
    setReprintCount((prev) => prev + 1)
    setTimeout(() => {
      setIsAnimationFinished(true)
    }, 2100)
    if (onReprint) onReprint()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      {/* Botón flotante para cerrar en esquina superior */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 z-30"
        title="Cerrar ticket"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Contenedor de la impresora y el ticket */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-sm py-2">
        {/* Chasis completo de la impresora térmica */}
        <div className="relative w-[320px] flex flex-col items-center">
          {/* 1. Fondo / Base estructural de la impresora (Cuerpo completo 3D) */}
          <div className="absolute top-0 left-0 w-full h-[76px] bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 rounded-2xl border border-neutral-700/60 shadow-2xl z-0 ring-1 ring-white/10" />

          {/* 2. Cabezal Frontal Superior (z-30) con LED, Marca y Cuchilla de corte */}
          <div className="relative w-full bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 rounded-t-2xl pt-3.5 px-4 pb-2 z-30 shadow-md border-t border-x border-neutral-700/60 ring-1 ring-white/10 flex flex-col items-center">
            <div className="flex items-center justify-between w-full px-1 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    isAnimationFinished
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]'
                  }`}
                />
                <span
                  className={`text-[10px] font-mono font-bold tracking-wider ${
                    isAnimationFinished ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isAnimationFinished ? 'LISTO' : 'IMPRIMIENDO...'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-300 uppercase tracking-widest flex items-center gap-1.5 font-semibold">
                <Printer className="w-3.5 h-3.5 text-neutral-400" />
                <span>Thermal-POS 80mm</span>
              </span>
            </div>

            {/* Filo metálico del cortador térmico (cuchilla) */}
            <div className="w-[288px] h-[2.5px] bg-gradient-to-r from-neutral-600 via-neutral-200 to-neutral-600 rounded-full shadow-sm" />
          </div>

          {/* 3. Ranura física oscura y rodillo interior (z-10, visible detrás del origen del ticket) */}
          <div className="relative w-[288px] h-2 bg-black rounded-b-sm shadow-[inset_0_2px_4px_rgba(0,0,0,1)] z-10 -mt-[1px] flex items-center justify-center">
            <div className="w-11/12 h-[1px] bg-neutral-800/80" />
          </div>

          {/* 4. Contenedor con overflow hidden que expulsa el ticket hacia abajo */}
          <div className="relative w-[320px] overflow-hidden flex flex-col items-center -mt-2 z-20 max-h-[72vh]">
            <AnimatePresence>
              <motion.div
                key={reprintCount}
                initial={{ y: '-100%', opacity: 0.95 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  transition: {
                    duration: 2.0,
                    // Curva de avance escalonado del rodillo de papel térmico
                    ease: [0.15, 0.85, 0.35, 1.0],
                  },
                }}
                className="relative w-[280px] bg-white text-neutral-950 font-sans text-xs shadow-2xl filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.6)] select-none rounded-b-sm border-x border-neutral-300 [font-variant-numeric:tabular-nums]"
              >
                {/* Sombra sutil proyectada por la cuchilla en la boca de salida */}
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-black/35 to-transparent z-10" />

                {/* Contenido del ticket real */}
                <div className="p-4 space-y-2 leading-tight">
                  {/* Cabecera del ticket */}
                  <div className="text-center space-y-1 border-b border-dashed border-neutral-400 pb-2.5">
                    {ticket.logoUrl && (
                    <div className="flex justify-center mb-1">
                      <img
                        src={ticket.logoUrl}
                        alt="Logo"
                        className="max-h-14 max-w-[140px] object-contain grayscale contrast-125"
                      />
                    </div>
                  )}
                  <h3 className="font-black text-sm tracking-wide uppercase leading-tight text-neutral-950">
                    {ticket.businessName || ticket.branchName || 'CAFETERÍA & RESTAURANTE'}
                  </h3>
                  <div className="text-[10px] font-bold text-neutral-700 tracking-wide pt-0.5">
                    {ticket.isPaid ? '--- COMPROBANTE DE PAGO ---' : '--- PRE-CUENTA DE CONSUMO ---'}
                  </div>
                  <div className="text-xs font-black text-neutral-950 pt-0.5">
                    MESA: {ticket.tableName}
                  </div>
                  <div className="text-[10px] text-neutral-600 font-medium">
                    Folio: #{ticket.orderNumber ? ticket.orderNumber.slice(-6) : '000000'}
                  </div>
                  <div className="text-[9px] text-neutral-500 font-medium">
                    {ticket.date || new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>

                {/* Datos de mesero y cliente */}
                <div className="text-[10px] border-b border-dashed border-neutral-400 pb-1.5 space-y-0.5 text-neutral-800">
                  <div className="flex justify-between">
                    <span>Atendió:</span>
                    <strong className="font-bold">{ticket.waiterName}</strong>
                  </div>
                  {ticket.customerName && (
                    <div className="flex justify-between">
                      <span>Cliente:</span>
                      <strong className="font-bold">{ticket.customerName}</strong>
                    </div>
                  )}
                </div>

                {/* Desglose de platillos */}
                <div className="border-b border-dashed border-neutral-400 pb-2">
                  <div className="flex justify-between text-[10px] font-bold border-b border-neutral-300 pb-1 mb-1 text-neutral-900">
                    <span>CANT / DESCRIPCIÓN</span>
                    <span className="text-right">TOTAL</span>
                  </div>
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
                    {ticket.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-start text-[11px] leading-tight">
                        <div className="pr-2">
                          <span className="font-bold">{it.quantity}x</span> {it.productName}
                          {it.notes && (
                            <div className="text-[9px] text-neutral-500 italic pl-3">
                              ({it.notes})
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-neutral-950 shrink-0 text-right">
                          ${it.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totales */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex justify-between text-[11px] text-neutral-800">
                    <span>Subtotal:</span>
                    <span>${ticket.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm border-t border-neutral-900 pt-1 text-neutral-950">
                    <span>TOTAL:</span>
                    <span>${ticket.total.toFixed(2)} MXN</span>
                  </div>
                </div>

                {/* Datos de pago si ya está liquidado */}
                {ticket.isPaid && (
                  <div className="border-t border-dashed border-neutral-400 pt-1 text-[10px] space-y-0.5 text-neutral-800">
                    <div className="flex justify-between">
                      <span>Método de Pago:</span>
                      <strong className="font-bold">
                        {paymentMethodLabels[ticket.paymentMethod || 'CASH'] || ticket.paymentMethod || 'Efectivo'}
                      </strong>
                    </div>
                    {ticket.paymentMethod === 'CASH' && ticket.amountReceived !== undefined && (
                      <>
                        <div className="flex justify-between">
                          <span>Recibido:</span>
                          <span>${ticket.amountReceived.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-neutral-950">
                          <span>Cambio:</span>
                          <span>${(ticket.change || 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Mensaje inferior del ticket (sin código de barras) */}
                <div className="pt-2 text-center space-y-0.5 border-t border-dashed border-neutral-400">
                  <div className="text-[10px] font-extrabold text-neutral-900 uppercase">
                    {ticket.isPaid ? '*** ¡GRACIAS POR SU VISITA! ***' : '*** FAVOR DE PAGAR EN CAJA ***'}
                  </div>
                  <p className="text-[9px] text-neutral-600">
                    {ticket.isPaid ? 'Comprobante de pago emitido exitosamente.' : 'Documento informativo de consumo.'}
                  </p>
                </div>
              </div>

              {/* Borde dentado inferior (Corte en zigzag térmico) */}
              <div
                className="w-full h-3 -mb-3 relative"
                style={{
                  background: 'radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%)',
                  backgroundSize: '10px 10px',
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Acciones de estado bajo la impresora */}
      <div className="mt-3 flex flex-col items-center gap-2 z-20">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 bg-neutral-900/95 px-3.5 py-1.5 rounded-full border border-neutral-700 shadow-md">
            {isAnimationFinished ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Ticket impreso</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Expulsando ticket térmico...</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <button
              type="button"
              onClick={handleReprintClick}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold tracking-wide transition-colors border border-neutral-700 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-300" />
              <span>Reimprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold tracking-wide transition-colors shadow-lg active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>✓ Listo / Continuar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import React from 'react'

interface DividerProps {
  color?: string
  className?: string
}

/**
 * Separador Elegante con Grano de Café de Especialidad y Volutas de Aroma
 */
export function CoffeeBeanDivider({ color = '#D4AF37', className = '' }: DividerProps) {
  return (
    <div className={`w-full flex items-center justify-center my-6 overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 600 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-xl h-9"
        style={{ color }}
      >
        {/* Línea curva izquierda con desvanecimiento */}
        <path
          d="M 20 18 Q 140 18 200 18 C 240 18 255 24 280 20"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />
        <path
          d="M 60 18 C 150 18 210 14 275 18"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="4 4"
          strokeOpacity="0.25"
        />

        {/* Emblema Central: Grano de Café con volutas de tostado */}
        <g transform="translate(300, 18)">
          {/* Grano exterior */}
          <path
            d="M -11 -7 C -4 -13 9 -10 11 -3 C 13 4 8 12 1 12 C -6 12 -13 6 -11 -7 Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.08"
          />
          {/* Hendidura en S del grano */}
          <path
            d="M -5 -9 C 2 -4 -3 3 2 10"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {/* Volutas de vapor / aroma ascendente */}
          <path
            d="M -4 -15 C -2 -19 -6 -21 -4 -25"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />
          <path
            d="M 3 -14 C 5 -18 1 -20 3 -24"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />
        </g>

        {/* Línea curva derecha con desvanecimiento simétrico */}
        <path
          d="M 320 20 C 345 24 360 18 400 18 Q 460 18 580 18"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />
        <path
          d="M 325 18 C 390 14 450 18 540 18"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="4 4"
          strokeOpacity="0.25"
        />
      </svg>
    </div>
  )
}

/**
 * Separador Elegante con Crepa Francesa Doblada y Ondas de Miel / Jarabe
 */
export function CrepeDivider({ color = '#D4AF37', className = '' }: DividerProps) {
  return (
    <div className={`w-full flex items-center justify-center my-6 overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 600 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-xl h-9"
        style={{ color }}
      >
        {/* Curva lateral izquierda */}
        <path
          d="M 30 18 C 120 18 190 24 270 18"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />
        <path
          d="M 70 21 C 150 21 210 16 265 19"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeOpacity="0.2"
        />

        {/* Emblema Central: Silueta de Crepa Doblada en Abanico */}
        <g transform="translate(300, 18)">
          {/* Base en abanico de la crepa */}
          <path
            d="M -15 8 C -12 -5 -4 -13 0 -13 C 4 -13 12 -5 15 8 C 8 10 -8 10 -15 8 Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.08"
          />
          {/* Dobleces interiores de la masa hojaldrada */}
          <path
            d="M -11 6 C -5 -1 0 -10 0 -13"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <path
            d="M 11 6 C 5 -1 0 -10 0 -13"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          {/* Ondas decorativas de chocolate o caramelo */}
          <path
            d="M -9 1 C -4 4 4 4 9 1"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
          <path
            d="M -7 -4 C -2 -2 2 -2 7 -4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
        </g>

        {/* Curva lateral derecha simétrica */}
        <path
          d="M 330 18 C 410 24 480 18 570 18"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />
        <path
          d="M 335 19 C 390 16 450 21 530 21"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeOpacity="0.2"
        />
      </svg>
    </div>
  )
}

/**
 * Separador Elegante con Taza de Café / Prensa Francesa con Volutas Curvas
 */
export function CoffeeCupDivider({ color = '#D4AF37', className = '' }: DividerProps) {
  return (
    <div className={`w-full flex items-center justify-center my-6 overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 600 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-xl h-9"
        style={{ color }}
      >
        {/* Curva decorativa izquierda */}
        <path
          d="M 25 18 C 110 18 180 12 230 18 C 255 21 268 20 280 18"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />

        {/* Emblema Central: Taza humeante estilizada con plato curvo */}
        <g transform="translate(300, 18)">
          {/* Plato base */}
          <path
            d="M -15 9 C -8 11 8 11 15 9"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {/* Taza */}
          <path
            d="M -10 -2 L -8 7 C -5 9 5 9 8 7 L 10 -2 Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.08"
          />
          {/* Asa de la taza */}
          <path
            d="M 10 0 C 14 0 14 5 9 6"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Voluta de vapor curvada */}
          <path
            d="M -3 -6 C -1 -9 -5 -11 -3 -15"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
          <path
            d="M 3 -6 C 5 -9 1 -11 3 -15"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
        </g>

        {/* Curva decorativa derecha */}
        <path
          d="M 320 18 C 332 20 345 21 370 18 C 420 12 490 18 575 18"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />
      </svg>
    </div>
  )
}

/**
 * Divisor de Onda Líquida Orgánica (Estilo Ola de Leche / Café vertido)
 * Inspirado en las referencias visuales contemporáneas
 */
export function OrganicWaveDivider({
  color = '#D4AF37',
  className = '',
  flip = false,
}: DividerProps & { flip?: boolean }) {
  return (
    <div
      className={`w-full overflow-hidden leading-none pointer-events-none ${className}`}
      style={{ color }}
    >
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className={`w-full h-10 sm:h-16 ${flip ? 'scale-y-[-1]' : ''}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,0 C150,90 350,-40 500,45 C650,130 900,10 1200,60 L1200,120 L0,120 Z"
          fill="currentColor"
          fillOpacity="0.06"
        />
        <path
          d="M0,30 C200,110 400,-10 600,50 C800,110 1000,20 1200,75"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.25"
        />
      </svg>
    </div>
  )
}

/**
 * Ilustración Vectorial: Cafetera Moka Italiana (Línea Fina Barista)
 */
export function MokaPotIcon({
  color = 'currentColor',
  className = 'w-12 h-12',
}: DividerProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
    >
      {/* Pomo superior */}
      <circle cx="32" cy="7" r="3" stroke="currentColor" strokeWidth="1.75" />
      {/* Tapa triangular */}
      <path
        d="M23 15 L32 10 L41 15 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Cámara superior facetada */}
      <path
        d="M21 16 L17 32 L47 32 L43 16 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M26 16 L24 32" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.5" />
      <path d="M38 16 L40 32" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.5" />
      <path d="M32 16 L32 32" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.5" />
      {/* Asa */}
      <path
        d="M45 19 C52 20 54 30 46 34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Pico vertedor */}
      <path d="M19 18 L13 22 L18 24" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      {/* Cintura / Filtro central */}
      <rect x="23" y="32" width="18" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      {/* Caldera inferior octagonal */}
      <path
        d="M23 35 L19 54 C19 56 22 58 32 58 C42 58 45 56 45 54 L41 35 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M25 35 L23 54" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.5" />
      <path d="M39 35 L41 54" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.5" />
      {/* Válvula de seguridad */}
      <circle cx="21" cy="44" r="1.5" fill="currentColor" />
    </svg>
  )
}

/**
 * Ilustración Vectorial: Bebida Fría / Vaso con Sorbete y Hielos
 */
export function ColdDrinkIcon({
  color = 'currentColor',
  className = 'w-12 h-12',
}: DividerProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
    >
      {/* Popote / Pajita inclinada */}
      <path
        d="M36 5 L43 14 L30 45"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tapa domo translúcida */}
      <path
        d="M20 20 C20 13 44 13 44 20 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect x="18" y="19" width="28" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      {/* Vaso cónico */}
      <path
        d="M20 22 L24 57 C24.5 59 27 60 32 60 C37 60 39.5 59 40 57 L44 22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Cubos de hielo flotando */}
      <rect
        x="26"
        y="28"
        width="6"
        height="6"
        rx="1"
        transform="rotate(15 26 28)"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.75"
      />
      <rect
        x="32"
        y="38"
        width="6"
        height="6"
        rx="1"
        transform="rotate(-20 32 38)"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.75"
      />
      {/* Línea de nivel de líquido / café frío */}
      <path
        d="M22 34 C28 36 36 32 42 35"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
    </svg>
  )
}

/**
 * Rama Botánica de Cafeto con Hojas y Cerezas (Estilo Grabado Natural)
 */
export function CoffeeBranchVector({
  color = 'currentColor',
  className = 'w-16 h-16',
}: DividerProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
    >
      {/* Tallo principal sinuoso */}
      <path
        d="M10 70 C30 55 45 40 68 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Hoja izquierda 1 */}
      <path
        d="M32 54 C20 50 14 36 24 30 C34 26 38 42 32 54 Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.04"
      />
      <path d="M24 30 C27 40 32 54 32 54" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.6" />
      {/* Hoja derecha 1 */}
      <path
        d="M40 45 C48 35 62 38 62 48 C58 58 44 54 40 45 Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.04"
      />
      <path d="M62 48 C50 48 40 45 40 45" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.6" />
      {/* Hoja superior */}
      <path
        d="M52 28 C50 16 62 10 70 12 C74 22 62 30 52 28 Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.04"
      />
      {/* Cerezas de café en racimo */}
      <circle cx="34" cy="48" r="4.5" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.1" />
      <circle cx="39" cy="42" r="4.5" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.1" />
      <circle cx="43" cy="48" r="4" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.1" />
      <circle cx="48" cy="38" r="3.5" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.1" />
    </svg>
  )
}

/**
 * Granos de Café Flotantes Dispersos (Textura decorativa)
 */
export function CoffeeBeanScatter({
  color = 'currentColor',
  className = 'w-24 h-24',
}: DividerProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
    >
      {/* Grano 1 */}
      <g transform="translate(20, 25) rotate(-25)">
        <path
          d="M -7 -4 C -2 -9 6 -7 8 -2 C 9 3 6 8 1 8 C -4 8 -9 4 -7 -4 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="currentColor"
          fillOpacity="0.05"
        />
        <path d="M -3 -6 C 2 -2 -2 2 1 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </g>
      {/* Grano 2 */}
      <g transform="translate(75, 30) rotate(40)">
        <path
          d="M -8 -5 C -3 -10 7 -8 9 -3 C 10 4 7 9 2 9 C -3 9 -10 5 -8 -5 Z"
          stroke="currentColor"
          strokeWidth="1.3"
          fill="currentColor"
          fillOpacity="0.05"
        />
        <path d="M -4 -7 C 2 -3 -2 2 2 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </g>
      {/* Grano 3 */}
      <g transform="translate(50, 75) rotate(15)">
        <path
          d="M -7 -4 C -2 -8 5 -6 7 -1 C 8 4 5 7 1 7 C -3 7 -8 3 -7 -4 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="currentColor"
          fillOpacity="0.05"
        />
        <path d="M -3 -5 C 1 -2 -2 2 1 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/**
 * Sello Vintage de Selección Barista / Best Seller
 */
export function BestSellerStamp({
  label = 'RECOMENDACIÓN',
  sublabel = 'DE LA CASA',
  color = '#D4AF37',
  className = '',
}: {
  label?: string
  sublabel?: string
  color?: string
  className?: string
}) {
  return (
    <div
      className={`inline-flex flex-col items-center justify-center p-2 rounded-full border border-dashed text-center select-none shadow-sm ${className}`}
      style={{
        borderColor: `${color}60`,
        backgroundColor: `${color}12`,
        color,
      }}
    >
      <span className="text-[7px] font-mono tracking-widest uppercase font-black leading-none block">
        ★ {label} ★
      </span>
      <span className="text-[6px] tracking-wider font-extrabold uppercase opacity-80 block mt-0.5">
        {sublabel}
      </span>
    </div>
  )
}


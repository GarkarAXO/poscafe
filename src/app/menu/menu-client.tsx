'use client'

import React from 'react'
import BookMenu, { Category, BusinessData, TableData } from '@/components/book-menu'

interface MenuClientProps {
  business: BusinessData
  categories: Category[]
  table: TableData | null
}

export default function MenuClient({ business, categories, table }: MenuClientProps) {
  const isDarkMode = business.theme?.darkMode ?? false
  const primaryColor = business.theme?.primaryColor || '#C08552'
  const secondaryColor = business.theme?.secondaryColor || '#5E3023'

  return (
    <div
      className={`min-h-screen transition-colors duration-500 flex flex-col items-center justify-center p-3 sm:p-6 selection:bg-[#C08552] selection:text-white relative overflow-x-hidden ${
        isDarkMode ? 'bg-[#0E0B09] text-[#EAD8C7]' : 'bg-[#F2ECE4] text-[#4A281E]'
      }`}
    >
      {/* GLOWS DE AMBIENTACIÓN */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full blur-[170px] opacity-25"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full blur-[160px] opacity-15"
          style={{ backgroundColor: secondaryColor }}
        />
      </div>

      {/* VISTA PURA DE LA CARTA INTERACTIVA */}
      <main className="relative z-10 w-full flex flex-col items-center justify-center">
        <BookMenu
          business={business}
          categories={categories}
          table={table}
          customColors={{
            primaryColor,
            secondaryColor,
            darkMode: isDarkMode,
            menuCoverColor: business.theme?.menuCoverColor,
            menuPaperColor: business.theme?.menuPaperColor,
            menuTextColor: business.theme?.menuTextColor,
            menuAccentColor: business.theme?.menuAccentColor,
            menuCoverTitle: business.theme?.menuCoverTitle,
            menuCoverSubtitle: business.theme?.menuCoverSubtitle,
            businessHours: business.theme?.businessHours,
            phone: business.theme?.phone,
            address: business.theme?.address,
          }}
        />
      </main>
    </div>
  )
}

'use client'

import React from 'react'
import ElegantMenu, {
  Category,
  BusinessData,
  TableData,
} from '@/components/elegant-menu'

interface MenuClientProps {
  business: BusinessData
  categories: Category[]
  table: TableData | null
}

export default function MenuClient({ business, categories, table }: MenuClientProps) {
  return (
    <ElegantMenu
      business={business}
      categories={categories}
      table={table}
      customColors={{
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
  )
}

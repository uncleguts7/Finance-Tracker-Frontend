import {
  AppWindow,
  Car,
  Coffee,
  Droplets,
  Flame,
  HeartPulse,
  Home,
  LucideIcon,
  Receipt,
  Shirt,
  ShoppingCart,
  Tag,
  Utensils,
  Wifi,
  Zap,
} from 'lucide-react'

const KEYWORD_ICONS: Array<[RegExp, LucideIcon]> = [
  [/electric|power|energy/i, Zap],
  [/gas|fuel|heating/i, Flame],
  [/water|sewer/i, Droplets],
  [/cloth|apparel|wear|shoe/i, Shirt],
  [/coff|espress|café|cafe/i, Coffee],
  [/hospital|health|medic|doctor|pharma/i, HeartPulse],
  [/rent|mortgage|home|hous/i, Home],
  [/grocer|food|supermarket|dining|restaurant|meal/i, ShoppingCart],
  [/transport|car|taxi|uber|bus|train|commut/i, Car],
  [/internet|broadband|wifi|telecom|phone|mobile/i, Wifi],
  [/bill|utility|utilities|invoice/i, Receipt],
  [/subscrip|stream|netflix|spotify|app|software/i, AppWindow],
  [/resto|take.?out|delivery/i, Utensils],
]

/** Deterministic icon for a category name; no icon field exists in the API. */
export function categoryIcon(name: string): LucideIcon {
  for (const [pattern, icon] of KEYWORD_ICONS) {
    if (pattern.test(name)) return icon
  }
  return Tag
}

export const UNITS = ['adet', 'kg', 'm', 'm²', 'lt', 'paket'] as const
export type Unit = (typeof UNITS)[number]

export const VAT_RATES = [0, 1, 10, 20] as const

export const TAG_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#d97706',
  '#e11d48',
  '#16a34a',
  '#0891b2',
  '#64748b',
] as const

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Item {
  id: string
  /** Auto-generated, unique, never reused (PMTS-0001). */
  assetCode: string
  name: string
  unit: Unit
  /** Default KDV rate (%), prefilled on new price entries. */
  vatRate: number
  minStock: number
  description: string
  tagIds: string[]
  createdAt: string
}

/** Append-only price history. unitPrice is KDV hariç (TRY). */
export interface PriceEntry {
  id: string
  itemId: string
  date: string
  unitPrice: number
  vatRate: number
  supplier: string
}

export type MovementType = 'in' | 'out' | 'adjust'

/**
 * Stock ledger row. Balance is always derived from the sum of `delta`.
 * `unitPrice` is a snapshot taken when the movement was recorded (KDV hariç),
 * so later price changes never rewrite historical project costs.
 */
export interface StockMovement {
  id: string
  itemId: string
  type: MovementType
  date: string
  /** Signed: + increases stock, - decreases it. */
  delta: number
  unitPrice: number
  projectId: string | null
  note: string
}

export type ProjectStatus = 'planned' | 'active' | 'completed'

export interface Project {
  id: string
  /** Auto-generated, unique (PRJ-001). */
  code: string
  name: string
  status: ProjectStatus
  startDate: string
  endDate: string
  /** Single total budget (KDV hariç, TRY). */
  budget: number
  createdAt: string
}

export interface AppData {
  version: 1
  nextAssetNumber: number
  nextProjectNumber: number
  tags: Tag[]
  items: Item[]
  prices: PriceEntry[]
  movements: StockMovement[]
  projects: Project[]
}

import type { AppData, Item, PriceEntry, Project, StockMovement } from './types.ts'

export function stockOf(itemId: string, movements: StockMovement[]): number {
  let total = 0
  for (const m of movements) if (m.itemId === itemId) total += m.delta
  return round(total)
}

/** Price entries for one item, oldest first. Same-day entries keep insertion order. */
export function priceHistory(itemId: string, prices: PriceEntry[]): PriceEntry[] {
  return prices
    .filter((p) => p.itemId === itemId)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.date.localeCompare(b.p.date) || a.i - b.i)
    .map(({ p }) => p)
}

export function latestPrice(itemId: string, prices: PriceEntry[]): PriceEntry | null {
  const history = priceHistory(itemId, prices)
  return history.at(-1) ?? null
}

export interface PriceStats {
  count: number
  latest: number
  previous: number | null
  /** % change of latest vs previous entry; null when there is no previous entry. */
  changePct: number | null
  average: number
  min: number
  max: number
}

export function priceStats(history: PriceEntry[]): PriceStats | null {
  if (history.length === 0) return null
  const values = history.map((p) => p.unitPrice)
  const latest = values[values.length - 1]
  const previous = values.length > 1 ? values[values.length - 2] : null
  return {
    count: values.length,
    latest,
    previous,
    changePct: previous ? ((latest - previous) / previous) * 100 : null,
    average: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

/** Cost of one stock-out row (always >= 0). Uses the snapshot price. */
export function movementCost(m: StockMovement): number {
  return m.delta < 0 ? roundMoney(-m.delta * m.unitPrice) : 0
}

export function projectCost(projectId: string, movements: StockMovement[]): number {
  let total = 0
  for (const m of movements) {
    if (m.projectId === projectId && m.type === 'out') total += movementCost(m)
  }
  return roundMoney(total)
}

/** Total stock value at the latest known unit price (KDV hariç). */
export function stockValue(data: AppData): number {
  let total = 0
  for (const item of data.items) {
    const price = latestPrice(item.id, data.prices)
    if (price) total += roundMoney(Math.max(stockOf(item.id, data.movements), 0) * price.unitPrice)
  }
  return roundMoney(total)
}

export function isLowStock(item: Item, movements: StockMovement[]): boolean {
  return item.minStock > 0 && stockOf(item.id, movements) < item.minStock
}

export interface PriceRise {
  item: Item
  previous: number
  latest: number
  changePct: number
}

/** Items whose latest price rose the most vs. their previous entry. */
export function topPriceRises(data: AppData, limit: number): PriceRise[] {
  const rises: PriceRise[] = []
  for (const item of data.items) {
    const stats = priceStats(priceHistory(item.id, data.prices))
    if (stats?.previous != null && stats.changePct != null && stats.changePct > 0) {
      rises.push({ item, previous: stats.previous, latest: stats.latest, changePct: stats.changePct })
    }
  }
  return rises.sort((a, b) => b.changePct - a.changePct).slice(0, limit)
}

export function budgetUsage(project: Project, movements: StockMovement[]) {
  const spent = projectCost(project.id, movements)
  const remaining = project.budget - spent
  const pct = project.budget > 0 ? (spent / project.budget) * 100 : null
  return { spent, remaining, pct, over: remaining < 0 }
}

/** Avoids float noise like 0.30000000000000004 in quantities. */
export function round(n: number, digits = 6): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

/** Rounds to kuruş. Applied per line, totals are summed from rounded lines. */
export function roundMoney(n: number): number {
  return round(n, 2)
}

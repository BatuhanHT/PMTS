const TRY = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
const QTY = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 })
const PCT = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })

export const formatMoney = (n: number) => TRY.format(n)

export const formatQty = (n: number) => QTY.format(n)

/** "+11,2%" / "-3,8%" / "—" when there is nothing to compare. */
export function formatPct(n: number | null): string {
  if (n === null) return '—'
  return `${n > 0 ? '+' : ''}${PCT.format(n)}%`
}

/** ISO yyyy-mm-dd -> dd.mm.yyyy, without going through Date (no timezone shifts). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}.${m}.${y}` : iso || '—'
}

/** Today as a local yyyy-mm-dd string. */
export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Palette validated with the dataviz validator against the white card surface:
// categorical slots 1 (blue) + 2 (orange), worst CVD ΔE 24.7, contrast >= 3:1.
export const CHART = {
  surface: '#ffffff',
  series1: '#2a78d6',
  series2: '#eb6834',
  inkPrimary: '#0b0b0b',
  inkSecondary: '#52514e',
  inkMuted: '#898781',
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
} as const

// 'long' spells "bin" / "milyon": the short Turkish "B" reads like a billion.
const COMPACT = new Intl.NumberFormat('tr-TR', {
  notation: 'compact',
  compactDisplay: 'long',
  maximumFractionDigits: 1,
})
const PLAIN = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })

/** Axis ticks: compact from 1.000 up (1 B, 2,5 Mn), plain below. */
export const formatTick = (n: number) => (Math.abs(n) >= 1000 ? COMPACT.format(n) : PLAIN.format(n))

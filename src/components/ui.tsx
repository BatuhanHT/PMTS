import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'
import type { Tag } from '../domain/types.ts'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-slate-500">{children}</div>
}

export function TagChip({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: `${tag.color}1f`, color: tag.color }}
    >
      {tag.name}
    </span>
  )
}

/** Toggle chips for choosing tags (item form, list filter). */
export function TagPicker({
  tags,
  selected,
  onChange,
}: {
  tags: Tag[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  if (tags.length === 0) return <p className="text-xs text-slate-500">Henüz etiket yok. Etiketler sayfasından ekleyin.</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const on = selected.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((id) => id !== tag.id) : [...selected, tag.id])}
            className="cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition"
            style={
              on
                ? { background: tag.color, borderColor: tag.color, color: '#fff' }
                : { background: '#fff', borderColor: '#cbd5e1', color: '#475569' }
            }
          >
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}

/** Budget meter: the fill carries severity; over budget also says so in words. */
export function BudgetBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-slate-500">Bütçe tanımsız</span>
  const over = pct > 100
  const color = over ? '#d03b3b' : pct >= 85 ? '#fab219' : '#2a78d6'
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full min-w-24 overflow-hidden rounded-full bg-blue-100">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className={`text-xs font-medium tabular-nums ${over ? 'text-red-600' : 'text-slate-600'}`}>
        {over ? '▲ Aşıldı ' : ''}%{Math.round(pct)}
      </span>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[8vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="card w-full max-w-lg p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button type="button" className="btn border-transparent px-2 py-0.5" aria-label="Kapat" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  )
}

export function FormActions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" className="btn" onClick={onCancel}>
        Vazgeç
      </button>
      <button type="submit" className="btn btn-primary">
        {submitLabel}
      </button>
    </div>
  )
}

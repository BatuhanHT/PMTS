import { UNITS } from './types.ts'
import type { AppData } from './types.ts'

export type ParseResult = { data: AppData; error: null } | { data: null; error: string }

const MOVEMENT_TYPES = ['in', 'out', 'adjust']
const PROJECT_STATUSES = ['planned', 'active', 'completed']

type Obj = Record<string, unknown>

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const LIST_KEYS = ['tags', 'items', 'prices', 'movements', 'projects'] as const

function bad(row: Obj, fields: Record<string, 'string' | 'number'>): string | null {
  for (const [key, type] of Object.entries(fields)) {
    const v = row[key]
    if (typeof v !== type || (type === 'number' && !Number.isFinite(v))) return key
  }
  return null
}

/** Validates untrusted JSON (import or corrupted storage) into AppData. */
export function parseAppData(raw: unknown): ParseResult {
  const fail = (error: string): ParseResult => ({ data: null, error })
  if (!isObj(raw)) return fail('Dosya geçerli bir veri nesnesi değil.')
  if (raw.version !== 1) return fail('Desteklenmeyen veri sürümü.')

  const lists = {} as Record<(typeof LIST_KEYS)[number], Obj[]>
  for (const key of LIST_KEYS) {
    const v = raw[key]
    if (!Array.isArray(v) || !v.every(isObj)) return fail(`"${key}" listesi eksik veya geçersiz.`)
    lists[key] = v
  }
  const { tags, items, prices, movements, projects } = lists

  const checks: [string, Obj[], Record<string, 'string' | 'number'>][] = [
    ['etiket', tags, { id: 'string', name: 'string', color: 'string' }],
    [
      'kalem',
      items,
      { id: 'string', assetCode: 'string', name: 'string', unit: 'string', vatRate: 'number', minStock: 'number' },
    ],
    ['fiyat', prices, { id: 'string', itemId: 'string', date: 'string', unitPrice: 'number', vatRate: 'number' }],
    [
      'hareket',
      movements,
      { id: 'string', itemId: 'string', type: 'string', date: 'string', delta: 'number', unitPrice: 'number' },
    ],
    ['proje', projects, { id: 'string', code: 'string', name: 'string', status: 'string', budget: 'number' }],
  ]
  for (const [label, rows, fields] of checks) {
    for (const row of rows) {
      const field = bad(row, fields)
      if (field) return fail(`Geçersiz ${label} kaydı ("${field}" alanı).`)
    }
  }

  const tagIds = new Set(tags.map((t) => t.id as string))
  const itemIds = new Set(items.map((i) => i.id as string))
  const projectIds = new Set(projects.map((p) => p.id as string))

  if (items.some((i) => !(UNITS as readonly string[]).includes(i.unit as string))) return fail('Geçersiz birim var.')
  if (prices.some((p) => !itemIds.has(p.itemId as string))) return fail('Var olmayan kaleme bağlı fiyat var.')
  if (movements.some((m) => !itemIds.has(m.itemId as string) || !MOVEMENT_TYPES.includes(m.type as string))) {
    return fail('Geçersiz stok hareketi var.')
  }
  if (movements.some((m) => m.projectId != null && !projectIds.has(m.projectId as string))) {
    return fail('Var olmayan projeye bağlı hareket var.')
  }
  if (projects.some((p) => !PROJECT_STATUSES.includes(p.status as string))) return fail('Geçersiz proje durumu var.')

  // Counters must stay ahead of every issued code so codes are never reused.
  const maxSuffix = (rows: Obj[], key: string) =>
    Math.max(0, ...rows.map((r) => Number(String(r[key]).match(/(\d+)$/)?.[1] ?? 0)))
  const nextAsset = Math.max(Number(raw.nextAssetNumber) || 1, maxSuffix(items, 'assetCode') + 1)
  const nextProject = Math.max(Number(raw.nextProjectNumber) || 1, maxSuffix(projects, 'code') + 1)

  const data: AppData = {
    version: 1,
    nextAssetNumber: nextAsset,
    nextProjectNumber: nextProject,
    tags: tags.map((t) => ({ id: t.id as string, name: t.name as string, color: t.color as string })),
    items: items.map((i) => ({
      id: i.id as string,
      assetCode: i.assetCode as string,
      name: i.name as string,
      unit: i.unit as AppData['items'][number]['unit'],
      vatRate: i.vatRate as number,
      minStock: i.minStock as number,
      description: typeof i.description === 'string' ? i.description : '',
      tagIds: Array.isArray(i.tagIds) ? i.tagIds.filter((id): id is string => typeof id === 'string' && tagIds.has(id)) : [],
      createdAt: typeof i.createdAt === 'string' ? i.createdAt : '',
    })),
    prices: prices.map((p) => ({
      id: p.id as string,
      itemId: p.itemId as string,
      date: p.date as string,
      unitPrice: p.unitPrice as number,
      vatRate: p.vatRate as number,
      supplier: typeof p.supplier === 'string' ? p.supplier : '',
    })),
    movements: movements.map((m) => ({
      id: m.id as string,
      itemId: m.itemId as string,
      type: m.type as AppData['movements'][number]['type'],
      date: m.date as string,
      delta: m.delta as number,
      unitPrice: m.unitPrice as number,
      projectId: typeof m.projectId === 'string' ? m.projectId : null,
      note: typeof m.note === 'string' ? m.note : '',
    })),
    projects: projects.map((p) => ({
      id: p.id as string,
      code: p.code as string,
      name: p.name as string,
      status: p.status as AppData['projects'][number]['status'],
      startDate: typeof p.startDate === 'string' ? p.startDate : '',
      endDate: typeof p.endDate === 'string' ? p.endDate : '',
      budget: p.budget as number,
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : '',
    })),
  }
  return { data, error: null }
}

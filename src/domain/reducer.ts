import { round, stockOf } from './calc.ts'
import { UNITS, VAT_RATES } from './types.ts'
import type {
  AppData,
  Item,
  MovementType,
  PriceEntry,
  Project,
  ProjectStatus,
  StockMovement,
  Tag,
  Unit,
} from './types.ts'

export interface ItemInput {
  name: string
  unit: Unit
  vatRate: number
  minStock: number
  description: string
  tagIds: string[]
}

export interface PriceInput {
  itemId: string
  date: string
  unitPrice: number
  vatRate: number
  supplier: string
}

export interface MovementInput {
  itemId: string
  type: MovementType
  date: string
  /** Positive for in/out, signed (non-zero) for adjust. */
  quantity: number
  unitPrice: number
  projectId: string | null
  note: string
}

export interface ProjectInput {
  name: string
  status: ProjectStatus
  startDate: string
  endDate: string
  budget: number
}

/** Ids and timestamps travel in the payload so the reducer stays pure. */
export type Action =
  | { type: 'tag/add'; id: string; name: string; color: string }
  | { type: 'tag/update'; id: string; name: string; color: string }
  | { type: 'tag/delete'; id: string }
  | { type: 'item/add'; id: string; createdAt: string; input: ItemInput }
  | { type: 'item/update'; id: string; input: ItemInput }
  | { type: 'item/delete'; id: string }
  | { type: 'price/add'; id: string; input: PriceInput }
  | { type: 'price/delete'; id: string }
  | { type: 'movement/add'; id: string; input: MovementInput }
  | { type: 'movement/delete'; id: string }
  | { type: 'project/add'; id: string; createdAt: string; input: ProjectInput }
  | { type: 'project/update'; id: string; input: ProjectInput }
  | { type: 'project/delete'; id: string }
  | { type: 'data/replace'; data: AppData }

export interface Result {
  data: AppData
  error: string | null
}

export function emptyData(): AppData {
  return {
    version: 1,
    nextAssetNumber: 1,
    nextProjectNumber: 1,
    tags: [],
    items: [],
    prices: [],
    movements: [],
    projects: [],
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function assetCode(n: number): string {
  return `PMTS-${String(n).padStart(4, '0')}`
}

export function projectCode(n: number): string {
  return `PRJ-${String(n).padStart(3, '0')}`
}

export function apply(data: AppData, action: Action): Result {
  const fail = (error: string): Result => ({ data, error })
  const ok = (next: AppData): Result => ({ data: next, error: null })

  switch (action.type) {
    case 'tag/add':
    case 'tag/update': {
      const name = action.name.trim()
      if (!name) return fail('Etiket adı boş olamaz.')
      const clash = data.tags.some(
        (t) => t.id !== action.id && t.name.toLowerCase() === name.toLowerCase(),
      )
      if (clash) return fail('Bu isimde bir etiket zaten var.')
      const tag: Tag = { id: action.id, name, color: action.color }
      if (action.type === 'tag/add') return ok({ ...data, tags: [...data.tags, tag] })
      if (!data.tags.some((t) => t.id === action.id)) return fail('Etiket bulunamadı.')
      return ok({ ...data, tags: data.tags.map((t) => (t.id === action.id ? tag : t)) })
    }

    case 'tag/delete':
      return ok({
        ...data,
        tags: data.tags.filter((t) => t.id !== action.id),
        items: data.items.map((i) => ({ ...i, tagIds: i.tagIds.filter((id) => id !== action.id) })),
      })

    case 'item/add':
    case 'item/update': {
      const { input } = action
      const error = validateItem(input)
      if (error) return fail(error)
      const tagIds = input.tagIds.filter((id) => data.tags.some((t) => t.id === id))
      if (action.type === 'item/add') {
        const item: Item = {
          id: action.id,
          assetCode: assetCode(data.nextAssetNumber),
          name: input.name.trim(),
          unit: input.unit,
          vatRate: input.vatRate,
          minStock: input.minStock,
          description: input.description.trim(),
          tagIds,
          createdAt: action.createdAt,
        }
        return ok({ ...data, nextAssetNumber: data.nextAssetNumber + 1, items: [...data.items, item] })
      }
      if (!data.items.some((i) => i.id === action.id)) return fail('Kalem bulunamadı.')
      return ok({
        ...data,
        items: data.items.map((i) =>
          i.id === action.id
            ? {
                ...i,
                name: input.name.trim(),
                unit: input.unit,
                vatRate: input.vatRate,
                minStock: input.minStock,
                description: input.description.trim(),
                tagIds,
              }
            : i,
        ),
      })
    }

    case 'item/delete':
      if (data.movements.some((m) => m.itemId === action.id)) {
        return fail('Stok hareketi olan kalem silinemez. Önce hareketlerini kaldırın.')
      }
      return ok({
        ...data,
        items: data.items.filter((i) => i.id !== action.id),
        prices: data.prices.filter((p) => p.itemId !== action.id),
      })

    case 'price/add': {
      const { input } = action
      if (!data.items.some((i) => i.id === input.itemId)) return fail('Kalem bulunamadı.')
      if (!DATE_RE.test(input.date)) return fail('Geçerli bir tarih girin.')
      if (!(input.unitPrice > 0) || !Number.isFinite(input.unitPrice)) {
        return fail('Birim fiyat sıfırdan büyük olmalı.')
      }
      if (!isVat(input.vatRate)) return fail('Geçersiz KDV oranı.')
      const entry: PriceEntry = {
        id: action.id,
        itemId: input.itemId,
        date: input.date,
        unitPrice: input.unitPrice,
        vatRate: input.vatRate,
        supplier: input.supplier.trim(),
      }
      return ok({ ...data, prices: [...data.prices, entry] })
    }

    case 'price/delete':
      return ok({ ...data, prices: data.prices.filter((p) => p.id !== action.id) })

    case 'movement/add': {
      const { input } = action
      const item = data.items.find((i) => i.id === input.itemId)
      if (!item) return fail('Kalem bulunamadı.')
      if (!DATE_RE.test(input.date)) return fail('Geçerli bir tarih girin.')
      const q = input.quantity
      if (!Number.isFinite(q)) return fail('Miktar geçerli bir sayı olmalı.')
      if (input.type === 'adjust' ? q === 0 : !(q > 0)) {
        return fail(input.type === 'adjust' ? 'Düzeltme miktarı sıfır olamaz.' : 'Miktar sıfırdan büyük olmalı.')
      }
      if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) return fail('Birim fiyat geçersiz.')
      let projectId: string | null = null
      if (input.type === 'out') {
        if (!input.projectId || !data.projects.some((p) => p.id === input.projectId)) {
          return fail('Çıkış için bir proje seçin.')
        }
        if (!(input.unitPrice > 0)) return fail('Çıkış için birim fiyat girin (kalemin önce fiyatı olmalı).')
        projectId = input.projectId
      }
      const delta = round(input.type === 'out' ? -q : q)
      const current = stockOf(item.id, data.movements)
      if (current + delta < 0) {
        return fail(`Yetersiz stok. Mevcut: ${current} ${item.unit}.`)
      }
      const movement: StockMovement = {
        id: action.id,
        itemId: item.id,
        type: input.type,
        date: input.date,
        delta,
        unitPrice: input.unitPrice,
        projectId,
        note: input.note.trim(),
      }
      return ok({ ...data, movements: [...data.movements, movement] })
    }

    case 'movement/delete': {
      const target = data.movements.find((m) => m.id === action.id)
      if (!target) return fail('Hareket bulunamadı.')
      const remaining = data.movements.filter((m) => m.id !== action.id)
      if (stockOf(target.itemId, remaining) < 0) {
        return fail('Bu hareket silinirse stok negatife düşer.')
      }
      return ok({ ...data, movements: remaining })
    }

    case 'project/add':
    case 'project/update': {
      const { input } = action
      const error = validateProject(input)
      if (error) return fail(error)
      if (action.type === 'project/add') {
        const project: Project = {
          id: action.id,
          code: projectCode(data.nextProjectNumber),
          name: input.name.trim(),
          status: input.status,
          startDate: input.startDate,
          endDate: input.endDate,
          budget: input.budget,
          createdAt: action.createdAt,
        }
        return ok({
          ...data,
          nextProjectNumber: data.nextProjectNumber + 1,
          projects: [...data.projects, project],
        })
      }
      if (!data.projects.some((p) => p.id === action.id)) return fail('Proje bulunamadı.')
      return ok({
        ...data,
        projects: data.projects.map((p) =>
          p.id === action.id ? { ...p, ...input, name: input.name.trim() } : p,
        ),
      })
    }

    case 'project/delete':
      if (data.movements.some((m) => m.projectId === action.id)) {
        return fail('Stok çıkışı olan proje silinemez. Önce çıkış hareketlerini kaldırın.')
      }
      return ok({ ...data, projects: data.projects.filter((p) => p.id !== action.id) })

    case 'data/replace':
      return ok(action.data)
  }
}

function isVat(rate: number): boolean {
  return (VAT_RATES as readonly number[]).includes(rate)
}

function validateItem(input: ItemInput): string | null {
  if (!input.name.trim()) return 'Kalem adı boş olamaz.'
  if (!(UNITS as readonly string[]).includes(input.unit)) return 'Geçersiz birim.'
  if (!isVat(input.vatRate)) return 'Geçersiz KDV oranı.'
  if (!Number.isFinite(input.minStock) || input.minStock < 0) return 'Minimum stok sıfırdan küçük olamaz.'
  return null
}

function validateProject(input: ProjectInput): string | null {
  if (!input.name.trim()) return 'Proje adı boş olamaz.'
  if (!Number.isFinite(input.budget) || input.budget < 0) return 'Bütçe sıfırdan küçük olamaz.'
  for (const d of [input.startDate, input.endDate]) {
    if (d && !DATE_RE.test(d)) return 'Geçersiz tarih.'
  }
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    return 'Bitiş tarihi başlangıçtan önce olamaz.'
  }
  return null
}

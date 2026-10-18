import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  budgetUsage,
  isLowStock,
  latestPrice,
  priceHistory,
  priceStats,
  projectCost,
  stockOf,
  stockValue,
  topPriceRises,
} from './calc.ts'
import { parseAppData } from './parse.ts'
import { apply, emptyData } from './reducer.ts'
import type { Action, ItemInput, MovementInput } from './reducer.ts'
import { seedData } from './seed.ts'
import type { AppData } from './types.ts'

const itemInput: ItemInput = {
  name: 'Test kalemi',
  unit: 'adet',
  vatRate: 20,
  minStock: 0,
  description: '',
  tagIds: [],
}

/** Applies actions in order and fails the test if any of them is rejected. */
function run(start: AppData, ...actions: Action[]): AppData {
  return actions.reduce((data, action) => {
    const result = apply(data, action)
    assert.equal(result.error, null, `${action.type}: ${result.error}`)
    return result.data
  }, start)
}

const move = (over: Partial<MovementInput>): MovementInput => ({
  itemId: 'item-1',
  type: 'in',
  date: '2026-10-01',
  quantity: 1,
  unitPrice: 10,
  projectId: null,
  note: '',
  ...over,
})

describe('seed data', () => {
  const data = seedData()

  it('has no negative stock and passes import validation', () => {
    for (const item of data.items) assert.ok(stockOf(item.id, data.movements) >= 0, item.name)
    const parsed = parseAppData(JSON.parse(JSON.stringify(data)))
    assert.equal(parsed.error, null)
  })

  it('computes project costs from snapshot prices', () => {
    assert.equal(projectCost('project-p1', data.movements), 330440)
    assert.equal(projectCost('project-p2', data.movements), 323690)
    assert.equal(projectCost('project-p3', data.movements), 0)
    assert.equal(budgetUsage(data.projects[0], data.movements).over, false)
  })

  it('flags low stock and top price rises', () => {
    const low = data.items.filter((i) => isLowStock(i, data.movements)).map((i) => i.id)
    assert.deepEqual(low.sort(), ['item-4', 'item-6'])
    const rises = topPriceRises(data, 3)
    assert.deepEqual(rises.map((r) => r.item.id), ['item-10', 'item-1', 'item-4'])
    assert.ok(rises.every((r) => r.changePct > 0))
    assert.ok(stockValue(data) > 0)
  })
})

describe('price history', () => {
  it('picks the latest price by date, not by insertion order', () => {
    const data = run(
      { ...emptyData(), items: seedData().items.slice(0, 1) },
      { type: 'price/add', id: 'a', input: { itemId: 'item-1', date: '2026-05-01', unitPrice: 100, vatRate: 20, supplier: '' } },
      { type: 'price/add', id: 'b', input: { itemId: 'item-1', date: '2026-01-01', unitPrice: 80, vatRate: 20, supplier: '' } },
    )
    assert.equal(latestPrice('item-1', data.prices)?.unitPrice, 100)
    assert.deepEqual(priceHistory('item-1', data.prices).map((p) => p.id), ['b', 'a'])
  })

  it('computes stats and yields no change % for a single entry', () => {
    const single = priceStats([{ id: 'x', itemId: 'i', date: '2026-01-01', unitPrice: 50, vatRate: 20, supplier: '' }])
    assert.equal(single?.changePct, null)
    const data = seedData()
    const stats = priceStats(priceHistory('item-1', data.prices))
    assert.equal(stats?.latest, 228)
    assert.equal(stats?.previous, 205)
    assert.ok(Math.abs((stats?.changePct ?? 0) - 11.219512) < 1e-4)
    assert.equal(stats?.min, 185)
    assert.equal(stats?.max, 228)
  })

  it('rejects non-positive prices', () => {
    const base = { ...emptyData(), items: seedData().items.slice(0, 1) }
    const result = apply(base, {
      type: 'price/add',
      id: 'p',
      input: { itemId: 'item-1', date: '2026-01-01', unitPrice: 0, vatRate: 20, supplier: '' },
    })
    assert.ok(result.error)
  })
})

describe('stock movements', () => {
  const withItem = () => run(emptyData(), { type: 'item/add', id: 'item-1', createdAt: '2026-01-01', input: itemInput })

  it('blocks negative stock and requires project + price for stock-out', () => {
    const data = run(withItem(), { type: 'movement/add', id: 'm1', input: move({ quantity: 5 }) })
    assert.ok(apply(data, { type: 'movement/add', id: 'm2', input: move({ type: 'out', quantity: 6, projectId: 'x' }) }).error)
    const noProject = apply(data, { type: 'movement/add', id: 'm2', input: move({ type: 'out', quantity: 1 }) })
    assert.match(noProject.error ?? '', /proje/i)
    assert.ok(apply(data, { type: 'movement/add', id: 'm3', input: move({ type: 'adjust', quantity: -6 }) }).error)
  })

  it('keeps project cost fixed when the item price changes later', () => {
    let data = run(
      withItem(),
      { type: 'project/add', id: 'p1', createdAt: '2026-01-01', input: { name: 'P', status: 'active', startDate: '', endDate: '', budget: 1000 } },
      { type: 'movement/add', id: 'm1', input: move({ quantity: 10, unitPrice: 50 }) },
      { type: 'movement/add', id: 'm2', input: move({ type: 'out', quantity: 4, unitPrice: 50, projectId: 'p1' }) },
    )
    assert.equal(projectCost('p1', data.movements), 200)
    data = run(data, {
      type: 'price/add',
      id: 'pr',
      input: { itemId: 'item-1', date: '2026-10-10', unitPrice: 999, vatRate: 20, supplier: '' },
    })
    assert.equal(projectCost('p1', data.movements), 200)
    assert.equal(budgetUsage(data.projects[0], data.movements).remaining, 800)
  })

  it('sums fractional quantities without float noise', () => {
    const data = run(
      withItem(),
      { type: 'movement/add', id: 'm1', input: move({ quantity: 0.1 }) },
      { type: 'movement/add', id: 'm2', input: move({ quantity: 0.2 }) },
    )
    assert.equal(stockOf('item-1', data.movements), 0.3)
  })

  it('refuses to delete a movement that would make stock negative', () => {
    const data = run(
      withItem(),
      { type: 'project/add', id: 'p1', createdAt: '2026-01-01', input: { name: 'P', status: 'active', startDate: '', endDate: '', budget: 0 } },
      { type: 'movement/add', id: 'in1', input: move({ quantity: 5 }) },
      { type: 'movement/add', id: 'out1', input: move({ type: 'out', quantity: 5, unitPrice: 1, projectId: 'p1' }) },
    )
    assert.ok(apply(data, { type: 'movement/delete', id: 'in1' }).error)
    assert.equal(apply(data, { type: 'movement/delete', id: 'out1' }).error, null)
  })
})

describe('referential rules and codes', () => {
  it('never reuses asset codes, even after a delete', () => {
    let data = run(emptyData(), { type: 'item/add', id: 'a', createdAt: '2026-01-01', input: itemInput })
    assert.equal(data.items[0].assetCode, 'PMTS-0001')
    data = run(data, { type: 'item/delete', id: 'a' }, { type: 'item/add', id: 'b', createdAt: '2026-01-01', input: itemInput })
    assert.equal(data.items[0].assetCode, 'PMTS-0002')
  })

  it('blocks deleting items and projects that have movements', () => {
    const data = run(
      emptyData(),
      { type: 'item/add', id: 'item-1', createdAt: '2026-01-01', input: itemInput },
      { type: 'project/add', id: 'p1', createdAt: '2026-01-01', input: { name: 'P', status: 'active', startDate: '', endDate: '', budget: 0 } },
      { type: 'movement/add', id: 'in1', input: move({ quantity: 5 }) },
      { type: 'movement/add', id: 'out1', input: move({ type: 'out', quantity: 1, unitPrice: 1, projectId: 'p1' }) },
    )
    assert.ok(apply(data, { type: 'item/delete', id: 'item-1' }).error)
    assert.ok(apply(data, { type: 'project/delete', id: 'p1' }).error)
  })

  it('removes a deleted tag from items and rejects duplicate tag names', () => {
    let data = run(emptyData(), { type: 'tag/add', id: 't1', name: 'Elektrik', color: '#000' })
    assert.ok(apply(data, { type: 'tag/add', id: 't2', name: 'elektrik', color: '#111' }).error)
    data = run(
      data,
      { type: 'item/add', id: 'a', createdAt: '2026-01-01', input: { ...itemInput, tagIds: ['t1'] } },
      { type: 'tag/delete', id: 't1' },
    )
    assert.deepEqual(data.items[0].tagIds, [])
  })
})

describe('import validation', () => {
  it('rejects dangling references and unknown versions', () => {
    const data = seedData()
    const dangling = { ...data, movements: [{ ...data.movements[0], itemId: 'ghost' }] }
    assert.ok(parseAppData(dangling).error)
    assert.ok(parseAppData({ ...data, version: 2 }).error)
    assert.ok(parseAppData('nope').error)
    assert.ok(parseAppData({ version: 1 }).error)
  })

  it('moves counters past existing codes so they are never reissued', () => {
    const data = { ...seedData(), nextAssetNumber: 1, nextProjectNumber: 1 }
    const parsed = parseAppData(data)
    assert.equal(parsed.data?.nextAssetNumber, 11)
    assert.equal(parsed.data?.nextProjectNumber, 4)
  })
})

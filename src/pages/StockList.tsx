import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ItemFormModal, MovementFormModal } from '../components/forms.tsx'
import { EmptyState, PageHeader, TagChip, TagPicker } from '../components/ui.tsx'
import { useStore } from '../data/store-context.ts'
import { isLowStock, latestPrice, priceHistory, priceStats, roundMoney, stockOf } from '../domain/calc.ts'
import { formatMoney, formatPct, formatQty } from '../lib/format.ts'

export function StockList() {
  const { data } = useStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [moving, setMoving] = useState(false)

  const q = query.trim().toLocaleLowerCase('tr')
  const tagName = (id: string) => data.tags.find((t) => t.id === id)?.name ?? ''
  const items = data.items
    .filter((i) => tagFilter.every((t) => i.tagIds.includes(t)))
    .filter(
      (i) =>
        !q ||
        [i.name, i.assetCode, i.description, ...i.tagIds.map(tagName)].some((s) =>
          s.toLocaleLowerCase('tr').includes(q),
        ),
    )
    .sort((a, b) => a.assetCode.localeCompare(b.assetCode))

  return (
    <>
      <PageHeader
        title="Stok"
        subtitle="Ana stok kataloğu. Fiyatlar KDV hariçtir."
        actions={
          <>
            <button className="btn" onClick={() => setMoving(true)}>
              Stok hareketi
            </button>
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              + Yeni kalem
            </button>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <input
          className="input max-w-sm"
          type="search"
          placeholder="Kalem, varlık kodu veya etiket ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {data.tags.length > 0 && <TagPicker tags={data.tags} selected={tagFilter} onChange={setTagFilter} />}
      </div>

      <div className="card overflow-x-auto">
        {items.length === 0 ? (
          <EmptyState>
            {data.items.length === 0 ? 'Henüz stok kalemi yok. İlk kalemi ekleyin.' : 'Aramayla eşleşen kalem yok.'}
          </EmptyState>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="th">Varlık kodu</th>
                <th className="th">Kalem</th>
                <th className="th">Etiketler</th>
                <th className="th num">Mevcut</th>
                <th className="th num">Son fiyat</th>
                <th className="th num">Stok değeri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const stock = stockOf(item.id, data.movements)
                const stats = priceStats(priceHistory(item.id, data.prices))
                const low = isLowStock(item, data.movements)
                const price = latestPrice(item.id, data.prices)
                return (
                  <tr
                    key={item.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/stok/${item.id}`)}
                  >
                    <td className="td font-mono text-xs text-slate-500">{item.assetCode}</td>
                    <td className="td">
                      <Link
                        to={`/stok/${item.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {item.tagIds.map((id) => {
                          const tag = data.tags.find((t) => t.id === id)
                          return tag && <TagChip key={id} tag={tag} />
                        })}
                      </div>
                    </td>
                    <td className={`td num ${low ? 'font-medium text-red-600' : ''}`}>
                      {low && '▼ '}
                      {formatQty(stock)} {item.unit}
                    </td>
                    <td className="td num">
                      {price ? (
                        <>
                          {formatMoney(price.unitPrice)}
                          <span className="ml-1.5 text-xs text-slate-500">{formatPct(stats?.changePct ?? null)}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="td num">{price ? formatMoney(roundMoney(stock * price.unitPrice)) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {adding && <ItemFormModal onClose={() => setAdding(false)} onSaved={(id) => navigate(`/stok/${id}`)} />}
      {moving && <MovementFormModal onClose={() => setMoving(false)} />}
    </>
  )
}

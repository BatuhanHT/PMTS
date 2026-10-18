import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { PriceChart } from '../components/charts/PriceChart.tsx'
import { ItemFormModal, MovementFormModal, PriceFormModal } from '../components/forms.tsx'
import { EmptyState, PageHeader, StatCard, TagChip } from '../components/ui.tsx'
import { useStore } from '../data/store-context.ts'
import { isLowStock, movementCost, priceHistory, priceStats, roundMoney, stockOf } from '../domain/calc.ts'
import type { MovementType } from '../domain/types.ts'
import { formatDate, formatMoney, formatPct, formatQty } from '../lib/format.ts'
import { MOVEMENT_LABEL } from '../lib/labels.ts'

export function StockDetail() {
  const { id } = useParams()
  const { data, dispatch } = useStore()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [addingPrice, setAddingPrice] = useState(false)
  const [movement, setMovement] = useState<MovementType | null>(null)

  const item = data.items.find((i) => i.id === id)
  if (!item) return <Navigate to="/stok" replace />

  const stock = stockOf(item.id, data.movements)
  const low = isLowStock(item, data.movements)
  const history = priceHistory(item.id, data.prices)
  const stats = priceStats(history)
  const moves = data.movements
    .filter((m) => m.itemId === item.id)
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.date.localeCompare(a.m.date) || b.i - a.i)
    .map(({ m }) => m)

  const withVat = (price: number, rate: number) => roundMoney(price * (1 + rate / 100))
  const lastVat = history.at(-1)?.vatRate ?? item.vatRate

  function remove() {
    if (!window.confirm(`"${item!.name}" silinsin mi? Fiyat geçmişi de silinir.`)) return
    const err = dispatch({ type: 'item/delete', id: item!.id })
    if (err) window.alert(err)
    else navigate('/stok')
  }

  function removeEntry(action: Parameters<typeof dispatch>[0], question: string) {
    if (!window.confirm(question)) return
    const err = dispatch(action)
    if (err) window.alert(err)
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {item.name}
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-normal text-slate-600">
              {item.assetCode}
            </span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <Link to="/stok" className="text-blue-600 hover:underline">
              ← Stok
            </Link>
            {item.tagIds.map((tid) => {
              const tag = data.tags.find((t) => t.id === tid)
              return tag && <TagChip key={tid} tag={tag} />
            })}
            {item.description && <span>· {item.description}</span>}
          </span>
        }
        actions={
          <>
            <button className="btn" onClick={() => setEditing(true)}>
              Düzenle
            </button>
            <button className="btn btn-danger" onClick={remove}>
              Sil
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Mevcut stok"
          value={
            <span className={low ? 'text-red-600' : ''}>
              {low && '▼ '}
              {formatQty(stock)} {item.unit}
            </span>
          }
          hint={item.minStock > 0 ? `Minimum ${formatQty(item.minStock)} ${item.unit}` : 'Minimum stok tanımsız'}
        />
        <StatCard
          label="Son birim fiyat (KDV hariç)"
          value={stats ? formatMoney(stats.latest) : '—'}
          hint={stats ? `KDV dahil ${formatMoney(withVat(stats.latest, lastVat))} (%${lastVat})` : 'Fiyat kaydı yok'}
        />
        <StatCard
          label="Önceki fiyata göre"
          value={formatPct(stats?.changePct ?? null)}
          hint={stats?.previous != null ? `Önceki: ${formatMoney(stats.previous)}` : 'Karşılaştırılacak kayıt yok'}
        />
        <StatCard
          label="Ortalama fiyat"
          value={stats ? formatMoney(stats.average) : '—'}
          hint={stats ? `En düşük ${formatMoney(stats.min)} · en yüksek ${formatMoney(stats.max)}` : undefined}
        />
      </div>

      <section className="card mb-6 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Birim fiyat geçmişi</h2>
          <button className="btn btn-primary" onClick={() => setAddingPrice(true)}>
            + Fiyat ekle
          </button>
        </div>
        <PriceChart
          points={history.map((p) => ({ date: p.date, t: Date.parse(p.date), price: p.unitPrice }))}
        />
        {history.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full">
              <thead className="border-y border-slate-200">
                <tr>
                  <th className="th">Tarih</th>
                  <th className="th num">Birim fiyat (KDV hariç)</th>
                  <th className="th num">KDV</th>
                  <th className="th num">KDV dahil</th>
                  <th className="th">Tedarikçi</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...history].reverse().map((p) => (
                  <tr key={p.id}>
                    <td className="td">{formatDate(p.date)}</td>
                    <td className="td num">{formatMoney(p.unitPrice)}</td>
                    <td className="td num">%{p.vatRate}</td>
                    <td className="td num">{formatMoney(withVat(p.unitPrice, p.vatRate))}</td>
                    <td className="td text-slate-600">{p.supplier || '—'}</td>
                    <td className="td text-right">
                      <button
                        className="text-xs text-slate-500 hover:text-red-600"
                        onClick={() => removeEntry({ type: 'price/delete', id: p.id }, 'Bu fiyat kaydı silinsin mi?')}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3">
          <h2 className="text-sm font-semibold text-slate-900">Stok hareketleri</h2>
          <div className="flex gap-2">
            <button className="btn" onClick={() => setMovement('in')}>
              + Stok girişi
            </button>
            <button className="btn" onClick={() => setMovement('out')}>
              Projeye çıkış
            </button>
            <button className="btn" onClick={() => setMovement('adjust')}>
              Düzeltme
            </button>
          </div>
        </div>
        {moves.length === 0 ? (
          <EmptyState>Bu kalem için hareket yok.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-y border-slate-200">
                <tr>
                  <th className="th">Tarih</th>
                  <th className="th">Tip</th>
                  <th className="th num">Miktar</th>
                  <th className="th num">Birim fiyat</th>
                  <th className="th num">Maliyet</th>
                  <th className="th">Proje / not</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {moves.map((m) => {
                  const project = data.projects.find((p) => p.id === m.projectId)
                  return (
                    <tr key={m.id}>
                      <td className="td">{formatDate(m.date)}</td>
                      <td className="td">{MOVEMENT_LABEL[m.type]}</td>
                      <td className="td num">
                        {m.delta > 0 ? '+' : ''}
                        {formatQty(m.delta)} {item.unit}
                      </td>
                      <td className="td num">{m.type === 'adjust' ? '—' : formatMoney(m.unitPrice)}</td>
                      <td className="td num">{m.type === 'out' ? formatMoney(movementCost(m)) : '—'}</td>
                      <td className="td text-slate-600">
                        {project && (
                          <Link to={`/projeler/${project.id}`} className="text-blue-600 hover:underline">
                            {project.name}
                          </Link>
                        )}
                        {project && m.note && ' · '}
                        {m.note}
                      </td>
                      <td className="td text-right">
                        <button
                          className="text-xs text-slate-500 hover:text-red-600"
                          onClick={() =>
                            removeEntry({ type: 'movement/delete', id: m.id }, 'Bu stok hareketi silinsin mi?')
                          }
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && <ItemFormModal item={item} onClose={() => setEditing(false)} />}
      {addingPrice && <PriceFormModal item={item} onClose={() => setAddingPrice(false)} />}
      {movement && <MovementFormModal itemId={item.id} type={movement} onClose={() => setMovement(null)} />}
    </>
  )
}

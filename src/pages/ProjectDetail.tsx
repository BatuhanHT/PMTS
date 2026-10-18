import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { MovementFormModal, ProjectFormModal } from '../components/forms.tsx'
import { BudgetBar, EmptyState, PageHeader, StatCard } from '../components/ui.tsx'
import { useStore } from '../data/store-context.ts'
import { budgetUsage, movementCost, roundMoney } from '../domain/calc.ts'
import { formatDate, formatMoney, formatQty } from '../lib/format.ts'
import { STATUS_LABEL, STATUS_STYLE } from '../lib/labels.ts'

export function ProjectDetail() {
  const { id } = useParams()
  const { data, dispatch } = useStore()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)

  const project = data.projects.find((p) => p.id === id)
  if (!project) return <Navigate to="/projeler" replace />

  const usage = budgetUsage(project, data.movements)
  const outs = data.movements
    .filter((m) => m.projectId === project.id && m.type === 'out')
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.date.localeCompare(a.m.date) || b.i - a.i)
    .map(({ m }) => m)

  // Cost per item, from the snapshot prices on each movement.
  const byItem = new Map<string, { quantity: number; cost: number }>()
  for (const m of outs) {
    const row = byItem.get(m.itemId) ?? { quantity: 0, cost: 0 }
    row.quantity += -m.delta
    row.cost = roundMoney(row.cost + movementCost(m))
    byItem.set(m.itemId, row)
  }
  const breakdown = [...byItem.entries()]
    .map(([itemId, row]) => ({ item: data.items.find((i) => i.id === itemId), ...row }))
    .sort((a, b) => b.cost - a.cost)

  function remove() {
    if (!window.confirm(`"${project!.name}" silinsin mi?`)) return
    const err = dispatch({ type: 'project/delete', id: project!.id })
    if (err) window.alert(err)
    else navigate('/projeler')
  }

  function removeMovement(movementId: string) {
    if (!window.confirm('Bu çıkış hareketi silinsin mi? Kalem stoğa geri eklenir.')) return
    const err = dispatch({ type: 'movement/delete', id: movementId })
    if (err) window.alert(err)
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {project.name}
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-normal text-slate-600">
              {project.code}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[project.status]}`}>
              {STATUS_LABEL[project.status]}
            </span>
          </span>
        }
        subtitle={
          <>
            <Link to="/projeler" className="text-blue-600 hover:underline">
              ← Projeler
            </Link>
            {(project.startDate || project.endDate) &&
              ` · ${formatDate(project.startDate)} – ${formatDate(project.endDate)}`}
          </>
        }
        actions={
          <>
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              + Stoktan çıkış ekle
            </button>
            <button className="btn" onClick={() => setEditing(true)}>
              Düzenle
            </button>
            <button className="btn btn-danger" onClick={remove}>
              Sil
            </button>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Toplam bütçe" value={formatMoney(project.budget)} hint="KDV hariç" />
        <StatCard label="Gerçekleşen maliyet" value={formatMoney(usage.spent)} hint="Çıkış anındaki fiyatlarla" />
        <StatCard
          label={usage.over ? 'Bütçe aşımı' : 'Kalan bütçe'}
          value={<span className={usage.over ? 'text-red-600' : ''}>{formatMoney(Math.abs(usage.remaining))}</span>}
        />
      </div>
      <div className="card mb-6 px-4 py-3">
        <BudgetBar pct={usage.pct} />
      </div>

      <section className="card mb-6 overflow-hidden">
        <h2 className="p-4 pb-3 text-sm font-semibold text-slate-900">Kalem bazında maliyet</h2>
        {breakdown.length === 0 ? (
          <EmptyState>Bu projeye henüz stok çıkışı yapılmadı.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-y border-slate-200">
                <tr>
                  <th className="th">Kalem</th>
                  <th className="th num">Miktar</th>
                  <th className="th num">Ort. birim fiyat</th>
                  <th className="th num">Maliyet</th>
                  <th className="th num">Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdown.map(({ item, quantity, cost }) => (
                  <tr key={item?.id}>
                    <td className="td">
                      {item ? (
                        <Link to={`/stok/${item.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                          {item.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="td num">
                      {formatQty(quantity)} {item?.unit}
                    </td>
                    <td className="td num">{formatMoney(quantity > 0 ? cost / quantity : 0)}</td>
                    <td className="td num font-medium">{formatMoney(cost)}</td>
                    <td className="td num text-slate-500">
                      {usage.spent > 0 ? `%${Math.round((cost / usage.spent) * 100)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="p-4 pb-3 text-sm font-semibold text-slate-900">Çıkış hareketleri</h2>
        {outs.length === 0 ? (
          <EmptyState>Hareket yok.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-y border-slate-200">
                <tr>
                  <th className="th">Tarih</th>
                  <th className="th">Kalem</th>
                  <th className="th num">Miktar</th>
                  <th className="th num">Sabit birim fiyat</th>
                  <th className="th num">Maliyet</th>
                  <th className="th">Not</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outs.map((m) => {
                  const item = data.items.find((i) => i.id === m.itemId)
                  return (
                    <tr key={m.id}>
                      <td className="td">{formatDate(m.date)}</td>
                      <td className="td">
                        {item && (
                          <Link to={`/stok/${item.id}`} className="text-slate-900 hover:text-blue-600">
                            {item.name}
                          </Link>
                        )}
                      </td>
                      <td className="td num">
                        {formatQty(-m.delta)} {item?.unit}
                      </td>
                      <td className="td num">{formatMoney(m.unitPrice)}</td>
                      <td className="td num font-medium">{formatMoney(movementCost(m))}</td>
                      <td className="td text-slate-600">{m.note}</td>
                      <td className="td text-right">
                        <button className="text-xs text-slate-500 hover:text-red-600" onClick={() => removeMovement(m.id)}>
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

      {editing && <ProjectFormModal project={project} onClose={() => setEditing(false)} />}
      {adding && <MovementFormModal type="out" projectId={project.id} onClose={() => setAdding(false)} />}
    </>
  )
}

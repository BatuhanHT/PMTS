import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ProjectFormModal } from '../components/forms.tsx'
import { BudgetBar, EmptyState, PageHeader } from '../components/ui.tsx'
import { useStore } from '../data/store-context.ts'
import { budgetUsage } from '../domain/calc.ts'
import { formatDate, formatMoney } from '../lib/format.ts'
import { STATUS_LABEL, STATUS_STYLE } from '../lib/labels.ts'

export function Projects() {
  const { data } = useStore()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)

  return (
    <>
      <PageHeader
        title="Projeler"
        subtitle="Bütçe ve gerçekleşen maliyet, stoktan projeye yapılan çıkışlardan hesaplanır (KDV hariç)."
        actions={
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            + Yeni proje
          </button>
        }
      />

      <div className="card overflow-x-auto">
        {data.projects.length === 0 ? (
          <EmptyState>Henüz proje yok.</EmptyState>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="th">Kod</th>
                <th className="th">Proje</th>
                <th className="th">Durum</th>
                <th className="th">Tarih aralığı</th>
                <th className="th num">Bütçe</th>
                <th className="th num">Gerçekleşen</th>
                <th className="th w-44">Kullanım</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.projects.map((p) => {
                const usage = budgetUsage(p, data.movements)
                return (
                  <tr key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/projeler/${p.id}`)}>
                    <td className="td font-mono text-xs text-slate-500">{p.code}</td>
                    <td className="td">
                      <Link
                        to={`/projeler/${p.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="td">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="td text-slate-600">
                      {p.startDate || p.endDate ? `${formatDate(p.startDate)} – ${formatDate(p.endDate)}` : '—'}
                    </td>
                    <td className="td num">{formatMoney(p.budget)}</td>
                    <td className="td num">{formatMoney(usage.spent)}</td>
                    <td className="td">
                      <BudgetBar pct={usage.pct} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {adding && <ProjectFormModal onClose={() => setAdding(false)} onSaved={(id) => navigate(`/projeler/${id}`)} />}
    </>
  )
}

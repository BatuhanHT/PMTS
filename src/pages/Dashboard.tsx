import { Link } from 'react-router'
import { BudgetChart } from '../components/charts/BudgetChart.tsx'
import { BudgetBar, EmptyState, PageHeader, StatCard } from '../components/ui.tsx'
import { useStore } from '../data/store-context.ts'
import { budgetUsage, isLowStock, projectCost, stockOf, stockValue, topPriceRises } from '../domain/calc.ts'
import { formatMoney, formatPct, formatQty } from '../lib/format.ts'

export function Dashboard() {
  const { data } = useStore()
  const lowStock = data.items.filter((i) => isLowStock(i, data.movements))
  const rises = topPriceRises(data, 5)
  const rows = data.projects.map((p) => ({ project: p, ...budgetUsage(p, data.movements) }))
  const totalBudget = data.projects.reduce((sum, p) => sum + p.budget, 0)
  const totalSpent = data.projects.reduce((sum, p) => sum + projectCost(p.id, data.movements), 0)
  const activeCount = data.projects.filter((p) => p.status === 'active').length

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Tüm tutarlar KDV hariçtir." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Toplam stok değeri" value={formatMoney(stockValue(data))} hint="Son birim fiyat × mevcut miktar" />
        <StatCard
          label="Stok kalemi"
          value={data.items.length}
          hint={lowStock.length > 0 ? `${lowStock.length} kalem minimum stok altında` : 'Tümü yeterli stokta'}
        />
        <StatCard label="Devam eden proje" value={activeCount} hint={`Toplam ${data.projects.length} proje`} />
        <StatCard
          label="Gerçekleşen maliyet"
          value={formatMoney(totalSpent)}
          hint={`Toplam bütçe ${formatMoney(totalBudget)}`}
        />
      </div>

      <section className="card mb-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Proje bütçesi ve gerçekleşen maliyet</h2>
        {rows.length === 0 ? (
          <EmptyState>
            Henüz proje yok. <Link to="/projeler" className="text-blue-600 hover:underline">Projeler</Link> sayfasından ekleyin.
          </EmptyState>
        ) : (
          <>
            <BudgetChart
              rows={rows.map((r) => ({ name: r.project.name, budget: r.project.budget, spent: r.spent }))}
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="th">Proje</th>
                    <th className="th num">Bütçe</th>
                    <th className="th num">Gerçekleşen</th>
                    <th className="th num">Kalan</th>
                    <th className="th w-44">Kullanım</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ project, spent, remaining, pct }) => (
                    <tr key={project.id}>
                      <td className="td">
                        <Link to={`/projeler/${project.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                          {project.name}
                        </Link>
                      </td>
                      <td className="td num">{formatMoney(project.budget)}</td>
                      <td className="td num">{formatMoney(spent)}</td>
                      <td className={`td num ${remaining < 0 ? 'font-medium text-red-600' : ''}`}>
                        {formatMoney(remaining)}
                      </td>
                      <td className="td">
                        <BudgetBar pct={pct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="px-4 pt-4 text-sm font-semibold text-slate-900">Fiyatı en çok artan kalemler</h2>
          <p className="px-4 pb-2 text-xs text-slate-500">Son fiyat, bir önceki fiyat kaydına göre.</p>
          {rises.length === 0 ? (
            <EmptyState>Fiyat artışı yok.</EmptyState>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100 border-t border-slate-100">
                {rises.map((r) => (
                  <tr key={r.item.id}>
                    <td className="td">
                      <Link to={`/stok/${r.item.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {r.item.name}
                      </Link>
                    </td>
                    <td className="td num text-slate-500">
                      {formatMoney(r.previous)} → {formatMoney(r.latest)}
                    </td>
                    <td className="td num font-medium text-slate-900">{formatPct(r.changePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card overflow-hidden">
          <h2 className="px-4 pt-4 text-sm font-semibold text-slate-900">Minimum stok altındaki kalemler</h2>
          <p className="px-4 pb-2 text-xs text-slate-500">Mevcut miktar, kalemin minimum stok seviyesinin altında.</p>
          {lowStock.length === 0 ? (
            <EmptyState>Tüm kalemler yeterli stokta.</EmptyState>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100 border-t border-slate-100">
                {lowStock.map((item) => (
                  <tr key={item.id}>
                    <td className="td">
                      <Link to={`/stok/${item.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {item.name}
                      </Link>
                    </td>
                    <td className="td num font-medium text-red-600">
                      ▼ {formatQty(stockOf(item.id, data.movements))} {item.unit}
                    </td>
                    <td className="td num text-slate-500">
                      min. {formatQty(item.minStock)} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  )
}

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '../../lib/format.ts'
import { CHART, formatTick } from './theme.ts'

export interface BudgetRow {
  name: string
  budget: number
  spent: number
}

const BAR = 14 // thin marks: well under the 24px cap
const BAND = 2 * BAR + 2 + 28 // two bars + 2px gap + air between categories

function Legend() {
  return (
    <ul className="mb-2 flex gap-4 text-xs text-slate-600">
      {[
        ['Bütçe', CHART.series1],
        ['Gerçekleşen', CHART.series2],
      ].map(([label, color]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} />
          {label}
        </li>
      ))}
    </ul>
  )
}

interface TipProps {
  active?: boolean
  payload?: readonly { payload?: BudgetRow }[]
}

function Tip({ active, payload }: TipProps) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium text-slate-700">{row.name}</div>
      {[
        ['Bütçe', row.budget, CHART.series1],
        ['Gerçekleşen', row.spent, CHART.series2],
      ].map(([label, value, color]) => (
        <div key={label as string} className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-3" style={{ background: color as string }} />
          <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(value as number)}</span>
          <span className="text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  )
}

/** Horizontal grouped bars: budget vs actual per project. The table beside it is the text twin. */
export function BudgetChart({ rows }: { rows: BudgetRow[] }) {
  const height = rows.length * BAND + 40 // plot + x-axis band
  return (
    <div role="img" aria-label="Proje bazında bütçe ve gerçekleşen maliyet karşılaştırması">
      <Legend />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={rows}
          layout="vertical"
          barSize={BAR}
          barGap={2}
          margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis
            type="number"
            tickFormatter={formatTick}
            tick={{ fill: CHART.inkMuted, fontSize: 11 }}
            axisLine={{ stroke: CHART.baseline }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fill: CHART.inkSecondary, fontSize: 12 }}
            axisLine={{ stroke: CHART.baseline }}
            tickLine={false}
          />
          <Tooltip content={<Tip />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
          <Bar dataKey="budget" name="Bütçe" fill={CHART.series1} radius={[0, 4, 4, 0]} />
          <Bar dataKey="spent" name="Gerçekleşen" fill={CHART.series2} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

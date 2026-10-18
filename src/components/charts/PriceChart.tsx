import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate, formatMoney } from '../../lib/format.ts'
import { CHART, formatTick } from './theme.ts'

export interface PricePoint {
  /** ISO date, used as the label. */
  date: string
  /** Epoch ms of `date`: lets the x axis space points by real time. */
  t: number
  price: number
}

const toDate = (t: number) => formatDate(new Date(t).toISOString().slice(0, 10))

interface TipProps {
  active?: boolean
  payload?: readonly { payload?: PricePoint }[]
}

function Tip({ active, payload }: TipProps) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-1 text-slate-500">{formatDate(point.date)}</div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-0.5 w-3" style={{ background: CHART.series1 }} />
        <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(point.price)}</span>
        <span className="text-slate-500">KDV hariç</span>
      </div>
    </div>
  )
}

interface LabelProps {
  x?: number | string
  y?: number | string
  index?: number
  value?: unknown
}

/** Single series: only the latest value gets a direct label; axis + tooltip carry the rest. */
function endLabel(count: number) {
  return function EndLabel({ x, y, index, value }: LabelProps) {
    if (index !== count - 1 || x === undefined || y === undefined || typeof value !== 'number') return null
    return (
      <text x={Number(x)} y={Number(y) - 12} textAnchor="end" fontSize={12} fontWeight={600} fill={CHART.inkPrimary}>
        {formatMoney(value)}
      </text>
    )
  }
}

/** Unit price history of one item. The price table on the page is the text twin. */
export function PriceChart({ points }: { points: PricePoint[] }) {
  if (points.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Grafik için en az iki fiyat kaydı gerekir.
      </p>
    )
  }
  return (
    <div role="img" aria-label="Birim fiyat geçmişi grafiği (KDV hariç)">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={points} margin={{ top: 20, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            type="number"
            dataKey="t"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={toDate}
            tick={{ fill: CHART.inkMuted, fontSize: 11 }}
            axisLine={{ stroke: CHART.baseline }}
            tickLine={false}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            domain={['auto', 'auto']}
            width={56}
            tickFormatter={formatTick}
            tick={{ fill: CHART.inkMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<Tip />} cursor={{ stroke: CHART.baseline, strokeWidth: 1 }} />
          <Line
            type="linear"
            dataKey="price"
            stroke={CHART.series1}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={{ r: 4, fill: CHART.series1, stroke: CHART.surface, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: CHART.series1, stroke: CHART.surface, strokeWidth: 2 }}
            label={endLabel(points.length)}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

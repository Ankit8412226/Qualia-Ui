import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as RRadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartBar, Table } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber } from '@/lib/format';
import { Card, CardHeader } from '../components/Card';
import { useChartColors } from './useChartColors';

/*
 * Chart rules (dataviz skill): one y-axis, thin marks, 4px rounded bar ends, 2px lines,
 * recessive grid, legend for 2+ series, series colours in fixed order, hover tooltip on everything,
 * and a table view on every ChartCard.
 */

const axisTick = (c) => ({ fill: c.muted, fontSize: 11 });

function TooltipBox({ active, payload, label, valueFormatter = fmtNumber, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[140px] rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      {label != null && <div className="mb-1.5 font-semibold text-ink">{labelFormatter ? labelFormatter(label) : label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
            {p.name}
          </span>
          <span className="font-semibold tabular text-ink">{valueFormatter(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Legend shown under any chart with 2+ series. items = [{label, color}] */
export function ChartLegend({ items, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted', className)}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

const seriesColor = (c, s, i, single) => (s.color ? c[s.color] || s.color : single ? c.brand : c.series[i % 6]);

/**
 * Time series. series = [{key, label, color?}] (color may be a token name: 'brand', 'danger', 'series-3').
 * One series → filled area in the product colour. Several → lines with a legend.
 */
export function TrendChart({ data, xKey = 'date', series, height = 260, valueFormatter = fmtNumber, area, xFormatter, yDomain }) {
  const [ref, c] = useChartColors();
  const single = series.length === 1;
  const asArea = area ?? single;
  return (
    <div ref={ref} className="w-full">
      {c && (
        <ResponsiveContainer width="100%" height={height}>
          {asArea ? (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                {series.map((s, i) => (
                  <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={seriesColor(c, s, i, single)} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={seriesColor(c, s, i, single)} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke={c.line} strokeDasharray="3 4" />
              <XAxis dataKey={xKey} tick={axisTick(c)} tickLine={false} axisLine={false} tickFormatter={xFormatter} minTickGap={16} />
              <YAxis tick={axisTick(c)} tickLine={false} axisLine={false} tickFormatter={(v) => valueFormatter(v)} width={52} domain={yDomain} />
              <Tooltip content={<TooltipBox valueFormatter={valueFormatter} />} cursor={{ stroke: c.faint, strokeDasharray: '3 3' }} />
              {series.map((s, i) => (
                <Area isAnimationActive={false} key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={seriesColor(c, s, i, single)} strokeWidth={2} fill={`url(#g-${s.key})`} activeDot={{ r: 4, strokeWidth: 2, stroke: c.surface }} dot={false} />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={c.line} strokeDasharray="3 4" />
              <XAxis dataKey={xKey} tick={axisTick(c)} tickLine={false} axisLine={false} tickFormatter={xFormatter} minTickGap={16} />
              <YAxis tick={axisTick(c)} tickLine={false} axisLine={false} tickFormatter={(v) => valueFormatter(v)} width={52} domain={yDomain} />
              <Tooltip content={<TooltipBox valueFormatter={valueFormatter} />} cursor={{ stroke: c.faint, strokeDasharray: '3 3' }} />
              {series.map((s, i) => (
                <Line isAnimationActive={false} key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={seriesColor(c, s, i, single)} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: c.surface }} />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
      {!single && c && <ChartLegend className="mt-3" items={series.map((s, i) => ({ label: s.label, color: seriesColor(c, s, i, false) }))} />}
    </div>
  );
}

/** Bars. layout 'vertical' = horizontal bars (good for ranked names). stacked for part-to-whole over time. */
export function BarsChart({ data, xKey = 'name', series, height = 260, layout = 'horizontal', stacked, valueFormatter = fmtNumber, colorBy, categoryWidth = 110 }) {
  const [ref, c] = useChartColors();
  const single = series.length === 1;
  const vertical = layout === 'vertical';
  return (
    <div ref={ref} className="w-full">
      {c && (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 8, left: vertical ? 4 : -12, bottom: 0 }} barGap={2} barCategoryGap={vertical ? 6 : '28%'}>
            <CartesianGrid vertical={vertical} horizontal={!vertical} stroke={c.line} strokeDasharray="3 4" />
            {vertical ? (
              <>
                <XAxis type="number" tick={axisTick(c)} tickLine={false} axisLine={false} tickFormatter={(v) => valueFormatter(v)} />
                <YAxis type="category" dataKey={xKey} tick={axisTick(c)} tickLine={false} axisLine={false} width={categoryWidth} interval={0} />
              </>
            ) : (
              <>
                <XAxis dataKey={xKey} tick={axisTick(c)} tickLine={false} axisLine={false} minTickGap={8} />
                <YAxis tick={axisTick(c)} tickLine={false} axisLine={false} tickFormatter={(v) => valueFormatter(v)} width={52} />
              </>
            )}
            <Tooltip content={<TooltipBox valueFormatter={valueFormatter} />} cursor={{ fill: c['surface-3'], opacity: 0.6 }} />
            {series.map((s, i) => (
              <Bar isAnimationActive={false}
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId={stacked ? 'a' : undefined}
                fill={seriesColor(c, s, i, single)}
                radius={stacked ? (i === series.length - 1 ? (vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0) : vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={vertical ? 18 : 36}
                stroke={stacked ? c.surface : undefined}
                strokeWidth={stacked ? 2 : 0}
              >
                {colorBy && data.map((d) => <Cell key={d[xKey]} fill={c[colorBy(d)] || colorBy(d)} />)}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
      {!single && c && <ChartLegend className="mt-3" items={series.map((s, i) => ({ label: s.label, color: seriesColor(c, s, i, false) }))} />}
    </div>
  );
}

/** Part-to-whole with ≤6 parts. data = [{name, value, color?}]. Center shows total (or `centerLabel`). */
export function DonutChart({ data, height = 200, centerValue, centerLabel = 'Total', valueFormatter = fmtNumber, showLegend = true }) {
  const [ref, c] = useChartColors();
  const total = data.reduce((a, d) => a + d.value, 0);
  const color = (d, i) => (d.color ? c[d.color] || d.color : c.series[i % 6]);
  return (
    <div ref={ref} className="flex w-full flex-col items-center gap-4 sm:flex-row">
      {c && (
        <>
          <div className="relative shrink-0" style={{ width: height, height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={1.5} stroke={c.surface} strokeWidth={2} cornerRadius={4}>
                  {data.map((d, i) => (
                    <Cell key={d.name} fill={color(d, i)} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipBox valueFormatter={valueFormatter} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-bold tabular">{centerValue ?? valueFormatter(total)}</span>
              <span className="text-xs text-ink-muted">{centerLabel}</span>
            </div>
          </div>
          {showLegend && (
            <ul className="flex w-full min-w-0 flex-col gap-2">
              {data.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2 text-[13px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: color(d, i) }} />
                  <span className="min-w-0 flex-1 truncate text-ink-2">{d.name}</span>
                  <span className="font-semibold tabular text-ink">{valueFormatter(d.value)}</span>
                  <span className="w-11 text-right text-xs tabular text-ink-muted">{total ? Math.round((d.value / total) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** Compare several dimensions (QA parameters, before/after). series = [{key,label}] */
export function RadarChart({ data, angleKey = 'parameter', series, height = 280 }) {
  const [ref, c] = useChartColors();
  return (
    <div ref={ref} className="w-full">
      {c && (
        <>
          <ResponsiveContainer width="100%" height={height}>
            <RRadarChart data={data} outerRadius="72%">
              <PolarGrid stroke={c.line} />
              <PolarAngleAxis dataKey={angleKey} tick={{ fill: c.muted, fontSize: 11 }} />
              <Tooltip content={<TooltipBox />} />
              {series.map((s, i) => (
                <Radar isAnimationActive={false} key={s.key} dataKey={s.key} name={s.label} stroke={seriesColor(c, s, i, false)} fill={seriesColor(c, s, i, false)} fillOpacity={0.14} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </RRadarChart>
          </ResponsiveContainer>
          <ChartLegend className="justify-center" items={series.map((s, i) => ({ label: s.label, color: seriesColor(c, s, i, false) }))} />
        </>
      )}
    </div>
  );
}

/**
 * Card with title, chart, and a "table" toggle so every chart has a readable data view.
 * table = { columns: [{key, header, format?}], rows }
 */
export function ChartCard({ title, subtitle, icon, actions, table, children, className, bodyClassName }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        actions={
          <>
            {actions}
            {table && (
              <button
                type="button"
                onClick={() => setAsTable((v) => !v)}
                title={asTable ? 'Show chart' : 'Show as table'}
                aria-label={asTable ? 'Show chart' : 'Show as table'}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink"
              >
                {asTable ? <ChartBar size={16} /> : <Table size={16} />}
              </button>
            )}
          </>
        }
      />
      <div className={cn('min-h-0 flex-1', bodyClassName)}>
        {asTable && table ? (
          <div className="max-h-[320px] overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  {table.columns.map((col) => (
                    <th key={col.key} className="px-3 py-2 text-xs font-semibold text-ink-muted">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line/70">
                    {table.columns.map((col) => (
                      <td key={col.key} className="px-3 py-2 tabular text-ink-2">
                        {col.format ? col.format(r[col.key]) : r[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

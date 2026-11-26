import { Fragment } from 'react';
import { cn } from '@/lib/cn';
import { fmtNumber } from '@/lib/format';
import { Tooltip } from '../components/Overlay';

/*
 * Hand-built visuals that read better than a generic chart:
 * Heatmap (sequential, one hue), Funnel, Gauge, ScoreBar list, Distribution strip.
 * Colours come from CSS variables directly (style={{}} supports var()).
 */

/**
 * Heatmap grid. rows = [{label, values: number[]}], columns = string[].
 * Sequential single hue (brand) by default; `scale="score"` uses danger→warning→success bands for 0–100 scores.
 */
export function Heatmap({ rows, columns, scale = 'sequential', format = (v) => fmtNumber(v), min, max, rowHeader = '', className }) {
  const all = rows.flatMap((r) => r.values).filter((v) => v != null);
  const lo = min ?? Math.min(...all);
  const hi = max ?? Math.max(...all);
  const cellStyle = (v) => {
    if (v == null) return { background: 'rgb(var(--surface-3))' };
    if (scale === 'score') {
      const tone = v >= 80 ? '--success' : v >= 60 ? '--warning' : '--danger';
      const strength = v >= 80 ? 0.15 + ((v - 80) / 20) * 0.6 : v >= 60 ? 0.2 + ((80 - v) / 20) * 0.4 : 0.25 + ((60 - v) / 60) * 0.55;
      return { background: `rgb(var(${tone}) / ${strength.toFixed(2)})` };
    }
    const t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
    return { background: `rgb(var(--brand) / ${(0.08 + t * 0.82).toFixed(2)})`, color: t > 0.55 ? 'rgb(var(--brand-ink))' : undefined };
  };
  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="grid min-w-max gap-[3px]" style={{ gridTemplateColumns: `minmax(120px,auto) repeat(${columns.length}, minmax(52px,1fr))` }}>
        <div className="px-2 py-1.5 text-xs font-semibold text-ink-muted">{rowHeader}</div>
        {columns.map((c) => (
          <div key={c} className="truncate px-1 py-1.5 text-center text-2xs font-semibold text-ink-muted" title={c}>
            {c}
          </div>
        ))}
        {rows.map((r) => (
          <Fragment key={r.label}>
            <div className="flex items-center truncate px-2 text-[13px] font-medium text-ink-2">{r.label}</div>
            {r.values.map((v, i) => (
              <Tooltip key={i} content={`${r.label} · ${columns[i]}: ${v == null ? 'no data' : format(v)}`} className="block">
                <div className="flex h-9 w-full items-center justify-center rounded-md text-xs font-semibold tabular text-ink transition hover:ring-2 hover:ring-ink/20" style={cellStyle(v)}>
                  {v == null ? '–' : format(v)}
                </div>
              </Tooltip>
            ))}
          </Fragment>
        ))}
      </div>
      {scale === 'sequential' && (
        <div className="mt-3 flex items-center justify-end gap-2 text-2xs text-ink-muted">
          <span>{format(lo)}</span>
          <span className="h-2 w-28 rounded-full" style={{ background: 'linear-gradient(90deg, rgb(var(--brand) / .08), rgb(var(--brand) / .9))' }} />
          <span>{format(hi)}</span>
        </div>
      )}
      {scale === 'score' && (
        <div className="mt-3 flex items-center justify-end gap-3 text-2xs text-ink-muted">
          {[['--danger', 'Below 60'], ['--warning', '60–79'], ['--success', '80+']].map(([t, l]) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `rgb(var(${t}) / .6)` }} />
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Conversion funnel. steps = [{label, value}]. Shows % of first step and drop from the previous. */
export function Funnel({ steps, className }) {
  const top = steps[0]?.value || 1;
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {steps.map((s, i) => {
        const pct = (s.value / top) * 100;
        const drop = i ? 100 - (s.value / (steps[i - 1].value || 1)) * 100 : null;
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="font-medium text-ink-2">{s.label}</span>
              <span className="tabular">
                <span className="font-semibold text-ink">{fmtNumber(s.value)}</span>
                <span className="ml-2 text-xs text-ink-muted">{pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded-lg bg-surface-3">
              <div className="flex h-full items-center rounded-lg px-2 text-2xs font-semibold text-brand-ink transition-[width] duration-700" style={{ width: `${Math.max(pct, 3)}%`, background: `rgb(var(--brand) / ${(1 - i * 0.13).toFixed(2)})` }} />
            </div>
            {drop != null && drop > 0 && <div className="mt-0.5 text-right text-2xs text-ink-faint">−{drop.toFixed(0)}% from previous step</div>}
          </div>
        );
      })}
    </div>
  );
}

/** Half-circle gauge for one rate (pass rate, connect rate). bands = thresholds for tone. */
export function Gauge({ value = 0, label, sublabel, size = 180, goodAt = 80, warnAt = 60 }) {
  const v = Math.max(0, Math.min(100, value));
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const arc = (from, to) => {
    const a0 = Math.PI * (1 - from / 100);
    const a1 = Math.PI * (1 - to / 100);
    return `M${cx + r * Math.cos(a0)},${cy - r * Math.sin(a0)} A${r},${r} 0 0 1 ${cx + r * Math.cos(a1)},${cy - r * Math.sin(a1)}`;
  };
  const tone = v >= goodAt ? '--success' : v >= warnAt ? '--warning' : '--danger';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 14} viewBox={`0 0 ${size} ${size / 2 + 14}`}>
        <path d={arc(0, 100)} style={{ fill: 'none', stroke: 'rgb(var(--surface-3))', strokeWidth: 14, strokeLinecap: 'round' }} />
        {v > 0 && <path d={arc(0, v)} style={{ fill: 'none', stroke: `rgb(var(${tone}))`, strokeWidth: 14, strokeLinecap: 'round', transition: 'all .6s' }} />}
      </svg>
      <div className="-mt-12 text-center">
        <div className="font-display text-3xl font-bold tabular">{label ?? `${Math.round(v)}%`}</div>
        {sublabel && <div className="text-xs text-ink-muted">{sublabel}</div>}
      </div>
    </div>
  );
}

/** Ranked bars with labels, for "top agents", "top failure reasons". items = [{label, value, sub, tone}] */
export function RankedBars({ items, format = fmtNumber, max, className }) {
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  const tones = { brand: 'bg-brand', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' };
  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {items.map((it, i) => (
        <li key={it.label} className="grid grid-cols-[20px_1fr_auto] items-center gap-x-3 gap-y-1">
          <span className="text-xs font-semibold tabular text-ink-faint">{i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-ink-2">{it.label}</span>
          </span>
          <span className="text-[13px] font-semibold tabular text-ink">{format(it.value)}</span>
          <span />
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <span className={cn('block h-full rounded-full', tones[it.tone || 'brand'])} style={{ width: `${(it.value / top) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 24-hour activity strip (calls by hour). values: 24 numbers. */
export function HourStrip({ values, format = fmtNumber, className }) {
  const hi = Math.max(...values, 1);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex h-16 items-end gap-[3px]">
        {values.map((v, h) => (
          <Tooltip key={h} content={`${String(h).padStart(2, '0')}:00 · ${format(v)}`} className="flex h-full flex-1 items-end">
            <span className="w-full rounded-t-[4px] bg-brand transition hover:opacity-80" style={{ height: `${Math.max((v / hi) * 100, 3)}%`, opacity: 0.35 + (v / hi) * 0.65 }} />
          </Tooltip>
        ))}
      </div>
      <div className="flex justify-between text-2xs text-ink-faint">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}

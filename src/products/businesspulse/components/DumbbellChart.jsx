import { cn } from '@/lib/cn';
import { Tooltip } from '@/design-system';

/**
 * Dumbbell chart: one row per item, a dot for "before", a dot for "after", and a bar between them
 * coloured by direction. rows = [{label, before, after, badge}]. Values on a 0–100 scale by default.
 * Candidate for the design system (Visuals.jsx) — it suits any before/after comparison.
 */
export function DumbbellChart({ rows, min = 0, max = 100, format = (v) => Math.round(v), beforeLabel = 'Before', afterLabel = 'After', className }) {
  const x = (v) => `${((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100}%`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min));
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="mb-2 grid grid-cols-[minmax(110px,170px)_1fr_64px] items-end gap-4">
        <span />
        <div className="relative h-4 text-2xs text-ink-faint">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 tabular" style={{ left: x(t) }}>
              {format(t)}
            </span>
          ))}
        </div>
        <span className="text-right text-2xs text-ink-faint">Change</span>
      </div>
      <ul className="flex flex-col">
        {rows.map((r) => {
          const has = r.before != null && r.after != null;
          const diff = has ? r.after - r.before : 0;
          const up = diff >= 0;
          const lo = Math.min(r.before ?? 0, r.after ?? 0);
          const hi = Math.max(r.before ?? 0, r.after ?? 0);
          return (
            <li key={r.label} className="grid grid-cols-[minmax(110px,170px)_1fr_64px] items-center gap-4 border-b border-line/60 py-3 last:border-0">
              <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-ink-2">
                <span className="truncate">{r.label}</span>
                {r.badge}
              </span>
              <div className="relative h-6">
                {ticks.map((t) => (
                  <span key={t} className="absolute inset-y-0 w-px bg-line/70" style={{ left: x(t) }} />
                ))}
                {has && (
                  <>
                    <span className={cn('absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full', up ? 'bg-success/50' : 'bg-danger/50')} style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }} />
                    <span className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2" style={{ left: x(r.before) }}>
                      <Tooltip content={`${beforeLabel}: ${format(r.before)}`}>
                        <span className="block h-3.5 w-3.5 rounded-full border-2 border-ink-faint bg-surface" />
                      </Tooltip>
                    </span>
                    <span className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2" style={{ left: x(r.after) }}>
                      <Tooltip content={`${afterLabel}: ${format(r.after)}`}>
                        <span className={cn('block h-4 w-4 rounded-full ring-4 ring-surface', up ? 'bg-success' : 'bg-danger')} />
                      </Tooltip>
                    </span>
                  </>
                )}
              </div>
              <span className={cn('text-right text-[13px] font-bold tabular', !has ? 'text-ink-faint' : up ? 'text-success' : 'text-danger')}>{has ? `${up ? '+' : '−'}${Math.abs(diff).toFixed(1)}` : '—'}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-4 text-2xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-ink-faint bg-surface" /> {beforeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-success" /> {afterLabel} (better)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-danger" /> {afterLabel} (worse)
        </span>
      </div>
    </div>
  );
}

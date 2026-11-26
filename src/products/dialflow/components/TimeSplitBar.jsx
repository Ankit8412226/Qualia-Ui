import { cn } from '@/lib/cn';
import { fmtDuration, fmtPercent } from '@/lib/format';

/*
 * How an agent's login time splits. Login = Available + Talk + Wrap + Hold + Pauses.
 * Colours follow the agent-state vocabulary (Ready=Available, In call=Talk, Wrap-up=Wrap, Paused=Pauses).
 */
export const SPLIT_PARTS = [
  { key: 'available', label: 'Available', fill: 'bg-success' },
  { key: 'talk', label: 'Talk', fill: 'bg-brand' },
  { key: 'wrap', label: 'Wrap', fill: 'bg-[rgb(var(--series-2))]' },
  { key: 'hold', label: 'Hold', fill: 'bg-ink-faint' },
  { key: 'pauses', label: 'Breaks', fill: 'bg-ink-muted' },
];

/** Segmented bar with a hover tooltip per part. `scale` (0–1) lets bars share one axis so longer logins look longer. */
export function TimeSplitBar({ row, scale = 1, className, height = 'h-3' }) {
  const parts = SPLIT_PARTS.filter((p) => row[p.key] > 0);
  return (
    <div className={cn('flex w-full items-center', className)}>
      <div className={cn('flex gap-[2px]', height)} style={{ width: `${Math.max(scale * 100, 8)}%` }}>
        {parts.map((p, i) => {
          const pct = (row[p.key] / (row.login || 1)) * 100;
          return (
            <div key={p.key} className="group/seg relative h-full min-w-[3px]" style={{ width: `${pct}%` }}>
              <span className={cn('block h-full transition group-hover/seg:brightness-110 group-hover/seg:ring-2 group-hover/seg:ring-ink/20', p.fill, i === 0 && 'rounded-l-full', i === parts.length - 1 && 'rounded-r-full')} />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-xs font-medium text-canvas opacity-0 shadow-pop transition-opacity group-hover/seg:opacity-100">
                {p.label}: {fmtDuration(row[p.key])} · {fmtPercent(pct)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SplitLegend({ className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted', className)}>
      {SPLIT_PARTS.map((p) => (
        <span key={p.key} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-[3px]', p.fill)} />
          {p.label}
        </span>
      ))}
    </div>
  );
}

import { fmtNumber, fmtPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import { StackedBar } from '@/design-system';

/** Connected / failed / pending bar with an optional legend. */
export function CampaignProgress({ c, legend, className }) {
  const pct = c.contacts ? Math.round((c.dialled / c.contacts) * 100) : 0;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold tabular text-ink">{pct}%</span>
        <span className="tabular text-ink-muted">
          {fmtNumber(c.dialled)} / {fmtNumber(c.contacts)}
        </span>
      </div>
      <StackedBar
        height="h-2"
        segments={[
          { label: 'Connected', value: c.connected, tone: 'success' },
          { label: 'Failed', value: c.failed, tone: 'danger' },
          { label: 'Pending', value: c.pending, tone: 'bg-surface-3' },
        ]}
      />
      {legend && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-ink-muted">
          <LegendDot className="bg-success" label={`${fmtNumber(c.connected)} connected`} />
          <LegendDot className="bg-danger" label={`${fmtNumber(c.failed)} failed`} />
          <LegendDot className="bg-line-strong" label={`${fmtNumber(c.pending)} pending`} />
        </div>
      )}
    </div>
  );
}

export function LegendDot({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', className)} />
      {label}
    </span>
  );
}

export const connectRateText = (c) => (c.connectRate == null ? '—' : fmtPercent(c.connectRate, 0));

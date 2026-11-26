import { Coins, LockSimple, Sparkle, Wallet } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber } from '@/lib/format';
import { Button, Progress } from '@/design-system';

/** Thin banner for credits / wallet across products. tone switches to warning under `warnBelow`. */
export function CreditBanner({ label = 'Call minutes', used, total, unit = 'min', onTopUp, actionLabel, warnBelow = 0.15, className }) {
  const left = total - used;
  const low = left / total < warnBelow;
  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-2.5 text-[13px]', low ? 'border-warning/40 bg-warning/5' : 'border-line bg-surface', className)}>
      <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', low ? 'bg-warning/15 text-warning' : 'bg-brand/10 text-brand')}>{unit === '₹' ? <Wallet size={15} weight="duotone" /> : <Coins size={15} weight="duotone" />}</span>
      <span className="font-medium text-ink">{label}</span>
      <span className="tabular text-ink-muted">
        <b className="text-ink">{unit === '₹' ? `₹${fmtNumber(left)}` : `${fmtNumber(left)} ${unit}`}</b> left of {unit === '₹' ? `₹${fmtNumber(total)}` : fmtNumber(total)}
      </span>
      <Progress value={used} max={total} size="sm" tone={low ? 'warning' : 'brand'} className="w-28" />
      {low && <span className="font-medium text-warning">Running low</span>}
      {onTopUp && (
        <Button size="xs" variant={low ? 'accent' : 'secondary'} className="ml-auto" onClick={onTopUp}>
          {actionLabel || (unit === '₹' ? 'Top up' : 'Request more')}
        </Button>
      )}
    </div>
  );
}

/** Upsell / permission lock. Shown when a feature is off for the tenant or process. */
export function LockedFeature({ title = 'This feature is not enabled', description = 'Ask your admin to turn it on for this process.', features = [], action, className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-3xl border border-line bg-surface p-8 text-center sm:p-12', className)}>
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[480px] -translate-x-1/2 rounded-full opacity-20 blur-3xl grad-bg" />
      <span className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-canvas">
        <LockSimple size={24} weight="fill" />
      </span>
      <h2 className="relative text-xl font-extrabold">{title}</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm text-ink-muted">{description}</p>
      {features.length > 0 && (
        <ul className="relative mx-auto mt-6 grid max-w-lg gap-2 text-left sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-[13px] text-ink-2">
              <Sparkle size={14} weight="fill" className="mt-0.5 shrink-0 text-product-businesspulse" />
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="relative mt-6 flex justify-center gap-2">{action || <Button variant="primary">Contact your admin</Button>}</div>
    </div>
  );
}

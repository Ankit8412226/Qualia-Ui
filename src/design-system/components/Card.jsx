import { cn } from '@/lib/cn';
import { Delta, IconTile } from './Display';
import { Sparkline } from '../charts/Sparkline';

/**
 * Base surface. `interactive` adds hover lift; `padded=false` for tables and lists that run edge to edge.
 * A clickable div card (interactive + onClick) is also reachable by keyboard (Tab, Enter/Space).
 */
export function Card({ as: Tag = 'div', interactive, padded = true, className, children, ...rest }) {
  const clickable = interactive && rest.onClick && Tag === 'div';
  const a11y = clickable
    ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => {
          rest.onKeyDown?.(e);
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            rest.onClick(e);
          }
        },
      }
    : {};
  return (
    <Tag
      {...a11y}
      className={cn(
        'rounded-2xl border border-line bg-surface shadow-card',
        padded && 'p-5',
        interactive && 'cursor-pointer transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop',
        className,
      )}
      {...rest}
      {...(clickable ? { onKeyDown: a11y.onKeyDown } : {})}
    >
      {children}
    </Tag>
  );
}

/** Title row inside a Card. */
export function CardHeader({ title, subtitle, icon, actions, className }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <IconTile icon={icon} size="sm" />}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * KPI tile. One number, what it means, how it moved, and (optionally) its recent shape.
 * `spark` is an array of numbers. `inverse` = lower is better.
 */
export function StatCard({ label, value, unit, delta, deltaLabel = 'vs last period', inverse, icon, tone = 'brand', spark, hint, footer, onClick, className, loading }) {
  return (
    <Card interactive={!!onClick} onClick={onClick} className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-muted">{label}</span>
        {icon && <IconTile icon={icon} tone={tone} size="sm" />}
      </div>
      {loading ? (
        <div className="skeleton h-8 w-28" />
      ) : (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-[28px] font-bold leading-none tracking-tight tabular">
              {value}
              {unit && <span className="ml-1 text-base font-semibold text-ink-muted">{unit}</span>}
            </div>
            {(delta != null || hint) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                <Delta value={delta} inverse={inverse} />
                {delta != null && <span>{deltaLabel}</span>}
                {hint && delta == null && <span>{hint}</span>}
              </div>
            )}
          </div>
          {spark && <Sparkline data={spark} className="h-10 w-24 shrink-0" inverse={inverse} />}
        </div>
      )}
      {footer && <div className="border-t border-line pt-3 text-xs text-ink-muted">{footer}</div>}
    </Card>
  );
}

/** Responsive row of StatCards. */
export function StatGrid({ cols = 4, className, children }) {
  const map = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 xl:grid-cols-4', 5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5', 6: 'sm:grid-cols-3 xl:grid-cols-6' };
  return <div className={cn('grid grid-cols-1 gap-4', map[cols], className)}>{children}</div>;
}

/** Compact inline metric for dense strips (e.g. inside a card or a header). */
export function Metric({ label, value, sub, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="truncate text-xs text-ink-muted">{label}</div>
      <div className="mt-0.5 font-display text-lg font-bold tabular">{value}</div>
      {sub && <div className="text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}

/** A labelled strip of Metrics separated by dividers. */
export function MetricStrip({ items, className }) {
  return (
    <div className={cn('grid divide-line rounded-2xl border border-line bg-surface sm:divide-x', className)} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))` }}>
      {items.map((m) => (
        <Metric key={m.label} {...m} className="px-5 py-4" />
      ))}
    </div>
  );
}

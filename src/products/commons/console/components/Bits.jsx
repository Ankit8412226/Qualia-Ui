import { useState } from 'react';
import { Star } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Badge, Progress } from '@/design-system';
import { fmtNumber } from '@/lib/format';

/** 1–5 star rating. Read-only when no onChange. */
export function StarRating({ value = 0, onChange, size = 18, className }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= Math.round(shown);
        const Tag = onChange ? 'button' : 'span';
        return (
          <Tag
            key={n}
            type={onChange ? 'button' : undefined}
            aria-label={onChange ? `${n} star${n > 1 ? 's' : ''}` : undefined}
            onMouseEnter={onChange ? () => setHover(n) : undefined}
            onClick={onChange ? () => onChange(n) : undefined}
            className={cn(on ? 'text-warning' : 'text-line-strong', onChange && 'rounded transition hover:scale-110')}
          >
            <Star size={size} weight={on ? 'fill' : 'regular'} />
          </Tag>
        );
      })}
    </span>
  );
}

const LABEL_TONE = { Clean: 'success', Spam: 'danger', 'Suspected fraud': 'danger', 'No label': 'neutral' };
/** Label a seed phone saw for a calling line (spam check). */
export function SpamLabel({ label }) {
  if (!label) return <span className="text-xs text-ink-faint">Not checked</span>;
  return (
    <Badge tone={LABEL_TONE[label]} dot={label !== 'No label'} className={label === 'Suspected fraud' ? 'ring-1 ring-danger/30' : undefined}>
      {label}
    </Badge>
  );
}

/** Used / total meter with numbers. tone flips at 80% and 90% used. */
export function UsageMeter({ used, total, unit = '', className, format = fmtNumber }) {
  const ratio = total ? used / total : 0;
  const tone = ratio >= 0.9 ? 'danger' : ratio >= 0.8 ? 'warning' : 'brand';
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="tabular text-ink-2">
          <b className="text-ink">{format(Math.max(0, total - used))}</b> {unit} left
        </span>
        <span className="tabular text-ink-faint">of {format(total)}</span>
      </div>
      <Progress value={used} max={total} size="sm" tone={tone} />
    </div>
  );
}

/** Credit health dot + label for tenant rows. */
export function HealthBadge({ status }) {
  const tone = status === 'Critical' ? 'danger' : status === 'Low' ? 'warning' : 'success';
  return (
    <Badge tone={tone} dot>
      {status}
    </Badge>
  );
}

import { Fragment } from 'react';
import { Check, Checks, Clock, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Badge } from '@/design-system';

/* Small WhatsApp-specific helpers shared by every UltraChat screen. */

export const CATEGORY_TONE = { Marketing: 'accent', Utility: 'info', Authentication: 'violet', Service: 'success' };

export function CategoryBadge({ category, size }) {
  return (
    <Badge tone={CATEGORY_TONE[category] || 'neutral'} size={size}>
      {category}
    </Badge>
  );
}

/** Per-message price by category (₹). Mirrors the wallet rate card. */
export const RATE = { Marketing: 0.88, Utility: 0.14, Authentication: 0.14, Service: 0 };

/** Variables used in a body: "Hi {{1}} … {{2}}" → [1, 2] */
export const extractVars = (text = '') => [...new Set([...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);

/**
 * Renders WhatsApp formatting (*bold*, _italic_, ~strike~, `mono`) and {{n}} variables.
 * `values[n-1]` replaces the variable; missing values render as a highlighted chip.
 */
export function WaText({ text = '', values = [], highlightVars = true, className }) {
  const parts = text.split(/(\{\{\d+\}\}|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`|\n)/g).filter((p) => p !== '');
  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {parts.map((p, i) => {
        const v = p.match(/^\{\{(\d+)\}\}$/);
        if (v) {
          const val = values[Number(v[1]) - 1];
          if (val) return highlightVars ? <span key={i} className="rounded bg-brand/10 px-0.5 font-medium text-brand">{val}</span> : <Fragment key={i}>{val}</Fragment>;
          return (
            <span key={i} className="rounded bg-warning/15 px-1 font-mono text-[0.85em] text-warning">
              {p}
            </span>
          );
        }
        if (p === '\n') return <br key={i} />;
        if (/^\*.+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>;
        if (/^_.+_$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
        if (/^~.+~$/.test(p)) return <s key={i}>{p.slice(1, -1)}</s>;
        if (/^`.+`$/.test(p)) return <code key={i} className="font-mono text-[0.9em]">{p.slice(1, -1)}</code>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </span>
  );
}

/** Delivery ticks: sent ✓, delivered ✓✓, read ✓✓ (info colour), failed ⚠, queued 🕒 */
export function Ticks({ status, className }) {
  const s = String(status || '').toLowerCase();
  if (s === 'failed') return <WarningCircle size={14} weight="fill" className={cn('text-danger', className)} aria-label="Failed" />;
  if (s === 'queued' || s === 'sending') return <Clock size={13} className={cn('text-ink-faint', className)} aria-label="Sending" />;
  if (s === 'sent') return <Check size={14} weight="bold" className={cn('text-ink-faint', className)} aria-label="Sent" />;
  return <Checks size={15} weight="bold" className={cn(s === 'read' || s === 'replied' ? 'text-info' : 'text-ink-faint', className)} aria-label={s === 'read' ? 'Read' : 'Delivered'} />;
}

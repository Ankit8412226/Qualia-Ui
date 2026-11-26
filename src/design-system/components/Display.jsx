import { ArrowDownRight, ArrowUpRight, Minus } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtRelative, initials } from '@/lib/format';

/* ---------------- Badge ---------------- */

const TONES = {
  neutral: 'bg-surface-3 text-ink-2',
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  accent: 'bg-accent/10 text-accent',
  violet: 'bg-product-businesspulse/10 text-product-businesspulse',
  solid: 'bg-ink text-canvas',
};

/** Small status label. `dot` adds a coloured dot; `pulse` animates it (live states). */
export function Badge({ tone = 'neutral', dot, pulse, size = 'sm', icon: Icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full font-medium',
        size === 'xs' ? 'px-1.5 py-px text-2xs' : 'px-2 py-0.5 text-xs',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full bg-current', pulse && 'animate-pulse-dot')} />}
      {Icon && <Icon size={12} weight="bold" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Maps any status word used across the products to one tone, so "Running" looks the same everywhere. */
const STATUS_TONES = {
  success: ['active', 'running', 'completed', 'connected', 'delivered', 'read', 'healthy', 'passed', 'pass', 'approved', 'answered', 'online', 'ready', 'opted in', 'live', 'success', 'done', 'grounded', 'paid'],
  warning: ['paused', 'pending', 'scheduled', 'wrap-up', 'on break', 'grading', 'in progress', 'processing', 'queued', 'warning', 'review', 'low balance', 'partial', 'weak evidence', 'busy', 'ringing'],
  danger: ['failed', 'aborted', 'error', 'fatal', 'rejected', 'blocked', 'likely spam', 'line down', 'no answer', 'opted out', 'suspended', 'missed', 'not ready', 'needs retraining', 'offline', 'expired', 'no evidence'],
  info: ['draft', 'new', 'on a call', 'in call', 'sent', 'plan ready', 'inbound', 'outbound', 'manual dial'],
};
export function statusTone(status = '') {
  const s = String(status).toLowerCase();
  for (const [tone, words] of Object.entries(STATUS_TONES)) if (words.includes(s)) return tone;
  return 'neutral';
}
export function StatusBadge({ status, pulse, className }) {
  const tone = statusTone(status);
  const live = ['running', 'live', 'on a call', 'in call', 'ringing'].includes(String(status).toLowerCase());
  return (
    <Badge tone={tone} dot pulse={pulse ?? live} className={className}>
      {status}
    </Badge>
  );
}

/* ---------------- Avatar ---------------- */

const AVATAR_TINTS = ['bg-product-agentflow/15 text-product-agentflow', 'bg-product-dialflow/15 text-product-dialflow', 'bg-product-businesspulse/15 text-product-businesspulse', 'bg-product-ultrachat/15 text-product-ultrachat', 'bg-navy/15 text-navy'];
const AV_SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-[13px]', lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-xl' };
const DOT = { online: 'bg-success', busy: 'bg-danger', away: 'bg-warning', offline: 'bg-faint' };

export function Avatar({ name, src, size = 'md', status, className }) {
  const tint = AVATAR_TINTS[[...(name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img src={src} alt="" className={cn('rounded-full object-cover', AV_SIZES[size])} />
      ) : (
        <span className={cn('inline-flex items-center justify-center rounded-full font-semibold', AV_SIZES[size], tint)}>{initials(name)}</span>
      )}
      {status && <span className={cn('absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full ring-2 ring-surface', DOT[status])} />}
    </span>
  );
}

export function AvatarStack({ names = [], max = 4, size = 'sm' }) {
  const shown = names.slice(0, max);
  return (
    <span className="inline-flex items-center">
      {shown.map((n) => (
        <Avatar key={n} name={n} size={size} className="-ml-2 rounded-full ring-2 ring-surface first:ml-0" />
      ))}
      {names.length > max && <span className="-ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-ink-2 ring-2 ring-surface">+{names.length - max}</span>}
    </span>
  );
}

/* ---------------- Trend / Delta ---------------- */

/** "+12.4%" chip. `inverse` = lower is better (e.g. failures, wait time). */
export function Delta({ value, inverse, suffix = '%', className }) {
  if (value == null || Number.isNaN(value)) return null;
  const flat = Math.abs(value) < 0.05;
  const good = flat ? null : inverse ? value < 0 : value > 0;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular', good == null ? 'bg-surface-3 text-ink-muted' : good ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger', className)}>
      <Icon size={12} weight="bold" />
      {Math.abs(value).toFixed(1).replace(/\.0$/, '')}
      {suffix}
    </span>
  );
}

/* ---------------- misc ---------------- */

export function Kbd({ children, className }) {
  return <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-surface-2 px-1 font-mono text-[10px] text-ink-muted', className)}>{children}</kbd>;
}

/** "Live · updated 12 s ago". Same pattern on every auto-refreshing screen. */
export function LiveIndicator({ updatedAt, label = 'Live', className }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs text-ink-muted', className)}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <span className="font-medium text-ink-2">{label}</span>
      {updatedAt && <span>· updated {fmtRelative(updatedAt)}</span>}
    </span>
  );
}

/** Icon in a soft coloured square: used by stat cards, list rows and empty states. */
export function IconTile({ icon: Icon, tone = 'brand', size = 'md', className }) {
  const sizes = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-12 w-12 rounded-2xl' };
  const glyph = { sm: 16, md: 19, lg: 22 };
  const neutral = 'bg-surface-3 text-ink-2';
  const tones = {
    brand: 'bg-brand/10 text-brand',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
    accent: 'bg-accent/10 text-accent',
    violet: 'bg-product-businesspulse/10 text-product-businesspulse',
    neutral,
    agentflow: 'bg-product-agentflow/10 text-product-agentflow',
    dialflow: 'bg-product-dialflow/10 text-product-dialflow',
    businesspulse: 'bg-product-businesspulse/10 text-product-businesspulse',
    ultrachat: 'bg-product-ultrachat/10 text-product-ultrachat',
    insights: 'bg-product-insights/10 text-product-insights',
  };
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', sizes[size], tones[tone] || neutral, className)}>
      <Icon size={glyph[size]} weight="duotone" />
    </span>
  );
}

export function Divider({ className, label }) {
  if (!label) return <hr className={cn('border-line', className)} />;
  return (
    <div className={cn('flex items-center gap-3 text-xs text-ink-faint', className)}>
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Live audio bars (calls in progress). */
export function Waveform({ bars = 5, className }) {
  return (
    <span className={cn('inline-flex h-4 items-end gap-[3px]', className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className="h-full w-[3px] origin-bottom animate-bar rounded-full bg-current" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}

import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowClockwise, CheckCircle, Info, Warning, WarningCircle, X, CircleNotch, CloudSlash } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { IconTile } from './Display';

/* ---------- Toast: one pattern for the whole platform ---------- */

const ToastCtx = createContext(() => {});
const TOAST_ICON = { success: CheckCircle, error: WarningCircle, info: Info, warning: Warning };
const TOAST_TONE = { success: 'text-success', error: 'text-danger', info: 'text-info', warning: 'text-warning' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((input) => {
    const t = typeof input === 'string' ? { title: input } : input;
    const id = Math.random().toString(36).slice(2);
    setToasts((all) => [...all, { tone: 'success', ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), t.duration || 3600);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2">
          {toasts.map((t) => {
            const Icon = TOAST_ICON[t.tone];
            return (
              <div key={t.id} className="pointer-events-auto flex animate-rise items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-pop">
                <Icon size={20} weight="fill" className={cn('mt-px shrink-0', TOAST_TONE[t.tone])} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{t.title}</div>
                  {t.description && <div className="mt-0.5 text-xs text-ink-muted">{t.description}</div>}
                </div>
                <button onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} aria-label="Dismiss" className="text-ink-faint hover:text-ink">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

/** toast('Saved') or toast({ title, description, tone: 'success'|'error'|'info'|'warning' }) */
export const useToast = () => useContext(ToastCtx);

/* ---------- Callout ---------- */

const CALLOUT = {
  info: ['border-info/25 bg-info/5', 'text-info', Info],
  success: ['border-success/25 bg-success/5', 'text-success', CheckCircle],
  warning: ['border-warning/30 bg-warning/5', 'text-warning', Warning],
  danger: ['border-danger/25 bg-danger/5', 'text-danger', WarningCircle],
  brand: ['border-brand/25 bg-brand/5', 'text-brand', Info],
};

export function Callout({ tone = 'info', title, icon, action, className, children }) {
  const [box, fg, DefaultIcon] = CALLOUT[tone];
  const Icon = icon || DefaultIcon;
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border p-4', box, className)}>
      <Icon size={20} weight="duotone" className={cn('mt-px shrink-0', fg)} />
      <div className="min-w-0 flex-1 text-sm">
        {title && <div className="font-semibold text-ink">{title}</div>}
        {children && <div className={cn('text-ink-2', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({ icon, title, description, action, secondary, className, compact }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 py-8' : 'gap-3 py-14', className)}>
      {icon && <IconTile icon={icon} size="lg" />}
      <div className="max-w-sm">
        <h3 className="text-[15px] font-bold">{title}</h3>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {(action || secondary) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}

/* ---------- Error state: a load failed; say so plainly and offer Retry ---------- */

export function ErrorState({ title = 'Couldn’t load this', description = 'Check your connection and try again. If it keeps failing, contact support.', error, onRetry, className, compact }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 py-8' : 'gap-3 py-14', className)}>
      <IconTile icon={CloudSlash} tone="danger" size={compact ? 'md' : 'lg'} />
      <div className="max-w-sm">
        <h3 className="text-[15px] font-bold">{title}</h3>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
        {error?.message && <p className="mt-1 text-xs text-ink-faint">{error.message}</p>}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-2"
        >
          <ArrowClockwise size={15} weight="bold" /> Try again
        </button>
      )}
    </div>
  );
}

/* ---------- Loading ---------- */

export function Skeleton({ className }) {
  return <div className={cn('skeleton h-4', className)} />;
}

export function SkeletonRows({ rows = 6, className }) {
  return (
    <div className={cn('flex flex-col gap-3 p-5', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 18, className }) {
  return <CircleNotch size={size} className={cn('animate-spin text-ink-muted', className)} />;
}

/* ---------- Progress ---------- */

const BAR_TONE = { brand: 'bg-brand', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info', accent: 'bg-accent' };

export function Progress({ value = 0, max = 100, tone = 'brand', size = 'md', className, showLabel }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('w-full overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div className={cn('h-full rounded-full transition-[width] duration-500', BAR_TONE[tone])} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="w-10 shrink-0 text-right text-xs font-medium tabular text-ink-muted">{Math.round(pct)}%</span>}
    </div>
  );
}

/** Several segments in one bar, e.g. connected / failed / pending. segments = [{value, tone, label}] */
export function StackedBar({ segments, className, height = 'h-2.5' }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className={cn('flex w-full overflow-hidden rounded-full bg-surface-3', height, className)}>
      {segments.map((s) => (
        <div key={s.label} title={`${s.label}: ${s.value}`} className={cn('h-full first:rounded-l-full last:rounded-r-full', BAR_TONE[s.tone] || s.tone)} style={{ width: `${(s.value / total) * 100}%` }} />
      ))}
    </div>
  );
}

/** Circular progress / score ring. */
export function ProgressRing({ value = 0, size = 64, stroke = 7, tone = 'brand', label, className }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = { brand: 'rgb(var(--brand))', success: 'rgb(var(--success))', warning: 'rgb(var(--warning))', danger: 'rgb(var(--danger))' }[tone];
  return (
    <span className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--surface-3))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <span className="absolute font-display text-sm font-bold tabular">{label ?? `${Math.round(pct)}`}</span>
    </span>
  );
}

/** Tone for a 0–100 score, used by QA scores and health. */
export const scoreTone = (v) => (v >= 80 ? 'success' : v >= 60 ? 'warning' : 'danger');

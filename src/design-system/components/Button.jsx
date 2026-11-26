import { forwardRef } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

const VARIANTS = {
  primary: 'bg-ink text-canvas hover:bg-ink/90 shadow-[0_10px_24px_-12px_rgb(var(--ink)/.6)]',
  brand: 'bg-brand text-brand-ink hover:bg-brand/90 shadow-glow',
  accent: 'bg-accent text-white hover:bg-accent/90 shadow-[0_10px_24px_-10px_rgb(var(--accent)/.7)]',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2 hover:border-line-strong',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
  soft: 'bg-brand/10 text-brand hover:bg-brand/15',
  danger: 'bg-danger text-white hover:bg-danger/90',
  'danger-soft': 'bg-danger/10 text-danger hover:bg-danger/15',
  link: 'text-brand hover:underline underline-offset-4 px-0 h-auto',
};

const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
};

const ICON_SIZES = { xs: 'h-7 w-7 rounded-lg', sm: 'h-8 w-8 rounded-lg', md: 'h-9 w-9 rounded-xl', lg: 'h-11 w-11 rounded-xl' };
const GLYPH = { xs: 14, sm: 15, md: 16, lg: 18 };

/**
 * The one button. `icon` / `iconRight` take a Phosphor component (not an element).
 * Pass `iconOnly` with an `aria-label` for square icon buttons.
 * `disabledReason` (with `disabled`) explains why on hover/focus, e.g. "Add at least one contact".
 */
export const Button = forwardRef(function Button(
  { as: Tag = 'button', variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, iconOnly, loading, className, children, disabled, disabledReason, type, ...rest },
  ref,
) {
  const glyph = GLYPH[size];
  const btn = (
    <Tag
      ref={ref}
      type={Tag === 'button' ? type || 'button' : undefined}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background,box-shadow,transform,color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        iconOnly ? ICON_SIZES[size] : SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <CircleNotch size={glyph} className="animate-spin" /> : Icon && <Icon size={glyph} weight={iconOnly ? 'regular' : 'bold'} />}
      {!iconOnly && children}
      {!iconOnly && IconRight && <IconRight size={glyph} weight="bold" />}
    </Tag>
  );
  if (!(disabled && disabledReason)) return btn;
  // Disabled buttons get no pointer events, so the wrapper carries the reason (hover + screen readers).
  return (
    <span className="inline-flex cursor-not-allowed" title={disabledReason} tabIndex={0} aria-label={disabledReason}>
      {btn}
    </span>
  );
});

/** Square icon button with a tooltip from `label`. */
export function IconButton({ icon, label, variant = 'ghost', size = 'md', className, ...rest }) {
  return (
    <Button iconOnly icon={icon} aria-label={label} title={label} variant={variant} size={size} className={className} {...rest} />
  );
}

/** Buttons sitting edge-to-edge. */
export function ButtonGroup({ className, children }) {
  return <div className={cn('inline-flex items-center gap-2', className)}>{children}</div>;
}

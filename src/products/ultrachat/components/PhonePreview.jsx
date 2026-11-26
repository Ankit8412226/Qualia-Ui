import { ArrowBendUpLeft, ArrowSquareOut, CaretLeft, Copy, FilePdf, Image as ImageIcon, Phone, Play, SealCheck, DotsThreeVertical, ListBullets } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { WaText } from './wa';

/*
 * Phone-shaped preview used by the template creator, campaign wizard and flow tester.
 * Uses our tokens (surface / brand) rather than WhatsApp's own colours.
 */

const BTN_ICON = { quick: ArrowBendUpLeft, url: ArrowSquareOut, call: Phone, copy: Copy, list: ListBullets };

/** Media placeholder for a template header or a media message. */
export function MediaHeader({ type, name, className }) {
  if (type === 'text') return null;
  if (type === 'document')
    return (
      <div className={cn('flex items-center gap-2.5 rounded-lg bg-surface-3 p-2.5', className)}>
        <span className="flex h-9 w-8 items-center justify-center rounded-md bg-danger/10 text-danger">
          <FilePdf size={18} weight="duotone" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-ink">{name || 'document.pdf'}</span>
          <span className="block text-2xs text-ink-muted">PDF · 12 pages</span>
        </span>
      </div>
    );
  return (
    <div className={cn('relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-lg', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-brand/25 via-brand/10 to-accent/20" />
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand/20 blur-xl" />
      {type === 'video' ? (
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-night/50 text-white">
          <Play size={18} weight="fill" />
        </span>
      ) : (
        <ImageIcon size={28} weight="duotone" className="relative text-brand" />
      )}
      {name && <span className="absolute bottom-1.5 left-2 max-w-[80%] truncate rounded bg-night/50 px-1.5 py-px text-2xs text-white">{name}</span>}
    </div>
  );
}

/** The message card a template renders as. `values` override template.samples. */
export function TemplateMessage({ template, values, time = '11:42', className, compact }) {
  const vals = values || template.samples || [];
  const { header, body, footer, buttons = [], carousel } = template;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="rounded-2xl rounded-tl-md bg-surface p-1.5 shadow-card">
        {header?.type && header.type !== 'none' && (
          <div className="mb-1">
            {header.type === 'text' ? <div className="px-1.5 pt-1 text-[13px] font-bold text-ink">{header.text || 'Header text'}</div> : <MediaHeader type={header.type} name={header.text} />}
          </div>
        )}
        <div className={cn('px-1.5 pb-0.5 pt-1 text-[13px] leading-snug text-ink', compact && 'line-clamp-4')}>
          {body ? <WaText text={body} values={vals} /> : <span className="text-ink-faint">Your message body appears here…</span>}
        </div>
        <div className="flex items-end justify-between gap-2 px-1.5 pb-0.5">
          {footer ? <span className="text-2xs text-ink-muted">{footer}</span> : <span />}
          <span className="text-[10px] text-ink-faint">{time}</span>
        </div>
        {buttons.length > 0 && (
          <div className="mt-1 flex flex-col border-t border-line">
            {buttons.slice(0, compact ? 2 : 10).map((b, i) => {
              const Icon = BTN_ICON[b.type] || ArrowBendUpLeft;
              return (
                <span key={i} className="flex items-center justify-center gap-1.5 border-b border-line py-2 text-[13px] font-medium text-brand last:border-0">
                  <Icon size={14} weight="bold" />
                  {b.text || 'Button'}
                </span>
              );
            })}
          </div>
        )}
      </div>
      {carousel?.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {carousel.map((c, i) => (
            <div key={i} className="w-[150px] shrink-0 rounded-2xl bg-surface p-1.5 shadow-card">
              <MediaHeader type="image" />
              <div className="px-1 pt-1.5 text-xs font-semibold text-ink">{c.title || `Card ${i + 1}`}</div>
              <div className="px-1 text-2xs text-ink-muted">{c.text}</div>
              <div className="mt-1.5 border-t border-line pt-1.5 text-center text-xs font-medium text-brand">{c.button || 'View'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Phone frame. children = the chat content (bubbles). `footer` replaces the fake composer.
 */
export function PhoneFrame({ name = 'RR Parko', subtitle = 'Business account', children, footer, className, height = 560 }) {
  return (
    <div className={cn('mx-auto w-[300px] rounded-[38px] border border-line-strong bg-ink/90 p-2 shadow-pop dark:bg-surface-3', className)}>
      <div className="flex flex-col overflow-hidden rounded-[30px] bg-canvas" style={{ height }}>
        <div className="flex items-center gap-2 bg-brand px-3 pb-2.5 pt-6 text-brand-ink">
          <CaretLeft size={16} weight="bold" />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-ink/20 text-xs font-bold">{name.slice(0, 2).toUpperCase()}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[13px] font-semibold leading-tight">
              <span className="truncate">{name}</span>
              <SealCheck size={13} weight="fill" />
            </span>
            <span className="block text-2xs opacity-75">{subtitle}</span>
          </span>
          <DotsThreeVertical size={18} weight="bold" />
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto bg-surface-2 p-3"
          style={{ backgroundImage: 'radial-gradient(rgb(var(--line)) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
        >
          <div className="mb-3 flex justify-center">
            <span className="rounded-md bg-surface px-2 py-0.5 text-2xs font-medium text-ink-muted shadow-card">Today</span>
          </div>
          {children}
        </div>
        {footer ?? (
          <div className="flex items-center gap-2 border-t border-line bg-surface px-3 py-2">
            <span className="h-8 flex-1 rounded-full bg-surface-3 px-3 text-xs leading-8 text-ink-faint">Message</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Simple chat bubble for previews (flow tester, bot tester). */
export function PreviewBubble({ from = 'business', children, time }) {
  const biz = from === 'business';
  return (
    <div className={cn('mb-2 flex', biz ? 'justify-start' : 'justify-end')}>
      <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-card', biz ? 'rounded-tl-md bg-surface text-ink' : 'rounded-tr-md bg-brand text-brand-ink')}>
        {children}
        {time && <span className={cn('ml-2 text-[10px]', biz ? 'text-ink-faint' : 'text-brand-ink/70')}>{time}</span>}
      </div>
    </div>
  );
}

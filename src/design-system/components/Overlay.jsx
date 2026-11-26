import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Warning, X } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/* Open dialogs, top-most last: only the top one reacts to Escape and traps Tab. */
const layers = [];
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour shared by Modal and Drawer: Escape closes the top-most layer, focus moves into the
 * panel on open, Tab stays inside it, and focus returns to the element that opened it on close.
 */
function useDialog(open, onClose, panelRef, focusField = true) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    layers.push(token);
    const opener = document.activeElement;
    const panel = panelRef.current;
    // Prefer an autofocus field, then the first field, else the panel itself (not the close button).
    const first = panel?.querySelector('[autofocus],[data-autofocus]') || (focusField ? panel?.querySelector('input:not([type=hidden]):not([disabled]),textarea,select') : null);
    (first || panel)?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (layers[layers.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current?.();
      } else if (e.key === 'Tab' && panel) {
        const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && (document.activeElement === a || document.activeElement === panel)) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      layers.splice(layers.indexOf(token), 1);
      if (opener && document.contains(opener)) opener.focus?.({ preventScroll: true });
    };
  }, [open, panelRef, focusField]);
}

/** Centered dialog. `footer` is usually a pair of Buttons. Sizes: sm 420, md 560, lg 760, xl 980. */
export function Modal({ open, onClose, title, description, icon: Icon, footer, size = 'md', className, children }) {
  const panel = useRef(null);
  useDialog(open, onClose, panel);
  if (!open) return null;
  const w = { sm: 'max-w-[420px]', md: 'max-w-[560px]', lg: 'max-w-[760px]', xl: 'max-w-[980px]' }[size];
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="absolute inset-0 animate-fade-in bg-night/45 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={panel} tabIndex={-1} className={cn('relative flex max-h-[92vh] w-full animate-rise flex-col rounded-t-3xl border border-line bg-surface shadow-pop outline-none sm:rounded-3xl', w, className)}>
        {(title || onClose) && (
          <div className="flex items-start gap-3 px-6 pb-2 pt-5">
            {Icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon size={20} weight="duotone" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-lg font-bold">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
            </div>
            {onClose && (
              <button onClick={onClose} aria-label="Close" className="-mr-2 rounded-lg p-2 text-ink-muted hover:bg-surface-3 hover:text-ink">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Right-side panel for details (call detail, edit row). Keeps the list visible behind it. */
export function Drawer({ open, onClose, title, subtitle, actions, footer, width = 560, children, className }) {
  const panel = useRef(null);
  useDialog(open, onClose, panel, false);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="absolute inset-0 animate-fade-in bg-night/30" onClick={onClose} />
      <aside ref={panel} tabIndex={-1} className={cn('absolute inset-y-0 right-0 flex w-full animate-slide-in flex-col border-l border-line bg-surface shadow-pop outline-none', className)} style={{ maxWidth: width }}>
        <div className="flex items-start gap-3 border-b border-line px-6 py-4">
          <div className="min-w-0 flex-1">
            {typeof title === 'string' ? <h2 className="truncate text-lg font-bold">{title}</h2> : title}
            {subtitle && <div className="mt-0.5 text-sm text-ink-muted">{subtitle}</div>}
          </div>
          {actions}
          <button onClick={onClose} aria-label="Close" className="-mr-2 rounded-lg p-2 text-ink-muted hover:bg-surface-3 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}

/* ---------- Confirm: one pattern for every destructive or irreversible action ---------- */

const ConfirmCtx = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (ok) => {
    state?.resolve(ok);
    setState(null);
  };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        size="sm"
        title={state?.title}
        footer={
          <>
            {/* Focus starts on the safe choice for destructive confirms, on the action otherwise. */}
            <Button data-autofocus={state?.tone === 'danger' ? true : undefined} variant="secondary" onClick={() => close(false)}>
              {state?.cancelLabel || 'Cancel'}
            </Button>
            <Button data-autofocus={state?.tone === 'danger' ? undefined : true} variant={state?.tone === 'danger' ? 'danger' : 'brand'} onClick={() => close(true)}>
              {state?.confirmLabel || 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          {state?.tone === 'danger' && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
              <Warning size={20} weight="duotone" />
            </span>
          )}
          <p className="text-sm leading-relaxed text-ink-2">{state?.message}</p>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

/** const confirm = useConfirm(); if (await confirm({ title, message, tone: 'danger', confirmLabel })) … */
export const useConfirm = () => useContext(ConfirmCtx);

/* ---------- Popover & Menu ---------- */

/** Anchored floating panel. `trigger` is a render prop receiving {open, toggle}. `block` lets the trigger fill its row. */
export function Popover({ trigger, children, align = 'start', width = 240, className, open: controlled, onOpenChange, block }) {
  const [inner, setInner] = useState(false);
  const open = controlled ?? inner;
  const setOpen = onOpenChange ?? setInner;
  const anchor = useRef(null);
  const panel = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    const w = width === 'trigger' ? r.width : width;
    let left = align === 'end' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    const below = r.bottom + 6;
    const ph = panel.current?.offsetHeight || 0;
    const top = below + ph > window.innerHeight - 8 && r.top - ph - 6 > 8 ? r.top - ph - 6 : below;
    setPos({ top, left, width: w });
  }, [open, align, width]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!panel.current?.contains(e.target) && !anchor.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  return (
    <>
      <span ref={anchor} className={block ? 'flex w-full' : 'inline-flex'}>
        {trigger({ open, toggle: () => setOpen(!open), close: () => setOpen(false) })}
      </span>
      {open &&
        createPortal(
          <div ref={panel} className={cn('fixed z-[90] animate-rise rounded-2xl border border-line bg-surface p-1.5 shadow-pop', className)} style={{ top: pos.top, left: pos.left, width: pos.width }}>
            {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Dropdown menu. items = [{label, icon, onClick, tone:'danger', shortcut, divider:true, description}]
 */
export function Menu({ trigger, items, align = 'end', width = 220 }) {
  return (
    <Popover trigger={trigger} align={align} width={width}>
      {({ close }) =>
        items.filter(Boolean).map((it, i) =>
          it.divider ? (
            <div key={`d${i}`} className="my-1 h-px bg-line" />
          ) : it.heading ? (
            <div key={`h${i}`} className="px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
              {it.heading}
            </div>
          ) : (
            <button
              key={it.label}
              type="button"
              disabled={it.disabled}
              onClick={() => {
                close();
                it.onClick?.();
              }}
              className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition disabled:opacity-40', it.tone === 'danger' ? 'text-danger hover:bg-danger/10' : 'text-ink-2 hover:bg-surface-3 hover:text-ink', it.active && 'bg-surface-3 text-ink')}
            >
              {it.icon && <it.icon size={16} className="shrink-0" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{it.label}</span>
                {it.description && <span className="block truncate text-xs text-ink-muted">{it.description}</span>}
              </span>
              {it.shortcut && <span className="text-xs text-ink-faint">{it.shortcut}</span>}
            </button>
          ),
        )
      }
    </Popover>
  );
}

/** CSS-only tooltip. Wrap any element. */
export function Tooltip({ content, side = 'top', children, className }) {
  if (!content) return children;
  const place = { top: 'bottom-full left-1/2 mb-2 -translate-x-1/2', bottom: 'top-full left-1/2 mt-2 -translate-x-1/2', right: 'left-full top-1/2 ml-2 -translate-y-1/2', left: 'right-full top-1/2 mr-2 -translate-y-1/2' }[side];
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span role="tooltip" className={cn('pointer-events-none absolute z-[95] hidden w-max max-w-[240px] animate-fade-in rounded-lg bg-ink px-2 py-1 text-xs font-medium text-canvas shadow-pop group-focus-within/tt:block group-hover/tt:block', place)}>
        {content}
      </span>
    </span>
  );
}

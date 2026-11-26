import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClockCounterClockwise, MagnifyingGlass, SquaresFour } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Kbd } from '@/design-system';
import { useSession } from '@/app/providers/SessionProvider';
import { productById, productsFor } from '@/app/products';
import { NAVS } from '@/app/navIndex';
import { ACTIONS } from '@/app/actions';
import { ProductMark } from './Brand';

const RECENT_KEY = 'qx-recent';

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}

/** Called by the app shell on every page view; keeps the last 8 distinct pages for ⌘K. */
export function rememberRecent(entry) {
  try {
    const list = [entry, ...readRecent().filter((r) => r.to !== entry.to)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage blocked */
  }
}

const allowed = (it, role) => !it.roles || it.roles.includes(role);

/** ⌘K: recent pages, quick actions, apps and every page the person can use. */
export function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState([]);
  const navigate = useNavigate();
  const listRef = useRef(null);
  const { role, tenant } = useSession();

  const ids = useMemo(() => {
    const list = productsFor(role, tenant.products).map((p) => p.id);
    if (role === 'superadmin') list.push('commons'); // the console only
    return list;
  }, [role, tenant.products]);

  const pages = useMemo(
    () =>
      ids.flatMap((pid) =>
        (NAVS[pid]?.groups || []).flatMap((g) =>
          g.items.filter((it) => allowed(it, role)).map((it) => ({ ...it, kind: 'page', productId: pid, hint: `${productById(pid)?.name}${g.label ? ` · ${g.label}` : ''}` })),
        ),
      ),
    [ids, role],
  );
  const actions = useMemo(() => ACTIONS.filter((a) => ids.includes(a.productId) && allowed(a, role)).map((a) => ({ ...a, kind: 'action', hint: productById(a.productId)?.name })), [ids, role]);
  const apps = useMemo(
    () =>
      role === 'superadmin'
        ? []
        : [{ kind: 'app', label: 'Home · all apps', to: '/home', icon: SquaresFour, hint: 'Qualia' }, ...productsFor(role, tenant.products).map((p) => ({ kind: 'app', label: p.name, to: p.path, productId: p.id, icon: p.icon, hint: p.tagline, keywords: p.description }))],
    [role, tenant.products],
  );

  const sections = useMemo(() => {
    const s = q.trim().toLowerCase();
    const hit = (e) => `${e.label} ${e.hint || ''} ${e.productId || ''} ${e.keywords || ''}`.toLowerCase().includes(s);
    if (!s) {
      const recentOk = recent.filter((r) => ids.includes(r.productId)).slice(0, 5).map((r) => ({ ...r, kind: 'recent', icon: ClockCounterClockwise, hint: productById(r.productId)?.name }));
      return [
        { label: 'Recent', items: recentOk },
        { label: 'Quick actions', items: actions.slice(0, 6) },
        { label: 'Apps', items: apps },
      ].filter((x) => x.items.length);
    }
    return [
      { label: 'Actions', items: actions.filter(hit) },
      { label: 'Pages', items: pages.filter(hit).slice(0, 10) },
      { label: 'Apps', items: apps.filter(hit) },
    ].filter((x) => x.items.length);
  }, [q, recent, ids, actions, pages, apps]);
  const flat = sections.flatMap((x) => x.items);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setRecent(readRecent());
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;
  const go = (e) => {
    navigate(e.to);
    onClose();
  };

  let i = -1;
  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 animate-fade-in bg-night/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-rise overflow-hidden rounded-3xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-5">
          <MagnifyingGlass size={18} className="text-ink-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search pages and actions"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, flat.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && flat[active]) go(flat[active]);
              else if (e.key === 'Escape') onClose();
            }}
            placeholder="Search pages and actions in any app…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} className="max-h-[56vh] overflow-y-auto p-2">
          {sections.map((sec) => (
            <div key={sec.label} className="mb-1 last:mb-0">
              <div className="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-[.08em] text-ink-faint">{sec.label}</div>
              <ul>
                {sec.items.map((e) => {
                  i += 1;
                  const idx = i;
                  const Icon = e.icon;
                  return (
                    <li key={`${sec.label}-${e.to}-${e.label}`}>
                      <button
                        data-active={idx === active}
                        onMouseMove={() => setActive(idx)}
                        onClick={() => go(e)}
                        className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', idx === active ? 'bg-surface-3' : '')}
                      >
                        {e.productId ? <ProductMark id={e.productId} size="xs" /> : <span className="flex h-6 w-6 items-center justify-center rounded-md border border-line text-ink-muted"><SquaresFour size={13} /></span>}
                        {Icon && e.kind !== 'app' && <Icon size={16} className="shrink-0 text-ink-muted" />}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{e.label}</span>
                        <span className="max-w-[45%] truncate text-xs text-ink-muted">{e.hint}</span>
                        {idx === active && <ArrowRight size={14} className="shrink-0 text-ink-muted" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {!flat.length && <div className="px-3 py-10 text-center text-sm text-ink-muted">Nothing matches “{q}”. Try a page name like “campaigns” or “call history”.</div>}
        </div>
        <div className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-2xs text-ink-muted">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          <span className="flex items-center gap-1"><Kbd>Esc</Kbd> close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

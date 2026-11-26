import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowClockwise, Bell, CaretUpDown, Check, CloudSlash, List, MagnifyingGlass, Question, SidebarSimple, SignOut, SquaresFour, Sparkle, UserSwitch, X } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { usePersistentState, useHotkey, useDocumentTitle, QueryErrorsProvider, useQueryErrors } from '@/lib/hooks';
import { Avatar, Badge, Button, Kbd, Menu, Popover, Spinner, Tooltip } from '@/design-system';
import { ROLES, TENANT_ROLES, useSession } from '@/app/providers/SessionProvider';
import { productById, productsFor } from '@/app/products';
import { ProductMark, QualiaLogo } from './Brand';
import { CommandPalette, rememberRecent } from './CommandPalette';
import { NotificationsPanel } from './NotificationsPanel';
import { ShellContext } from './ShellContext';
import { NoAccess, PageErrorBoundary } from './StatePages';

/** The sidebar item a path belongs to: exact match for `end` items, else the longest prefix. */
export function matchNav(nav, pathname) {
  let best = null;
  for (const g of nav?.groups || []) {
    for (const it of g.items) {
      const exact = pathname === it.to || pathname === `${it.to}/`;
      const prefix = !it.end && pathname.startsWith(`${it.to}/`);
      if ((exact || prefix) && (!best || exact || it.to.length > best.item.to.length)) {
        best = { item: it, exact };
        if (exact) return best;
      }
    }
  }
  return best;
}

/**
 * The frame every product uses: a compact sidebar that never scrolls at laptop heights,
 * and a top bar with search, Insights, notifications and the user menu.
 * nav = { groups: [{ label, items: [{ to, label, icon, end, roles, badge }] }] }
 * `internal` = the Qualia admin console: no product switcher, no tenant features.
 */
export function AppShell({ productId, nav, sidebarFooter, internal = productId === 'commons' }) {
  const [collapsed, setCollapsed] = usePersistentState('qx-sidebar-collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef(null);
  useEffect(() => {
    setMobileOpen(false);
    mainRef.current?.scrollTo({ top: 0 }); // each page opens at the top of its own scroll area
  }, [location.pathname]);
  useEffect(() => {
    document.body.dataset.product = productId;
    return () => {
      delete document.body.dataset.product;
    };
  }, [productId]);
  useHotkey('mod+k', useCallback(() => setPaletteOpen((o) => !o), []));
  useHotkey('mod+b', useCallback(() => setCollapsed((c) => !c), [setCollapsed]));

  // Page naming: sidebar label for sidebar routes, else what the page registers (detail, wizard, 404).
  const { role } = useSession();
  const product = productById(productId);
  const [registered, setPageTitle] = useState(null);
  const match = matchNav(nav, location.pathname);
  const pageTitle = match?.exact ? match.item.label : registered?.path === location.pathname ? registered.title : match?.item.label;
  const shell = useMemo(() => ({ productId, nav, setPageTitle }), [productId, nav]);

  // A role opening a page its sidebar hides gets a clear "no access" (product roots redirect on their own).
  // Admins may still open agent-only screens by link (to preview what agents see).
  const allowedHere = !match?.item.roles || match.item.roles.includes(role) || (role === 'admin' && match.item.roles.includes('agent'));
  const blocked = !allowedHere && location.pathname.replace(/\/$/, '') !== product?.path;
  const fallback = blocked && nav.groups.flatMap((g) => g.items).find((it) => !it.roles || it.roles.includes(role));
  useDocumentTitle(blocked ? 'No access' : pageTitle, product?.name);
  useEffect(() => {
    if (pageTitle && !blocked && pageTitle !== 'Page not found') rememberRecent({ to: location.pathname, label: pageTitle, productId });
  }, [pageTitle, blocked, location.pathname, productId]);

  return (
    <ShellContext.Provider value={shell}>
    <QueryErrorsProvider>
    <div data-product={productId} className="flex h-screen overflow-hidden bg-canvas">
      <aside className={cn('hidden h-full shrink-0 border-r border-line bg-surface transition-[width] duration-200 lg:block', collapsed ? 'w-[68px]' : 'w-[var(--sidebar-w)]')}>
        <Sidebar productId={productId} nav={nav} collapsed={collapsed} footer={sidebarFooter} internal={internal} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[264px] animate-rise border-r border-line bg-surface">
            <Sidebar productId={productId} nav={nav} onClose={() => setMobileOpen(false)} footer={sidebarFooter} internal={internal} />
          </aside>
        </div>
      )}
      {/* Sidebar and top bar stay fixed; only the page area (the outlet) scrolls. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar productId={productId} internal={internal} onMenu={() => setMobileOpen(true)} onCollapse={() => setCollapsed(!collapsed)} collapsed={collapsed} onSearch={() => setPaletteOpen(true)} />
        <main ref={mainRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Suspense
            fallback={
              <div className="flex h-[60vh] items-center justify-center">
                <Spinner size={22} />
              </div>
            }
          >
            <LoadErrorBanner />
            <PageErrorBoundary resetKey={location.pathname}>
              {blocked ? (
                <NoAccess productId={productId} page={match.item.label} backTo={fallback?.to || '/home'} backLabel={fallback ? `Go to ${fallback.label}` : undefined} />
              ) : (
                <Outlet />
              )}
            </PageErrorBoundary>
          </Suspense>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
    </QueryErrorsProvider>
    </ShellContext.Provider>
  );
}

/** One banner for every failed load on the page, with Retry (screens may also show their own ErrorState). */
function LoadErrorBanner() {
  const q = useQueryErrors();
  if (!q?.errors.length) return null;
  return (
    <div role="alert" className="sticky top-0 z-20 mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-danger/25 bg-surface p-3 pl-4 shadow-card sm:mx-6 lg:mx-8">
      <CloudSlash size={20} weight="duotone" className="shrink-0 text-danger" />
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-semibold text-ink">Some data didn’t load.</span> <span className="text-ink-muted">Check your connection and try again.</span>
      </div>
      <Button size="sm" variant="secondary" icon={ArrowClockwise} onClick={q.retryAll}>
        Retry
      </Button>
    </div>
  );
}

function Sidebar({ productId, nav, collapsed, onClose, footer, internal }) {
  const { role } = useSession();
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 shrink-0 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'gap-2 px-3')}>
        {internal ? <InternalBadge collapsed={collapsed} /> : <ProductSwitcher productId={productId} collapsed={collapsed} />}
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" className="ml-auto rounded-lg p-2 text-ink-muted hover:bg-surface-3">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3 no-scrollbar">
        {nav.groups.map((g) => {
          const items = g.items.filter((it) => !it.roles || it.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={g.label || 'main'} className="mb-3 last:mb-0">
              {g.label && !collapsed && <div className="px-3 pb-1 text-2xs font-semibold uppercase tracking-[.08em] text-ink-faint">{g.label}</div>}
              {g.label && collapsed && <div className="mx-auto mb-1.5 mt-1 h-px w-5 bg-line" />}
              <ul className="flex flex-col gap-px">
                {items.map((it) => (
                  <li key={it.to}>
                    <SideLink item={it} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {footer && !collapsed && <div className="border-t border-line p-2.5">{footer}</div>}
    </div>
  );
}

function SideLink({ item, collapsed }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'relative flex h-8 items-center gap-3 rounded-xl text-[13.5px] font-medium transition',
          collapsed ? 'w-10 justify-center' : 'px-3',
          isActive ? 'bg-brand/10 text-brand' : 'text-ink-2 hover:bg-surface-3 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && <span className="absolute -left-2.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" />}
          <Icon size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
          {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
          {!collapsed && item.badge != null && (
            <Badge tone={item.badgeTone || 'brand'} size="xs">
              {item.badge}
            </Badge>
          )}
          {collapsed && item.badge != null && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" />}
        </>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right" className="flex">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function InternalBadge({ collapsed }) {
  return (
    <Link to="/admin" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1">
      <QualiaLogo compact size={28} />
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate font-display text-[14px] font-bold leading-tight">Admin Console</span>
          <span className="block text-[11px] text-ink-muted">Qualia Bits · internal</span>
        </span>
      )}
    </Link>
  );
}

/** Current product; opens the list of every product the person can use. */
function ProductSwitcher({ productId, collapsed }) {
  const { role, tenant } = useSession();
  const navigate = useNavigate();
  const product = productById(productId);
  const list = productsFor(role, tenant.products);
  return (
    <Popover
      width={280}
      trigger={({ toggle }) => (
        <button onClick={toggle} className={cn('flex min-w-0 items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:bg-surface-3', !collapsed && 'flex-1')}>
          <ProductMark id={productId} size="sm" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[14px] font-bold leading-tight">{product?.name}</span>
                <span className="block truncate text-[11px] text-ink-muted">{tenant.name}</span>
              </span>
              <CaretUpDown size={14} className="shrink-0 text-ink-faint" />
            </>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div className="p-1">
          <button
            onClick={() => {
              close();
              navigate('/home');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-3"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line">
              <SquaresFour size={16} />
            </span>
            All apps
          </button>
          <div className="my-1 h-px bg-line" />
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                close();
                navigate(p.path);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-3"
            >
              <ProductMark id={p.id} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">{p.name}</span>
                <span className="block truncate text-xs text-ink-muted">{p.tagline}</span>
              </span>
              {p.id === productId && <Check size={14} className="text-brand" />}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

function Topbar({ productId, internal, onMenu, onCollapse, collapsed, onSearch }) {
  const { user, role, viewAs, signOut, tenant } = useSession();
  const navigate = useNavigate();
  const showInsights = !internal && role !== 'agent' && productId !== 'insights';
  const iconBtn = 'rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink';
  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:px-5">
      <button onClick={onMenu} aria-label="Open menu" className={cn(iconBtn, 'lg:hidden')}>
        <List size={19} />
      </button>
      <Tooltip content={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'} side="bottom" className="hidden lg:inline-flex">
        <button onClick={onCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className={iconBtn}>
          <SidebarSimple size={18} />
        </button>
      </Tooltip>
      {!internal && (
        <Tooltip content="All apps (Home)" side="bottom">
          <Link to="/home" aria-label="All apps" className={iconBtn}>
            <SquaresFour size={18} />
          </Link>
        </Tooltip>
      )}

      <button onClick={onSearch} className="ml-1 flex h-9 min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-left text-[13px] text-ink-faint transition-colors hover:border-line-strong">
        <MagnifyingGlass size={15} />
        <span className="flex-1 truncate">Search pages and actions…</span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-0.5">
        {showInsights && (
          <button onClick={() => navigate('/insights')} className="mr-1 hidden h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[13px] font-semibold text-ink-2 transition hover:border-line-strong hover:text-ink sm:inline-flex">
            <Sparkle size={15} weight="fill" className="text-product-businesspulse" />
            Ask Insights
          </button>
        )}
        <Popover
          align="end"
          width={280}
          trigger={({ toggle: t }) => (
            <button onClick={t} aria-label="Help and shortcuts" className={cn(iconBtn, 'hidden sm:inline-flex')}>
              <Question size={18} />
            </button>
          )}
        >
          <div className="p-2">
            <div className="px-1 pb-2 text-sm font-bold">Keyboard shortcuts</div>
            <ul className="flex flex-col gap-1.5 text-[13px] text-ink-2">
              {[
                ['Search pages and actions', ['⌘', 'K']],
                ['Collapse the sidebar', ['⌘', 'B']],
                ['Close a dialog or panel', ['Esc']],
              ].map(([label, keys]) => (
                <li key={label} className="flex items-center justify-between gap-3 px-1">
                  {label}
                  <span className="flex gap-0.5">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-line px-1 pt-2 text-xs text-ink-muted">Need help? Write to support@qualiabits.com</div>
          </div>
        </Popover>
        <Popover
          align="end"
          width={360}
          className="p-0"
          trigger={({ toggle: t }) => (
            <button onClick={t} aria-label="Notifications" className={cn(iconBtn, 'relative')}>
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
            </button>
          )}
        >
          {({ close }) => <NotificationsPanel onNavigate={close} />}
        </Popover>

        <Menu
          width={250}
          trigger={({ toggle: t }) => (
            <button onClick={t} className="ml-1 flex items-center gap-2 rounded-lg p-1 pr-1.5 transition-colors hover:bg-surface-3">
              <Avatar name={user?.name} size="sm" status="online" />
              <span className="hidden text-left md:block">
                <span className="block text-[13px] font-semibold leading-tight text-ink">{user?.name}</span>
                <span className="block text-[11px] text-ink-muted">{ROLES[role]?.label}</span>
              </span>
            </button>
          )}
          items={[
            { heading: internal ? `${user?.email} · Qualia Bits` : `${user?.email} · ${tenant.name}` },
            ...(internal ? [] : [{ label: 'All apps', icon: SquaresFour, onClick: () => navigate('/home') }]),
            ...(internal
              ? []
              : [
                  { divider: true },
                  { heading: 'Preview as' },
                  ...TENANT_ROLES.map((r) => ({
                    label: ROLES[r].label,
                    icon: UserSwitch,
                    active: r === role,
                    onClick: () => {
                      viewAs(r);
                      navigate('/home');
                    },
                  })),
                ]),
            { divider: true },
            {
              label: 'Sign out',
              icon: SignOut,
              tone: 'danger',
              onClick: () => {
                signOut();
                navigate(internal ? '/admin/login' : '/login');
              },
            },
          ]}
        />
      </div>
    </header>
  );
}

/** Small link for page-level "back" navigation. */
export function BackLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-muted hover:text-ink">
      ← {children}
    </Link>
  );
}

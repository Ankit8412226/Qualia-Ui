import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Broadcast, CaretRight, ChalkboardTeacher, ChatsCircle, ClockCounterClockwise, Headset, MagnifyingGlass, Megaphone, PaperPlaneRight, PhoneCall, Plus, ShieldCheck, SignOut, Sparkle, Star, CalendarCheck, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber, fmtPercent } from '@/lib/format';
import { useDocumentTitle, useHotkey } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, Delta, Kbd, Sparkline, StatusBadge } from '@/design-system';
import { useSession, ROLES } from '@/app/providers/SessionProvider';
import { productById, productsFor } from '@/app/products';
import { ProductMark, QualiaLogo } from '@/shared/layout';
import { CommandPalette } from '@/shared/layout/CommandPalette';

/* Today's headline per product, shown on its launcher card (mock). */
const PRODUCT_PULSE = {
  agentflow: { label: 'AI calls today', value: 2486, delta: 12.4, spark: [12, 18, 15, 22, 28, 26, 34], links: [['Campaigns', '/agentflow/campaigns'], ['Test call', '/agentflow/test-call']] },
  dialflow: { label: 'Agents on the floor', value: '38 / 45', delta: 4.1, spark: [30, 34, 33, 36, 40, 37, 38], links: [['Live floor', '/dialflow/realtime'], ['Agent report', '/dialflow/reports/apr']] },
  ultrachat: { label: 'Chats waiting', value: 18, delta: -22, inverse: true, spark: [40, 32, 30, 26, 24, 20, 18], links: [['Inbox', '/ultrachat/inbox'], ['Campaigns', '/ultrachat/campaigns']] },
  businesspulse: { label: 'Average QA score', value: '82.6', delta: 3.2, spark: [74, 76, 77, 79, 80, 81, 83], links: [['Call history', '/businesspulse/calls'], ['Ghost leads', '/businesspulse/ghost-leads']] },
};

const SUGGESTIONS = ['Kal kitne leads convert hue?', 'Which agents scored below 60 this week?', 'Compare AI vs human connect rate for November', 'Why did the Diwali WhatsApp campaign fail for 312 people?'];

/* Each item opens the screen where you act on it. */
const ACTIVITY = [
  { product: 'businesspulse', title: '3 calls failed a fatal check', meta: 'Kavya Iyer · Misleading pricing', time: '4 min', status: 'Failed', to: '/businesspulse/calls' },
  { product: 'agentflow', title: '“Wakad 2BHK leads” is 68% done', meta: '1,702 of 2,500 contacts called', time: '12 min', status: 'Running', to: '/agentflow/campaigns' },
  { product: 'ultrachat', title: 'Diwali offer delivered to 9,840 people', meta: '71% read · 6.2% replied', time: '40 min', status: 'Completed', to: '/ultrachat/campaigns' },
  { product: 'dialflow', title: 'Renewals Nov finished', meta: '1,240 leads · 38% connected', time: '3 h', status: 'Completed', to: '/dialflow/campaigns' },
];

/* The few things a manager starts most days, one click from Home. */
const MANAGER_ACTIONS = [
  { product: 'agentflow', label: 'New AI campaign', to: '/agentflow/campaigns/new', icon: Plus },
  { product: 'dialflow', label: 'Watch the live floor', to: '/dialflow/realtime', icon: Broadcast },
  { product: 'ultrachat', label: 'Send a WhatsApp campaign', to: '/ultrachat/campaigns/new', icon: Megaphone },
  { product: 'businesspulse', label: 'Review failed calls', to: '/businesspulse/calls', icon: WarningCircle },
];

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem('qx-recent')) || [];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const { user, role, tenant, signOut } = useSession();
  const navigate = useNavigate();
  const products = productsFor(role, tenant.products);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const [paletteOpen, setPaletteOpen] = useState(false);
  useHotkey('mod+k', useCallback(() => setPaletteOpen((o) => !o), []));
  useDocumentTitle('Home');

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 sm:px-8">
          <QualiaLogo />
          <span className="hidden h-6 w-px bg-line sm:block" />
          <span className="hidden text-sm font-medium text-ink-2 sm:block">{tenant.name}</span>
          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-9 min-w-0 max-w-xs flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-left text-[13px] text-ink-muted transition-colors hover:border-line-strong md:ml-6"
          >
            <MagnifyingGlass size={15} />
            <span className="flex-1 truncate">Search pages and actions…</span>
            <span className="hidden items-center gap-0.5 sm:flex">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <span className="flex items-center gap-2 rounded-xl p-1 pr-3">
              <Avatar name={user.name} size="sm" status="online" />
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-semibold leading-tight">{user.name}</span>
                <span className="block text-2xs text-ink-muted">{ROLES[role].label}</span>
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={SignOut}
              onClick={() => {
                signOut();
                navigate('/login');
              }}
            >
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 flex flex-col gap-1">
          <span className="text-sm font-medium text-ink-muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1 className="text-[30px] font-extrabold tracking-tight sm:text-[36px]">
            {greet}, {user.name.split(' ')[0]}
          </h1>
          <ContinueStrip products={products} />
        </div>

        {role === 'agent' ? <AgentHome products={products} /> : <ManagerHome products={products} />}
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function AskBar() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const go = (text) => navigate('/insights', { state: { ask: text } });
  return (
    <div className="relative overflow-hidden rounded-3xl bg-night p-6 text-white sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#FF9A3D] opacity-40 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-[#FF6A3D] opacity-30 blur-[90px]" />
      <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[.1em] text-white/60">
        <Sparkle size={14} weight="fill" className="text-[#FFB38A]" /> Insights
      </div>
      <h2 className="relative mt-2 text-xl font-bold text-white sm:text-2xl">Ask anything about your calls and chats</h2>
      <form
        className="relative mt-5 flex items-center gap-2 rounded-2xl bg-white/10 p-1.5 pl-4 ring-1 ring-white/15 focus-within:ring-white/40"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) go(q);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="English, Hindi ya Hinglish mein poochiye…" className="h-11 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/45" />
        <button type="submit" className="flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#0B1020] transition hover:bg-white/90">
          Ask <PaperPlaneRight size={15} weight="fill" />
        </button>
      </form>
      <div className="relative mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => go(s)} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/15 hover:text-white">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const pulse = PRODUCT_PULSE[product.id];
  return (
    <Card padded={false} className="group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-pop" data-product={product.id}>
      <Link to={product.path} className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between">
          <ProductMark id={product.id} size="md" />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-ink-muted transition group-hover:bg-brand group-hover:text-brand-ink">
            <ArrowUpRight size={15} weight="bold" />
          </span>
        </div>
        <div>
          <h3 className="text-[17px] font-bold">{product.name}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{product.description}</p>
        </div>
        {pulse && (
          <div className="mt-auto flex items-end justify-between gap-3 rounded-2xl bg-surface-2 p-3">
            <div>
              <div className="text-xs text-ink-muted">{pulse.label}</div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-display text-xl font-bold tabular">{typeof pulse.value === 'number' ? fmtNumber(pulse.value) : pulse.value}</span>
                <Delta value={pulse.delta} inverse={pulse.inverse} />
              </div>
            </div>
            <Sparkline data={pulse.spark} className="h-9 w-20" />
          </div>
        )}
      </Link>
      {pulse && (
        <div className="flex border-t border-line">
          {pulse.links.map(([label, to]) => (
            <Link key={to} to={to} className="flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium text-ink-2 transition first:border-r first:border-line hover:bg-surface-2 hover:text-ink">
              {label}
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function ManagerHome({ products }) {
  const work = products.filter((p) => p.id !== 'insights');
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Conversations today', value: '14,382', delta: 9.8, icon: ChatsCircle, sub: 'calls + WhatsApp chats', to: '/insights/reports' },
          { label: 'Connect rate', value: fmtPercent(41.6), delta: -2.1, icon: PhoneCall, sub: 'AI and human calls', to: '/agentflow/calls' },
          { label: 'Leads qualified', value: '612', delta: 14.2, icon: Star, sub: 'interested + site visits', to: '/agentflow/contacts' },
          { label: 'QA pass rate', value: fmtPercent(87.3), delta: 1.4, icon: ShieldCheck, sub: '2,104 calls scored', to: '/businesspulse' },
        ].map((k) => (
          <Link key={k.label} to={k.to} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-line-strong hover:shadow-pop">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink-2">
              <k.icon size={20} weight="duotone" />
            </span>
            <div className="min-w-0">
              <div className="text-xs text-ink-muted">{k.label}</div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold tabular">{k.value}</span>
                <Delta value={k.delta} />
              </div>
              <div className="truncate text-2xs text-ink-muted">{k.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      <section aria-label="Quick actions" className="flex flex-wrap gap-2">
        {MANAGER_ACTIONS.filter((a) => products.some((p) => p.id === a.product)).map((a) => (
          <Link
            key={a.to}
            to={a.to}
            data-product={a.product}
            className="inline-flex h-10 items-center gap-2.5 rounded-xl border border-line bg-surface pl-2 pr-3 text-[13px] font-semibold text-ink shadow-card transition hover:border-brand/40 hover:text-brand"
          >
            <ProductMark id={a.product} size="xs" />
            {a.label}
            <ArrowRight size={13} weight="bold" className="text-ink-faint" />
          </Link>
        ))}
      </section>

      {products.some((p) => p.id === 'insights') && <AskBar />}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold">Your apps</h2>
          <p className="text-sm text-ink-muted">Everything runs on one login. Switch apps any time from the top-left of the sidebar.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {work.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-[15px] font-bold">Across your apps</h3>
            <span className="text-xs text-ink-muted">Last few hours</span>
          </div>
          <ul className="-mx-2 divide-y divide-line/70">
            {ACTIVITY.filter((a) => products.some((p) => p.id === a.product)).map((a) => (
              <li key={a.title}>
                <Link to={a.to} className="group flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-surface-2">
                  <ProductMark id={a.product} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{a.title}</div>
                    <div className="truncate text-xs text-ink-muted">{a.meta}</div>
                  </div>
                  <StatusBadge status={a.status} />
                  <span className="hidden w-12 text-right text-xs text-ink-muted sm:block">{a.time} ago</span>
                  <CaretRight size={14} className="text-ink-faint transition group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="flex flex-col">
          <h3 className="text-[15px] font-bold">Get more from Qualia</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {[
              ['Connect ChatGPT or Claude', 'Ask about your calls from the assistant you already use.', '/insights/connect'],
              ['Turn on Ghost leads', 'Find high-intent calls where revenue was missed.', '/businesspulse/ghost-leads'],
              ['Add a WhatsApp follow-up', 'Send a template after every AI call.', '/ultrachat/templates'],
            ].map(([t, d, to]) => (
              <li key={t}>
                <Link to={to} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-surface-2">
                  <Sparkle size={16} weight="fill" className="mt-0.5 shrink-0 text-product-businesspulse" />
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">{t}</span>
                    <span className="block text-xs text-ink-muted">{d}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/** "Continue where you left off": the last pages opened in any app (kept by the app shell). */
function ContinueStrip({ products }) {
  const recent = useMemo(() => readRecent().filter((r) => products.some((p) => p.id === r.productId)).slice(0, 4), [products]);
  if (!recent.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <ClockCounterClockwise size={14} /> Continue where you left off
      </span>
      {recent.map((r) => (
        <Link key={r.to} to={r.to} className="inline-flex h-8 max-w-[260px] items-center gap-2 rounded-lg border border-line bg-surface pl-1 pr-2.5 text-[13px] font-medium text-ink-2 transition hover:border-line-strong hover:text-ink">
          <ProductMark id={r.productId} size="xs" />
          <span className="truncate">{r.label}</span>
          <span className="hidden truncate text-xs text-ink-muted sm:inline">· {productById(r.productId)?.name}</span>
        </Link>
      ))}
    </div>
  );
}

function AgentHome({ products }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-night p-6 text-white sm:p-8" data-product="dialflow">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#FF6A3D] opacity-40 blur-[90px]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex-1">
            <Badge tone="accent" dot>
              Shift starts 10:00
            </Badge>
            <h2 className="mt-3 text-2xl font-bold text-white">Ready to start calling?</h2>
            <p className="mt-1 text-sm text-white/65">You have 2 campaigns, 4 callbacks due today and 126 leads waiting.</p>
          </div>
          <Button as={Link} to="/dialflow/workspace" variant="accent" size="lg" icon={Headset}>
            Open workspace
          </Button>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Calls today', '0'], ['Talk time', '0m'], ['Yesterday’s QA', '84'], ['Callbacks due', '4']].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <div className="text-xs text-white/55">{l}</div>
              <div className="mt-0.5 font-display text-xl font-bold">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: CalendarCheck, tone: 'dialflow', title: '4 callbacks due', text: 'First at 11:30 with Sneha Kapoor', to: '/dialflow/callbacks', cta: 'View callbacks' },
          { icon: ChalkboardTeacher, tone: 'businesspulse', title: 'New coaching plan', text: 'Objection handling · 12 min practice with Diya', to: '/businesspulse/coach', cta: 'Start practice' },
          { icon: ChatsCircle, tone: 'ultrachat', title: '6 chats assigned to you', text: 'Oldest waiting 4 min', to: '/ultrachat/inbox', cta: 'Open inbox' },
        ].map((c) => (
          <Card key={c.title} className="flex flex-col gap-3" data-product={c.tone}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <c.icon size={20} weight="duotone" />
            </span>
            <div>
              <h3 className="text-[15px] font-bold">{c.title}</h3>
              <p className="text-[13px] text-ink-muted">{c.text}</p>
            </div>
            <Link to={c.to} className="mt-auto inline-flex items-center gap-1 text-[13px] font-semibold text-brand">
              {c.cta} <ArrowRight size={13} weight="bold" />
            </Link>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Your apps</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {products.map((p) => (
            <Link key={p.id} to={p.id === 'dialflow' ? '/dialflow/workspace' : p.id === 'ultrachat' ? '/ultrachat/inbox' : p.path} className={cn('flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop')}>
              <ProductMark id={p.id} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{p.name}</span>
                <span className="block truncate text-xs text-ink-muted">{p.tagline}</span>
              </span>
              <ArrowRight size={16} className="text-ink-faint" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

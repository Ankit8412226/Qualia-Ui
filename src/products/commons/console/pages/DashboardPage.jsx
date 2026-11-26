import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Broom, Buildings, ChartLineUp, ChatCircleDots, CheckCircle, Coins, Microphone, Plus, ShieldWarning, Users, Warning, Waveform } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtCompact, fmtCurrency, fmtNumber, fmtPercent, fmtRelative } from '@/lib/format';
import { Badge, Button, Card, CardHeader, Delta, Gauge, LiveIndicator, Skeleton, Sparkline, StackedBar, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader, ProductMark } from '@/shared/layout';
import { getDashboard } from '@/services/commons';
import { AddCreditsModal } from '../components/AddCreditsModal';
import { PRODUCT_BAR, productName } from '../components/ProductChips';

const REVENUE_SPLIT = [
  { id: 'agentflow', value: 176900 },
  { id: 'ultrachat', value: 92300 },
  { id: 'dialflow', value: 84600 },
  { id: 'businesspulse', value: 30800 },
];

export default function DashboardPage() {
  const { data, loading } = useQuery(() => getDashboard(), []);
  const [topUp, setTopUp] = useState(null);
  const toast = useToast();
  const k = data?.kpis;

  return (
    <Page>
      <PageHeader
        title="Platform overview"
        description="Every tenant, product and service at a glance."
        meta={<LiveIndicator updatedAt={data?.updatedAt} />}
        actions={
          <>
            <Button as={Link} to="/admin/voice-lab" icon={Microphone}>
              Voice lab
            </Button>
            <Button as={Link} to="/admin/tenants/new" variant="primary" icon={Plus}>
              Create tenant
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_2fr]">
          <HeroCard kpis={k} loading={loading} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Kpi loading={loading} icon={Buildings} label="Tenants" value={k && fmtNumber(k.tenants)} sub={k && `+${k.tenantsNew} this month`} to="/admin/tenants" />
            <Kpi loading={loading} icon={Users} label="Active users now" value={k && fmtNumber(k.activeUsers)} delta={k?.activeUsersDelta} spark={k?.spark.users} live />
            <Kpi loading={loading} icon={Waveform} label="AI minutes today" value={k && fmtCompact(k.aiMinutes)} delta={k?.aiMinutesDelta} spark={k?.spark.ai} product="agentflow" />
            <Kpi loading={loading} icon={ChartLineUp} label="Calls scored today" value={k && fmtNumber(k.callsScored)} delta={k?.callsScoredDelta} spark={k?.spark.scored} product="businesspulse" />
            <Kpi loading={loading} icon={ChatCircleDots} label="WhatsApp messages" value={k && fmtCompact(k.waMessages)} delta={k?.waMessagesDelta} spark={k?.spark.wa} product="ultrachat" />
            <Kpi
              loading={loading}
              icon={Coins}
              label="Low on credits"
              value={data && fmtNumber(data.lowCredits.length)}
              sub="tenants need a top-up"
              tone={data?.lowCredits.length ? 'warning' : undefined}
              onClick={() => document.getElementById('low-credits')?.scrollIntoView({ behavior: 'smooth' })}
            />
          </div>
        </div>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-bold">Products</h2>
            <p className="text-xs text-ink-muted">Users online, today’s volume against the last 14 days, and open issues.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[214px] rounded-2xl" />) : data.products.map((p) => <ProductHealthCard key={p.id} p={p} />)}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <SystemStatus services={data?.services} loading={loading} />
          <PassRateCard kpis={k} loading={loading} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <LowCredits tenants={data?.lowCredits} loading={loading} onTopUp={setTopUp} />
          <ActivityFeed items={data?.activity} loading={loading} />
        </div>

        <QuickActions />
      </div>

      <AddCreditsModal
        open={!!topUp}
        onClose={() => setTopUp(null)}
        tenantName={topUp?.tenant.name}
        products={topUp ? topUp.tenant.health.rows.map((r) => r.product) : ['agentflow']}
        defaultProduct={topUp?.product}
        onSubmit={({ product, amount, type }) => {
          toast({ title: type === 'Added' ? 'Credits added' : 'Limit updated', description: `${topUp.tenant.name} · ${productName(product)} · ${fmtNumber(amount)}`, tone: 'success' });
          setTopUp(null);
        }}
      />
    </Page>
  );
}

/* ---------- Hero: money first ---------- */

function HeroCard({ kpis, loading }) {
  const total = REVENUE_SPLIT.reduce((a, r) => a + r.value, 0);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-night p-6 text-white ring-1 ring-white/10">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-product-agentflow opacity-30 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-36 left-0 h-72 w-72 rounded-full bg-product-businesspulse opacity-25 blur-[90px]" />
      <div className="relative flex h-full flex-col gap-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.1em] text-white/55">Credits consumed today</div>
          {loading ? (
            <div className="mt-3 h-10 w-48 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="font-display text-[40px] font-bold leading-none tracking-tight tabular">{fmtCurrency(kpis.revenue)}</span>
              <Delta value={kpis.revenueDelta} className="bg-white/10 text-white" />
            </div>
          )}
          <div className="mt-1.5 text-xs text-white/55">vs same time yesterday · billed at plan rates</div>
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <StackedBar height="h-2" className="bg-white/10" segments={REVENUE_SPLIT.map((r) => ({ label: productName(r.id), value: r.value, tone: PRODUCT_BAR[r.id] }))} />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {REVENUE_SPLIT.map((r) => (
              <li key={r.id} className="min-w-0">
                <div className="flex items-center gap-1.5 text-2xs text-white/60">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', PRODUCT_BAR[r.id])} />
                  <span className="truncate">{productName(r.id)}</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold tabular">
                  {fmtCurrency(r.value)} <span className="text-2xs font-normal text-white/45">{Math.round((r.value / total) * 100)}%</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, delta, spark, product, tone, live, loading, to, onClick }) {
  const Tag = to ? Link : onClick ? 'button' : 'div';
  return (
    <Tag
      to={to}
      type={Tag === 'button' ? 'button' : undefined}
      onClick={onClick}
      data-product={product}
      className={cn(
        'group flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-line bg-surface p-4 text-left shadow-card transition',
        (to || onClick) && 'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop',
        tone === 'warning' && 'border-warning/40 bg-warning/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-ink-muted">{label}</span>
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', tone === 'warning' ? 'bg-warning/15 text-warning' : product ? 'bg-brand/10 text-brand' : 'bg-surface-3 text-ink-2')}>
          {live ? <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success" /> : <Icon size={15} weight="duotone" />}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display text-2xl font-bold leading-none tracking-tight tabular">{value}</div>
            <div className="mt-1.5 flex items-center gap-1.5 text-2xs text-ink-muted">
              {delta != null ? (
                <>
                  <Delta value={delta} /> <span className="truncate">vs yesterday</span>
                </>
              ) : (
                <span className="truncate">{sub}</span>
              )}
            </div>
          </div>
          {spark && <Sparkline data={spark} className="h-8 w-16 shrink-0" />}
        </div>
      )}
    </Tag>
  );
}

/* ---------- Product health ---------- */

function ProductHealthCard({ p }) {
  return (
    <Card padded={false} data-product={p.id} className="group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-pop">
      <Link to={p.to} className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <ProductMark id={p.id} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{productName(p.id)}</div>
            <div className="flex items-center gap-1.5 text-2xs text-ink-muted">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
              {fmtNumber(p.online)} online
            </div>
          </div>
          <ArrowRight size={14} className="text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-brand" />
        </div>
        <div>
          <div className="text-2xs text-ink-muted">{p.metric}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-display text-xl font-bold tabular">{fmtNumber(p.value)}</span>
            <Delta value={p.delta} />
          </div>
          <Sparkline data={p.spark} className="mt-2 h-10 w-full" />
        </div>
      </Link>
      <div className={cn('border-t px-4 py-2.5 text-xs', p.issues.length ? 'border-warning/30 bg-warning/5' : 'border-line')}>
        {p.issues.length ? (
          p.issues.map((i) => (
            <div key={i} className="flex items-start gap-1.5 text-ink-2">
              <Warning size={13} weight="fill" className="mt-px shrink-0 text-warning" />
              <span className="line-clamp-2">{i}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-1.5 text-ink-muted">
            <CheckCircle size={13} weight="fill" className="text-success" /> No open issues
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- System status ---------- */

const latencyTone = (ms) => (ms > 1200 ? 'text-danger' : ms > 700 ? 'text-warning' : 'text-ink');

function SystemStatus({ services, loading }) {
  const degraded = services?.filter((s) => s.status !== 'Operational') || [];
  return (
    <Card>
      <CardHeader
        title="System status"
        subtitle={loading ? 'Checking…' : degraded.length ? `${degraded.length} of ${services.length} services degraded` : 'All services operational'}
        actions={
          !loading && (
            <Badge tone={degraded.length ? 'warning' : 'success'} dot pulse>
              {degraded.length ? 'Degraded' : 'Operational'}
            </Badge>
          )
        }
      />
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-line/70">
          {services.map((s) => {
            const ok = s.status === 'Operational';
            return (
              <li key={s.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-3 sm:grid-cols-[auto_1fr_90px_90px_110px]">
                <ProductMark id={s.product} size="xs" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">{s.name}</div>
                  <div className={cn('truncate text-2xs', s.note ? 'text-warning' : 'text-ink-muted')}>{s.note || s.region}</div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className={cn('text-sm font-semibold tabular', latencyTone(s.latency))}>{fmtNumber(s.latency)} ms</div>
                  <div className="text-2xs text-ink-faint">p50 latency</div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold tabular text-ink">{fmtPercent(s.uptime, 2)}</div>
                  <div className="text-2xs text-ink-faint">30-day uptime</div>
                </div>
                <div className="text-right">
                  <Badge tone={ok ? 'success' : 'warning'} dot pulse={!ok}>
                    {s.status}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Business Pulse pass rate ---------- */

function PassRateCard({ kpis, loading }) {
  return (
    <Card className="flex flex-col">
      <CardHeader title="QA pass rate" subtitle="Business Pulse · all tenants · this week" actions={<ProductMark id="businesspulse" size="xs" />} />
      {loading ? (
        <Skeleton className="mx-auto h-28 w-48 rounded-2xl" />
      ) : (
        <>
          <div className="flex flex-1 items-center justify-center pt-2">
            <Gauge value={kpis.passRate} label={fmtPercent(kpis.passRate)} sublabel={`${fmtNumber(kpis.callsScored)} calls scored today`} size={200} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ['Last week', fmtPercent(kpis.passRatePrev)],
              ['Change', <Delta key="d" value={kpis.passRate - kpis.passRatePrev} suffix=" pts" />],
              ['Fatal fails', '1.8%'],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-surface-2 px-2 py-2">
                <div className="text-sm font-semibold tabular text-ink">{v}</div>
                <div className="text-2xs text-ink-muted">{l}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

/* ---------- Low credits ---------- */

function LowCredits({ tenants, loading, onTopUp }) {
  return (
    <Card id="low-credits" className="flex scroll-mt-24 flex-col">
      <CardHeader
        title="Tenants low on credits"
        subtitle="Below 20% of their limit. Top up before calls stop."
        actions={
          <Button as={Link} to="/admin/credits" size="sm" variant="ghost" iconRight={ArrowRight}>
            All credits
          </Button>
        }
      />
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <CheckCircle size={16} weight="fill" className="text-success" /> Every tenant has enough credits.
        </div>
      ) : (
        <ul className="-my-3 divide-y divide-line/70">
          {tenants.slice(0, 6).map((t) => {
            const worst = [...t.health.rows].sort((a, b) => a.left - b.left)[0];
            const critical = t.health.status === 'Critical';
            return (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <ProductMark id={worst.product} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/tenants/${t.id}`} className="block truncate text-sm font-medium text-ink hover:underline">
                    {t.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-surface-3 sm:w-32">
                      <div className={cn('h-full rounded-full', critical ? 'bg-danger' : 'bg-warning')} style={{ width: `${Math.max(3, worst.left * 100)}%` }} />
                    </div>
                    <span className={cn('truncate text-2xs font-medium tabular', critical ? 'text-danger' : 'text-warning')}>
                      {productName(worst.product)} · {worst.label}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant={critical ? 'soft' : 'secondary'} icon={Plus} onClick={() => onTopUp({ tenant: t, product: worst.product })}>
                  Add credits
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Activity ---------- */

const DOT = { success: 'bg-success', brand: 'bg-info', warning: 'bg-warning', danger: 'bg-danger' };

function ActivityFeed({ items, loading }) {
  return (
    <Card className="flex flex-col">
      <CardHeader title="Recent activity" subtitle="Changes by the Qualia team and the system" />
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : (
        <ol className="relative flex flex-col">
          {items.slice(0, 6).map((a, i, arr) => (
            <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < arr.length - 1 && <span className="absolute left-3 top-7 h-[calc(100%-20px)] w-px bg-line" />}
              <span className="relative shrink-0">
                <ProductMark id={a.product} size="xs" />
                <span className={cn('absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-surface', DOT[a.tone])} />
              </span>
              <div className="min-w-0 flex-1 text-[13px] leading-snug">
                <span className="font-semibold text-ink">{a.who}</span> <span className="text-ink-2">{a.text}</span>
                <div className="mt-0.5 text-2xs text-ink-faint">{fmtRelative(a.at)}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/* ---------- Quick actions ---------- */

const CACHE_NOTE = {
  agentflow: 'Agent prompts, voices and SIP routing',
  dialflow: 'Dialer lists, dispositions and SIP config',
  businesspulse: 'Checklists, scores and dashboards',
  ultrachat: 'Templates, flows and bot answers',
  insights: 'Saved answers and schema snapshots',
};

function QuickActions() {
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const clear = async (id) => {
    const ok = await confirm({
      title: `Clear ${productName(id)} cache?`,
      message: `${CACHE_NOTE[id]} will reload for every tenant. Live calls and chats keep running, but the first requests may be slower.`,
      confirmLabel: 'Clear cache',
    });
    if (!ok) return;
    setBusy(id);
    setTimeout(() => {
      setBusy(null);
      toast({ title: `${productName(id)} cache cleared`, description: 'Tenants pick up fresh config within a minute.', tone: 'success' });
    }, 900);
  };
  return (
    <Card>
      <CardHeader title="Quick actions" subtitle="Clear a product’s cache after a config change, or jump to a tool." />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.keys(CACHE_NOTE).map((id) => (
            <div key={id} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-line-strong hover:bg-surface-2">
              <ProductMark id={id} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-ink">{productName(id)}</div>
                <div className="truncate text-2xs text-ink-muted">{CACHE_NOTE[id]}</div>
              </div>
              <Button size="sm" icon={Broom} loading={busy === id} onClick={() => clear(id)}>
                Clear
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {[
            [Plus, 'Create tenant', 'Company, admin login and products', '/admin/tenants/new'],
            [ShieldWarning, 'Run spam check', 'See how phones label low-connect lines', '/admin/spam-check'],
            [Microphone, 'Compare voice stacks', 'A/B test STT, LLM and TTS on a real call', '/admin/voice-lab'],
          ].map(([Icon, t, d, to]) => (
            <Link key={t} to={to} className="group flex items-center gap-3 rounded-xl bg-surface-2 p-3 transition hover:bg-surface-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-canvas">
                <Icon size={16} weight="bold" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{t}</span>
                <span className="block truncate text-2xs text-ink-muted">{d}</span>
              </span>
              <ArrowRight size={14} className="text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}

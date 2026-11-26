import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Buildings,
  ChartBar,
  ClockCounterClockwise,
  Coins,
  DotsThree,
  EnvelopeSimple,
  Key,
  PencilSimple,
  Plus,
  Prohibit,
  SquaresFour,
  UserCirclePlus,
  Users,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtCompact, fmtDate, fmtDateTime, fmtNumber, fmtPhone, fmtRelative } from '@/lib/format';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ChartCard,
  Checkbox,
  DataTable,
  DescriptionList,
  EmptyState,
  Field,
  FilterBar,
  FilterSelect,
  Input,
  Menu,
  Modal,
  SecretInput,
  Segmented,
  Select,
  Skeleton,
  StatusBadge,
  Switch,
  Tabs,
  Timeline,
  TrendChart,
  useConfirm,
  useToast,
} from '@/design-system';
import { Page, PageHeader, ProductMark } from '@/shared/layout';
import { getTenant } from '@/services/commons';
import { PRODUCT_IDS, PRODUCT_SERIES, ROLES, USAGE_UNITS } from '@/mocks/commons';
import { AddCreditsModal } from '../components/AddCreditsModal';
import { ProductChips, ProductPill, productName } from '../components/ProductChips';
import { UsageMeter } from '../components/Bits';

const TABS = [
  { id: 'overview', label: 'Overview', icon: SquaresFour },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'products', label: 'Products', icon: Buildings },
  { id: 'credits', label: 'Credits', icon: Coins },
  { id: 'activity', label: 'Activity', icon: ClockCounterClockwise },
];

export default function TenantDetailPage() {
  const { id } = useParams();
  const { data: t, loading } = useQuery(() => getTenant(id), [id]);
  const [tab, setTab] = useState('overview');
  const [status, setStatus] = useState(null);
  const [credit, setCredit] = useState(null);
  const confirm = useConfirm();
  const toast = useToast();
  useEffect(() => setStatus(t?.status || null), [t]);

  if (!loading && !t)
    return (
      <Page>
        <EmptyState
          icon={Buildings}
          title="Tenant not found"
          description="It may have been deleted or the link is wrong."
          action={
            <Button as={Link} to="/admin/tenants" variant="primary">
              All tenants
            </Button>
          }
        />
      </Page>
    );

  const creditProducts = t ? Object.keys(t.credits).filter((p) => p !== 'dialflow') : [];

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Tenants', to: '/admin/tenants' }, { label: t?.name || '…' }]}
        title={
          loading ? (
            <Skeleton className="h-8 w-64" />
          ) : (
            <span className="flex items-center gap-3">
              <Avatar name={t.name} size="md" />
              {t.name}
            </span>
          )
        }
        meta={
          t && (
            <>
              <StatusBadge status={status} />
              <Badge tone={t.plan === 'Enterprise' ? 'solid' : 'neutral'}>{t.plan}</Badge>
              <span className="text-xs text-ink-muted">
                {t.industry} · {t.city} · since {fmtDate(t.createdAt)}
              </span>
              <ProductChips ids={t.products} />
            </>
          )
        }
        actions={
          t && (
            <>
              <Menu
                trigger={({ toggle }) => <Button iconOnly icon={DotsThree} aria-label="More actions" onClick={toggle} />}
                items={[
                  { label: 'Resend admin invite', icon: EnvelopeSimple, onClick: () => toast(`Invite sent to ${t.admin.email}`) },
                  { label: 'Reset admin password', icon: Key, onClick: () => toast({ title: 'Reset link sent', description: t.admin.email }) },
                  { divider: true },
                  status === 'Suspended'
                    ? { label: 'Reactivate tenant', icon: ArrowCounterClockwise, onClick: () => (setStatus('Active'), toast({ title: `${t.name} reactivated`, tone: 'success' })) }
                    : {
                        label: 'Suspend tenant',
                        icon: Prohibit,
                        tone: 'danger',
                        onClick: async () => {
                          if (await confirm({ title: `Suspend ${t.name}?`, message: `All ${fmtNumber(t.userCount)} users are signed out and running campaigns stop. Data is kept and you can reactivate any time.`, tone: 'danger', confirmLabel: 'Suspend tenant' })) {
                            setStatus('Suspended');
                            toast({ title: `${t.name} suspended`, tone: 'warning' });
                          }
                        },
                      },
                ]}
              />
              {creditProducts.length > 0 && (
                <Button variant="primary" icon={Plus} onClick={() => setCredit(creditProducts[0])}>
                  Add credits
                </Button>
              )}
            </>
          )
        }
      >
        <Tabs tabs={TABS.map((x) => (x.id === 'users' && t ? { ...x, count: t.users.length } : x))} value={tab} onChange={setTab} />
      </PageHeader>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="animate-rise" key={tab}>
          {tab === 'overview' && <OverviewTab t={t} onAddCredits={setCredit} />}
          {tab === 'users' && <UsersTab t={t} />}
          {tab === 'products' && <ProductsTab t={t} />}
          {tab === 'credits' && <CreditsTab t={t} onAddCredits={() => setCredit(creditProducts[0])} />}
          {tab === 'activity' && (
            <Card className="max-w-2xl">
              <CardHeader title="Activity" subtitle="Logins, credit changes, product and user changes" />
              <Timeline items={t.activity.map((a) => (a.title === 'Tenant created' ? { ...a, time: fmtDate(t.createdAt) } : a))} />
            </Card>
          )}
        </div>
      )}

      {t && (
        <AddCreditsModal
          open={!!credit}
          onClose={() => setCredit(null)}
          tenantName={t.name}
          products={creditProducts}
          defaultProduct={credit}
          onSubmit={({ product, amount }) => {
            setCredit(null);
            toast({ title: 'Credits updated', description: `${productName(product)} · ${fmtNumber(amount)}`, tone: 'success' });
          }}
        />
      )}
    </Page>
  );
}

/* ---------------- Overview ---------------- */

function creditLine(p, c) {
  if (p === 'agentflow') return { title: 'Call minutes', node: <UsageMeter used={c.used} total={c.total} unit="min" /> };
  if (p === 'businesspulse') return { title: 'Monthly QA credits', node: <UsageMeter used={c.used} total={c.total} unit="credits" /> };
  if (p === 'ultrachat')
    return {
      title: 'WhatsApp wallet',
      node: (
        <div>
          <div className="font-display text-2xl font-bold tabular">₹{fmtNumber(c.wallet)}</div>
          <div className={cn('text-xs', c.wallet < 1000 ? 'text-danger' : 'text-ink-muted')}>{c.wallet < 1000 ? 'Messages pause at ₹0' : '≈ ' + fmtNumber(Math.round(c.wallet / 0.88)) + ' marketing messages'}</div>
        </div>
      ),
    };
  if (p === 'dialflow') return { title: 'Agent seats', node: <UsageMeter used={c.activeAgents} total={c.maxAgents} unit="seats" /> };
  return null;
}

function OverviewTab({ t, onAddCredits }) {
  const [metric, setMetric] = useState(t.products[0]);
  const daily = t.usage.daily.slice(-14).map((d) => ({ date: d.date, value: d[metric] }));
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(t.credits).map(([p, c]) => {
          const line = creditLine(p, c);
          return (
            <Card key={p} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <ProductMark id={p} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{productName(p)}</div>
                  <div className="text-2xs text-ink-muted">{line.title}</div>
                </div>
                {p !== 'dialflow' && (
                  <Button size="xs" variant="ghost" icon={Plus} onClick={() => onAddCredits(p)}>
                    Add
                  </Button>
                )}
              </div>
              <div className="mt-auto">{line.node}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <ChartCard
          title="Daily usage"
          subtitle={`${USAGE_UNITS[metric]} · last 14 days`}
          icon={ChartBar}
          actions={t.products.length > 1 && <Segmented size="sm" value={metric} onChange={setMetric} options={t.products.map((p) => ({ value: p, label: productName(p) }))} />}
          table={{ columns: [{ key: 'date', header: 'Date' }, { key: 'value', header: USAGE_UNITS[metric], format: fmtNumber }], rows: daily }}
        >
          <TrendChart data={daily} series={[{ key: 'value', label: USAGE_UNITS[metric], color: PRODUCT_SERIES[metric] }]} height={260} valueFormatter={fmtCompact} />
        </ChartCard>
        <Card>
          <CardHeader title="Account" subtitle="Main contact and limits" />
          <DescriptionList
            items={[
              { label: 'Admin', value: t.admin.name },
              { label: 'Phone', value: fmtPhone(t.admin.phone) },
              { label: 'Email', value: t.admin.email },
              { label: 'GSTIN', value: <span className="font-mono text-xs">{t.gst}</span> },
              { label: 'Users', value: `${fmtNumber(t.userCount)} of ${fmtNumber(t.limits.maxUsers)}` },
              { label: 'Online now', value: fmtNumber(t.onlineNow) },
              { label: 'Plan', value: t.plan },
              { label: 'Created', value: fmtDate(t.createdAt) },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {t.products.map((p) => (
          <div key={p} className="rounded-2xl border border-line bg-surface p-4">
            <ProductPill id={p} />
            <div className="mt-3 font-display text-xl font-bold tabular">{fmtNumber(t.usage[p])}</div>
            <div className="text-2xs text-ink-muted">{USAGE_UNITS[p]} · last 30 days</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Users ---------------- */

function UserModal({ open, user, products, onClose, onSave }) {
  const [f, setF] = useState({ name: '', email: '', role: 'Agent', products: [] });
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setF(user ? { ...user } : { name: '', email: '', role: 'Agent', products: products.slice(0, 1) });
      setTouched(false);
    }
  }, [open, user, products]);
  const emailOk = /\S+@\S+\.\S+/.test(f.email);
  const valid = f.name.trim() && emailOk && f.products.length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={user ? PencilSimple : UserCirclePlus}
      title={user ? `Edit ${user.name}` : 'Add user'}
      description={user ? 'Changes apply at their next sign-in.' : 'They get an email to set their password.'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTouched(true);
              if (valid) onSave(f);
            }}
          >
            {user ? 'Save user' : 'Send invite'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={touched && !f.name.trim() && 'Enter a name'}>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Priya Sharma" autoFocus />
        </Field>
        <Field label="Work email" required error={touched && !emailOk && 'Enter a valid email'}>
          <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="priya@company.in" />
        </Field>
        <Field label="Role" className="sm:col-span-2">
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} options={ROLES} />
        </Field>
        <Field label="Product access" className="sm:col-span-2" error={touched && !f.products.length && 'Pick at least one product'}>
          <div className="grid gap-2 sm:grid-cols-2">
            {products.map((p) => {
              const on = f.products.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setF({ ...f, products: on ? f.products.filter((x) => x !== p) : [...f.products, p] })}
                  className={cn('flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm transition', on ? 'border-ink/40 bg-surface-2' : 'border-line hover:border-line-strong')}
                >
                  <Checkbox checked={on} onChange={() => undefined} />
                  <ProductMark id={p} size="xs" />
                  <span className="font-medium text-ink">{productName(p)}</span>
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function UsersTab({ t }) {
  const [users, setUsers] = useState(t.users);
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const confirm = useConfirm();
  const toast = useToast();
  const rows = users.filter(
    (u) => (!search || `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) && (!roles.length || roles.includes(u.role)) && (!statuses.length || statuses.includes(u.status)),
  );
  const suspend = async (u) => {
    if (u.status === 'Suspended') {
      setUsers((x) => x.map((y) => (y.id === u.id ? { ...y, status: 'Active' } : y)));
      return toast(`${u.name} reactivated`);
    }
    if (await confirm({ title: `Suspend ${u.name}?`, message: 'They are signed out right away and can’t sign in until reactivated. Their calls and chats stay.', tone: 'danger', confirmLabel: 'Suspend' })) {
      setUsers((x) => x.map((y) => (y.id === u.id ? { ...y, status: 'Suspended', online: false } : y)));
      toast({ title: `${u.name} suspended`, tone: 'warning' });
    }
  };
  return (
    <Card padded={false}>
      <div className="p-4">
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search name or email"
          canReset={!!(search || roles.length || statuses.length)}
          onReset={() => (setSearch(''), setRoles([]), setStatuses([]))}
          actions={
            <Button variant="primary" icon={UserCirclePlus} onClick={() => setEditing(null)}>
              Add user
            </Button>
          }
        >
          <FilterSelect label="Role" options={ROLES} value={roles} onChange={setRoles} />
          <FilterSelect label="Status" options={['Active', 'Invited', 'Suspended']} value={statuses} onChange={setStatuses} />
        </FilterBar>
      </div>
      <DataTable
        rows={rows}
        empty={<EmptyState icon={Users} title="No users match" description="Change the filters or add a user." compact />}
        columns={[
          {
            key: 'name',
            header: 'User',
            sortable: true,
            render: (u) => (
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={u.name} size="sm" status={u.online ? 'online' : undefined} />
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink">{u.name}</div>
                  <div className="truncate text-xs text-ink-muted">{u.email}</div>
                </div>
              </div>
            ),
          },
          { key: 'role', header: 'Role', sortable: true, render: (u) => <Badge tone={u.role === 'Admin' ? 'solid' : 'neutral'}>{u.role}</Badge> },
          { key: 'products', header: 'Access', render: (u) => <ProductChips ids={u.products} />, hideBelow: 'md' },
          { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
          { key: 'lastActive', header: 'Last active', sortable: true, sortValue: (u) => +new Date(u.lastActive || 0), render: (u) => (u.online ? <span className="text-success">Online</span> : u.lastActive ? fmtRelative(u.lastActive) : 'Never'), hideBelow: 'lg' },
          {
            key: 'x',
            header: '',
            align: 'right',
            render: (u) => (
              <Menu
                trigger={({ toggle }) => (
                  <button onClick={toggle} aria-label="User actions" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink">
                    <DotsThree size={18} weight="bold" />
                  </button>
                )}
                items={[
                  { label: 'Edit', icon: PencilSimple, onClick: () => setEditing(u) },
                  { label: u.status === 'Invited' ? 'Resend invite' : 'Send password reset', icon: EnvelopeSimple, onClick: () => toast(`Email sent to ${u.email}`) },
                  { divider: true },
                  { label: u.status === 'Suspended' ? 'Reactivate' : 'Suspend', icon: u.status === 'Suspended' ? ArrowCounterClockwise : Prohibit, tone: u.status === 'Suspended' ? undefined : 'danger', onClick: () => suspend(u) },
                ]}
              />
            ),
          },
        ]}
      />
      <UserModal
        open={editing !== undefined}
        user={editing}
        products={t.products}
        onClose={() => setEditing(undefined)}
        onSave={(f) => {
          if (editing) setUsers((x) => x.map((y) => (y.id === editing.id ? { ...y, ...f } : y)));
          else setUsers((x) => [{ ...f, id: `u_${Date.now()}`, status: 'Invited', lastActive: null }, ...x]);
          toast(editing ? 'User saved' : { title: 'Invite sent', description: f.email, tone: 'success' });
          setEditing(undefined);
        }}
      />
    </Card>
  );
}

/* ---------------- Products ---------------- */

function ProductsTab({ t }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [on, setOn] = useState(() => Object.fromEntries(PRODUCT_IDS.map((p) => [p, t.products.includes(p)])));
  const [cfg, setCfg] = useState(() => ({
    minutes: t.credits.agentflow?.total ?? 10000,
    concurrency: t.voice?.concurrency ?? 10,
    fishKey: t.voice?.fishKey ?? '',
    maxAgents: t.credits.dialflow?.maxAgents ?? 10,
    bpCredits: t.credits.businesspulse?.total ?? 2000,
    waOn: t.chat?.whatsappOn ?? true,
    aiOn: t.chat?.aiOn ?? false,
  }));
  const set = (k) => (v) => setCfg((c) => ({ ...c, [k]: v?.target ? v.target.value : v }));
  const toggle = async (p) => {
    if (on[p] && !(await confirm({ title: `Turn off ${productName(p)}?`, message: `${t.name} loses access right away. Settings and data are kept for 90 days.`, tone: 'danger', confirmLabel: 'Turn off' }))) return;
    setOn((o) => ({ ...o, [p]: !o[p] }));
    toast(`${productName(p)} ${on[p] ? 'turned off' : 'turned on'}`);
  };
  const link = { agentflow: '/admin/agentflow', dialflow: '/admin/dialflow', businesspulse: '/admin/businesspulse', ultrachat: '/admin/ultrachat', insights: '/admin/usage' };
  const body = {
    agentflow: (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monthly call minutes">
          <Input type="number" value={cfg.minutes} onChange={set('minutes')} />
        </Field>
        <Field label="Parallel calls">
          <Input type="number" value={cfg.concurrency} onChange={set('concurrency')} />
        </Field>
        <Field label="Fish Audio API key" optional hint="Platform key is used when empty." className="sm:col-span-2">
          <SecretInput value={cfg.fishKey} onChange={set('fishKey')} placeholder="Using platform key" />
        </Field>
      </div>
    ),
    dialflow: (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Max agents" hint={`${t.credits.dialflow?.activeAgents ?? 0} seats in use`}>
          <Input type="number" value={cfg.maxAgents} onChange={set('maxAgents')} />
        </Field>
        <Field label="SIP lines">
          <div className="flex h-10 items-center justify-between rounded-xl border border-line bg-surface-2 px-3 text-sm">
            <span className="tabular">{t.dialer?.sipLines.length ?? 0} lines</span>
            <Link to="/admin/dialflow" className="text-xs font-semibold text-ink hover:underline">
              Manage
            </Link>
          </div>
        </Field>
      </div>
    ),
    businesspulse: (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monthly credits" hint="1 credit = 1 call scored">
          <Input type="number" value={cfg.bpCredits} onChange={set('bpCredits')} />
        </Field>
        <Field label="Projects">
          <div className="flex h-10 items-center justify-between rounded-xl border border-line bg-surface-2 px-3 text-sm">
            <span className="truncate">{t.projects.map((p) => p.name).join(', ') || 'None yet'}</span>
            <Link to="/admin/businesspulse" className="shrink-0 text-xs font-semibold text-ink hover:underline">
              Features
            </Link>
          </div>
        </Field>
      </div>
    ),
    ultrachat: (
      <div className="flex flex-col gap-3">
        <Switch checked={cfg.waOn} onChange={set('waOn')} label="WhatsApp messaging" description="Inbox, campaigns and templates" size="sm" />
        <Switch checked={cfg.aiOn} onChange={set('aiOn')} label="AI replies" description="Bot answers before an agent picks up" size="sm" />
        <div className="text-xs text-ink-muted">
          Wallet: <b className="text-ink">₹{fmtNumber(t.credits.ultrachat?.wallet ?? 0)}</b>
        </div>
      </div>
    ),
    insights: <p className="text-sm text-ink-muted">Lets admins ask questions across every product this tenant uses. No extra setup.</p>,
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {PRODUCT_IDS.map((p) => (
        <Card key={p} className={cn('flex flex-col gap-4 transition', !on[p] && 'bg-surface-2')}>
          <div className="flex items-center gap-3">
            <ProductMark id={p} size="md" className={cn(!on[p] && 'opacity-40 grayscale')} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">{productName(p)}</div>
              <div className="text-xs text-ink-muted">{on[p] ? 'Enabled' : 'Not enabled for this tenant'}</div>
            </div>
            <Switch checked={on[p]} onChange={() => toggle(p)} />
          </div>
          {on[p] && (
            <>
              <div className="border-t border-line pt-4">{body[p]}</div>
              <div className="mt-auto flex items-center justify-between gap-2">
                <Link to={link[p]} className="text-xs font-medium text-ink-muted hover:text-ink">
                  Open {productName(p)} admin →
                </Link>
                <Button size="sm" variant="primary" onClick={() => toast({ title: `${productName(p)} settings saved`, tone: 'success' })}>
                  Save
                </Button>
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Credits ---------------- */

function CreditsTab({ t, onAddCredits }) {
  const [products, setProducts] = useState([]);
  const rows = useMemo(() => t.ledger.filter((r) => !products.length || products.includes(r.product)), [t.ledger, products]);
  return (
    <Card padded={false}>
      <div className="p-4">
        <FilterBar
          canReset={products.length > 0}
          onReset={() => setProducts([])}
          actions={
            <Button variant="primary" icon={Plus} onClick={onAddCredits}>
              Add credits
            </Button>
          }
        >
          <FilterSelect label="Product" options={[...new Set(t.ledger.map((r) => r.product))].map((p) => ({ value: p, label: productName(p) }))} value={products} onChange={setProducts} />
        </FilterBar>
      </div>
      <DataTable
        rows={rows}
        initialSort={{ key: 'at', dir: 'desc' }}
        empty={<EmptyState icon={Coins} title="No credit changes yet" description="Credits you add for this tenant show up here." compact />}
        columns={[
          { key: 'at', header: 'Date', sortable: true, sortValue: (r) => +new Date(r.at), render: (r) => fmtDateTime(r.at) },
          { key: 'product', header: 'Product', render: (r) => <ProductPill id={r.product} /> },
          { key: 'type', header: 'Type', render: (r) => <Badge tone={r.type === 'Added' ? 'success' : r.type === 'Limit set' ? 'info' : 'neutral'}>{r.type}</Badge> },
          {
            key: 'amount',
            header: 'Amount',
            align: 'right',
            sortable: true,
            render: (r) => (r.type === 'Usage reset' ? '—' : <span className="font-semibold text-ink">{r.unit === '₹' ? `₹${fmtNumber(r.amount)}` : `${fmtNumber(r.amount)} ${r.unit}`}</span>),
          },
          { key: 'reason', header: 'Reason', hideBelow: 'md' },
          { key: 'by', header: 'By', hideBelow: 'lg' },
        ]}
      />
    </Card>
  );
}

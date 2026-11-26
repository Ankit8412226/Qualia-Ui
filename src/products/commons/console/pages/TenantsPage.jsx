import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Buildings, DownloadSimple, Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtDate, fmtNumber } from '@/lib/format';
import { Avatar, Badge, Button, Card, DataTable, EmptyState, FilterBar, FilterSelect, MetricStrip, StatusBadge, Tooltip, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listTenants } from '@/services/commons';
import { PLANS, PRODUCT_IDS } from '@/mocks/commons';
import { ProductChips, productName } from '../components/ProductChips';

const HEALTH_BAR = { Healthy: 'bg-success', Low: 'bg-warning', Critical: 'bg-danger' };

export default function TenantsPage() {
  const { data, loading, error, reload } = useQuery(() => listTenants(), []);
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [health, setHealth] = useState([]);

  const tenants = useMemo(() => data || [], [data]);
  const rows = tenants.filter((t) => {
    const q = search.trim().toLowerCase();
    if (q && ![t.name, t.city, t.admin.email, t.industry].some((v) => v.toLowerCase().includes(q))) return false;
    if (products.length && !products.every((p) => t.products.includes(p))) return false;
    if (plans.length && !plans.includes(t.plan)) return false;
    if (statuses.length && !statuses.includes(t.status)) return false;
    if (health.length && !health.includes(t.health.status)) return false;
    return true;
  });
  const canReset = !!(search || products.length || plans.length || statuses.length || health.length);

  return (
    <Page>
      <PageHeader
        title="Tenants & users"
        description="Every company on Qualia, the products they use and how much credit they have left."
        actions={
          <>
            <Button icon={DownloadSimple} onClick={() => toast({ title: 'Export started', description: `${rows.length} tenants · CSV will download shortly.` })}>
              Export
            </Button>
            <Button as={Link} to="/admin/tenants/new" variant="primary" icon={Plus}>
              Create tenant
            </Button>
          </>
        }
      />

      <MetricStrip
        className="mb-6"
        items={[
          { label: 'Tenants', value: loading ? '—' : fmtNumber(tenants.length), sub: loading ? '' : `${tenants.filter((t) => t.status === 'Trial').length} on trial` },
          { label: 'Users', value: loading ? '—' : fmtNumber(tenants.reduce((a, t) => a + t.userCount, 0)), sub: loading ? '' : `${fmtNumber(tenants.reduce((a, t) => a + t.onlineNow, 0))} online now` },
          { label: 'Enterprise', value: loading ? '—' : fmtNumber(tenants.filter((t) => t.plan === 'Enterprise').length), sub: 'tenants' },
          { label: 'Low on credits', value: loading ? '—' : fmtNumber(tenants.filter((t) => t.health.status !== 'Healthy').length), sub: 'need a top-up' },
          { label: 'Suspended', value: loading ? '—' : fmtNumber(tenants.filter((t) => t.status === 'Suspended').length), sub: 'no access' },
        ]}
      />

      <Card padded={false}>
        <div className="p-4">
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search company, city or email"
            canReset={canReset}
            onReset={() => {
              setSearch('');
              setProducts([]);
              setPlans([]);
              setStatuses([]);
              setHealth([]);
            }}
          >
            <FilterSelect label="Products" options={PRODUCT_IDS.map((p) => ({ value: p, label: productName(p) }))} value={products} onChange={setProducts} />
            <FilterSelect label="Plan" options={PLANS} value={plans} onChange={setPlans} />
            <FilterSelect label="Status" options={['Active', 'Trial', 'Suspended']} value={statuses} onChange={setStatuses} />
            <FilterSelect label="Credits" options={['Healthy', 'Low', 'Critical']} value={health} onChange={setHealth} />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          onRowClick={(t) => navigate(`/admin/tenants/${t.id}`)}
          initialSort={{ key: 'createdAt', dir: 'desc' }}
          empty={
            <EmptyState
              icon={Buildings}
              title={canReset ? 'No tenants match' : 'No tenants yet'}
              description={canReset ? 'Try fewer filters.' : 'Create the first tenant to give a company access.'}
              compact
              action={
                !canReset && (
                  <Button as={Link} to="/admin/tenants/new" variant="primary" icon={Plus}>
                    Create tenant
                  </Button>
                )
              }
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Tenant',
              sortable: true,
              render: (t) => (
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={t.name} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{t.name}</div>
                    <div className="truncate text-xs text-ink-muted">
                      {t.industry} · {t.city}
                    </div>
                  </div>
                </div>
              ),
            },
            { key: 'products', header: 'Products', render: (t) => <ProductChips ids={t.products} /> },
            { key: 'plan', header: 'Plan', sortable: true, render: (t) => <Badge tone={t.plan === 'Enterprise' ? 'solid' : 'neutral'}>{t.plan}</Badge>, hideBelow: 'md' },
            {
              key: 'userCount',
              header: 'Users',
              align: 'right',
              sortable: true,
              render: (t) => (
                <span className="tabular">
                  <span className="font-semibold text-ink">{fmtNumber(t.userCount)}</span>
                  {t.onlineNow > 0 && <span className="ml-1.5 text-2xs text-success">{t.onlineNow} on</span>}
                </span>
              ),
            },
            { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
            {
              key: 'health',
              header: 'Credits',
              sortable: true,
              sortValue: (t) => t.health.left,
              render: (t) => <CreditHealth t={t} />,
            },
            { key: 'createdAt', header: 'Created', sortable: true, sortValue: (t) => +new Date(t.createdAt), render: (t) => fmtDate(t.createdAt), hideBelow: 'lg' },
          ]}
        />
      </Card>
    </Page>
  );
}

function CreditHealth({ t }) {
  if (!t.health.rows.length) return <span className="text-xs text-ink-faint">Seat based</span>;
  return (
    <Tooltip content={t.health.rows.map((r) => `${productName(r.product)}: ${r.label}`).join(' · ')}>
      <div className="flex w-32 flex-col gap-1">
        <div className="flex items-center justify-between text-2xs">
          <span className={cn('font-semibold', t.health.status === 'Healthy' ? 'text-ink-2' : t.health.status === 'Low' ? 'text-warning' : 'text-danger')}>{t.health.status}</span>
          <span className="tabular text-ink-faint">{Math.round(t.health.left * 100)}% left</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className={cn('h-full rounded-full', HEALTH_BAR[t.health.status])} style={{ width: `${Math.max(4, t.health.left * 100)}%` }} />
        </div>
      </div>
    </Tooltip>
  );
}

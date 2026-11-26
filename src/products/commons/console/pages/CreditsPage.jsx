import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartBar, Coins, DownloadSimple, Plus } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtCompact, fmtDateTime, fmtNumber } from '@/lib/format';
import { Badge, BarsChart, Button, Card, ChartCard, DataTable, DateRangeFilter, EmptyState, FilterBar, FilterSelect, Skeleton, useToast } from '@/design-system';
import { Page, PageHeader, ProductMark } from '@/shared/layout';
import { listCreditTx } from '@/services/commons';
import { CREDIT_PRODUCTS, PRODUCT_SERIES, TENANTS } from '@/mocks/commons';
import { AddCreditsModal } from '../components/AddCreditsModal';
import { ProductPill, productName } from '../components/ProductChips';

const TYPE_TONE = { Added: 'success', 'Limit set': 'info', 'Usage reset': 'neutral' };
const RANGE_DAYS = { today: 1, yesterday: 2, '7d': 7, '30d': 30, mtd: 26, custom: 365 };
const NOW = new Date('2026-11-26T23:59:00+05:30');
const amt = (r) => (r.unit === '₹' ? `₹${fmtNumber(r.amount)}` : `${fmtNumber(r.amount)} ${r.unit === 'min' ? 'min' : 'credits'}`);

export default function CreditsPage() {
  const { data, loading, setData, error, reload } = useQuery(() => listCreditTx(), []);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [types, setTypes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [range, setRange] = useState({ preset: '30d' });
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  const all = useMemo(() => data || [], [data]);
  const rows = all.filter((r) => {
    if ((NOW - new Date(r.at)) / 86400000 > RANGE_DAYS[range.preset]) return false;
    if (products.length && !products.includes(r.product)) return false;
    if (types.length && !types.includes(r.type)) return false;
    if (tenants.length && !tenants.includes(r.tenant)) return false;
    if (search && !`${r.tenant} ${r.reason} ${r.by}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const canReset = !!(search || products.length || types.length || tenants.length || range.preset !== '30d');

  const totals = CREDIT_PRODUCTS.map((p) => {
    const tx = rows.filter((r) => r.product === p && r.type === 'Added');
    return { p, sum: tx.reduce((a, r) => a + r.amount, 0), n: tx.length };
  });

  const weekly = useMemo(() => {
    const weeks = Array.from({ length: 6 }, (_, i) => ({ name: `W${i + 1}`, agentflow: 0, businesspulse: 0, ultrachat: 0 }));
    all.forEach((r) => {
      if (r.type !== 'Added') return;
      const w = 5 - Math.floor((NOW - new Date(r.at)) / (7 * 86400000));
      if (w >= 0 && w < 6) weeks[w][r.product] += r.product === 'ultrachat' ? r.amount / 1000 : r.amount / 1000;
    });
    return weeks.map((w, i) => ({ ...w, name: i === 5 ? 'This wk' : `${5 - i} wk ago` }));
  }, [all]);

  return (
    <Page>
      <PageHeader
        title="Credits"
        description="Every credit change across products: top-ups, limit changes and monthly resets."
        actions={
          <>
            <Button icon={DownloadSimple} onClick={() => toast({ title: 'Export started', description: `${rows.length} rows · CSV` })}>
              Export
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
              Add credits
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {totals.map((t) =>
          loading ? (
            <Skeleton key={t.p} className="h-28 rounded-2xl" />
          ) : (
            <Card key={t.p} className="flex items-center gap-4">
              <ProductMark id={t.p} size="md" />
              <div className="min-w-0">
                <div className="text-xs text-ink-muted">{productName(t.p)} added</div>
                <div className="font-display text-2xl font-bold tabular">{t.p === 'ultrachat' ? `₹${fmtCompact(t.sum)}` : fmtCompact(t.sum)}</div>
                <div className="text-2xs text-ink-faint">
                  {t.p === 'agentflow' ? 'call minutes' : t.p === 'businesspulse' ? 'QA credits' : 'wallet top-ups'} · {t.n} changes
                </div>
              </div>
            </Card>
          ),
        )}
      </div>

      <ChartCard
        className="mb-6"
        title="Credits added per week"
        subtitle="Thousands of units (minutes, QA credits, ₹) · last 6 weeks"
        icon={ChartBar}
        table={{ columns: [{ key: 'name', header: 'Week' }, ...CREDIT_PRODUCTS.map((p) => ({ key: p, header: `${productName(p)} (k)`, format: (v) => fmtNumber(v, { maximumFractionDigits: 1 }) }))], rows: weekly }}
      >
        <BarsChart data={weekly} series={CREDIT_PRODUCTS.map((p) => ({ key: p, label: productName(p), color: PRODUCT_SERIES[p] }))} height={220} valueFormatter={(v) => `${fmtNumber(v, { maximumFractionDigits: 0 })}k`} />
      </ChartCard>

      <Card padded={false}>
        <div className="p-4">
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search tenant, reason or person"
            canReset={canReset}
            onReset={() => (setSearch(''), setProducts([]), setTypes([]), setTenants([]), setRange({ preset: '30d' }))}
          >
            <DateRangeFilter value={range} onChange={setRange} />
            <FilterSelect label="Product" options={CREDIT_PRODUCTS.map((p) => ({ value: p, label: productName(p) }))} value={products} onChange={setProducts} />
            <FilterSelect label="Type" options={['Added', 'Limit set', 'Usage reset']} value={types} onChange={setTypes} />
            <FilterSelect label="Tenant" options={[...new Set(all.map((r) => r.tenant))].sort()} value={tenants} onChange={setTenants} searchable />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          pageSize={12}
          initialSort={{ key: 'at', dir: 'desc' }}
          empty={<EmptyState icon={Coins} title="No credit changes in this view" description="Widen the date range or clear filters." compact />}
          columns={[
            { key: 'at', header: 'Date', sortable: true, sortValue: (r) => +new Date(r.at), render: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.at)}</span> },
            { key: 'product', header: 'Product', render: (r) => <ProductPill id={r.product} /> },
            {
              key: 'tenant',
              header: 'Tenant',
              sortable: true,
              render: (r) => (
                <Link to={`/admin/tenants/${r.tenantId}`} onClick={(e) => e.stopPropagation()} className="font-medium text-ink hover:underline">
                  {r.tenant}
                </Link>
              ),
            },
            { key: 'type', header: 'Type', render: (r) => <Badge tone={TYPE_TONE[r.type]}>{r.type}</Badge> },
            { key: 'amount', header: 'Amount', align: 'right', sortable: true, render: (r) => (r.type === 'Usage reset' ? '—' : <span className="font-semibold text-ink">{(r.type === 'Added' ? '+' : '') + amt(r)}</span>) },
            { key: 'by', header: 'By', hideBelow: 'lg' },
            { key: 'reason', header: 'Reason', hideBelow: 'md', render: (r) => <span className="block max-w-[220px] truncate">{r.reason}</span> },
          ]}
        />
      </Card>

      <AddCreditsModal
        open={adding}
        onClose={() => setAdding(false)}
        tenants={TENANTS.filter((t) => t.products.some((p) => CREDIT_PRODUCTS.includes(p))).map((t) => ({ id: t.id, name: t.name }))}
        onSubmit={({ product, tenantId, type, amount, reason }) => {
          const t = TENANTS.find((x) => x.id === tenantId);
          setData((d) => [{ id: `ctx_${Date.now()}`, product, tenantId, tenant: t.name, type, amount, unit: { agentflow: 'min', businesspulse: 'credits', ultrachat: '₹' }[product], by: 'You', reason, at: new Date() }, ...d]);
          setAdding(false);
          toast({ title: type === 'Added' ? 'Credits added' : 'Limit set', description: `${t.name} · ${productName(product)} · ${fmtNumber(amount)}`, tone: 'success' });
        }}
      />
    </Page>
  );
}

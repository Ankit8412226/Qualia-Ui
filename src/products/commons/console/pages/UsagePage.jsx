import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartBar, DownloadSimple, Gauge as GaugeIcon } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtCompact, fmtNumber } from '@/lib/format';
import { BarsChart, Button, Card, ChartCard, DataTable, DateRangeFilter, EmptyState, FilterBar, FilterSelect, Segmented, Skeleton, useToast } from '@/design-system';
import { Page, PageHeader, ProductMark } from '@/shared/layout';
import { getUsage } from '@/services/commons';
import { PRODUCT_SERIES, USAGE_UNITS } from '@/mocks/commons';
import { ProductChips, productName } from '../components/ProductChips';

const DAYS = { today: 1, yesterday: 1, '7d': 7, '30d': 30, mtd: 26, custom: 30 };
/* Minutes are comparable across Agent Flow and DialFlow; messages and scored calls are not, so each metric gets its own chart. */
const METRICS = [
  { id: 'minutes', label: 'Call minutes', products: ['agentflow', 'dialflow'] },
  { id: 'messages', label: 'WhatsApp messages', products: ['ultrachat'] },
  { id: 'scored', label: 'Calls scored', products: ['businesspulse'] },
  { id: 'questions', label: 'Insights questions', products: ['insights'] },
];

export default function UsagePage() {
  const { data, loading, error, reload } = useQuery(() => getUsage(), []);
  const [tenants, setTenants] = useState([]);
  const [range, setRange] = useState({ preset: '30d' });
  const [metric, setMetric] = useState('minutes');
  const toast = useToast();
  const navigate = useNavigate();

  const days = DAYS[range.preset];
  const picked = useMemo(() => (data ? data.tenants.filter((t) => !tenants.length || tenants.includes(t.tenantId)) : []), [data, tenants]);
  const scale = data ? days / 30 : 1;

  const m = METRICS.find((x) => x.id === metric);
  const daily = useMemo(() => {
    if (!data) return [];
    const src = tenants.length ? null : data.daily;
    const base = src || picked[0]?.daily || [];
    return base.slice(-days).map((d, i) => {
      const row = { name: d.date };
      m.products.forEach((p) => {
        row[p] = src ? d[p] : picked.reduce((a, t) => a + (t[p] != null ? t.daily.slice(-days)[i][p] : 0), 0);
      });
      return row;
    });
  }, [data, picked, tenants.length, days, m]);

  const totals = ['agentflow', 'dialflow', 'businesspulse', 'ultrachat', 'insights'].map((p) => ({ p, v: Math.round(picked.reduce((a, t) => a + (t[p] || 0), 0) * scale) }));

  return (
    <Page>
      <PageHeader
        title="Usage"
        description="What each tenant used, per product, for any date range."
        actions={
          <Button variant="primary" icon={DownloadSimple} onClick={() => toast({ title: 'Export started', description: `${picked.length} tenants · ${days} days · Excel` })}>
            Export
          </Button>
        }
      >
        <FilterBar canReset={!!(tenants.length || range.preset !== '30d')} onReset={() => (setTenants([]), setRange({ preset: '30d' }))}>
          <FilterSelect label="Tenant" options={(data?.tenants || []).map((t) => ({ value: t.tenantId, label: t.tenant }))} value={tenants} onChange={setTenants} searchable />
          <DateRangeFilter value={range} onChange={setRange} />
        </FilterBar>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {totals.map((t) =>
          loading ? (
            <Skeleton key={t.p} className="h-24 rounded-2xl" />
          ) : (
            <Card key={t.p} className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <ProductMark id={t.p} size="xs" />
                <span className="truncate text-xs font-medium text-ink-muted">{productName(t.p)}</span>
              </div>
              <div className="font-display text-2xl font-bold tabular">{fmtCompact(t.v)}</div>
              <div className="text-2xs text-ink-faint">{USAGE_UNITS[t.p]}</div>
            </Card>
          ),
        )}
      </div>

      <ChartCard
        className="mb-6"
        title={`${m.label} by day`}
        subtitle={tenants.length ? `${tenants.length} tenant${tenants.length > 1 ? 's' : ''}` : 'All tenants'}
        icon={ChartBar}
        actions={<Segmented size="sm" value={metric} onChange={setMetric} options={METRICS.map((x) => ({ value: x.id, label: x.label }))} />}
        table={{ columns: [{ key: 'name', header: 'Date' }, ...m.products.map((p) => ({ key: p, header: productName(p), format: fmtNumber }))], rows: daily }}
      >
        {loading ? <Skeleton className="h-[260px]" /> : <BarsChart data={daily} stacked={m.products.length > 1} series={m.products.map((p) => ({ key: p, label: productName(p), color: PRODUCT_SERIES[p] }))} height={260} valueFormatter={fmtCompact} />}
      </ChartCard>

      <Card padded={false}>
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h3 className="text-[15px] font-bold">By tenant</h3>
            <p className="text-xs text-ink-muted">Each product in its own unit · — means not subscribed</p>
          </div>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={picked}
          rowKey="tenantId"
          onRowClick={(t) => navigate(`/admin/tenants/${t.tenantId}`)}
          initialSort={{ key: 'agentflow', dir: 'desc' }}
          empty={<EmptyState icon={GaugeIcon} title="No usage in this range" compact />}
          columns={[
            {
              key: 'tenant',
              header: 'Tenant',
              sortable: true,
              render: (t) => (
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-semibold text-ink">{t.tenant}</span>
                  <ProductChips ids={t.products} />
                </div>
              ),
            },
            ...['agentflow', 'dialflow', 'businesspulse', 'ultrachat', 'insights'].map((p) => ({
              key: p,
              header: (
                <span className="inline-flex items-center gap-1.5">
                  <ProductMark id={p} size="xs" className="h-4 w-4 rounded" />
                  {USAGE_UNITS[p]}
                </span>
              ),
              align: 'right',
              sortable: true,
              sortValue: (t) => t[p] ?? -1,
              hideBelow: p === 'insights' ? 'xl' : p === 'businesspulse' ? 'lg' : undefined,
              render: (t) => (t[p] == null ? <span className="text-ink-faint">—</span> : fmtNumber(Math.round(t[p] * scale))),
            })),
          ]}
        />
      </Card>
    </Page>
  );
}

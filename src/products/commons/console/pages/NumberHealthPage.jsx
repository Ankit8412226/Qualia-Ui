import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heartbeat, Phone, PhoneDisconnect, ShieldWarning } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtNumber, fmtPercent, fmtPhone, fmtRelative } from '@/lib/format';
import { Button, Callout, Card, DataTable, Delta, EmptyState, FilterBar, FilterSelect, LiveIndicator, Sparkline, StatCard, StatGrid, StatusBadge } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listNumberHealth } from '@/services/commons';
import { ProductPill, productName } from '../components/ProductChips';

export default function NumberHealthPage() {
  const { data, loading, error, reload } = useQuery(() => listNumberHealth(), []);
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState([]);
  const [verdicts, setVerdicts] = useState([]);
  const [products, setProducts] = useState([]);

  const lines = useMemo(() => data?.lines || [], [data]);
  const rows = lines.filter(
    (l) =>
      (!search || l.number.includes(search.replace(/\D/g, ''))) &&
      (!tenants.length || tenants.includes(l.tenant)) &&
      (!verdicts.length || verdicts.includes(l.verdict)) &&
      (!products.length || products.includes(l.product)),
  );
  const count = (v) => lines.filter((l) => l.verdict === v).length;
  const spam = count('Likely spam');
  const down = count('Line down');

  return (
    <Page>
      <PageHeader
        title="Number health"
        description="Every tenant’s calling lines. Today’s connect rate against each line’s own 14-day baseline."
        meta={<LiveIndicator updatedAt={data?.updatedAt} />}
        actions={
          <Button as={Link} to="/admin/spam-check" variant="primary" icon={ShieldWarning}>
            Spam check
          </Button>
        }
      />

      <StatGrid cols={4} className="mb-6">
        <StatCard loading={loading} label="Lines tracked" value={fmtNumber(lines.length)} icon={Phone} tone="neutral" hint={`${new Set(lines.map((l) => l.tenantId)).size} tenants`} />
        <StatCard loading={loading} label="Healthy" value={fmtNumber(count('Healthy'))} icon={Heartbeat} tone="success" hint="within 25% of baseline" />
        <StatCard loading={loading} label="Likely spam" value={fmtNumber(spam)} icon={ShieldWarning} tone="danger" hint="connect rate fell sharply" onClick={() => setVerdicts(['Likely spam'])} />
        <StatCard loading={loading} label="Line down" value={fmtNumber(down)} icon={PhoneDisconnect} tone="warning" hint="no connected calls today" onClick={() => setVerdicts(['Line down'])} />
      </StatGrid>

      {!loading && spam > 0 && (
        <Callout
          tone="danger"
          className="mb-6"
          title={`${spam} line${spam > 1 ? 's look' : ' looks'} flagged as spam`}
          action={
            <Button as={Link} to="/admin/spam-check" size="sm" iconRight={ArrowRight}>
              See labels
            </Button>
          }
        >
          Phones are likely showing a spam label. Rotate the number or ask the operator to re-verify it.
        </Callout>
      )}

      <Card padded={false}>
        <div className="p-4">
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search number"
            canReset={!!(search || tenants.length || verdicts.length || products.length)}
            onReset={() => (setSearch(''), setTenants([]), setVerdicts([]), setProducts([]))}
          >
            <FilterSelect label="Tenant" options={[...new Set(lines.map((l) => l.tenant))].sort()} value={tenants} onChange={setTenants} searchable />
            <FilterSelect label="Verdict" options={['Healthy', 'Likely spam', 'Line down']} value={verdicts} onChange={setVerdicts} />
            <FilterSelect label="Product" options={['agentflow', 'dialflow'].map((p) => ({ value: p, label: productName(p) }))} value={products} onChange={setProducts} />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          pageSize={12}
          initialSort={{ key: 'change', dir: 'asc' }}
          rowClassName={(l) => (l.verdict === 'Likely spam' ? 'bg-danger/[.03]' : undefined)}
          empty={<EmptyState icon={Phone} title="No lines match" description="Clear the filters to see every line." compact />}
          columns={[
            {
              key: 'number',
              header: 'Line',
              render: (l) => (
                <div className="min-w-0">
                  <div className="font-medium tabular text-ink">{fmtPhone(l.number)}</div>
                  <div className="truncate text-xs text-ink-muted">
                    {l.tenant} · {l.provider}
                  </div>
                </div>
              ),
            },
            { key: 'product', header: 'Product', render: (l) => <ProductPill id={l.product} />, hideBelow: 'lg' },
            {
              key: 'trend',
              header: '14 days',
              render: (l) => <Sparkline data={l.spark} trend className={cn('h-8 w-28', l.verdict !== 'Healthy' && 'opacity-100')} />,
              hideBelow: 'md',
            },
            {
              key: 'connectToday',
              header: 'Connect today',
              align: 'right',
              sortable: true,
              render: (l) => <span className={cn('font-semibold', l.verdict === 'Healthy' ? 'text-ink' : 'text-danger')}>{fmtPercent(l.connectToday, 0)}</span>,
            },
            { key: 'baseline', header: 'Baseline', align: 'right', render: (l) => fmtPercent(l.baseline, 0) },
            {
              key: 'change',
              header: 'Change',
              align: 'right',
              sortable: true,
              sortValue: (l) => l.connectToday / l.baseline,
              render: (l) => <Delta value={((l.connectToday - l.baseline) / l.baseline) * 100} />,
            },
            { key: 'callsToday', header: 'Calls today', align: 'right', render: (l) => fmtNumber(l.callsToday), hideBelow: 'xl' },
            {
              key: 'verdict',
              header: 'Verdict',
              render: (l) =>
                l.verdict === 'Likely spam' ? (
                  <Link to="/admin/spam-check" className="inline-flex items-center gap-1 hover:opacity-80" title="See spam-check result">
                    <StatusBadge status={l.verdict} />
                    <ArrowRight size={12} className="text-danger" />
                  </Link>
                ) : (
                  <span title={l.verdict === 'Line down' ? `Last call ${fmtRelative(l.lastCallAt)}` : undefined}>
                    <StatusBadge status={l.verdict} />
                  </span>
                ),
            },
          ]}
        />
      </Card>
    </Page>
  );
}

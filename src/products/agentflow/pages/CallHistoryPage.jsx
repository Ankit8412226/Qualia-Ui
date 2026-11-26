import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ClockCounterClockwise, DownloadSimple, PhoneX } from '@phosphor-icons/react';
import { fmtCurrency, fmtDateTime, fmtDuration, fmtNumber, fmtPercent, fmtPhone } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, DataTable, DateRangeFilter, EmptyState, FilterBar, FilterSelect, MetricStrip, Skeleton, StatusBadge, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer } from '@/shared/patterns';
import { listCalls } from '@/services/agentflow';

const DIRECTIONS = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
];

export function DirectionLabel({ direction }) {
  const Icon = direction === 'inbound' ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
      <Icon size={12} weight="bold" className={direction === 'inbound' ? 'text-info' : 'text-brand'} />
      {direction === 'inbound' ? 'Inbound' : 'Outbound'}
    </span>
  );
}

export default function CallHistoryPage() {
  const [range, setRange] = useState({ preset: '7d' });
  const [search, setSearch] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [directions, setDirections] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [dispositions, setDispositions] = useState([]);
  const [open, setOpen] = useState(null);
  const toast = useToast();
  const { data: calls, loading, error, reload } = useQuery(() => listCalls({ preset: range.preset }), [range.preset]);

  const all = calls || [];
  const opts = useMemo(
    () => ({
      campaigns: [...new Set(all.map((c) => c.campaign))].sort(),
      statuses: [...new Set(all.map((c) => c.status))],
      dispositions: [...new Set(all.map((c) => c.disposition).filter(Boolean))].sort(),
    }),
    [all],
  );

  const q = search.trim().toLowerCase();
  const rows = all.filter(
    (c) =>
      (!q || c.contact.name.toLowerCase().includes(q) || c.contact.phone.includes(q.replace(/\D/g, '') || '§')) &&
      (!campaigns.length || campaigns.includes(c.campaign)) &&
      (!directions.length || directions.includes(c.direction)) &&
      (!statuses.length || statuses.includes(c.status)) &&
      (!dispositions.length || dispositions.includes(c.disposition)),
  );

  const connected = rows.filter((c) => c.status === 'Completed');
  const talk = connected.reduce((a, c) => a + c.duration, 0);
  const cost = rows.reduce((a, c) => a + (c.cost || 0), 0);
  const canReset = !!(search || campaigns.length || directions.length || statuses.length || dispositions.length);
  const reset = () => {
    setSearch('');
    setCampaigns([]);
    setDirections([]);
    setStatuses([]);
    setDispositions([]);
  };

  return (
    <Page>
      <PageHeader
        title="Call history"
        description="Every AI call, outbound and inbound, with recording, transcript and what was collected."
        actions={
          <Button icon={DownloadSimple} onClick={() => toast({ title: 'Export started', description: `${fmtNumber(rows.length)} calls. We will email the CSV when it is ready.`, tone: 'success' })} disabled={!rows.length}>
            Export
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="mb-5 h-[76px] w-full rounded-2xl" />
      ) : (
        <MetricStrip
          className="mb-5"
          items={[
            { label: 'Calls', value: fmtNumber(rows.length) },
            { label: 'Connected', value: fmtNumber(connected.length), sub: rows.length ? `${fmtPercent((connected.length / rows.length) * 100, 0)} connect rate` : null },
            { label: 'Talk time', value: fmtDuration(talk) },
            { label: 'Avg call', value: fmtDuration(connected.length ? talk / connected.length : 0) },
            { label: 'Cost', value: fmtCurrency(cost) },
          ]}
        />
      )}

      <Card padded={false} className="overflow-hidden">
        <div className="border-b border-line p-4">
          <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search name or number" onReset={reset} canReset={canReset}>
            <DateRangeFilter value={range} onChange={setRange} />
            <FilterSelect label="Campaign" options={opts.campaigns} value={campaigns} onChange={setCampaigns} searchable />
            <FilterSelect label="Direction" options={DIRECTIONS} value={directions} onChange={setDirections} />
            <FilterSelect label="Status" options={opts.statuses} value={statuses} onChange={setStatuses} />
            <FilterSelect label="Disposition" options={opts.dispositions} value={dispositions} onChange={setDispositions} searchable />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          onRowClick={setOpen}
          pageSize={12}
          initialSort={{ key: 'startedAt', dir: 'desc' }}
          empty={
            <EmptyState
              icon={canReset ? PhoneX : ClockCounterClockwise}
              title={canReset ? 'No calls match these filters' : 'No calls in this period'}
              description={canReset ? 'Try removing a filter or widening the date range.' : 'Start a campaign or turn on inbound to see calls here.'}
              action={canReset ? <Button onClick={reset}>Reset filters</Button> : null}
              compact
            />
          }
          columns={[
            {
              key: 'contact',
              header: 'Contact',
              render: (c) => (
                <span className="flex items-center gap-3">
                  <Avatar name={c.contact.name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{c.contact.name}</span>
                    <span className="block text-xs tabular text-ink-muted">{fmtPhone(c.contact.phone)}</span>
                  </span>
                </span>
              ),
            },
            { key: 'campaign', header: 'Campaign', hideBelow: 'lg', render: (c) => <span className="block max-w-[200px] truncate">{c.campaign}</span> },
            { key: 'direction', header: 'Direction', hideBelow: 'xl', render: (c) => <DirectionLabel direction={c.direction} /> },
            { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
            { key: 'disposition', header: 'Disposition', hideBelow: 'md', render: (c) => (c.disposition ? <Badge tone="brand">{c.disposition}</Badge> : '—') },
            { key: 'duration', header: 'Duration', align: 'right', sortable: true, render: (c) => (c.duration ? fmtDuration(c.duration) : '—') },
            { key: 'startedAt', header: 'When', align: 'right', sortable: true, sortValue: (c) => +new Date(c.startedAt), hideBelow: 'md', render: (c) => <span className="whitespace-nowrap text-xs">{fmtDateTime(c.startedAt)}</span> },
          ]}
        />
      </Card>

      <CallDetailDrawer call={open} open={!!open} onClose={() => setOpen(null)} />
    </Page>
  );
}

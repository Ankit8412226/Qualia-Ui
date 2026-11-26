import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartLineUp, ChatsCircle, Checks, DownloadSimple, Hourglass, PaperPlaneTilt, Timer, Notepad, Phone, UserCircle } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtCurrency, fmtDateTime, fmtDuration, fmtNumber, fmtPercent, fmtPhone } from '@/lib/format';
import { Avatar, Button, Card, ChartCard, DataTable, DateRangeFilter, FilterBar, FilterSelect, MetricStrip, Progress, StatCard, StatGrid, Tabs, TrendChart, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { getDeliveryReport, getInboxReport } from '@/services/ultrachat';
import { CategoryBadge, Ticks } from '../components/wa';

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'delivery';
  const toast = useToast();
  const [range, setRange] = useState({ preset: '7d' });
  return (
    <Page>
      <PageHeader
        title="Reports"
        description="Every message’s delivery and charge, and how fast your team replies."
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} />
            <Button variant="secondary" icon={DownloadSimple} onClick={() => toast({ title: 'Export started', description: 'A CSV of this view will download shortly.' })}>
              Export
            </Button>
          </>
        }
      >
        <Tabs
          value={tab}
          onChange={(t) => setParams({ tab: t }, { replace: true })}
          tabs={[
            { id: 'delivery', label: 'Delivery report', icon: PaperPlaneTilt },
            { id: 'inbox', label: 'Inbox report', icon: ChatsCircle },
          ]}
        />
      </PageHeader>
      {tab === 'delivery' ? <DeliveryReport range={range} /> : <InboxReport range={range} />}
    </Page>
  );
}

function DeliveryReport({ range }) {
  const { data, loading, error, reload } = useQuery(() => getDeliveryReport(range), [range.preset]);
  const [search, setSearch] = useState('');
  const [f, setF] = useState({ status: [], template: [], category: [], number: [], agent: [] });
  const rows = data || [];
  const filtered = useMemo(
    () => rows.filter((r) => Object.entries(f).every(([k, v]) => !v.length || v.includes(r[k])) && (!search || `${r.name} ${r.to}`.toLowerCase().includes(search.toLowerCase()))),
    [rows, f, search],
  );
  const by = (s) => filtered.filter((r) => r.status === s).length;
  const delivered = filtered.length - by('Failed') - by('Sent');
  const read = by('Read') + by('Replied');
  const charges = filtered.reduce((a, r) => a + r.charge, 0);
  const opts = (k) => [...new Set(rows.map((r) => r[k]))];
  const setK = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div className="flex flex-col gap-4">
      <MetricStrip
        items={[
          { label: 'Messages', value: fmtNumber(filtered.length) },
          { label: 'Delivered', value: fmtPercent(filtered.length ? (delivered / filtered.length) * 100 : 0), sub: fmtNumber(delivered) },
          { label: 'Read', value: fmtPercent(delivered ? (read / delivered) * 100 : 0), sub: fmtNumber(read) },
          { label: 'Failed', value: fmtNumber(by('Failed')), sub: 'not charged' },
          { label: 'Charges', value: fmtCurrency(charges, 2), sub: 'from wallet' },
        ]}
      />
      <Card padded={false} className="overflow-hidden">
        <FilterBar
          className="border-b border-line p-4"
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Name or number"
          canReset={!!search || Object.values(f).some((v) => v.length)}
          onReset={() => {
            setSearch('');
            setF({ status: [], template: [], category: [], number: [], agent: [] });
          }}
        >
          <FilterSelect label="Status" options={['Sent', 'Delivered', 'Read', 'Replied', 'Failed']} value={f.status} onChange={setK('status')} />
          <FilterSelect label="Template" icon={Notepad} options={opts('template')} value={f.template} onChange={setK('template')} />
          <FilterSelect label="Category" options={['Marketing', 'Utility', 'Authentication']} value={f.category} onChange={setK('category')} />
          <FilterSelect label="Number" icon={Phone} options={opts('number')} value={f.number} onChange={setK('number')} />
          <FilterSelect label="Sent by" icon={UserCircle} options={opts('agent')} value={f.agent} onChange={setK('agent')} />
        </FilterBar>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={filtered}
          pageSize={15}
          dense
          initialSort={{ key: 'at', dir: 'desc' }}
          columns={[
            {
              key: 'name',
              header: 'To',
              render: (r) => (
                <span className="block min-w-0">
                  <span className="block truncate font-medium text-ink">{r.name}</span>
                  <span className="block text-2xs tabular text-ink-muted">{fmtPhone(r.to)}</span>
                </span>
              ),
            },
            {
              key: 'template',
              header: 'Template',
              render: (r) => (
                <span className="flex flex-col items-start gap-0.5">
                  <span className="font-mono text-xs">{r.template}</span>
                  <CategoryBadge category={r.category} size="xs" />
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (r) => (
                <span className="flex flex-col">
                  <span className="inline-flex items-center gap-1.5">
                    <Ticks status={r.status} />
                    <span className={r.status === 'Failed' ? 'text-danger' : ''}>{r.status}</span>
                  </span>
                  {r.reason && <span className="text-2xs text-ink-muted">{r.reason}</span>}
                </span>
              ),
            },
            { key: 'charge', header: 'Charge', align: 'right', sortable: true, render: (r) => (r.charge ? `₹${r.charge.toFixed(2)}` : <span className="text-ink-faint">₹0</span>) },
            { key: 'number', header: 'From number', hideBelow: 'xl', render: (r) => <span className="text-xs tabular">{r.number}</span> },
            { key: 'agent', header: 'Sent by', hideBelow: 'lg', render: (r) => <span className="text-[13px]">{r.agent}</span> },
            { key: 'at', header: 'Time', sortable: true, sortValue: (r) => r.at.valueOf(), hideBelow: 'md', render: (r) => <span className="whitespace-nowrap text-xs text-ink-muted">{fmtDateTime(r.at)}</span> },
          ]}
        />
      </Card>
    </div>
  );
}

function InboxReport({ range }) {
  const { data, loading, error, reload } = useQuery(() => getInboxReport(range), [range.preset]);
  const t = data?.totals;
  return (
    <div className="flex flex-col gap-6">
      <StatGrid cols={4}>
        <StatCard loading={loading} label="Chats replied" value={t && fmtNumber(t.replied)} hint={t && `of ${fmtNumber(t.assigned)} assigned`} icon={Checks} delta={6.2} />
        <StatCard loading={loading} label="Pending reply" value={t && fmtNumber(t.pending)} icon={Hourglass} tone="warning" delta={-18} inverse />
        <StatCard loading={loading} label="Response rate" value={t && fmtPercent(t.responseRate)} icon={ChatsCircle} tone="info" delta={2.4} />
        <StatCard loading={loading} label="Avg first response" value={t && fmtDuration(t.firstResponse)} icon={Timer} tone="accent" delta={-9.5} inverse />
      </StatGrid>
      <ChartCard
        title="Chats per day"
        subtitle="Incoming chats that reached an agent vs replied"
        icon={ChartLineUp}
        table={data && { columns: [{ key: 'date', header: 'Day' }, { key: 'chats', header: 'Chats', format: fmtNumber }, { key: 'replied', header: 'Replied', format: fmtNumber }], rows: data.trend }}
      >
        {data && (
          <TrendChart
            data={data.trend}
            series={[
              { key: 'chats', label: 'Chats', color: 'series-4' },
              { key: 'replied', label: 'Replied', color: 'brand' },
            ]}
          />
        )}
      </ChartCard>
      <Card padded={false} className="overflow-hidden">
        <div className="p-5 pb-3">
          <h3 className="text-[15px] font-bold">By agent</h3>
          <p className="text-xs text-ink-muted">Sorted by first response time. Target is under 2 minutes.</p>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={data?.agents || []}
          pageSize={0}
          initialSort={{ key: 'firstResponse', dir: 'asc' }}
          columns={[
            {
              key: 'name',
              header: 'Agent',
              render: (a) => (
                <span className="flex items-center gap-2.5">
                  <Avatar name={a.name} size="sm" status={a.status} />
                  <span className="font-medium text-ink">{a.name}</span>
                </span>
              ),
            },
            { key: 'assigned', header: 'Assigned', align: 'right', sortable: true },
            { key: 'replied', header: 'Replied', align: 'right', sortable: true },
            { key: 'pending', header: 'Pending', align: 'right', sortable: true, render: (a) => <span className={a.pending > 10 ? 'font-semibold text-danger' : ''}>{a.pending}</span> },
            { key: 'rate', header: 'Response rate', width: 170, sortable: true, sortValue: (a) => a.replied / a.assigned, hideBelow: 'md', render: (a) => <Progress value={(a.replied / a.assigned) * 100} size="sm" showLabel tone={a.replied / a.assigned > 0.9 ? 'success' : 'warning'} /> },
            { key: 'firstResponse', header: 'First response', align: 'right', sortable: true, render: (a) => <span className={a.firstResponse > 120 ? 'text-warning' : 'text-success'}>{fmtDuration(a.firstResponse)}</span> },
            { key: 'resolution', header: 'Avg resolution', align: 'right', sortable: true, hideBelow: 'lg', render: (a) => fmtDuration(a.resolution * 60) },
            { key: 'csat', header: 'CSAT', align: 'right', sortable: true, hideBelow: 'lg', render: (a) => `${a.csat.toFixed(1)} / 5` },
          ]}
        />
      </Card>
    </div>
  );
}

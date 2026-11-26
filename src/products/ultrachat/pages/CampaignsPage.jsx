import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Plus, Notepad } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtCurrency, fmtDate, fmtDateTime, fmtNumber, fmtPercent } from '@/lib/format';
import { Button, Card, DataTable, EmptyState, FilterBar, FilterSelect, MetricStrip, Progress, StatusBadge, Tabs } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listCampaigns } from '@/services/ultrachat';
import { CategoryBadge } from '../components/wa';

const STATUSES = ['Draft', 'Scheduled', 'Running', 'Completed', 'Failed'];

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useQuery(() => listCampaigns(), []);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const rows = data || [];

  const filtered = useMemo(
    () =>
      rows
        .filter((c) => tab === 'all' || c.status === tab)
        .filter((c) => !templates.length || templates.includes(c.template))
        .filter((c) => !search || `${c.name} ${c.template}`.toLowerCase().includes(search.toLowerCase())),
    [rows, tab, templates, search],
  );

  const sent = rows.reduce((a, c) => a + c.sent, 0);
  const delivered = rows.reduce((a, c) => a + c.delivered, 0);
  const read = rows.reduce((a, c) => a + c.read, 0);
  const spend = rows.reduce((a, c) => a + (c.sent ? c.cost : 0), 0);

  return (
    <Page>
      <PageHeader
        title="Campaigns"
        description="Bulk messages sent with approved templates to opted-in contacts."
        actions={
          <Button variant="brand" icon={Plus} onClick={() => navigate('/ultrachat/campaigns/new')}>
            New campaign
          </Button>
        }
      >
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: rows.length }, ...STATUSES.map((s) => ({ id: s, label: s, count: rows.filter((c) => c.status === s).length }))]} />
      </PageHeader>

      <MetricStrip
        className="mb-5"
        items={[
          { label: 'Messages sent (30 days)', value: fmtNumber(sent) },
          { label: 'Delivered', value: fmtPercent(sent ? (delivered / sent) * 100 : 0), sub: `${fmtNumber(sent - delivered)} failed` },
          { label: 'Read', value: fmtPercent(delivered ? (read / delivered) * 100 : 0), sub: 'of delivered' },
          { label: 'Spend', value: fmtCurrency(spend), sub: 'charged to wallet' },
        ]}
      />

      <Card padded={false} className="overflow-hidden">
        <FilterBar
          className="border-b border-line p-4"
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search campaigns"
          canReset={!!(search || templates.length)}
          onReset={() => {
            setSearch('');
            setTemplates([]);
          }}
        >
          <FilterSelect label="Template" icon={Notepad} options={[...new Set(rows.map((c) => c.template))]} value={templates} onChange={setTemplates} />
        </FilterBar>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={filtered}
          onRowClick={(c) => navigate(`/ultrachat/campaigns/${c.id}`)}
          initialSort={null}
          empty={
            <EmptyState
              icon={Megaphone}
              title={tab === 'all' ? 'No campaigns yet' : `No ${tab.toLowerCase()} campaigns`}
              description="Pick an approved template, choose who gets it and send now or later."
              action={
                <Button variant="brand" icon={Plus} onClick={() => navigate('/ultrachat/campaigns/new')}>
                  New campaign
                </Button>
              }
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Campaign',
              sortable: true,
              render: (c) => (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-ink">{c.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className="truncate font-mono text-2xs text-ink-muted">{c.template}</span>
                    <CategoryBadge category={c.category} size="xs" />
                  </span>
                </span>
              ),
            },
            { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
            {
              key: 'progress',
              header: 'Progress',
              width: 170,
              hideBelow: 'md',
              render: (c) =>
                c.status === 'Running' ? (
                  <span className="block">
                    <Progress value={c.progress} size="sm" showLabel />
                    <span className="text-2xs text-ink-muted">
                      {fmtNumber(c.sent)} of {fmtNumber(c.audience)}
                    </span>
                  </span>
                ) : (
                  <span className="text-[13px] tabular">{fmtNumber(c.audience)} people</span>
                ),
            },
            { key: 'delivered', header: 'Delivered', align: 'right', sortable: true, sortValue: (c) => (c.sent ? c.delivered / c.sent : -1), render: (c) => (c.sent ? fmtPercent((c.delivered / c.sent) * 100) : '—'), hideBelow: 'lg' },
            { key: 'read', header: 'Read', align: 'right', sortable: true, sortValue: (c) => (c.delivered ? c.read / c.delivered : -1), render: (c) => (c.delivered ? fmtPercent((c.read / c.delivered) * 100) : '—') },
            { key: 'cost', header: 'Cost', align: 'right', sortable: true, render: (c) => (c.sent ? fmtCurrency(c.cost) : <span className="text-ink-faint">est. {fmtCurrency(c.cost || c.audience * 0.88)}</span>), hideBelow: 'lg' },
            {
              key: 'when',
              header: 'When',
              sortable: true,
              sortValue: (c) => (c.startedAt || c.scheduledAt || 0).valueOf?.() || 0,
              render: (c) => <span className="whitespace-nowrap text-xs text-ink-muted">{c.status === 'Scheduled' ? fmtDateTime(c.scheduledAt) : c.startedAt ? fmtDate(c.startedAt) : 'Not scheduled'}</span>,
              hideBelow: 'md',
            },
          ]}
        />
      </Card>
    </Page>
  );
}

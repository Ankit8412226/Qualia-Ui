import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, DotsThree, Eye, Megaphone, PencilSimple, Play, Pause, Plus, Trash, Robot } from '@phosphor-icons/react';
import { fmtDate, fmtNumber } from '@/lib/format';
import { useFilteredRows, useQuery } from '@/lib/hooks';
import { Button, Card, DataTable, EmptyState, FilterBar, IconButton, IconTile, Menu, StatusBadge, Tabs, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listCampaigns, ref } from '@/services/agentflow';
import { CampaignProgress, connectRateText } from '../components/CampaignBits';

export default function CampaignsPage() {
  const { data, loading, setData, error, reload } = useQuery(listCampaigns, []);
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();

  const rows = data || [];
  const counts = useMemo(() => Object.fromEntries(ref.statuses.map((s) => [s, rows.filter((r) => r.status === s).length])), [rows]);
  const filtered = useFilteredRows(rows, { search, fields: ['name', 'voice', 'language', 'createdBy'], filters: { status: tab === 'All' ? [] : [tab] } });

  const setStatus = (c, status, msg) => {
    setData((all) => all.map((x) => (x.id === c.id ? { ...x, status } : x)));
    toast({ title: msg, tone: 'success' });
  };

  const actionsFor = (c) => [
    { label: 'Open', icon: Eye, onClick: () => navigate(`/agentflow/campaigns/${c.id}`) },
    c.status === 'Running' && { label: 'Pause', icon: Pause, onClick: () => setStatus(c, 'Paused', `${c.name} paused`) },
    ['Paused', 'Scheduled'].includes(c.status) && { label: c.status === 'Paused' ? 'Resume' : 'Start now', icon: Play, onClick: () => setStatus(c, 'Running', `${c.name} is calling`) },
    ['Draft', 'Scheduled', 'Paused'].includes(c.status) && { label: 'Edit setup', icon: PencilSimple, onClick: () => navigate(`/agentflow/campaigns/${c.id}/edit`) },
    {
      label: 'Duplicate',
      icon: Copy,
      onClick: () => {
        setData((all) => [{ ...c, id: `${c.id}_copy${Date.now()}`, name: `${c.name} (copy)`, status: 'Draft', dialled: 0, connected: 0, failed: 0, pending: c.contacts, qualified: 0, connectRate: null, createdAt: new Date() }, ...all]);
        toast({ title: 'Saved as a draft copy', tone: 'success' });
      },
    },
    { divider: true },
    {
      label: 'Delete',
      icon: Trash,
      tone: 'danger',
      onClick: async () => {
        if (await confirm({ title: `Delete “${c.name}”?`, message: c.dialled ? 'Calls and recordings stay in Call history. The campaign and its pending contacts are removed.' : 'This draft will be removed.', tone: 'danger', confirmLabel: 'Delete' })) {
          setData((all) => all.filter((x) => x.id !== c.id));
          toast({ title: 'Campaign deleted' });
        }
      },
    },
  ];

  return (
    <Page>
      <PageHeader
        title="Campaigns"
        description="Upload a contact list, pick a voice and script, and let the AI call."
        actions={
          <Button as={Link} to="/agentflow/campaigns/new" variant="brand" icon={Plus}>
            New campaign
          </Button>
        }
      >
        <Tabs tabs={[{ id: 'All', label: 'All', count: rows.length }, ...ref.statuses.map((s) => ({ id: s, label: s, count: counts[s] }))]} value={tab} onChange={setTab} />
      </PageHeader>

      <Card padded={false} className="overflow-hidden">
        <FilterBar className="border-b border-line p-4" search={search} onSearch={setSearch} searchPlaceholder="Search campaign, voice or owner" onReset={() => setSearch('')} canReset={!!search} actions={<span className="text-xs text-ink-muted">{filtered.length} campaigns</span>} />
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={filtered}
          onRowClick={(c) => navigate(`/agentflow/campaigns/${c.id}`)}
          initialSort={{ key: 'createdAt', dir: 'desc' }}
          empty={
            rows.length === 0 ? (
              <EmptyState icon={Megaphone} title="No campaigns yet" description="Upload a CSV of contacts and the AI will start calling within minutes." action={<Button as={Link} to="/agentflow/campaigns/new" variant="brand" icon={Plus}>New campaign</Button>} />
            ) : (
              <EmptyState compact icon={Megaphone} title={search ? 'No campaign matches your search' : `No ${tab.toLowerCase()} campaigns`} description="Try another tab or clear the search." />
            )
          }
          columns={[
            {
              key: 'name',
              header: 'Campaign',
              sortable: true,
              render: (c) => (
                <span className="flex items-center gap-3">
                  <IconTile icon={Robot} size="sm" className="hidden sm:inline-flex" />
                  <span className="min-w-0">
                    <span className="block max-w-[280px] truncate font-semibold text-ink">{c.name}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {c.voice} · {c.language}
                      {c.status === 'Scheduled' && c.scheduledFor && ` · starts ${fmtDate(c.scheduledFor)}`}
                    </span>
                  </span>
                </span>
              ),
            },
            { key: 'status', header: 'Status', sortable: true, render: (c) => <StatusBadge status={c.status} /> },
            { key: 'progress', header: 'Progress', width: 220, hideBelow: 'md', sortable: true, sortValue: (c) => (c.contacts ? c.dialled / c.contacts : 0), render: (c) => (c.contacts ? <CampaignProgress c={c} /> : <span className="text-xs text-ink-faint">No contacts yet</span>) },
            { key: 'contacts', header: 'Contacts', align: 'right', sortable: true, hideBelow: 'lg', render: (c) => fmtNumber(c.contacts) },
            { key: 'connectRate', header: 'Connect rate', align: 'right', sortable: true, sortValue: (c) => c.connectRate ?? -1, render: (c) => <span className="font-semibold text-ink">{connectRateText(c)}</span> },
            { key: 'createdAt', header: 'Created', sortable: true, hideBelow: 'lg', sortValue: (c) => +new Date(c.createdAt), render: (c) => <span className="text-ink-muted">{fmtDate(c.createdAt)}</span> },
            {
              key: 'actions',
              header: '',
              width: 48,
              render: (c) => (
                <span onClick={(e) => e.stopPropagation()}>
                  <Menu trigger={({ toggle }) => <IconButton icon={DotsThree} label="Campaign actions" size="sm" onClick={toggle} />} items={actionsFor(c).filter(Boolean)} />
                </span>
              ),
            },
          ]}
        />
      </Card>
    </Page>
  );
}

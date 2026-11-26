import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, DotsThree, Megaphone, Pause, Play, Plus, Trash } from '@phosphor-icons/react';
import { fmtDuration, fmtNumber, fmtPercent } from '@/lib/format';
import { useFilteredRows, useQuery } from '@/lib/hooks';
import { Badge, Button, Card, DataTable, EmptyState, FilterBar, FilterSelect, IconButton, Menu, Progress, StatusBadge, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';

export default function CampaignsPage() {
  const { data, loading, setData } = useQuery(() => df.listCampaigns(), []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState([]);
  const [method, setMethod] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const rows = useFilteredRows(data, { search, fields: ['name', 'group'], filters: { status, dialMethod: method } });

  const setStatusOf = (c, s) => {
    setData((all) => all.map((x) => (x.id === c.id ? { ...x, status: s } : x)));
    toast(`${c.name} ${s === 'Active' ? 'started' : 'paused'}`);
  };

  return (
    <Page>
      <PageHeader
        title="Campaigns"
        description="Who gets called, how they are dialled and which agents take the calls."
        actions={
          <Button variant="brand" icon={Plus} as={Link} to="/dialflow/campaigns/new">
            New campaign
          </Button>
        }
      />
      <FilterBar
        className="mb-4"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search campaigns"
        canReset={!!(search || status.length || method.length)}
        onReset={() => {
          setSearch('');
          setStatus([]);
          setMethod([]);
        }}
      >
        <FilterSelect label="Status" options={['Active', 'Paused', 'Completed']} value={status} onChange={setStatus} />
        <FilterSelect label="Dial method" options={['Manual', 'Progressive', 'Power']} value={method} onChange={setMethod} />
      </FilterBar>
      <Card padded={false}>
        <DataTable
          loading={loading}
          rows={rows}
          onRowClick={(c) => navigate(`/dialflow/campaigns/${c.id}`)}
          empty={<EmptyState icon={Megaphone} title="No campaigns yet" description="Create one to start dialling your leads." action={<Button variant="brand" icon={Plus} as={Link} to="/dialflow/campaigns/new">New campaign</Button>} />}
          columns={[
            { key: 'name', header: 'Campaign', sortable: true, render: (c) => <div><div className="font-semibold text-ink">{c.name}</div><div className="text-xs text-ink-muted">{c.type}</div></div> },
            { key: 'dialMethod', header: 'Dial method', render: (c) => <span className="inline-flex items-center gap-1.5">{c.dialMethod}{c.dialMethod === 'Power' && <Badge size="xs">{c.ratio}:1</Badge>}</span>, hideBelow: 'md' },
            { key: 'group', header: 'Agent group', hideBelow: 'lg' },
            { key: 'agents', header: 'Agents', align: 'right', hideBelow: 'lg', render: (c) => fmtNumber(c.agentCount ?? { Power: 9, Progressive: 6, Manual: 4 }[c.dialMethod]) },
            {
              key: 'leads',
              header: 'Leads',
              render: (c) =>
                c.leads ? (
                  <div className="w-36">
                    <div className="mb-1 flex justify-between text-xs"><span className="tabular text-ink">{fmtNumber(c.leads - c.leadsLeft)} / {fmtNumber(c.leads)}</span></div>
                    <Progress value={c.leads - c.leadsLeft} max={c.leads} size="sm" />
                  </div>
                ) : (
                  <span className="text-xs text-ink-muted">Inbound</span>
                ),
            },
            { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
            { key: 'connectPct', header: 'Connect %', align: 'right', sortable: true, render: (c) => (c.dialled ? fmtPercent(c.connectPct) : '—') },
            { key: 'aht', header: 'AHT', align: 'right', hideBelow: 'xl', render: (c) => (c.aht ? fmtDuration(c.aht) : '—') },
            {
              key: 'x',
              header: '',
              align: 'right',
              render: (c) => (
                <span onClick={(e) => e.stopPropagation()} role="presentation">
                  <Menu
                    trigger={({ toggle }) => <IconButton icon={DotsThree} label="More" size="sm" onClick={toggle} />}
                    items={[
                      c.status === 'Active' ? { label: 'Pause', icon: Pause, onClick: () => setStatusOf(c, 'Paused') } : c.status === 'Paused' ? { label: 'Start', icon: Play, onClick: () => setStatusOf(c, 'Active') } : null,
                      { label: 'Duplicate', icon: Copy, onClick: () => toast(`Copy of ${c.name} created as draft`) },
                      { divider: true },
                      {
                        label: 'Delete',
                        icon: Trash,
                        tone: 'danger',
                        onClick: async () => {
                          if (await confirm({ title: `Delete ${c.name}?`, message: 'Call history stays in reports. Leads go back to their lists.', tone: 'danger', confirmLabel: 'Delete' })) {
                            setData((all) => all.filter((x) => x.id !== c.id));
                            toast('Campaign deleted');
                          }
                        },
                      },
                    ]}
                  />
                </span>
              ),
            },
          ]}
        />
      </Card>
    </Page>
  );
}

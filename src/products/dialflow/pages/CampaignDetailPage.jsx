import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DownloadSimple, Megaphone, Pause, Play } from '@phosphor-icons/react';
import { fmtDate, fmtDuration, fmtNumber, fmtPercent } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, CardHeader, ChartCard, DataTable, EmptyState, MetricStrip, Progress, Skeleton, StatusBadge, Tabs, TrendChart, useToast, scoreTone } from '@/design-system';
import { BackLink, Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { CallsTable } from '../components/CallsTable';
import { StatePill } from '../components/agentState';
import { downloadCsv } from '../components/csv';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const { data: c, loading, setData } = useQuery(() => df.getCampaign(id), [id]);
  const [tab, setTab] = useState('overview');
  const toast = useToast();

  if (loading)
    return (
      <Page>
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </Page>
    );
  if (!c)
    return (
      <Page>
        <BackLink to="/dialflow/campaigns">Campaigns</BackLink>
        <EmptyState icon={Megaphone} title="Campaign not found" description="It may have been deleted." />
      </Page>
    );

  const done = c.leads - c.leadsLeft;
  const toggle = () => {
    const s = c.status === 'Active' ? 'Paused' : 'Active';
    setData({ ...c, status: s });
    toast(s === 'Active' ? 'Campaign started' : 'Campaign paused');
  };
  const exportAll = () =>
    downloadCsv(`${c.name}-agents`, [
      { header: 'Agent', key: 'name' },
      { header: 'State', key: 'state' },
      { header: 'Calls today', key: 'callsToday' },
      { header: 'Connected', key: 'connectedToday' },
      { header: 'QA', key: 'qa' },
    ], c.agents);

  return (
    <Page>
      <BackLink to="/dialflow/campaigns">Campaigns</BackLink>
      <PageHeader
        className="mt-3"
        title={c.name}
        description={`${c.type} · ${c.dialMethod}${c.dialMethod === 'Power' ? ` ${c.ratio}:1` : ''} · ${c.group} · ${c.hours} · since ${fmtDate(c.createdAt)}`}
        meta={<StatusBadge status={c.status} />}
        actions={
          <>
            <Button icon={DownloadSimple} onClick={exportAll}>
              Export
            </Button>
            {c.status !== 'Completed' && (
              <Button variant={c.status === 'Active' ? 'secondary' : 'brand'} icon={c.status === 'Active' ? Pause : Play} onClick={toggle}>
                {c.status === 'Active' ? 'Pause' : 'Start'}
              </Button>
            )}
          </>
        }
      >
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'agents', label: 'Agents', count: c.agents.length }, { id: 'lists', label: 'Lists', count: c.lists.length }, { id: 'calls', label: 'Calls', count: c.calls.length }]} />
      </PageHeader>

      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          <MetricStrip
            items={[
              { label: 'Leads done', value: c.leads ? fmtPercent((done / c.leads) * 100, 0) : '—', sub: c.leads ? `${fmtNumber(done)} of ${fmtNumber(c.leads)}` : 'Inbound' },
              { label: 'Dialled', value: fmtNumber(c.dialled) },
              { label: 'Connected', value: fmtPercent(c.connectPct), sub: `${fmtNumber(c.connected)} people` },
              { label: 'Avg handle time', value: c.aht ? fmtDuration(c.aht) : '—' },
            ]}
          />
          <ChartCard title="Last 14 days" subtitle={`Connect rate ${fmtPercent(c.connectPct, 0)} overall · dialled vs connected per day`} table={{ columns: [{ key: 'date', header: 'Day' }, { key: 'dialled', header: 'Dialled' }, { key: 'connected', header: 'Connected' }], rows: c.trend }}>
            <TrendChart data={c.trend} series={[{ key: 'dialled', label: 'Dialled', color: 'neutral' }, { key: 'connected', label: 'Connected', color: 'brand' }]} height={240} />
          </ChartCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Top agents today" subtitle="By calls made" actions={<Button size="sm" variant="ghost" onClick={() => setTab('agents')}>All {c.agents.length}</Button>} />
              {c.agents.length ? (
                <ul className="flex flex-col gap-1">
                  {[...c.agents].sort((a, b) => b.callsToday - a.callsToday).slice(0, 5).map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-1.5">
                      <Avatar name={a.name} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.name}</span>
                      <StatePill state={a.state} size="xs" />
                      <span className="w-16 text-right text-sm tabular text-ink-2">{a.callsToday} calls</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-ink-muted">No agents assigned. Add them from Agents → Assign campaigns.</p>
              )}
            </Card>
            <Card>
              <CardHeader title="List progress" actions={<Button size="sm" variant="ghost" onClick={() => setTab('lists')}>Lists</Button>} />
              {c.lists.length ? (
                <div className="flex flex-col gap-4">
                  {c.lists.map((l) => (
                    <div key={l.id}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-medium">{l.name}</span>
                        <span className="tabular text-ink-muted">{fmtNumber(l.dialable)} left</span>
                      </div>
                      <Progress value={l.records - l.dialable} max={l.records} showLabel />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-sm text-ink-muted">Inbound campaign: calls come from your lines.</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'agents' && (
        <Card padded={false}>
          <DataTable
            rows={c.agents}
            columns={[
              { key: 'name', header: 'Agent', render: (a) => <div className="flex items-center gap-2.5"><Avatar name={a.name} size="sm" /><span className="font-medium text-ink">{a.name}</span></div> },
              { key: 'state', header: 'Now', render: (a) => <StatePill state={a.state} /> },
              { key: 'callsToday', header: 'Calls today', align: 'right', sortable: true },
              { key: 'connectedToday', header: 'Connected', align: 'right', sortable: true },
              { key: 'talkToday', header: 'Talk', align: 'right', render: (a) => fmtDuration(a.talkToday), hideBelow: 'md' },
              { key: 'qa', header: 'QA', align: 'right', sortable: true, render: (a) => <Badge tone={scoreTone(a.qa)}>{a.qa}</Badge> },
            ]}
          />
        </Card>
      )}

      {tab === 'lists' && (
        <Card padded={false} className="overflow-hidden">
          <DataTable
            rows={c.lists}
            pageSize={0}
            empty={<EmptyState icon={Megaphone} title="No lists" description="Inbound campaigns take calls from your lines, not from a list." compact />}
            columns={[
              { key: 'name', header: 'List', render: (l) => <div><div className="font-medium text-ink">{l.name}</div><div className="text-xs text-ink-muted">{l.source} · uploaded {fmtDate(l.uploadedAt)}</div></div> },
              { key: 'records', header: 'Records', align: 'right', render: (l) => fmtNumber(l.records) },
              { key: 'dialable', header: 'Left to dial', align: 'right', render: (l) => fmtNumber(l.dialable) },
              { key: 'progress', header: 'Dialled', render: (l) => <Progress value={l.records - l.dialable} max={l.records} size="sm" showLabel className="w-48" /> },
            ]}
          />
        </Card>
      )}

      {tab === 'calls' && <CallsTable rows={c.calls} showCampaign={false} defaultRange="30d" exportName={`${c.name}-calls`} />}
    </Page>
  );
}

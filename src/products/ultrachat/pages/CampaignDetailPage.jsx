import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowBendUpLeft, CalendarX, Checks, Copy, CurrencyInr, DownloadSimple, Eye, Funnel as FunnelIcon, Pause, PaperPlaneTilt, PencilSimple, Play, WarningCircle, Notepad } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtCurrency, fmtDateTime, fmtNumber, fmtPercent, fmtPhone, fmtRelative } from '@/lib/format';
import { Badge, Button, Callout, Card, CardHeader, ChartCard, DataTable, Funnel, LiveIndicator, Progress, Skeleton, StackedBar, StatCard, StatGrid, StatusBadge, Tabs, Timeline, SearchInput, useConfirm, useToast, ChartLegend } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { getCampaign } from '@/services/ultrachat';
import { CategoryBadge, Ticks } from '../components/wa';
import { TemplateMessage } from '../components/PhonePreview';

const REC_TABS = ['All', 'Read', 'Replied', 'Delivered', 'Sent', 'Failed', 'Queued'];

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading } = useQuery(() => getCampaign(id), [id]);
  const [paused, setPaused] = useState(null);
  const [recTab, setRecTab] = useState('All');
  const [search, setSearch] = useState('');

  const c = data?.campaign;
  const status = paused === true ? 'Paused' : paused === false && c?.status === 'Paused' ? 'Running' : c?.status;
  const recipients = data?.recipients || [];
  const shownRecipients = useMemo(() => recipients.filter((r) => (recTab === 'All' || r.status === recTab) && (!search || `${r.name} ${r.phone}`.toLowerCase().includes(search.toLowerCase()))), [recipients, recTab, search]);

  if (loading || !c)
    return (
      <Page>
        <Skeleton className="mb-6 h-12 w-1/3" />
        <StatGrid cols={6}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </StatGrid>
      </Page>
    );

  const pct = (a, b) => (b ? (a / b) * 100 : 0);
  const notStarted = c.status === 'Draft' || c.status === 'Scheduled' || (c.status === 'Failed' && !c.sent);

  const timeline = [
    { title: 'Created', time: fmtDateTime(new Date((c.startedAt || c.scheduledAt || new Date()).valueOf() - 86400000)), description: `by ${c.createdBy}`, tone: 'neutral' },
    c.status !== 'Draft' && { title: 'Template approved', time: 'Meta review', description: c.template, tone: c.status === 'Failed' && !c.sent ? 'danger' : 'success' },
    c.scheduledAt && { title: 'Scheduled', time: fmtDateTime(c.scheduledAt), tone: 'warning' },
    c.startedAt && c.sent > 0 && { title: 'Started sending', time: fmtDateTime(c.startedAt), description: `${fmtNumber(c.audience)} recipients`, tone: 'info' },
    paused === true && { title: 'Paused', time: 'just now', description: 'Queued messages are on hold', tone: 'warning' },
    c.status === 'Completed' && { title: 'Completed', time: fmtDateTime(new Date(c.startedAt.valueOf() + 3 * 3600000)), description: `${fmtNumber(c.delivered)} delivered`, tone: 'success' },
    c.status === 'Failed' && { title: 'Stopped', time: c.startedAt ? fmtDateTime(c.startedAt) : '—', description: c.failNote, tone: 'danger' },
  ].filter(Boolean);

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Campaigns', to: '/ultrachat/campaigns' }, { label: c.name }]}
        title={c.name}
        meta={
          <>
            <StatusBadge status={status} />
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <Notepad size={13} />
              <span className="font-mono">{c.template}</span>
            </span>
            <CategoryBadge category={c.category} />
            <span className="text-xs text-ink-muted">by {c.createdBy}</span>
            {status === 'Running' && <LiveIndicator updatedAt={new Date(Date.now() - 8000)} />}
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={DownloadSimple} onClick={() => toast({ title: 'Export started', description: 'We’ll email the CSV when it’s ready.' })}>
              Export
            </Button>
            <Button variant="secondary" icon={Copy} onClick={() => navigate('/ultrachat/campaigns/new')}>
              Duplicate
            </Button>
            {status === 'Running' && (
              <Button
                variant="primary"
                icon={Pause}
                onClick={async () => {
                  if (await confirm({ title: 'Pause this campaign?', message: 'Messages already sent are not affected. Queued messages wait until you resume.', confirmLabel: 'Pause' })) {
                    setPaused(true);
                    toast('Campaign paused');
                  }
                }}
              >
                Pause
              </Button>
            )}
            {status === 'Paused' && (
              <Button
                variant="brand"
                icon={Play}
                onClick={() => {
                  setPaused(false);
                  toast('Campaign resumed');
                }}
              >
                Resume
              </Button>
            )}
            {(c.status === 'Scheduled' || c.status === 'Draft') && (
              <Button variant="brand" icon={PencilSimple} onClick={() => navigate('/ultrachat/campaigns/new?step=1')}>
                Edit
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {c.status === 'Failed' && (
          <Callout tone="danger" title="This campaign stopped">
            {c.failNote}
          </Callout>
        )}
        {c.status === 'Scheduled' && (
          <Callout
            tone="warning"
            icon={CalendarX}
            title={`Sends on ${fmtDateTime(c.scheduledAt)}`}
            action={
              <Button
                size="sm"
                variant="danger-soft"
                onClick={async () => {
                  if (await confirm({ title: 'Cancel schedule?', message: 'The campaign moves back to drafts. Nothing has been sent.', tone: 'danger', confirmLabel: 'Cancel schedule' })) toast('Schedule cancelled');
                }}
              >
                Cancel schedule
              </Button>
            }
          >
            {fmtNumber(c.audience)} recipients · estimated {fmtCurrency(c.cost || c.audience * 0.14, 2)} will be held from your wallet at send time.
          </Callout>
        )}
        {c.status === 'Running' && (
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">
                {fmtNumber(c.sent)} of {fmtNumber(c.audience)} sent
              </span>
              <span className="text-xs text-ink-muted">{paused ? 'Paused' : `About ${Math.ceil((c.audience - c.sent) / 1000)} min left at 1,000 / min`}</span>
            </div>
            <Progress value={c.progress} tone={paused ? 'warning' : 'brand'} />
          </Card>
        )}

        {!notStarted && (
          <>
            <StatGrid cols={6}>
              <StatCard label="Sent" value={fmtNumber(c.sent)} icon={PaperPlaneTilt} hint={`of ${fmtNumber(c.audience)}`} />
              <StatCard label="Delivered" value={fmtPercent(pct(c.delivered, c.sent))} icon={Checks} hint={fmtNumber(c.delivered)} />
              <StatCard label="Read" value={fmtPercent(pct(c.read, c.delivered))} icon={Eye} tone="info" hint={fmtNumber(c.read)} />
              <StatCard label="Replied" value={fmtPercent(pct(c.replied, c.read))} icon={ArrowBendUpLeft} tone="violet" hint={fmtNumber(c.replied)} />
              <StatCard label="Failed" value={fmtNumber(c.failed)} icon={WarningCircle} tone="danger" hint={fmtPercent(pct(c.failed, c.sent))} />
              <StatCard label="Cost" value={fmtCurrency(c.cost)} icon={CurrencyInr} tone="accent" hint="refund on failed" />
            </StatGrid>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="Funnel"
                subtitle="From sent to replied"
                icon={FunnelIcon}
                table={{
                  columns: [
                    { key: 'label', header: 'Step' },
                    { key: 'value', header: 'People', format: fmtNumber },
                  ],
                  rows: [
                    { label: 'Sent', value: c.sent },
                    { label: 'Delivered', value: c.delivered },
                    { label: 'Read', value: c.read },
                    { label: 'Replied', value: c.replied },
                  ],
                }}
              >
                <Funnel
                  steps={[
                    { label: 'Sent', value: c.sent },
                    { label: 'Delivered', value: c.delivered },
                    { label: 'Read', value: c.read },
                    { label: 'Replied', value: c.replied },
                  ]}
                />
                <div className="mt-5">
                  <div className="mb-2 text-xs font-semibold text-ink-muted">Where every message ended up</div>
                  <StackedBar
                    height="h-3"
                    segments={[
                      { label: 'Replied', value: c.replied, tone: 'brand' },
                      { label: 'Read', value: c.read - c.replied, tone: 'success' },
                      { label: 'Delivered, not read', value: c.delivered - c.read, tone: 'info' },
                      { label: 'Failed', value: c.failed, tone: 'danger' },
                    ]}
                  />
                  <ChartLegend
                    className="mt-2"
                    items={[
                      { label: `Replied ${fmtNumber(c.replied)}`, color: 'rgb(var(--brand))' },
                      { label: `Read ${fmtNumber(c.read - c.replied)}`, color: 'rgb(var(--success))' },
                      { label: `Not read ${fmtNumber(c.delivered - c.read)}`, color: 'rgb(var(--info))' },
                      { label: `Failed ${fmtNumber(c.failed)}`, color: 'rgb(var(--danger))' },
                    ]}
                  />
                </div>
              </ChartCard>

              <Card>
                <CardHeader title="Why messages failed" subtitle={`${fmtNumber(c.failed)} failed · cost refunded to wallet`} icon={WarningCircle} />
                {data.failures.length ? (
                  <ul className="flex flex-col gap-3">
                    {data.failures.map((r) => (
                      <li key={r.code} className="rounded-xl border border-line p-3">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{r.label}</span>
                          <Badge size="xs">{r.code}</Badge>
                          <span className="w-14 text-right text-[13px] font-bold tabular">{fmtNumber(r.count)}</span>
                        </div>
                        <Progress value={r.count} max={c.failed} size="sm" tone="danger" className="mt-2" />
                        <p className="mt-1.5 text-xs text-ink-muted">{r.meaning}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-8 text-center text-sm text-ink-muted">No failures. Every message was delivered.</div>
                )}
              </Card>
            </div>
          </>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card padded={false} className="min-w-0 overflow-hidden">
            <div className="flex flex-col gap-3 p-4 pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[15px] font-bold">Recipients</h3>
                <SearchInput size="sm" value={search} onChange={setSearch} placeholder="Name or number" className="w-full sm:w-56" />
              </div>
              <Tabs value={recTab} onChange={setRecTab} tabs={REC_TABS.map((t) => ({ id: t, label: t, count: t === 'All' ? recipients.length : recipients.filter((r) => r.status === t).length })).filter((t) => t.id === 'All' || t.count > 0)} />
            </div>
            <DataTable
              rows={shownRecipients}
              pageSize={10}
              dense
              columns={[
                { key: 'name', header: 'Name', sortable: true, render: (r) => <span className="font-medium text-ink">{r.name}</span> },
                { key: 'phone', header: 'Number', render: (r) => <span className="tabular">{fmtPhone(r.phone)}</span>, hideBelow: 'md' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => (
                    <span className="inline-flex items-center gap-1.5">
                      <Ticks status={r.status} />
                      <span className={r.status === 'Failed' ? 'text-danger' : 'text-ink-2'}>{r.status}</span>
                    </span>
                  ),
                },
                { key: 'reason', header: 'Failure reason', render: (r) => (r.reason ? <span className="text-xs text-ink-muted">{r.reason} · {r.code}</span> : <span className="text-ink-faint">—</span>), hideBelow: 'lg' },
                { key: 'at', header: 'Updated', sortable: true, sortValue: (r) => r.at?.valueOf() || 0, render: (r) => <span className="text-xs text-ink-muted">{r.at ? fmtRelative(r.at) : 'Waiting'}</span> },
              ]}
            />
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="Timeline" />
              <Timeline items={timeline} />
            </Card>
            {data.template && (
              <Card>
                <CardHeader title="Message sent" />
                <div className="rounded-xl bg-surface-2 p-3">
                  <TemplateMessage template={data.template} compact />
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

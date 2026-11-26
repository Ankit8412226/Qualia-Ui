import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChartLineUp, ChatCircleText, Clock, CurrencyInr, PhoneCall, PhoneOutgoing, Plus, Sparkle, Target, Timer } from '@phosphor-icons/react';
import { fmtCurrency, fmtDuration, fmtNumber, fmtPercent, fmtPhone, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, ChartCard, IconTile, DataTable, DonutChart, HourStrip, LiveIndicator, Segmented, Skeleton, StatCard, StatGrid, StatusBadge, TrendChart, Waveform, useToast } from '@/design-system';
import { Page, PageHeader, SectionTitle } from '@/shared/layout';
import { CallDetailDrawer, CreditBanner } from '@/shared/patterns';
import { getCredits, getOverview } from '@/services/agentflow';
import { CampaignProgress, connectRateText } from '../components/CampaignBits';

export default function OverviewPage() {
  const { data, loading, error, reload } = useQuery(getOverview, []);
  const { data: credits } = useQuery(getCredits, []);
  const [call, setCall] = useState(null);
  const [range, setRange] = useState('14');
  const toast = useToast();
  const [loadedAt] = useState(() => new Date());

  const trend = useMemo(() => (data ? data.trend.slice(range === '7' ? -7 : 0) : []), [data, range]);
  const k = data?.kpis;
  const live = data?.running.filter((c) => c.status === 'Running') || [];
  const peak = data ? data.hours.indexOf(Math.max(...data.hours)) : 0;

  return (
    <Page>
      <PageHeader
        title="Overview"
        description="How your AI agents are calling today and over the last two weeks."
        meta={<LiveIndicator updatedAt={loadedAt} />}
        actions={
          <>
            <Button as={Link} to="/agentflow/test-call" icon={PhoneOutgoing}>
              Test call
            </Button>
            <Button as={Link} to="/agentflow/campaigns/new" variant="brand" icon={Plus}>
              New campaign
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {credits ? <CreditBanner label="Call minutes" used={credits.used} total={credits.total} onTopUp={() => toast({ title: 'Request sent', description: 'Your account manager will add minutes within a working day.', tone: 'success' })} /> : <Skeleton className="h-12 w-full rounded-2xl" />}

        <StatGrid cols={4}>
          <StatCard loading={loading} label="AI calls" icon={PhoneCall} value={fmtNumber(k?.calls.value)} delta={k?.calls.delta} deltaLabel="vs previous 14 days" spark={k?.calls.spark} />
          <StatCard loading={loading} label="Connect rate" icon={Target} tone="success" value={fmtPercent(k?.connectRate.value)} delta={k?.connectRate.delta} deltaLabel="vs previous 14 days" spark={k?.connectRate.spark} />
          <StatCard loading={loading} label="Talk time" icon={Timer} tone="info" value={fmtNumber(k?.talkMinutes.value)} unit="min" delta={k?.talkMinutes.delta} deltaLabel="vs previous 14 days" spark={k?.talkMinutes.spark} />
          <StatCard loading={loading} label="Leads qualified" icon={Sparkle} tone="accent" value={fmtNumber(k?.qualified.value)} delta={k?.qualified.delta} deltaLabel="vs previous 14 days" spark={k?.qualified.spark} />
        </StatGrid>

        <div className="grid gap-6 xl:grid-cols-3">
          <ChartCard
            className="xl:col-span-2"
            title="Calls per day"
            subtitle="Connected out of attempted"
            icon={ChartLineUp}
            actions={<Segmented size="sm" value={range} onChange={setRange} options={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }]} />}
            table={{
              columns: [
                { key: 'date', header: 'Day' },
                { key: 'attempted', header: 'Attempted', format: fmtNumber },
                { key: 'connected', header: 'Connected', format: fmtNumber },
              ],
              rows: trend,
            }}
          >
            {loading ? <Skeleton className="h-[260px] w-full rounded-xl" /> : <TrendChart data={trend} area series={[{ key: 'attempted', label: 'Attempted', color: 'series-2' }, { key: 'connected', label: 'Connected', color: 'brand' }]} />}
          </ChartCard>

          <ChartCard
            title="Call outcomes"
            subtitle="Dispositions, last 14 days"
            icon={ChatCircleText}
            table={{ columns: [{ key: 'name', header: 'Disposition' }, { key: 'value', header: 'Calls', format: fmtNumber }], rows: data?.outcomes || [] }}
          >
            {loading ? <Skeleton className="h-[200px] w-full rounded-xl" /> : <div className="[&>div]:!flex-col"><DonutChart data={data.outcomes} height={168} centerLabel="calls" /></div>}
          </ChartCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2" padded={false}>
            <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
              <div>
                <h3 className="text-[15px] font-bold">Live campaigns</h3>
                <p className="mt-0.5 text-xs text-ink-muted">Running and paused campaigns. Click one to open it.</p>
              </div>
              {live.length > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  <Waveform bars={4} className="h-3" />
                  {live.length * 10} calls in progress
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex flex-col gap-3 p-5 pt-0">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-line/70 border-t border-line">
                {data.running.map((c) => (
                  <li key={c.id}>
                    <Link to={`/agentflow/campaigns/${c.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-5 py-3.5 transition hover:bg-surface-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_88px_20px]">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{c.name}</span>
                          <StatusBadge status={c.status} />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">
                          {c.voice} · {c.language} · {fmtNumber(c.qualified)} qualified
                        </span>
                      </span>
                      <CampaignProgress c={c} className="col-span-2 md:col-span-1" />
                      <span className="hidden text-right md:block">
                        <span className="block font-display text-base font-bold tabular">{connectRateText(c)}</span>
                        <span className="text-2xs text-ink-muted">connect rate</span>
                      </span>
                      <ArrowRight size={16} className="row-start-1 hidden text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-brand md:col-start-4 md:block" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-line px-5 py-3">
              <Button as={Link} to="/agentflow/campaigns" variant="link" size="sm" iconRight={ArrowRight}>
                All campaigns
              </Button>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <ChartCard
              title="Calls by hour"
              subtitle="Today, all campaigns"
              icon={Clock}
              table={{ columns: [{ key: 'hour', header: 'Hour' }, { key: 'calls', header: 'Calls', format: fmtNumber }], rows: (data?.hours || []).map((v, h) => ({ hour: `${String(h).padStart(2, '0')}:00`, calls: v })) }}
            >
              {loading ? (
                <Skeleton className="h-28 w-full rounded-xl" />
              ) : (
                <div className="flex flex-col gap-5">
                  <HourStrip values={data.hours} />
                  <dl className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-surface-2 p-3">
                      <dt className="text-xs text-ink-muted">Busiest hour</dt>
                      <dd className="mt-0.5 font-display text-lg font-bold tabular">
                        {String(peak).padStart(2, '0')}:00–{String(peak + 1).padStart(2, '0')}:00
                      </dd>
                    </div>
                    <div className="rounded-xl bg-surface-2 p-3">
                      <dt className="text-xs text-ink-muted">Avg call length</dt>
                      <dd className="mt-0.5 font-display text-lg font-bold tabular">{fmtDuration(data.avgHandle)}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-ink-muted">Calls only go out inside each campaign’s calling hours.</p>
                </div>
              )}
            </ChartCard>
            <Card className="flex items-center gap-4">
              <IconTile icon={CurrencyInr} tone="accent" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-ink-muted">Spend today</div>
                <div className="font-display text-2xl font-bold tabular">{data ? fmtCurrency(data.costToday) : '—'}</div>
              </div>
              <div className="text-right text-xs text-ink-muted">
                <div className="font-semibold tabular text-ink">{data ? fmtNumber(Math.round(data.costToday / 6.5)) : '—'} min</div>
                at ₹6.5 / min
              </div>
            </Card>
          </div>
        </div>

        <section>
          <SectionTitle
            title="Recent calls"
            description="Latest calls across campaigns and inbound."
            actions={
              <Button as={Link} to="/agentflow/calls" variant="link" size="sm" iconRight={ArrowRight}>
                Call history
              </Button>
            }
          />
          <Card padded={false} className="overflow-hidden">
            <DataTable
              loading={loading}
          error={error}
          onRetry={reload}
              rows={data?.recent || []}
              pageSize={0}
              onRowClick={setCall}
              columns={[
                {
                  key: 'contact',
                  header: 'Contact',
                  render: (r) => (
                    <span className="flex items-center gap-3">
                      <Avatar name={r.contact.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{r.contact.name}</span>
                        <span className="block text-xs tabular text-ink-muted">{fmtPhone(r.contact.phone)}</span>
                      </span>
                    </span>
                  ),
                },
                { key: 'campaign', header: 'Campaign', hideBelow: 'md', render: (r) => <span className="text-ink-2">{r.direction === 'inbound' ? <Badge tone="info">Inbound</Badge> : r.campaign}</span> },
                { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                { key: 'disposition', header: 'Outcome', hideBelow: 'lg', render: (r) => r.disposition },
                { key: 'duration', header: 'Duration', align: 'right', render: (r) => (r.duration ? fmtDuration(r.duration) : '—') },
                { key: 'startedAt', header: 'When', align: 'right', hideBelow: 'md', render: (r) => <span className="text-ink-muted">{fmtRelative(r.startedAt)}</span> },
              ]}
            />
          </Card>
        </section>
      </div>

      <CallDetailDrawer call={call} open={!!call} onClose={() => setCall(null)} />
    </Page>
  );
}

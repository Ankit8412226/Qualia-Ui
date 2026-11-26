import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Broadcast, CaretRight, CheckCircle, MegaphoneSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDuration, fmtNumber, fmtPercent, fmtRelative, pctChange } from '@/lib/format';
import { useQuery, useTick } from '@/lib/hooks';
import { BarsChart, Button, Card, ChartCard, DataTable, Delta, LiveIndicator, Progress, Skeleton, StatusBadge } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { AGENT_STATES, STATE_META, secondsSince, urgency } from '../components/agentState';
import { AgentLiveDrawer } from '../components/AgentLiveDrawer';
import { HuddleModal } from '../components/HuddleModal';

/** Supervisor home: what needs action now, then the floor, then today's numbers. */
export default function OverviewPage() {
  const { data, loading } = useQuery(() => df.getOverview(), []);
  const [updatedAt] = useState(() => new Date(Date.now() - 4000));
  const [huddle, setHuddle] = useState(false);
  const [agent, setAgent] = useState(null);
  const [allItems, setAllItems] = useState(false);
  const navigate = useNavigate();
  const t = useTick(1000);

  const agents = data?.agents || [];
  const online = agents.filter((a) => a.state !== 'Logged out');
  const count = (s) => agents.filter((a) => a.state === s).length;
  const campaigns = data?.campaigns || [];
  const running = campaigns.filter((c) => c.status !== 'Completed');

  const hourly = data?.hourly || [];
  const dialled = hourly.reduce((a, h) => a + h.dialled, 0);
  const connected = hourly.reduce((a, h) => a + h.connected, 0);
  const active = campaigns.filter((c) => c.status === 'Active' && c.dialled);
  const aht = active.reduce((a, c) => a + c.aht * c.connected, 0) / Math.max(active.reduce((a, c) => a + c.connected, 0), 1);
  const peak = hourly.reduce((p, h) => (h.connected > (p?.connected || 0) ? h : p), null);

  const attention = data ? buildAttention(data, t) : [];

  return (
    <Page>
      <PageHeader
        title="Overview"
        description={loading ? 'Loading the floor…' : `${online.length} of ${agents.length} agents logged in · ${count('Ready')} ready · ${count('In call')} on calls · ${data.waiting} callers waiting`}
        meta={<LiveIndicator updatedAt={updatedAt} />}
        actions={
          <>
            <Button icon={MegaphoneSimple} onClick={() => setHuddle(true)}>
              Call a huddle
            </Button>
            <Button variant="brand" icon={Broadcast} as={Link} to="/dialflow/realtime">
              Open live floor
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* 1. Needs action now */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 px-5 pb-3 pt-4">
              <h2 className="text-[15px] font-bold">
                Needs attention
                {!loading && attention.length > 0 && <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger tabular">{attention.length}</span>}
              </h2>
              <span className="text-xs text-ink-muted">Most urgent first · click to act</span>
            </div>
            {loading ? (
              <div className="flex flex-col gap-2 px-5 pb-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : attention.length ? (
              <ul className="divide-y divide-line/70 border-t border-line/70">
                {(allItems ? attention : attention.slice(0, 6)).map((it) => (
                  <li key={it.id}>
                    <button type="button" onClick={() => (it.agent ? setAgent(it.agent) : navigate(it.to))} className="group flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-surface-2">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', it.tone === 'danger' ? 'bg-danger' : 'bg-warning')} />
                      <span className="hidden w-20 shrink-0 text-2xs font-semibold uppercase tracking-wider text-ink-faint sm:block">{it.kind}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{it.title}</span>
                        <span className="block truncate text-xs text-ink-muted">{it.detail}</span>
                      </span>
                      {it.value && <span className={cn('shrink-0 font-mono text-sm font-semibold tabular', it.tone === 'danger' ? 'text-danger' : 'text-warning')}>{it.value}</span>}
                      <span className="inline-flex w-20 shrink-0 items-center justify-end gap-1 text-xs font-medium text-ink-muted group-hover:text-brand">
                        {it.cta}
                        <CaretRight size={12} weight="bold" />
                      </span>
                    </button>
                  </li>
                ))}
                {attention.length > 6 && (
                  <li>
                    <button type="button" onClick={() => setAllItems((v) => !v)} className="w-full px-5 py-2.5 text-left text-xs font-medium text-brand hover:bg-surface-2">
                      {allItems ? 'Show fewer' : `Show ${attention.length - 6} more`}
                    </button>
                  </li>
                )}
              </ul>
            ) : (
              <div className="flex items-center gap-2 border-t border-line/70 px-5 py-5 text-sm text-ink-muted">
                <CheckCircle size={18} weight="fill" className="text-success" /> Nothing needs you right now. Breaks, queues, lines and campaigns are within limits.
              </div>
            )}
          </Card>

          {/* 3. Today */}
          <ChartCard
            title="Today so far"
            subtitle={peak ? `Busiest hour so far: ${peak.hour}, ${fmtNumber(peak.connected)} connected` : 'Dialled and connected calls by hour'}
            table={{ columns: [{ key: 'hour', header: 'Hour' }, { key: 'dialled', header: 'Dialled', format: fmtNumber }, { key: 'connected', header: 'Connected', format: fmtNumber }], rows: hourly }}
          >
            <div className="mb-5 grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:divide-x sm:divide-line">
              <TodayStat first label="Calls" value={fmtNumber(data?.callsToday)} extra={data && <Delta value={pctChange(data.callsToday, data.callsYesterday)} />} sub="vs same time yesterday" />
              <TodayStat label="Connect rate" value={fmtPercent((connected / Math.max(dialled, 1)) * 100, 0)} sub={`${fmtNumber(connected)} of ${fmtNumber(dialled)} dialled`} />
              <TodayStat label="Avg handle time" value={fmtDuration(Math.round(aht))} sub="talk + wrap + hold" />
              <TodayStat label="Occupancy" value={fmtPercent((count('In call') / Math.max(online.length, 1)) * 100, 0)} sub={`${count('In call')} of ${online.length} talking`} />
            </div>
            {data && <BarsChart data={hourly} xKey="hour" series={[{ key: 'dialled', label: 'Dialled', color: 'neutral' }, { key: 'connected', label: 'Connected', color: 'brand' }]} height={190} />}
          </ChartCard>

          {/* campaigns */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
              <h2 className="text-[15px] font-bold">Campaigns running</h2>
              <Button size="sm" variant="ghost" iconRight={ArrowRight} as={Link} to="/dialflow/campaigns">
                All campaigns
              </Button>
            </div>
            <DataTable
              loading={loading}
              rows={running}
              onRowClick={(c) => navigate(`/dialflow/campaigns/${c.id}`)}
              pageSize={0}
              dense
              columns={[
                { key: 'name', header: 'Campaign', render: (c) => <span className="font-medium text-ink">{c.name}</span> },
                { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} />, hideBelow: 'md' },
                { key: 'agentCount', header: 'Agents', align: 'right', hideBelow: 'lg' },
                {
                  key: 'leadsLeft',
                  header: 'Leads left',
                  align: 'right',
                  render: (c) => (c.leads ? <span className={cn(c.status === 'Active' && c.leadsLeft / c.leads < 0.1 && 'font-semibold text-danger')}>{fmtNumber(c.leadsLeft)}</span> : <span className="text-ink-faint">Inbound</span>),
                },
                {
                  key: 'connectPct',
                  header: 'Connect rate',
                  align: 'right',
                  render: (c) => (
                    <div className="flex items-center justify-end gap-2">
                      {c.dialled > 0 && <Progress value={c.connectPct} size="sm" className="hidden w-14 lg:flex" />}
                      <span className="w-10">{c.dialled ? fmtPercent(c.connectPct, 0) : '—'}</span>
                    </div>
                  ),
                },
                { key: 'aht', header: 'AHT', align: 'right', render: (c) => (c.aht ? fmtDuration(c.aht) : '—'), hideBelow: 'md' },
              ]}
            />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* 2. Floor now */}
          <Card>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-bold">Floor now</h2>
              <Link to="/dialflow/realtime" className="text-xs font-medium text-brand hover:underline">
                Open floor
              </Link>
            </div>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="mb-3 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full">
                  {AGENT_STATES.map((s) => (count(s) ? <span key={s} className={STATE_META[s].fill} style={{ width: `${(count(s) / agents.length) * 100}%` }} /> : null))}
                </div>
                <ul className="-mx-2 flex flex-col">
                  {AGENT_STATES.map((s) => {
                    const over = agents.filter((a) => a.state === s && urgency(a, secondsSince(a.stateSince, t)) === 2).length;
                    return (
                      <li key={s}>
                        <Link to={`/dialflow/realtime?state=${encodeURIComponent(s)}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                          <span className={cn('h-2.5 w-2.5 rounded-[3px]', STATE_META[s].fill)} />
                          <span className="flex-1 text-ink-2">{s}</span>
                          {over > 0 && <span className="text-xs font-medium text-danger">{over} too long</span>}
                          <span className="w-6 text-right font-semibold tabular text-ink">{count(s)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
                  Inbound queue: <span className="font-semibold text-ink">{data.waiting} waiting</span> · longest {fmtClock(data.longestWait)}
                </div>
              </>
            )}
          </Card>

          {/* huddles */}
          <Card>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-bold">Huddles today</h2>
              <button type="button" onClick={() => setHuddle(true)} className="text-xs font-medium text-brand hover:underline">
                New huddle
              </button>
            </div>
            <ul className="flex flex-col divide-y divide-line/70">
              {(data?.huddles || []).map((h) => (
                <li key={h.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="line-clamp-2 text-[13px] text-ink">{h.message}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
                    <span>
                      {h.by.split(' ')[0]} · {fmtRelative(h.at)}
                    </span>
                    {h.needsAck ? <span className={cn('tabular', h.acked < h.agents ? 'font-medium text-warning' : 'text-success')}>{h.acked}/{h.agents} read</span> : <span>sent to {h.agents}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <AgentLiveDrawer agent={agent} onClose={() => setAgent(null)} onMonitor={() => navigate('/dialflow/live-calls')} />
      <HuddleModal open={huddle} onClose={() => setHuddle(false)} agents={agents} />
    </Page>
  );
}

function TodayStat({ label, value, extra, sub, first }) {
  return (
    <div className={cn('min-w-0', !first && 'sm:pl-5')}>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="font-display text-2xl font-bold tabular">{value ?? '—'}</span>
        {extra}
      </div>
      <div className="truncate text-xs text-ink-faint">{sub}</div>
    </div>
  );
}

/** Everything a supervisor should act on, most urgent first. Each item opens the place to fix it. */
function buildAttention(data, t) {
  const out = [];
  if (data.waiting > 0) {
    const ready = data.agents.filter((a) => a.group === 'Inbound Desk' && a.state === 'Ready').length;
    out.push({
      id: 'queue',
      kind: 'Queue',
      tone: data.waiting > 2 ? 'danger' : 'warning',
      title: `${data.waiting} callers waiting on inbound lines`,
      detail: `${ready ? `${ready} Inbound Desk agent${ready > 1 ? 's' : ''} ready` : 'No Inbound Desk agent is ready'} · ${data.routes.filter((r) => r.waiting).map((r) => r.label).join(', ')}`,
      value: fmtClock(data.longestWait),
      cta: 'Floor',
      to: '/dialflow/realtime?campaign=cmp_inbound',
      rank: 0,
    });
  }
  data.agents.forEach((a) => {
    const secs = secondsSince(a.stateSince, t);
    if (urgency(a, secs) < 2) return;
    const paused = a.state === 'Paused';
    out.push({
      id: a.id,
      kind: paused ? 'Break' : a.state,
      tone: 'danger',
      title: paused ? `${a.name} is over the ${a.breakReason.toLowerCase()} limit` : `${a.name} has been in ${a.state.toLowerCase()} too long`,
      detail: paused ? `Limit ${a.breakLimit} min · ${a.group}` : `${a.campaign} · ${a.group}`,
      value: fmtClock(secs),
      cta: 'Agent',
      agent: a,
      rank: 1,
    });
  });
  data.lines
    .filter((d) => d.verdict !== 'Healthy')
    .forEach((d) => {
      out.push({
        id: d.id,
        kind: 'Line',
        tone: 'danger',
        title: d.verdict === 'Line down' ? `${d.number} is down` : `${d.number} connects ${d.connectToday}% (usually ${d.baseline}%)`,
        detail: `${d.group} · ${d.verdict === 'Line down' ? 'No call has connected since 11:42' : 'Operators label it as spam'}`,
        cta: 'Lines',
        to: '/dialflow/number-health',
        rank: 2,
      });
    });
  data.campaigns
    .filter((c) => c.status === 'Active' && c.leads && c.leadsLeft / c.leads < 0.1)
    .forEach((c) => {
      out.push({ id: c.id, kind: 'Leads', tone: 'warning', title: `${c.name} has only ${fmtNumber(c.leadsLeft)} leads left`, detail: `${fmtPercent(((c.leads - c.leadsLeft) / c.leads) * 100, 0)} dialled · attach a list or dial again by outcome`, cta: 'Campaign', to: `/dialflow/campaigns/${c.id}`, rank: 3 });
    });
  data.campaigns
    .filter((c) => c.status === 'Paused' && c.leadsLeft)
    .forEach((c) => {
      out.push({ id: `${c.id}_p`, kind: 'Campaign', tone: 'warning', title: `${c.name} is paused with ${fmtNumber(c.leadsLeft)} leads`, detail: `${c.group} · ${c.agentCount} agents assigned`, cta: 'Campaign', to: `/dialflow/campaigns/${c.id}`, rank: 4 });
    });
  data.huddles
    .filter((h) => h.needsAck && h.acked < h.agents)
    .forEach((h) => {
      out.push({ id: h.id, kind: 'Huddle', tone: 'warning', title: `${h.agents - h.acked} agents have not read “${h.message.split(':')[0]}”`, detail: `Sent ${fmtRelative(h.at)} by ${h.by}`, cta: 'Agents', to: '/dialflow/agents', rank: 5 });
    });
  return out.sort((a, b) => a.rank - b.rank);
}

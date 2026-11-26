import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChalkboardTeacher,
  ChartLineUp,
  CheckCircle,
  ClockCountdown,
  CloudArrowUp,
  Lightning,
  Medal,
  PhoneCall,
  Quotes,
  ShieldCheck,
  Smiley,
  Sparkle,
  Target,
  TrendDown,
  TrendUp,
  WarningOctagon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtDuration, fmtNumber, fmtPercent, fmtRelative, pctChange } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ChartCard,
  DateRangeFilter,
  Delta,
  DonutChart,
  EmptyState,
  Heatmap,
  LiveIndicator,
  ProgressRing,
  RankedBars,
  Segmented,
  Skeleton,
  StatCard,
  StatGrid,
  StatusBadge,
  TrendChart,
  scoreTone,
} from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer } from '@/shared/patterns';
import { getAgentOverview, getOverview } from '@/services/businesspulse';
import { ProcessChip, useProcess, useViewer } from '../components/ProcessContext';
import { Eyebrow, ScoreBar, ScorePill, scoreText } from '../components/common';

const VIBE_COLORS = { Happy: 'success', Neutral: 'info', Confused: 'warning', Frustrated: 'series-3', Angry: 'danger' };
const pts = (v) => (v == null ? null : Math.round(v * 10) / 10);

export default function OverviewPage() {
  const { isAgent } = useViewer();
  return isAgent ? <AgentOverview /> : <TeamOverview />;
}

/* ============================== Team (admin) ============================== */

function TeamOverview() {
  const { processId, process } = useProcess();
  const [range, setRange] = useState({ preset: '7d' });
  const [openCall, setOpenCall] = useState(null);
  const navigate = useNavigate();
  const { data, loading } = useQuery(() => getOverview(processId, range), [processId, range]);
  const k = data?.kpis;
  const p = data?.prev;
  const spark = (key) => data?.trend.slice(-10).map((d) => d[key] ?? 0);
  const insights = useMemo(() => (data ? buildInsights(data) : []), [data]);

  return (
    <Page>
      <PageHeader
        title="Overview"
        description="How every scored call measures up to your QA checklist."
        meta={
          <>
            <ProcessChip />
            {data && <LiveIndicator updatedAt={data.updatedAt} label="Scoring live" />}
          </>
        }
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} />
            <Button variant="brand" icon={CloudArrowUp} as={Link} to="/businesspulse/upload">
              Upload calls
            </Button>
          </>
        }
      />

      <StatGrid cols={5}>
        <StatCard loading={loading} label="Avg QA score" value={k?.avgScore ?? '—'} unit="/100" delta={pctChange(k?.avgScore, p?.avgScore)} icon={Target} spark={spark('score')} className="ring-1 ring-brand/20" />
        <StatCard loading={loading} label="Calls scored" value={fmtNumber(k?.scored)} delta={pctChange(k?.scored, p?.scored)} icon={PhoneCall} spark={spark('calls')} />
        <StatCard loading={loading} label="Pass rate" value={fmtPercent(k?.passRate)} delta={pctChange(k?.passRate, p?.passRate)} icon={ShieldCheck} spark={spark('pass')} />
        <StatCard loading={loading} label="Fatal errors" value={fmtNumber(k?.fatal)} delta={pctChange(k?.fatal, p?.fatal)} inverse icon={WarningOctagon} tone="danger" spark={spark('fatal')} onClick={() => navigate('/businesspulse/calls?fatal=1')} />
        <StatCard loading={loading} label="Avg talk time" value={k ? fmtDuration(k.avgTalk) : '—'} delta={pctChange(k?.avgTalk, p?.avgTalk)} icon={ClockCountdown} tone="info" className="lg:col-span-2 xl:col-span-1" />
      </StatGrid>

      {/* What changed: one line the manager can act on */}
      {insights.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-brand/20 bg-brand/5 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-2 sm:pl-4">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand">
            <Sparkle size={14} weight="fill" /> What changed
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {insights.map((i) => (
              <span key={i.text} className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-2.5 py-1.5 text-xs text-ink-2 shadow-card">
                <i.icon size={14} weight="bold" className={i.tone} />
                {i.text}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="QA score trend"
          subtitle={`Daily average for ${process?.short || 'this process'} · pass mark 70`}
          icon={ChartLineUp}
          table={data && { columns: [{ key: 'date', header: 'Day' }, { key: 'score', header: 'Avg score' }, { key: 'calls', header: 'Calls' }, { key: 'pass', header: 'Pass rate', format: (v) => fmtPercent(v) }], rows: data.trend }}
          actions={data && <ScoreSummary value={k.avgScore} prev={p.avgScore} />}
        >
          {loading ? <Skeleton className="h-[260px] w-full rounded-xl" /> : <TrendChart data={data.trend} series={[{ key: 'score', label: 'Avg QA score' }]} yDomain={[40, 100]} height={330} />}
        </ChartCard>

        <FatalAlerts loading={loading} alerts={data?.fatalAlerts} onOpen={(id) => setOpenCall(data.callsById[id])} total={k?.fatal} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Parameter averages"
          subtitle="Share of max score · tick shows previous period"
          icon={ShieldCheck}
          table={data && { columns: [{ key: 'name', header: 'Parameter' }, { key: 'pct', header: 'Now', format: fmtPercent }, { key: 'prev', header: 'Before', format: fmtPercent }], rows: data.params }}
        >
          {loading ? (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          ) : (
            <ul className="flex flex-col gap-4">
              {data.params.map((prm) => (
                <li key={prm.key}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-center gap-2 font-medium text-ink-2">
                      <span className="truncate">{prm.name}</span>
                      {prm.fatal && <Badge tone="danger" size="xs">Fatal</Badge>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Delta value={prm.prev != null && prm.pct != null ? prm.pct - prm.prev : null} suffix=" pts" />
                      <span className={cn('w-12 text-right font-bold tabular', scoreText(prm.pct))}>{fmtPercent(prm.pct, 0)}</span>
                    </span>
                  </div>
                  <ScoreBar value={prm.pct} marker={prm.prev} markerLabel={`Previous: ${fmtPercent(prm.prev)}`} />
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard
          title="Agents"
          subtitle="Average QA score this period"
          icon={Medal}
          table={data && { columns: [{ key: 'name', header: 'Agent' }, { key: 'avgScore', header: 'Avg score' }, { key: 'calls', header: 'Calls' }, { key: 'fatal', header: 'Fatal' }], rows: [...data.top, ...data.bottom] }}
          actions={
            <Button variant="ghost" size="xs" iconRight={ArrowRight} as={Link} to="/businesspulse/agents">
              All agents
            </Button>
          }
        >
          {loading ? (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Eyebrow className="mb-3 flex items-center gap-1.5 text-success">
                  <TrendUp size={12} weight="bold" /> Top 5
                </Eyebrow>
                <RankedBars items={data.top.map((a) => ({ label: a.name, value: a.avgScore, tone: scoreTone(a.avgScore) }))} max={100} format={(v) => v.toFixed(1)} />
              </div>
              <div>
                <Eyebrow className="mb-3 flex items-center gap-1.5 text-danger">
                  <TrendDown size={12} weight="bold" /> Needs coaching
                </Eyebrow>
                <RankedBars items={data.bottom.map((a) => ({ label: a.name, value: a.avgScore, tone: scoreTone(a.avgScore) }))} max={100} format={(v) => v.toFixed(1)} />
                <Button variant="soft" size="xs" icon={ChalkboardTeacher} className="mt-4" as={Link} to={`/businesspulse/coach?agent=${data.bottom[0]?.id}`}>
                  Coach {data.bottom[0]?.name.split(' ')[0]}
                </Button>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Agent × parameter"
          subtitle="Share of max score per parameter. Red cells are where coaching pays off."
          icon={Target}
          table={data && { columns: [{ key: 'label', header: 'Agent' }, ...data.heatmap.columns.map((c, i) => ({ key: `v${i}`, header: c, format: (v) => (v == null ? '—' : Math.round(v)) }))], rows: data.heatmap.rows.map((r) => ({ label: r.label, ...Object.fromEntries(r.values.map((v, i) => [`v${i}`, v])) })) }}
        >
          {loading ? <Skeleton className="h-[360px] w-full rounded-xl" /> : data.heatmap.rows.length ? <Heatmap rows={data.heatmap.rows} columns={data.heatmap.columns} scale="score" format={(v) => Math.round(v)} rowHeader="Agent" /> : <EmptyState compact icon={Target} title="No scored calls in this period" />}
        </ChartCard>

        <ChartCard title="Call vibe" subtitle="How customers sounded" icon={Smiley} table={data && { columns: [{ key: 'name', header: 'Vibe' }, { key: 'value', header: 'Calls' }], rows: data.vibes }}>
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-xl" />
          ) : (
            <div className="flex flex-col gap-5">
              <DonutChart data={data.vibes.map((v) => ({ ...v, color: VIBE_COLORS[v.name] }))} height={180} centerLabel="calls" showLegend={false} />
              <VibeLegend vibes={data.vibes} />
              <VibeNote vibes={data.vibes} />
            </div>
          )}
        </ChartCard>
      </div>

      <CallDetailDrawer call={openCall} open={!!openCall} onClose={() => setOpenCall(null)} />
    </Page>
  );
}

function ScoreSummary({ value, prev }) {
  return (
    <span className="hidden items-center gap-2 sm:flex">
      <span className="font-display text-xl font-bold tabular">{value ?? '—'}</span>
      <Delta value={value != null && prev != null ? value - prev : null} suffix=" pts" />
    </span>
  );
}

const VIBE_BG = { Happy: 'bg-success', Neutral: 'bg-info', Confused: 'bg-warning', Frustrated: 'bg-accent', Angry: 'bg-danger' };

function VibeLegend({ vibes }) {
  const total = vibes.reduce((a, v) => a + v.value, 0) || 1;
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
      {vibes.map((v) => (
        <li key={v.name} className="flex items-center gap-2 text-[13px]">
          <span className={cn('h-2.5 w-2.5 shrink-0 rounded-[3px]', VIBE_BG[v.name])} />
          <span className="min-w-0 flex-1 truncate text-ink-2">{v.name}</span>
          <span className="font-semibold tabular text-ink">{v.value}</span>
          <span className="w-9 text-right text-xs tabular text-ink-muted">{Math.round((v.value / total) * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

function VibeNote({ vibes }) {
  const total = vibes.reduce((a, v) => a + v.value, 0) || 1;
  const upset = vibes.filter((v) => ['Frustrated', 'Angry'].includes(v.name)).reduce((a, v) => a + v.value, 0);
  return (
    <div className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-ink-2">
      <b className="text-ink">{fmtPercent((upset / total) * 100, 0)}</b> of customers sounded frustrated or angry. Most of these calls also lost points on objection handling.
    </div>
  );
}

function FatalAlerts({ loading, alerts, onOpen, total }) {
  return (
    <Card className="flex flex-col" padded={false}>
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <WarningOctagon size={16} weight="duotone" />
          </span>
          <div>
            <h3 className="text-[15px] font-bold">Fatal alerts</h3>
            <p className="mt-0.5 text-xs text-ink-muted">Calls that failed a must-pass check</p>
          </div>
        </div>
        {total > 0 && <Badge tone="danger">{total}</Badge>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2" style={{ maxHeight: 330 }}>
        {loading ? (
          <div className="flex flex-col gap-3 p-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : !alerts.length ? (
          <EmptyState compact icon={CheckCircle} title="No fatal errors" description="Every call in this period passed the must-pass checks." />
        ) : (
          <ul className="flex flex-col">
            {alerts.map((a) => (
              <li key={a.id}>
                <button onClick={() => onOpen(a.id)} className="group flex w-full gap-3 rounded-xl p-2.5 text-left transition hover:bg-surface-2">
                  <Avatar name={a.agent} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink">{a.agent}</span>
                      <span className="shrink-0 text-2xs text-ink-faint">{fmtRelative(a.at)}</span>
                    </span>
                    <span className="block truncate text-2xs font-medium text-danger">{a.parameter}</span>
                    <span className="mt-1 flex gap-1 text-xs italic leading-snug text-ink-muted">
                      <Quotes size={11} weight="fill" className="mt-0.5 shrink-0 not-italic" />
                      <span className="line-clamp-2">{a.quote}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link to="/businesspulse/calls?fatal=1" className="flex items-center justify-center gap-1 border-t border-line py-2.5 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
        All fatal calls <ArrowRight size={12} weight="bold" />
      </Link>
    </Card>
  );
}

function buildInsights(d) {
  const out = [];
  const moved = d.params.filter((x) => x.prev != null && x.pct != null).map((x) => ({ ...x, diff: x.pct - x.prev }));
  const up = [...moved].sort((a, b) => b.diff - a.diff)[0];
  const down = [...moved].sort((a, b) => a.diff - b.diff)[0];
  if (up && up.diff > 0.5) out.push({ icon: TrendUp, tone: 'text-success', text: `${up.short} up ${pts(up.diff)} pts` });
  if (down && down.diff < -0.5) out.push({ icon: TrendDown, tone: 'text-danger', text: `${down.short} down ${pts(Math.abs(down.diff))} pts` });
  if (d.prev.fatal != null) {
    const diff = d.kpis.fatal - d.prev.fatal;
    out.push({ icon: WarningOctagon, tone: diff > 0 ? 'text-danger' : diff < 0 ? 'text-success' : 'text-ink-muted', text: diff === 0 ? 'Fatal errors flat vs last period' : `${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} fatal error${Math.abs(diff) === 1 ? '' : 's'} than last period` });
  }
  if (d.bottom[0]) out.push({ icon: Lightning, tone: 'text-warning', text: `${d.bottom[0].name} needs coaching (${d.bottom[0].avgScore})` });
  return out;
}

/* ============================== Agent's own view ============================== */

function AgentOverview() {
  const { processId } = useProcess();
  const { name } = useViewer();
  const [range, setRange] = useState('30d');
  const [openCall, setOpenCall] = useState(null);
  const { data, loading } = useQuery(() => getAgentOverview(processId, name, { preset: range }), [processId, name, range]);
  const k = data?.kpis;

  return (
    <Page>
      <PageHeader
        title={`Namaste, ${name?.split(' ')[0]}`}
        description="Your scores, how you compare with the team, and what to practise next."
        meta={<ProcessChip />}
        actions={<Segmented value={range} onChange={setRange} options={[{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }]} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Scorecard */}
        <Card className="relative overflow-hidden lg:col-span-1">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-2xl" />
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-xl" />
          ) : (
            <div className="relative flex flex-col gap-5">
              <div className="flex items-center gap-5">
                <ProgressRing value={k.avgScore ?? 0} size={112} stroke={10} tone={scoreTone(k.avgScore ?? 0)} label={<span className="text-3xl">{Math.round(k.avgScore ?? 0)}</span>} />
                <div className="min-w-0">
                  <Eyebrow>Your QA score</Eyebrow>
                  <div className="mt-1 flex items-center gap-2">
                    <Delta value={k.avgScore != null && data.prev.avgScore != null ? k.avgScore - data.prev.avgScore : null} suffix=" pts" />
                    <span className="text-xs text-ink-muted">vs before</span>
                  </div>
                  <div className="mt-2 text-xs text-ink-muted">
                    Team average <b className="tabular text-ink">{data.teamAvg}</b>
                  </div>
                  <Badge tone="brand" icon={Medal} className="mt-2">
                    Rank {data.rank} of {data.of}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-line rounded-xl border border-line">
                {[
                  ['Calls', fmtNumber(k.scored)],
                  ['Pass rate', fmtPercent(k.passRate, 0)],
                  ['Fatal', fmtNumber(k.fatal)],
                ].map(([l, v]) => (
                  <div key={l} className="px-3 py-2.5 text-center">
                    <div className="text-2xs text-ink-muted">{l}</div>
                    <div className={cn('font-display text-lg font-bold tabular', l === 'Fatal' && k.fatal > 0 && 'text-danger')}>{v}</div>
                  </div>
                ))}
              </div>
              <div>
                <Eyebrow className="mb-1">Latest calls</Eyebrow>
                <ul className="divide-y divide-line/70">
                  {data.recent.slice(0, 3).map((c) => (
                    <li key={c.id}>
                      <button onClick={() => setOpenCall(c)} className="-mx-2 flex w-[calc(100%+16px)] items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{c.contact.name}</span>
                        <span className="text-2xs text-ink-faint">{fmtRelative(c.startedAt)}</span>
                        <ScorePill value={c.score} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>

        <ChartCard
          className="lg:col-span-2"
          title="You vs team"
          subtitle="3-day rolling average QA score"
          icon={ChartLineUp}
          table={data && { columns: [{ key: 'date', header: 'Day' }, { key: 'mine', header: 'You' }, { key: 'team', header: 'Team' }], rows: data.trend }}
        >
          {loading ? <Skeleton className="h-[240px] w-full rounded-xl" /> : <TrendChart data={data.trend} series={[{ key: 'mine', label: 'You', color: 'brand' }, { key: 'team', label: 'Team average', color: 'faint' }]} yDomain={[40, 100]} height={230} />}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Strengths and gaps" subtitle="Your parameters vs team average" icon={Target} />
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-xl" />
          ) : (
            <div className="flex flex-col gap-4">
              {[...data.strengths.map((s) => ({ ...s, good: true })), ...data.weaknesses.map((s) => ({ ...s, good: false }))].map((s) => (
                <div key={s.key} className="flex items-center gap-3">
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', s.good ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>{s.good ? <TrendUp size={15} weight="bold" /> : <TrendDown size={15} weight="bold" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate font-medium text-ink">{s.name}</span>
                      <ScorePill value={s.pct} />
                    </div>
                    <ScoreBar value={s.pct} marker={s.team} markerLabel={`Team ${fmtPercent(s.team)}`} className="mt-1.5 h-1.5" />
                    <div className="mt-1 text-2xs text-ink-muted">
                      {s.diff >= 0 ? '+' : ''}
                      {s.diff} pts vs team
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Latest feedback" subtitle="What QA noted on your recent call" icon={Quotes} />
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-xl" />
          ) : data.feedback ? (
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>
                  {data.feedback.call.contact.name} · {fmtRelative(data.feedback.call.startedAt)}
                </span>
                <ScorePill value={data.feedback.call.score} />
              </div>
              <ul className="flex flex-col gap-2">
                {data.feedback.notes.slice(0, 3).map((n) => (
                  <li key={n.name} className="rounded-xl bg-surface-2 p-3">
                    <div className="text-2xs font-semibold text-ink-muted">{n.name}</div>
                    <div className="mt-0.5 text-[13px] leading-snug text-ink-2">{n.note}</div>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" className="mt-auto self-start" onClick={() => setOpenCall(data.feedback.call)}>
                Listen to the call
              </Button>
            </div>
          ) : (
            <EmptyState compact icon={Quotes} title="No feedback yet" />
          )}
        </Card>

        <Card className="relative flex flex-col overflow-hidden">
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-brand/15 blur-3xl" />
          <CardHeader title="Next coaching task" subtitle="Practise with Diya, your AI coach" icon={ChalkboardTeacher} />
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-xl" />
          ) : data.nextTask ? (
            <div className="relative flex flex-1 flex-col gap-3">
              <StatusBadge status={data.nextTask.status} />
              <div>
                <div className="text-[15px] font-bold">Role-play: {data.nextTask.focus[0]}</div>
                <p className="mt-1 text-[13px] text-ink-muted">A 5-minute call with a customer who pushes back on {data.nextTask.focus[1].toLowerCase()}. Diya grades you at the end.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.nextTask.focus.map((f) => (
                  <Badge key={f}>{f}</Badge>
                ))}
              </div>
              <Button variant="brand" iconRight={ArrowRight} className="mt-auto self-start" as={Link} to={`/businesspulse/coach?agent=${data.agent.id}`}>
                Start practice
              </Button>
            </div>
          ) : (
            <EmptyState compact icon={CheckCircle} title="You are all caught up" description="New tasks appear after your next scored calls." />
          )}
        </Card>
      </div>

      <CallDetailDrawer call={openCall} open={!!openCall} onClose={() => setOpenCall(null)} />
    </Page>
  );
}

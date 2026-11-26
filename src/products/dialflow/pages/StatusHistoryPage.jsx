import { useMemo, useState } from 'react';
import { ArrowLeft, User } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtDuration, fmtPercent } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Button, Card, FilterSelect, MetricStrip, Segmented, Select, Skeleton, Timeline, SearchInput } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { GANTT_FILL, GanttAxis, GanttLegend, StatusGantt, hhmm, shareByState } from '../components/StatusGantt';

const STATES = ['Ready', 'In call', 'Wrap-up', 'Paused', 'Manual dial'];

const SORTS = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'talk', label: 'Most talk time' },
  { value: 'breaks', label: 'Most break time' },
  { value: 'login', label: 'First to log in' },
];
/** Minutes → "50m" / "1h 12m" (no seconds on a day-level report). */
const fmtMin = (m) => { const r = Math.round(m); return r >= 60 ? `${Math.floor(r / 60)}h ${String(r % 60).padStart(2, '0')}m` : `${r}m`; };
const BREAK_FLAG_MIN = 75; // more than this much break in a day is shown in red

/** Per-agent totals in minutes. */
function totals(r) {
  const share = shareByState(r.segments);
  const logged = Object.values(share).reduce((a, b) => a + b, 0);
  return { talk: share['In call'] || 0, available: share.Ready || 0, breaks: share.Paused || 0, logged, breakCount: r.segments.filter((x) => x.state === 'Paused').length };
}

export default function StatusHistoryPage() {
  const [date, setDate] = useState('today');
  const [agentId, setAgentId] = useState(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const { data: team, loading } = useQuery(() => df.getTeamStatus({ date }), [date]);
  const rows = useMemo(() => {
    const list = (team || []).filter((r) => !q || r.agent.name.toLowerCase().includes(q.toLowerCase())).map((r) => ({ r, t: totals(r) }));
    const cmp = { name: (a, b) => a.r.agent.name.localeCompare(b.r.agent.name), talk: (a, b) => b.t.talk - a.t.talk, breaks: (a, b) => b.t.breaks - a.t.breaks, login: (a, b) => a.r.login - b.r.login }[sort];
    return list.sort(cmp);
  }, [team, q, sort]);
  const focus = team?.find((r) => r.agent.id === agentId);

  const all = (team || []).map(totals);
  const sum = (k) => all.reduce((a, x) => a + x[k], 0);
  const logged = sum('logged') || 1;
  const heavyBreaks = all.filter((x) => x.breaks > BREAK_FLAG_MIN).length;

  return (
    <Page>
      <PageHeader
        title="Status history"
        description={focus ? `${focus.agent.name}’s day, block by block.` : 'How every agent spent their shift. Click an agent for their full day.'}
        actions={<Segmented value={date} onChange={setDate} options={[{ value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }, { value: 'd2', label: '24 Nov' }]} />}
      />
      {focus ? (
        <AgentDay row={focus} onBack={() => setAgentId(null)} agents={team} onPick={setAgentId} />
      ) : (
        <>
          <MetricStrip
            className="mb-4"
            items={
              loading
                ? [{ label: 'Loading…', value: '–' }]
                : [
                    { label: 'Agents', value: team.length, sub: `first login ${hhmm(Math.min(...team.map((r) => r.login)))}` },
                    { label: 'Talk', value: fmtPercent((sum('talk') / logged) * 100, 0), sub: `${fmtMin(sum('talk'))} in total` },
                    { label: 'Available', value: fmtPercent((sum('available') / logged) * 100, 0), sub: 'ready, waiting for a call' },
                    { label: 'Breaks', value: fmtPercent((sum('breaks') / logged) * 100, 0), sub: `${sum('breakCount')} breaks · ${fmtMin(sum('breaks'))}` },
                    { label: `Over ${BREAK_FLAG_MIN} min of breaks`, value: <span className={heavyBreaks ? 'text-danger' : ''}>{heavyBreaks}</span>, sub: heavyBreaks ? 'sort by break time to see who' : 'nobody' },
                  ]
            }
          />
          <Card padded={false}>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <SearchInput size="sm" value={q} onChange={setQ} placeholder="Find an agent" className="w-56" />
              <Select size="sm" value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS} className="w-44" aria-label="Sort agents" />
              <GanttLegend states={STATES} className="ml-auto" />
            </div>
            {loading ? (
              <div className="flex flex-col gap-3 p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[960px]">
                  <div className="grid grid-cols-[190px_1fr_76px_76px_76px] items-end gap-4 border-b border-line bg-surface-2 px-4 py-2">
                    <span className="text-xs font-semibold text-ink-muted">Agent</span>
                    <GanttAxis start={team[0].start} end={team[0].end} />
                    <span className="text-right text-xs font-semibold text-ink-muted">Talk</span>
                    <span className="text-right text-xs font-semibold text-ink-muted">Available</span>
                    <span className="text-right text-xs font-semibold text-ink-muted">Breaks</span>
                  </div>
                  {rows.map(({ r, t }) => (
                    <button
                      key={r.agent.id}
                      type="button"
                      onClick={() => setAgentId(r.agent.id)}
                      className="grid w-full grid-cols-[190px_1fr_76px_76px_76px] items-center gap-4 border-b border-line/60 px-4 py-2 text-left transition last:border-0 hover:bg-surface-2"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={r.agent.name} size="xs" />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-ink">{r.agent.name}</span>
                          <span className="block text-2xs text-ink-faint">in at {hhmm(r.login)}</span>
                        </span>
                      </span>
                      <StatusGantt segments={r.segments} start={r.start} end={r.end} now={r.now} height="h-6" inset="inset-y-1.5" />
                      <span className="text-right text-[13px] font-semibold tabular text-ink">{fmtMin(t.talk)}</span>
                      <span className="text-right text-[13px] tabular text-ink-2">{fmtMin(t.available)}</span>
                      <span className={cn('text-right text-[13px] tabular', t.breaks > BREAK_FLAG_MIN ? 'font-semibold text-danger' : 'text-ink-2')}>{fmtMin(t.breaks)}</span>
                    </button>
                  ))}
                  {!rows.length && <p className="px-4 py-10 text-center text-sm text-ink-muted">No agent matches “{q}”.</p>}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </Page>
  );
}

function AgentDay({ row, onBack, agents, onPick }) {
  const share = shareByState(row.segments);
  const total = Object.values(share).reduce((a, b) => a + b, 0) || 1;
  const pauses = row.segments.filter((s) => s.state === 'Paused');
  const longest = useMemo(() => [...row.segments].sort((a, b) => b.end - b.start - (a.end - a.start)).slice(0, 6), [row]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
          All agents
        </Button>
        <FilterSelect label="Agent" icon={User} single searchable options={agents.map((a) => ({ value: a.agent.id, label: a.agent.name }))} value={[row.agent.id]} onChange={(v) => v[0] && onPick(v[0])} />
      </div>
      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Avatar name={row.agent.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold">{row.agent.name}</div>
            <div className="text-xs text-ink-muted">
              {row.agent.id} · {row.agent.group} · logged in at {hhmm(row.login)}
            </div>
          </div>
          <GanttLegend states={STATES} />
        </div>
        <StatusGantt segments={row.segments} start={row.start} end={row.end} now={row.now} height="h-12" inset="inset-y-2" />
        <GanttAxis start={row.start} end={row.end} className="mt-1.5" />
        <div className="mt-5 grid grid-cols-2 gap-y-3 border-t border-line pt-4 sm:grid-cols-5 sm:divide-x sm:divide-line">
          {STATES.map((s, i) => (
            <div key={s} className={cn(i && 'sm:pl-4')}>
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span className={cn('h-2 w-3 rounded-[3px]', GANTT_FILL[s])} />
                {s === 'Ready' ? 'Available' : s === 'Paused' ? 'Break' : s}
              </div>
              <div className="mt-0.5 font-display text-lg font-bold tabular">{fmtMin(share[s] || 0)}</div>
              <div className="text-2xs text-ink-faint">{fmtPercent(((share[s] || 0) / total) * 100, 0)} of logged-in time</div>
            </div>
          ))}
        </div>
      </Card>
      <div>
        <Card>
          <h3 className="mb-1 text-[15px] font-bold">Breaks and long stretches</h3>
          <p className="mb-4 text-xs text-ink-muted">{pauses.length} breaks · {fmtDuration(pauses.reduce((a, p) => a + p.end - p.start, 0) * 60)} in total</p>
          <Timeline
            items={longest.map((s) => ({
              title: `${s.state}${s.reason ? ` · ${s.reason}` : ''}`,
              time: `${hhmm(s.start)} – ${hhmm(s.end)}`,
              description: fmtDuration((s.end - s.start) * 60),
              tone: s.state === 'Paused' ? 'neutral' : s.state === 'In call' ? 'brand' : s.state === 'Ready' ? 'success' : 'info',
            }))}
          />
        </Card>
      </div>
    </div>
  );
}

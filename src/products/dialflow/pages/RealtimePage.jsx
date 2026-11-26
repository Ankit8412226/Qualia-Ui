import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Broadcast, DownloadSimple, Ear, Kanban, List, Megaphone, SquaresFour, UsersFour, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDuration } from '@/lib/format';
import { useQuery, useTick } from '@/lib/hooks';
import { Avatar, Button, Card, DataTable, EmptyState, FilterBar, FilterSelect, LiveIndicator, Segmented, Select, Skeleton, Tooltip, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { AGENT_STATES, STATE_META, StatePill, TimeInState, secondsSince, urgency } from '../components/agentState';
import { AgentLiveDrawer } from '../components/AgentLiveDrawer';
import { SupervisionBar } from '../components/Supervision';
import { downloadCsv } from '../components/csv';

const SORTS = [
  { value: 'attention', label: 'Needs attention first' },
  { value: 'longest', label: 'Longest in state' },
  { value: 'state', label: 'By state' },
  { value: 'name', label: 'Name A–Z' },
];

export default function RealtimePage() {
  const { data, loading } = useQuery(() => df.getFloor(), []);
  const [params] = useSearchParams();
  const t = useTick(1000);
  const toast = useToast();
  const [state, setState] = useState(() => params.get('state') || 'all');
  const [camps, setCamps] = useState(() => (params.get('campaign') ? [params.get('campaign')] : []));
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('attention');
  const [view, setView] = useState('board');
  const [open, setOpen] = useState(null);
  const [session, setSession] = useState(null);
  const [updatedAt] = useState(() => new Date(Date.now() - 2000));

  const agents = data?.agents || [];
  const scoped = agents.filter((a) => (!camps.length || camps.includes(a.campaignId)) && (!groups.length || groups.includes(a.group)) && (!search || a.name.toLowerCase().includes(search.toLowerCase())));
  const withSecs = scoped.map((a) => ({ a, secs: secondsSince(a.stateSince, t), u: urgency(a, secondsSince(a.stateSince, t)) }));
  const counts = Object.fromEntries(AGENT_STATES.map((s) => [s, scoped.filter((a) => a.state === s).length]));
  const alerts = withSecs.filter((x) => x.u === 2).length;

  const filtered = useMemo(() => {
    const out = withSecs.filter((x) => state === 'all' || (state === 'attention' ? x.u === 2 : x.a.state === state));
    const out2 = (x) => (x.a.state === 'Logged out' ? 1 : 0);
    const cmp = {
      attention: (x, y) => out2(x) - out2(y) || y.u - x.u || y.secs - x.secs,
      longest: (x, y) => out2(x) - out2(y) || y.secs - x.secs,
      state: (x, y) => AGENT_STATES.indexOf(x.a.state) - AGENT_STATES.indexOf(y.a.state) || y.secs - x.secs,
      name: (x, y) => x.a.name.localeCompare(y.a.name),
    }[sort];
    return out.sort(cmp);
    // t changes every second; resorting each tick is cheap for a floor of this size
  }, [withSecs, state, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const monitor = (call, mode) => {
    setSession((s) => ({ call, mode, since: s?.call.id === call.id ? s.since : Date.now() }));
    setOpen(null);
  };

  const exportCsv = () =>
    downloadCsv(
      'realtime-floor',
      [
        { header: 'Agent ID', key: 'id' },
        { header: 'Agent', key: 'name' },
        { header: 'State', key: 'state' },
        { header: 'Break reason', key: 'breakReason' },
        { header: 'Seconds in state', value: (a) => secondsSince(a.stateSince) },
        { header: 'Campaign', key: 'campaign' },
        { header: 'Calls today', key: 'callsToday' },
      ],
      filtered.map((x) => x.a),
    );


  return (
    <Page>
      <PageHeader
        title="Real-time floor"
        description={loading ? 'Loading the floor…' : `${scoped.length - counts['Logged out']} logged in · ${counts.Ready} ready for a call · ${counts['In call']} talking · ${alerts ? `${alerts} over their limit` : 'everyone within limits'}`}
        meta={<LiveIndicator updatedAt={updatedAt} />}
        actions={
          <Button icon={DownloadSimple} onClick={exportCsv}>
            Download
          </Button>
        }
      />

      <FloorSummary loading={loading} total={scoped.length} counts={counts} alerts={alerts} state={state} onState={setState} />

      <FilterBar
        className="mb-4"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Find an agent"
        canReset={!!(state !== 'all' || camps.length || groups.length || search)}
        onReset={() => {
          setState('all');
          setCamps([]);
          setGroups([]);
          setSearch('');
        }}
        actions={
          <>
            <Select size="sm" value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS} className="w-48" aria-label="Sort" />
            <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'board', label: 'Board', icon: Kanban }, { value: 'tiles', label: 'Grid', icon: SquaresFour }, { value: 'list', label: 'List', icon: List }]} />
          </>
        }
      >
        <FilterSelect label="Campaign" icon={Megaphone} options={(data?.campaigns || []).filter((c) => c.status !== 'Completed').map((c) => ({ value: c.id, label: c.name }))} value={camps} onChange={setCamps} />
        <FilterSelect label="Group" icon={UsersFour} options={[...new Set(agents.map((a) => a.group))]} value={groups} onChange={setGroups} />
      </FilterBar>

      {loading ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-xl" />
          ))}
        </div>
      ) : !filtered.length ? (
        <Card>
          <EmptyState icon={Broadcast} title={state === 'attention' ? 'Nobody needs attention' : 'No agent matches'} description={state === 'attention' ? 'Every agent is within their time limits.' : 'Clear a filter to see more of the floor.'} />
        </Card>
      ) : view === 'board' ? (
        <FloorBoard items={filtered} state={state} session={session} onOpen={setOpen} />
      ) : view === 'tiles' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filtered.map(({ a, secs, u }) => (
            <AgentTile key={a.id} agent={a} secs={secs} u={u} monitored={session?.call.agent.id === a.id} onClick={() => setOpen(a)} />
          ))}
        </div>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <DataTable
            rows={filtered.map((x) => x.a)}
            pageSize={0}
            dense
            onRowClick={setOpen}
            rowClassName={(a) => (urgency(a, secondsSince(a.stateSince, t)) === 2 ? 'bg-danger/[.04]' : '')}
            columns={[
              { key: 'name', header: 'Agent', sortable: true, render: (a) => <div className="flex items-center gap-2.5"><Avatar name={a.name} size="xs" /><span className="font-medium text-ink">{a.name}</span></div> },
              { key: 'state', header: 'State', render: (a) => <div className="flex items-center gap-2"><StatePill state={a.state} />{a.breakReason && <span className="text-xs text-ink-muted">{a.breakReason} · limit {a.breakLimit} min</span>}</div> },
              { key: 'time', header: 'Time in state', align: 'right', render: (a) => <TimeInState agent={a} className="text-sm" /> },
              { key: 'lead', header: 'Talking to', hideBelow: 'lg', render: (a) => a.currentCall?.contact || <span className="text-ink-faint">—</span> },
              { key: 'campaign', header: 'Campaign', hideBelow: 'md' },
              { key: 'group', header: 'Group', hideBelow: 'xl' },
              { key: 'callsToday', header: 'Calls', align: 'right', sortable: true },
              { key: 'talkToday', header: 'Talk today', align: 'right', hideBelow: 'lg', sortable: true, render: (a) => fmtDuration(a.talkToday) },
            ]}
          />
        </Card>
      )}

      <AgentLiveDrawer agent={open} onClose={() => setOpen(null)} monitoring={session} onMonitor={monitor} />
      <SupervisionBar
        session={session}
        onMode={(mode) => {
          setSession((s) => ({ ...s, mode }));
          toast({ tone: 'info', title: mode === 'barge' ? 'You joined the call' : mode === 'whisper' ? 'Whispering: only the agent hears you' : 'Listening silently', duration: 1800 });
        }}
        onStop={() => setSession(null)}
      />
      {session && <div className="h-24" />}
    </Page>
  );
}

/**
 * Floor tile: who, what state, for how long. One small state dot; the card turns red only when
 * the agent is over a limit, and the timer turns amber only when it's worth a look.
 */
function AgentTile({ agent: a, secs, u, onClick, monitored }) {
  const m = STATE_META[a.state];
  const out = a.state === 'Logged out';
  const sub = a.state === 'In call' ? `with ${a.currentCall.contact}` : a.state === 'Paused' ? `${a.breakReason} · limit ${a.breakLimit} min` : a.state === 'Logged out' ? a.group : a.campaign;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 text-left shadow-card transition hover:border-line-strong focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
        u === 2 ? 'border-danger/50' : 'border-line',
        out && 'opacity-60 shadow-none',
      )}
    >
      <Avatar name={a.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-ink">{a.name}</span>
          {monitored && (
            <Tooltip content="You are monitoring this call">
              <Ear size={13} weight="fill" className="shrink-0 text-brand" />
            </Tooltip>
          )}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', m.dot)} />
          <span className="shrink-0 text-ink-2">{a.state}</span>
          <span className="truncate">· {sub}</span>
        </span>
      </span>
      <span className={cn('shrink-0 font-mono text-[13px] font-semibold tabular', u === 2 ? 'text-danger' : u === 1 ? 'text-warning' : 'text-ink-muted')}>{out ? '—' : fmtClock(secs)}</span>
    </button>
  );
}

const BOARD_STATES = ['Ready', 'In call', 'Wrap-up', 'Paused', 'Manual dial'];

/** The floor at a glance: one block per state, sized by share; click to filter. */
function FloorSummary({ loading, total, counts, alerts, state, onState }) {
  const online = total - (counts['Logged out'] || 0);
  return (
    <Card padded={false} className="mb-4 overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        <div className="grid flex-1 grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
          {[...BOARD_STATES, 'Logged out'].map((s) => {
            const m = STATE_META[s];
            const n = counts[s] || 0;
            const on = state === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onState(on ? 'all' : s)}
                aria-pressed={on}
                className={cn('group relative px-4 py-3.5 text-left transition hover:bg-surface-2', on && 'bg-brand/[.05]')}
              >
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <span className={cn('h-2 w-2 rounded-full', m.dot)} />
                  {s}
                </span>
                <span className="mt-1 block font-display text-2xl font-bold tabular text-ink">{loading ? '–' : n}</span>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-surface-3">
                  <span className={cn('block h-full rounded-full', m.fill)} style={{ width: `${online ? (n / (s === 'Logged out' ? total : online)) * 100 : 0}%` }} />
                </span>
                {on && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" />}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onState(state === 'attention' ? 'all' : 'attention')}
          aria-pressed={state === 'attention'}
          className={cn(
            'flex items-center gap-3 border-t border-line px-5 py-3.5 text-left transition lg:w-56 lg:border-l lg:border-t-0',
            alerts ? 'bg-danger/[.04] hover:bg-danger/[.07]' : 'hover:bg-surface-2',
            state === 'attention' && 'ring-2 ring-inset ring-danger/30',
          )}
        >
          <WarningCircle size={22} weight={alerts ? 'fill' : 'regular'} className={alerts ? 'text-danger' : 'text-ink-faint'} />
          <span>
            <span className={cn('block font-display text-2xl font-bold tabular', alerts ? 'text-danger' : 'text-ink')}>{loading ? '–' : alerts}</span>
            <span className="block text-xs text-ink-muted">{alerts ? 'over their time limit' : 'everyone within limits'}</span>
          </span>
        </button>
      </div>
    </Card>
  );
}

/** Board: one column per state so the floor reads left to right. Logged-out agents sit in a slim row below. */
function FloorBoard({ items, state, session, onOpen }) {
  const cols = BOARD_STATES.filter((s) => (state === 'all' || state === 'attention' ? s !== 'Manual dial' || items.some((x) => x.a.state === s) : s === state));
  const off = items.filter((x) => x.a.state === 'Logged out');
  return (
    <div className="flex flex-col gap-4">
      <div className={cn('grid gap-4', cols.length >= 5 ? 'md:grid-cols-2 xl:grid-cols-5' : cols.length === 4 ? 'md:grid-cols-2 xl:grid-cols-4' : cols.length === 1 ? 'max-w-xl' : 'md:grid-cols-3')}>
        {cols.map((s) => {
          const list = items.filter((x) => x.a.state === s);
          const over = list.filter((x) => x.u === 2).length;
          const m = STATE_META[s];
          return (
            <section key={s} className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface-2/60">
              <header className="flex items-center gap-2 px-4 pb-2 pt-3.5">
                <span className={cn('h-2 w-2 rounded-full', m.dot)} />
                <h3 className="text-[13px] font-semibold text-ink">{s}</h3>
                <span className="text-[13px] tabular text-ink-muted">{list.length}</span>
                {over > 0 && <span className="ml-auto text-xs font-medium text-danger">{over} over limit</span>}
              </header>
              <ul className="flex flex-col gap-1.5 px-2 pb-2">
                {list.map(({ a, secs, u }) => (
                  <li key={a.id}>
                    <BoardRow agent={a} secs={secs} u={u} monitored={session?.call.agent.id === a.id} onClick={() => onOpen(a)} />
                  </li>
                ))}
                {!list.length && <li className="px-2 py-6 text-center text-xs text-ink-faint">Nobody right now</li>}
              </ul>
            </section>
          );
        })}
      </div>
      {off.length > 0 && (state === 'all' || state === 'Logged out') && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-3 text-xs text-ink-muted">
          <span className="font-medium text-ink-2">Logged out · {off.length}</span>
          {off.map(({ a }) => (
            <button key={a.id} onClick={() => onOpen(a)} className="rounded-full bg-surface-3 px-2.5 py-1 hover:bg-line">
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BoardRow({ agent: a, secs, u, onClick, monitored }) {
  const sub = a.state === 'In call' ? `with ${a.currentCall.contact}` : a.state === 'Paused' ? `${a.breakReason} · limit ${a.breakLimit}m` : a.campaign;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl border bg-surface px-2.5 py-2 text-left transition hover:border-line-strong hover:shadow-card focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
        u === 2 ? 'border-danger/40 bg-danger/[.03]' : 'border-transparent shadow-[0_1px_2px_rgb(11_16_32/.05)]',
      )}
    >
      <Avatar name={a.name} size="xs" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="truncate text-[13px] font-medium text-ink">{a.name}</span>
          {monitored && <Ear size={12} weight="fill" className="shrink-0 text-brand" />}
        </span>
        <span className="block truncate text-2xs text-ink-muted">{sub}</span>
      </span>
      <span className={cn('shrink-0 font-mono text-xs font-semibold tabular', u === 2 ? 'text-danger' : u === 1 ? 'text-warning' : 'text-ink-muted')}>{fmtClock(secs)}</span>
    </button>
  );
}

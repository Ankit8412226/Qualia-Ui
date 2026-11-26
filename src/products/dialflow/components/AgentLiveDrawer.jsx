import { ChatCircleText, SignOut } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDuration, fmtNumber, fmtPhone } from '@/lib/format';
import { useQuery, useTick } from '@/lib/hooks';
import { Avatar, Button, Drawer, Skeleton, useConfirm, useToast } from '@/design-system';
import * as df from '@/services/dialflow';
import { StateLegend, StatePill, secondsSince, urgency } from './agentState';
import { GanttAxis, StatusGantt } from './StatusGantt';
import { LiveCallCard } from './Supervision';

/** Agent detail from the floor: state, live call with Listen/Whisper/Barge, today's timeline. */
export function AgentLiveDrawer({ agent, onClose, monitoring, onMonitor }) {
  const t = useTick(1000);
  const toast = useToast();
  const confirm = useConfirm();
  const { data: day, loading } = useQuery(() => (agent ? df.getStatusHistory({ agentId: agent.id }) : Promise.resolve(null)), [agent?.id]);
  if (!agent) return null;
  const secs = secondsSince(agent.stateSince, t);
  const u = urgency(agent, secs);
  const first = agent.name.split(' ')[0];
  const call = agent.currentCall ? { id: `live_${agent.id}`, agent, contact: { name: agent.currentCall.contact, phone: agent.currentCall.phone }, campaign: agent.campaign, startedAt: agent.stateSince } : null;
  const stateLine =
    agent.state === 'Paused'
      ? `${agent.breakReason} · limit ${agent.breakLimit} min${u === 2 ? ` · ${Math.round(secs / 60 - agent.breakLimit)} min over` : ''}`
      : agent.state === 'Logged out'
        ? 'Not signed in'
        : agent.campaign;

  return (
    <Drawer
      open={!!agent}
      onClose={onClose}
      width={540}
      title={
        <div className="flex items-center gap-3">
          <Avatar name={agent.name} size="lg" />
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">{agent.name}</div>
            <div className="text-xs text-ink-muted">
              {agent.id} · ext {agent.extension} · {agent.group}
            </div>
          </div>
        </div>
      }
      footer={
        <>
          <Button
            variant="danger-soft"
            icon={SignOut}
            className="mr-auto"
            disabled={agent.state === 'Logged out'}
            onClick={async () => {
              if (await confirm({ title: `Log out ${agent.name}?`, message: 'Any call in progress continues; no new calls will be sent to this agent.', tone: 'danger', confirmLabel: 'Log out' })) toast(`${agent.name} logged out`);
            }}
          >
            Force log out
          </Button>
          <Button icon={ChatCircleText} onClick={() => toast({ title: 'Message sent', description: `${first} will see it as a banner.` })}>
            Message {first}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <StatePill state={agent.state} />
            <div className={cn('mt-1.5 truncate text-sm', u === 2 ? 'font-medium text-danger' : 'text-ink-muted')}>{stateLine}</div>
          </div>
          <div className="text-right">
            <div className={cn('font-mono text-3xl font-bold leading-none tabular', u === 2 ? 'text-danger' : u === 1 ? 'text-warning' : 'text-ink')}>{agent.state === 'Logged out' ? '—' : fmtClock(secs)}</div>
            <div className="mt-1 text-2xs text-ink-muted">in this state</div>
          </div>
        </div>

        {call ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold">
              Live call
              <span className="text-xs font-normal text-ink-muted">{fmtPhone(call.contact.phone)}</span>
            </div>
            <LiveCallCard call={call} mode={monitoring?.call.id === call.id ? monitoring.mode : null} onPick={(mode) => onMonitor?.(call, mode)} />
          </div>
        ) : (
          agent.state !== 'Logged out' && <p className="text-sm text-ink-muted">Not on a call. Listen, Whisper and Barge show up here while {first} is talking.</p>
        )}

        <dl className="grid grid-cols-4 divide-x divide-line border-y border-line py-3">
          {[
            ['Calls today', fmtNumber(agent.callsToday)],
            ['Connected', fmtNumber(agent.connectedToday)],
            ['Talk time', fmtDuration(agent.talkToday)],
            ['QA score', agent.qa],
          ].map(([l, v], i) => (
            <div key={l} className={cn(i ? 'pl-4' : '')}>
              <dt className="text-2xs text-ink-muted">{l}</dt>
              <dd className={cn('mt-0.5 font-display text-base font-bold tabular', l === 'QA score' && (agent.qa < 60 ? 'text-danger' : agent.qa < 80 ? 'text-warning' : 'text-success'))}>{v}</dd>
            </div>
          ))}
        </dl>

        <div>
          <div className="mb-2 text-sm font-semibold">Today’s timeline</div>
          {loading || !day ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <>
              <StatusGantt segments={day.segments} start={day.start} end={day.end} now={day.now} />
              <GanttAxis start={day.start} end={day.end} className="mt-1" />
              <StateLegend states={['Ready', 'In call', 'Wrap-up', 'Paused', 'Manual dial']} className="mt-2" />
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}

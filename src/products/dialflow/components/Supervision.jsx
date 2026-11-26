import { createPortal } from 'react-dom';
import { Ear, Megaphone, PhoneDisconnect, UsersThree, Waveform as WaveIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock } from '@/lib/format';
import { useTick } from '@/lib/hooks';
import { Avatar, Button, Tooltip, Waveform } from '@/design-system';
import { secondsSince } from './agentState';

/*
 * Supervisor monitoring: Listen (silent), Whisper (only the agent hears), Barge (join the call).
 * mode = 'listen' | 'whisper' | 'barge'
 */
export const MONITOR_MODES = [
  { id: 'listen', label: 'Listen', icon: Ear, hint: 'Hear the call silently' },
  { id: 'whisper', label: 'Whisper', icon: Megaphone, hint: 'Only the agent hears you' },
  { id: 'barge', label: 'Barge', icon: UsersThree, hint: 'Join the call: both sides hear you' },
];

/** Three compact buttons. `active` highlights the current mode for this call. */
export function MonitorButtons({ active, onPick, size = 'xs', className }) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {MONITOR_MODES.map((m) => (
        <Tooltip key={m.id} content={m.hint}>
          <Button size={size} variant={active === m.id ? 'brand' : 'secondary'} icon={m.icon} onClick={(e) => { e.stopPropagation(); onPick(m.id); }}>
            {m.label}
          </Button>
        </Tooltip>
      ))}
    </div>
  );
}

/** Sticky bar at the bottom of the viewport while a supervisor is monitoring a call. */
export function SupervisionBar({ session, onMode, onStop }) {
  const t = useTick(1000);
  if (!session) return null;
  const { call, mode, since } = session;
  const meta = MONITOR_MODES.find((m) => m.id === mode);
  const ModeIcon = meta.icon;
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[65] flex justify-center px-4 pb-4">
      <div className="flex w-full max-w-3xl animate-rise flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 pl-4 shadow-pop">
        <ModeIcon size={20} weight="fill" className="shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {meta.label === 'Barge' ? 'In the call with' : `${meta.label}ing to`} {call.agent.name}
            <Waveform className="text-brand" />
          </div>
          <div className="truncate text-xs text-ink-muted">
            {call.contact.name} · {call.campaign} · call {fmtClock(secondsSince(call.startedAt, t))} · you joined {fmtClock(secondsSince(since, t))} ago
          </div>
        </div>
        <div className="inline-flex rounded-xl bg-surface-3 p-1">
          {MONITOR_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onMode(m.id)}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition', m.id === mode ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink')}
            >
              <m.icon size={14} weight="bold" />
              {m.label}
            </button>
          ))}
        </div>
        <Button variant="danger" size="sm" icon={PhoneDisconnect} onClick={onStop}>
          Leave
        </Button>
      </div>
    </div>,
    document.body,
  );
}

/** Row of the live call, used inside drawers. */
export function LiveCallCard({ call, mode, onPick }) {
  const t = useTick(1000);
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="flex items-center gap-3">
        <Avatar name={call.contact.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{call.contact.name}</div>
          <div className="truncate text-xs text-ink-muted">{call.campaign}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold tabular">{fmtClock(secondsSince(call.startedAt, t))}</div>
          <div className="inline-flex items-center gap-1 text-2xs text-info">
            <WaveIcon size={12} /> live
          </div>
        </div>
      </div>
      <MonitorButtons active={mode} onPick={onPick} size="sm" className="mt-4 flex w-full [&>span]:flex-1 [&_button]:w-full" />
    </div>
  );
}

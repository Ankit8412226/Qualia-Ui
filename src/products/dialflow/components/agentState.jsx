import { Coffee, Headset, Keyboard, PencilSimpleLine, PhoneCall, SignOut } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock } from '@/lib/format';
import { useTick } from '@/lib/hooks';

/*
 * One colour + icon per agent state, used by the floor, tiles, status history, APR and the workspace.
 * Full class strings (not built at runtime) so Tailwind keeps them.
 */
export const AGENT_STATES = ['Ready', 'In call', 'Wrap-up', 'Paused', 'Manual dial', 'Logged out'];

export const STATE_META = {
  Ready: { dot: 'bg-success', fill: 'bg-success', tint: 'bg-success/[.05]', soft: 'bg-success/10', text: 'text-success', border: 'border-success/30', icon: Headset, hint: 'Waiting for a call' },
  'In call': { dot: 'bg-brand', fill: 'bg-brand', tint: 'bg-brand/[.05]', soft: 'bg-brand/10', text: 'text-brand', border: 'border-brand/30', icon: PhoneCall, hint: 'Talking to a lead' },
  'Wrap-up': { dot: 'bg-[rgb(var(--series-2))]', fill: 'bg-[rgb(var(--series-2))]', tint: 'bg-[rgb(var(--series-2)/.05)]', soft: 'bg-[rgb(var(--series-2)/.1)]', text: 'text-[rgb(var(--series-2))]', border: 'border-[rgb(var(--series-2)/.3)]', icon: PencilSimpleLine, hint: 'Saving notes and disposition' },
  Paused: { dot: 'bg-ink-muted', fill: 'bg-ink-muted', tint: 'bg-surface-2', soft: 'bg-surface-3', text: 'text-ink-2', border: 'border-line-strong', icon: Coffee, hint: 'On a break or pause code' },
  'Manual dial': { dot: 'bg-brand/60', fill: 'bg-brand/60', tint: 'bg-brand/[.04]', soft: 'bg-brand/10', text: 'text-brand', border: 'border-brand/30', icon: Keyboard, hint: 'Dialling by hand' },
  'Logged out': { dot: 'bg-ink-faint', fill: 'bg-ink-faint/40', tint: 'bg-surface-2', soft: 'bg-surface-3', text: 'text-ink-muted', border: 'border-line', icon: SignOut, hint: 'Not signed in' },
};

/** Seconds after which time-in-state becomes a concern / a problem. Paused uses the break limit. */
export const STATE_LIMITS = { Ready: [180, 420], 'In call': [420, 780], 'Wrap-up': [45, 90], 'Manual dial': [90, 180] };

/** 0 = fine, 1 = watch, 2 = act now. */
export function urgency(agent, secs) {
  if (agent.state === 'Logged out') return 0;
  if (agent.state === 'Paused') {
    const lim = (agent.breakLimit || 15) * 60;
    return secs > lim ? 2 : secs > lim * 0.8 ? 1 : 0;
  }
  const [warn, bad] = STATE_LIMITS[agent.state] || [Infinity, Infinity];
  return secs > bad ? 2 : secs > warn ? 1 : 0;
}

export const secondsSince = (d, t = Date.now()) => Math.max(0, Math.round((t - new Date(d).getTime()) / 1000));

/** Small pill: coloured dot + state name. */
export function StatePill({ state, className, size = 'sm' }) {
  const m = STATE_META[state] || STATE_META['Logged out'];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium', size === 'xs' ? 'px-1.5 py-px text-2xs' : 'px-2 py-0.5 text-xs', m.soft, m.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot, state === 'In call' && 'animate-pulse-dot')} />
      {state}
    </span>
  );
}

/** Ticking mm:ss since `since`; colour escalates with urgency. */
export function TimeInState({ agent, className }) {
  const t = useTick(1000);
  const secs = secondsSince(agent.stateSince, t);
  const u = urgency(agent, secs);
  return (
    <span className={cn('font-mono text-xs font-semibold tabular', u === 2 ? 'text-danger' : u === 1 ? 'text-warning' : 'text-ink-muted', className)}>
      {agent.state === 'Logged out' ? '—' : fmtClock(secs)}
    </span>
  );
}

/** Legend row for state colours. */
export function StateLegend({ states = Object.keys(STATE_META), className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted', className)}>
      {states.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-[3px]', STATE_META[s].fill)} />
          {s}
        </span>
      ))}
    </div>
  );
}

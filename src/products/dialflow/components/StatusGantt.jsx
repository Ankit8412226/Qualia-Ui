import { cn } from '@/lib/cn';
import { fmtDuration } from '@/lib/format';
import { STATE_META } from './agentState';

/* Timeline fills: talk time is the strong colour; everything else is quieter so talk vs breaks reads at a glance. */
export const GANTT_FILL = {
  Ready: 'bg-success/40',
  'In call': 'bg-brand',
  'Wrap-up': 'bg-[rgb(var(--series-2)/.55)]',
  Paused: 'bg-ink-muted/70',
  'Manual dial': 'bg-brand/45',
  'Logged out': 'bg-transparent',
};

/** Legend for the timeline fills. */
export function GanttLegend({ states, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted', className)}>
      {states.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2.5 w-4 rounded-[3px]', GANTT_FILL[s])} />
          {s === 'Ready' ? 'Available' : s === 'Paused' ? 'Break' : s}
        </span>
      ))}
    </div>
  );
}

const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;

/** Hour labels across the shift. */
export function GanttAxis({ start, end, className }) {
  const hours = [];
  for (let h = Math.ceil(start / 60); h * 60 <= end; h++) hours.push(h);
  return (
    <div className={cn('relative h-5 text-2xs text-ink-faint', className)}>
      {hours.map((h) => (
        <span key={h} className="absolute -translate-x-1/2 tabular" style={{ left: `${((h * 60 - start) / (end - start)) * 100}%` }}>
          {String(h).padStart(2, '0')}:00
        </span>
      ))}
    </div>
  );
}

/**
 * Gantt-like strip of status segments across a shift.
 * segments = [{state, start, end, reason}] in minutes from midnight. `now` draws a marker.
 */
export function StatusGantt({ segments, start, end, now, height = 'h-9', showGrid = true, className, inset = 'inset-y-1' }) {
  const span = end - start;
  const x = (m) => ((m - start) / span) * 100;
  const hours = [];
  for (let h = Math.ceil(start / 60); h * 60 <= end; h++) hours.push(h);
  return (
    <div className={cn('relative w-full rounded-md', height, className)}>
      {showGrid && hours.map((h) => <span key={h} className="absolute inset-y-0 w-px bg-line/70" style={{ left: `${x(h * 60)}%` }} />)}
      {now != null && now < end && <span className="absolute inset-y-1 right-0 rounded-r-md bg-[repeating-linear-gradient(135deg,rgb(var(--surface-3))_0_4px,transparent_4px_8px)]" style={{ left: `${x(now)}%` }} />}
      {segments.map((s, i) => {
        const m = STATE_META[s.state];
        return (
          <div key={i} className={cn('group/seg absolute', inset)} style={{ left: `${x(s.start)}%`, width: `${Math.max(x(s.end) - x(s.start), 0.25)}%` }}>
            <span className={cn('block h-full border-r border-surface transition group-hover/seg:brightness-90', GANTT_FILL[s.state] || m.fill, i === 0 && 'rounded-l-[3px]')} />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-canvas opacity-0 shadow-pop transition-opacity group-hover/seg:opacity-100">
              <span className="block font-semibold">
                {s.state}
                {s.reason ? ` · ${s.reason}` : ''}
              </span>
              <span className="block opacity-80 tabular">
                {hhmm(s.start)} – {hhmm(s.end)} · {fmtDuration((s.end - s.start) * 60)}
              </span>
            </span>
          </div>
        );
      })}
      {now != null && now < end && <span className="absolute -inset-y-0.5 z-10 w-px bg-ink/50" style={{ left: `${x(now)}%` }} />}
    </div>
  );
}

/** Minutes per state from segments. */
export function shareByState(segments) {
  const out = {};
  segments.forEach((s) => {
    out[s.state] = (out[s.state] || 0) + (s.end - s.start);
  });
  return out;
}

export { hhmm };

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  DownloadSimple,
  Pause,
  Play,
  Quotes,
  Robot,
  Sparkle,
  SpeakerHigh,
  User,
  Headset,
  ShareNetwork,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDateTime, fmtDuration, fmtPhone } from '@/lib/format';
import { Avatar, Badge, Button, DescriptionList, Drawer, ProgressRing, SearchInput, StatusBadge, Tabs, scoreTone } from '@/design-system';

/*
 * One call-detail experience for Agent Flow, DialFlow and Business Pulse.
 * call = {
 *   id, contact: {name, phone}, direction: 'outbound'|'inbound', status, startedAt, duration (s),
 *   agent: {name, kind: 'ai'|'human'}, campaign, disposition, summary,
 *   transcript: [{ speaker: 'agent'|'customer', text, t (s) }],
 *   fields: [{label, value}], score (0-100), parameters: [{name, score, max, fatal, note}], sentiment, tags: []
 * }
 */

/** Fake waveform + transport. UI only: plays a timer, not real audio, until the API gives recording URLs. */
export function AudioPlayer({ duration = 120, onTime, seekTo, className }) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState(1);
  const bars = useMemo(() => Array.from({ length: 72 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.37)) * 0.75), []);
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setT((x) => (x + 0.25 * speed >= duration ? (setPlaying(false), duration) : x + 0.25 * speed)), 250);
    return () => clearInterval(id);
  }, [playing, speed, duration]);
  useEffect(() => onTime?.(t), [t, onTime]);
  useEffect(() => {
    if (seekTo != null) setT(seekTo);
  }, [seekTo]);
  const pct = t / duration;
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3', className)}>
      <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink shadow-glow transition hover:scale-105">
        {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
      </button>
      <div
        className="flex h-10 flex-1 cursor-pointer items-center gap-[2px]"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setT(((e.clientX - r.left) / r.width) * duration);
        }}
      >
        {bars.map((b, i) => (
          <span key={i} className={cn('flex-1 rounded-full transition-colors', i / bars.length <= pct ? 'bg-brand' : 'bg-line-strong')} style={{ height: `${b * 100}%` }} />
        ))}
      </div>
      <span className="w-[86px] shrink-0 text-right text-xs tabular text-ink-muted">
        {fmtClock(t)} / {fmtClock(duration)}
      </span>
      <button onClick={() => setSpeed((s) => (s >= 2 ? 1 : s + 0.5))} className="h-7 shrink-0 rounded-lg border border-line px-2 text-xs font-semibold tabular text-ink-2 hover:bg-surface-3">
        {speed}x
      </button>
      <SpeakerHigh size={16} className="hidden shrink-0 text-ink-muted sm:block" />
    </div>
  );
}

/** Chat-style transcript with search and click-to-seek. `current` highlights the line being played. */
export function Transcript({ lines = [], current = 0, onSeek, agentKind = 'human', className }) {
  const [q, setQ] = useState('');
  const activeRef = useRef(null);
  const activeIdx = lines.reduce((acc, l, i) => (l.t <= current ? i : acc), -1);
  const shown = q ? lines.filter((l) => l.text.toLowerCase().includes(q.toLowerCase())) : lines;
  useEffect(() => activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), [activeIdx]);
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <SearchInput size="sm" value={q} onChange={setQ} placeholder="Search transcript" />
      <ol className="flex flex-col gap-3">
        {shown.map((l) => {
          const i = lines.indexOf(l);
          const isAgent = l.speaker === 'agent';
          const active = i === activeIdx;
          return (
            <li key={i} ref={active ? activeRef : undefined} className={cn('flex gap-2.5', isAgent ? '' : 'flex-row-reverse')}>
              <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', isAgent ? 'bg-brand/10 text-brand' : 'bg-surface-3 text-ink-2')}>
                {isAgent ? agentKind === 'ai' ? <Robot size={14} weight="fill" /> : <Headset size={14} weight="fill" /> : <User size={14} weight="fill" />}
              </span>
              <button
                onClick={() => onSeek?.(l.t)}
                className={cn(
                  'max-w-[80%] rounded-2xl px-3.5 py-2 text-left text-[13px] leading-relaxed transition',
                  isAgent ? 'rounded-tl-md bg-surface-2 text-ink-2' : 'rounded-tr-md bg-brand/10 text-ink',
                  active && 'ring-2 ring-brand/40',
                )}
              >
                {l.text}
                <span className="mt-1 block text-2xs tabular text-ink-faint">{fmtClock(l.t)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** QA parameter list with scores (Business Pulse, but shown wherever a call has a score). */
export function ScoreBreakdown({ parameters = [] }) {
  return (
    <ul className="flex flex-col divide-y divide-line/70">
      {parameters.map((p) => {
        const pct = (p.score / p.max) * 100;
        return (
          <li key={p.name} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-ink">
                <span className="truncate">{p.name}</span>
                {p.fatal && <Badge tone="danger" size="xs">Fatal</Badge>}
              </span>
              <span className="shrink-0 text-[13px] font-semibold tabular">
                {p.score}/{p.max}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className={cn('h-full rounded-full', { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[scoreTone(pct)])} style={{ width: `${pct}%` }} />
            </div>
            {p.note && (
              <p className="mt-2 flex gap-1.5 text-xs text-ink-muted">
                <Quotes size={12} weight="fill" className="mt-0.5 shrink-0" />
                {p.note}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The right-side drawer used by every call list. */
export function CallDetailDrawer({ call, open, onClose, extraTabs = [], initialTab = 'transcript' }) {
  const [tab, setTab] = useState(initialTab);
  const [time, setTime] = useState(0);
  const [seek, setSeek] = useState(null);
  useEffect(() => {
    setTab(initialTab);
    setTime(0);
    setSeek(null);
  }, [call?.id, initialTab]);
  if (!call) return null;
  const DirIcon = call.direction === 'inbound' ? ArrowDownLeft : ArrowUpRight;
  const tabs = [
    { id: 'transcript', label: 'Transcript' },
    call.summary || call.fields?.length ? { id: 'summary', label: 'Summary' } : null,
    call.parameters?.length ? { id: 'score', label: 'QA score' } : null,
    { id: 'details', label: 'Details' },
    ...extraTabs.map((t) => ({ id: t.id, label: t.label })),
  ].filter(Boolean);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={640}
      title={
        <div className="flex items-center gap-3">
          <Avatar name={call.contact?.name} size="md" />
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">{call.contact?.name || fmtPhone(call.contact?.phone)}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <DirIcon size={12} weight="bold" />
                {call.direction === 'inbound' ? 'Inbound' : 'Outbound'}
              </span>
              <span>·</span>
              <span>{fmtPhone(call.contact?.phone)}</span>
              <span>·</span>
              <span>{fmtDateTime(call.startedAt)}</span>
            </div>
          </div>
        </div>
      }
      actions={
        <div className="hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="sm" iconOnly icon={ShareNetwork} aria-label="Share" />
          <Button variant="ghost" size="sm" iconOnly icon={DownloadSimple} aria-label="Download recording" />
        </div>
      }
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={call.status} />
          {call.disposition && <Badge tone="brand">{call.disposition}</Badge>}
          {call.sentiment && <Badge tone={call.sentiment === 'Positive' ? 'success' : call.sentiment === 'Negative' ? 'danger' : 'neutral'}>{call.sentiment}</Badge>}
          {call.tags?.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
          {call.score != null && (
            <span className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
              QA score <ProgressRing value={call.score} size={40} stroke={4} tone={scoreTone(call.score)} />
            </span>
          )}
        </div>

        {call.duration > 0 && <AudioPlayer duration={call.duration} onTime={setTime} seekTo={seek} />}

        {call.summary && (
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand">
              <Sparkle size={14} weight="fill" /> AI summary
            </div>
            <p className="text-[13px] leading-relaxed text-ink-2">{call.summary}</p>
          </div>
        )}

        <Tabs tabs={tabs} value={tab} onChange={setTab} />

        {tab === 'transcript' &&
          (call.transcript?.length ? (
            <Transcript lines={call.transcript} current={time} onSeek={(t) => setSeek(t + Math.random() * 0.001)} agentKind={call.agent?.kind} />
          ) : (
            <p className="py-8 text-center text-sm text-ink-muted">No transcript for this call.</p>
          ))}
        {tab === 'summary' && (
          <div className="flex flex-col gap-4">
            {call.fields?.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Collected fields</h4>
                <DescriptionList items={call.fields} />
              </div>
            )}
          </div>
        )}
        {tab === 'score' && <ScoreBreakdown parameters={call.parameters} />}
        {tab === 'details' && (
          <DescriptionList
            items={[
              { label: 'Call ID', value: <span className="font-mono text-xs">{call.id}</span> },
              { label: 'Handled by', value: `${call.agent?.name || '—'}${call.agent?.kind === 'ai' ? ' (AI)' : ''}` },
              { label: 'Campaign', value: call.campaign },
              { label: 'Duration', value: fmtDuration(call.duration) },
              { label: 'Started', value: fmtDateTime(call.startedAt) },
              { label: 'Disposition', value: call.disposition },
              ...(call.meta || []),
            ]}
          />
        )}
        {extraTabs.map((t) => tab === t.id && <div key={t.id}>{t.render(call)}</div>)}
      </div>
    </Drawer>
  );
}

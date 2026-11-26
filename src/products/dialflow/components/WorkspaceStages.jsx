import { useMemo, useState } from 'react';
import {
  CaretDown,
  CaretRight,
  ClockCounterClockwise,
  Coffee,
  DotsNine,
  Headset,
  ListChecks,
  NotePencil,
  Phone,
  PhoneDisconnect,
  PhoneIncoming,
  PhoneSlash,
  Play,
  Scroll,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDuration, fmtNumber, fmtPercent, fmtPhone, fmtRelative } from '@/lib/format';
import { Avatar, Badge, Button, EmptyState, Field, IconTile, Input, Kbd, Progress, Select, Textarea, Timeline, Waveform } from '@/design-system';

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

/** One titled block in the call summary. `collapsible` folds the body away. */
export function Section({ title, icon: Icon, meta, collapsible, defaultOpen = true, className, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const head = (
    <>
      {Icon && <Icon size={18} weight="duotone" className="shrink-0 text-ink-muted" />}
      <h3 className="text-[15px] font-bold text-ink">{title}</h3>
      {meta && <span className="ml-auto text-xs text-ink-muted">{meta}</span>}
      {collapsible && <CaretDown size={14} weight="bold" className={cn('shrink-0 text-ink-muted transition', !meta && 'ml-auto', !open && '-rotate-90')} />}
    </>
  );
  return (
    <section className={cn('rounded-2xl border border-line bg-surface shadow-card', className)}>
      {collapsible ? (
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2.5 rounded-2xl px-6 py-4 text-left hover:bg-surface-2/60">
          {head}
        </button>
      ) : (
        <div className="flex items-center gap-2.5 px-6 pt-5">{head}</div>
      )}
      {open && <div className={cn('px-6 pb-6', collapsible ? 'pt-1' : 'pt-4')}>{children}</div>}
    </section>
  );
}

const leadAttempts = (lead) => (lead.history.length ? `${lead.history.length} earlier call${lead.history.length > 1 ? 's' : ''}` : 'First call');

/* ------------------------------------------------------------------ */
/* Between calls: one card that says what happens next                */
/* ------------------------------------------------------------------ */

const DIAL_COPY = {
  Power: 'The power dialler is ringing leads for you. The next one who picks up connects here.',
  Progressive: 'The next lead dials as soon as you are free. It rings here first.',
  Manual: 'Dial the lead below when you are ready.',
};

export function ReadyStage({ phase, campaign, lead, secs, breakReason, breakMax, stats, callbacksDue, missedLimit, queue = [], onGoReady, onNotReady, onDialLead, onKeypad, keypadOpen }) {
  const inbound = campaign.type === 'Inbound';
  const manual = campaign.dialMethod === 'Manual' && !inbound;
  let card;
  if (phase === 'break') {
    const over = breakMax && secs > breakMax * 60;
    card = (
      <StageCard
        icon={<IconTile icon={Coffee} tone="neutral" size="lg" />}
        title={`On ${breakReason ? breakReason.toLowerCase() : 'a break'}`}
        text="No calls will come to you until you end the break. Your supervisor can see this."
        aside={
          <div className="text-right">
            <div className={cn('font-mono text-[32px] font-bold leading-none tabular', over ? 'text-danger' : 'text-ink')}>{fmtClock(secs)}</div>
            {breakMax && <div className="mt-1 text-xs text-ink-muted">of {breakMax} min allowed</div>}
          </div>
        }
        actions={
          <Button variant="brand" size="lg" icon={Play} onClick={onGoReady}>
            End break
          </Button>
        }
      />
    );
  } else if (phase === 'missed') {
    card = (
      <StageCard
        tone="danger"
        icon={<IconTile icon={PhoneSlash} tone="danger" size="lg" />}
        title="You were paused"
        text={`${missedLimit} calls in a row rang out without an answer. Check your headset and volume, then resume.`}
        actions={
          <Button variant="brand" size="lg" icon={Play} onClick={onGoReady}>
            Resume calls
          </Button>
        }
      />
    );
  } else if (phase === 'idle') {
    card = (
      <StageCard
        icon={<IconTile icon={Headset} tone="brand" size="lg" />}
        title="You are not ready yet"
        text={inbound ? 'Go Ready and customer calls from the queue start ringing here.' : `Go Ready and ${campaign.dialMethod.toLowerCase()} dialling starts connecting leads from ${campaign.name} to you.`}
        actions={
          <>
            <Button variant="brand" size="lg" icon={Headset} onClick={onGoReady}>
              Go Ready
            </Button>
            {!keypadOpen && (
              <Button variant="secondary" size="lg" icon={DotsNine} onClick={onKeypad}>
                Dial a number
              </Button>
            )}
          </>
        }
      />
    );
  } else if (manual) {
    card = (
      <StageCard
        tone="success"
        icon={<IconTile icon={Phone} tone="success" size="lg" />}
        title="Next lead"
        text={DIAL_COPY.Manual}
        actions={
          <>
            <Button size="lg" icon={Phone} onClick={onDialLead} className="bg-success text-surface hover:bg-success/90">
              Dial {lead.name.split(' ')[0]}
            </Button>
            <Button variant="ghost" size="lg" onClick={onNotReady}>
              Go Not ready
            </Button>
          </>
        }
      >
        <NextLead lead={lead} />
      </StageCard>
    );
  } else {
    card = (
      <StageCard
        tone="success"
        icon={
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-2xl bg-success/20" />
            <IconTile icon={inbound ? PhoneIncoming : Headset} tone="success" size="lg" className="relative" />
          </span>
        }
        title={inbound ? 'Waiting for a customer to call' : 'Waiting for the next call'}
        text={inbound ? '3 callers are in the queue. The next one rings here.' : DIAL_COPY[campaign.dialMethod]}
        aside={
          <div className="text-right">
            <div className="font-mono text-[32px] font-bold leading-none tabular text-ink">{fmtClock(secs)}</div>
            <div className="mt-1 text-xs text-ink-muted">waiting</div>
          </div>
        }
        actions={
          <Button variant="secondary" size="lg" onClick={onNotReady}>
            Go Not ready
          </Button>
        }
      >
        {campaign.dialMethod === 'Progressive' && !inbound && <NextLead lead={lead} label="Dialling next" />}
      </StageCard>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {card}
      <TodayStrip stats={stats} callbacksDue={callbacksDue} />
      {!inbound && queue.length > 0 && <QueueList leads={queue} />}
    </div>
  );
}

/** The next few leads in the campaign, so the agent knows what is coming. */
function QueueList({ leads }) {
  return (
    <Section title="Coming up in this campaign" icon={ListChecks} meta="Dialled in this order">
      <ul className="-mx-2 divide-y divide-line/70">
        {leads.map((l) => {
          const last = l.history[0];
          return (
            <li key={l.id} className="flex items-center gap-3 px-2 py-2.5">
              <Avatar name={l.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{l.name}</div>
                <div className="truncate text-xs text-ink-muted">
                  <span className="font-mono tabular">{fmtPhone(l.phone)}</span> · {l.city} · {l.source}
                </div>
              </div>
              <span className="hidden shrink-0 text-right text-xs text-ink-muted sm:block">{last ? `Last: ${last.disposition} · ${fmtRelative(last.at)}` : 'First call'}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function StageCard({ tone, icon, title, text, aside, actions, children }) {
  return (
    <div className={cn('rounded-2xl border bg-surface p-7 shadow-card', tone === 'success' ? 'border-success/30' : tone === 'danger' ? 'border-danger/30' : 'border-line')}>
      <div className="flex items-start gap-5">
        {icon}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-tight text-ink">{title}</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-2">{text}</p>
        </div>
        {aside && <div className="hidden shrink-0 sm:block">{aside}</div>}
      </div>
      {children && <div className="mt-6">{children}</div>}
      {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

function NextLead({ lead, label = 'Up next' }) {
  const last = lead.history[0];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-surface-2/60 px-5 py-4">
      <Avatar name={lead.name} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
        <div className="truncate text-base font-bold text-ink">{lead.name}</div>
        <div className="truncate text-sm text-ink-muted">
          <span className="font-mono tabular text-ink-2">{fmtPhone(lead.phone)}</span> · {lead.city} · {leadAttempts(lead)}
        </div>
      </div>
      {last && <div className="hidden max-w-[220px] text-right text-xs text-ink-muted md:block">Last: {last.disposition} · {fmtRelative(last.at)}</div>}
    </div>
  );
}

function TodayStrip({ stats, callbacksDue }) {
  const items = [
    { label: 'Calls today', value: `${stats.calls}`, sub: `of ${stats.target}`, bar: true },
    { label: 'Talk time', value: fmtDuration(stats.talk) },
    { label: 'Connected', value: fmtPercent((stats.connected / Math.max(stats.calls, 1)) * 100, 0), sub: `${fmtNumber(stats.connected)} calls` },
    { label: 'Callbacks due', value: callbacksDue, sub: 'today', warn: callbacksDue > 0 },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="bg-surface px-5 py-4">
          <div className="text-xs text-ink-muted">{it.label}</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={cn('text-xl font-bold tabular', it.warn ? 'text-danger' : 'text-ink')}>{it.value}</span>
            {it.sub && <span className="text-xs text-ink-muted">{it.sub}</span>}
          </div>
          {it.bar && <Progress value={stats.calls} max={stats.target} size="sm" className="mt-2" />}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* During a call                                                       */
/* ------------------------------------------------------------------ */

/** Who is on the line. The phone holds the controls and the big timer, so this card is about the lead. */
export function LiveCallCard({ lead, seconds, held, holdSeconds, ringing }) {
  const last = lead.history[0];
  const facts = [
    ['City', lead.city],
    ['Source', lead.source],
    ['Lead ID', lead.id.toUpperCase()],
    ['Last call', last ? `${last.disposition} · ${fmtRelative(last.at)}` : 'First call'],
  ];
  return (
    <div className={cn('rounded-2xl border bg-surface shadow-card', held ? 'border-warning/40' : 'border-line')}>
      <div className="flex items-center gap-4 px-6 pb-4 pt-5">
        <Avatar name={lead.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-bold leading-tight text-ink">{lead.name}</h2>
            {lead.tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} tone={tag === 'Hot' ? 'danger' : 'neutral'} size="xs">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="mt-0.5 font-mono text-sm tabular text-ink-2">{fmtPhone(lead.phone)}</div>
        </div>
        {ringing ? (
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-brand" />
            Ringing · get ready
          </span>
        ) : (
          <span className={cn('inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', held ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success')}>
            {held ? 'On hold' : 'Talking'}
            {!held && <Waveform className="text-success" />}
            <span className="font-mono tabular">{fmtClock(held ? holdSeconds : seconds)}</span>
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line/70 px-6 py-3.5 sm:grid-cols-4">
        {facts.map(([l, v]) => (
          <div key={l} className="min-w-0">
            <dt className="text-2xs text-ink-muted">{l}</dt>
            <dd className="truncate text-[13px] font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {last?.note && (
        <p className="truncate border-t border-line/70 px-6 py-2.5 text-[13px] text-ink-muted" title={last.note}>
          {last.agent.split(' ')[0]} noted: <span className="text-ink-2">“{last.note}”</span>
        </p>
      )}
    </div>
  );
}

export function ScriptSection({ script, lead, agent }) {
  const [step, setStep] = useState(0);
  const vars = useMemo(() => ({ ...script.vars, lead_name: lead.name.split(' ')[0], agent_name: agent?.split(' ')[0] || 'Agent', source: lead.source }), [script.vars, lead, agent]);
  const render = (text) =>
    text.split(/(\{[a-z_]+\})/g).map((part, i) => {
      const m = part.match(/^\{([a-z_]+)\}$/);
      if (!m) return <span key={i}>{part}</span>;
      return (
        <mark key={i} title={`{${m[1]}}`} className="rounded bg-brand/10 px-1 font-semibold text-brand">
          {vars[m[1]] ?? part}
        </mark>
      );
    });
  const block = script.blocks[step];
  return (
    <Section title="Script" icon={Scroll} meta={script.title} collapsible>
      <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
        {script.blocks.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setStep(i)}
            className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium transition', i === step ? 'bg-ink text-canvas' : i < step ? 'text-ink-2 hover:bg-surface-3' : 'text-ink-muted hover:bg-surface-3')}
          >
            {i + 1}. {b.label}
          </button>
        ))}
        {step < script.blocks.length - 1 && (
          <Button size="sm" variant="ghost" iconRight={CaretRight} onClick={() => setStep(step + 1)} className="ml-auto">
            Next
          </Button>
        )}
      </div>
      <p className="max-w-3xl text-base leading-relaxed text-ink xl:text-[17px]">{render(block.text)}</p>
    </Section>
  );
}

export function LeadDetailsSection({ lead, agent, callSeconds, compact }) {
  const rows = [
    ['Phone', <span className="font-mono tabular">{fmtPhone(lead.phone)}</span>],
    ['City', lead.city],
    ['Source', lead.source],
    ['Lead ID', lead.id.toUpperCase()],
    ['Tags', lead.tags?.join(', ') || '—'],
    ['Earlier calls', lead.history.length || 'None'],
  ];
  if (compact) {
    rows.splice(3, 3, ['Agent', agent || 'You'], ['Talk time', <span className="font-mono tabular">{fmtClock(callSeconds || 0)}</span>]);
  }
  return (
    <Section title={compact ? 'Call details' : 'Lead details'} icon={UserCircle}>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 xl:grid-cols-6">
        {rows.map(([l, v]) => (
          <div key={l} className="min-w-0">
            <dt className="text-xs text-ink-muted">{l}</dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function CollectFieldsSection({ fields, values, onField }) {
  const filled = fields.filter((f) => values[f.key]).length;
  return (
    <Section title="Fields to collect" icon={ListChecks} meta={`${filled} of ${fields.length} filled`}>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            {f.type === 'select' ? (
              <Select value={values[f.key] || ''} onChange={(e) => onField(f.key, e.target.value)} options={f.options} placeholder="Select" />
            ) : (
              <Input value={values[f.key] || ''} onChange={(e) => onField(f.key, e.target.value)} placeholder={f.placeholder} />
            )}
          </Field>
        ))}
      </div>
    </Section>
  );
}

export function NotesSection({ value, onChange, live, notesRef }) {
  return (
    <Section title="Notes" icon={NotePencil} meta={value.length ? 'Saved with the call' : 'The next agent will see these'}>
      <Textarea ref={notesRef} rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={live ? 'Type while you talk: budget, objections, next step…' : 'Anything the next agent should know'} aria-label="Call notes" />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* After the call                                                      */
/* ------------------------------------------------------------------ */

/** After the call: the disposition comes first, with the save button right under it. */
export function DispositionCard({ lead, callSeconds, wrapLeft, canSave, onSave, disposition, cardRef, children }) {
  const low = wrapLeft <= 5;
  return (
    <section ref={cardRef} tabIndex={-1} className="scroll-mt-4 rounded-2xl border border-warning/35 bg-surface shadow-card outline-none focus-visible:ring-2 focus-visible:ring-warning/40">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-1 px-6 pb-1 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight text-ink">How did the call end?</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            <span className="font-medium text-ink-2">{lead.name}</span> · talked <span className="font-mono tabular text-ink-2">{fmtClock(callSeconds)}</span> · the next call waits until you save
          </p>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', low ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning')}>
          <WarningCircle size={14} weight="fill" />
          <span className="font-mono tabular">{wrapLeft > 0 ? fmtClock(wrapLeft) : '0:00'}</span> {wrapLeft > 0 ? 'left' : 'over'}
        </span>
      </div>
      <div className="px-6 pb-5 pt-4">{children}</div>
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-line bg-surface/95 px-6 py-3.5 shadow-[0_-8px_20px_-14px_rgb(var(--ink)/.25)] backdrop-blur">
        <p className="min-w-0 flex-1 truncate text-sm text-ink-muted">
          {disposition ? (
            <>
              Saving as <span className="font-semibold text-ink">{disposition}</span>
            </>
          ) : (
            'Pick a disposition to save this call.'
          )}
        </p>
        <Button variant="brand" size="lg" disabled={!canSave} disabledReason="Pick a disposition first (and its reason or callback time if it asks)" onClick={onSave}>
          Save &amp; log call
          <span className="ml-1 inline-flex items-center gap-0.5">
            <Kbd className="border-brand-ink/30 bg-brand-ink/15 text-brand-ink">Ctrl</Kbd>
            <Kbd className="border-brand-ink/30 bg-brand-ink/15 text-brand-ink">↵</Kbd>
          </span>
        </Button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Other tabs                                                          */
/* ------------------------------------------------------------------ */

export function HistoryPanel({ lead }) {
  if (!lead.history.length)
    return <EmptyState icon={ClockCounterClockwise} title="No earlier calls" description={`This is the first call to ${lead.name.split(' ')[0]}. Past calls and notes for a lead show here.`} />;
  return (
    <Section title={`Earlier calls with ${lead.name}`} icon={ClockCounterClockwise} meta={`${lead.history.length} call${lead.history.length > 1 ? 's' : ''}`}>
      <Timeline
        items={lead.history.map((h) => ({
          title: h.disposition,
          time: fmtRelative(h.at),
          tone: h.disposition === 'No answer' || h.disposition === 'Busy' ? 'warning' : 'brand',
          description: `${h.agent}${h.duration ? ` · ${fmtDuration(h.duration)}` : ''}${h.note ? ` · “${h.note}”` : ''}`,
        }))}
      />
    </Section>
  );
}

export function IncomingPanel({ phase, lead, campaign, secs, ringTimeout, onAnswer, onDecline }) {
  if (phase !== 'ringing')
    return <EmptyState icon={PhoneIncoming} title="No incoming call" description="When a call rings, it shows up here and this tab opens by itself." className="py-20" />;
  const last = lead.history[0];
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-success/15" />
        <span className="absolute inset-3 animate-ping rounded-full bg-success/20 [animation-delay:.4s]" />
        <span className="relative rounded-full ring-4 ring-success/40">
          <Avatar name={lead.name} size="xl" />
        </span>
      </span>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-success">
        {campaign.type === 'Inbound' ? 'Incoming call' : campaign.dialMethod === 'Power' ? 'Auto-dialled call' : 'Dialling your next lead'} · {Math.max(0, ringTimeout - secs)}s
      </p>
      <h2 className="mt-2 text-3xl font-bold text-ink">{lead.name}</h2>
      <p className="mt-1 font-mono text-lg tabular text-ink-2">{fmtPhone(lead.phone)}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {lead.city} · {lead.source} · {leadAttempts(lead)}
      </p>
      {last && (
        <p className="mt-3 max-w-md text-sm text-ink-2">
          <span className="text-ink-muted">Last call {fmtRelative(last.at)}:</span> {last.disposition}
          {last.note && <span className="text-ink-muted"> · “{last.note}”</span>}
        </p>
      )}
      <div className="mt-8 flex items-center gap-3">
        <Button variant="danger-soft" size="lg" icon={PhoneDisconnect} onClick={onDecline}>
          Decline
        </Button>
        <Button size="lg" icon={PhoneIncoming} onClick={onAnswer} className="bg-success text-white hover:bg-success/90">
          Answer
        </Button>
      </div>
    </div>
  );
}

import { useMemo, useRef } from 'react';
import {
  ArrowsClockwise,
  CheckCircle,
  FilePdf,
  FileCsv,
  Headset,
  Microphone,
  PencilSimple,
  Prohibit,
  Robot,
  Copy as CopyIcon,
  TextAlignLeft,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtCurrency, fmtNumber } from '@/lib/format';
import { Badge, Button, Callout, Card, Field, FileDrop, IconButton, Input, RadioCards, Segmented, Select, Switch, Textarea } from '@/design-system';
import { ref } from '@/services/agentflow';
import { VoiceCard, usePreview } from './VoiceCard';
import { FieldBuilder, FIELD_ICON } from './FieldBuilder';
import { ChipToggleGroup, Slider, TimeRange } from './FormBits';

/*
 * The seven steps of the campaign wizard. Each step gets { draft, set, csv } and edits one slice of the draft.
 * draft = { name, contacts, answeredBy, script, voice, fields, rules } (see mocks NEW_CAMPAIGN).
 */

export const STEPS = [
  { id: 'contacts', label: 'Contacts', description: 'Who to call' },
  { id: 'answer', label: 'Who answers', description: 'AI or a person' },
  { id: 'script', label: 'Script & knowledge', description: 'What to say' },
  { id: 'voice', label: 'Voice', description: 'How it sounds' },
  { id: 'fields', label: 'Fields to collect', description: 'What to capture' },
  { id: 'rules', label: 'Calling rules', description: 'When and how often' },
  { id: 'review', label: 'Review & launch', description: 'Check and go' },
];

export function stepValid(id, d) {
  if (id === 'contacts') return !!d.name.trim() && !!d.contacts;
  if (id === 'script') return d.script.prompt.trim().length > 20 && !!d.script.opening.trim();
  if (id === 'fields') return d.fields.every((f) => f.label.trim());
  if (id === 'rules') return d.rules.days.length > 0 && d.rules.from < d.rules.to;
  return true;
}

function StepHead({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
    </div>
  );
}

/* ---------------- 1. Contacts ---------------- */

const MAP_TARGETS = [
  { value: 'name', label: 'Name' },
  { value: 'phone', label: 'Phone number' },
  { value: 'city', label: 'City' },
  { value: 'var', label: 'Script variable' },
  { value: 'skip', label: 'Don’t import' },
];
const guessTarget = (h) => (/name/i.test(h) ? 'name' : /mobile|phone|number/i.test(h) ? 'phone' : /city/i.test(h) ? 'city' : 'var');

export function ContactsStep({ draft, set, csv }) {
  const c = draft.contacts;
  const load = (fileName) =>
    set({ contacts: { fileName, total: csv.total, invalid: csv.invalid, duplicates: csv.duplicates, dnc: csv.dnc, headers: csv.headers, rows: csv.rows, mapping: Object.fromEntries(csv.headers.map((h) => [h, guessTarget(h)])) } });
  const valid = c ? c.total - c.invalid - c.duplicates - c.dnc : 0;
  const phoneMapped = c && Object.values(c.mapping).includes('phone');

  return (
    <>
      <StepHead title="Who should the AI call?" description="Name the campaign and upload a CSV. We remove Do Not Call numbers and duplicates for you." />
      <div className="flex flex-col gap-6">
        <Field label="Campaign name" required hint="Only your team sees this.">
          <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Wakad 2BHK leads · Dec" autoFocus />
        </Field>

        {!c ? (
          <div className="flex flex-col gap-3">
            <FileDrop accept=".csv,.xlsx" title="Drop your CSV here or browse" hint="One contact per row. Needs a phone number column. Up to 50,000 rows." onFiles={(f) => f[0] && load(f[0].name)} />
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-ink-muted">
              No file handy?
              <Button size="xs" variant="soft" onClick={() => load(csv.fileName)}>
                Use sample file
              </Button>
              <span className="text-ink-faint">·</span>
              <Button size="xs" variant="link">
                Download template
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <FileCsv size={22} weight="duotone" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{c.fileName}</div>
                <div className="text-xs text-ink-muted">
                  {fmtNumber(c.total)} rows · {c.headers.length} columns
                </div>
              </div>
              <Button size="sm" variant="ghost" icon={ArrowsClockwise} onClick={() => set({ contacts: null })}>
                Replace
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <CountTile tone="success" icon={CheckCircle} label="Will be called" value={valid} />
              <CountTile tone="warning" icon={Prohibit} label="On Do Not Call" value={c.dnc} />
              <CountTile tone="neutral" icon={CopyIcon} label="Duplicates" value={c.duplicates} />
              <CountTile tone="danger" icon={WarningCircle} label="Invalid numbers" value={c.invalid} />
            </div>

            <div>
              <div className="mb-2 flex items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold">Match your columns</h3>
                  <p className="text-xs text-ink-muted">Columns set to “Script variable” can be used in the script as {'{{column}}'}.</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line bg-surface-2">
                      {c.headers.map((h) => (
                        <th key={h} className="px-3 py-2.5 align-top">
                          <div className="mb-1.5 text-xs font-semibold text-ink">{h}</div>
                          <Select size="sm" value={c.mapping[h]} options={MAP_TARGETS} onChange={(e) => set({ contacts: { ...c, mapping: { ...c.mapping, [h]: e.target.value } } })} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {c.rows.map((r, i) => (
                      <tr key={i} className="border-b border-line/70 last:border-0">
                        {r.map((v, j) => (
                          <td key={j} className={cn('px-3 py-2 tabular', c.mapping[c.headers[j]] === 'skip' ? 'text-ink-faint line-through' : 'text-ink-2')}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-ink-faint">Showing the first {c.rows.length} rows.</p>
            </div>
            {!phoneMapped && (
              <Callout tone="danger" title="No phone column">
                Set one column to “Phone number” so the AI knows whom to dial.
              </Callout>
            )}
          </>
        )}
      </div>
    </>
  );
}

function CountTile({ tone, icon: Icon, label, value }) {
  const tones = { success: 'text-success', warning: 'text-warning', danger: 'text-danger', neutral: 'text-ink-muted' };
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <div className={cn('flex items-center gap-1.5 text-xs font-medium', tones[tone])}>
        <Icon size={14} weight="bold" />
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold tabular">{fmtNumber(value)}</div>
    </div>
  );
}

/* ---------------- 2. Who answers ---------------- */

export function AnswerStep({ draft, set }) {
  return (
    <>
      <StepHead title="Who talks to the customer?" description="The AI can handle the whole call, or it can dial and hand over to a person on a computer mic." />
      <RadioCards
        value={draft.answeredBy}
        onChange={(v) => set({ answeredBy: v })}
        options={[
          { value: 'ai', label: 'AI agent', description: 'Talks, answers questions, books the next step and fills your fields. Runs many calls at once.', icon: Robot },
          { value: 'human', label: 'Human agent on PC mic', description: 'The system dials; a team member talks through the browser. One call per person.', icon: Headset },
        ]}
      />
      {draft.answeredBy === 'human' ? (
        <Callout tone="warning" className="mt-5" title="Calls run one at a time per person" icon={Microphone}>
          Agents need Chrome with microphone access. The AI still writes the summary and fills the fields after each call.
        </Callout>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ['Speaks 10 Indian languages', 'Switches to the customer’s language mid-call.'],
            ['Never misses a field', 'Asks follow-ups until required answers are captured.'],
            ['Hands over when asked', 'Transfers to your team if the customer wants a person.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-surface-2 p-4">
              <CheckCircle size={18} weight="fill" className="text-brand" />
              <div className="mt-2 text-sm font-semibold">{t}</div>
              <div className="mt-0.5 text-xs text-ink-muted">{d}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- 3. Script & knowledge ---------------- */

function VariableTextarea({ value, onChange, rows = 6, variables, placeholder, single }) {
  const el = useRef(null);
  const insert = (v) => {
    const t = el.current;
    const token = `{{${v}}}`;
    const start = t?.selectionStart ?? value.length;
    const end = t?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      t?.focus();
      t?.setSelectionRange(start + token.length, start + token.length);
    });
  };
  const Comp = single ? Input : Textarea;
  return (
    <div className="flex flex-col gap-2">
      <Comp ref={el} value={value} onChange={(e) => onChange(e.target.value)} rows={single ? undefined : rows} placeholder={placeholder} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-ink-muted">Insert:</span>
        {variables.map((v) => (
          <button key={v} type="button" onClick={() => insert(v)} className="rounded-lg border border-brand/20 bg-brand/5 px-2 py-0.5 font-mono text-2xs font-medium text-brand transition hover:bg-brand/10">
            {`{{${v}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

const fill = (text, sample) => text.replace(/\{\{(\w+)\}\}/g, (_, k) => sample[k] ?? `[${k}]`);

export function ScriptStep({ draft, set }) {
  const s = draft.script;
  const up = (patch) => set({ script: { ...s, ...patch } });
  const vars = useMemo(() => {
    const extra = draft.contacts ? Object.entries(draft.contacts.mapping).filter(([, t]) => t === 'var').map(([h]) => h.toLowerCase().replace(/\s+/g, '_')) : [];
    return [...new Set([...ref.variables, ...extra])];
  }, [draft.contacts]);
  const first = draft.contacts?.rows?.[0];
  const sample = { name: first?.[0]?.split(' ')[0] || 'Aarav', phone: first?.[1] || '98765 43210', city: first?.[2] || 'Pune', project: first?.[3] || 'Parko Heights', budget: first?.[4] || '85 L', agent_name: ref.voices.find((v) => v.id === draft.voice.voiceId)?.name || 'Diya', company: 'RR Parko' };

  return (
    <>
      <StepHead title="What should the AI say?" description="Describe the goal like you would brief a new caller. Use variables to personalise every call." />
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          <Field label="Instructions for the AI" required hint={`${s.prompt.length} characters · say what to find out, what to avoid, and when to end the call.`}>
            <VariableTextarea value={s.prompt} onChange={(v) => up({ prompt: v })} rows={7} variables={vars} />
          </Field>
          <Field label="Opening line" required hint="The first thing the customer hears.">
            <VariableTextarea value={s.opening} onChange={(v) => up({ opening: v })} rows={3} variables={vars} />
          </Field>
          <Field label="Closing line">
            <VariableTextarea single value={s.closing} onChange={(v) => up({ closing: v })} variables={vars} />
          </Field>

          <div className="rounded-2xl border border-line p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold">Knowledge</h3>
                <p className="text-xs text-ink-muted">Facts the AI can use to answer questions: prices, FAQs, policies.</p>
              </div>
              <Segmented
                size="sm"
                value={s.knowledgeKind}
                onChange={(v) => up({ knowledgeKind: v })}
                options={[
                  { value: 'pdf', label: 'Upload PDF', icon: FilePdf },
                  { value: 'text', label: 'Paste text', icon: TextAlignLeft },
                ]}
              />
            </div>
            {s.knowledgeKind === 'pdf' ? (
              <div className="flex flex-col gap-2">
                {s.knowledgeFiles.map((f) => (
                  <div key={f} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
                    <FilePdf size={20} weight="duotone" className="text-danger" />
                    <span className="min-w-0 flex-1 truncate text-sm">{f}</span>
                    <Badge tone="success" size="xs">
                      Ready
                    </Badge>
                    <IconButton icon={Trash} label="Remove" size="xs" onClick={() => up({ knowledgeFiles: s.knowledgeFiles.filter((x) => x !== f) })} />
                  </div>
                ))}
                <FileDrop compact accept=".pdf" multiple title="Drop PDFs or browse" hint="Brochures, price sheets, FAQs. Up to 20 MB each." onFiles={(files) => up({ knowledgeFiles: [...s.knowledgeFiles, ...files.map((f) => f.name)] })} />
              </div>
            ) : (
              <Textarea rows={5} value={s.knowledgeText} onChange={(e) => up({ knowledgeText: e.target.value })} placeholder="e.g. Parko Heights, Wakad. 2BHK from ₹82 L, 3BHK from ₹1.15 Cr. Possession Dec 2027. One covered parking included." />
            )}
          </div>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-3xl border border-line bg-surface-2 p-4">
            <div className="mb-3 text-2xs font-semibold uppercase tracking-wider text-ink-faint">Preview with first contact</div>
            <div className="flex flex-col gap-2.5">
              <Bubble who={`${sample.agent_name} (AI)`} text={fill(s.opening, sample)} />
              <Bubble customer who={sample.name} text="Haan ji, boliye." />
              <Bubble who={`${sample.agent_name} (AI)`} text="…" muted />
              <Bubble who={`${sample.agent_name} (AI)`} text={fill(s.closing, sample)} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Bubble({ who, text, customer, muted }) {
  return (
    <div className={cn('flex flex-col', customer && 'items-end')}>
      <span className="mb-0.5 text-2xs text-ink-faint">{who}</span>
      <span className={cn('max-w-[92%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed', customer ? 'rounded-tr-md bg-surface text-ink-2 shadow-card' : 'rounded-tl-md bg-brand text-brand-ink', muted && 'opacity-50')}>{text || '—'}</span>
    </div>
  );
}

/* ---------------- 4. Voice ---------------- */

export function VoiceStep({ draft, set }) {
  const v = draft.voice;
  const up = (patch) => set({ voice: { ...v, ...patch } });
  const [playing, play] = usePreview();
  const voices = ref.voices.filter((x) => x.languages.includes(v.language) || (v.language === 'Hinglish' && x.languages.includes('Hindi')));
  const selected = ref.voices.find((x) => x.id === v.voiceId);
  return (
    <>
      <StepHead title="Pick a voice" description="Play a sample, then tune how the AI speaks." />
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Language">
            <Select value={v.language} options={ref.languages} onChange={(e) => up({ language: e.target.value })} />
          </Field>
          <Field label="Voice engine" hint={ref.engines.find((e) => e.value === v.engine)?.description}>
            <Select value={v.engine} options={ref.engines.filter((e) => !selected || selected.engines.includes(e.value))} onChange={(e) => up({ engine: e.target.value })} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-bold">Voices for {v.language}</h3>
            <span className="text-xs text-ink-muted">{voices.length} available</span>
          </div>
          {voices.length ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {voices.map((x) => (
                <VoiceCard key={x.id} voice={x} compact selected={x.id === v.voiceId} onSelect={() => up({ voiceId: x.id, engine: x.engines.includes(v.engine) ? v.engine : x.engines[0] })} playing={playing === x.id} onPlay={() => play(x.id)} />
              ))}
            </div>
          ) : (
            <Callout tone="info">No voice speaks {v.language} yet. Pick another language or ask us to add one.</Callout>
          )}
        </div>

        <div className="grid gap-x-8 gap-y-5 rounded-2xl border border-line p-5 md:grid-cols-2">
          <Field label="Speaking speed">
            <Slider value={v.speed} onChange={(x) => up({ speed: x })} min={0.75} max={1.5} step={0.05} format={(x) => `${x.toFixed(2)}x`} marks={['Slow', 'Normal', 'Fast']} />
          </Field>
          <Field label="Background sound" hint="A little office noise makes calls feel natural.">
            <Select value={v.background} options={ref.backgrounds} onChange={(e) => up({ background: e.target.value })} />
          </Field>
          <Field label="Tone" className="md:col-span-2">
            <ChipToggleGroup single options={ref.tones} value={v.tone} onChange={(x) => up({ tone: x })} />
          </Field>
          <Switch className="md:col-span-2" checked={v.interruptions} onChange={(x) => up({ interruptions: x })} label="Let customers interrupt" description="The AI stops talking as soon as the customer speaks. Recommended." />
        </div>
      </div>
    </>
  );
}

/* ---------------- 5. Fields ---------------- */

const FIELD_SUGGESTIONS = [
  { label: 'Interested', type: 'yesno' },
  { label: 'Callback time', type: 'date' },
  { label: 'Email address', type: 'text' },
  { label: 'Number of family members', type: 'number' },
  { label: 'Language preference', type: 'options' },
];

export function FieldsStep({ draft, set }) {
  return (
    <>
      <StepHead title="What should the AI find out?" description="Each field becomes a question the AI works into the conversation. Answers appear in results and exports." />
      <FieldBuilder fields={draft.fields} onChange={(fields) => set({ fields })} suggestions={FIELD_SUGGESTIONS} />
      <Callout tone="brand" className="mt-5" title="Tip">
        Keep it under 6 fields. Mark only what you truly need as required; the AI keeps asking until it gets an answer.
      </Callout>
    </>
  );
}

/* ---------------- 6. Calling rules ---------------- */

export function RulesStep({ draft, set }) {
  const r = draft.rules;
  const up = (patch) => set({ rules: { ...r, ...patch } });
  return (
    <>
      <StepHead title="When and how often to call" description="Calls only go out inside this window. TRAI allows commercial calls between 9 AM and 9 PM." />
      <div className="flex flex-col gap-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Calling hours" error={r.from >= r.to ? 'End time must be after start time.' : null}>
            <TimeRange from={r.from} to={r.to} onChange={(x) => up(x)} />
          </Field>
          <Field label="Calls at the same time" hint="Higher finishes sooner but uses minutes faster.">
            <Slider value={r.concurrency} onChange={(x) => up({ concurrency: x })} min={1} max={50} format={(x) => `${x}`} />
          </Field>
        </div>
        <Field label="Days" error={!r.days.length ? 'Pick at least one day.' : null}>
          <ChipToggleGroup options={ref.days} value={r.days} onChange={(days) => up({ days })} />
        </Field>

        <div className="rounded-2xl border border-line p-5">
          <h3 className="text-sm font-bold">Retry unanswered calls</h3>
          <p className="mb-4 text-xs text-ink-muted">Choose when to try again if nobody picks up.</p>
          <RadioCards
            cols={3}
            value={r.retryMode}
            onChange={(retryMode) => up({ retryMode })}
            options={[
              { value: 'end', label: 'At the end of the list', description: 'Finish everyone once, then retry.' },
              { value: 'delay', label: 'After a delay', description: 'Retry the same number after some time.' },
              { value: 'slots', label: 'After N other calls', description: 'Retry after a set number of calls.' },
            ]}
          />
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {r.retryMode === 'delay' && (
              <Field label="Wait before retry">
                <Input type="number" min={5} value={r.retryDelay} onChange={(e) => up({ retryDelay: Number(e.target.value) })} suffix="min" />
              </Field>
            )}
            {r.retryMode === 'slots' && (
              <Field label="Retry after">
                <Input type="number" min={1} value={r.retrySlots} onChange={(e) => up({ retrySlots: Number(e.target.value) })} suffix="calls" />
              </Field>
            )}
            <Field label="Max attempts per contact">
              <Segmented value={String(r.maxAttempts)} onChange={(x) => up({ maxAttempts: Number(x) })} options={['1', '2', '3', '4', '5']} />
            </Field>
            <Field label="Retry when">
              <ChipToggleGroup size="sm" options={['No answer', 'Busy', 'Failed', 'Call back later']} value={r.retryOn} onChange={(retryOn) => up({ retryOn })} />
            </Field>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- 7. Review ---------------- */

export function estimate(draft) {
  const n = draft.contacts ? draft.contacts.total - draft.contacts.invalid - draft.contacts.duplicates - draft.contacts.dnc : 0;
  const connected = Math.round(n * 0.46);
  const minutes = Math.round(connected * 2.1 + (n - connected) * 0.3 * Math.min(draft.rules.maxAttempts, 3));
  const hoursPerDay = Math.max(1, parseInt(draft.rules.to, 10) - parseInt(draft.rules.from, 10));
  const days = Math.max(1, Math.ceil((n * 1.4 * 1.2) / 60 / draft.rules.concurrency / hoursPerDay));
  return { contacts: n, connected, minutes, cost: minutes * ref.costPerMin, days };
}

export function ReviewStep({ draft, goTo }) {
  const e = estimate(draft);
  const voice = ref.voices.find((x) => x.id === draft.voice.voiceId);
  const r = draft.rules;
  return (
    <>
      <StepHead title="Review and launch" description="Check each section. You can pause or edit the campaign any time after launch." />
      <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-4 md:grid-cols-4">
        <Est label="Contacts to call" value={fmtNumber(e.contacts)} />
        <Est label="Expected to connect" value={fmtNumber(e.connected)} sub="at ~46% connect rate" />
        <Est label="Estimated minutes" value={fmtNumber(e.minutes)} sub={`about ${e.days} day${e.days > 1 ? 's' : ''} to finish`} />
        <Est label="Estimated cost" value={fmtCurrency(e.cost)} sub={`₹${ref.costPerMin}/min`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReviewCard title="Contacts" onEdit={() => goTo(0)}>
          <b>{draft.name || 'Untitled campaign'}</b> · {draft.contacts?.fileName}
          <br />
          {fmtNumber(e.contacts)} will be called · {fmtNumber((draft.contacts?.dnc || 0) + (draft.contacts?.duplicates || 0) + (draft.contacts?.invalid || 0))} removed
        </ReviewCard>
        <ReviewCard title="Who answers" onEdit={() => goTo(1)}>
          {draft.answeredBy === 'ai' ? 'AI agent handles the full call' : 'Human agent on PC mic'}
        </ReviewCard>
        <ReviewCard title="Script & knowledge" onEdit={() => goTo(2)}>
          <span className="line-clamp-2">{draft.script.opening}</span>
          <span className="mt-1 block text-ink-muted">Knowledge: {draft.script.knowledgeKind === 'pdf' ? `${draft.script.knowledgeFiles.length} PDF${draft.script.knowledgeFiles.length === 1 ? '' : 's'}` : draft.script.knowledgeText ? 'pasted text' : 'none'}</span>
        </ReviewCard>
        <ReviewCard title="Voice" onEdit={() => goTo(3)}>
          {voice?.name} · {draft.voice.language} · {ref.engineLabel[draft.voice.engine]}
          <br />
          {draft.voice.tone} · {draft.voice.speed.toFixed(2)}x · interruptions {draft.voice.interruptions ? 'on' : 'off'}
        </ReviewCard>
        <ReviewCard title={`Fields to collect (${draft.fields.length})`} onEdit={() => goTo(4)}>
          <span className="flex flex-wrap gap-1.5">
            {draft.fields.map((f) => {
              const Icon = FIELD_ICON[f.type];
              return (
                <Badge key={f.id} icon={Icon}>
                  {f.label}
                  {f.required && ' *'}
                </Badge>
              );
            })}
          </span>
        </ReviewCard>
        <ReviewCard title="Calling rules" onEdit={() => goTo(5)}>
          {r.from}–{r.to} · {r.days.length === 7 ? 'Every day' : r.days.join(', ')}
          <br />
          {r.concurrency} at a time · up to {r.maxAttempts} attempts · retry {r.retryMode === 'end' ? 'at end of list' : r.retryMode === 'delay' ? `after ${r.retryDelay} min` : `after ${r.retrySlots} calls`}
        </ReviewCard>
      </div>
    </>
  );
}

function Est({ label, value, sub }) {
  return (
    <div>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-0.5 font-display text-xl font-bold tabular">{value}</div>
      {sub && <div className="text-2xs text-ink-faint">{sub}</div>}
    </div>
  );
}

function ReviewCard({ title, onEdit, children }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{title}</h3>
        <Button size="xs" variant="ghost" icon={PencilSimple} onClick={onEdit}>
          Edit
        </Button>
      </div>
      <div className="text-[13px] leading-relaxed text-ink-2">{children}</div>
    </Card>
  );
}


import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise, CheckCircle, Headset, Lightning, Microphone, Phone, PhoneDisconnect, PhoneOutgoing, Robot, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDuration, fmtPhone, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, CardHeader, DataTable, EmptyState, Field, IconTile, Input, Segmented, Select, Skeleton, StatusBadge, Waveform, useToast } from '@/design-system';
import { Page, PageHeader, SectionTitle } from '@/shared/layout';
import { getTestCallSetup, ref } from '@/services/agentflow';
import { ChipToggleGroup } from '../components/FormBits';

const BLANK = { phone: '', name: '', mode: 'ai', voiceId: 'v_diya', engine: 'sarvam', tone: 'Friendly', language: 'Hinglish', knowledge: 'Parko Heights brochure' };

export default function TestCallPage() {
  const { data, loading } = useQuery(getTestCallSetup, []);
  const [form, setForm] = useState(BLANK);
  const [preset, setPreset] = useState('tp1');
  const [call, setCall] = useState({ state: 'idle' });
  const [history, setHistory] = useState([]);
  const toast = useToast();
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const voice = ref.voices.find((v) => v.id === form.voiceId);
  const digits = form.phone.replace(/\D/g, '');
  const validPhone = digits.length === 10;
  const busy = ['ringing', 'connected'].includes(call.state);

  const applyPreset = (p) => {
    setPreset(p.id);
    set({ voiceId: p.voiceId, engine: p.engine, tone: p.tone, language: p.language, knowledge: p.knowledge });
  };

  const start = () => setCall({ state: 'ringing', startedAt: new Date(), lines: [], seconds: 0 });
  const callRef = useRef(call);
  callRef.current = call;
  const end = (reason) => {
    const c = callRef.current;
    if (!['ringing', 'connected'].includes(c.state)) return;
    const answered = c.state === 'connected';
    const disposition = answered ? (c.lines.length > 7 ? 'Site visit booked' : 'Call back later') : 'No answer';
    setHistory((h) => [{ id: `ts_new${Date.now()}`, phone: digits, name: form.name || 'Test contact', voice: voice.name, engine: ref.engineLabel[form.engine], startedAt: c.startedAt, duration: c.seconds, status: answered ? 'Completed' : 'No answer', disposition, by: 'You' }, ...h]);
    if (reason === 'user' && !answered) toast({ title: 'Call cancelled' });
    setCall({ ...c, state: 'ended', answered, disposition });
  };

  return (
    <Page>
      <PageHeader title="Test call" description="Call your own phone to hear exactly what customers will hear. Test calls use your minutes." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card className="p-6">
          <CardHeader title="Call setup" subtitle="Start from a preset or pick each option." icon={PhoneOutgoing} />
          {loading ? (
            <Skeleton className="h-80 w-full rounded-xl" />
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <Lightning size={13} weight="fill" className="text-accent" /> Quick presets
                </div>
                <ChipToggleGroup single size="sm" value={preset} onChange={(id) => applyPreset(data.presets.find((p) => p.id === id))} options={data.presets.map((p) => ({ value: p.id, label: p.label }))} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone number" required error={form.phone && !validPhone ? 'Enter a 10-digit mobile number.' : null}>
                  <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="98765 43210" inputMode="tel" icon={Phone} />
                </Field>
                <Field label="Name to greet" optional>
                  <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Rohan" />
                </Field>
              </div>

              <Field label="Who talks">
                <Segmented
                  value={form.mode}
                  onChange={(mode) => set({ mode })}
                  options={[
                    { value: 'ai', label: 'AI agent', icon: Robot },
                    { value: 'human', label: 'Me on PC mic', icon: Headset },
                  ]}
                />
              </Field>

              {form.mode === 'ai' ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Voice">
                      <Select value={form.voiceId} onChange={(e) => set({ voiceId: e.target.value, engine: ref.voices.find((v) => v.id === e.target.value).engines[0] })} options={ref.voices.map((v) => ({ value: v.id, label: `${v.name} · ${v.languages[0]}` }))} />
                    </Field>
                    <Field label="Engine">
                      <Select value={form.engine} onChange={(e) => set({ engine: e.target.value })} options={ref.engines.filter((e) => voice.engines.includes(e.value))} />
                    </Field>
                    <Field label="Language">
                      <Select value={form.language} onChange={(e) => set({ language: e.target.value })} options={ref.languages} />
                    </Field>
                    <Field label="Knowledge">
                      <Select value={form.knowledge} onChange={(e) => set({ knowledge: e.target.value })} options={data.knowledge} />
                    </Field>
                  </div>
                  <Field label="Tone">
                    <ChipToggleGroup single size="sm" options={ref.tones} value={form.tone} onChange={(tone) => set({ tone })} />
                  </Field>
                </>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4 text-[13px] text-ink-2">
                  <Microphone size={20} weight="duotone" className="mt-0.5 shrink-0 text-brand" />
                  We dial the number and connect it to your browser. Allow microphone access when Chrome asks.
                </div>
              )}

              <Button variant="brand" size="lg" icon={PhoneOutgoing} disabled={!validPhone || busy} onClick={start} className="mt-1 w-full">
                {busy ? 'Call in progress' : `Call ${validPhone ? fmtPhone(digits) : 'now'}`}
              </Button>
            </div>
          )}
        </Card>

        <LiveCallPanel call={call} setCall={setCall} onEnd={end} form={form} voice={voice} onReset={() => setCall({ state: 'idle' })} />
      </div>

      <section className="mt-8">
        <SectionTitle title="Recent test calls" description="Test calls from your team in the last 7 days." />
        <Card padded={false} className="overflow-hidden">
          <DataTable
            loading={loading}
            rows={[...history, ...(data?.sessions || [])]}
            pageSize={6}
            empty={<EmptyState compact icon={PhoneOutgoing} title="No test calls yet" description="Run your first test call above." />}
            columns={[
              {
                key: 'name',
                header: 'Called',
                render: (r) => (
                  <span className="flex items-center gap-3">
                    <Avatar name={r.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{r.name}</span>
                      <span className="block text-xs tabular text-ink-muted">{fmtPhone(r.phone)}</span>
                    </span>
                  </span>
                ),
              },
              { key: 'voice', header: 'Voice', hideBelow: 'md', render: (r) => `${r.voice} · ${r.engine}` },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'disposition', header: 'Outcome', hideBelow: 'lg' },
              { key: 'duration', header: 'Duration', align: 'right', render: (r) => (r.duration ? fmtDuration(r.duration) : '—') },
              { key: 'by', header: 'By', hideBelow: 'lg' },
              { key: 'startedAt', header: 'When', align: 'right', hideBelow: 'md', render: (r) => <span className="text-ink-muted">{fmtRelative(r.startedAt)}</span> },
            ]}
          />
        </Card>
      </section>
    </Page>
  );
}

/* ---------------- Live call panel ---------------- */

function LiveCallPanel({ call, setCall, onEnd, form, voice, onReset }) {
  const script = useRef([]);
  const scroller = useRef(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const who = form.name || 'Rohan';

  // Ringing → connected after 2.8 s.
  useEffect(() => {
    if (call.state !== 'ringing') return undefined;
    script.current = ref.testScript(voice.name, who);
    const t = setTimeout(() => setCall((c) => (c.state === 'ringing' ? { ...c, state: 'connected' } : c)), 2800);
    return () => clearTimeout(t);
  }, [call.state, voice.name, who, setCall]);

  // Timer + transcript streaming while connected.
  useEffect(() => {
    if (call.state !== 'connected') return undefined;
    const tick = setInterval(() => setCall((c) => ({ ...c, seconds: c.seconds + 1 })), 1000);
    const lines = setInterval(() => {
      setCall((c) => {
        if (c.state !== 'connected') return c;
        const next = script.current[c.lines.length];
        if (!next) return c;
        return { ...c, lines: [...c.lines, next] };
      });
    }, 2300);
    return () => {
      clearInterval(tick);
      clearInterval(lines);
    };
  }, [call.state, setCall]);

  // Auto-end when the script runs out.
  useEffect(() => {
    if (call.state === 'connected' && call.lines.length === script.current.length && script.current.length) {
      const t = setTimeout(() => endRef.current('auto'), 1800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [call.state, call.lines?.length]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [call.lines?.length]);

  const header = {
    idle: ['Ready', 'neutral'],
    ringing: ['Ringing', 'warning'],
    connected: ['Connected', 'success'],
    ended: ['Call ended', 'neutral'],
  }[call.state];

  return (
    <Card padded={false} className="relative flex min-h-[560px] flex-col overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
      <div className="relative flex items-center gap-3 border-b border-line px-6 py-4">
        <h3 className="text-[15px] font-bold">Live call</h3>
        <Badge tone={header[1]} dot pulse={call.state === 'ringing' || call.state === 'connected'}>
          {header[0]}
        </Badge>
        {call.state === 'connected' && <span className="ml-auto font-display text-lg font-bold tabular text-ink">{fmtClock(call.seconds)}</span>}
      </div>

      {call.state === 'idle' && (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <IconTile icon={PhoneOutgoing} size="lg" />
          <div>
            <h3 className="text-lg font-bold">Your test call shows here</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">Enter your number and press Call. You will see the conversation as it happens, then the summary and outcome.</p>
          </div>
          <ul className="mt-2 grid w-full max-w-md gap-2 text-left text-[13px] text-ink-2">
            {['Try interrupting the AI mid-sentence', 'Ask something from the knowledge PDF', 'Say “mujhe call mat karna” to test DNC'].map((t) => (
              <li key={t} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <Sparkle size={14} weight="fill" className="shrink-0 text-brand" /> {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {call.state === 'ringing' && (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
          <span className="relative flex h-24 w-24 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
            <span className="absolute inset-2 rounded-full bg-brand/15" />
            <Avatar name={form.name || 'Test'} size="xl" className="relative" />
          </span>
          <div>
            <div className="text-lg font-bold">{form.name || 'Test contact'}</div>
            <div className="text-sm tabular text-ink-muted">Ringing {fmtPhone(form.phone)}…</div>
          </div>
          <Button variant="danger" icon={PhoneDisconnect} onClick={() => onEnd('user')}>
            Cancel
          </Button>
        </div>
      )}

      {call.state === 'connected' && (
        <>
          <div className="relative flex items-center gap-3 border-b border-line bg-surface-2/60 px-6 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-ink">
              <Robot size={18} weight="fill" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {voice.name} (AI) → {form.name || 'Test contact'}
              </div>
              <div className="text-xs text-ink-muted">
                {form.language} · {ref.engineLabel[form.engine]} · {form.tone}
              </div>
            </div>
            <Waveform bars={6} className="h-5 text-brand" />
          </div>
          <div ref={scroller} className="relative flex max-h-[380px] flex-1 flex-col gap-3 overflow-y-auto px-6 py-5">
            {call.lines.map((l, i) => (
              <div key={i} className={cn('flex animate-rise flex-col', l.speaker === 'customer' && 'items-end')}>
                <span className="mb-0.5 text-2xs text-ink-faint">{l.speaker === 'agent' ? `${voice.name} (AI)` : form.name || 'Customer'}</span>
                <span className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed', l.speaker === 'agent' ? 'rounded-tl-md bg-brand/10 text-ink' : 'rounded-tr-md bg-surface-3 text-ink-2')}>{l.text}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <Waveform bars={3} className="h-3" /> listening…
            </div>
          </div>
          <div className="relative flex items-center justify-center border-t border-line p-4">
            <Button variant="danger" size="lg" icon={PhoneDisconnect} onClick={() => onEnd('user')}>
              End call
            </Button>
          </div>
        </>
      )}

      {call.state === 'ended' && (
        <div className="relative flex flex-1 flex-col gap-5 p-6">
          <div className="flex items-center gap-3">
            <IconTile icon={call.answered ? CheckCircle : PhoneDisconnect} tone={call.answered ? 'success' : 'neutral'} />
            <div>
              <div className="text-base font-bold">{call.answered ? 'Call completed' : 'Not answered'}</div>
              <div className="text-xs text-ink-muted">
                {fmtDuration(call.seconds)} · {call.lines?.length || 0} turns
              </div>
            </div>
            <Badge tone={call.answered ? 'brand' : 'neutral'} className="ml-auto">
              {call.disposition}
            </Badge>
          </div>
          {call.answered && (
            <>
              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand">
                  <Sparkle size={14} weight="fill" /> AI summary
                </div>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  {form.name || 'The customer'} is looking for a 2BHK in Wakad with a budget near ₹85 L and asked about parking and the clubhouse.
                  {call.disposition === 'Site visit booked' ? ' A site visit is booked for Saturday 11 AM.' : ' Asked to be called back after discussing with family.'}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                {[
                  ['Budget', '₹85 L'],
                  ['Location', 'Wakad, Pune'],
                  ['Configuration', '2BHK'],
                  ['Site visit', call.disposition === 'Site visit booked' ? 'Sat, 11:00 AM' : 'Not yet'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-surface-2 p-3">
                    <dt className="text-xs text-ink-muted">{k}</dt>
                    <dd className="mt-0.5 text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            <Button variant="brand" icon={ArrowCounterClockwise} onClick={() => setCall({ state: 'ringing', startedAt: new Date(), lines: [], seconds: 0 })}>
              Call again
            </Button>
            <Button onClick={onReset}>Change setup</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

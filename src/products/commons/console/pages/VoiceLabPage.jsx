import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowsLeftRight, Brain, Ear, Lightning, Microphone, Phone, PhoneDisconnect, PhoneOutgoing, SpeakerHigh, Timer, Waveform as WaveIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtClock, fmtDateTime, fmtNumber, fmtPhone } from '@/lib/format';
import { Badge, BarsChart, Button, Callout, Card, CardHeader, ChartCard, DataTable, EmptyState, Field, Input, SecretInput, Segmented, Select, Tabs, Textarea, Waveform, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listVoiceLabTests } from '@/services/commons';
import { VOICE_LAB_OPTIONS as O, configLabel } from '@/mocks/commons';
import { StarRating } from '../components/Bits';

const DEFAULTS = {
  A: { pipeline: 'cascade', stt: O.stt[0], llm: O.llm[0], tts: O.tts[0], s2s: O.s2s[0], voice: O.voices[0], language: O.languages[0], key: '' },
  B: { pipeline: 's2s', stt: O.stt[1], llm: O.llm[1], tts: O.tts[2], s2s: O.s2s[0], voice: O.voices[2], language: O.languages[0], key: '' },
};
/* A and B get fixed, distinct accents from the product palette. */
const SIDE = {
  A: { product: 'agentflow', chip: 'bg-product-agentflow text-white', ring: 'ring-product-agentflow/30', soft: 'bg-product-agentflow/10 text-product-agentflow' },
  B: { product: 'businesspulse', chip: 'bg-ink text-white', ring: 'ring-ink/20', soft: 'bg-surface-3 text-ink' },
};
const PHASES = ['Dialing', 'Ringing', 'Connected', 'Ended'];

export default function VoiceLabPage() {
  const { data, loading } = useQuery(() => listVoiceLabTests(), []);
  const [tests, setTests] = useState([]);
  useEffect(() => data && setTests(data), [data]);
  const [cfg, setCfg] = useState(DEFAULTS);
  const [phone, setPhone] = useState('98201 45678');
  const [call, setCall] = useState(null); // {side, phase, startedAt, latency, transcript}
  const [tab, setTab] = useState('compare');
  const toast = useToast();

  const phoneOk = phone.replace(/\D/g, '').length >= 10;
  const update = (side) => (k, v) => setCfg((c) => ({ ...c, [side]: { ...c[side], [k]: v } }));

  const start = (side) => {
    if (!phoneOk) return toast({ title: 'Enter a 10-digit number first', tone: 'warning' });
    const c = cfg[side];
    const latency = (c.pipeline === 's2s' ? 480 : c.stt.startsWith('Sarvam') ? 960 : 820) + Math.round(Math.random() * 220);
    setCall({ side, config: { ...c }, phase: 'Dialing', latency, startedAt: null, endedAt: null });
  };

  return (
    <Page>
      <PageHeader
        title="Voice lab"
        description="Call your own phone with two voice stacks and rate which one sounds better. Was “Dialer test”."
        meta={
          <>
            <Badge tone="neutral" icon={ArrowsLeftRight}>
              A/B test
            </Badge>
            <span className="text-xs text-ink-muted">{fmtNumber(tests.length)} tests so far</span>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 md:flex-row md:items-end">
          <Field label="Your phone number" hint="We call this number. Use a phone you can pick up now." className="md:w-80">
            <Input icon={Phone} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
          </Field>
          <Callout tone="warning" className="flex-1 py-3">
            Temporary API keys are used for this test only. <b>Keys are not saved.</b>
          </Callout>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {['A', 'B'].map((side) => (
            <ConfigColumn key={side} side={side} c={cfg[side]} onChange={update(side)} onCall={() => start(side)} busy={!!call && call.phase !== 'Ended' && call.phase !== 'Rated'} active={call?.side === side && call.phase !== 'Rated'} />
          ))}
        </div>

        {call && call.phase !== 'Rated' && (
          <LiveCall
            call={call}
            phone={phone}
            setCall={setCall}
            onSave={(rating, notes) => {
              const t = { id: `vl_new_${Date.now()}`, at: new Date(), side: call.side, config: call.config, phone: phone.replace(/\D/g, ''), by: 'You', duration: Math.round((call.endedAt - call.startedAt) / 1000), latency: call.latency, rating, notes };
              setTests((x) => [t, ...x]);
              setCall({ ...call, phase: 'Rated' });
              toast({ title: `Rating saved for config ${call.side}`, description: `${rating} stars · ${fmtNumber(call.latency)} ms first reply`, tone: 'success' });
            }}
          />
        )}

        <section>
          <Tabs
            className="mb-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'compare', label: 'Compare configs' },
              { id: 'history', label: 'All tests', count: tests.length },
            ]}
          />
          {tab === 'compare' ? <Compare tests={tests} loading={loading} /> : <History tests={tests} loading={loading} />}
        </section>
      </div>
    </Page>
  );
}

/* ---------------- Config column ---------------- */

function ConfigColumn({ side, c, onChange, onCall, busy, active }) {
  const s = SIDE[side];
  const sel = (k, opts, icon) => (
    <Select value={c[k]} onChange={(e) => onChange(k, e.target.value)} options={opts} aria-label={k} className={icon ? '' : ''} />
  );
  return (
    <Card padded={false} className={cn('flex flex-col overflow-hidden transition', active && cn('ring-4', s.ring))}>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl font-display text-lg font-extrabold', s.chip)}>{side}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold">Config {side}</div>
          <div className="truncate text-xs text-ink-muted">{configLabel(c)}</div>
        </div>
        {active && (
          <Badge tone="success" dot pulse>
            On call
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <Field label="Pipeline">
          <Segmented value={c.pipeline} onChange={(v) => onChange('pipeline', v)} options={O.pipelines.map((p) => ({ value: p.value, label: p.label }))} />
          <span className="text-xs text-ink-muted">{O.pipelines.find((p) => p.value === c.pipeline).description}</span>
        </Field>

        {c.pipeline === 'cascade' ? (
          <div className="relative flex flex-col gap-2 rounded-2xl bg-surface-2 p-3">
            {[
              ['stt', 'Speech to text', Ear, O.stt],
              ['llm', 'Language model', Brain, O.llm],
              ['tts', 'Text to speech', SpeakerHigh, O.tts],
            ].map(([k, label, Icon, opts], i) => (
              <div key={k} className="relative grid grid-cols-[32px_1fr] items-center gap-3">
                {i < 2 && <span className="absolute left-4 top-9 h-5 w-px bg-line-strong" />}
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', s.soft)}>
                  <Icon size={16} weight="duotone" />
                </span>
                <div className="grid items-center gap-1 sm:grid-cols-[120px_1fr]">
                  <span className="text-xs font-medium text-ink-muted">{label}</span>
                  {sel(k, opts)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', s.soft)}>
              <Lightning size={16} weight="duotone" />
            </span>
            <div className="grid flex-1 items-center gap-1 sm:grid-cols-[120px_1fr]">
              <span className="text-xs font-medium text-ink-muted">Realtime model</span>
              {sel('s2s', O.s2s)}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Voice">{sel('voice', O.voices)}</Field>
          <Field label="Language">{sel('language', O.languages)}</Field>
        </div>
        <Field label="Temporary API key" optional hint="Keys are not saved. Leave empty to use the platform key.">
          <SecretInput value={c.key} onChange={(v) => onChange('key', v)} placeholder="Paste a key for this test" />
        </Field>
      </div>
      <div className="border-t border-line bg-surface-2 px-5 py-3">
        <Button variant="primary" icon={PhoneOutgoing} className="w-full" disabled={busy} onClick={onCall}>
          Call with {side}
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- Live call ---------------- */

function LiveCall({ call, phone, setCall, onSave }) {
  const [now, setNow] = useState(Date.now());
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const timers = useRef([]);
  const s = SIDE[call.side];

  useEffect(() => {
    if (call.phase === 'Dialing') timers.current.push(setTimeout(() => setCall((c) => c && { ...c, phase: 'Ringing' }), 1200));
    if (call.phase === 'Ringing') timers.current.push(setTimeout(() => setCall((c) => c && { ...c, phase: 'Connected', startedAt: Date.now() }), 2200));
    return () => timers.current.forEach(clearTimeout);
  }, [call.phase, setCall]);
  useEffect(() => {
    if (call.phase !== 'Connected') return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [call.phase]);

  const elapsed = call.startedAt ? ((call.endedAt || now) - call.startedAt) / 1000 : 0;
  const idx = PHASES.indexOf(call.phase);
  const hangUp = () => setCall((c) => ({ ...c, phase: 'Ended', endedAt: Date.now() }));

  return (
    <Card padded={false} className="animate-rise overflow-hidden">
      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        <div className="relative overflow-hidden bg-night p-6 text-white">
          <div className={cn('pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full opacity-40 blur-[80px]', call.side === 'A' ? 'bg-product-agentflow' : 'bg-ink')} />
          <div className="relative flex items-center gap-3">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl font-display text-lg font-extrabold', s.chip)}>{call.side}</span>
            <div className="min-w-0">
              <div className="text-xs text-white/55">Calling {fmtPhone(phone)}</div>
              <div className="truncate text-sm font-semibold">{configLabel(call.config)}</div>
            </div>
          </div>
          <div className="relative mt-8 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[.1em] text-white/50">{call.phase}</div>
              <div className="font-display text-5xl font-bold tabular">{fmtClock(elapsed)}</div>
            </div>
            {call.phase === 'Connected' ? <Waveform bars={7} className="h-10 text-white/80" /> : call.phase !== 'Ended' && <Waveform bars={3} className="h-5 text-white/40" />}
          </div>
          <ol className="relative mt-6 flex items-center gap-2">
            {PHASES.map((p, i) => (
              <li key={p} className="flex flex-1 flex-col gap-1.5">
                <span className={cn('h-1 rounded-full', i <= idx ? 'bg-white' : 'bg-white/15')} />
                <span className={cn('text-2xs', i <= idx ? 'text-white/80' : 'text-white/35')}>{p}</span>
              </li>
            ))}
          </ol>
          <div className="relative mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <div className="flex items-center gap-1.5 text-2xs text-white/55">
                <Timer size={12} /> First reply
              </div>
              <div className="mt-0.5 font-display text-lg font-bold tabular">{call.phase === 'Connected' && elapsed < 2 ? '…' : idx >= 2 ? `${fmtNumber(call.latency)} ms` : '—'}</div>
            </div>
            <div className="rounded-xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <div className="flex items-center gap-1.5 text-2xs text-white/55">
                <Microphone size={12} /> Voice
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold">{call.config.voice}</div>
            </div>
          </div>
          {call.phase !== 'Ended' && (
            <Button variant="danger" icon={PhoneDisconnect} className="relative mt-6 w-full" onClick={hangUp}>
              {call.phase === 'Connected' ? 'Hang up' : 'Cancel call'}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6">
          {call.phase !== 'Ended' ? (
            <div className="flex h-full flex-col justify-center gap-3 text-sm text-ink-2">
              <h3 className="text-[15px] font-bold text-ink">While you talk, check</h3>
              {['How long it takes to reply after you stop speaking', 'Whether it stops when you interrupt', 'Pronunciation of names, numbers and places', 'Whether it sounds like a person or a robot'].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', call.side === 'A' ? 'bg-product-agentflow' : 'bg-ink')} />
                  {t}
                </div>
              ))}
            </div>
          ) : (
            <>
              <CardHeader className="mb-0" title={`Rate config ${call.side}`} subtitle={`${fmtClock(elapsed)} call · first reply in ${fmtNumber(call.latency)} ms`} />
              <Field label="Overall">
                <div className="flex items-center gap-3">
                  <StarRating value={rating} onChange={setRating} size={28} />
                  <span className="text-sm text-ink-muted">{['Tap to rate', 'Poor', 'Weak', 'Okay', 'Good', 'Great'][rating]}</span>
                </div>
              </Field>
              <Field label="Measured latency">
                <div className="flex items-center gap-2 text-sm">
                  <Badge tone={call.latency < 700 ? 'success' : call.latency < 1000 ? 'warning' : 'danger'}>{fmtNumber(call.latency)} ms</Badge>
                  <span className="text-xs text-ink-muted">Under 700 ms feels natural on a phone call.</span>
                </div>
              </Field>
              <Field label="Naturalness notes" optional>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pronounced Wakad right, a little slow on numbers…" />
              </Field>
              <div className="mt-auto flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setCall(null)}>
                  Discard
                </Button>
                <Button variant="primary" disabled={!rating} onClick={() => onSave(rating, notes.trim() || '—')}>
                  Save rating
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Results ---------------- */

function Compare({ tests, loading }) {
  const groups = useMemo(() => {
    const m = new Map();
    tests.forEach((t) => {
      const key = configLabel(t.config);
      const g = m.get(key) || { key, config: t.config, n: 0, rating: 0, latency: 0, last: t.at };
      g.n += 1;
      g.rating += t.rating;
      g.latency += t.latency;
      if (new Date(t.at) > new Date(g.last)) g.last = t.at;
      m.set(key, g);
    });
    return [...m.values()].map((g) => ({ ...g, rating: g.rating / g.n, latency: Math.round(g.latency / g.n) })).sort((a, b) => b.rating - a.rating || a.latency - b.latency);
  }, [tests]);
  const best = groups[0];
  const short = (c) => (c.pipeline === 's2s' ? (c.s2s || c.stt).split(' ')[0] + ' S2S' : [c.stt, c.llm, c.tts].map((x) => x.split(' ')[0]).join('·'));
  const chart = groups.map((g) => ({ name: short(g.config), latency: g.latency }));

  if (!loading && !groups.length) return <EmptyState icon={WaveIcon} title="No tests yet" description="Call yourself with config A and B, then rate each call." />;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Card padded={false}>
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <div>
            <h3 className="text-[15px] font-bold">Configs ranked</h3>
            <p className="text-xs text-ink-muted">Average rating, then lowest first-reply latency</p>
          </div>
          {best && (
            <Badge tone="success" dot>
              Best: {best.key.split(' → ')[0]}
            </Badge>
          )}
        </div>
        <DataTable
          loading={loading}
          rows={groups}
          rowKey="key"
          pageSize={0}
          columns={[
            {
              key: 'key',
              header: 'Config',
              render: (g) => (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge size="xs" tone={g.config.pipeline === 's2s' ? 'violet' : 'neutral'}>
                      {g.config.pipeline === 's2s' ? 'Speech-to-speech' : 'Cascade'}
                    </Badge>
                    {g === best && <Badge size="xs" tone="success">Top</Badge>}
                  </div>
                  <div className="mt-1 truncate font-medium text-ink">{g.key}</div>
                  <div className="truncate text-2xs text-ink-faint">
                    {g.config.voice} · {g.config.language}
                  </div>
                </div>
              ),
            },
            {
              key: 'rating',
              header: 'Avg rating',
              sortable: true,
              render: (g) => (
                <div className="flex items-center gap-2">
                  <StarRating value={g.rating} size={14} />
                  <span className="text-xs font-semibold tabular text-ink">{g.rating.toFixed(1)}</span>
                </div>
              ),
            },
            {
              key: 'latency',
              header: 'First reply',
              align: 'right',
              sortable: true,
              render: (g) => <span className={cn('font-semibold', g.latency < 700 ? 'text-success' : g.latency < 1000 ? 'text-ink' : 'text-danger')}>{fmtNumber(g.latency)} ms</span>,
            },
            { key: 'n', header: 'Tests', align: 'right', hideBelow: 'md' },
          ]}
        />
      </Card>
      <ChartCard
        title="First-reply latency"
        subtitle="Average per config · lower is better"
        icon={Timer}
        table={{ columns: [{ key: 'name', header: 'Config' }, { key: 'latency', header: 'ms', format: fmtNumber }], rows: chart }}
      >
        <BarsChart data={chart} series={[{ key: 'latency', label: 'Latency (ms)' }]} layout="vertical" height={Math.max(200, chart.length * 52)} colorBy={(d) => (d.latency < 700 ? 'success' : d.latency < 1000 ? 'warning' : 'danger')} />
      </ChartCard>
    </div>
  );
}

function History({ tests, loading }) {
  return (
    <Card padded={false}>
      <DataTable
        loading={loading}
        rows={tests}
        initialSort={{ key: 'at', dir: 'desc' }}
        empty={<EmptyState icon={WaveIcon} title="No tests yet" description="Your rated calls show up here." compact />}
        columns={[
          { key: 'at', header: 'When', sortable: true, sortValue: (t) => +new Date(t.at), render: (t) => <span className="whitespace-nowrap">{fmtDateTime(t.at)}</span> },
          { key: 'side', header: '', render: (t) => <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold', SIDE[t.side].chip)}>{t.side}</span> },
          { key: 'config', header: 'Config', render: (t) => <span className="block max-w-[280px] truncate text-ink">{configLabel(t.config)}</span> },
          { key: 'rating', header: 'Rating', sortable: true, render: (t) => <StarRating value={t.rating} size={13} /> },
          { key: 'latency', header: 'First reply', align: 'right', sortable: true, render: (t) => `${fmtNumber(t.latency)} ms` },
          { key: 'duration', header: 'Length', align: 'right', render: (t) => fmtClock(t.duration), hideBelow: 'lg' },
          { key: 'notes', header: 'Notes', render: (t) => <span className="block max-w-[260px] truncate text-ink-muted">{t.notes}</span>, hideBelow: 'md' },
          { key: 'by', header: 'By', hideBelow: 'xl' },
        ]}
      />
    </Card>
  );
}

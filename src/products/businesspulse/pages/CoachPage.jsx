import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  ChalkboardTeacher,
  ChatTeardropText,
  Crosshair,
  Microphone,
  MicrophoneSlash,
  PhoneDisconnect,
  Play,
  Quotes,
  Sparkle,
  Target,
  WarningOctagon,
  Barricade,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock, fmtNumber, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, CardHeader, ChartCard, Delta, EmptyState, Field, Input, RadarChart, Segmented, Select, Skeleton, Spinner, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer } from '@/shared/patterns';
import { getCoachPlan, gradeSession, listAgents } from '@/services/businesspulse';
import { ProcessChip, useProcess, useViewer } from '../components/ProcessContext';
import { Eyebrow, ScoreBar, ScorePill } from '../components/common';
import { SessionResult } from '../components/SessionResult';

const RANGES = [
  { value: '30d', label: '30 days' },
  { value: '60d', label: '60 days' },
  { value: '90d', label: '90 days' },
  { value: 'custom', label: 'Custom' },
];

export default function CoachPage() {
  const { processId } = useProcess();
  const { isAgent, name } = useViewer();
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState('30d');
  const [custom, setCustom] = useState({ from: '2026-10-01', to: '2026-11-26' });
  const [stage, setStage] = useState(params.get('mode') === 'roleplay' ? 'call' : 'plan'); // plan | call | grading | result (?mode=roleplay deep-links the call)
  const [result, setResult] = useState(null);
  const { data: agents } = useQuery(() => listAgents(processId), [processId]);
  const agentOptions = (agents || []).filter((a) => a.status !== 'Inactive' && (!isAgent || a.name === name)).map((a) => ({ value: a.id, label: a.name }));
  const agentId = isAgent ? agentOptions[0]?.value : params.get('agent') && agentOptions.some((a) => a.value === params.get('agent')) ? params.get('agent') : agentOptions[0]?.value;
  const rangeArg = range === 'custom' ? { preset: 'custom', ...custom } : { preset: range };
  const { data: plan, loading } = useQuery(() => (agentId ? getCoachPlan(processId, agentId, rangeArg) : Promise.resolve(null)), [processId, agentId, range, custom.from, custom.to]);

  // Back to the plan when the agent or process changes (not on the first load).
  const prevKey = useRef(null);
  useEffect(() => {
    if (!agentId) return;
    const key = `${processId}:${agentId}`;
    if (prevKey.current && prevKey.current !== key) {
      setStage('plan');
      setResult(null);
    }
    prevKey.current = key;
  }, [agentId, processId]);

  const finish = async () => {
    setStage('grading');
    const r = await gradeSession(processId, agentId, plan);
    setResult(r);
    setStage('result');
  };

  if (stage === 'call' && plan) return <RolePlay plan={plan} onEnd={finish} onCancel={() => setStage('plan')} />;

  return (
    <Page>
      <PageHeader
        title="AI coach"
        icon={ChalkboardTeacher}
        description={isAgent ? 'Your coaching plan from recent calls, then practise with Diya.' : 'Pick an agent. Diya reads their scored calls, builds a plan, then role-plays the hard parts.'}
        meta={<ProcessChip />}
        actions={
          <>
            {!isAgent && <Select aria-label="Agent" options={agentOptions} value={agentId || ''} onChange={(e) => setParams({ agent: e.target.value })} className="w-52" />}
            <Segmented value={range} onChange={setRange} options={RANGES} />
          </>
        }
      >
        {range === 'custom' && (
          <div className="flex flex-wrap items-end gap-3">
            <Field label="From">
              <Input type="date" size="sm" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            </Field>
            <Field label="To">
              <Input type="date" size="sm" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </Field>
          </div>
        )}
      </PageHeader>

      {stage === 'grading' && (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Spinner size={28} className="text-brand" />
          <div className="text-[15px] font-bold">Diya is grading the session…</div>
          <p className="text-sm text-ink-muted">Checking each skill against the plan and your QA checklist.</p>
        </Card>
      )}

      {stage === 'result' && result && (
        <SessionResult
          result={result}
          agentName={plan?.agent.name}
          actions={
            <>
              <Button icon={ArrowLeft} onClick={() => setStage('plan')}>
                Back to plan
              </Button>
              <Button variant="brand" icon={ArrowClockwise} onClick={() => setStage('call')}>
                Practise again
              </Button>
            </>
          }
        />
      )}

      {stage === 'plan' && <Plan plan={plan} loading={loading || !agents} onStart={() => setStage('call')} />}
    </Page>
  );
}

/* ------------------------------ Coaching plan ------------------------------ */

function Plan({ plan, loading, onStart }) {
  const [open, setOpen] = useState(null);
  if (loading)
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-40 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
      </div>
    );
  if (!plan || !plan.calls) return <Card><EmptyState icon={ChalkboardTeacher} title="Not enough scored calls" description="Pick a longer range. Diya needs at least 5 scored calls to build a plan." /></Card>;
  const gap = plan.avgScore - plan.teamAvg;

  return (
    <div className="flex flex-col gap-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-night p-6 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand opacity-40 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-accent opacity-20 blur-[100px]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar name={plan.agent.name} size="xl" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.1em] text-white/60">
                <Sparkle size={13} weight="fill" /> Coaching plan
              </div>
              <h2 className="mt-1 truncate text-2xl font-extrabold text-white">{plan.agent.name}</h2>
              <p className="text-sm text-white/60">
                {plan.agent.team} · built from {fmtNumber(plan.calls)} scored calls
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              ['QA score', plan.avgScore, <span key="d" className={cn('text-xs font-semibold', gap >= 0 ? 'text-success' : 'text-danger')}>{gap >= 0 ? '+' : ''}{gap.toFixed(1)} vs team</span>],
              ['Team avg', plan.teamAvg, <span key="t" className="text-xs text-white/50">this period</span>],
              ['Fatal', plan.fatal, <span key="f" className="text-xs text-white/50">errors</span>],
            ].map(([l, v, sub]) => (
              <div key={l} className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                <div className="text-2xs text-white/60">{l}</div>
                <div className="font-display text-2xl font-bold tabular text-white">{v}</div>
                {sub}
              </div>
            ))}
          </div>
          <Button variant="brand" size="lg" icon={Play} onClick={onStart} className="lg:ml-2">
            Role-play with Diya
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-2"
          title="QA score vs team"
          subtitle="Share of max per parameter"
          icon={Target}
          table={{ columns: [{ key: 'parameter', header: 'Parameter' }, { key: 'agent', header: plan.agent.name.split(' ')[0] }, { key: 'team', header: 'Team' }], rows: plan.radar }}
        >
          <RadarChart data={plan.radar} series={[{ key: 'agent', label: plan.agent.name.split(' ')[0], color: 'brand' }, { key: 'team', label: 'Team', color: 'faint' }]} height={290} />
        </ChartCard>

        <Card className="lg:col-span-3">
          <CardHeader title="What is holding them back" subtitle="Patterns across their calls, worst first" icon={Barricade} />
          <ul className="flex flex-col gap-3">
            {plan.blockers.map((b, i) => (
              <li key={b.title} className={cn('flex gap-3 rounded-2xl border p-4', b.fatal ? 'border-danger/25 bg-danger/5' : 'border-line bg-surface-2')}>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', b.fatal ? 'bg-danger text-white' : 'bg-ink text-canvas')}>{b.fatal ? <WarningOctagon size={14} weight="fill" /> : i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{b.title}</span>
                    <Badge tone={b.fatal ? 'danger' : 'neutral'} size="xs">
                      {b.calls} calls
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[13px] text-ink-muted">{b.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top objections" subtitle="What customers said, and how often it was handled well" icon={ChatTeardropText} />
          <ul className="flex flex-col divide-y divide-line/70">
            {plan.objections.map((o) => (
              <li key={o.text} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-ink">{o.text}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{o.count}× heard</span>
                </div>
                <p className="mt-1.5 flex gap-1.5 text-[13px] italic text-ink-2">
                  <Quotes size={12} weight="fill" className="mt-1 shrink-0 text-brand" />
                  {o.quote}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <ScoreBar value={o.handled * 100} className="h-1.5" />
                  <span className="w-24 shrink-0 text-right text-2xs text-ink-muted">{Math.round(o.handled * 100)}% handled well</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="What QA wrote" subtitle="Notes from their lowest-scoring parameters" icon={Quotes} />
          {plan.notes.length ? (
            <ul className="flex flex-col gap-2.5">
              {plan.notes.map((n) => (
                <li key={n.callId + n.parameter}>
                  <button onClick={() => setOpen(n.call)} className="flex w-full flex-col gap-1 rounded-2xl bg-surface-2 p-3.5 text-left transition hover:bg-surface-3">
                    <span className="flex items-center justify-between gap-2">
                      <Badge tone="brand" size="xs">
                        {n.parameter}
                      </Badge>
                      <span className="text-2xs text-ink-faint">{fmtRelative(n.at)}</span>
                    </span>
                    <span className="text-[13px] leading-snug text-ink">{n.note}</span>
                    <span className="text-2xs text-ink-muted">
                      {n.call.contact.name} · {n.reviewer} · <span className="text-brand">Open call</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={Quotes} title="No notes in this range" />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Focus skills"
          subtitle="Diya builds the role-play around these"
          icon={Crosshair}
          actions={
            <Button variant="brand" icon={Play} onClick={onStart}>
              Start role-play
            </Button>
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          {plan.focus.map((f, i) => (
            <div key={f.key} className="relative rounded-2xl border border-line p-4">
              <span className="absolute right-4 top-4 font-display text-3xl font-extrabold text-ink/[.06]">{i + 1}</span>
              <div className="text-sm font-bold">{f.name}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                <ScorePill value={f.score} /> vs team {f.team}
                <Delta value={f.score - f.team} suffix=" pts" />
              </div>
              <p className="mt-3 text-[13px] leading-snug text-ink-2">{f.drill}</p>
            </div>
          ))}
        </div>
      </Card>

      <CallDetailDrawer call={open} open={!!open} onClose={() => setOpen(null)} />
    </div>
  );
}

/* ------------------------------ Role-play call ------------------------------ */

const SCRIPT = [
  ['diya', 'Hello? Haan boliye, kaun bol raha hai?'],
  ['agent', 'Namaste sir, main {agent} bol raha hoon RR Parko se. Aapne Wakad 2BHK ke liye enquiry ki thi.'],
  ['diya', 'Haan, but honestly 85 lakh thoda zyada lag raha hai. Hinjewadi mein 78 mein mil raha hai.'],
  ['agent', 'Samajh sakta hoon sir. Parko Heights mein carpet 760 sq ft hai, wahan 690. Per sq ft hum sasta padte hain.'],
  ['diya', 'Achha… aur GST, parking sab milake final kitna hoga?'],
  ['agent', 'Base 82 lakh, GST 5%, covered parking 3 lakh aur 2 saal maintenance advance. Poora breakup WhatsApp kar deta hoon.'],
  ['diya', 'Theek hai. Possession pakka 2027 mein hoga? Pichhle builder ne bhi yahi bola tha.'],
  ['agent', 'RERA date December 2027 hai sir, website par bhi hai. Kya aap Saturday 11 baje site visit kar sakte hain?'],
  ['diya', 'Saturday chalega. Wife ko bhi le aata hoon.'],
];

function useMicLevels(active) {
  const [lv, setLv] = useState(() => Array(24).fill(0.15));
  useEffect(() => {
    if (!active) {
      setLv(Array(24).fill(0.12));
      return undefined;
    }
    const t = setInterval(() => setLv((prev) => prev.map((_, i) => 0.2 + Math.abs(Math.sin(Date.now() / 140 + i * 0.7)) * 0.55 + Math.random() * 0.25)), 110);
    return () => clearInterval(t);
  }, [active]);
  return lv;
}

function RolePlay({ plan, onEnd, onCancel }) {
  const toast = useToast();
  const agentFirst = plan?.agent.name.split(' ')[0] || 'Agent';
  const lines = useMemo(() => SCRIPT.map(([who, text]) => ({ who, text: text.replace('{agent}', agentFirst) })), [agentFirst]);
  const [shown, setShown] = useState(0); // index of the line currently streaming
  const [chars, setChars] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const scroller = useRef(null);
  const finished = shown >= lines.length;
  const speaking = !finished ? lines[shown].who : null;
  const levels = useMicLevels(speaking === 'agent' && !muted);
  const diyaLevels = useMicLevels(speaking === 'diya');

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Stream the current line character by character, then pause before the next speaker.
  useEffect(() => {
    if (finished) return undefined;
    const line = lines[shown].text;
    if (chars < line.length) {
      const t = setTimeout(() => setChars((c) => Math.min(line.length, c + 2)), 28);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setShown((s) => s + 1);
      setChars(0);
    }, 900);
    return () => clearTimeout(t);
  }, [chars, shown, finished, lines]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [chars, shown]);

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={onCancel} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to plan
        </button>
        <Badge tone="brand" icon={Crosshair}>
          Focus: {plan?.focus.map((f) => f.name).join(', ')}
        </Badge>
      </div>

      <div className="relative grid overflow-hidden rounded-3xl bg-night text-white lg:grid-cols-[380px_1fr]" style={{ minHeight: 560 }}>
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand opacity-30 blur-[110px]" />

        {/* Call panel */}
        <div className="relative flex flex-col items-center justify-between gap-6 border-b border-white/10 p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success" /> Practice call · not recorded to QA
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-36 w-36 items-center justify-center">
              {speaking === 'diya' && (
                <>
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
                  <span className="absolute inset-3 rounded-full bg-brand/30" />
                </>
              )}
              <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-4xl font-extrabold text-white shadow-glow">D</span>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">Diya</div>
              <div className="text-xs text-white/60">AI coach · playing a home buyer from Wakad</div>
            </div>
            <div className="flex h-8 items-center gap-[3px]">
              {diyaLevels.map((l, i) => (
                <span key={i} className="w-[3px] rounded-full bg-brand transition-[height] duration-100" style={{ height: `${l * 100}%`, opacity: speaking === 'diya' ? 1 : 0.3 }} />
              ))}
            </div>
            <div className="font-display text-3xl font-bold tabular text-white">{fmtClock(seconds)}</div>
          </div>

          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex w-full items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
              {muted ? <MicrophoneSlash size={18} className="text-danger" /> : <Microphone size={18} className="text-success" />}
              <div className="flex h-6 flex-1 items-center gap-[2px]">
                {levels.map((l, i) => (
                  <span key={i} className="flex-1 rounded-full bg-success transition-[height] duration-100" style={{ height: `${l * 100}%`, opacity: speaking === 'agent' && !muted ? 0.9 : 0.25 }} />
                ))}
              </div>
              <span className="text-2xs text-white/60">You</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? 'Unmute' : 'Mute'}
                className={cn('flex h-14 w-14 items-center justify-center rounded-full ring-1 ring-white/15 transition', muted ? 'bg-white text-night' : 'bg-white/10 text-white hover:bg-white/20')}
              >
                {muted ? <MicrophoneSlash size={22} weight="fill" /> : <Microphone size={22} weight="fill" />}
              </button>
              <button
                onClick={() => {
                  if (!finished) toast({ title: 'Session ended early', description: 'Diya grades what you covered so far.', tone: 'info' });
                  onEnd();
                }}
                className="flex h-14 items-center gap-2 rounded-full bg-danger px-6 font-semibold text-white shadow-[0_10px_24px_-10px_rgb(var(--danger)/.8)] transition hover:bg-danger/90"
              >
                <PhoneDisconnect size={22} weight="fill" /> End session
              </button>
            </div>
          </div>
        </div>

        {/* Live transcript */}
        <div className="relative flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <span className="text-sm font-semibold text-white">Live transcript</span>
            <span className="text-xs text-white/50">{speaking === 'diya' ? 'Diya is speaking…' : speaking === 'agent' ? 'Listening to you…' : 'Scenario complete'}</span>
          </div>
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-6 py-5" style={{ maxHeight: 500 }}>
            {lines.slice(0, Math.min(shown + 1, lines.length)).map((l, i) => {
              const text = i === shown ? l.text.slice(0, chars) : l.text;
              const diya = l.who === 'diya';
              return (
                <div key={i} className={cn('flex animate-rise gap-2.5', !diya && 'flex-row-reverse')}>
                  <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', diya ? 'bg-brand text-white' : 'bg-white/15 text-white')}>{diya ? 'D' : agentFirst[0]}</span>
                  <div className={cn('max-w-[78%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed', diya ? 'rounded-tl-md bg-white/10 text-white' : 'rounded-tr-md bg-brand/80 text-white')}>
                    {text}
                    {i === shown && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse-dot bg-white/70 align-middle" />}
                  </div>
                </div>
              );
            })}
            {finished && (
              <div className="mx-auto mt-6 flex max-w-sm animate-rise flex-col items-center gap-3 rounded-2xl bg-white/10 p-5 text-center ring-1 ring-white/15">
                <Sparkle size={22} weight="fill" className="text-brand" />
                <div className="text-sm font-semibold text-white">Diya has what she needs</div>
                <p className="text-xs text-white/60">End the session to see your verdict and skill scores.</p>
                <Button variant="brand" iconRight={ArrowRight} onClick={onEnd}>
                  End and get graded
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

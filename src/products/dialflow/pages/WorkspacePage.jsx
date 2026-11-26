import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CaretDown, Coffee, Keyboard, MegaphoneSimple, PhoneDisconnect, PhoneIncoming, PhoneSlash, Play, SignOut } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDate, fmtNumber, fmtRelative } from '@/lib/format';
import { useQuery, useTick } from '@/lib/hooks';
import { Badge, Button, Card, Kbd, Menu, Popover, Progress, Skeleton, Tabs, useToast } from '@/design-system';
import { Page } from '@/shared/layout';
import { useSession } from '@/app/providers/SessionProvider';
import * as df from '@/services/dialflow';
import { DispositionPicker, dispositionReady } from '../components/DispositionPicker';
import { PhoneDock, usePhonePopout } from '../components/softphone/PhoneDock';
import { CollectFieldsSection, DispositionCard, HistoryPanel, IncomingPanel, LeadDetailsSection, LiveCallCard, NotesSection, ReadyStage, ScriptSection } from '../components/WorkspaceStages';

const WRAP_SECONDS = 30;
const RING_TIMEOUT = 20;
const MISSED_LIMIT = 3;

const qs = () => new URLSearchParams(window.location.search);

export default function WorkspacePage() {
  const { data, loading } = useQuery(() => df.getWorkspace(), []);
  const [campaignId, setCampaignId] = useState(() => qs().get('campaign'));

  if (loading || !data) return <WorkspaceSkeleton />;
  const campaign = data.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return <CampaignPicker campaigns={data.campaigns} callbacksDue={data.callbacksDue} onPick={setCampaignId} />;
  return <Workspace key={campaign.id} data={data} campaign={campaign} onSwitch={setCampaignId} />;
}

/* ------------------------------------------------------------------ */
/* Campaign picker                                                     */
/* ------------------------------------------------------------------ */

const METHOD_HINT = { Power: 'Calls come to you automatically', Progressive: 'Next lead dials when you are ready', Manual: 'You dial each lead yourself' };

function CampaignPicker({ campaigns, callbacksDue, onPick }) {
  const { user } = useSession();
  return (
    <Page className="max-w-[820px]">
      <h1 className="text-2xl font-extrabold sm:text-[26px]">Namaste {user?.name?.split(' ')[0]}, which campaign today?</h1>
      <p className="mb-6 mt-1 text-sm text-ink-muted">
        Pick one to open your workspace. You can switch from the status bar between calls.
        {callbacksDue > 0 && (
          <>
            {' '}
            <Link to="/dialflow/callbacks" className="font-medium text-brand hover:underline">
              {callbacksDue} callbacks are due
            </Link>
            .
          </>
        )}
      </p>
      <Card padded={false} className="overflow-hidden">
        <ul className="divide-y divide-line/70">
          {campaigns.map((c, i) => {
            const inbound = c.type === 'Inbound';
            return (
              <li key={c.id}>
                <button type="button" onClick={() => onPick(c.id)} className="group flex w-full items-center gap-5 px-5 py-4 text-left transition hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-ink">{c.name}</span>
                      {i === 0 && <span className="text-xs font-medium text-brand">Last used</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      {inbound ? 'Inbound · customer calls ring you from the queue' : `${c.dialMethod} · ${METHOD_HINT[c.dialMethod].toLowerCase()}`}
                    </div>
                  </div>
                  <div className="hidden w-44 sm:block">
                    {inbound ? (
                      <div className="text-right text-sm">
                        <span className="font-semibold tabular text-ink">3</span> <span className="text-ink-muted">callers waiting</span>
                      </div>
                    ) : (
                      <>
                        <div className="mb-1 text-right text-sm">
                          <span className="font-semibold tabular text-ink">{fmtNumber(c.leadsLeft)}</span> <span className="text-ink-muted">leads left</span>
                        </div>
                        <Progress value={c.leads - c.leadsLeft} max={c.leads} size="sm" />
                      </>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand opacity-70 group-hover:opacity-100">
                    Start <ArrowRight size={14} weight="bold" className="transition group-hover:translate-x-0.5" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </Page>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <Skeleton className="h-[60px] w-full rounded-none" />
      <div className="flex min-h-0 flex-1 gap-5 p-5 lg:p-6">
        <Skeleton className="h-full flex-1 rounded-2xl" />
        <Skeleton className="hidden h-full w-[356px] rounded-[28px] lg:block" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace: slim header · work area (tabs, one stage at a time) on   */
/* the left · the softphone docked on the right (or popped out)        */
/* ------------------------------------------------------------------ */

/* Same colour per line state as the softphone glow, so the header and the phone agree. */
const STATUS_CHIP = {
  idle: ['Not ready', 'bg-surface-3 text-ink-2', 'bg-ink-faint'],
  ready: ['Ready', 'bg-success/10 text-success', 'bg-success'],
  ringing: ['Ringing', 'bg-brand/10 text-brand', 'bg-brand'],
  oncall: ['On a call', 'bg-success/10 text-success', 'bg-success'],
  wrapup: ['Wrap-up', 'bg-warning/10 text-warning', 'bg-warning'],
  break: ['On break', 'bg-surface-3 text-ink-2', 'bg-ink-muted'],
  missed: ['Paused', 'bg-danger/10 text-danger', 'bg-danger'],
};

/*
 * ?demo=ready|ringing|call|wrapup|break|missed opens the workspace in that stage (for previews).
 * ?demo=popout opens a call with the phone in the floating panel; &popout=1 does that for any stage.
 */
const DEMO_PHASE = { ready: 'ready', ringing: 'ringing', call: 'oncall', wrapup: 'wrapup', break: 'break', missed: 'missed', popout: 'oncall' };
const DEMO_AGO = { call: 94, popout: 94, wrapup: 6, break: 260, ringing: 3, ready: 12 };

function Workspace({ data, campaign, onSwitch }) {
  const toast = useToast();
  const { user } = useSession();
  const t = useTick(1000);
  const demo = useMemo(() => qs().get('demo'), []);

  const [phase, setPhase] = useState(() => DEMO_PHASE[demo] || 'idle');
  const [since, setSince] = useState(() => Date.now() - (DEMO_AGO[demo] || 0) * 1000);
  const [breakReason, setBreakReason] = useState(demo === 'break' ? 'Tea break' : null);
  const [pendingBreak, setPendingBreak] = useState(null);
  const [leadIdx, setLeadIdx] = useState(0);
  const [manualLead, setManualLead] = useState(null);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [holdSince, setHoldSince] = useState(null);
  const [conference, setConference] = useState(0);
  const [missed, setMissed] = useState(demo === 'missed' ? MISSED_LIMIT : 0);
  const [callSecs, setCallSecs] = useState(demo === 'wrapup' ? 94 : 0);
  const [notes, setNotes] = useState('');
  const [disp, setDisp] = useState(() => {
    const d = demo === 'wrapup' && data.dispositions.find((x) => String(x.id) === qs().get('disp'));
    return d ? { id: d.id, sub: d.sub[0] || null, ...(d.callback ? { date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: '11:00' } : {}) } : null;
  });
  const [fields, setFields] = useState({});
  const [stats, setStats] = useState(data.stats);
  const [huddle, setHuddle] = useState(data.huddle);
  const [tab, setTab] = useState(() => (demo === 'ringing' ? 'incoming' : ['history', 'incoming'].includes(qs().get('tab')) ? qs().get('tab') : 'summary'));
  const popout = usePhonePopout({ initial: demo === 'popout' || qs().get('popout') === '1' ? 'float' : 'docked' });
  // ?demo=ready holds the first auto-dial a little longer so the waiting stage can be previewed
  const firstDialDelay = useRef(demo === 'ready' ? 20000 : 2000);
  const notesRef = useRef(null);
  const dispRef = useRef(null);
  const scrollRef = useRef(null);

  const lead = manualLead || data.leads[leadIdx % data.leads.length];
  const secs = Math.max(0, Math.round((t - since) / 1000));
  const wrapLeft = Math.max(0, WRAP_SECONDS - secs);
  const inCall = ['ringing', 'oncall', 'wrapup'].includes(phase);
  const holdSecs = holdSince ? Math.max(0, Math.round((t - holdSince) / 1000)) : 0;

  const go = useCallback((p) => {
    setPhase(p);
    setSince(Date.now());
  }, []);

  /* auto-dial loop: Ready → (2 s) ringing → answer / miss */
  useEffect(() => {
    if (phase !== 'ready' || (campaign.dialMethod === 'Manual' && campaign.type !== 'Inbound')) return undefined;
    const id = setTimeout(() => {
      firstDialDelay.current = 2000;
      go('ringing');
    }, firstDialDelay.current);
    return () => clearTimeout(id);
  }, [phase, campaign.dialMethod, campaign.type, go]);

  /* the Incoming call tab opens by itself when a call rings, and steps aside once it is handled */
  const prevPhase = useRef(phase);
  useEffect(() => {
    if (phase === 'ringing' && prevPhase.current !== 'ringing') setTab('incoming');
    if (phase !== 'ringing' && prevPhase.current === 'ringing') setTab((x) => (x === 'incoming' ? 'summary' : x));
    prevPhase.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase === 'ringing' && secs >= RING_TIMEOUT) missCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secs]);

  const resetLine = () => {
    setMuted(false);
    setHeld(false);
    setHoldSince(null);
    setConference(0);
  };

  const answer = () => {
    resetLine();
    go('oncall');
    setMissed(0);
    setTab('summary');
  };

  function missCall() {
    const n = missed + 1;
    setMissed(n);
    setLeadIdx((i) => i + 1);
    if (n >= MISSED_LIMIT) {
      go('missed');
      toast({ tone: 'warning', title: 'You were paused', description: `${MISSED_LIMIT} calls in a row were not answered.` });
    } else {
      go('ready');
      toast({ tone: 'warning', title: 'Call missed', description: `${n} of ${MISSED_LIMIT}. After ${MISSED_LIMIT} you will be paused.` });
    }
  }

  const hangup = () => {
    setCallSecs(secs);
    resetLine();
    go('wrapup');
    setTab('summary');
  };

  const toggleMute = useCallback(() => {
    if (phase !== 'oncall') return;
    setMuted((m) => {
      toast({ tone: 'info', title: m ? 'Microphone on' : 'Muted', duration: 1400 });
      return !m;
    });
  }, [phase, toast]);

  const toggleHold = useCallback(() => {
    if (phase !== 'oncall') return;
    setHeld((h) => {
      setHoldSince(h ? null : Date.now());
      return !h;
    });
  }, [phase]);

  const startBreak = useCallback(
    (b) => {
      setBreakReason(b.name);
      go('break');
      toast({ tone: 'info', title: `On ${b.name.toLowerCase()}`, description: `Up to ${b.maxMinutes} min. Your supervisor can see this.` });
    },
    [go, toast],
  );

  const canSave = phase === 'wrapup' && dispositionReady(data.dispositions, disp);
  const save = useCallback(() => {
    if (!canSave) {
      if (phase === 'wrapup') toast({ tone: 'error', title: 'Pick a disposition first', description: 'Add the reason and callback time if it asks for one.' });
      return;
    }
    const d = data.dispositions.find((x) => x.id === disp.id);
    setStats((s) => ({ ...s, calls: s.calls + 1, talk: s.talk + callSecs, connected: s.connected + (d.category === 'Not reached' ? 0 : 1) }));
    toast({ title: `Saved: ${d.name}${disp.sub ? ` · ${disp.sub}` : ''}`, description: d.callback ? `Callback set for ${fmtDate(disp.date)}, ${disp.time}` : pendingBreak ? 'Starting your break' : 'Moving to the next lead' });
    setNotes('');
    setDisp(null);
    setFields({});
    setManualLead(null);
    setLeadIdx((i) => i + 1);
    if (pendingBreak) {
      startBreak(pendingBreak);
      setPendingBreak(null);
    } else go('ready');
  }, [canSave, phase, data.dispositions, disp, callSecs, toast, go, pendingBreak, startBreak]);

  /* keyboard: Alt+M mute, Alt+H hold, Ctrl/Cmd+Enter save. e.code so macOS Option-letters work.
     Also listens inside the popped-out phone window, so the shortcuts work wherever focus is. */
  const { pipWindow } = popout;
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.altKey && e.code === 'KeyH') {
        e.preventDefault();
        toggleHold();
      } else if ((e.ctrlKey || e.metaKey) && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
        e.preventDefault();
        save();
      }
    };
    const wins = [window, pipWindow].filter(Boolean);
    wins.forEach((w) => w.addEventListener('keydown', onKey));
    return () => wins.forEach((w) => w.removeEventListener('keydown', onKey));
  }, [toggleMute, toggleHold, save, pipWindow]);

  const dialManual = (num) => {
    setManualLead({ id: 'manual', name: 'Manual dial', phone: num.replace(/\D/g, '').slice(-10), city: '—', source: 'Manual dial', tags: ['Manual'], history: [] });
    setBreakReason(null);
    setMissed(0);
    resetLine();
    go('oncall');
    setTab('summary');
  };

  const dialLead = () => {
    resetLine();
    setMissed(0);
    go('oncall');
    setTab('summary');
  };

  const goReady = () => {
    setBreakReason(null);
    setMissed(0);
    go('ready');
  };

  /* the phone asks the work area for things: the notes box, the disposition, the dial pad */
  const bringForward = () => {
    window.focus();
    setTab('summary');
  };
  const focusNotes = () => {
    bringForward();
    requestAnimationFrame(() => {
      notesRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      notesRef.current?.focus({ preventScroll: true });
    });
  };
  const focusDisposition = () => {
    bringForward();
    requestAnimationFrame(() => {
      dispRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      dispRef.current?.focus({ preventScroll: true });
    });
  };
  const focusDialpad = () => {
    const doc = popout.mode === 'pip' && pipWindow ? pipWindow.document : document;
    if (popout.mode === 'pip') pipWindow?.focus();
    doc.querySelector('input[aria-label="Phone number to dial"]')?.focus();
  };

  const [chipLabel, chipCls, chipDot] = STATUS_CHIP[phase];
  const transferTargets = [
    { id: 'tl', name: 'Priya Nair', meta: 'Team lead' },
    { id: 'q1', name: 'Site visit desk', meta: 'Queue · 2 free' },
    { id: 'q2', name: 'Home loan desk', meta: 'Queue · 1 free' },
    { id: 'a1', name: 'Kavya Iyer', meta: 'Ready' },
  ];
  const pickedDisp = disp && data.dispositions.find((x) => x.id === disp.id);
  const breakMax = data.breaks.find((b) => b.name === breakReason)?.maxMinutes;
  const dialLabel = campaign.type === 'Inbound' ? 'Inbound queue' : `${campaign.dialMethod} dialling`;
  const onField = (k, v) => setFields((f) => ({ ...f, [k]: v }));

  const phone = {
    phase,
    campaign,
    lead,
    secs,
    ringTimeout: RING_TIMEOUT,
    wrapLeft,
    wrapTotal: WRAP_SECONDS,
    callSecs,
    breakReason,
    breakMax,
    missedLimit: MISSED_LIMIT,
    muted,
    held,
    holdSecs,
    conferenceCount: conference,
    transferTargets,
    onMute: toggleMute,
    onHold: toggleHold,
    onHangup: hangup,
    onAnswer: answer,
    onDecline: missCall,
    onGoReady: goReady,
    onDial: dialManual,
    onDialLead: dialLead,
    onNotes: focusNotes,
    onOpenDisposition: focusDisposition,
    onTransfer: (x) => {
      toast({ title: `Transferred to ${x.name}`, description: 'Save the disposition to finish.' });
      hangup();
    },
    onConference: (n) => {
      setConference((c) => c + 1);
      toast({ title: `${n} added to the call` });
    },
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* ---------- slim header: campaign · status · break · callbacks · shortcuts ---------- */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-5 py-2.5 lg:px-6">
        <Menu
          width={280}
          align="start"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              disabled={inCall}
              title={inCall ? 'Switch campaign between calls' : 'Switch campaign'}
              className="-ml-2 inline-flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-left hover:bg-surface-3 disabled:hover:bg-transparent"
            >
              <span className="max-w-[260px] truncate text-base font-bold text-ink">{campaign.name}</span>
              {!inCall && <CaretDown size={12} weight="bold" className="text-ink-muted" />}
            </button>
          )}
          items={[
            { heading: 'Switch campaign' },
            ...data.campaigns.map((c) => ({ label: c.name, description: c.type === 'Inbound' ? 'Inbound queue' : `${fmtNumber(c.leadsLeft)} leads left · ${c.dialMethod}`, active: c.id === campaign.id, onClick: () => onSwitch(c.id) })),
            { divider: true },
            { label: 'Leave campaign', icon: SignOut, onClick: () => onSwitch(null) },
          ]}
        />
        <Badge tone={campaign.dialMethod === 'Manual' && campaign.type !== 'Inbound' ? 'neutral' : 'brand'}>{dialLabel}</Badge>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold', chipCls)}>
            <span className={cn('h-2 w-2 rounded-full', chipDot, ['ready', 'oncall', 'ringing'].includes(phase) && 'animate-pulse-dot')} />
            {chipLabel}
            {phase === 'break' && breakReason && <span className="font-medium opacity-80">· {breakReason}</span>}
            {phase !== 'idle' && <span className="font-mono text-xs font-semibold tabular opacity-80">{fmtClock(phase === 'wrapup' ? wrapLeft : secs)}</span>}
          </span>

          {phase === 'idle' || phase === 'break' || phase === 'missed' ? (
            <Button variant="brand" icon={Play} onClick={goReady}>
              {phase === 'break' ? 'End break' : phase === 'missed' ? 'Resume' : 'Go Ready'}
            </Button>
          ) : (
            <Menu
              width={250}
              align="end"
              trigger={({ toggle }) => (
                <Button icon={Coffee} iconRight={CaretDown} onClick={toggle} disabled={['oncall', 'ringing'].includes(phase)} variant={pendingBreak ? 'soft' : 'secondary'}>
                  {pendingBreak ? `${pendingBreak.name} next` : 'Take break'}
                </Button>
              )}
              items={[
                { heading: phase === 'wrapup' ? 'Starts after you save' : 'Pause reason' },
                ...data.breaks.map((b) => ({
                  label: b.name,
                  description: `Up to ${b.maxMinutes} min${b.countsAsBreak ? '' : ' · not counted as break'}`,
                  active: pendingBreak?.id === b.id,
                  onClick: () => {
                    if (phase === 'wrapup') {
                      setPendingBreak(b);
                      toast({ tone: 'info', title: `${b.name} after this call`, description: 'It starts as soon as you save.' });
                    } else startBreak(b);
                  },
                })),
                ...(pendingBreak ? [{ divider: true }, { label: 'Cancel break after save', onClick: () => setPendingBreak(null) }] : []),
              ]}
            />
          )}

          <span className="mx-1 hidden h-6 w-px bg-line md:block" />

          <Link to="/dialflow/callbacks" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm text-ink-2 hover:bg-surface-3">
            <CalendarCheck size={17} />
            <span className="hidden xl:inline">Callbacks</span>
            {data.callbacksDue > 0 && <span className="rounded-full bg-danger/10 px-1.5 text-xs font-semibold leading-5 text-danger tabular">{data.callbacksDue} due</span>}
          </Link>
          <ShortcutsPopover />
        </div>
      </header>

      {/* ---------- slim banners ---------- */}
      {huddle && (
        <div className="flex items-center gap-3 border-b border-brand/15 bg-brand/[.04] px-5 py-1.5 text-[13px] lg:px-6">
          <MegaphoneSimple size={15} weight="fill" className="shrink-0 text-brand" />
          <p className="min-w-0 flex-1 truncate" title={huddle.message}>
            <span className="font-semibold text-ink">{huddle.by.split(' ')[0]}:</span> <span className="text-ink-2">{huddle.message}</span>
            <span className="text-ink-faint"> · {fmtRelative(huddle.at)}</span>
          </p>
          <Button
            size="xs"
            variant="ghost"
            className="text-brand"
            onClick={() => {
              setHuddle(null);
              toast({ title: 'Acknowledged', description: `${huddle.by.split(' ')[0]} can see you have read it.` });
            }}
          >
            Got it
          </Button>
        </div>
      )}
      {phase === 'missed' && (
        <div className="flex items-center gap-3 border-b border-danger/20 bg-danger/5 px-5 py-1.5 text-[13px] lg:px-6">
          <PhoneSlash size={15} weight="fill" className="shrink-0 text-danger" />
          <p className="min-w-0 flex-1 truncate">
            <span className="font-semibold text-ink">Paused after {MISSED_LIMIT} missed calls.</span> <span className="text-ink-2">Check your headset, then resume.</span>
          </p>
          <Button size="xs" variant="danger" icon={Play} onClick={goReady}>
            Resume
          </Button>
        </div>
      )}

      {/* ---------- body: work area · softphone ---------- */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden lg:p-5 xl:p-6">
        <section className="flex min-h-[560px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card lg:min-h-0">
          {/* tabs + what is on the line (stays visible even with the phone popped out) */}
          <div className="relative shrink-0 bg-surface">
            <Tabs
              value={tab}
              onChange={setTab}
              className="px-6 pt-3"
              tabs={[
                { id: 'summary', label: 'Call summary' },
                { id: 'history', label: 'History', count: lead.history.length || undefined },
                {
                  id: 'incoming',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      {phase === 'ringing' ? (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                        </span>
                      ) : (
                        <PhoneIncoming size={14} />
                      )}
                      Incoming call
                    </span>
                  ),
                },
              ]}
            />
            <div className="absolute inset-y-0 right-4 hidden items-center pb-1 md:flex">
              <LineIndicator phase={phase} lead={lead} secs={secs} wrapLeft={wrapLeft} held={held} holdSecs={holdSecs} stats={stats} onAnswer={answer} onHangup={hangup} onDisposition={focusDisposition} />
            </div>
          </div>

          {/* one stage at a time; scrolls inside the panel */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-canvas">
            <div className="mx-auto flex max-w-[1040px] flex-col gap-4 px-5 py-5 lg:px-6 xl:gap-5 xl:px-7 xl:py-6">
              {tab === 'summary' && (
                <>
                  {!inCall && (
                    <ReadyStage
                      phase={phase}
                      campaign={campaign}
                      lead={lead}
                      secs={secs}
                      breakReason={breakReason}
                      breakMax={breakMax}
                      stats={stats}
                      callbacksDue={data.callbacksDue}
                      missedLimit={MISSED_LIMIT}
                      queue={[1, 2, 3].map((i) => data.leads[(leadIdx + i) % data.leads.length])}
                      onGoReady={goReady}
                      onNotReady={() => go('idle')}
                      onDialLead={dialLead}
                      onKeypad={focusDialpad}
                    />
                  )}

                  {phase === 'ringing' && (
                    <>
                      <LiveCallCard lead={lead} ringing seconds={secs} />
                      <ScriptSection script={data.script} lead={lead} agent={user?.name} />
                    </>
                  )}

                  {phase === 'oncall' && (
                    <>
                      <LiveCallCard lead={lead} seconds={secs} held={held} holdSeconds={holdSecs} />
                      <ScriptSection script={data.script} lead={lead} agent={user?.name} />
                      <NotesSection value={notes} onChange={setNotes} live notesRef={notesRef} />
                      <CollectFieldsSection fields={data.fields} values={fields} onField={onField} />
                    </>
                  )}

                  {phase === 'wrapup' && (
                    <>
                      <DispositionCard
                        cardRef={dispRef}
                        lead={lead}
                        callSeconds={callSecs}
                        wrapLeft={wrapLeft}
                        canSave={canSave}
                        onSave={save}
                        disposition={pickedDisp ? `${pickedDisp.name}${disp.sub ? ` · ${disp.sub}` : ''}` : null}
                      >
                        <DispositionPicker items={data.dispositions} value={disp} onChange={setDisp} />
                      </DispositionCard>
                      <NotesSection value={notes} onChange={setNotes} notesRef={notesRef} />
                      <CollectFieldsSection fields={data.fields} values={fields} onField={onField} />
                      <LeadDetailsSection lead={lead} agent={user?.name} callSeconds={callSecs} compact />
                    </>
                  )}
                </>
              )}
              {tab === 'history' && <HistoryPanel lead={lead} />}
              {tab === 'incoming' && <IncomingPanel phase={phase} lead={lead} campaign={campaign} secs={secs} ringTimeout={RING_TIMEOUT} onAnswer={answer} onDecline={missCall} />}
            </div>
          </div>
        </section>

        <PhoneDock popout={popout} phone={phone} />
      </div>
    </div>
  );
}

/** Top-right of the work area: what is on the line right now, with the one action that matters. */
function LineIndicator({ phase, lead, secs, wrapLeft, held, holdSecs, stats, onAnswer, onHangup, onDisposition }) {
  const pill = 'inline-flex h-8 items-center gap-2 rounded-full pl-3 text-[13px] font-medium';
  if (phase === 'ringing')
    return (
      <span className={cn(pill, 'bg-success/10 pr-1 text-ink')}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Ringing · <span className="max-w-[140px] truncate font-semibold">{lead.name}</span>
        <button type="button" onClick={onAnswer} className="ml-1 inline-flex h-6 items-center gap-1 rounded-full bg-success px-2.5 text-xs font-semibold text-white transition hover:bg-success/90 active:scale-95">
          <PhoneIncoming size={12} weight="fill" />
          Answer
        </button>
      </span>
    );
  if (phase === 'oncall')
    return (
      <span className={cn(pill, 'pr-1', held ? 'bg-warning/10 text-ink' : 'bg-success/10 text-ink')}>
        <span className={cn('h-2 w-2 rounded-full', held ? 'bg-warning' : 'animate-pulse-dot bg-success')} />
        {held ? 'On hold' : 'On a call'} · <span className="font-mono font-semibold tabular">{fmtClock(held ? holdSecs : secs)}</span>
        <button type="button" onClick={onHangup} title="Hang up" className="ml-1 inline-flex h-6 items-center gap-1 rounded-full bg-danger px-2.5 text-xs font-semibold text-white transition hover:bg-danger/90 active:scale-95">
          <PhoneDisconnect size={12} weight="fill" />
          End
        </button>
      </span>
    );
  if (phase === 'wrapup')
    return (
      <button type="button" onClick={onDisposition} className={cn(pill, 'bg-warning/10 pr-3 text-ink hover:bg-warning/15')}>
        <span className="h-2 w-2 rounded-full bg-warning" />
        Wrap-up · <span className={cn('font-mono font-semibold tabular', wrapLeft <= 5 && 'text-danger')}>{fmtClock(wrapLeft)}</span> left
      </button>
    );
  return (
    <span className="text-[13px] text-ink-muted">
      Today <span className="font-semibold tabular text-ink">{stats.calls}</span>/{stats.target} calls
    </span>
  );
}

function ShortcutsPopover() {
  const rows = [
    ['Mute / unmute', ['Alt', 'M']],
    ['Hold / resume', ['Alt', 'H']],
    ['Save & log call', ['Ctrl', 'Enter']],
    ['Search anything', ['Ctrl', 'K']],
  ];
  return (
    <Popover width={250} align="end" trigger={({ toggle }) => <Button iconOnly variant="ghost" icon={Keyboard} aria-label="Keyboard shortcuts" title="Keyboard shortcuts" onClick={toggle} />}>
      <div className="p-2">
        <div className="mb-2 text-xs font-semibold text-ink">Keyboard shortcuts</div>
        <ul className="flex flex-col gap-2">
          {rows.map(([label, keys]) => (
            <li key={label} className="flex items-center justify-between text-[13px] text-ink-2">
              {label}
              <span className="flex items-center gap-1">
                {keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-2xs text-ink-faint">On a Mac, Alt is the Option (⌥) key.</p>
      </div>
    </Popover>
  );
}

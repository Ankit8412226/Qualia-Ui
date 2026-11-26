import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowSquareIn,
  ArrowSquareOut,
  ArrowsLeftRight,
  ClipboardText,
  Coffee,
  DotsNine,
  DotsSixVertical,
  Microphone,
  MicrophoneSlash,
  NotePencil,
  Pause,
  Phone,
  PhoneDisconnect,
  PhoneIncoming,
  PhoneSlash,
  Play,
  SpeakerHigh,
  SpeakerSlash,
  UserPlus,
  Users,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock, fmtPhone, fmtRelative } from '@/lib/format';
import { Avatar } from '@/design-system';
import { BackspaceKey, BigRoundButton, DigitDots, GLASS, GLASS_HOVER, Keypad, PRESS, PhoneAvatar, PhoneGlow, PhoneSheet, RoundAction, StatusPill, toneRgb } from './phoneUi';

/** Which glow / dot tone each workspace phase gets. */
const PHASE_TONE = { idle: 'muted', ready: 'success', ringing: 'brand', oncall: 'success', wrapup: 'warning', break: 'muted', missed: 'danger' };

export function phoneTone(phase, campaign, held) {
  if (phase === 'ringing' && campaign?.type === 'Inbound') return 'success';
  if (phase === 'oncall' && held) return 'warning';
  return PHASE_TONE[phase] || 'muted';
}

/**
 * The softphone: a phone's call screen. The same component renders docked in the workspace,
 * in the always-on-top Picture-in-Picture window, and in the floating fallback panel.
 * `mode`: 'docked' | 'pip' | 'float'.
 */
export function Softphone(props) {
  const { mode = 'docked', phase, campaign, held, onPopOut, onDock, dragHandle } = props;
  const ref = useRef(null);
  const [short, setShort] = useState(false);
  const [sheet, setSheet] = useState(null);

  // Short screens (a 800px-tall laptop, a small PiP window) get the compact key and button sizes.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const View = el.ownerDocument.defaultView;
    const measure = () => setShort(el.clientHeight < 650);
    measure();
    if (!View?.ResizeObserver) return undefined;
    const ro = new View.ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A sheet belongs to the live call; close it when the call ends.
  useEffect(() => {
    if (phase !== 'oncall') setSheet(null);
  }, [phase]);

  const tone = phoneTone(phase, campaign, held);
  const size = short ? 'sm' : 'md';
  let screen;
  if (phase === 'ringing') screen = <RingingScreen {...props} size={size} tone={tone} />;
  else if (phase === 'oncall') screen = <InCallScreen {...props} size={size} tone={tone} onSheet={setSheet} />;
  else if (phase === 'wrapup') screen = <WrapupScreen {...props} />;
  else if (phase === 'break') screen = <BreakScreen {...props} />;
  else if (phase === 'missed') screen = <PausedScreen {...props} />;
  else screen = <IdleScreen {...props} size={size} />;

  return (
    <div
      ref={ref}
      className={cn(
        'relative isolate flex h-full min-h-0 flex-col overflow-hidden bg-night text-white antialiased',
        mode === 'pip' ? 'min-h-screen' : 'rounded-[28px] shadow-[0_30px_60px_-24px_rgb(var(--night)/.55)] ring-1 ring-white/5',
      )}
    >
      <PhoneGlow tone={tone} pulse={phase === 'ringing'} />

      {/* top bar: brand · campaign · pop out / back */}
      <div className={cn('relative z-10 flex items-center gap-2 px-4 pb-1 pt-3', mode === 'float' && 'cursor-grab active:cursor-grabbing')} {...(mode === 'float' ? dragHandle : {})}>
        {mode === 'float' && <DotsSixVertical size={14} weight="bold" className="-ml-1 text-white/35" aria-hidden />}
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">DialFlow</span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-white/40">· {campaign.name}</span>
        {mode === 'docked' ? (
          <button
            type="button"
            onClick={onPopOut}
            title="Pop the phone out into a small window that stays on top while you work in other tabs"
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:text-white', GLASS, GLASS_HOVER, PRESS)}
          >
            <ArrowSquareOut size={13} weight="bold" />
            Pop out
          </button>
        ) : (
          <button
            type="button"
            onClick={onDock}
            onPointerDown={(e) => e.stopPropagation()}
            title="Put the phone back in the workspace"
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:text-white', GLASS, GLASS_HOVER, PRESS)}
          >
            <ArrowSquareIn size={13} weight="bold" />
            Back
          </button>
        )}
      </div>

      <div key={phase} className="relative z-10 flex min-h-0 flex-1 animate-fade-in flex-col">
        {screen}
      </div>

      {sheet === 'keypad' && <TonesSheet onClose={() => setSheet(null)} />}
      {sheet === 'transfer' && (
        <TransferSheet
          targets={props.transferTargets}
          onClose={() => setSheet(null)}
          onPick={(t) => {
            setSheet(null);
            props.onTransfer?.(t);
          }}
        />
      )}
      {sheet === 'add' && (
        <AddCallSheet
          onClose={() => setSheet(null)}
          onAdd={(n) => {
            setSheet(null);
            props.onConference?.(n);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */

const DIAL_LABEL = { Power: 'Power dialling', Progressive: 'Progressive dialling', Manual: 'Manual dialling' };

function IdleScreen({ phase, campaign, lead, secs, size, onGoReady, onDial, onDialLead }) {
  const [number, setNumber] = useState('');
  const inbound = campaign.type === 'Inbound';
  const manual = campaign.dialMethod === 'Manual' && !inbound;
  const ready = phase === 'ready';
  const digits = number.replace(/\D/g, '');
  const canCall = digits.length === 10;
  const dial = () => {
    if (!canCall) return;
    onDial(digits);
    setNumber('');
  };
  const showLeadChip = !inbound && (manual || !ready) && lead;

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col px-6', size === 'sm' ? 'pb-4' : 'pb-7')}>
      <div className="mt-2 flex flex-col items-center gap-2.5 text-center">
        {ready ? (
          <>
            <StatusPill tone="success" pulse>
              Ready · waiting for the next call
            </StatusPill>
            <p className="text-[11px] text-white/45">
              <span className="font-mono tabular text-white/70">{fmtClock(secs)}</span> waiting · {inbound ? 'Inbound queue' : DIAL_LABEL[campaign.dialMethod]}
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <StatusPill tone="muted">Not ready</StatusPill>
            <button
              type="button"
              onClick={onGoReady}
              className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold text-white', PRESS)}
              style={{ background: 'linear-gradient(180deg, rgb(var(--success) / .85), rgb(var(--success)))', boxShadow: '0 8px 20px -8px rgb(var(--success) / .9)' }}
            >
              <Play size={12} weight="fill" />
              Go Ready
            </button>
          </div>
        )}
        {showLeadChip && (
          <button
            type="button"
            onClick={onDialLead}
            className={cn('inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur-xl', PRESS)}
            style={{ borderColor: toneRgb('success', 0.3), background: toneRgb('success', 0.12), color: 'rgb(255 255 255 / .9)' }}
          >
            <Phone size={13} weight="fill" style={{ color: toneRgb('success') }} />
            <span className="truncate">Call lead · {lead.name}</span>
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div className="relative">
          <input
            type="tel"
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
            onKeyDown={(e) => e.key === 'Enter' && dial()}
            placeholder="Enter number"
            aria-label="Phone number to dial"
            className={cn(
              'w-full bg-transparent text-center font-light tabular tracking-[0.1em] text-white outline-none placeholder:text-lg placeholder:tracking-normal placeholder:text-white/25',
              size === 'sm' ? 'h-10 text-[26px]' : 'h-12 text-[30px]',
            )}
            style={{ caretColor: 'rgb(var(--success))' }}
          />
        </div>
        <div className="mb-3 mt-1.5">
          <DigitDots count={digits.length} />
        </div>
        <Keypad size={size} onKey={(k) => /\d/.test(k) && setNumber((n) => (n + k).slice(0, 10))} />
        <div className={cn('mx-auto grid w-[236px] grid-cols-3 items-center justify-items-center', size === 'sm' ? 'mt-3' : 'mt-5')}>
          <span />
          <BigRoundButton tone="green" icon={Phone} label="Call" showLabel={false} size={size} disabled={!canCall} onClick={dial} title={canCall ? `Call ${fmtPhone(digits)}` : 'Type a 10-digit number'} />
          <BackspaceKey hidden={!number} onClick={() => setNumber((n) => n.slice(0, -1))} />
        </div>
      </div>
    </div>
  );
}

function CallerHeader({ lead, tone, ringing, live, size, children }) {
  return (
    <div className="flex flex-col items-center px-5 text-center">
      <PhoneAvatar name={lead.name} tone={tone} ringing={ringing} live={live} size={size} />
      <p className={cn('mt-4 max-w-full truncate font-display font-semibold leading-tight tracking-tight text-white', size === 'sm' ? 'text-[22px]' : 'text-[25px]')}>{lead.name}</p>
      <p className="mt-0.5 font-mono text-[13px] tabular tracking-wide text-white/55">{fmtPhone(lead.phone)}</p>
      <div className="mt-2.5 max-w-full">{children}</div>
    </div>
  );
}

function RingingScreen({ lead, campaign, secs, ringTimeout, size, tone, onAnswer, onDecline }) {
  const inbound = campaign.type === 'Inbound';
  const left = Math.max(0, ringTimeout - secs);
  const last = lead.history?.[0];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="mt-2 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: toneRgb(tone) }}>
        <PhoneIncoming size={14} weight="bold" />
        {inbound ? 'Incoming call' : 'Auto-dialled call'}
      </p>
      <div className={size === 'sm' ? 'mt-7' : 'mt-10'}>
        <CallerHeader lead={lead} tone={tone} ringing size={size}>
          <StatusPill tone={tone} pulse>
            {inbound ? 'Incoming' : 'Auto-dialled'} · <span className="font-mono">{fmtClock(secs)}</span>
          </StatusPill>
        </CallerHeader>
      </div>
      <p className="mt-3 text-center text-[11px] text-white/50">
        {lead.city} · {lead.source}
        {last ? ` · last: ${last.disposition}, ${fmtRelative(last.at)}` : ' · first call'}
      </p>
      <div className="min-h-4 flex-1" />
      <p className="text-center text-[11px] font-medium text-white/55">
        Answer within <span className={cn('font-mono tabular', left <= 5 ? 'text-white' : 'text-white/80')}>{left}s</span> or it counts as missed
      </p>
      <div className={cn('flex items-start justify-between px-12', size === 'sm' ? 'pb-6 pt-4' : 'pb-10 pt-6')}>
        <BigRoundButton tone="red" icon={PhoneDisconnect} label="Decline" onClick={onDecline} size={size} />
        <BigRoundButton tone="green" icon={Phone} label="Answer" onClick={onAnswer} pulse size={size} />
      </div>
    </div>
  );
}

function InCallScreen({ lead, secs, muted, held, holdSecs, size, tone, conferenceCount, onMute, onHold, onHangup, onNotes, onSheet }) {
  const [volume, setVolume] = useState(80);
  const lastVol = useRef(80);
  const silent = volume === 0;
  if (!silent) lastVol.current = volume;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={size === 'sm' ? 'mt-2' : 'mt-5'}>
        <CallerHeader lead={lead} tone={tone} live={!held} size={size}>
          <StatusPill tone={tone} pulse={!held}>
            {held ? 'On hold' : 'On a call'} · <span className="font-mono">{fmtClock(held ? holdSecs : secs)}</span>
          </StatusPill>
        </CallerHeader>
      </div>
      {(muted || held) && (
        <p
          role="status"
          aria-live="polite"
          className="mx-auto mt-3 max-w-[290px] rounded-2xl border px-3.5 py-2 text-center text-[11px] font-semibold leading-snug backdrop-blur-xl"
          style={{ borderColor: toneRgb('warning', 0.3), background: toneRgb('warning', 0.14), color: 'rgb(255 255 255 / .9)' }}
        >
          {held ? 'On hold. The customer hears hold music. Alt+H to resume.' : 'Muted. The customer can’t hear you. Alt+M to unmute.'}
        </p>
      )}
      <div className="min-h-3 flex-1" />
      <div className={cn('grid grid-cols-3 px-7', size === 'sm' ? 'gap-y-3' : 'gap-y-5')}>
        <RoundAction size={size} icon={muted ? MicrophoneSlash : Microphone} label={muted ? 'Unmute' : 'Mute'} active={muted} onClick={onMute} title="Mute / unmute (Alt+M)" />
        <RoundAction size={size} icon={held ? Play : Pause} label={held ? 'Resume' : 'Hold'} active={held} onClick={onHold} title="Hold / resume (Alt+H)" />
        <RoundAction size={size} icon={DotsNine} label="Keypad" onClick={() => onSheet('keypad')} title="Send tones, e.g. for an IVR menu" />
        <RoundAction size={size} icon={conferenceCount ? Users : UserPlus} label={conferenceCount ? `Conference (${conferenceCount + 2})` : 'Add call'} active={conferenceCount ? true : undefined} onClick={() => onSheet('add')} title="Add someone to this call" />
        <RoundAction size={size} icon={ArrowsLeftRight} label="Transfer" onClick={() => onSheet('transfer')} title="Hand this call to a colleague or queue" />
        <RoundAction size={size} icon={NotePencil} label="Notes" onClick={onNotes} title="Jump to call notes in the workspace" />
      </div>
      <div className={cn('mx-5 flex items-center gap-3 rounded-2xl px-3 py-2', GLASS, size === 'sm' ? 'mt-4' : 'mt-6')} title="Customer volume">
        <button
          type="button"
          onClick={() => setVolume(silent ? lastVol.current : 0)}
          aria-pressed={silent}
          aria-label={silent ? 'Restore customer audio' : 'Silence customer audio'}
          className={cn('flex h-8 w-8 items-center justify-center rounded-full text-white/75 hover:bg-white/10', PRESS)}
        >
          {silent ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(+e.target.value)}
          aria-label="Customer volume"
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-[rgb(var(--success))]"
          style={{ background: `linear-gradient(to right, rgb(var(--success)) ${volume}%, rgb(255 255 255 / .15) ${volume}%)` }}
        />
        <span className="w-9 text-right text-[11px] font-semibold tabular text-white/60">{volume}%</span>
      </div>
      <div className={cn('flex justify-center', size === 'sm' ? 'pb-5 pt-4' : 'pb-8 pt-6')}>
        <BigRoundButton tone="red" icon={PhoneDisconnect} label="End call" showLabel={false} onClick={onHangup} size={size} title="Hang up" />
      </div>
    </div>
  );
}

function StateScreen({ icon: Icon, tone, title, text, children }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 pb-10 text-center">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10"
        style={{ background: `linear-gradient(140deg, ${toneRgb(tone, 0.32)}, ${toneRgb(tone, 0.08)})`, boxShadow: `0 0 50px -12px ${toneRgb(tone, 0.8)}` }}
      >
        <Icon size={40} weight="duotone" className="text-white/90" />
      </div>
      <p className="mt-3 font-display text-xl font-semibold tracking-tight text-white">{title}</p>
      {text && <p className="max-w-[260px] text-xs leading-relaxed text-white/55">{text}</p>}
      {children}
    </div>
  );
}

function PillButton({ onClick, green, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white', PRESS, !green && cn(GLASS, GLASS_HOVER))}
      style={green ? { background: 'linear-gradient(180deg, rgb(var(--success) / .85), rgb(var(--success)))', boxShadow: '0 10px 24px -10px rgb(var(--success) / .9)' } : undefined}
    >
      {Icon && <Icon size={15} weight="bold" />}
      {children}
    </button>
  );
}

function WrapupScreen({ lead, wrapLeft, wrapTotal, callSecs, onOpenDisposition }) {
  const pct = Math.max(0, Math.min(1, wrapLeft / wrapTotal));
  return (
    <StateScreen icon={ClipboardText} tone="warning" title="Call ended — save the disposition" text={`You talked to ${lead.name.split(' ')[0]} for ${fmtClock(callSecs)}. The next call waits until you save.`}>
      <div className="mt-2 w-full max-w-[220px]">
        <div className={cn('font-mono text-[34px] font-semibold leading-none tabular', wrapLeft <= 5 ? 'text-white' : 'text-white/90')}>{wrapLeft > 0 ? fmtClock(wrapLeft) : '0:00'}</div>
        <div className="mt-1 text-[11px] text-white/50">{wrapLeft > 0 ? 'wrap-up time left' : 'wrap-up time is over'}</div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-[width] duration-1000 ease-linear" style={{ width: `${pct * 100}%`, background: toneRgb(wrapLeft <= 5 ? 'danger' : 'warning') }} />
        </div>
      </div>
      <PillButton icon={ClipboardText} onClick={onOpenDisposition}>
        Pick the disposition
      </PillButton>
    </StateScreen>
  );
}

function BreakScreen({ breakReason, breakMax, secs, onGoReady }) {
  const over = breakMax && secs > breakMax * 60;
  return (
    <StateScreen icon={Coffee} tone="muted" title={`On ${breakReason ? breakReason.toLowerCase() : 'a break'}`} text="No calls come to you while you are on a break. Your supervisor can see this.">
      <div className="mt-1">
        <div className={cn('font-mono text-[34px] font-semibold leading-none tabular', over ? '' : 'text-white/90')} style={over ? { color: toneRgb('danger') } : undefined}>
          {fmtClock(secs)}
        </div>
        {breakMax && <div className="mt-1 text-[11px] text-white/50">of {breakMax} min allowed</div>}
      </div>
      <PillButton green icon={Play} onClick={onGoReady}>
        I’m back
      </PillButton>
    </StateScreen>
  );
}

function PausedScreen({ missedLimit, onGoReady }) {
  return (
    <StateScreen icon={PhoneSlash} tone="danger" title="Paused after missed calls" text={`${missedLimit} calls in a row rang out without an answer. Check your headset and volume, then resume.`}>
      <PillButton green icon={Play} onClick={onGoReady}>
        Resume calls
      </PillButton>
    </StateScreen>
  );
}

/* ------------------------------------------------------------------ */
/* In-call sheets                                                      */
/* ------------------------------------------------------------------ */

function TonesSheet({ onClose }) {
  const [tones, setTones] = useState('');
  return (
    <PhoneSheet title="Send tones" onClose={onClose}>
      <div className="mb-1 flex h-10 items-center justify-center font-mono text-[26px] font-light tabular tracking-[0.18em] text-white">{tones || <span className="font-sans text-sm tracking-normal text-white/35">For an IVR menu, e.g. press 1</span>}</div>
      <div className="mb-4 flex justify-center">
        <BackspaceKey hidden={!tones} onClick={() => setTones((x) => x.slice(0, -1))} />
      </div>
      <Keypad size="sm" onKey={(k) => setTones((x) => (x + k).slice(-14))} />
    </PhoneSheet>
  );
}

function TransferSheet({ targets = [], onPick, onClose }) {
  return (
    <PhoneSheet title="Transfer to" onClose={onClose}>
      <ul className="flex flex-col gap-1.5">
        {targets.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => onPick(t)} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left', GLASS, GLASS_HOVER, PRESS)}>
              <Avatar name={t.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-white">{t.name}</span>
                <span className="block truncate text-[11px] text-white/50">{t.meta}</span>
              </span>
              <ArrowsLeftRight size={15} className="text-white/50" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-[11px] text-white/45">The customer is handed over and your call ends.</p>
    </PhoneSheet>
  );
}

function AddCallSheet({ onAdd, onClose }) {
  const [n, setN] = useState('');
  return (
    <PhoneSheet title="Add someone to the call" onClose={onClose}>
      <input
        autoFocus
        value={n}
        onChange={(e) => setN(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && n && onAdd(n)}
        placeholder="Number or extension"
        aria-label="Number or extension"
        className={cn('h-11 w-full rounded-2xl px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30', GLASS)}
      />
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {['Team lead (7101)', 'Loan desk (7140)', 'Site visit desk (7120)'].map((s) => (
          <button key={s} type="button" onClick={() => setN(s)} className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium text-white/75 hover:text-white', GLASS, GLASS_HOVER, PRESS)}>
            {s}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!n}
        onClick={() => onAdd(n)}
        className={cn('mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white disabled:opacity-40', PRESS)}
        style={{ background: 'linear-gradient(180deg, rgb(var(--success) / .85), rgb(var(--success)))' }}
      >
        <UserPlus size={16} weight="bold" />
        Add to call
      </button>
    </PhoneSheet>
  );
}

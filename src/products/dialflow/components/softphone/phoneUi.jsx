import { Backspace, X } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

/*
 * Building blocks of the softphone. A phone's call screen is always dark (night token, white text
 * at opacities), whatever the app theme. Colours come from tokens via rgb(var(--token)).
 */

export const GLASS = 'border border-white/10 bg-white/[.07] shadow-[inset_0_1px_0_rgb(255_255_255/.08)] backdrop-blur-xl';
export const GLASS_HOVER = 'hover:border-white/20 hover:bg-white/[.13]';
export const PRESS = 'transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 active:scale-95';

/** Token behind each line state; drives the glow, the status dot and the avatar ring. */
export const TONE_VAR = { success: '--success', brand: '--brand', warning: '--warning', danger: '--danger', muted: '--faint' };
export const toneRgb = (tone, a = 1) => `rgb(var(${TONE_VAR[tone] || TONE_VAR.muted}) / ${a})`;

/** Stacked glows, one per tone, cross-fading so a state change reads like the phone changing mood. */
export function PhoneGlow({ tone, pulse }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Object.keys(TONE_VAR).map((t) => (
        <div
          key={t}
          className={cn('absolute inset-0 transition-opacity duration-700', t === tone ? 'opacity-100' : 'opacity-0', t === tone && pulse && 'animate-[phone-glow_1.6s_ease-in-out_infinite]')}
          style={{ background: `radial-gradient(140% 58% at 50% -8%, ${toneRgb(t, 0.6)} 0%, ${toneRgb(t, 0.18)} 45%, transparent 72%)` }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: 'radial-gradient(90% 60% at 100% 110%, rgb(var(--navy) / .55) 0%, transparent 70%)' }} />
      <style>{'@keyframes phone-glow{0%,100%{opacity:1}50%{opacity:.55}}'}</style>
    </div>
  );
}

/** Initials in a tone ring; rings ripple out while it rings, and it breathes while live. */
export function PhoneAvatar({ name, tone = 'success', ringing, live, size = 'md' }) {
  const box = size === 'sm' ? 'h-[76px] w-[76px]' : 'h-[96px] w-[96px]';
  return (
    <div className={cn('relative mx-auto shrink-0', box)}>
      {ringing && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full [animation-duration:1.6s]" style={{ background: toneRgb(tone, 0.3) }} />
          <span className="absolute -inset-3 animate-ping rounded-full [animation-delay:.4s] [animation-duration:1.6s]" style={{ background: toneRgb(tone, 0.12) }} />
        </>
      )}
      <span className={cn('absolute -inset-1 rounded-full blur-xl', live ? 'animate-pulse' : 'opacity-70')} style={{ background: toneRgb(tone, 0.45) }} />
      <div className="relative h-full w-full rounded-full p-[3px]" style={{ background: `linear-gradient(140deg, ${toneRgb(tone, 1)}, rgb(255 255 255 / .25) 55%, ${toneRgb(tone, 0.7)})` }}>
        <div className="flex h-full w-full items-center justify-center rounded-full bg-night">
          <span className={cn('font-display font-semibold tracking-wide text-white', size === 'sm' ? 'text-[26px]' : 'text-[32px]')}>{initials(name) || '#'}</span>
        </div>
      </div>
    </div>
  );
}

export function StatusPill({ tone, pulse, children, className }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold tabular text-white/90', GLASS, className)}>
      <span className={cn('h-2 w-2 shrink-0 rounded-full', pulse && 'animate-pulse')} style={{ background: toneRgb(tone), boxShadow: `0 0 10px ${toneRgb(tone, 0.9)}` }} aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}

/** One round in-call button with its label underneath; `active` lights it up like a phone toggle. */
export function RoundAction({ icon: Icon, label, onClick, active, disabled, title, size = 'md' }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active == null ? undefined : !!active}
        aria-label={label}
        title={title || label}
        className={cn(
          'flex items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-30',
          PRESS,
          size === 'sm' ? 'h-[52px] w-[52px]' : 'h-[60px] w-[60px]',
          active ? 'bg-white text-night shadow-[0_10px_30px_-8px_rgb(255_255_255/.55)]' : cn(GLASS, GLASS_HOVER, 'text-white hover:-translate-y-0.5'),
        )}
      >
        <Icon size={size === 'sm' ? 22 : 24} weight={active ? 'fill' : 'regular'} />
      </button>
      <span className={cn('text-[11px] font-medium tracking-wide', active ? 'text-white' : 'text-white/60')}>{label}</span>
    </div>
  );
}

const BIG_TONE = { red: '--danger', green: '--success' };

export function BigRoundButton({ tone, icon: Icon, label, showLabel = true, onClick, disabled, pulse, title, size = 'md' }) {
  const v = BIG_TONE[tone];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {pulse && !disabled && <span className="absolute inset-0 animate-ping rounded-full [animation-duration:1.4s]" style={{ background: `rgb(var(${v}) / .4)` }} aria-hidden />}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          title={title || label}
          className={cn('relative flex items-center justify-center rounded-full text-white hover:scale-105 disabled:opacity-35 disabled:hover:scale-100', PRESS, size === 'sm' ? 'h-[60px] w-[60px]' : 'h-[68px] w-[68px]')}
          style={{
            background: `linear-gradient(180deg, rgb(var(${v}) / .82), rgb(var(${v})))`,
            boxShadow: disabled ? 'none' : `0 14px 36px -10px rgb(var(${v}) / .85), 0 0 0 4px rgb(var(${v}) / .15)`,
          }}
        >
          <Icon size={size === 'sm' ? 26 : 30} weight="fill" />
        </button>
      </div>
      {showLabel && <span className="text-xs font-medium text-white/70">{label}</span>}
    </div>
  );
}

const KEYS = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', ''],
];

/** A phone's keypad. `size` sm fits short screens (docked at 800px tall). */
export function Keypad({ onKey, disabled, size = 'md' }) {
  const box = size === 'sm' ? 'h-[50px] w-[50px]' : 'h-[60px] w-[60px]';
  return (
    <div className={cn('mx-auto grid w-fit grid-cols-3', size === 'sm' ? 'gap-x-5 gap-y-2' : 'gap-x-6 gap-y-3')}>
      {KEYS.map(([k, sub]) => (
        <button
          key={k}
          type="button"
          disabled={disabled}
          onClick={() => onKey(k)}
          aria-label={k}
          className={cn('flex flex-col items-center justify-center rounded-full text-white disabled:pointer-events-none disabled:opacity-30', box, GLASS, GLASS_HOVER, PRESS)}
        >
          <span className={cn('font-light leading-none', size === 'sm' ? 'text-[22px]' : 'text-[26px]')}>{k}</span>
          <span className="mt-0.5 h-2.5 text-[8px] font-semibold tracking-[0.2em] text-white/40">{sub}</span>
        </button>
      ))}
    </div>
  );
}

/** Ten dots that fill as the number is typed (an Indian mobile number is ten digits). */
export function DigitDots({ count, total = 10 }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn('h-1.5 rounded-full transition-all duration-200', i < count ? 'w-3' : 'w-1.5 bg-white/20')}
          style={i < count ? { background: 'rgb(var(--success))', boxShadow: '0 0 8px rgb(var(--success) / .8)' } : undefined}
        />
      ))}
    </div>
  );
}

export function BackspaceKey({ onClick, hidden }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Delete digit"
      className={cn('flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/[.08] hover:text-white', PRESS, hidden && 'pointer-events-none opacity-0')}
    >
      <Backspace size={22} />
    </button>
  );
}

/** A sheet that slides up inside the phone (transfer, add call, tones). */
export function PhoneSheet({ title, onClose, children }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-night/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="animate-rise rounded-t-[26px] border-t border-white/10 px-5 pb-6 pt-4"
        style={{ background: 'linear-gradient(180deg, rgb(var(--navy) / .96), rgb(var(--night)))' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div className="mb-3 flex items-center">
          <h3 className="text-[15px] font-semibold text-white">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className={cn('ml-auto flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:text-white', GLASS, GLASS_HOVER, PRESS)}>
            <X size={14} weight="bold" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

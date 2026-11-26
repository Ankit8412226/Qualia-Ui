import { useEffect, useState } from 'react';
import { Check, GenderFemale, GenderMale, Play, Stop } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Badge, Waveform } from '@/design-system';
import { ref } from '@/services/agentflow';

/** Fake preview: toggles a 3.5 s "playing" state. Swap for an <audio> URL once the API gives samples. */
export function usePreview() {
  const [playing, setPlaying] = useState(null);
  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => setPlaying(null), 3500);
    return () => clearTimeout(t);
  }, [playing]);
  return [playing, (id) => setPlaying((p) => (p === id ? null : id))];
}

export function PlayButton({ playing, onClick, size = 'md', className }) {
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={playing ? 'Stop preview' : 'Play preview'}
      className={cn('flex shrink-0 items-center justify-center rounded-full transition', dims, playing ? 'bg-brand text-brand-ink shadow-glow' : 'bg-brand/10 text-brand hover:bg-brand/15', className)}
    >
      {playing ? <Stop size={size === 'sm' ? 13 : 15} weight="fill" /> : <Play size={size === 'sm' ? 13 : 15} weight="fill" />}
    </button>
  );
}

/**
 * Voice tile. `selected` + `onSelect` turn it into a picker option; without them it is a catalogue card.
 * voice = { id, name, gender, languages[], accent, style, engines[], popular, sample }
 */
export function VoiceCard({ voice, selected, onSelect, playing, onPlay, footer, compact, className }) {
  const GenderIcon = voice.gender === 'Female' ? GenderFemale : GenderMale;
  const Tag = onSelect ? 'button' : 'div';
  return (
    <Tag
      type={onSelect ? 'button' : undefined}
      onClick={onSelect ? () => onSelect(voice) : undefined}
      className={cn(
        'group relative flex flex-col gap-3 rounded-2xl border bg-surface p-4 text-left transition',
        selected ? 'border-brand ring-4 ring-brand/10' : 'border-line hover:border-line-strong hover:shadow-card',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <PlayButton playing={playing} onClick={onPlay} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-bold text-ink">{voice.name}</span>
            <GenderIcon size={14} className="shrink-0 text-ink-faint" aria-label={voice.gender} />
            {voice.popular && !compact && (
              <Badge tone="brand" size="xs">
                Popular
              </Badge>
            )}
          </div>
          <div className="truncate text-xs text-ink-muted">
            {voice.accent} · {voice.style}
          </div>
        </div>
        {selected && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink">
            <Check size={12} weight="bold" />
          </span>
        )}
      </div>
      {playing ? (
        <div className="flex h-[22px] items-center gap-2 text-xs text-brand">
          <Waveform bars={7} />
          <span className="truncate italic text-ink-2">“{voice.sample}”</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {voice.languages.map((l) => (
            <Badge key={l} size="xs">
              {l}
            </Badge>
          ))}
        </div>
      )}
      {!compact && (
        <div className="flex flex-wrap items-center gap-1 border-t border-line pt-3">
          {voice.engines.map((e) => (
            <Badge key={e} tone="info" size="xs">
              {ref.engineLabel[e]}
            </Badge>
          ))}
          {footer && <div className="ml-auto">{footer}</div>}
        </div>
      )}
    </Tag>
  );
}

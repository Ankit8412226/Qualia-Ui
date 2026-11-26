import { Fragment } from 'react';
import { DownloadSimple, FilePdf, MapPin, NotePencil, Robot, Notepad, ArrowsClockwise } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtDate, fmtTime } from '@/lib/format';
import { Ticks, WaText } from '../wa';
import { MediaHeader, TemplateMessage } from '../PhonePreview';

const dayKey = (d) => new Date(d).toDateString();
function dayLabel(d) {
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (dayKey(d) === today.toDateString()) return 'Today';
  if (dayKey(d) === y.toDateString()) return 'Yesterday';
  return fmtDate(d);
}

/** Message thread grouped by day. Bubbles use product tokens, not WhatsApp's palette. */
export function MessageList({ messages, onRetry }) {
  let lastDay = null;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5">
      {messages.map((m, i) => {
        const k = dayKey(m.at);
        const showDay = k !== lastDay;
        lastDay = k;
        const prev = messages[i - 1];
        const grouped = prev && !showDay && prev.dir === m.dir && prev.type !== 'system' && prev.type !== 'note' && (prev.author || '') === (m.author || '');
        return (
          <Fragment key={m.id}>
            {showDay && (
              <div className="my-3 flex justify-center">
                <span className="rounded-full border border-line bg-surface px-3 py-1 text-2xs font-semibold text-ink-muted shadow-card">{dayLabel(m.at)}</span>
              </div>
            )}
            <Message m={m} grouped={grouped} onRetry={onRetry} />
          </Fragment>
        );
      })}
    </div>
  );
}

function Meta({ m, out }) {
  return (
    <span className={cn('mt-1 flex items-center gap-1 text-[10px] text-ink-faint', out ? 'justify-end' : 'justify-start')}>
      {out && m.author && (
        <span className="inline-flex items-center gap-1 font-medium text-ink-muted">
          {m.bot && <Robot size={11} weight="fill" className="text-brand" />}
          {m.author}
          <span aria-hidden>·</span>
        </span>
      )}
      {fmtTime(m.at)}
      {out && <Ticks status={m.status} />}
    </span>
  );
}

function Message({ m, grouped, onRetry }) {
  if (m.type === 'system')
    return (
      <div className="my-1.5 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1 text-2xs font-medium text-ink-muted">
          {m.text.startsWith('AI bot') ? <Robot size={12} weight="duotone" /> : <ArrowsClockwise size={12} />}
          {m.text} · {fmtTime(m.at)}
        </span>
      </div>
    );

  if (m.type === 'note')
    return (
      <div className="my-1 flex justify-end">
        <div className="w-full max-w-[min(440px,85%)] rounded-2xl border border-dashed border-warning/40 bg-warning/10 px-3.5 py-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-warning">
            <NotePencil size={12} weight="bold" /> Internal note · only your team sees this
          </div>
          <div className="text-[13px] leading-relaxed text-ink">{m.text}</div>
          <div className="mt-1 text-right text-[10px] text-ink-faint">
            {m.author} · {fmtTime(m.at)}
          </div>
        </div>
      </div>
    );

  const out = m.dir === 'out';
  const bubble = cn(
    'max-w-[min(440px,82%)] rounded-2xl text-[13.5px] leading-relaxed shadow-card',
    out ? 'border border-brand/20 bg-brand/10 text-ink' : 'border border-line bg-surface text-ink',
    out ? (grouped ? 'rounded-tr-md' : 'rounded-br-md') : grouped ? 'rounded-tl-md' : 'rounded-bl-md',
  );

  let body;
  if (m.type === 'template')
    body = (
      <div className="w-[300px] max-w-full">
        <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold text-brand">
          <Notepad size={12} weight="bold" /> Template · <span className="truncate font-mono font-medium">{m.template.name}</span>
        </div>
        <div className="rounded-2xl border border-dashed border-brand/30 bg-brand/5 p-1.5">
          <TemplateMessage template={m.template} values={m.template.filled} time={fmtTime(m.at)} />
        </div>
      </div>
    );
  else if (m.type === 'image')
    body = (
      <div className={cn(bubble, 'w-[260px] p-1.5')}>
        <MediaHeader type="image" name={m.media.name} />
        {m.media.caption && <div className="px-1.5 pt-1.5">{m.media.caption}</div>}
      </div>
    );
  else if (m.type === 'document')
    body = (
      <div className={cn(bubble, 'w-[280px] p-1.5')}>
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
          <span className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <FilePdf size={20} weight="duotone" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{m.media.name}</span>
            <span className="block text-2xs text-ink-muted">
              PDF · {m.media.size}
              {m.media.pages ? ` · ${m.media.pages} pages` : ''}
            </span>
          </span>
          <button className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label="Download">
            <DownloadSimple size={16} />
          </button>
        </div>
      </div>
    );
  else if (m.type === 'location')
    body = (
      <div className={cn(bubble, 'w-[260px] p-1.5')}>
        <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-xl bg-surface-3" style={{ backgroundImage: 'linear-gradient(rgb(var(--line)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--line)) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
          <MapPin size={28} weight="fill" className="text-danger" />
        </div>
        <div className="px-1.5 pt-1.5 text-[13px] font-semibold">{m.media.name}</div>
        <div className="px-1.5 text-2xs text-ink-muted">{m.media.address}</div>
      </div>
    );
  else
    body = (
      <div className={cn(bubble, 'px-3.5 py-2')}>
        <WaText text={m.text} highlightVars={false} />
      </div>
    );

  return (
    <div className={cn('flex flex-col', out ? 'items-end' : 'items-start', !grouped && 'mt-1.5')}>
      {body}
      <Meta m={m} out={out} />
      {m.status === 'failed' && (
        <button onClick={() => onRetry?.(m)} className="text-2xs font-semibold text-danger hover:underline">
          Not delivered · Retry
        </button>
      )}
    </div>
  );
}

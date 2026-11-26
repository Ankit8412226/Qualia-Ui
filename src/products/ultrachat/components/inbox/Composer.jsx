import { useEffect, useMemo, useRef, useState } from 'react';
import { File, Image as ImageIcon, Images, Lightning, LockSimple, NotePencil, Paperclip, PaperPlaneRight, Smiley, Sparkle, X, Notepad } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Button, Field, Input, Kbd, Menu, Popover, Segmented, Select, Tooltip } from '@/design-system';
import { extractVars } from '../wa';
import { TemplateMessage } from '../PhonePreview';

const EMOJI = ['🙏', '😊', '👍', '🎉', '🏡', '🔑', '📍', '📄', '✅', '⏰', '💰', '🪔', '😀', '😅', '🤝', '👋', '❤️', '🔥', '⭐', '📞', '🗓️', '🚗', '🙌', '👌'];

/**
 * Reply box. Modes: reply / internal note. Typing "/" opens quick replies.
 * When the 24-hour window is closed, replies must be an approved template.
 */
export function Composer({ windowOpen, quickReplies = [], suggestion, templates = [], contactName, onSend, onSendTemplate }) {
  const [mode, setMode] = useState('reply');
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [qrIndex, setQrIndex] = useState(0);
  const [suggestionUsed, setSuggestionUsed] = useState(false);
  const ta = useRef(null);
  const fileRef = useRef(null);
  const note = mode === 'note';

  const slash = text.startsWith('/') && !text.includes(' ') ? text.slice(1).toLowerCase() : null;
  const qrMatches = useMemo(() => (slash == null ? [] : quickReplies.filter((q) => q.shortcut.includes(slash) || q.title.toLowerCase().includes(slash))), [slash, quickReplies]);
  useEffect(() => {
    setQrIndex(0);
  }, [slash]);

  const insert = (s) => {
    setText(s);
    requestAnimationFrame(() => ta.current?.focus());
  };

  const send = () => {
    if (!text.trim() && !attachment) return;
    onSend({ text: text.trim(), note, attachment });
    setText('');
    setAttachment(null);
  };

  const onKeyDown = (e) => {
    if (qrMatches.length) {
      if (e.key === 'ArrowDown') return e.preventDefault(), setQrIndex((i) => (i + 1) % qrMatches.length);
      if (e.key === 'ArrowUp') return e.preventDefault(), setQrIndex((i) => (i - 1 + qrMatches.length) % qrMatches.length);
      if (e.key === 'Enter' || e.key === 'Tab') return e.preventDefault(), insert(qrMatches[qrIndex].text);
      if (e.key === 'Escape') return setText('');
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!windowOpen && !note) return <TemplateComposer templates={templates} contactName={contactName} onSend={onSendTemplate} onNote={() => setMode('note')} />;

  return (
    <div className={cn('border-t px-4 pb-4 pt-3 transition-colors', note ? 'border-warning/40 bg-warning/5' : 'border-line bg-surface')}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'reply', label: 'Reply' },
              { value: 'note', label: 'Internal note', icon: NotePencil },
            ]}
          />
          {!note && suggestion && !suggestionUsed && (
            <button
              type="button"
              onClick={() => {
                insert(suggestion);
                setSuggestionUsed(true);
              }}
              className="group inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-brand/30 bg-brand/5 py-1 pl-2 pr-3 text-xs text-ink-2 transition hover:border-brand/60 hover:bg-brand/10"
              title={suggestion}
            >
              <Sparkle size={13} weight="fill" className="shrink-0 text-brand" />
              <span className="shrink-0 font-semibold text-brand">Suggested</span>
              <span className="truncate">{suggestion}</span>
            </button>
          )}
          {!windowOpen && note && <span className="text-xs text-ink-muted">Window closed: only notes or templates can be sent.</span>}
        </div>

        <div className={cn('relative rounded-2xl border bg-surface transition focus-within:ring-4', note ? 'border-warning/40 focus-within:ring-warning/15' : 'border-line focus-within:border-brand/50 focus-within:ring-brand/10')}>
          {qrMatches.length > 0 && (
            <div className="absolute bottom-full left-0 z-20 mb-2 w-full max-w-md animate-rise rounded-2xl border border-line bg-surface p-1.5 shadow-pop" role="listbox">
              <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-1 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                <Lightning size={12} weight="fill" /> Quick replies
              </div>
              {qrMatches.map((q, i) => (
                <button
                  key={q.id}
                  role="option"
                  aria-selected={i === qrIndex}
                  onMouseEnter={() => setQrIndex(i)}
                  onClick={() => insert(q.text)}
                  className={cn('flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left', i === qrIndex ? 'bg-surface-3' : '')}
                >
                  <span className="mt-0.5 shrink-0 rounded-md bg-brand/10 px-1.5 py-px font-mono text-2xs font-semibold text-brand">/{q.shortcut}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">{q.title}</span>
                    <span className="block truncate text-xs text-ink-muted">{q.text}</span>
                  </span>
                </button>
              ))}
              <div className="flex gap-3 border-t border-line px-2.5 pt-1.5 text-2xs text-ink-faint">
                <span>
                  <Kbd>↑</Kbd> <Kbd>↓</Kbd> move
                </span>
                <span>
                  <Kbd>Enter</Kbd> insert
                </span>
                <span>
                  <Kbd>Esc</Kbd> close
                </span>
              </div>
            </div>
          )}

          {attachment && (
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-surface-3 px-2 py-1 text-xs font-medium text-ink-2">
                {attachment.kind === 'image' ? <ImageIcon size={14} /> : <File size={14} />}
                {attachment.name}
                <button onClick={() => setAttachment(null)} aria-label="Remove attachment" className="text-ink-faint hover:text-ink">
                  <X size={12} weight="bold" />
                </button>
              </span>
            </div>
          )}

          <textarea
            ref={ta}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={note ? 'Write a note for your team (customer won’t see this)…' : 'Type a reply, or “/” for quick replies'}
            className="block max-h-40 min-h-[52px] w-full resize-none bg-transparent px-3.5 pt-3 text-sm text-ink outline-none placeholder:text-ink-faint"
          />

          <div className="flex items-center gap-1 px-2 pb-2">
            <Popover
              width={248}
              align="start"
              trigger={({ toggle }) => (
                <Tooltip content="Emoji">
                  <button onClick={toggle} type="button" aria-label="Emoji" className="rounded-lg p-2 text-ink-muted hover:bg-surface-3 hover:text-ink">
                    <Smiley size={18} />
                  </button>
                </Tooltip>
              )}
            >
              {({ close }) => (
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJI.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        setText((t) => t + e);
                        close();
                        ta.current?.focus();
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-base hover:bg-surface-3"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </Popover>
            {!note && (
              <Menu
                align="start"
                trigger={({ toggle }) => (
                  <Tooltip content="Attach">
                    <button onClick={toggle} type="button" aria-label="Attach" className="rounded-lg p-2 text-ink-muted hover:bg-surface-3 hover:text-ink">
                      <Paperclip size={18} />
                    </button>
                  </Tooltip>
                )}
                items={[
                  { label: 'Photo or video', icon: ImageIcon, onClick: () => fileRef.current?.click() },
                  { label: 'Document', icon: File, description: 'PDF, up to 100 MB', onClick: () => fileRef.current?.click() },
                  { label: 'From media library', icon: Images, onClick: () => setAttachment({ kind: 'document', name: 'Parko-Heights-Brochure.pdf' }) },
                ]}
              />
            )}
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAttachment({ kind: f.type.startsWith('image') ? 'image' : 'document', name: f.name });
                e.target.value = '';
              }}
            />
            {!note && (
              <Tooltip content="Quick replies ( / )">
                <button type="button" onClick={() => insert('/')} aria-label="Quick replies" className="rounded-lg p-2 text-ink-muted hover:bg-surface-3 hover:text-ink">
                  <Lightning size={18} />
                </button>
              </Tooltip>
            )}
            <span className="ml-auto hidden text-2xs text-ink-faint sm:inline">
              <Kbd>Enter</Kbd> to send · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> new line
            </span>
            <Button size="sm" variant={note ? 'secondary' : 'brand'} iconRight={note ? NotePencil : PaperPlaneRight} onClick={send} disabled={!text.trim() && !attachment} className="ml-2">
              {note ? 'Add note' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shown when the 24-hour window is closed: pick an approved template and fill its variables. */
function TemplateComposer({ templates, contactName, onSend, onNote }) {
  const approved = templates.filter((t) => t.status === 'Approved' && t.category !== 'Authentication');
  const [id, setId] = useState('');
  const t = approved.find((x) => x.id === id);
  const vars = t ? extractVars(t.body) : [];
  const [values, setValues] = useState([]);
  useEffect(() => {
    if (t) setValues(t.samples.map((s, i) => (i === 0 ? contactName?.split(' ')[0] || s : s)));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="border-t border-line bg-surface px-4 pb-4 pt-3">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-danger/25 bg-danger/5 px-3.5 py-2.5">
          <LockSimple size={18} weight="duotone" className="shrink-0 text-danger" />
          <div className="min-w-0 flex-1 text-[13px]">
            <span className="font-semibold text-ink">24-hour window closed.</span> <span className="text-ink-2">WhatsApp only allows an approved template until the customer replies.</span>
          </div>
          <Button size="xs" variant="ghost" icon={NotePencil} onClick={onNote}>
            Add internal note
          </Button>
        </div>
        <div className="grid gap-4 2xl:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-3">
            <Field label="Template">
              <Select value={id} onChange={(e) => setId(e.target.value)} placeholder="Choose an approved template" options={approved.map((x) => ({ value: x.id, label: `${x.name} · ${x.category}` }))} />
            </Field>
            {vars.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {vars.map((n) => (
                  <Field key={n} label={`Variable {{${n}}}`}>
                    <Input size="sm" value={values[n - 1] || ''} onChange={(e) => setValues((v) => Object.assign([...v], { [n - 1]: e.target.value }))} />
                  </Field>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-ink-muted">{t ? `Charged as ${t.category} · ₹${t.category === 'Marketing' ? '0.88' : '0.14'}` : 'Pick a template to preview it.'}</span>
              <Button variant="brand" size="sm" icon={Notepad} disabled={!t || vars.some((n) => !values[n - 1])} onClick={() => onSend({ template: t, values })}>
                Send template
              </Button>
            </div>
          </div>
          {t ? (
            <div className="max-h-56 overflow-y-auto rounded-2xl bg-surface-2 p-3 2xl:max-h-none">
              <TemplateMessage template={t} values={values} compact />
            </div>
          ) : (
            <div className="hidden min-h-[120px] items-center justify-center rounded-2xl bg-surface-2 text-xs text-ink-faint 2xl:flex">Preview</div>
          )}
        </div>
      </div>
    </div>
  );
}

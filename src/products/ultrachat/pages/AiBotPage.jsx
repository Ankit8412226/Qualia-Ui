import { useEffect, useRef, useState } from 'react';
import { ArrowClockwise, Books, CheckCircle, CircleNotch, FileText, Globe, Headset, Link as LinkIcon, PaperPlaneRight, Plus, Robot, Sparkle, Trash, UserList, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtNumber, fmtPercent, fmtRelative } from '@/lib/format';
import { Badge, Button, Card, CardHeader, Checkbox, Field, FileDrop, IconButton, Input, MetricStrip, Segmented, Select, Skeleton, StatusBadge, Switch, TagInput, Textarea, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader, useUnsavedChanges } from '@/shared/layout';
import { askBot, getBot } from '@/services/ultrachat';
import { PreviewBubble } from '../components/PhonePreview';

const HANDOVER = ['Customer asks for a human', 'Price negotiation or discount', 'Complaint or angry tone', 'Bot is unsure twice in a row', 'Booking or payment question'];

export default function AiBotPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading } = useQuery(() => getBot(), []);
  const [bot, setBot] = useState(null);
  const [url, setUrl] = useState('');
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty, { message: 'Your changes to the AI bot will be lost.' });

  useEffect(() => {
    if (data) setBot(structuredClone(data));
  }, [data]);

  const set = (patch) => {
    setBot((b) => ({ ...b, ...patch }));
    setDirty(true);
  };
  const setB = (patch) => set({ behaviour: { ...bot.behaviour, ...patch } });

  const addSource = (src) => {
    const s = { id: `ks_${Date.now()}`, status: 'Processing', chunks: 0, updatedAt: new Date(), ...src };
    set({ sources: [s, ...bot.sources] });
    setTimeout(() => setBot((b) => ({ ...b, sources: b.sources.map((x) => (x.id === s.id ? { ...x, status: 'Ready', chunks: 48 } : x)) })), 2500);
  };

  if (loading || !bot)
    return (
      <Page>
        <Skeleton className="mb-6 h-12 w-1/3" />
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Skeleton className="h-[600px] rounded-2xl" />
          <Skeleton className="h-[600px] rounded-2xl" />
        </div>
      </Page>
    );

  return (
    <Page>
      <PageHeader
        title="AI bot"
        description="Answers customers from your documents after flows, and hands over to an agent when it should."
        meta={
          <Badge tone={bot.enabled ? 'success' : 'neutral'} dot pulse={bot.enabled}>
            {bot.enabled ? 'Answering customers' : 'Off'}
          </Badge>
        }
        actions={
          <>
            <Switch checked={bot.enabled} onChange={(enabled) => set({ enabled })} />
            <Button
              variant="brand"
              disabled={!dirty}
              onClick={() => {
                setDirty(false);
                toast({ title: 'AI bot updated', description: 'New conversations use these settings.' });
              }}
            >
              Save changes
            </Button>
          </>
        }
      />

      <MetricStrip
        className="mb-6"
        items={[
          { label: 'Questions answered (30 d)', value: fmtNumber(bot.stats.answered) },
          { label: 'Resolved without an agent', value: fmtPercent(bot.stats.resolved) },
          { label: 'Handed over', value: fmtPercent(bot.stats.handedOver) },
          { label: 'Leads captured', value: fmtNumber(bot.stats.leads) },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* knowledge */}
          <Card>
            <CardHeader title="Knowledge sources" subtitle="The bot only answers from these. Keep prices and offers current." icon={Books} />
            <div className="grid gap-3 md:grid-cols-2">
              <FileDrop compact multiple accept=".pdf,.docx,.xlsx,.csv,.txt" title="Upload documents" hint="PDF, Word, Excel, up to 25 MB each" onFiles={(files) => files.forEach((f) => addSource({ kind: 'file', name: f.name, size: `${Math.max(1, Math.round(f.size / 1024))} KB` }))} />
              <form
                className="flex flex-col justify-center gap-2 rounded-2xl border-2 border-dashed border-line p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!/^https?:\/\//.test(url)) return toast({ tone: 'error', title: 'Enter a full URL starting with https://' });
                  addSource({ kind: 'url', name: url });
                  setUrl('');
                }}
              >
                <span className="text-sm font-semibold text-ink">Add a web page</span>
                <span className="text-xs text-ink-muted">We read the page and pages it links to on the same site.</span>
                <div className="flex gap-2">
                  <Input size="sm" icon={Globe} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://rrparko.in/faq" className="flex-1" />
                  <Button size="sm" type="submit" icon={Plus}>
                    Add
                  </Button>
                </div>
              </form>
            </div>
            <ul className="mt-4 divide-y divide-line/70">
              {bot.sources.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', s.kind === 'url' ? 'bg-info/10 text-info' : 'bg-surface-3 text-ink-2')}>{s.kind === 'url' ? <LinkIcon size={17} /> : <FileText size={17} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {s.status === 'Failed' ? <span className="text-danger">{s.error}</span> : s.status === 'Processing' ? 'Reading and indexing…' : `${fmtNumber(s.chunks)} passages · updated ${fmtRelative(s.updatedAt)}`}
                      {s.size && ` · ${s.size}`}
                    </span>
                  </span>
                  {s.status === 'Processing' ? (
                    <Badge tone="warning" icon={CircleNotch}>
                      Processing
                    </Badge>
                  ) : (
                    <StatusBadge status={s.status} />
                  )}
                  {s.status === 'Failed' && <IconButton size="sm" icon={ArrowClockwise} label="Retry" onClick={() => setBot((b) => ({ ...b, sources: b.sources.map((x) => (x.id === s.id ? { ...x, status: 'Processing' } : x)) }))} />}
                  <IconButton
                    size="sm"
                    icon={Trash}
                    label="Remove"
                    onClick={async () => {
                      if (await confirm({ title: 'Remove this source?', message: `The bot will stop using “${s.name}”.`, tone: 'danger', confirmLabel: 'Remove' })) set({ sources: bot.sources.filter((x) => x.id !== s.id) });
                    }}
                  />
                </li>
              ))}
            </ul>
          </Card>

          {/* lead fields */}
          <Card>
            <CardHeader title="Lead details to collect" subtitle="The bot asks for these naturally during the chat and saves them to the contact and Zoho CRM." icon={UserList} />
            <ul className="flex flex-col gap-2">
              {bot.leadFields.map((f, i) => (
                <li key={f.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-line px-3 py-2">
                  <Input size="sm" value={f.label} onChange={(e) => set({ leadFields: bot.leadFields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                  <Checkbox checked={f.required} onChange={(required) => set({ leadFields: bot.leadFields.map((x, j) => (j === i ? { ...x, required } : x)) })} label="Required" />
                  <IconButton size="sm" icon={Trash} label="Remove field" onClick={() => set({ leadFields: bot.leadFields.filter((_, j) => j !== i) })} />
                </li>
              ))}
            </ul>
            <Button size="sm" variant="ghost" icon={Plus} className="mt-3" onClick={() => set({ leadFields: [...bot.leadFields, { id: `lf_${Date.now()}`, label: 'New field', key: 'field', required: false }] })}>
              Add field
            </Button>
          </Card>

          {/* behaviour */}
          <Card>
            <CardHeader title="Behaviour" subtitle="How the bot talks and when it steps aside." icon={Sparkle} />
            <div className="flex flex-col gap-5">
              <Field label="Tone">
                <Segmented value={bot.behaviour.tone} onChange={(tone) => setB({ tone })} options={['Friendly', 'Professional', 'Concise']} />
              </Field>
              <Field label="Languages" hint="It replies in the customer’s language when it’s on this list.">
                <TagInput value={bot.behaviour.languages} onChange={(languages) => setB({ languages })} />
              </Field>
              <Field label="Greeting">
                <Textarea rows={2} value={bot.behaviour.greeting} onChange={(e) => setB({ greeting: e.target.value })} />
              </Field>
              <div>
                <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink-2">
                  <Headset size={16} className="text-brand" /> Hand over to an agent when
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {HANDOVER.map((h) => (
                    <Checkbox key={h} checked={bot.behaviour.handover.includes(h)} onChange={(on) => setB({ handover: on ? [...bot.behaviour.handover, h] : bot.behaviour.handover.filter((x) => x !== h) })} label={h} />
                  ))}
                </div>
              </div>
              <Field label="Active hours" hint="Outside these hours the bot still answers but tells people an agent replies next morning.">
                <Select value={bot.behaviour.hours} onChange={(e) => setB({ hours: e.target.value })} options={['24x7', 'Business hours (9 AM – 7 PM)', 'Outside business hours only']} className="sm:w-80" />
              </Field>
            </div>
          </Card>
        </div>

        <TestChat greeting={bot.behaviour.greeting} name={bot.name} />
      </div>
    </Page>
  );
}

function TestChat({ greeting, name }) {
  const [msgs, setMsgs] = useState([{ from: 'business', text: greeting }]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [msgs, busy]);

  const send = async (text) => {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...m, { from: 'customer', text }]);
    setQ('');
    setBusy(true);
    const r = await askBot(text);
    setMsgs((m) => [...m, { from: 'business', ...r }]);
    setBusy(false);
  };

  return (
    <Card padded={false} className="flex h-[640px] flex-col overflow-hidden lg:sticky lg:top-6">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-ink">
          <Robot size={18} weight="fill" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Test {name}</span>
          <span className="block text-xs text-ink-muted">Uses your unsaved settings. Nothing is sent.</span>
        </span>
        <IconButton size="sm" icon={ArrowClockwise} label="Restart" onClick={() => setMsgs([{ from: 'business', text: greeting }])} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-2 p-4" style={{ backgroundImage: 'radial-gradient(rgb(var(--line)) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
        {msgs.map((m, i) => (
          <div key={i}>
            <PreviewBubble from={m.from}>{m.text}</PreviewBubble>
            {m.sources?.length > 0 && (
              <div className="-mt-1 mb-3 flex flex-wrap gap-1 pl-1">
                {m.sources.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-2xs text-ink-muted shadow-card">
                    <CheckCircle size={10} weight="fill" className="text-success" /> {s}
                  </span>
                ))}
              </div>
            )}
            {m.handover && (
              <div className="mb-3 text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-2xs font-medium text-warning">
                  <WarningCircle size={11} weight="fill" /> Would hand over to an agent here
                </span>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="mb-2 inline-flex gap-1 rounded-2xl bg-surface px-3 py-2.5 shadow-card">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink-faint" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="border-t border-line p-3">
        <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
          {['2BHK ka price kya hai?', 'Home loan EMI?', 'Clubhouse hai?', 'Talk to a human'].map((s) => (
            <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-brand/50 hover:text-brand">
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(q);
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask like a customer would…" className="flex-1" />
          <Button type="submit" variant="brand" iconOnly icon={PaperPlaneRight} aria-label="Send" disabled={!q.trim() || busy} />
        </form>
      </div>
    </Card>
  );
}

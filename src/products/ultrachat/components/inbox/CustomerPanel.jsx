import { useState } from 'react';
import { EnvelopeSimple, MapPin, Megaphone, Phone, Plus, Receipt, Robot, Timer, X } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtCurrency, fmtDate, fmtPhone, fmtRelative } from '@/lib/format';
import { Avatar, Badge, Button, IconButton, Progress, Skeleton, StatusBadge, Textarea } from '@/design-system';
import { fmtWait } from './ConversationList';

function Section({ title, action, children }) {
  return (
    <section className="border-b border-line px-5 py-4 last:border-0">
      <div className="mb-2.5 flex items-center justify-between">
        <h4 className="text-2xs font-semibold uppercase tracking-[.08em] text-ink-faint">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Right-hand customer context: who they are, consent, what they bought, what we sent them. */
export function CustomerPanel({ conv, profile, loading, onClose, userName }) {
  const [notes, setNotes] = useState(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const allNotes = notes ?? profile?.notes ?? [];

  if (loading || !profile)
    return (
      <div className="flex flex-col gap-4 p-5">
        <Skeleton className="mx-auto h-16 w-16 rounded-full" />
        <Skeleton className="h-4 w-2/3 self-center" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );

  const waiting = conv.status !== 'Resolved' && conv.waitingMin > 0;
  const slaPct = Math.min(100, (conv.waitingMin / 15) * 100);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="text-sm font-bold">Customer</span>
        <IconButton icon={X} label="Close panel" size="sm" onClick={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-5 pb-4 pt-5 text-center">
          <Avatar name={profile.name} size="xl" />
          <div className="mt-3 text-base font-bold">{profile.name}</div>
          <div className="text-xs text-ink-muted">Customer since {fmtDate(profile.firstSeen)}</div>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <StatusBadge status={conv.optIn} />
            <Badge tone="neutral">{profile.language}</Badge>
          </div>
        </div>

        <Section title="SLA">
          {waiting ? (
            <div className={cn('rounded-xl p-3', conv.waitingMin > 60 ? 'bg-danger/5' : conv.waitingMin > 15 ? 'bg-warning/5' : 'bg-success/5')}>
              <div className="flex items-center gap-2 text-[13px]">
                <Timer size={16} weight="duotone" className={conv.waitingMin > 60 ? 'text-danger' : conv.waitingMin > 15 ? 'text-warning' : 'text-success'} />
                <span className="font-semibold text-ink">Waiting {fmtWait(conv.waitingMin)}</span>
                <span className="ml-auto text-xs text-ink-muted">Target 15m</span>
              </div>
              <Progress value={slaPct} size="sm" tone={conv.waitingMin > 60 ? 'danger' : conv.waitingMin > 15 ? 'warning' : 'success'} className="mt-2" />
            </div>
          ) : (
            <div className="text-[13px] text-ink-muted">Nothing pending. Last reply {fmtRelative(conv.last.at)}.</div>
          )}
        </Section>

        <Section title="Contact">
          <ul className="flex flex-col gap-2 text-[13px] text-ink-2">
            <li className="flex items-center gap-2">
              <Phone size={15} className="text-ink-faint" />
              {fmtPhone(profile.phone)}
            </li>
            <li className="flex items-center gap-2">
              <EnvelopeSimple size={15} className="text-ink-faint" />
              <span className="truncate">{profile.email}</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={15} className="text-ink-faint" />
              {profile.city}
            </li>
          </ul>
          <div className="mt-3 text-xs text-ink-muted">
            Opted in {fmtDate(profile.optInAt)} via {conv.source}
          </div>
        </Section>

        <Section title="Captured by AI bot" action={<Robot size={14} weight="duotone" className="text-brand" />}>
          <dl className="grid grid-cols-2 gap-2">
            {profile.leadFields.map((f) => (
              <div key={f.label} className="rounded-xl bg-surface-2 px-3 py-2">
                <dt className="text-2xs text-ink-muted">{f.label}</dt>
                <dd className="text-[13px] font-semibold text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {profile.tags.map((t) => (
              <Badge key={t} tone="neutral">
                {t}
              </Badge>
            ))}
          </div>
        </Section>

        <Section
          title="Notes"
          action={
            !adding && (
              <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                <Plus size={12} weight="bold" /> Add
              </button>
            )
          }
        >
          {adding && (
            <div className="mb-3 flex flex-col gap-2">
              <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Visible to your team only" autoFocus />
              <div className="flex justify-end gap-2">
                <Button size="xs" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button
                  size="xs"
                  variant="brand"
                  disabled={!draft.trim()}
                  onClick={() => {
                    setNotes([{ by: userName, at: new Date(), text: draft.trim() }, ...allNotes]);
                    setDraft('');
                    setAdding(false);
                  }}
                >
                  Save note
                </Button>
              </div>
            </div>
          )}
          <ul className="flex flex-col gap-2">
            {allNotes.map((n, i) => (
              <li key={i} className="rounded-xl border border-warning/25 bg-warning/5 px-3 py-2 text-[13px] text-ink-2">
                {n.text}
                <div className="mt-1 text-2xs text-ink-faint">
                  {n.by} · {fmtRelative(n.at)}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Orders & payments">
          {profile.orders.length ? (
            <ul className="flex flex-col gap-2">
              {profile.orders.map((o) => (
                <li key={o.id} className="flex items-start gap-2.5">
                  <Receipt size={16} className="mt-0.5 text-ink-faint" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{o.item}</span>
                    <span className="block text-2xs text-ink-muted">
                      {o.id} · {fmtDate(o.at)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[13px] font-semibold tabular">{fmtCurrency(o.amount)}</span>
                    <StatusBadge status={o.status} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[13px] text-ink-muted">No bookings yet.</div>
          )}
        </Section>

        <Section title="Campaigns received">
          <ul className="flex flex-col gap-2">
            {profile.campaigns.map((c) => (
              <li key={c.name} className="flex items-center gap-2.5 text-[13px]">
                <Megaphone size={15} className="text-ink-faint" />
                <span className="min-w-0 flex-1 truncate text-ink-2">{c.name}</span>
                <span className="text-2xs text-ink-faint">{fmtDate(c.at)}</span>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

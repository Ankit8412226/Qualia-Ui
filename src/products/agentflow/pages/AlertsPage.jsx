import { useEffect, useState } from 'react';
import { At, CheckCircle, EnvelopeSimple, PaperPlaneTilt, PencilSimple, Plus, Trash, WarningCircle, X } from '@phosphor-icons/react';
import { fmtNumber } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Badge, Button, Card, CardHeader, Checkbox, Drawer, EmptyState, Field, IconButton, Input, Modal, Select, Skeleton, Switch, TagInput, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader, SectionTitle } from '@/shared/layout';
import { getAlerts, listCampaigns, listDispositions } from '@/services/agentflow';
import { ChipToggleGroup } from '../components/FormBits';

const SAMPLE = {
  name: 'Priya Iyer',
  phone: '+91 98230 11245',
  campaign: 'Wakad 2BHK leads',
  disposition: 'Site visit booked',
  summary: 'Priya is looking for a 2BHK in Wakad with a budget near ₹85 L. Asked about parking and clubhouse. Site visit booked for Saturday 11 AM.',
  fields: [
    ['Interested in site visit', 'Yes'],
    ['Budget', '₹60–90 L'],
    ['Preferred location', 'Wakad'],
    ['Visit date', 'Sat, 30 Nov'],
  ],
};

export default function AlertsPage() {
  const { data, loading } = useQuery(getAlerts, []);
  const { data: dispos } = useQuery(listDispositions, []);
  const { data: campaigns } = useQuery(listCampaigns, []);
  const [rules, setRules] = useState([]);
  const [senders, setSenders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [addingSender, setAddingSender] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    if (data) {
      setRules(data.rules);
      setSenders(data.senders);
    }
  }, [data]);

  const save = (r) => {
    setRules((all) => (all.some((x) => x.id === r.id) ? all.map((x) => (x.id === r.id ? r : x)) : [...all, r]));
    setEditing(null);
    toast({ title: 'Alert saved', tone: 'success' });
  };
  const senderOf = (id) => senders.find((s) => s.id === id);

  return (
    <Page>
      <PageHeader
        title="Email alerts"
        description="Email your team the moment a call ends with an outcome that matters."
        actions={
          <Button variant="brand" icon={Plus} onClick={() => setEditing({ id: `r${Date.now()}`, name: '', active: true, sender: senders.find((s) => s.default)?.id, recipients: [], dispositions: [], fieldRules: [], campaigns: 'all', includeTranscript: true, includeRecording: false, sentThisWeek: 0 })}>
            New alert
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionTitle title="Alert rules" description="Each rule sends one email per matching call." />
          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : rules.length ? (
            <div className="flex flex-col gap-3">
              {rules.map((r) => (
                <Card key={r.id} className="p-5">
                  <div className="flex items-start gap-4">
                    <Switch checked={r.active} onChange={(v) => setRules((all) => all.map((x) => (x.id === r.id ? { ...x, active: v } : x)))} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-bold">{r.name}</h3>
                        {!r.active && <Badge>Off</Badge>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                        When outcome is
                        {r.dispositions.map((d) => (
                          <Badge key={d} tone="brand" size="xs">
                            {d}
                          </Badge>
                        ))}
                        {r.fieldRules.map((f) => (
                          <Badge key={f.field} tone="info" size="xs">
                            {f.field} {f.equals.startsWith('>') ? f.equals : `= ${f.equals}`}
                          </Badge>
                        ))}
                        {r.campaigns !== 'all' && <span>· in {r.campaigns}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                        <At size={13} />
                        {r.recipients.join(', ')}
                        <span className="text-ink-faint">· from {senderOf(r.sender)?.email}</span>
                      </div>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <div className="font-display text-lg font-bold tabular">{fmtNumber(r.sentThisWeek)}</div>
                      <div className="text-2xs text-ink-muted">sent this week</div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconButton icon={PencilSimple} label="Edit" size="sm" onClick={() => setEditing(r)} />
                      <IconButton
                        icon={Trash}
                        label="Delete"
                        size="sm"
                        onClick={async () => {
                          if (await confirm({ title: `Delete “${r.name}”?`, message: 'No more emails will be sent for this rule.', tone: 'danger', confirmLabel: 'Delete' })) {
                            setRules((all) => all.filter((x) => x.id !== r.id));
                            toast({ title: 'Alert deleted' });
                          }
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState icon={EnvelopeSimple} title="No alerts yet" description="Create one to email your sales team every hot lead." />
            </Card>
          )}
        </section>

        <section>
          <SectionTitle
            title="Sender accounts"
            description="Emails go out from these addresses."
            actions={
              <Button size="sm" variant="soft" icon={Plus} onClick={() => setAddingSender(true)}>
                Add
              </Button>
            }
          />
          <Card padded={false}>
            {loading ? (
              <Skeleton className="m-5 h-24" />
            ) : (
              <ul className="divide-y divide-line/70">
                {senders.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className={s.verified ? 'text-success' : 'text-warning'}>{s.verified ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.email}</span>
                      <span className="block text-xs text-ink-muted">
                        {s.provider}
                        {s.default && ' · default'}
                        {!s.verified && ' · not verified'}
                      </span>
                    </span>
                    {!s.verified && (
                      <Button size="xs" onClick={() => toast({ title: 'Verification email sent', description: `Check the inbox of ${s.email}.` })}>
                        Resend
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <RuleDrawer
        key={editing?.id || 'none'}
        rule={editing}
        senders={senders}
        dispositions={(dispos || []).filter((d) => d.active).map((d) => d.name)}
        campaigns={campaigns || []}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <Modal
        open={addingSender}
        onClose={() => setAddingSender(false)}
        title="Add a sender"
        description="We send a verification link to this address."
        icon={EnvelopeSimple}
        size="sm"
        footer={
          <>
            <Button onClick={() => setAddingSender(false)}>Cancel</Button>
            <Button
              variant="brand"
              disabled={!/^\S+@\S+\.\S+$/.test(senderEmail)}
              onClick={() => {
                setSenders((all) => [...all, { id: `s${Date.now()}`, email: senderEmail, provider: 'SMTP', verified: false, default: false }]);
                setSenderEmail('');
                setAddingSender(false);
                toast({ title: 'Verification email sent', tone: 'success' });
              }}
            >
              Send verification
            </Button>
          </>
        }
      >
        <Field label="Email address">
          <Input type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="alerts@yourcompany.in" autoFocus />
        </Field>
      </Modal>
    </Page>
  );
}

function RuleDrawer({ rule, senders, dispositions, campaigns, onClose, onSave }) {
  const [r, setR] = useState(rule);
  if (!rule || !r) return null;
  const up = (patch) => setR((x) => ({ ...x, ...patch }));
  const sender = senders.find((s) => s.id === r.sender);
  const ok = r.name.trim() && r.recipients.length && r.dispositions.length;
  return (
    <Drawer
      open
      onClose={onClose}
      width={980}
      title={rule.name ? 'Edit alert' : 'New alert'}
      subtitle="Preview updates as you edit."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!ok} onClick={() => onSave(r)}>
            Save alert
          </Button>
        </>
      }
    >
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Field label="Rule name" required>
            <Input value={r.name} onChange={(e) => up({ name: e.target.value })} placeholder="e.g. Hot lead to sales team" />
          </Field>
          <Field label="Send when the outcome is" required>
            <ChipToggleGroup size="sm" options={dispositions} value={r.dispositions} onChange={(d) => up({ dispositions: d })} />
          </Field>
          <Field label="And these answers match" optional>
            <div className="flex flex-col gap-2">
              {r.fieldRules.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input size="sm" value={f.field} onChange={(e) => up({ fieldRules: r.fieldRules.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)) })} placeholder="Field" />
                  <span className="text-xs text-ink-muted">is</span>
                  <Input size="sm" value={f.equals} onChange={(e) => up({ fieldRules: r.fieldRules.map((x, j) => (j === i ? { ...x, equals: e.target.value } : x)) })} placeholder="Yes" className="w-32" />
                  <IconButton icon={X} label="Remove condition" size="sm" onClick={() => up({ fieldRules: r.fieldRules.filter((_, j) => j !== i) })} />
                </div>
              ))}
              <Button size="sm" variant="ghost" icon={Plus} className="self-start" onClick={() => up({ fieldRules: [...r.fieldRules, { field: '', equals: '' }] })}>
                Add condition
              </Button>
            </div>
          </Field>
          <Field label="Campaigns">
            <Select value={r.campaigns} onChange={(e) => up({ campaigns: e.target.value })} options={[{ value: 'all', label: 'All campaigns and inbound' }, ...campaigns.map((c) => ({ value: c.name, label: c.name }))]} />
          </Field>
          <Field label="Send to" required hint="Press Enter after each address.">
            <TagInput value={r.recipients} onChange={(v) => up({ recipients: v })} placeholder="sales@yourcompany.in" />
          </Field>
          <Field label="Send from">
            <Select value={r.sender} onChange={(e) => up({ sender: e.target.value })} options={senders.map((s) => ({ value: s.id, label: `${s.email}${s.verified ? '' : ' (not verified)'}` }))} />
          </Field>
          <div className="flex flex-col gap-2.5">
            <Checkbox checked={r.includeTranscript} onChange={(v) => up({ includeTranscript: v })} label="Include transcript" />
            <Checkbox checked={r.includeRecording} onChange={(v) => up({ includeRecording: v })} label="Include recording link" />
          </div>
        </div>

        <div className="lg:sticky lg:top-0 lg:self-start">
          <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-faint">Email preview</div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="flex flex-col gap-1 border-b border-line bg-surface-2 px-4 py-3 text-xs">
              <div>
                <span className="text-ink-muted">From:</span> {sender?.email || '—'}
              </div>
              <div className="truncate">
                <span className="text-ink-muted">To:</span> {r.recipients.join(', ') || '—'}
              </div>
              <div className="text-sm font-semibold text-ink">
                {r.dispositions[0] ? `${r.dispositions.includes(SAMPLE.disposition) ? SAMPLE.disposition : r.dispositions[0]}: ${SAMPLE.name}` : 'Choose an outcome'} · {SAMPLE.campaign}
              </div>
            </div>
            <div className="flex flex-col gap-4 p-5 text-[13px] text-ink-2">
              <p>
                Agent Flow finished a call with <b className="text-ink">{SAMPLE.name}</b> ({SAMPLE.phone}).
              </p>
              <div className="rounded-xl bg-brand/5 p-3 leading-relaxed">{SAMPLE.summary}</div>
              <table className="w-full text-left text-xs">
                <tbody>
                  {SAMPLE.fields.map(([k, v]) => (
                    <tr key={k} className="border-b border-line/70 last:border-0">
                      <td className="py-1.5 text-ink-muted">{k}</td>
                      <td className="py-1.5 font-medium text-ink">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {r.includeTranscript && <p className="text-xs text-ink-muted">Transcript attached (11 lines).</p>}
              {r.includeRecording && (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink">
                  <PaperPlaneTilt size={12} weight="fill" /> Listen to recording
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

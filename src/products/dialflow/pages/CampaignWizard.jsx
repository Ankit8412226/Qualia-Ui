import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Hand, Lightning, Megaphone, PhoneIncoming, PhoneOutgoing, Rocket, Shuffle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Badge, Button, Callout, Card, Checkbox, Field, Input, RadioCards, Skeleton, Stepper, Switch, Textarea, useToast } from '@/design-system';
import { BackLink, Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';

const STEPS = [
  { id: 'basics', label: 'Basics', description: 'Name and type' },
  { id: 'dial', label: 'Dial method', description: 'How leads are dialled' },
  { id: 'lists', label: 'Contact lists', description: 'Who gets called' },
  { id: 'group', label: 'Agent group', description: 'Who takes the calls' },
  { id: 'disp', label: 'Dispositions', description: 'Call outcomes' },
  { id: 'hours', label: 'Hours & lines', description: 'When and from which number' },
  { id: 'review', label: 'Review', description: 'Check and launch' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CampaignWizard() {
  const { data, loading } = useQuery(() => df.getWizardOptions(), []);
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: '', description: '', type: 'Outbound', dialMethod: 'Progressive', ratio: 2, lists: [], group: '', dispositions: null, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], from: '10:00', to: '19:00', dids: [], rotate: true, wrap: 30, retries: 2 });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const dispIds = f.dispositions ?? data?.dispositions.filter((d) => d.active).map((d) => d.id) ?? [];

  const valid = [f.name.trim().length > 2, true, f.type === 'Inbound' || f.lists.length > 0, !!f.group, dispIds.length > 0, f.days.length > 0 && f.dids.length > 0, true];
  const records = (data?.lists || []).filter((l) => f.lists.includes(l.id)).reduce((a, l) => a + l.dialable, 0);

  const launch = (draft) => {
    toast({ title: draft ? 'Saved as draft' : `${f.name} is live`, description: draft ? 'Finish it any time from Campaigns.' : `${fmtNumber(records)} leads queued for ${f.group}.` });
    navigate('/dialflow/campaigns');
  };

  return (
    <Page className="max-w-[1180px]">
      <BackLink to="/dialflow/campaigns">Campaigns</BackLink>
      <PageHeader className="mt-3" title="New campaign" description="Seven short steps. You can go back to any finished step." />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="h-max p-2">
          <Stepper orientation="vertical" steps={STEPS} current={step} onStepClick={setStep} />
        </Card>
        <Card className="flex min-h-[460px] flex-col">
          {loading || !data ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="flex-1 animate-rise" key={step}>
              <h2 className="text-lg font-bold">{STEPS[step].label}</h2>
              <p className="mb-5 text-sm text-ink-muted">{STEPS[step].description}</p>

              {step === 0 && (
                <div className="flex max-w-xl flex-col gap-4">
                  <Field label="Campaign name" required hint="Agents see this in their workspace.">
                    <Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Wakad 2BHK – December" />
                  </Field>
                  <Field label="Description" optional>
                    <Textarea rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What is this campaign for?" />
                  </Field>
                  <Field label="Type">
                    <RadioCards
                      value={f.type}
                      onChange={(v) => set('type', v)}
                      options={[
                        { value: 'Outbound', label: 'Outbound', description: 'We call leads from a list', icon: PhoneOutgoing },
                        { value: 'Inbound', label: 'Inbound', description: 'Customers call our lines', icon: PhoneIncoming },
                      ]}
                    />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-5">
                  <RadioCards
                    cols={3}
                    value={f.dialMethod}
                    onChange={(v) => set('dialMethod', v)}
                    options={[
                      { value: 'Manual', label: 'Manual', description: 'Agent picks the lead and clicks to dial. Best for high-value callbacks.', icon: Hand },
                      { value: 'Progressive', label: 'Progressive', description: 'Dials one lead the moment an agent is ready. No dropped calls.', icon: ArrowRight },
                      { value: 'Power', label: 'Power', description: 'Dials several leads per free agent. Most talk time, some abandoned calls.', icon: Lightning },
                    ]}
                  />
                  {f.dialMethod === 'Power' && (
                    <Card className="bg-surface-2">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold">Dial ratio</span>
                        <span className="font-display text-xl font-bold tabular text-brand">{f.ratio}:1</span>
                      </div>
                      <input type="range" min={1} max={5} step={0.5} value={f.ratio} onChange={(e) => set('ratio', +e.target.value)} className="w-full accent-[rgb(var(--brand))]" aria-label="Dial ratio" />
                      <div className="mt-1 flex justify-between text-2xs text-ink-faint">
                        <span>1:1 safe</span>
                        <span>5:1 aggressive</span>
                      </div>
                      {f.ratio > 3 && (
                        <Callout tone="warning" className="mt-3">
                          Above 3:1, more customers answer and hear silence. TRAI limits abandoned calls to 3%.
                        </Callout>
                      )}
                    </Card>
                  )}
                  <div className="grid max-w-xl gap-4 sm:grid-cols-2">
                    <Field label="Wrap-up time" hint="Time to save notes after a call.">
                      <Input type="number" value={f.wrap} onChange={(e) => set('wrap', +e.target.value)} suffix="sec" />
                    </Field>
                    <Field label="Retries for no answer">
                      <Input type="number" value={f.retries} onChange={(e) => set('retries', +e.target.value)} suffix="times" />
                    </Field>
                  </div>
                </div>
              )}

              {step === 2 &&
                (f.type === 'Inbound' ? (
                  <Callout>Inbound campaigns take calls from your lines, so no list is needed. Continue.</Callout>
                ) : (
                  <div className="flex flex-col gap-2">
                    {data.lists.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggle('lists', l.id)}
                        className={cn('flex items-center gap-3 rounded-xl border p-3.5 text-left transition', f.lists.includes(l.id) ? 'border-brand bg-brand/5' : 'border-line hover:border-line-strong')}
                      >
                        <span className="pointer-events-none flex">
                          <Checkbox checked={f.lists.includes(l.id)} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{l.name}</div>
                          <div className="text-xs text-ink-muted">{l.source} · used by {l.campaigns.length || 'no'} campaign{l.campaigns.length === 1 ? '' : 's'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold tabular">{fmtNumber(l.dialable)}</div>
                          <div className="text-2xs text-ink-muted">dialable of {fmtNumber(l.records)}</div>
                        </div>
                      </button>
                    ))}
                    <p className="mt-2 text-xs text-ink-muted">Need a new list? Upload it in Contact lists, then come back. Numbers on Do Not Call are skipped automatically.</p>
                  </div>
                ))}

              {step === 3 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {data.groups.map((g) => (
                    <button key={g.id} type="button" onClick={() => set('group', g.name)} className={cn('flex flex-col gap-2 rounded-xl border p-4 text-left transition', f.group === g.name ? 'border-brand bg-brand/5 ring-4 ring-brand/10' : 'border-line hover:border-line-strong')}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{g.name}</span>
                        {f.group === g.name && <Check size={16} weight="bold" className="text-brand" />}
                      </div>
                      <span className="text-xs text-ink-muted">{g.description}</span>
                      <span className="text-xs text-ink-2">
                        {g.agents.length} agents · {g.dids.length} lines
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col gap-2">
                  <p className="mb-1 text-xs text-ink-muted">Agents only see the outcomes you tick. Edit the master list in Settings → Dispositions.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.dispositions.map((d) => (
                      <div key={d.id} className="rounded-xl border border-line p-3">
                        <Checkbox
                          checked={dispIds.includes(d.id)}
                          onChange={() => set('dispositions', dispIds.includes(d.id) ? dispIds.filter((x) => x !== d.id) : [...dispIds, d.id])}
                          label={d.name}
                          description={`${d.category}${d.callback ? ' · asks for callback' : ''}${d.sub.length ? ` · ${d.sub.length} reasons` : ''}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="flex flex-col gap-5">
                  <Field label="Calling days">
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS.map((d) => (
                        <button key={d} type="button" onClick={() => toggle('days', d)} className={cn('h-9 w-12 rounded-lg border text-sm font-medium', f.days.includes(d) ? 'border-brand bg-brand text-brand-ink' : 'border-line text-ink-2 hover:border-line-strong')}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <div className="grid max-w-md grid-cols-2 gap-3">
                    <Field label="From">
                      <Input type="time" value={f.from} onChange={(e) => set('from', e.target.value)} />
                    </Field>
                    <Field label="To">
                      <Input type="time" value={f.to} onChange={(e) => set('to', e.target.value)} />
                    </Field>
                  </div>
                  <Callout tone="info">TRAI allows promotional calls only between 9 AM and 9 PM. We block calls outside it.</Callout>
                  <Field label="Caller ID lines (DIDs)" required hint="Calls go out from these numbers.">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {data.dids.map((d) => (
                        <button key={d.id} type="button" onClick={() => toggle('dids', d.number)} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left', f.dids.includes(d.number) ? 'border-brand bg-brand/5' : 'border-line hover:border-line-strong')}>
                          <span className="pointer-events-none flex">
                            <Checkbox checked={f.dids.includes(d.number)} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-sm">{d.number}</span>
                            <span className="block text-xs text-ink-muted">{d.group}</span>
                          </span>
                          <Badge tone={d.verdict === 'Healthy' ? 'success' : 'danger'} size="xs">
                            {d.verdict}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Switch checked={f.rotate} onChange={(v) => set('rotate', v)} label="Rotate lines" description="Spread calls across lines so no number gets flagged as spam." />
                </div>
              )}

              {step === 6 && (
                <div className="flex flex-col gap-4">
                  {[
                    ['Basics', `${f.name || '—'} · ${f.type}`, 0],
                    ['Dial method', `${f.dialMethod}${f.dialMethod === 'Power' ? ` · ${f.ratio}:1` : ''} · wrap-up ${f.wrap}s · ${f.retries} retries`, 1],
                    ['Contact lists', f.type === 'Inbound' ? 'Not needed (inbound)' : `${f.lists.length} lists · ${fmtNumber(records)} dialable leads`, 2],
                    ['Agent group', f.group || '—', 3],
                    ['Dispositions', `${dispIds.length} outcomes`, 4],
                    ['Hours & lines', `${f.days.join(', ')} · ${f.from}–${f.to} · ${f.dids.length} lines${f.rotate ? ', rotating' : ''}`, 5],
                  ].map(([l, v, i]) => (
                    <div key={l} className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0">
                      <div>
                        <div className="text-xs text-ink-muted">{l}</div>
                        <div className="mt-0.5 text-sm font-medium">{v}</div>
                      </div>
                      <Button size="xs" variant="ghost" onClick={() => setStep(i)}>
                        Edit
                      </Button>
                    </div>
                  ))}
                  {valid.slice(0, 6).every(Boolean) ? (
                    <Callout tone="success" title="Ready to launch">Agents in {f.group} will see it in their workspace right away.</Callout>
                  ) : (
                    <Callout tone="warning" title="Some steps need attention">Go back to the steps without a tick.</Callout>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center gap-2 border-t border-line pt-4">
            <Button variant="ghost" icon={ArrowLeft} disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Button variant="ghost" className="ml-auto" onClick={() => launch(true)} disabled={!f.name}>
              Save draft
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="brand" iconRight={ArrowRight} disabled={!valid[step]} onClick={() => setStep(step + 1)}>
                Continue
              </Button>
            ) : (
              <Button variant="brand" icon={Rocket} disabled={!valid.slice(0, 6).every(Boolean)} onClick={() => launch(false)}>
                Launch campaign
              </Button>
            )}
          </div>
        </Card>
      </div>
    </Page>
  );
}

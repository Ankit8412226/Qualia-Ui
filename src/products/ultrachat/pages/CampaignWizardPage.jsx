import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarBlank, CheckCircle, FileCsv, Lightning, MagnifyingGlass, Moon, PencilSimple, RocketLaunch, UserCheck, UsersThree, Wallet, Clock, Gauge as GaugeIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/format';
import { Badge, Button, Callout, Card, CardHeader, Checkbox, Field, FileDrop, FilterSelect, Input, RadioCards, SearchInput, Segmented, Select, Skeleton, Stepper, Switch, Textarea, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader, useUnsavedChanges } from '@/shared/layout';
import { getWallet, listRecentAudienceSources, listTemplates } from '@/services/ultrachat';
import { CategoryBadge, extractVars, RATE } from '../components/wa';
import { PhoneFrame, TemplateMessage } from '../components/PhonePreview';

const STEPS = [
  { id: 'details', label: 'Details', description: 'Name and sending number' },
  { id: 'template', label: 'Template', description: 'Message and variables' },
  { id: 'audience', label: 'Audience', description: 'Who gets it' },
  { id: 'schedule', label: 'Schedule', description: 'When and how fast' },
  { id: 'review', label: 'Review', description: 'Cost and launch' },
];

const CSV_COLUMNS = ['name', 'phone', 'city', 'project', 'visit_date', 'agent'];
const CSV_SAMPLE = [
  { name: 'Priya Sharma', phone: '98201 44120', city: 'Pune', project: 'Parko Heights', visit_date: '30 Nov', agent: 'Sneha' },
  { name: 'Rohan Gupta', phone: '99230 18842', city: 'Mumbai', project: 'Parko Greens', visit_date: '1 Dec', agent: 'Karan' },
  { name: 'Ananya Iyer', phone: '97300 55219', city: 'Pune', project: 'Parko Vista', visit_date: '30 Nov', agent: 'Divya' },
];

const DEMO = {
  name: 'Christmas weekend offer',
  number: '+91 20 4890 1200',
  goal: 'Site visits',
  templateId: 'tp_diwali',
  mapping: { 1: { kind: 'column', value: 'name' }, 2: { kind: 'static', value: '25 Dec' } },
  audienceType: 'csv',
  csv: { name: 'wakad-leads-dec.csv', rows: 5240 },
};

const INITIAL = { name: '', number: '+91 20 4890 1200', goal: 'Site visits', notes: '', templateId: null, mapping: {}, audienceType: 'segment', csv: null, segmentId: 'seg_wakad', groupIds: [], schedule: 'now', date: '2026-11-29', time: '10:00', tz: 'Asia/Kolkata', throttle: '1000', quietHours: true };

export default function CampaignWizardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const location = useLocation();
  const [params] = useSearchParams();
  const startStep = Math.min(4, Number(params.get('step')) || 0);
  const [step, setStep] = useState(startStep);
  const [f, setF] = useState(() => ({ ...INITIAL, ...(startStep > 0 ? DEMO : {}), ...(location.state?.templateId ? { templateId: location.state.templateId } : {}) }));
  const [edited, setEdited] = useState(false);
  const leave = useUnsavedChanges(edited, { title: 'Leave this campaign?', message: 'Nothing has been sent. Your setup for this campaign will be lost.' });
  const set = (patch) => {
    setF((x) => ({ ...x, ...patch }));
    setEdited(true);
  };

  const templatesQ = useQuery(() => listTemplates(), []);
  const sourcesQ = useQuery(() => listRecentAudienceSources(), []);
  const walletQ = useQuery(() => getWallet(), []);
  const approved = (templatesQ.data || []).filter((t) => t.status === 'Approved' && t.category !== 'Authentication');
  const template = approved.find((t) => t.id === f.templateId);
  const vars = template ? extractVars(template.body) : [];

  const audience = useMemo(() => {
    const src = sourcesQ.data;
    if (!src) return null;
    if (f.audienceType === 'csv') {
      if (!f.csv) return null;
      return { label: f.csv.name, total: f.csv.rows, dupes: 186, notOpted: 412, invalid: 58 };
    }
    if (f.audienceType === 'segment') {
      const s = src.segments.find((x) => x.id === f.segmentId);
      if (!s) return null;
      return { label: s.name, total: s.count, dupes: 0, notOpted: 0, invalid: Math.round(s.count * 0.004) };
    }
    const gs = src.groups.filter((g) => f.groupIds.includes(g.id));
    if (!gs.length) return null;
    const total = gs.reduce((a, g) => a + g.members, 0);
    return { label: gs.map((g) => g.name).join(', '), total, dupes: Math.round(total * 0.06), notOpted: Math.round(total * 0.08), invalid: 0 };
  }, [f.audienceType, f.csv, f.segmentId, f.groupIds, sourcesQ.data]);

  const final = audience ? audience.total - audience.dupes - audience.notOpted - audience.invalid : 0;
  const rate = template ? RATE[template.category] : 0;
  const cost = final * rate;
  const balance = walletQ.data?.balance ?? 0;
  const enough = balance >= cost;

  const sampleRow = CSV_SAMPLE[0];
  const previewValues = vars.map((n) => {
    const m = f.mapping[n];
    if (!m || !m.value) return template?.samples[n - 1];
    return m.kind === 'column' ? sampleRow[m.value] ?? `[${m.value}]` : m.value;
  });
  // The first name column shows just the first name, like most teams expect.
  if (vars[0] && f.mapping[vars[0]]?.value === 'name') previewValues[0] = sampleRow.name.split(' ')[0];

  const valid = [
    f.name.trim().length > 2,
    !!template && vars.every((n) => f.mapping[n]?.value),
    final > 0,
    f.schedule === 'now' || (f.date && f.time),
    enough,
  ];
  const hints = ['Give the campaign a name (3+ characters).', template ? 'Map every variable to a column or a fixed value.' : 'Pick a template.', 'Choose who should get this campaign.', 'Pick a date and time.', 'Top up your wallet to launch.'];

  const launch = async () => {
    const ok = await confirm({
      title: f.schedule === 'now' ? `Send to ${fmtNumber(final)} people now?` : `Schedule for ${f.date} at ${f.time}?`,
      message: `${fmtCurrency(cost, 2)} will be held from your wallet and charged as messages are delivered. Failed messages are refunded.`,
      confirmLabel: f.schedule === 'now' ? 'Launch campaign' : 'Schedule campaign',
    });
    if (!ok) return;
    toast({ title: f.schedule === 'now' ? 'Campaign launched' : 'Campaign scheduled', description: `${f.name} · ${fmtNumber(final)} recipients` });
    leave.allow();
    navigate(f.schedule === 'now' ? '/ultrachat/campaigns/cp_102' : '/ultrachat/campaigns/cp_103');
  };

  return (
    <Page className="pb-0 lg:pb-0">
      <PageHeader breadcrumbs={[{ label: 'Campaigns', to: '/ultrachat/campaigns' }, { label: 'New campaign' }]} title={f.name || 'New campaign'} description="Five short steps. Nothing is sent until you press Launch." />

      <Card className="mb-6 py-4">
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          {step === 0 && <DetailsStep f={f} set={set} />}
          {step === 1 && <TemplateStep f={f} set={set} templates={approved} loading={templatesQ.loading} template={template} vars={vars} />}
          {step === 2 && <AudienceStep f={f} set={set} sources={sourcesQ.data} audience={audience} final={final} rate={rate} template={template} />}
          {step === 3 && <ScheduleStep f={f} set={set} final={final} template={template} />}
          {step === 4 && <ReviewStep f={f} template={template} audience={audience} final={final} cost={cost} rate={rate} balance={balance} enough={enough} goTo={setStep} loading={walletQ.loading} />}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <PhoneFrame height={430} subtitle="Preview · first recipient">
            {template ? <TemplateMessage template={template} values={previewValues} /> : <div className="mt-16 text-center text-xs text-ink-faint">Pick a template to preview it here.</div>}
          </PhoneFrame>
          <Card className="p-4">
            <dl className="flex flex-col gap-2.5 text-[13px]">
              <SummaryRow label="Template" value={template ? <span className="font-mono text-xs">{template.name}</span> : '—'} />
              <SummaryRow label="Recipients" value={final ? fmtNumber(final) : '—'} />
              <SummaryRow label="Rate" value={template ? `₹${rate} · ${template.category}` : '—'} />
              <div className="my-1 h-px bg-line" />
              <SummaryRow label="Estimated cost" value={<b className="text-[15px] text-ink">{fmtCurrency(cost, 2)}</b>} />
              <SummaryRow label="Wallet balance" value={<span className={enough ? 'text-success' : 'text-danger'}>{fmtCurrency(balance)}</span>} />
            </dl>
          </Card>
        </aside>
      </div>

      {/* sticky footer */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-line bg-surface/90 backdrop-blur-md sm:-mx-6 lg:-mx-8">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => (step ? setStep(step - 1) : navigate('/ultrachat/campaigns'))}>
            {step ? 'Back' : 'Cancel'}
          </Button>
          <span className="hidden text-xs text-ink-muted sm:block">
            Step {step + 1} of {STEPS.length}
          </span>
          {!valid[step] && <span className="ml-auto hidden text-xs text-warning md:block">{hints[step]}</span>}
          <div className={cn('flex items-center gap-2', valid[step] && 'ml-auto')}>
            {step < 4 ? (
              <Button variant="brand" iconRight={ArrowRight} disabled={!valid[step]} disabledReason={hints[step]} onClick={() => setStep(step + 1)}>
                Next: {STEPS[step + 1].label}
              </Button>
            ) : (
              <Button variant="brand" icon={RocketLaunch} disabled={!valid.every(Boolean)} disabledReason={hints[valid.findIndex((v) => !v)]} onClick={launch}>
                {f.schedule === 'now' ? 'Launch campaign' : 'Schedule campaign'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-ink-2">{value}</dd>
    </div>
  );
}

/* ---------- steps ---------- */

function DetailsStep({ f, set }) {
  return (
    <Card>
      <CardHeader title="Campaign details" subtitle="Only your team sees these." />
      <div className="flex flex-col gap-4">
        <Field label="Campaign name" required>
          <Input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Christmas weekend offer" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Send from" hint="Replies land in this number’s inbox.">
            <Select value={f.number} onChange={(e) => set({ number: e.target.value })} options={[{ value: '+91 20 4890 1200', label: '+91 20 4890 1200 · RR Parko (Tier 3)' }, { value: '+91 98220 41100', label: '+91 98220 41100 · RR Parko Sales (Tier 2)' }]} />
          </Field>
          <Field label="Goal" hint="Used to measure success on the report.">
            <Select value={f.goal} onChange={(e) => set({ goal: e.target.value })} options={['Site visits', 'Replies', 'Link clicks', 'Payments', 'Awareness']} />
          </Field>
        </div>
        <Field label="Notes" optional>
          <Textarea rows={3} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything your team should know" />
        </Field>
      </div>
    </Card>
  );
}

function TemplateStep({ f, set, templates, loading, template, vars }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState([]);
  const shown = templates.filter((t) => (!cat.length || cat.includes(t.category)) && (!q || `${t.name} ${t.body}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Choose a template" subtitle="Only approved templates can be sent." actions={<Link to="/ultrachat/templates/new" className="text-xs font-semibold text-brand hover:underline">New template</Link>} />
        <div className="mb-4 flex flex-wrap gap-2">
          <SearchInput size="sm" value={q} onChange={setQ} placeholder="Search templates" className="w-full sm:w-60" />
          <FilterSelect label="Category" options={['Marketing', 'Utility']} value={cat} onChange={setCat} />
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((t) => {
              const on = t.id === f.templateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set({ templateId: t.id, mapping: {} })}
                  className={cn('flex flex-col gap-2 rounded-xl border p-3 text-left transition', on ? 'border-brand bg-brand/5 ring-4 ring-brand/10' : 'border-line hover:border-line-strong hover:bg-surface-2')}
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-ink">{t.name}</span>
                    {on && <CheckCircle size={16} weight="fill" className="shrink-0 text-brand" />}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CategoryBadge category={t.category} size="xs" />
                    <span className="text-2xs text-ink-muted">
                      {t.language} · {fmtPercent(t.readRate)} read
                    </span>
                  </span>
                  <span className="line-clamp-3 text-xs leading-relaxed text-ink-muted">{t.body}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {template && vars.length > 0 && (
        <Card>
          <CardHeader title="Fill the variables" subtitle="Map each variable to a column in your audience file, or type a value that’s the same for everyone." />
          <div className="flex flex-col gap-3">
            {vars.map((n) => {
              const m = f.mapping[n] || { kind: 'column', value: '' };
              const setM = (patch) => set({ mapping: { ...f.mapping, [n]: { ...m, ...patch } } });
              return (
                <div key={n} className="grid items-center gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-[70px_170px_1fr]">
                  <span className="font-mono text-sm font-semibold text-brand">{`{{${n}}}`}</span>
                  <Segmented size="sm" value={m.kind} onChange={(kind) => setM({ kind, value: '' })} options={[{ value: 'column', label: 'Column' }, { value: 'static', label: 'Fixed' }]} />
                  {m.kind === 'column' ? (
                    <Select size="sm" value={m.value} onChange={(e) => setM({ value: e.target.value })} placeholder="Choose a column" options={CSV_COLUMNS.filter((c) => c !== 'phone')} />
                  ) : (
                    <Input size="sm" value={m.value} onChange={(e) => setM({ value: e.target.value })} placeholder={`e.g. ${template.samples[n - 1] || 'value'}`} />
                  )}
                </div>
              );
            })}
            <p className="text-xs text-ink-muted">If a row has an empty value, that person is skipped (WhatsApp rejects empty variables).</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function AudienceStep({ f, set, sources, audience, final, rate, template }) {
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Who should get it?" subtitle="We only send to people who opted in to WhatsApp messages from you." />
        <RadioCards
          cols={3}
          value={f.audienceType}
          onChange={(audienceType) => set({ audienceType })}
          options={[
            { value: 'csv', label: 'Upload CSV', icon: FileCsv, description: 'Phone numbers plus any columns' },
            { value: 'segment', label: 'Opted-in segment', icon: UserCheck, description: 'Saved lists of opted-in contacts' },
            { value: 'groups', label: 'WhatsApp groups', icon: UsersThree, description: 'Members of your groups' },
          ]}
        />
        <div className="mt-5">
          {!sources ? (
            <Skeleton className="h-32" />
          ) : f.audienceType === 'csv' ? (
            f.csv ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
                  <FileCsv size={24} weight="duotone" className="text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{f.csv.name}</span>
                    <span className="block text-xs text-ink-muted">{fmtNumber(f.csv.rows)} rows · {CSV_COLUMNS.length} columns</span>
                  </span>
                  <Button size="xs" variant="ghost" onClick={() => set({ csv: null })}>
                    Replace
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CSV_COLUMNS.map((c) => (
                    <Badge key={c} tone={c === 'phone' ? 'brand' : 'neutral'}>
                      {c}
                      {c === 'phone' && ' · number'}
                    </Badge>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-2 text-ink-muted">
                      <tr>
                        {CSV_COLUMNS.map((c) => (
                          <th key={c} className="px-3 py-2 font-semibold">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CSV_SAMPLE.map((r) => (
                        <tr key={r.phone} className="border-t border-line/70 text-ink-2">
                          {CSV_COLUMNS.map((c) => (
                            <td key={c} className="whitespace-nowrap px-3 py-2">
                              {r[c]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <FileDrop accept=".csv,.xlsx" title="Drop a CSV or Excel file, or browse" hint="Needs a phone column. Up to 1,00,000 rows." onFiles={(files) => files[0] && set({ csv: { name: files[0].name, rows: 5240 } })} />
            )
          ) : f.audienceType === 'segment' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {sources.segments.map((s) => (
                <button key={s.id} type="button" onClick={() => set({ segmentId: s.id })} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition', f.segmentId === s.id ? 'border-brand bg-brand/5' : 'border-line hover:bg-surface-2')}>
                  <UserCheck size={20} weight="duotone" className={f.segmentId === s.id ? 'text-brand' : 'text-ink-muted'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{s.name}</span>
                    <span className="block text-xs text-ink-muted">{fmtNumber(s.count)} contacts</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sources.groups.map((g) => (
                <div key={g.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <Checkbox checked={f.groupIds.includes(g.id)} onChange={(on) => set({ groupIds: on ? [...f.groupIds, g.id] : f.groupIds.filter((x) => x !== g.id) })} label={g.name} description={`${fmtNumber(g.members)} members`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {audience && (
        <Card>
          <CardHeader title="Clean-up" subtitle="We remove people who shouldn’t get this message." />
          <ul className="flex flex-col divide-y divide-line/70 text-sm">
            <CleanRow label="Rows in your audience" value={audience.total} />
            <CleanRow label="Duplicate numbers removed" value={-audience.dupes} />
            <CleanRow label="Not opted in, removed" value={-audience.notOpted} hint="Sending to them risks your quality rating." />
            <CleanRow label="Invalid or landline numbers removed" value={-audience.invalid} />
            <li className="flex items-center justify-between pt-3">
              <span className="font-semibold text-ink">Will receive the message</span>
              <span className="font-display text-xl font-bold tabular text-brand">{fmtNumber(final)}</span>
            </li>
          </ul>
          {template && (
            <div className="mt-4 rounded-xl bg-surface-2 p-3 text-[13px] text-ink-2">
              Estimated cost <b className="text-ink">{fmtCurrency(final * rate, 2)}</b> ({fmtNumber(final)} × ₹{rate} {template.category.toLowerCase()} rate). You’re only charged for delivered messages.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function CleanRow({ label, value, hint }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span>
        <span className="text-ink-2">{label}</span>
        {hint && <span className="block text-xs text-ink-faint">{hint}</span>}
      </span>
      <span className={cn('font-semibold tabular', value < 0 ? 'text-danger' : 'text-ink')}>{value < 0 ? `−${fmtNumber(-value)}` : fmtNumber(value)}</span>
    </li>
  );
}

function ScheduleStep({ f, set, final, template }) {
  const perMin = f.throttle === 'max' ? 4000 : Number(f.throttle);
  const minutes = Math.ceil(final / perMin);
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="When should it go out?" />
        <RadioCards
          value={f.schedule}
          onChange={(schedule) => set({ schedule })}
          options={[
            { value: 'now', label: 'Send now', icon: Lightning, description: 'Starts as soon as you launch' },
            { value: 'later', label: 'Schedule for later', icon: CalendarBlank, description: 'Pick a date, time and time zone' },
          ]}
        />
        {f.schedule === 'later' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label="Time">
              <Input type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} />
            </Field>
            <Field label="Time zone">
              <Select value={f.tz} onChange={(e) => set({ tz: e.target.value })} options={[{ value: 'Asia/Kolkata', label: 'India (IST, UTC+5:30)' }, { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4)' }, { value: 'Europe/London', label: 'London (GMT)' }, { value: 'America/New_York', label: 'New York (EST)' }]} />
            </Field>
          </div>
        )}
      </Card>
      <Card>
        <CardHeader title="Sending speed" subtitle="Slower sends protect your quality rating and give agents time to reply." icon={GaugeIcon} />
        <Segmented
          value={f.throttle}
          onChange={(throttle) => set({ throttle })}
          options={[
            { value: '200', label: '200 / min' },
            { value: '1000', label: '1,000 / min' },
            { value: 'max', label: 'Fastest' },
          ]}
        />
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-muted">
          <Clock size={14} /> About {minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 6) / 10} h`} to reach {fmtNumber(final)} people.
        </p>
        {template?.category === 'Marketing' && (
          <div className="mt-4 border-t border-line pt-4">
            <Switch
              checked={f.quietHours}
              onChange={(quietHours) => set({ quietHours })}
              label={
                <span className="inline-flex items-center gap-2">
                  <Moon size={15} className="text-brand" /> Respect quiet hours
                </span>
              }
              description="Pause marketing messages between 9 PM and 9 AM in the recipient’s time zone."
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function ReviewStep({ f, template, audience, final, cost, rate, balance, enough, goTo, loading }) {
  const items = [
    { step: 0, title: 'Details', lines: [f.name, `From ${f.number} · Goal: ${f.goal}`] },
    { step: 1, title: 'Template', lines: [template?.name, `${template?.category} · ${template?.language}`] },
    { step: 2, title: 'Audience', lines: [audience?.label, `${fmtNumber(final)} recipients after clean-up`] },
    { step: 3, title: 'Schedule', lines: [f.schedule === 'now' ? 'Send immediately' : `${f.date} at ${f.time} (${f.tz})`, `${f.throttle === 'max' ? 'Fastest' : `${fmtNumber(Number(f.throttle))} / min`}${f.quietHours ? ' · quiet hours on' : ''}`] },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <Card key={it.title} className="p-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">{it.title}</span>
              <button onClick={() => goTo(it.step)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                <PencilSimple size={12} /> Edit
              </button>
            </div>
            <div className="truncate text-sm font-semibold text-ink">{it.lines[0] || '—'}</div>
            <div className="truncate text-xs text-ink-muted">{it.lines[1]}</div>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title="Cost" icon={Wallet} />
        {loading ? (
          <Skeleton className="h-20" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-surface-2 p-3">
                <div className="text-xs text-ink-muted">Recipients</div>
                <div className="font-display text-lg font-bold tabular">{fmtNumber(final)}</div>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <div className="text-xs text-ink-muted">Rate</div>
                <div className="font-display text-lg font-bold tabular">₹{rate}</div>
              </div>
              <div className="rounded-xl bg-brand/10 p-3">
                <div className="text-xs text-brand">Total</div>
                <div className="font-display text-lg font-bold tabular text-brand">{fmtCurrency(cost, 2)}</div>
              </div>
            </div>
            <div className="mt-4">
              {enough ? (
                <Callout tone="success" title={`Wallet has ${fmtCurrency(balance)}`}>
                  {fmtCurrency(balance - cost)} will be left after this campaign.
                </Callout>
              ) : (
                <Callout
                  tone="danger"
                  title="Not enough balance"
                  action={
                    <Button as={Link} to="/ultrachat/wallet?topup=1" size="sm" variant="danger">
                      Top up
                    </Button>
                  }
                >
                  You need {fmtCurrency(cost - balance)} more. Top up, or reduce the audience.
                </Callout>
              )}
            </div>
          </>
        )}
      </Card>
      <Callout tone="info" icon={MagnifyingGlass} title="Before you launch">
        Check the preview on the right. Messages can’t be recalled once delivered; you can pause a running campaign at any time.
      </Callout>
    </div>
  );
}

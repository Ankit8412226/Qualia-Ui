import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, DownloadSimple, Funnel as FunnelIcon, Gauge as GaugeIcon, Pause, PencilSimple, Play, Plus, Stop, UploadSimple, UserPlus, Users, PhoneCall, ListChecks, GearSix, MagnifyingGlass } from '@phosphor-icons/react';
import { fmtCurrency, fmtDate, fmtDateTime, fmtDuration, fmtNumber, fmtPercent, fmtPhone, fmtRelative } from '@/lib/format';
import { useFilteredRows, useQuery } from '@/lib/hooks';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ChartCard,
  DataTable,
  EmptyState,
  Field,
  FileDrop,
  FilterBar,
  FilterSelect,
  Funnel,
  Input,
  LiveIndicator,
  MetricStrip,
  Modal,
  Skeleton,
  StackedBar,
  StatusBadge,
  Tabs,
  useConfirm,
  useToast,
} from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer } from '@/shared/patterns';
import { getCampaign, getCampaignCalls, getCampaignContacts, getCampaignResults, ref } from '@/services/agentflow';
import { LegendDot } from '../components/CampaignBits';
import { ChipToggleGroup } from '../components/FormBits';
import { FIELD_ICON } from '../components/FieldBuilder';

export default function CampaignWorkspacePage() {
  const { id } = useParams();
  const { data, loading, setData, error, reload } = useQuery(() => getCampaign(id), [id]);
  const [tab, setTab] = useState('contacts');
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const c = data;

  // Live simulation while running: a few calls finish every few seconds.
  useEffect(() => {
    if (c?.status !== 'Running') return undefined;
    const t = setInterval(() => {
      setData((x) => {
        if (!x || x.pending <= 0) return x;
        const n = Math.min(x.pending, 3);
        const ok = Math.round(n * 0.5);
        const connected = x.connected + ok;
        const dialled = x.dialled + n;
        return { ...x, dialled, connected, picked: x.picked + ok, failed: x.failed + (n - ok), pending: x.pending - n, qualified: x.qualified + (ok && Math.random() > 0.6 ? 1 : 0), connectRate: (connected / dialled) * 100 };
      });
      setUpdatedAt(new Date());
    }, 4000);
    return () => clearInterval(t);
  }, [c?.status, setData]);

  if (loading && !c) return <WorkspaceSkeleton />;
  if (!c)
    return (
      <Page>
        <EmptyState icon={MagnifyingGlass} title="Campaign not found" description="It may have been deleted." action={<Button as={Link} to="/agentflow/campaigns" variant="brand">Back to campaigns</Button>} />
      </Page>
    );

  const act = async (kind) => {
    const copy = {
      start: { title: `Start calling ${fmtNumber(c.pending)} contacts?`, message: `Calls go out ${c.setup.rules.from}–${c.setup.rules.to}, ${c.setup.rules.concurrency} at a time. Estimated ${fmtNumber(Math.round(c.pending * 0.46 * 2.1))} minutes.`, confirmLabel: 'Start campaign', status: 'Running', toast: 'Campaign started' },
      pause: { title: 'Pause this campaign?', message: 'Calls in progress finish normally. No new calls go out until you resume.', confirmLabel: 'Pause', status: 'Paused', toast: 'Campaign paused' },
      resume: { title: 'Resume calling?', message: `${fmtNumber(c.pending)} contacts are still pending.`, confirmLabel: 'Resume', status: 'Running', toast: 'Campaign resumed' },
      abort: { title: 'Abort this campaign?', message: `${fmtNumber(c.pending)} pending contacts will not be called. This cannot be undone; results so far are kept.`, confirmLabel: 'Abort campaign', tone: 'danger', status: 'Completed', toast: 'Campaign aborted' },
    }[kind];
    if (await confirm({ title: copy.title, message: copy.message, confirmLabel: copy.confirmLabel, tone: copy.tone })) {
      setData((x) => ({ ...x, status: copy.status, pending: kind === 'abort' ? 0 : x.pending }));
      toast({ title: copy.toast, tone: kind === 'abort' ? 'warning' : 'success' });
    }
  };

  const running = c.status === 'Running';
  const editable = ['Draft', 'Scheduled', 'Paused'].includes(c.status);
  const pct = c.contacts ? (c.dialled / c.contacts) * 100 : 0;
  const etaHours = running && c.pending ? Math.ceil((c.pending * 1.6) / 60 / c.setup.rules.concurrency) : null;

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Campaigns', to: '/agentflow/campaigns' }, { label: c.name }]}
        title={c.name}
        meta={
          <>
            <StatusBadge status={c.status} />
            {running && <LiveIndicator updatedAt={updatedAt} label="Calling now" />}
            {c.status === 'Scheduled' && <span className="text-xs text-ink-muted">Starts {fmtDateTime(c.scheduledFor)}</span>}
            <span className="text-xs text-ink-muted">
              {c.voice} · {c.language} · created {fmtDate(c.createdAt)} by {c.createdBy}
            </span>
          </>
        }
        actions={
          <>
            {editable && (
              <Button as={Link} to={`/agentflow/campaigns/${c.id}/edit`} variant="ghost" icon={PencilSimple}>
                Edit
              </Button>
            )}
            {c.status === 'Completed' && (
              <Button icon={Copy} onClick={() => toast({ title: 'Saved as a draft copy', tone: 'success' })}>
                Duplicate
              </Button>
            )}
            {['Running', 'Paused'].includes(c.status) && (
              <Button variant="danger-soft" icon={Stop} onClick={() => act('abort')}>
                Abort
              </Button>
            )}
            {running && (
              <Button variant="primary" icon={Pause} onClick={() => act('pause')}>
                Pause
              </Button>
            )}
            {c.status === 'Paused' && (
              <Button variant="brand" icon={Play} onClick={() => act('resume')}>
                Resume
              </Button>
            )}
            {['Draft', 'Scheduled'].includes(c.status) && (
              <Button variant="brand" icon={Play} disabled={!c.contacts} onClick={() => act('start')}>
                Start now
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <MetricStrip
          items={[
            { label: 'Contacts', value: fmtNumber(c.contacts) },
            { label: 'Picked up', value: fmtNumber(c.picked), sub: c.dialled ? `${fmtPercent((c.picked / c.dialled) * 100, 0)} of dialled` : '—' },
            { label: 'Connected', value: fmtNumber(c.connected), sub: c.connectRate != null ? `${fmtPercent(c.connectRate, 0)} connect rate` : '—' },
            { label: 'Failed', value: fmtNumber(c.failed), sub: 'no answer, busy, invalid' },
            { label: 'Pending', value: fmtNumber(c.pending), sub: etaHours ? `~${etaHours} h of calling left` : c.pending ? 'not dialled yet' : 'all done' },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-5">
          <ChartCard
            className="lg:col-span-3"
            title="Conversion funnel"
            subtitle="From contact list to qualified lead"
            icon={FunnelIcon}
            table={{
              columns: [
                { key: 'label', header: 'Stage' },
                { key: 'value', header: 'Contacts', format: fmtNumber },
              ],
              rows: funnel(c),
            }}
          >
            {c.dialled ? <Funnel steps={funnel(c)} /> : <EmptyState compact icon={FunnelIcon} title="No calls yet" description="The funnel fills in once calling starts." />}
          </ChartCard>

          <Card className="flex flex-col lg:col-span-2">
            <CardHeader title="Progress" subtitle={running ? 'Updates every few seconds' : 'Where the list stands'} icon={GaugeIcon} />
            <div className="flex items-end gap-2">
              <span className="font-display text-4xl font-bold tabular">{Math.round(pct)}%</span>
              <span className="mb-1 text-sm text-ink-muted">dialled</span>
            </div>
            <StackedBar
              className="mt-3"
              height="h-3"
              segments={[
                { label: 'Connected', value: c.connected, tone: 'success' },
                { label: 'Failed', value: c.failed, tone: 'danger' },
                { label: 'Pending', value: c.pending, tone: 'bg-surface-3' },
              ]}
            />
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
              <LegendDot className="bg-success" label="Connected" />
              <LegendDot className="bg-danger" label="Failed" />
              <LegendDot className="bg-line-strong" label="Pending" />
            </div>
            <ul className="my-5 flex flex-col gap-2.5 text-[13px]">
              {[
                ['Calling hours', `${c.setup.rules.from}–${c.setup.rules.to} · ${c.setup.rules.days.length === 7 ? 'every day' : `${c.setup.rules.days[0]}–${c.setup.rules.days[c.setup.rules.days.length - 1]}`}`],
                ['Calls at the same time', c.setup.rules.concurrency],
                ['Qualified so far', `${fmtNumber(c.qualified)}${c.connected ? ` · ${fmtPercent((c.qualified / c.connected) * 100, 0)} of connected` : ''}`],
                ['Expected finish', c.status === 'Completed' ? 'Finished' : etaHours ? `in about ${etaHours} h of calling` : c.pending ? 'when started' : 'Finished'],
              ].map(([k, v]) => (
                <li key={k} className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-muted">{k}</span>
                  <span className="truncate text-right font-medium tabular text-ink">{v}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-line pt-4">
              <Mini label="Minutes used" value={fmtNumber(c.minutesUsed)} />
              <Mini label="Cost so far" value={fmtCurrency(c.minutesUsed * ref.costPerMin)} />
              <Mini label="Avg call" value={fmtDuration(c.avgDuration)} />
            </dl>
          </Card>
        </div>

        <div>
          <Tabs
            className="mb-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'contacts', label: 'Contacts', icon: Users, count: fmtNumber(c.contacts) },
              { id: 'calls', label: 'Calls', icon: PhoneCall },
              { id: 'results', label: 'Collected fields', icon: ListChecks },
              { id: 'setup', label: 'Setup', icon: GearSix },
            ]}
          />
          {tab === 'contacts' && <ContactsTab c={c} />}
          {tab === 'calls' && <CallsTab c={c} />}
          {tab === 'results' && <ResultsTab c={c} />}
          {tab === 'setup' && <SetupTab c={c} editable={editable} onEdit={(step) => navigate(`/agentflow/campaigns/${c.id}/edit?step=${step}`)} />}
        </div>
      </div>
    </Page>
  );
}

const funnel = (c) => [
  { label: 'Contacts', value: c.contacts },
  { label: 'Dialled', value: c.dialled },
  { label: 'Connected', value: c.connected },
  { label: 'Qualified', value: c.qualified },
];

function Mini({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-2xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-base font-bold tabular">{value}</dd>
    </div>
  );
}

/* ---------------- Contacts tab ---------------- */

const CONTACT_STATUSES = ['Connected', 'No answer', 'Busy', 'Failed', 'Pending', 'In queue'];

function ContactsTab({ c }) {
  const { data, loading, setData, error, reload } = useQuery(() => getCampaignContacts(c.id), [c.id]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState([]);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const toast = useToast();
  const rows = useFilteredRows(data, { search, fields: ['name', 'phone', 'city'], filters: { status } });
  const canAdd = c.status !== 'Completed';

  return (
    <Card padded={false} className="overflow-hidden">
      <FilterBar
        className="border-b border-line p-4"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, number or city"
        onReset={() => {
          setSearch('');
          setStatus([]);
        }}
        canReset={!!search || status.length > 0}
        actions={
          canAdd && (
            <>
              <Button size="sm" icon={UploadSimple} onClick={() => setUploading(true)}>
                Upload more
              </Button>
              <Button size="sm" variant="soft" icon={UserPlus} onClick={() => setAdding(true)}>
                Add contact
              </Button>
            </>
          )
        }
      >
        <FilterSelect label="Status" options={CONTACT_STATUSES} value={status} onChange={setStatus} />
      </FilterBar>
      <DataTable
        loading={loading}
          error={error}
          onRetry={reload}
        rows={rows}
        columns={[
          {
            key: 'name',
            header: 'Contact',
            sortable: true,
            render: (r) => (
              <span className="flex items-center gap-3">
                <Avatar name={r.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{r.name}</span>
                  <span className="block text-xs tabular text-ink-muted">{fmtPhone(r.phone)}</span>
                </span>
              </span>
            ),
          },
          { key: 'city', header: 'City', hideBelow: 'md' },
          { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} pulse={r.status === 'In queue'} /> },
          { key: 'disposition', header: 'Outcome', hideBelow: 'md', render: (r) => (r.disposition ? <Badge tone={r.disposition === 'Not interested' ? 'neutral' : 'brand'}>{r.disposition}</Badge> : <span className="text-ink-faint">—</span>) },
          { key: 'attempts', header: 'Attempts', align: 'right', hideBelow: 'lg', render: (r) => `${r.attempts} / ${c.setup.rules.maxAttempts}` },
          { key: 'lastCallAt', header: 'Last call', align: 'right', sortable: true, sortValue: (r) => (r.lastCallAt ? +new Date(r.lastCallAt) : 0), hideBelow: 'lg', render: (r) => <span className="text-ink-muted">{r.lastCallAt ? fmtRelative(r.lastCallAt) : '—'}</span> },
        ]}
        empty={<EmptyState compact icon={Users} title={data?.length ? 'No contacts match' : 'No contacts yet'} description={data?.length ? 'Change the filters.' : 'Upload a CSV to start.'} />}
      />

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a contact"
        description="They join the end of the calling queue."
        icon={UserPlus}
        size="sm"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="brand"
              icon={Plus}
              disabled={!form.name || form.phone.replace(/\D/g, '').length < 10}
              onClick={() => {
                setData((all) => [...(all || []), { id: `new${Date.now()}`, name: form.name, phone: form.phone.replace(/\D/g, '').slice(-10), city: '—', status: 'Pending', attempts: 0, lastCallAt: null, disposition: null }]);
                setAdding(false);
                setForm({ name: '', phone: '' });
                toast({ title: 'Contact added to the queue', tone: 'success' });
              }}
            >
              Add contact
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aarav Sharma" autoFocus />
          </Field>
          <Field label="Mobile number" required>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" inputMode="tel" />
          </Field>
        </div>
      </Modal>

      <Modal open={uploading} onClose={() => setUploading(false)} title="Upload more contacts" description="Same columns as your first file. Duplicates and DNC numbers are skipped." icon={UploadSimple}>
        <FileDrop
          accept=".csv"
          title="Drop a CSV or browse"
          hint="Up to 50,000 rows"
          onFiles={(f) => {
            if (!f[0]) return;
            setUploading(false);
            toast({ title: `${f[0].name} uploaded`, description: '312 new contacts added · 18 skipped', tone: 'success' });
          }}
        />
      </Modal>
    </Card>
  );
}

/* ---------------- Calls tab ---------------- */

function CallsTab({ c }) {
  const { data, loading, error, reload } = useQuery(() => getCampaignCalls(c.id), [c.id]);
  const [call, setCall] = useState(null);
  const [status, setStatus] = useState([]);
  const rows = useFilteredRows(data, { filters: { status } });
  return (
    <Card padded={false} className="overflow-hidden">
      <FilterBar className="border-b border-line p-4" onReset={() => setStatus([])} canReset={status.length > 0} actions={<span className="text-xs text-ink-muted">{fmtNumber(rows.length)} calls</span>}>
        <FilterSelect label="Status" options={['Completed', 'No answer', 'Busy', 'Failed']} value={status} onChange={setStatus} />
      </FilterBar>
      <DataTable
        loading={loading}
          error={error}
          onRetry={reload}
        rows={rows}
        onRowClick={setCall}
        empty={<EmptyState compact icon={PhoneCall} title="No calls yet" description="Calls appear here as soon as the campaign starts." />}
        columns={[
          {
            key: 'contact',
            header: 'Contact',
            render: (r) => (
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{r.contact.name}</span>
                <span className="block text-xs tabular text-ink-muted">{fmtPhone(r.contact.phone)}</span>
              </span>
            ),
          },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'disposition', header: 'Outcome', hideBelow: 'md' },
          { key: 'attempt', header: 'Attempt', align: 'right', hideBelow: 'lg', render: (r) => `#${r.attempt}` },
          { key: 'duration', header: 'Duration', align: 'right', sortable: true, render: (r) => (r.duration ? fmtDuration(r.duration) : '—') },
          { key: 'startedAt', header: 'When', align: 'right', sortable: true, sortValue: (r) => +new Date(r.startedAt), hideBelow: 'md', render: (r) => <span className="text-ink-muted">{fmtDateTime(r.startedAt)}</span> },
        ]}
      />
      <CallDetailDrawer call={call} open={!!call} onClose={() => setCall(null)} />
    </Card>
  );
}

/* ---------------- Collected fields tab ---------------- */

function ResultsTab({ c }) {
  const { data, loading, error, reload } = useQuery(() => getCampaignResults(c.id), [c.id]);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const toast = useToast();
  const fields = c.setup.fields;
  const yesNo = fields.filter((f) => f.type === 'yesno');
  const rows = useMemo(
    () =>
      (data || []).filter(
        (r) => (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search)) && Object.entries(filters).every(([label, v]) => !v || r.values[label] === v),
      ),
    [data, filters, search],
  );
  const countFor = (label, v) => (data || []).filter((r) => r.values[label] === v).length;

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search name or number"
          onReset={() => {
            setFilters({});
            setSearch('');
          }}
          canReset={!!search || Object.values(filters).some(Boolean)}
          actions={
            <Button size="sm" icon={DownloadSimple} disabled={!rows.length} onClick={() => toast({ title: 'Export started', description: `${rows.length} rows · CSV will download shortly.`, tone: 'success' })}>
              Export CSV
            </Button>
          }
        />
        {yesNo.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {yesNo.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-muted">{f.label}:</span>
                <ChipToggleGroup
                  single
                  size="sm"
                  value={filters[f.label] || ''}
                  onChange={(v) => setFilters((x) => ({ ...x, [f.label]: x[f.label] === v ? '' : v }))}
                  options={[
                    { value: 'Yes', label: 'Yes', count: countFor(f.label, 'Yes') },
                    { value: 'No', label: 'No', count: countFor(f.label, 'No') },
                  ]}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <DataTable
        loading={loading}
          error={error}
          onRetry={reload}
        rows={rows}
        empty={<EmptyState compact icon={ListChecks} title={data?.length ? 'No results match' : 'No answers collected yet'} description={data?.length ? 'Clear a filter to see more.' : 'Answers appear after the first connected call.'} />}
        columns={[
          {
            key: 'name',
            header: 'Contact',
            sortable: true,
            render: (r) => (
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{r.name}</span>
                <span className="block text-xs tabular text-ink-muted">{fmtPhone(r.phone)}</span>
              </span>
            ),
          },
          { key: 'disposition', header: 'Outcome', hideBelow: 'md', render: (r) => <Badge tone="brand">{r.disposition}</Badge> },
          ...fields.map((f, i) => ({
            key: f.label,
            header: (
              <span className="inline-flex items-center gap-1">
                {(() => {
                  const I = FIELD_ICON[f.type];
                  return <I size={12} />;
                })()}
                {f.label}
              </span>
            ),
            hideBelow: i > 1 ? 'lg' : undefined,
            render: (r) => {
              const v = r.values[f.label];
              if (f.type === 'yesno') return <Badge tone={v === 'Yes' ? 'success' : 'neutral'}>{v}</Badge>;
              return <span className={v === '—' ? 'text-ink-faint' : 'text-ink-2'}>{v}</span>;
            },
          })),
        ]}
      />
    </Card>
  );
}

/* ---------------- Setup tab ---------------- */

function SetupTab({ c, editable, onEdit }) {
  const s = c.setup;
  const r = s.rules;
  const voice = ref.voices.find((v) => v.name === s.voice.voiceName);
  const sections = [
    ['Contacts', [['File', s.contacts.fileName], ['Contacts', fmtNumber(s.contacts.total)], ['Removed (DNC)', fmtNumber(s.contacts.removedDnc)], ['Removed (duplicates)', fmtNumber(s.contacts.removedDuplicates)]]],
    ['Who answers', [['Handled by', s.answeredBy === 'ai' ? 'AI agent' : 'Human on PC mic']]],
    ['Voice', [['Voice', `${s.voice.voiceName}${voice ? ` · ${voice.accent}` : ''}`], ['Engine', ref.engineLabel[s.voice.engine]], ['Language', s.voice.language], ['Tone', s.voice.tone], ['Speed', `${s.voice.speed}x`], ['Interruptions', s.voice.interruptions ? 'Allowed' : 'Off']]],
    ['Calling rules', [['Hours', `${r.from}–${r.to}`], ['Days', r.days.join(', ')], ['At the same time', r.concurrency], ['Max attempts', r.maxAttempts], ['Retry', r.retryMode === 'end' ? 'At end of list' : r.retryMode === 'delay' ? `After ${r.retryDelay} min` : `After ${r.retrySlots} calls`], ['Retry when', r.retryOn.join(', ')]]],
  ];
  const editBtn = (step) =>
    editable ? (
      <Button size="xs" variant="ghost" icon={PencilSimple} onClick={() => onEdit(step)}>
        Edit
      </Button>
    ) : null;
  const STEP_OF = { Contacts: 0, 'Who answers': 1, Voice: 3, 'Calling rules': 5 };
  return (
    <div className="flex flex-col gap-4">
      {!editable && <p className="text-xs text-ink-muted">{c.status === 'Running' ? 'Pause the campaign to change its setup.' : 'Completed campaigns are read-only. Duplicate to reuse the setup.'}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader title="Script & knowledge" actions={editBtn(2)} />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-ink-muted">Instructions</div>
              <p className="rounded-xl bg-surface-2 p-3 text-[13px] leading-relaxed text-ink-2">{s.script.prompt}</p>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="mb-1 text-xs text-ink-muted">Opening line</div>
                <p className="text-[13px] text-ink-2">{s.script.opening}</p>
              </div>
              <div>
                <div className="mb-1 text-xs text-ink-muted">Closing line</div>
                <p className="text-[13px] text-ink-2">{s.script.closing}</p>
              </div>
              <div>
                <div className="mb-1 text-xs text-ink-muted">Knowledge</div>
                <div className="flex flex-wrap gap-1.5">{s.script.knowledge.kind === 'pdf' ? s.script.knowledge.files.map((f) => <Badge key={f}>{f}</Badge>) : <span className="text-[13px] text-ink-2">{s.script.knowledge.text}</span>}</div>
              </div>
            </div>
          </div>
        </Card>
        {sections.map(([title, items]) => (
          <Card key={title}>
            <CardHeader title={title} actions={editBtn(STEP_OF[title])} />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {items.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-ink-muted">{k}</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
        <Card className="lg:col-span-2">
          <CardHeader title={`Fields to collect (${s.fields.length})`} actions={editBtn(4)} />
          <div className="flex flex-wrap gap-2">
            {s.fields.map((f) => {
              const I = FIELD_ICON[f.type];
              return (
                <span key={f.id} className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[13px]">
                  <I size={15} className="text-brand" />
                  <span className="font-medium text-ink">{f.label}</span>
                  <span className="text-xs text-ink-muted">{ref.fieldTypes.find((t) => t.value === f.type)?.label}</span>
                  {f.required && <Badge size="xs" tone="warning">Required</Badge>}
                </span>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <Page>
      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className="mb-6 h-8 w-80" />
      <Skeleton className="mb-6 h-20 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-64 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
      </div>
    </Page>
  );
}

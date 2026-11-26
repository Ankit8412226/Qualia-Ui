import { useEffect, useState } from 'react';
import { ChatText, FloppyDisk, GearSix, Headset, List, Moon, PhoneIncoming, Plus, Robot, Voicemail, PhoneTransfer } from '@phosphor-icons/react';
import { fmtDateTime, fmtDuration, fmtNumber, fmtPhone } from '@/lib/format';
import { useFilteredRows, useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, DataTable, EmptyState, Field, FilterBar, FilterSelect, FormSection, IconTile, Input, MetricStrip, Modal, RadioCards, Select, Skeleton, StatusBadge, Switch, Tabs, Textarea, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer } from '@/shared/patterns';
import { getInbound, ref } from '@/services/agentflow';
import { FieldBuilder } from '../components/FieldBuilder';
import { ChipToggleGroup, TimeRange } from '../components/FormBits';

export default function InboundPage() {
  const { data, loading } = useQuery(getInbound, []);
  const [tab, setTab] = useState('setup');
  const [cfg, setCfg] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (data) {
      setCfg(structuredClone(data.config));
      setNumbers(data.numbers);
    }
  }, [data]);
  const set = (patch) => {
    setCfg((c) => ({ ...c, ...patch }));
    setDirty(true);
  };

  return (
    <Page>
      <PageHeader
        title="Inbound"
        description="How incoming calls on your numbers are answered."
        actions={
          tab === 'setup' && (
            <Button
              variant="brand"
              icon={FloppyDisk}
              disabled={!dirty}
              onClick={() => {
                setDirty(false);
                toast({ title: 'Inbound setup saved', description: 'New calls use these settings right away.', tone: 'success' });
              }}
            >
              Save changes
            </Button>
          )
        }
      >
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'setup', label: 'Setup', icon: GearSix },
            { id: 'numbers', label: 'Numbers', icon: PhoneIncoming, count: numbers.length || undefined },
            { id: 'log', label: 'Call log', icon: List, count: data?.calls.length },
          ]}
        />
      </PageHeader>

      {tab === 'setup' && (loading || !cfg ? <Skeleton className="h-[600px] w-full rounded-2xl" /> : <SetupTab cfg={cfg} set={set} />)}
      {tab === 'numbers' && <NumbersTab numbers={numbers} setNumbers={setNumbers} loading={loading} />}
      {tab === 'log' && <LogTab calls={data?.calls || []} loading={loading} />}
    </Page>
  );
}

function SetupTab({ cfg, set }) {
  const voices = ref.voices;
  return (
    <Card className="px-6 py-0">
      <FormSection title="Who answers" description="The AI can take every call, or ring a person on their computer.">
        <RadioCards
          value={cfg.answeredBy}
          onChange={(answeredBy) => set({ answeredBy })}
          options={[
            { value: 'ai', label: 'AI agent', description: 'Answers instantly, any number of calls at once.', icon: Robot },
            { value: 'human', label: 'Human on PC mic', description: 'Rings available team members in the browser.', icon: Headset },
          ]}
        />
      </FormSection>
      {cfg.answeredBy === 'ai' && (
        <FormSection title="Voice and tone" description="Used for every inbound call.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Voice">
              <Select value={cfg.voiceId} onChange={(e) => set({ voiceId: e.target.value })} options={voices.map((v) => ({ value: v.id, label: `${v.name} · ${v.accent} · ${v.languages.join(', ')}` }))} />
            </Field>
            <Field label="Language">
              <Select value={cfg.language} onChange={(e) => set({ language: e.target.value })} options={ref.languages} />
            </Field>
          </div>
          <Field label="Tone">
            <ChipToggleGroup single options={ref.tones} value={cfg.tone} onChange={(tone) => set({ tone })} />
          </Field>
        </FormSection>
      )}
      <FormSection title="Greeting" description="The first thing callers hear.">
        <Textarea rows={3} value={cfg.greeting} onChange={(e) => set({ greeting: e.target.value })} />
      </FormSection>
      <FormSection title="Fields to collect" description="The AI asks for these and saves the answers with the call.">
        <FieldBuilder fields={cfg.fields} onChange={(fields) => set({ fields })} />
      </FormSection>
      <FormSection title="Business hours" description="Outside these hours the after-hours rule applies.">
        <Field label="Open">
          <TimeRange from={cfg.hours.from} to={cfg.hours.to} onChange={(x) => set({ hours: { ...cfg.hours, ...x } })} />
        </Field>
        <Field label="Days">
          <ChipToggleGroup options={ref.days} value={cfg.hours.days} onChange={(days) => set({ hours: { ...cfg.hours, days } })} />
        </Field>
      </FormSection>
      <FormSection title="After hours" description="What happens when someone calls while you are closed.">
        <RadioCards
          cols={3}
          value={cfg.afterHours}
          onChange={(afterHours) => set({ afterHours })}
          options={[
            { value: 'ai', label: 'AI answers', description: 'Same AI, takes details for a callback.', icon: Moon },
            { value: 'message', label: 'Play a message', description: 'Plays the note below and hangs up.', icon: Voicemail },
            { value: 'forward', label: 'Forward', description: 'Send to an on-call mobile number.', icon: PhoneTransfer },
          ]}
        />
        {cfg.afterHours === 'forward' ? (
          <Field label="Forward to">
            <Input placeholder="98765 43210" value={cfg.forwardTo || ''} onChange={(e) => set({ forwardTo: e.target.value })} />
          </Field>
        ) : (
          <Field label={cfg.afterHours === 'ai' ? 'What the AI says first' : 'Message'}>
            <Textarea rows={2} value={cfg.afterHoursMessage} onChange={(e) => set({ afterHoursMessage: e.target.value })} />
          </Field>
        )}
      </FormSection>
    </Card>
  );
}

function NumbersTab({ numbers, setNumbers, loading }) {
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  return (
    <>
      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div className="text-sm text-ink-muted">Calls to these numbers are answered by Agent Flow.</div>
          <Button size="sm" variant="soft" icon={Plus} onClick={() => setAdding(true)}>
            Request a number
          </Button>
        </div>
        <DataTable
          loading={loading}
          rows={numbers}
          pageSize={0}
          columns={[
            {
              key: 'number',
              header: 'Number',
              render: (n) => (
                <span className="flex items-center gap-3">
                  <IconTile icon={PhoneIncoming} size="sm" tone={n.status === 'Active' ? 'brand' : 'neutral'} />
                  <span>
                    <span className="block font-semibold tabular text-ink">{n.number.startsWith('1800') ? n.number : fmtPhone(n.number)}</span>
                    <span className="block text-xs text-ink-muted">{n.label}</span>
                  </span>
                </span>
              ),
            },
            { key: 'provider', header: 'Provider', hideBelow: 'md' },
            { key: 'status', header: 'Status', render: (n) => <StatusBadge status={n.status} /> },
            { key: 'callsToday', header: 'Calls today', align: 'right', render: (n) => fmtNumber(n.callsToday) },
            {
              key: 'on',
              header: 'Answering',
              align: 'right',
              render: (n) =>
                n.status === 'Pending' ? (
                  <span className="text-xs text-ink-faint">Being set up</span>
                ) : (
                  <span className="inline-flex justify-end">
                    <Switch
                      size="sm"
                      checked={n.status === 'Active'}
                      onChange={(v) => {
                        setNumbers((all) => all.map((x) => (x.id === n.id ? { ...x, status: v ? 'Active' : 'Paused' } : x)));
                        toast({ title: v ? 'Number is answering again' : 'Number paused', description: v ? undefined : 'Callers hear a busy tone.' });
                      }}
                    />
                  </span>
                ),
            },
          ]}
        />
      </Card>
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Request a number"
        description="We usually activate a new number within 2 working days."
        icon={PhoneIncoming}
        size="sm"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="brand"
              onClick={() => {
                setNumbers((all) => [...all, { id: `did_${Date.now()}`, number: '02071234500', label: 'New line', status: 'Pending', provider: 'Tata Tele', callsToday: 0 }]);
                setAdding(false);
                toast({ title: 'Request sent', tone: 'success' });
              }}
            >
              Send request
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="City">
            <Select options={['Pune', 'Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad', 'Toll-free (1800)']} defaultValue="Pune" />
          </Field>
          <Field label="Label" hint="Only your team sees this.">
            <Input placeholder="e.g. Hinjewadi site office" />
          </Field>
        </div>
      </Modal>
    </>
  );
}

function LogTab({ calls, loading }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState([]);
  const [call, setCall] = useState(null);
  const rows = useFilteredRows(calls, { search, fields: [(r) => r.contact.name, (r) => r.contact.phone, 'disposition'], filters: { status } });
  const answered = calls.filter((c) => c.status === 'Completed');
  return (
    <div className="flex flex-col gap-4">
      <MetricStrip
        items={[
          { label: 'Inbound calls', value: fmtNumber(calls.length), sub: 'last 7 days' },
          { label: 'Answered', value: fmtNumber(answered.length), sub: calls.length ? `${Math.round((answered.length / calls.length) * 100)}% of calls` : '—' },
          { label: 'Avg duration', value: fmtDuration(answered.reduce((a, c) => a + c.duration, 0) / (answered.length || 1)) },
          { label: 'Missed', value: fmtNumber(calls.length - answered.length) },
        ]}
      />
      <Card padded={false} className="overflow-hidden">
        <FilterBar
          className="border-b border-line p-4"
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search caller or outcome"
          onReset={() => {
            setSearch('');
            setStatus([]);
          }}
          canReset={!!search || status.length > 0}
        >
          <FilterSelect label="Status" options={['Completed', 'No answer', 'Busy', 'Failed']} value={status} onChange={setStatus} />
        </FilterBar>
        <DataTable
          loading={loading}
          rows={rows}
          onRowClick={setCall}
          empty={<EmptyState compact icon={ChatText} title="No inbound calls" description="Calls to your numbers appear here." />}
          columns={[
            {
              key: 'contact',
              header: 'Caller',
              render: (r) => (
                <span className="flex items-center gap-3">
                  <Avatar name={r.contact.name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{r.contact.name}</span>
                    <span className="block text-xs tabular text-ink-muted">{fmtPhone(r.contact.phone)}</span>
                  </span>
                </span>
              ),
            },
            { key: 'did', header: 'Called number', hideBelow: 'lg', render: (r) => <span className="tabular">{fmtPhone(r.did)}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'disposition', header: 'Outcome', hideBelow: 'md', render: (r) => <Badge tone="brand">{r.disposition}</Badge> },
            { key: 'duration', header: 'Duration', align: 'right', render: (r) => (r.duration ? fmtDuration(r.duration) : '—') },
            { key: 'startedAt', header: 'When', align: 'right', hideBelow: 'md', render: (r) => <span className="text-ink-muted">{fmtDateTime(r.startedAt)}</span> },
          ]}
        />
      </Card>
      <CallDetailDrawer call={call} open={!!call} onClose={() => setCall(null)} />
    </div>
  );
}

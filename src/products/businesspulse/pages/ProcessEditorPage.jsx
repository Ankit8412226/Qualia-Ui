import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, EnvelopeSimple, LockSimple, TreeStructure } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, Checkbox, DataTable, DescriptionList, Field, FormSection, Input, SearchInput, Select, Skeleton, Stepper, Switch, Tabs, TagInput, useConfirm, useToast } from '@/design-system';
import { BackLink, Page, PageHeader, useUnsavedChanges } from '@/shared/layout';
import { DispositionsManager } from '@/shared/patterns';
import { getFeatures, getProcess, listParameterSets } from '@/services/businesspulse';
import { useProcess } from '../components/ProcessContext';
import { ScorePill } from '../components/common';

const BLANK = { name: '', active: true, enterprise: true, parameterSet: '', dailyEmails: true, fatalRecipients: [], dispositions: ['Interested', 'Call back later', 'Not interested'], agents: [], features: ['scoring', 'coach', 'emails'] };
const STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'features', label: 'Features' },
  { id: 'review', label: 'Review' },
];

export default function ProcessEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { setProcessId } = useProcess();
  const { data: loaded, loading } = useQuery(() => (isNew ? Promise.resolve(BLANK) : getProcess(id)), [id]);
  const { data: sets } = useQuery(() => listParameterSets(), []);
  const { data: features } = useQuery(() => getFeatures(), []);
  const [p, setP] = useState(null);
  const [tab, setTab] = useState('general');
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const leave = useUnsavedChanges(dirty, { message: 'Your edits to this process will be lost.' });
  useEffect(() => setP(loaded ? { ...loaded, parameterSet: loaded.parameterSet || '' } : null), [loaded]);
  const set = (k, v) => {
    setP((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };

  const save = () => {
    setDirty(false);
    toast({ title: isNew ? 'Process created' : 'Changes saved', description: isNew ? `${p.name} is ready. Add agents and start uploading calls.` : undefined });
    if (isNew) {
      leave.allow();
      navigate('/businesspulse/processes');
    }
  };

  if (loading || !p || !sets || !features)
    return (
      <Page>
        <Skeleton className="mb-6 h-10 w-72" />
        <Skeleton className="h-96 rounded-2xl" />
      </Page>
    );

  const general = (
    <>
      <FormSection title="Process" description="Usually the client and the line of business.">
        <Field label="Name" required>
          <Input value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. RR Parko – Sales" />
        </Field>
        <Field label="QA parameter set" hint="Calls are scored against this checklist unless an upload picks another.">
          <Select placeholder="Pick a parameter set" options={sets.map((s) => s.name)} value={p.parameterSet} onChange={(e) => set('parameterSet', e.target.value)} />
        </Field>
        <Switch label="Active" description="Paused processes keep their data but stop scoring new calls." checked={p.active} onChange={(v) => set('active', v)} />
      </FormSection>
    </>
  );
  const alerts = (
    <>
      <FormSection title="Agent emails" description="Each agent gets yesterday’s scores, their lowest parameter and one tip at 9 AM.">
        <Switch label="Daily agent feedback emails" checked={p.dailyEmails} onChange={(v) => set('dailyEmails', v)} />
      </FormSection>
      <FormSection title="Fatal alerts" description="Sent the moment a call fails a fatal parameter, with the quote and a link to the call.">
        <Field label="Recipients" hint="Press Enter after each email.">
          <TagInput value={p.fatalRecipients} onChange={(v) => set('fatalRecipients', v)} placeholder="qa-lead@company.in" />
        </Field>
        <div className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-xs text-ink-muted">
          <EnvelopeSimple size={14} className="mt-0.5 shrink-0" /> Preview: “Fatal error · Kavya Iyer · Price disclosure — ‘Sir yeh all-inclusive price hai…’ · Open call”
        </div>
      </FormSection>
    </>
  );
  const featureList = (
    <FormSection title="Enabled features" description={p.enterprise ? 'Turn features on or off for this process.' : 'This process is on the Core plan. Revenue-intelligence features need Enterprise.'}>
      <ul className="flex flex-col divide-y divide-line/70 rounded-2xl border border-line">
        {features.map((f) => {
          const locked = f.enterprise && !p.enterprise;
          return (
            <li key={f.key} className={cn('flex items-center gap-3 px-4 py-3', locked && 'opacity-60')}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  {f.label}
                  {f.enterprise && <Badge tone="violet" size="xs" icon={locked ? LockSimple : undefined}>Enterprise</Badge>}
                </div>
                <div className="text-xs text-ink-muted">{f.description}</div>
              </div>
              <Switch size="sm" disabled={locked} checked={p.features.includes(f.key)} onChange={(v) => set('features', v ? [...p.features, f.key] : p.features.filter((k) => k !== f.key))} />
            </li>
          );
        })}
      </ul>
    </FormSection>
  );

  if (isNew) {
    return (
      <Page className="max-w-[980px]">
        <BackLink to="/businesspulse/processes">Processes</BackLink>
        <PageHeader className="mt-3" title="New process" icon={TreeStructure} description="Four short steps. You can change everything later." />
        <Stepper steps={STEPS} current={step} onStepClick={setStep} className="mb-6" />
        <Card className="py-1">
          {step === 0 && general}
          {step === 1 && alerts}
          {step === 2 && featureList}
          {step === 3 && (
            <div className="py-5">
              <h3 className="mb-4 text-sm font-bold">Review</h3>
              <DescriptionList
                items={[
                  { label: 'Name', value: p.name || '—' },
                  { label: 'Parameter set', value: p.parameterSet || '—' },
                  { label: 'Status', value: p.active ? 'Active' : 'Paused' },
                  { label: 'Daily agent emails', value: p.dailyEmails ? 'On' : 'Off' },
                  { label: 'Fatal alert recipients', value: p.fatalRecipients.join(', ') || 'None' },
                  { label: 'Features', value: features.filter((f) => p.features.includes(f.key)).map((f) => f.label).join(', ') },
                ]}
              />
            </div>
          )}
        </Card>
        <div className="mt-4 flex justify-between">
          <Button icon={ArrowLeft} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          {step < 3 ? (
            <Button variant="brand" iconRight={ArrowRight} disabled={step === 0 && !p.name.trim()} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button variant="brand" icon={Check} onClick={save}>
              Create process
            </Button>
          )}
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <BackLink to="/businesspulse/processes">Processes</BackLink>
      <PageHeader
        className="mt-3"
        title={p.name}
        icon={TreeStructure}
        meta={
          <>
            <Badge tone={p.active ? 'success' : 'neutral'} dot>
              {p.active ? 'Active' : 'Paused'}
            </Badge>
            {p.enterprise ? <Badge tone="violet">Enterprise</Badge> : <Badge icon={LockSimple}>Core plan</Badge>}
            <span className="text-xs text-ink-muted">
              {p.agents.length} agents · {fmtNumber(p.callCount)} calls
            </span>
          </>
        }
        actions={
          <>
            <Button
              onClick={async () => {
                if (!dirty || (await confirm({ title: 'Discard changes?', message: 'Your edits to this process will be lost.', tone: 'danger', confirmLabel: 'Discard' }))) {
                  setProcessId(p.id);
                  leave.allow();
                  navigate('/businesspulse');
                }
              }}
            >
              Open dashboard
            </Button>
            <Button variant="brand" icon={Check} disabled={!dirty} onClick={save}>
              Save changes
            </Button>
          </>
        }
      >
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'general', label: 'General' },
            { id: 'alerts', label: 'Alerts' },
            { id: 'dispositions', label: 'Dispositions', count: p.dispositions.length },
            { id: 'agents', label: 'Agents', count: p.agents.filter((a) => a.included).length },
            { id: 'features', label: 'Features', count: p.features.length },
          ]}
        />
      </PageHeader>

      {tab === 'general' && <Card className="py-1">{general}</Card>}
      {tab === 'alerts' && <Card className="py-1">{alerts}</Card>}
      {tab === 'features' && <Card className="py-1">{featureList}</Card>}
      {tab === 'dispositions' && <DispositionsManager items={p.dispositions.map((d, i) => ({ id: i + 1, name: d, description: '', active: true, callback: /call back/i.test(d), count: 40 + ((i * 37) % 180) }))} features={{ aiImprove: true }} />}
      {tab === 'agents' && <AgentsTab agents={p.agents} onChange={(v) => set('agents', v)} />}
    </Page>
  );
}

function AgentsTab({ agents, onChange }) {
  const [q, setQ] = useState('');
  const rows = agents.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()) || a.empId.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id) => onChange(agents.map((a) => (a.id === id ? { ...a, included: !a.included } : a)));
  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search name or ID" className="w-full sm:w-64" />
        <span className="text-xs text-ink-muted">Only included agents are scored and get emails.</span>
      </div>
      <DataTable
        rows={rows}
        pageSize={0}
        columns={[
          { key: 'included', header: 'Scored', width: 70, render: (a) => <Checkbox checked={a.included} onChange={() => toggle(a.id)} /> },
          {
            key: 'name',
            header: 'Agent',
            sortable: true,
            render: (a) => (
              <span className="flex items-center gap-2.5">
                <Avatar name={a.name} size="sm" />
                <span>
                  <span className="block font-medium text-ink">{a.name}</span>
                  <span className="block text-xs text-ink-muted">{a.email}</span>
                </span>
              </span>
            ),
          },
          { key: 'empId', header: 'Dialer ID', hideBelow: 'md', render: (a) => <span className="font-mono text-xs">{a.empId}</span> },
          { key: 'team', header: 'Team', hideBelow: 'lg' },
          { key: 'status', header: 'Status', render: (a) => <Badge tone={a.status === 'Active' ? 'success' : a.status === 'On leave' ? 'warning' : 'neutral'} dot>{a.status}</Badge> },
          { key: 'calls', header: 'Calls', align: 'right', sortable: true },
          { key: 'avgScore', header: 'Avg score', align: 'right', sortable: true, render: (a) => <ScorePill value={a.avgScore} /> },
        ]}
      />
    </Card>
  );
}

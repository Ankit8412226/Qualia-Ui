import { useEffect, useMemo, useState } from 'react';
import { ChartLineUp, EnvelopeSimple, Key, Phone, SlidersHorizontal, Users } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtCompact, fmtDateTime, fmtDuration, fmtNumber, fmtPercent } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ChartCard,
  DataTable,
  Drawer,
  EmptyState,
  Field,
  FilterBar,
  FilterSelect,
  Input,
  ProgressRing,
  RankedBars,
  SecretInput,
  Select,
  StatCard,
  StatGrid,
  StatusBadge,
  Switch,
  Tabs,
  TrendChart,
  scoreTone,
  useToast,
} from '@/design-system';
import { CallDetailDrawer } from '@/shared/patterns';
import { Page, PageHeader } from '@/shared/layout';
import { listBpCalls, listBpProjects } from '@/services/commons';
import { BP_FEATURES, PLATFORM_DAILY, TRANSCRIPTION_PROVIDERS } from '@/mocks/commons';
import { UsageMeter } from '../components/Bits';
import { ProductAdminTitle } from '../components/ProductAdminTitle';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'projects', label: 'Projects' },
  { id: 'calls', label: 'Calls' },
];

export default function BusinessPulseAdminPage() {
  const [tab, setTab] = useState('overview');
  const projectsQ = useQuery(() => listBpProjects(), []);
  const callsQ = useQuery(() => listBpCalls(), []);
  const [openId, setOpenId] = useState(null);
  const projects = useMemo(() => projectsQ.data || [], [projectsQ.data]);
  const open = projects.find((p) => p.id === openId);
  const patch = (id, p) => projectsQ.setData((d) => d.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <Page>
      <PageHeader
        title={<ProductAdminTitle id="businesspulse">Business Pulse</ProductAdminTitle>}
        description="AI call QA for every tenant. Turn features on per project and manage credits, keys and transcription."
      >
        <Tabs tabs={TABS.map((t) => (t.id === 'projects' ? { ...t, count: projects.length || undefined } : t))} value={tab} onChange={setTab} />
      </PageHeader>
      {tab === 'overview' && <Overview projects={projects} loading={projectsQ.loading} onOpen={(id) => (setOpenId(id), setTab('projects'))} />}
      {tab === 'projects' && <Projects projects={projects} loading={projectsQ.loading} onOpen={setOpenId} />}
      {tab === 'calls' && <Calls calls={callsQ.data || []} loading={callsQ.loading} />}
      <ProjectDrawer project={open} onClose={() => setOpenId(null)} onSave={patch} />
    </Page>
  );
}

function Overview({ projects, loading, onOpen }) {
  const credits = projects.reduce((a, p) => a + p.monthlyCredits, 0);
  const used = projects.reduce((a, p) => a + p.usedCredits, 0);
  const scored = projects.reduce((a, p) => a + p.callsScored, 0);
  const daily = PLATFORM_DAILY.slice(-14).map((d) => ({ date: d.date, scored: d.businesspulse }));
  const adoption = BP_FEATURES.map((f) => ({ label: f.label, value: projects.filter((p) => p.features[f.key]).length }));
  return (
    <div className="flex flex-col gap-6">
      <StatGrid cols={4}>
        <StatCard loading={loading} label="Projects" value={fmtNumber(projects.length)} hint={`${projects.filter((p) => p.status === 'Active').length} active`} icon={SlidersHorizontal} tone="businesspulse" />
        <StatCard loading={loading} label="Calls scored this month" value={fmtNumber(scored)} delta={7.4} spark={daily.map((d) => d.scored)} />
        <StatCard loading={loading} label="Credits used" value={fmtPercent(credits ? (used / credits) * 100 : 0, 0)} hint={`${fmtNumber(used)} of ${fmtNumber(credits)}`} />
        <StatCard loading={loading} label="Avg pass rate" value={fmtPercent(projects.length ? projects.reduce((a, p) => a + p.passRate, 0) / projects.length : 0)} delta={2.2} deltaLabel="pts vs last month" />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Calls scored per day" subtitle="All tenants · last 14 days" icon={ChartLineUp} table={{ columns: [{ key: 'date', header: 'Date' }, { key: 'scored', header: 'Calls scored', format: fmtNumber }], rows: daily }}>
          <TrendChart data={daily} series={[{ key: 'scored', label: 'Calls scored', color: 'series-2' }]} height={240} valueFormatter={fmtCompact} />
        </ChartCard>
        <Card>
          <CardHeader title="Feature adoption" subtitle={`Projects with each feature on, of ${projects.length}`} />
          <RankedBars items={adoption} max={projects.length || 1} />
        </Card>
      </div>
      <Card>
        <CardHeader title="Projects close to their credit limit" subtitle="Scoring stops when credits run out" />
        <ul className="divide-y divide-line/70">
          {[...projects]
            .sort((a, b) => b.usedCredits / b.monthlyCredits - a.usedCredits / a.monthlyCredits)
            .slice(0, 4)
            .map((p) => (
              <li key={p.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">
                    {p.tenant} · {p.name}
                  </div>
                </div>
                <UsageMeter used={p.usedCredits} total={p.monthlyCredits} unit="credits" className="w-56" />
                <Button size="sm" onClick={() => onOpen(p.id)}>
                  Manage
                </Button>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}

function Projects({ projects, loading, onOpen }) {
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState([]);
  const rows = projects.filter((p) => (!search || `${p.tenant} ${p.name}`.toLowerCase().includes(search.toLowerCase())) && (!tenants.length || tenants.includes(p.tenant)));
  return (
    <Card padded={false}>
      <div className="p-4">
        <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search project or tenant" canReset={!!(search || tenants.length)} onReset={() => (setSearch(''), setTenants([]))}>
          <FilterSelect label="Tenant" options={[...new Set(projects.map((p) => p.tenant))]} value={tenants} onChange={setTenants} />
        </FilterBar>
      </div>
      <DataTable
        loading={loading}
        rows={rows}
        onRowClick={(p) => onOpen(p.id)}
        empty={<EmptyState icon={SlidersHorizontal} title="No projects match" compact />}
        columns={[
          {
            key: 'name',
            header: 'Project',
            sortable: true,
            render: (p) => (
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{p.name}</div>
                <div className="truncate text-xs text-ink-muted">{p.tenant}</div>
              </div>
            ),
          },
          {
            key: 'features',
            header: 'Features',
            render: (p) => (
              <div className="flex flex-wrap gap-1">
                {BP_FEATURES.filter((f) => p.features[f.key]).map((f) => (
                  <Badge key={f.key} size="xs" tone="violet">
                    {f.label}
                  </Badge>
                ))}
              </div>
            ),
            hideBelow: 'lg',
          },
          { key: 'agents', header: 'Agents', align: 'right', sortable: true },
          { key: 'credits', header: 'Credits', render: (p) => <UsageMeter used={p.usedCredits} total={p.monthlyCredits} className="w-40" />, sortable: true, sortValue: (p) => p.usedCredits / p.monthlyCredits },
          { key: 'passRate', header: 'Pass rate', align: 'right', sortable: true, render: (p) => <ProgressRing value={p.passRate} size={36} stroke={4} tone={scoreTone(p.passRate)} />, hideBelow: 'md' },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
        ]}
      />
    </Card>
  );
}

function ProjectDrawer({ project, onClose, onSave }) {
  const [f, setF] = useState(null);
  const toast = useToast();
  useEffect(() => {
    if (project) setF(structuredClone(project));
  }, [project]);
  if (!project || !f) return null;
  const set = (path, v) =>
    setF((x) => {
      const n = structuredClone(x);
      const keys = path.split('.');
      keys.slice(0, -1).reduce((o, k) => o[k], n)[keys.at(-1)] = v;
      return n;
    });
  return (
    <Drawer
      open
      onClose={onClose}
      width={640}
      title={f.name}
      subtitle={f.tenant}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(f.id, { ...f, monthlyCredits: Number(f.monthlyCredits), agents: Number(f.agents) });
              toast({ title: 'Project saved', description: `${f.tenant} · ${f.name}`, tone: 'success' });
              onClose();
            }}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 p-6">
        <section>
          <h3 className="mb-1 text-sm font-bold">Features</h3>
          <p className="mb-3 text-xs text-ink-muted">What this project’s users can see. Changes apply on their next page load.</p>
          <div className="flex flex-col divide-y divide-line rounded-2xl border border-line">
            {BP_FEATURES.map((ft) => (
              <div key={ft.key} className="px-4 py-3">
                <Switch checked={f.features[ft.key]} onChange={(v) => set(`features.${ft.key}`, v)} label={ft.label} description={ft.description} />
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Monthly credits" hint={`${fmtNumber(f.usedCredits)} used this month`}>
            <Input type="number" value={f.monthlyCredits} onChange={(e) => set('monthlyCredits', e.target.value)} />
          </Field>
          <Field label="Agents" hint="Agents scored in this project">
            <Input type="number" icon={Users} value={f.agents} onChange={(e) => set('agents', e.target.value)} />
          </Field>
          <Field label="Transcription" className="sm:col-span-2">
            <Select value={f.transcription} onChange={(e) => set('transcription', e.target.value)} options={TRANSCRIPTION_PROVIDERS} />
          </Field>
        </section>
        <section>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
            <Key size={15} /> LLM keys
          </h3>
          <p className="mb-3 text-xs text-ink-muted">Optional. Platform keys are used when empty.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Scoring model">
              <Select value={f.llm.provider} onChange={(e) => set('llm.provider', e.target.value)} options={['GPT-4.1 mini', 'Gemini 2.5 Flash', 'Claude Haiku 4.5']} />
            </Field>
            <Field label="OpenAI key">
              <SecretInput value={f.llm.openai} onChange={(v) => set('llm.openai', v)} placeholder="Using platform key" />
            </Field>
            <Field label="Gemini key">
              <SecretInput value={f.llm.gemini} onChange={(v) => set('llm.gemini', v)} placeholder="Using platform key" />
            </Field>
          </div>
        </section>
        <section>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
            <EnvelopeSimple size={15} /> Agent emails (SMTP)
          </h3>
          <p className="mb-3 text-xs text-ink-muted">Agents get their scores and coaching tips from this mailbox.</p>
          <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
            <Field label="Host">
              <Input value={f.smtp.host} onChange={(e) => set('smtp.host', e.target.value)} className="font-mono" />
            </Field>
            <Field label="Port">
              <Input type="number" value={f.smtp.port} onChange={(e) => set('smtp.port', e.target.value)} />
            </Field>
            <Field label="Username">
              <Input value={f.smtp.user} onChange={(e) => set('smtp.user', e.target.value)} />
            </Field>
            <Field label="Password" className="sm:col-span-1">
              <SecretInput value={f.smtp.password} onChange={(v) => set('smtp.password', v)} />
            </Field>
            <Field label="From" className="sm:col-span-2">
              <Input value={f.smtp.from} onChange={(e) => set('smtp.from', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
            <Switch size="sm" checked={f.smtp.sendDaily} onChange={(v) => set('smtp.sendDaily', v)} label="Daily score email to agents" />
            <Button size="sm" onClick={() => toast({ title: 'Test email sent', description: f.smtp.user, tone: 'success' })}>
              Send test
            </Button>
          </div>
        </section>
      </div>
    </Drawer>
  );
}

function Calls({ calls, loading }) {
  const [open, setOpen] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [states, setStates] = useState([]);
  const rows = calls.filter((c) => (!tenants.length || tenants.includes(c.tenant)) && (!states.length || states.includes(c.processing)));
  return (
    <Card padded={false}>
      <div className="p-4">
        <FilterBar canReset={!!(tenants.length || states.length)} onReset={() => (setTenants([]), setStates([]))}>
          <FilterSelect label="Tenant" options={[...new Set(calls.map((c) => c.tenant))]} value={tenants} onChange={setTenants} />
          <FilterSelect label="Processing" options={['Scored', 'Processing', 'Failed']} value={states} onChange={setStates} />
        </FilterBar>
      </div>
      <DataTable
        loading={loading}
        rows={rows}
        onRowClick={setOpen}
        empty={<EmptyState icon={Phone} title="No calls match" compact />}
        columns={[
          { key: 'startedAt', header: 'Time', sortable: true, sortValue: (c) => +new Date(c.startedAt), render: (c) => <span className="whitespace-nowrap">{fmtDateTime(c.startedAt)}</span> },
          {
            key: 'tenant',
            header: 'Tenant · project',
            render: (c) => (
              <div className="min-w-0">
                <div className="truncate text-ink">{c.tenant}</div>
                <div className="truncate text-xs text-ink-muted">{c.project}</div>
              </div>
            ),
          },
          { key: 'agent', header: 'Agent', render: (c) => c.agent.name, hideBelow: 'md' },
          { key: 'duration', header: 'Length', align: 'right', render: (c) => fmtDuration(c.duration), hideBelow: 'lg' },
          { key: 'score', header: 'Score', align: 'right', sortable: true, render: (c) => (c.score != null ? <Badge tone={scoreTone(c.score)}>{c.score}</Badge> : '—') },
          { key: 'processing', header: 'Processing', render: (c) => <Badge dot tone={{ Scored: 'success', Processing: 'warning', Failed: 'danger' }[c.processing]}>{c.processing}</Badge> },
        ]}
      />
      <CallDetailDrawer call={open} open={!!open} onClose={() => setOpen(null)} />
    </Card>
  );
}

import { useState } from 'react';
import { ArrowsClockwise, CalendarBlank, FileXls, HardDrives, PencilSimple, Plus, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtDateTime, fmtDuration, fmtNumber, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Badge, Button, Callout, Card, CardHeader, DataTable, Field, FileDrop, Input, Modal, SecretInput, Select, Skeleton, StatusBadge, Switch, Tabs, TagInput, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { getSync } from '@/services/businesspulse';

const SCHEDULES = ['Every hour', 'Every 2 hours', 'Every 6 hours', 'Daily at 22:00', 'Manual only'];
const BLANK = { name: '', server: 'https://', username: '', password: '', campaigns: [], processId: 'proc_sales', schedule: 'Every 2 hours', window: '09:00–21:00', active: true, minDuration: 30 };

export default function SyncPage() {
  const { data, loading, setData, error, reload } = useQuery(() => getSync(), []);
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [tab, setTab] = useState('history');

  const syncNow = (cfg) => {
    setSyncing(cfg.id);
    setTimeout(() => {
      const fetched = 40 + Math.round(Math.random() * 80);
      setData((d) => ({
        ...d,
        configs: d.configs.map((c) => (c.id === cfg.id ? { ...c, lastSync: new Date(), status: 'Healthy' } : c)),
        history: [{ id: `run_${Date.now()}`, configId: cfg.id, configName: cfg.name, startedAt: new Date(), trigger: 'Manual', fetched, scored: fetched - 3, skipped: 3, errors: 0, status: 'Completed', duration: 42 }, ...d.history],
      }));
      setSyncing(null);
      toast({ title: `${cfg.name} synced`, description: `${fetched} new recordings fetched and queued for scoring.` });
    }, 1800);
  };

  const save = (cfg) => {
    setData((d) => ({ ...d, configs: cfg.id ? d.configs.map((c) => (c.id === cfg.id ? cfg : c)) : [...d.configs, { ...cfg, id: `sync_${Date.now()}`, status: 'Healthy', lastSync: null }] }));
    setEditing(null);
    toast(cfg.id ? 'Sync settings saved' : 'Dialer connected');
  };

  const lastError = data?.history.find((h) => h.status === 'Failed');

  return (
    <Page>
      <PageHeader
        title="Dialer sync"
        icon={ArrowsClockwise}
        description="Pull call recordings from Vicidial on a schedule. Each recording is matched to its agent and scored."
        actions={
          <Button variant="brand" icon={Plus} onClick={() => setEditing(BLANK)}>
            Connect a dialer
          </Button>
        }
      />

      {lastError && (
        <Callout tone="danger" className="mb-4" title={`Last failed run · ${lastError.configName} · ${fmtRelative(lastError.startedAt)}`}>
          {lastError.errorText}
        </Callout>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {loading
          ? [0, 1].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)
          : data.configs.map((c) => (
              <Card key={c.id} className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <HardDrives size={20} weight="duotone" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[15px] font-bold">{c.name}</h3>
                      <StatusBadge status={c.active ? c.status : 'Paused'} />
                    </div>
                    <p className="truncate font-mono text-xs text-ink-muted">{c.server}</p>
                  </div>
                  <Switch size="sm" checked={c.active} onChange={(v) => setData((d) => ({ ...d, configs: d.configs.map((x) => (x.id === c.id ? { ...x, active: v } : x)) }))} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
                  <div>
                    <div className="text-2xs text-ink-muted">Process</div>
                    <div className="truncate font-medium">{data.processes.find((p) => p.value === c.processId)?.label}</div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-muted">Schedule</div>
                    <div className="flex items-center gap-1 font-medium">
                      <CalendarBlank size={12} /> {c.schedule}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-muted">Last sync</div>
                    <div className={cn('font-medium', c.status === 'Warning' && 'text-warning')}>{c.lastSync ? fmtRelative(c.lastSync) : 'Never'}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.campaigns.map((x) => (
                    <Badge key={x} size="xs">
                      {x}
                    </Badge>
                  ))}
                </div>
                {c.status === 'Warning' && (
                  <div className="flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
                    <Warning size={14} weight="fill" /> Last run skipped some recordings. See history below.
                  </div>
                )}
                <div className="mt-auto flex gap-2 border-t border-line pt-3">
                  <Button size="sm" variant="soft" icon={ArrowsClockwise} loading={syncing === c.id} onClick={() => syncNow(c)} disabled={!c.active}>
                    {syncing === c.id ? 'Syncing…' : 'Sync now'}
                  </Button>
                  <Button size="sm" variant="ghost" icon={PencilSimple} onClick={() => setEditing(c)}>
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
      </div>

      <Tabs
        className="mb-4 mt-8"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'history', label: 'Sync history', count: data?.history.length },
          { id: 'excel', label: 'Excel import', icon: FileXls },
        ]}
      />

      {tab === 'history' && (
        <Card padded={false}>
          <DataTable
            loading={loading}
          error={error}
          onRetry={reload}
            rows={data?.history || []}
            pageSize={10}
            rowClassName={(r) => (r.status === 'Failed' ? 'bg-danger/[.03]' : '')}
            columns={[
              { key: 'startedAt', header: 'Started', render: (r) => <span title={fmtDateTime(r.startedAt)}>{fmtRelative(r.startedAt)}</span> },
              { key: 'configName', header: 'Dialer', render: (r) => <span className="font-medium text-ink">{r.configName}</span> },
              { key: 'trigger', header: 'Trigger', hideBelow: 'md', render: (r) => <Badge tone={r.trigger === 'Manual' ? 'brand' : 'neutral'}>{r.trigger}</Badge> },
              { key: 'fetched', header: 'Fetched', align: 'right', render: (r) => fmtNumber(r.fetched) },
              { key: 'scored', header: 'Scored', align: 'right', hideBelow: 'md', render: (r) => fmtNumber(r.scored) },
              { key: 'skipped', header: 'Skipped', align: 'right', hideBelow: 'lg' },
              { key: 'errors', header: 'Errors', align: 'right', render: (r) => (r.errors ? <span className="font-semibold text-danger" title={r.errorText}>{r.errors}</span> : <span className="text-ink-faint">0</span>) },
              { key: 'duration', header: 'Took', align: 'right', hideBelow: 'lg', render: (r) => fmtDuration(r.duration) },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        </Card>
      )}

      {tab === 'excel' && (
        <Card>
          <CardHeader title="Import from Excel" subtitle="For dialers we cannot connect to. One row per call: recording URL, agent ID, phone, date/time, disposition." icon={FileXls} />
          <FileDrop
            accept=".xlsx,.xls,.csv"
            title="Drop an Excel or CSV file"
            hint="Up to 5,000 rows per file"
            onFiles={(f) => toast({ title: `${f[0]?.name || 'File'} imported`, description: '1,284 rows read · 1,270 recordings queued · 14 rows had no recording URL.' })}
          />
          <Button variant="link" size="sm" className="mt-3" onClick={() => toast({ title: 'Template downloaded', tone: 'info' })}>
            Download template
          </Button>
        </Card>
      )}

      {editing && <ConfigModal value={editing} processes={data.processes} onClose={() => setEditing(null)} onSave={save} />}
    </Page>
  );
}

function ConfigModal({ value, processes, onClose, onSave }) {
  const [c, setC] = useState(value);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(null);
  const toast = useToast();
  const set = (k, v) => setC((x) => ({ ...x, [k]: v }));
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      icon={HardDrives}
      title={c.id ? `Edit ${c.name}` : 'Connect Vicidial'}
      description="We read recordings and call logs only. Nothing is written to your dialer."
      footer={
        <>
          <Button
            className="mr-auto"
            loading={testing}
            onClick={() => {
              setTesting(true);
              setTimeout(() => {
                setTesting(false);
                setTested(true);
                toast({ title: 'Connection works', description: 'Found 6 campaigns and 214 recordings from today.' });
              }, 1200);
            }}
          >
            Test connection
          </Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!c.name || c.server.length < 10 || !c.username} onClick={() => onSave(c)}>
            {c.id ? 'Save' : 'Connect'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2">
          <Input value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="Pune floor Vicidial" />
        </Field>
        <Field label="Server URL" required className="sm:col-span-2" hint={tested ? '✓ Reachable' : undefined}>
          <Input value={c.server} onChange={(e) => set('server', e.target.value)} className="font-mono" />
        </Field>
        <Field label="API user" required>
          <Input value={c.username} onChange={(e) => set('username', e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Password">
          <SecretInput value={c.password} onChange={(v) => set('password', v)} placeholder="Vicidial API password" />
        </Field>
        <Field label="Campaigns" hint="Vicidial campaign IDs. Leave empty for all." className="sm:col-span-2">
          <TagInput value={c.campaigns} onChange={(v) => set('campaigns', v)} placeholder="WAKAD2BHK" />
        </Field>
        <Field label="Score into process">
          <Select options={processes} value={c.processId} onChange={(e) => set('processId', e.target.value)} />
        </Field>
        <Field label="Schedule">
          <Select options={SCHEDULES} value={c.schedule} onChange={(e) => set('schedule', e.target.value)} />
        </Field>
        <Field label="Skip calls shorter than" hint="Short calls rarely have anything to score.">
          <Input type="number" value={c.minDuration} onChange={(e) => set('minDuration', Number(e.target.value))} suffix="sec" />
        </Field>
        <Field label="Only during" hint="Runs outside this window are skipped.">
          <Input value={c.window} onChange={(e) => set('window', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

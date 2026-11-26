import { useState } from 'react';
import { Pause, PencilSimple, Plus, Prohibit, Pulse, Tag } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { Badge, Button, Card, DataTable, Field, Input, Modal, SkeletonRows, Switch, useToast } from '@/design-system';
import { DispositionsManager, DncManager } from '@/shared/patterns';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';

export function DispositionsPage() {
  const { data, loading } = useQuery(() => df.listDispositions(), []);
  return (
    <Page>
      <PageHeader title="Dispositions" description="Outcomes agents pick after each call. Grouped by category, with optional reasons and callbacks." />
      {loading ? (
        <Card padded={false}>
          <SkeletonRows rows={6} />
        </Card>
      ) : (
        <DispositionsManager items={data} features={{ categories: true, subDispositions: true }} />
      )}
    </Page>
  );
}

export function DncPage() {
  const { data, loading } = useQuery(() => df.listDnc(), []);
  return (
    <Page>
      <PageHeader title="Do Not Call" description="Numbers your agents and the dialler will never call. “DNC requested” calls are added here automatically." />
      {loading ? (
        <Card padded={false}>
          <SkeletonRows rows={6} />
        </Card>
      ) : (
        <DncManager rows={data} />
      )}
    </Page>
  );
}

export function StatusesPage() {
  const { data, loading, setData } = useQuery(() => df.listBreakCodes(), []);
  const [edit, setEdit] = useState(null);
  const toast = useToast();
  const save = (b) => {
    setData((all) => (b.id ? all.map((x) => (x.id === b.id ? b : x)) : [...all, { ...b, id: `brk_${Date.now()}`, usedToday: 0, avgMinutes: 0 }]));
    toast(b.id ? 'Status updated' : 'Status added');
    setEdit(null);
  };
  return (
    <Page>
      <PageHeader
        title="Agent statuses"
        description="Break and pause reasons agents pick from Take break. Over the max minutes, the agent turns red on the floor and shows in Needs attention."
        actions={
          <Button variant="brand" icon={Plus} onClick={() => setEdit({ name: '', countsAsBreak: true, maxMinutes: 10, active: true })}>
            Add status
          </Button>
        }
      />
      <Card padded={false}>
        <DataTable
          loading={loading}
          rows={data || []}
          pageSize={0}
          onRowClick={setEdit}
          columns={[
            { key: 'name', header: 'Name', render: (b) => <span className="font-medium text-ink">{b.name}</span> },
            {
              key: 'countsAsBreak',
              header: 'Counts as break',
              render: (b) => (
                <span onClick={(e) => e.stopPropagation()} role="presentation">
                  <Switch size="sm" checked={b.countsAsBreak} onChange={(v) => setData((all) => all.map((x) => (x.id === b.id ? { ...x, countsAsBreak: v } : x)))} />
                </span>
              ),
            },
            { key: 'maxMinutes', header: 'Max minutes', align: 'right', render: (b) => `${b.maxMinutes} min` },
            { key: 'usedToday', header: 'Used today', align: 'right', hideBelow: 'md' },
            { key: 'avgMinutes', header: 'Avg length', align: 'right', hideBelow: 'md', render: (b) => (b.avgMinutes ? <span className={b.avgMinutes > b.maxMinutes * 0.9 ? 'font-semibold text-warning' : ''}>{b.avgMinutes} min</span> : '—') },
            { key: 'active', header: 'Take-break menu', render: (b) => (b.active ? <span className="text-ink-2">Shown to agents</span> : <span className="text-ink-faint">Hidden</span>) },
            { key: 'x', header: '', align: 'right', render: () => <PencilSimple size={15} className="text-ink-faint" /> },
          ]}
        />
      </Card>
      <p className="mt-2 text-xs text-ink-muted">Statuses that do not count as a break (training, meetings) still show as Breaks in Agent performance, but are left out of break-limit alerts.</p>
      {edit && <StatusModal value={edit} onClose={() => setEdit(null)} onSave={save} />}
    </Page>
  );
}

function StatusModal({ value, onClose, onSave }) {
  const [b, setB] = useState(value);
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={value.id ? `Edit ${value.name}` : 'Add a status'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!b.name.trim() || !b.maxMinutes} onClick={() => onSave(b)}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" required>
          <Input autoFocus value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} placeholder="e.g. Prayer break" />
        </Field>
        <Field label="Max minutes" hint="After this, the agent shows red on the floor and supervisors are alerted.">
          <Input type="number" min={1} value={b.maxMinutes} onChange={(e) => setB({ ...b, maxMinutes: +e.target.value })} suffix="min" />
        </Field>
        <Switch checked={b.countsAsBreak} onChange={(v) => setB({ ...b, countsAsBreak: v })} label="Counts as break" description="Off for work time like training or team meetings." />
        <Switch checked={b.active} onChange={(v) => setB({ ...b, active: v })} label="Active" description="Hidden statuses do not show in the agent's Take break menu." />
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { PhoneIncoming, Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { Button, Card, DataTable, EmptyState, Field, Input, Modal, Select, Switch, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';

const blank = { did: '', label: '', group: 'Inbound Desk', strategy: 'Longest available', hours: 'Mon–Sat · 09:00–21:00', overflow: 'Voicemail', holdMusic: 'Calm piano', maxWait: 90, active: true };
const STRATEGIES = ['Longest available', 'Round robin', 'Last agent first', 'Ring all'];
const OVERFLOW = ['Voicemail', 'Callback request', 'Pune Sales', 'Mumbai Sales', 'Retention', 'Hang up with message'];
const MUSIC = ['Calm piano', 'RR Parko jingle', 'None (ringback)'];

export default function InboundPage() {
  const { data, loading, setData } = useQuery(() => df.listInbound(), []);
  const [edit, setEdit] = useState(null);
  const toast = useToast();
  const waiting = (data?.routes || []).reduce((a, r) => a + r.waiting, 0);
  const save = (r) => {
    setData((d) => ({ ...d, routes: r.id ? d.routes.map((x) => (x.id === r.id ? r : x)) : [...d.routes, { ...r, id: `in_${Date.now()}`, waiting: 0 }] }));
    toast(r.id ? 'Routing saved' : 'Line added');
    setEdit(null);
  };

  return (
    <Page>
      <PageHeader
        title="Inbound routing"
        description={loading ? 'What happens when someone calls one of your lines.' : `${data.routes.filter((r) => r.active).length} of ${data.routes.length} lines taking calls · ${waiting} callers waiting now. Click a line to change who it rings and what happens if nobody answers.`}
        actions={
          <Button variant="brand" icon={Plus} onClick={() => setEdit(blank)}>
            Route a line
          </Button>
        }
      />
      <Card padded={false} className="overflow-hidden">
        <DataTable
          loading={loading}
          rows={data?.routes || []}
          pageSize={0}
          onRowClick={setEdit}
          rowClassName={(r) => (!r.active ? 'opacity-60' : '')}
          empty={<EmptyState icon={PhoneIncoming} title="No inbound lines yet" description="Route a line to a group so customer calls ring your agents." action={<Button variant="brand" icon={Plus} onClick={() => setEdit(blank)}>Route a line</Button>} />}
          columns={[
            { key: 'did', header: 'Line', render: (r) => <div><div className="font-mono text-[14px] font-semibold text-ink">{r.did}</div><div className="text-xs text-ink-muted">{r.label}</div></div> },
            { key: 'group', header: 'Rings', render: (r) => <div><div className="text-ink">{r.group}</div><div className="text-xs text-ink-muted">{r.strategy}</div></div> },
            { key: 'hours', header: 'Open', hideBelow: 'md', render: (r) => <span className="text-[13px]">{r.hours}</span> },
            { key: 'overflow', header: 'If nobody answers', hideBelow: 'lg', render: (r) => <span className="text-[13px]">{r.overflow} after {r.maxWait}s</span> },
            { key: 'holdMusic', header: 'Hold music', hideBelow: 'xl', render: (r) => <span className="text-[13px] text-ink-muted">{r.holdMusic}</span> },
            {
              key: 'waiting',
              header: 'Waiting now',
              align: 'right',
              sortable: true,
              render: (r) => (r.waiting ? <span className={cn('font-semibold', r.waiting > 2 ? 'text-danger' : 'text-warning')}>{r.waiting} {r.waiting === 1 ? 'caller' : 'callers'}</span> : <span className="text-ink-faint">—</span>),
            },
            {
              key: 'active',
              header: 'On',
              align: 'right',
              render: (r) => (
                <span onClick={(e) => e.stopPropagation()} role="presentation" className="inline-flex">
                  <Switch
                    size="sm"
                    checked={r.active}
                    onChange={(v) => {
                      setData((d) => ({ ...d, routes: d.routes.map((x) => (x.id === r.id ? { ...x, active: v } : x)) }));
                      toast(v ? `${r.did} now routes calls` : `${r.did} turned off`);
                    }}
                  />
                </span>
              ),
            },
          ]}
        />
      </Card>
      {edit && <RouteModal value={edit} groups={data.groups} onClose={() => setEdit(null)} onSave={save} />}
    </Page>
  );
}

function RouteModal({ value, groups, onClose, onSave }) {
  const [r, setR] = useState(value);
  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  return (
    <Modal
      open
      onClose={onClose}
      title={value.id ? `Routing for ${value.did}` : 'Route a line'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!r.did} onClick={() => onSave(r)}>
            Save routing
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Line (DID)" required>
          <Input value={r.did} onChange={(e) => set('did', e.target.value)} placeholder="1800 xxx xxxx" disabled={!!value.id} />
        </Field>
        <Field label="Label">
          <Input value={r.label} onChange={(e) => set('label', e.target.value)} placeholder="e.g. Website toll-free" />
        </Field>
        <Field label="Ring this group">
          <Select value={r.group} onChange={(e) => set('group', e.target.value)} options={groups.map((g) => g.name)} />
        </Field>
        <Field label="Who gets the call first">
          <Select value={r.strategy} onChange={(e) => set('strategy', e.target.value)} options={STRATEGIES} />
        </Field>
        <Field label="Business hours" className="sm:col-span-2" hint="Outside these hours, calls go straight to the overflow.">
          <Input value={r.hours} onChange={(e) => set('hours', e.target.value)} />
        </Field>
        <Field label="Max wait in queue">
          <Input type="number" value={r.maxWait} onChange={(e) => set('maxWait', +e.target.value)} suffix="sec" />
        </Field>
        <Field label="If nobody answers">
          <Select value={r.overflow} onChange={(e) => set('overflow', e.target.value)} options={OVERFLOW} />
        </Field>
        <Field label="Hold music" className="sm:col-span-2">
          <Select value={r.holdMusic} onChange={(e) => set('holdMusic', e.target.value)} options={MUSIC} />
        </Field>
      </div>
    </Modal>
  );
}

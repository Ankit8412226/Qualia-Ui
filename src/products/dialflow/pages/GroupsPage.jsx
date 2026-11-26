import { useState } from 'react';
import { Plus, UsersFour, PencilSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { Avatar, Button, Card, Checkbox, DataTable, Drawer, EmptyState, Field, Input, Modal, Textarea, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { StatePill } from '../components/agentState';

export default function GroupsPage() {
  const { data, loading, setData } = useQuery(() => df.listGroups(), []);
  const [edit, setEdit] = useState(null);
  const [open, setOpen] = useState(null);
  const toast = useToast();
  const agentsOf = (g) => (data?.agents || []).filter((a) => g.agents.includes(a.id));
  const didOf = (n) => data?.dids.find((d) => d.number === n);
  const badLines = (g) => g.dids.filter((n) => didOf(n) && didOf(n).verdict !== 'Healthy');
  const current = open && data?.groups.find((g) => g.id === open);

  const save = (g) => {
    setData((d) => ({ ...d, groups: g.id ? d.groups.map((x) => (x.id === g.id ? g : x)) : [...d.groups, { ...g, id: `grp_${Date.now()}`, campaigns: [] }] }));
    toast(g.id ? 'Group updated' : 'Group created');
    setEdit(null);
  };

  return (
    <Page>
      <PageHeader
        title="Agent groups"
        description="A group is a team plus the phone lines (DIDs) it calls from and answers. Click a group to see who is in it and how its lines are doing."
        actions={
          <Button variant="brand" icon={Plus} onClick={() => setEdit({ name: '', description: '', agents: [], dids: [], inbound: false })}>
            New group
          </Button>
        }
      />
      <Card padded={false} className="overflow-hidden">
        <DataTable
          loading={loading}
          rows={data?.groups || []}
          pageSize={0}
          onRowClick={(g) => setOpen(g.id)}
          empty={<EmptyState icon={UsersFour} title="No groups yet" description="Create a group to give agents lines to call from." />}
          columns={[
            { key: 'name', header: 'Group', render: (g) => <div><div className="font-semibold text-ink">{g.name}{g.inbound && <span className="ml-2 text-xs font-medium text-info">Inbound</span>}</div><div className="text-xs text-ink-muted">{g.description}</div></div> },
            {
              key: 'agents',
              header: 'Agents',
              align: 'right',
              sortable: true,
              sortValue: (g) => g.agents.length,
              render: (g) => {
                const list = agentsOf(g);
                return <span><span className="font-semibold text-ink">{list.length}</span> <span className="text-xs text-ink-muted">· {list.filter((a) => a.state !== 'Logged out').length} online</span></span>;
              },
            },
            {
              key: 'dids',
              header: 'Lines',
              render: (g) => {
                const bad = badLines(g);
                return (
                  <span className="text-[13px]">
                    {g.dids.length} {g.dids.length === 1 ? 'line' : 'lines'}
                    {bad.length > 0 && <span className="ml-1.5 font-medium text-danger">· {bad.length} need attention</span>}
                  </span>
                );
              },
            },
            { key: 'campaigns', header: 'Campaigns', hideBelow: 'lg', render: (g) => <span className="text-[13px] text-ink-2">{g.campaigns.length ? g.campaigns.length : '—'}</span> },
            {
              key: 'x',
              header: '',
              align: 'right',
              render: (g) => (
                <span onClick={(e) => e.stopPropagation()} role="presentation">
                  <Button size="xs" variant="ghost" icon={PencilSimple} onClick={() => setEdit(g)}>
                    Edit
                  </Button>
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        open={!!current}
        onClose={() => setOpen(null)}
        width={520}
        title={current?.name || ''}
        subtitle={current?.description}
        footer={
          current && (
            <Button
              icon={PencilSimple}
              onClick={() => {
                setOpen(null);
                setEdit(current);
              }}
            >
              Edit group
            </Button>
          )
        }
      >
        {current && (
          <div className="flex flex-col gap-6 p-6">
            <div>
              <div className="mb-2 text-sm font-semibold">Lines</div>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {current.dids.map((n) => {
                  const d = didOf(n);
                  return (
                    <li key={n} className="flex items-center justify-between px-3 py-2.5">
                      <span className="font-mono text-sm">{n}</span>
                      <span className={cn('text-xs font-medium', !d || d.verdict === 'Healthy' ? 'text-success' : 'text-danger')}>{d ? `${d.verdict} · ${d.connectToday}% connect` : 'Healthy'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between text-sm font-semibold">
                Agents · {agentsOf(current).length}
                <span className="text-xs font-normal text-ink-muted">{agentsOf(current).filter((a) => a.state !== 'Logged out').length} online now</span>
              </div>
              <ul className="flex flex-col">
                {agentsOf(current).map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5 py-1.5">
                    <Avatar name={a.name} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                    <StatePill state={a.state} size="xs" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Drawer>
      {edit && <GroupModal group={edit} agents={data.agents} dids={data.dids} onClose={() => setEdit(null)} onSave={save} />}
    </Page>
  );
}

function GroupModal({ group, agents, dids, onClose, onSave }) {
  const [g, setG] = useState(group);
  const tog = (k, v) => setG((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={group.id ? `Edit ${group.name}` : 'New group'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!g.name || !g.dids.length} onClick={() => onSave(g)}>
            Save group
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            <Input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
          </Field>
          <Field label="Description" optional>
            <Textarea rows={2} value={g.description} onChange={(e) => setG({ ...g, description: e.target.value })} />
          </Field>
          <Field label="Lines (DIDs)" required hint="Outbound calls rotate across these; inbound calls on them ring this group.">
            <div className="flex flex-col gap-2">
              {dids.map((d) => (
                <Checkbox key={d.id} checked={g.dids.includes(d.number)} onChange={() => tog('dids', d.number)} label={d.number} description={`${d.type} · ${d.verdict}`} />
              ))}
            </div>
          </Field>
        </div>
        <Field label={`Agents · ${g.agents.length}`}>
          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-line p-2">
            {agents.map((a) => (
              <div key={a.id} className="rounded-lg px-1.5 py-1.5 hover:bg-surface-2">
                <Checkbox checked={g.agents.includes(a.id)} onChange={() => tog('agents', a.id)} label={a.name} description={a.group} />
              </div>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

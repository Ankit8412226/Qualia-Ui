import { cn } from '@/lib/cn';
import { useState } from 'react';
import { DotsThree, Key, MegaphoneSimple, Megaphone, PencilSimple, Plus, Prohibit, UserPlus, UsersThree } from '@phosphor-icons/react';
import { fmtDuration, fmtRelative } from '@/lib/format';
import { useFilteredRows, useQuery, useTick } from '@/lib/hooks';
import { Avatar, Badge, Button, Callout, Card, Checkbox, CopyField, DataTable, Field, FilterBar, FilterSelect, IconButton, Input, Menu, Modal, Select, scoreTone, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { AGENT_STATES, StatePill, secondsSince } from '../components/agentState';
import { HuddleModal } from '../components/HuddleModal';

const genPassword = () => `Df-${Math.random().toString(36).slice(2, 6)}${Math.floor(Math.random() * 90 + 10)}!`;

export default function AgentsPage() {
  const { data, loading, setData } = useQuery(() => df.listAgents(), []);
  const { data: camps = [] } = useQuery(() => df.listCampaigns(), []);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [states, setStates] = useState([]);
  const [sel, setSel] = useState([]);
  const [creating, setCreating] = useState(false);
  const [assign, setAssign] = useState(null);
  const [huddle, setHuddle] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const t = useTick(5000);
  const rows = useFilteredRows(data, { search, fields: ['name', 'id'], filters: { group: groups, state: states } });
  const campName = (id) => camps.find((c) => c.id === id)?.name || id;

  return (
    <Page>
      <PageHeader
        title="Agents"
        description={loading ? 'Your calling team.' : `${(data || []).length} agents · ${(data || []).filter((a) => a.state !== 'Logged out').length} logged in now · ${(data || []).filter((a) => a.qa < 60).length} below 60 QA. Select agents to assign campaigns or send a huddle.`}
        actions={
          <>
            <Button icon={MegaphoneSimple} onClick={() => setHuddle(true)}>
              Call a huddle
            </Button>
            <Button variant="brand" icon={UserPlus} onClick={() => setCreating(true)}>
              Add agent
            </Button>
          </>
        }
      />
      <FilterBar
        className="mb-4"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Name or agent ID"
        canReset={!!(search || groups.length || states.length)}
        onReset={() => {
          setSearch('');
          setGroups([]);
          setStates([]);
        }}
      >
        <FilterSelect label="Group" options={[...new Set((data || []).map((a) => a.group))]} value={groups} onChange={setGroups} />
        <FilterSelect label="Status" options={AGENT_STATES} value={states} onChange={setStates} />
      </FilterBar>
      <Card padded={false}>
        <DataTable
          loading={loading}
          rows={rows}
          selectable
          selected={sel}
          onSelectedChange={setSel}
          bulkActions={(ids) => (
            <>
              <Button size="sm" icon={Megaphone} onClick={() => setAssign(ids)}>
                Assign campaigns
              </Button>
              <Button size="sm" icon={MegaphoneSimple} onClick={() => setHuddle(true)}>
                Huddle
              </Button>
            </>
          )}
          pageSize={12}
          columns={[
            { key: 'name', header: 'Agent', sortable: true, render: (a) => <div className="flex items-center gap-2.5"><Avatar name={a.name} size="sm" /><div><div className="font-medium text-ink">{a.name}{!a.active && <Badge size="xs" className="ml-2">Disabled</Badge>}</div><div className="font-mono text-xs text-ink-muted">{a.id}</div></div></div> },
            { key: 'state', header: 'Status', render: (a) => <StatePill state={a.state} /> },
            {
              key: 'break',
              header: 'Current break',
              hideBelow: 'md',
              render: (a) => {
                if (a.state !== 'Paused') return <span className="text-ink-faint">—</span>;
                const s = secondsSince(a.stateSince, t);
                const over = s > a.breakLimit * 60;
                return <span className={over ? 'font-semibold text-danger' : 'text-ink-2'}>{a.breakReason} · {fmtDuration(s)}</span>;
              },
            },
            { key: 'callsToday', header: 'Calls today', align: 'right', sortable: true },
            { key: 'campaigns', header: 'Campaigns', hideBelow: 'lg', render: (a) => <span className="text-[13px] text-ink-2">{campName(a.campaigns[0])}{a.campaigns.length > 1 && <span className="text-ink-muted"> +{a.campaigns.length - 1}</span>}</span> },
            { key: 'qa', header: 'QA score', align: 'right', sortable: true, render: (a) => <span className={cn('font-semibold', { success: 'text-success', warning: 'text-warning', danger: 'text-danger' }[scoreTone(a.qa)])}>{a.qa}</span> },
            { key: 'lastLogin', header: 'Last login', hideBelow: 'xl', render: (a) => <span className="text-xs">{fmtRelative(a.lastLogin)}</span> },
            {
              key: 'x',
              header: '',
              align: 'right',
              render: (a) => (
                <Menu
                  trigger={({ toggle }) => <IconButton icon={DotsThree} label="More" size="sm" onClick={toggle} />}
                  items={[
                    { label: 'Assign campaigns', icon: Megaphone, onClick: () => setAssign([a.id]) },
                    { label: 'Reset password', icon: Key, onClick: () => toast({ title: 'New password', description: `${a.id}: ${genPassword()} (shown once)`, duration: 8000 }) },
                    { label: 'Edit', icon: PencilSimple, onClick: () => toast('Editing opens here') },
                    { divider: true },
                    {
                      label: a.active ? 'Disable' : 'Enable',
                      icon: Prohibit,
                      tone: a.active ? 'danger' : undefined,
                      onClick: async () => {
                        if (!a.active || (await confirm({ title: `Disable ${a.name}?`, message: 'They will be logged out and cannot sign in. Call history stays.', tone: 'danger', confirmLabel: 'Disable' }))) {
                          setData((all) => all.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x)));
                          toast(a.active ? 'Agent disabled' : 'Agent enabled');
                        }
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <CreateAgentModal open={creating} onClose={() => setCreating(false)} camps={camps} groups={[...new Set((data || []).map((a) => a.group))]} onCreate={(a) => setData((all) => [a, ...all])} />
      <AssignModal
        ids={assign}
        camps={camps}
        agents={data || []}
        onClose={() => setAssign(null)}
        onSave={(ids, campaigns) => {
          setData((all) => all.map((a) => (ids.includes(a.id) ? { ...a, campaigns } : a)));
          setAssign(null);
          setSel([]);
          toast(`Campaigns updated for ${ids.length} agent${ids.length > 1 ? 's' : ''}`);
        }}
      />
      <HuddleModal open={huddle} onClose={() => setHuddle(false)} agents={data || []} />
    </Page>
  );
}

function CreateAgentModal({ open, onClose, onCreate, camps, groups }) {
  const [f, setF] = useState({ name: '', phone: '', group: '', campaigns: [] });
  const [created, setCreated] = useState(null);
  const close = () => {
    setCreated(null);
    setF({ name: '', phone: '', group: '', campaigns: [] });
    onClose();
  };
  const create = () => {
    const id = `AG-${1300 + Math.floor(Math.random() * 600)}`;
    const pw = genPassword();
    onCreate({ id, name: f.name, group: f.group, state: 'Logged out', stateSince: new Date(), campaigns: f.campaigns, callsToday: 0, talkToday: 0, connectedToday: 0, qa: 0, active: true, lastLogin: null, extension: '—' });
    setCreated({ id, pw });
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={created ? 'Agent created' : 'Add an agent'}
      description={created ? 'Share these with the agent. The password is shown only once.' : 'They sign in to the workspace with an Agent ID and password.'}
      footer={
        created ? (
          <Button variant="brand" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button variant="brand" disabled={!f.name || !f.group} onClick={create} icon={Plus}>
              Create agent
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="flex flex-col gap-4">
          <Field label="Agent ID">
            <CopyField value={created.id} />
          </Field>
          <Field label="Temporary password">
            <CopyField value={created.pw} />
          </Field>
          <Callout tone="warning">Copy the password now. After you close this, you can only reset it.</Callout>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Full name" required>
            <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Sanjana Rao" />
          </Field>
          <Field label="Mobile" optional hint="For login OTP and break alerts.">
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="98xxx xxxxx" />
          </Field>
          <Field label="Agent group" required>
            <Select value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })} options={groups} placeholder="Choose a group" />
          </Field>
          <Field label="Campaigns">
            <div className="grid gap-2 sm:grid-cols-2">
              {camps.filter((c) => c.status !== 'Completed').map((c) => (
                <Checkbox key={c.id} checked={f.campaigns.includes(c.id)} onChange={(on) => setF({ ...f, campaigns: on ? [...f.campaigns, c.id] : f.campaigns.filter((x) => x !== c.id) })} label={c.name} />
              ))}
            </div>
          </Field>
        </div>
      )}
    </Modal>
  );
}

function AssignModal({ ids, camps, agents, onClose, onSave }) {
  const first = agents.find((a) => a.id === ids?.[0]);
  const [picked, setPicked] = useState(null);
  const value = picked ?? first?.campaigns ?? [];
  if (!ids) return null;
  return (
    <Modal
      open={!!ids}
      onClose={() => { setPicked(null); onClose(); }}
      size="sm"
      title="Assign campaigns"
      description={ids.length > 1 ? `${ids.length} agents. This replaces their current campaigns.` : first?.name}
      footer={
        <>
          <Button onClick={() => { setPicked(null); onClose(); }}>Cancel</Button>
          <Button variant="brand" onClick={() => { onSave(ids, value); setPicked(null); }}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {camps.filter((c) => c.status !== 'Completed').map((c) => (
          <Checkbox key={c.id} checked={value.includes(c.id)} onChange={(on) => setPicked(on ? [...value, c.id] : value.filter((x) => x !== c.id))} label={c.name} description={`${c.dialMethod} · ${c.group}`} />
        ))}
      </div>
    </Modal>
  );
}

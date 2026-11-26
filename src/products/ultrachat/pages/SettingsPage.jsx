import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowsClockwise, Bell, Buildings, Camera, Envelope, Key, Plugs, Plus, SealCheck, Trash, UserPlus, UsersThree, WebhooksLogo } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtRelative } from '@/lib/format';
import { Avatar, Badge, Button, Card, CardHeader, Checkbox, CopyField, DataTable, Field, FormSection, Input, Menu, Modal, Select, Skeleton, StatusBadge, Switch, Tabs, TagInput, Textarea, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { getSettings } from '@/services/ultrachat';

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'business';
  const { data, loading } = useQuery(() => getSettings(), []);
  return (
    <Page>
      <PageHeader title="Settings" description="Your WhatsApp business profile, team and connections.">
        <Tabs
          value={tab}
          onChange={(t) => setParams({ tab: t }, { replace: true })}
          tabs={[
            { id: 'business', label: 'Business profile', icon: Buildings },
            { id: 'team', label: 'Team', icon: UsersThree },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'integrations', label: 'Integrations', icon: Plugs },
          ]}
        />
      </PageHeader>
      {loading || !data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : tab === 'business' ? (
        <Business data={data} />
      ) : tab === 'team' ? (
        <Team team={data.team} />
      ) : tab === 'notifications' ? (
        <Notifications />
      ) : (
        <Integrations data={data.integrations} />
      )}
    </Page>
  );
}

function Business({ data }) {
  const toast = useToast();
  const [b, setB] = useState(data.business);
  const set = (p) => setB((x) => ({ ...x, ...p }));
  return (
    <Card className="py-2">
      <FormSection title="Profile photo" description="Square, at least 640 × 640 px. Shown in every chat.">
        <div className="flex items-center gap-4">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand font-display text-2xl font-extrabold text-brand-ink">RP</span>
          <Button variant="secondary" icon={Camera} onClick={() => toast('Logo updated')}>
            Change logo
          </Button>
        </div>
      </FormSection>
      <FormSection title="Display name" description="Changing it needs Meta’s approval again (1–3 days). Messages keep sending meanwhile.">
        <Field label="WhatsApp display name" action={<Badge tone="success" icon={SealCheck}>Approved</Badge>}>
          <Input value={b.displayName} onChange={(e) => set({ displayName: e.target.value })} />
        </Field>
        <div className="text-xs text-ink-muted">
          Number {b.number} · WABA ID <span className="font-mono">{b.wabaId}</span>
        </div>
      </FormSection>
      <FormSection title="About & details" description="Customers see this when they tap your name.">
        <Field label="About" hint={`${b.about.length}/139`}>
          <Input value={b.about} maxLength={139} onChange={(e) => set({ about: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea rows={3} value={b.description} maxLength={512} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={b.category} onChange={(e) => set({ category: e.target.value })} options={['Real estate', 'Finance', 'Education', 'Retail', 'Travel', 'Healthcare', 'Other']} />
          </Field>
          <Field label="Website">
            <Input value={b.website} onChange={(e) => set({ website: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={b.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Address">
            <Input value={b.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
        </div>
      </FormSection>
      <div className="flex justify-end gap-2 border-t border-line pt-4 pb-2">
        <Button variant="secondary" onClick={() => setB(data.business)}>
          Discard
        </Button>
        <Button variant="brand" onClick={() => toast({ title: 'Profile saved', description: 'Updates show on WhatsApp within a few minutes.' })}>
          Save profile
        </Button>
      </div>
    </Card>
  );
}

function Team({ team }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState(team);
  const [invite, setInvite] = useState(false);
  const [emails, setEmails] = useState([]);
  const [role, setRole] = useState('Agent');
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-5 pb-3">
        <div>
          <h3 className="text-[15px] font-bold">Members</h3>
          <p className="text-xs text-ink-muted">Admins see everything. Agents see only the inbox and templates.</p>
        </div>
        <Button variant="brand" icon={UserPlus} onClick={() => setInvite(true)}>
          Invite
        </Button>
      </div>
      <DataTable
        rows={rows}
        pageSize={0}
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (u) => (
              <span className="flex items-center gap-3">
                <Avatar name={u.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{u.name}</span>
                  <span className="block truncate text-xs text-ink-muted">{u.email}</span>
                </span>
              </span>
            ),
          },
          {
            key: 'role',
            header: 'Role',
            render: (u) => (
              <Select
                size="sm"
                value={u.role}
                className="w-28"
                onChange={(e) => {
                  setRows((all) => all.map((x) => (x.id === u.id ? { ...x, role: e.target.value } : x)));
                  toast(`${u.name} is now ${e.target.value === 'Admin' ? 'an admin' : 'an agent'}`);
                }}
                options={['Admin', 'Agent']}
              />
            ),
          },
          { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status === 'Invited' ? 'Pending' : 'Active'} /> },
          { key: 'lastActive', header: 'Last active', hideBelow: 'md', render: (u) => <span className="text-xs text-ink-muted">{u.status === 'Invited' ? 'Invite sent' : fmtRelative(u.lastActive)}</span> },
          {
            key: 'x',
            header: '',
            align: 'right',
            render: (u) =>
              u.role !== 'Admin' || rows.filter((r) => r.role === 'Admin').length > 1 ? (
                <Menu
                  trigger={({ toggle }) => (
                    <Button size="xs" variant="ghost" onClick={toggle}>
                      Manage
                    </Button>
                  )}
                  items={[
                    u.status === 'Invited' && { label: 'Resend invite', icon: Envelope, onClick: () => toast('Invite sent again') },
                    {
                      label: 'Remove from team',
                      icon: Trash,
                      tone: 'danger',
                      onClick: async () => {
                        if (await confirm({ title: `Remove ${u.name}?`, message: 'Their open chats move to Unassigned.', tone: 'danger', confirmLabel: 'Remove' })) {
                          setRows((all) => all.filter((x) => x.id !== u.id));
                          toast(`${u.name} removed`);
                        }
                      },
                    },
                  ]}
                />
              ) : null,
          },
        ]}
      />
      <Modal
        open={invite}
        onClose={() => setInvite(false)}
        icon={UserPlus}
        title="Invite teammates"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInvite(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={!emails.length}
              onClick={() => {
                setRows((all) => [...all, ...emails.map((e, i) => ({ id: `inv_${Date.now()}_${i}`, name: e.split('@')[0], email: e, role, status: 'Invited' }))]);
                toast(`${emails.length} invite${emails.length > 1 ? 's' : ''} sent`);
                setEmails([]);
                setInvite(false);
              }}
            >
              Send invites
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Email addresses" hint="Press Enter after each.">
            <TagInput value={emails} onChange={setEmails} placeholder="name@rrparko.in" />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)} options={[{ value: 'Agent', label: 'Agent · inbox and templates' }, { value: 'Admin', label: 'Admin · everything incl. wallet' }]} />
          </Field>
        </div>
      </Modal>
    </Card>
  );
}

const NOTIFS = [
  ['New chat assigned to me', true, true],
  ['Customer waiting over 15 minutes', true, true],
  ['AI bot handed over a chat', true, false],
  ['Campaign finished or failed', true, true],
  ['Template approved or rejected', true, true],
  ['Wallet below ₹5,000', true, true],
  ['Number quality rating dropped', true, true],
];

function Notifications() {
  const toast = useToast();
  const [rows, setRows] = useState(NOTIFS);
  const [digest, setDigest] = useState(true);
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_80px] items-center border-b border-line bg-surface-2 px-5 py-2.5 text-xs font-semibold text-ink-muted">
        <span>Notify me when</span>
        <span className="text-center">In app</span>
        <span className="text-center">Email</span>
      </div>
      {rows.map(([label, app, email], i) => (
        <div key={label} className="grid grid-cols-[1fr_80px_80px] items-center border-b border-line/70 px-5 py-3 last:border-0">
          <span className="text-sm text-ink-2">{label}</span>
          <span className="flex justify-center">
            <Switch size="sm" checked={app} onChange={(v) => setRows((r) => r.map((x, j) => (j === i ? [x[0], v, x[2]] : x)))} />
          </span>
          <span className="flex justify-center">
            <Switch size="sm" checked={email} onChange={(v) => setRows((r) => r.map((x, j) => (j === i ? [x[0], x[1], v] : x)))} />
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 border-t border-line p-4">
        <Checkbox checked={digest} onChange={setDigest} label="Daily summary email at 9 AM" />
        <Button variant="brand" onClick={() => toast('Notification settings saved')}>
          Save
        </Button>
      </div>
    </Card>
  );
}

function Integrations({ data }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [hooks, setHooks] = useState(data.webhooks);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ url: 'https://', events: ['message.received'] });
  const [key, setKey] = useState(data.apiKey);
  useEffect(() => setHooks(data.webhooks), [data.webhooks]);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Zoho CRM" subtitle={data.zoho.account} icon={Plugs} actions={<Badge tone="success" dot>Connected</Badge>} />
        <p className="text-[13px] text-ink-2">Contacts, opt-in status, labels and AI-captured lead fields sync both ways. Last sync {fmtRelative(data.zoho.lastSync)}.</p>
        <ul className="mt-4 flex flex-col gap-2 text-xs">
          {data.zoho.mapping.map(([a, b]) => (
            <li key={a} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
              <span className="text-ink-2">{a}</span>
              <span className="font-mono text-ink-muted">→ {b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" icon={ArrowsClockwise} onClick={() => toast('Sync started')}>
            Sync now
          </Button>
          <Button
            variant="danger-soft"
            onClick={async () => {
              if (await confirm({ title: 'Disconnect Zoho CRM?', message: 'Syncing stops. Data already in both systems stays.', tone: 'danger', confirmLabel: 'Disconnect' })) toast('Zoho CRM disconnected');
            }}
          >
            Disconnect
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="API key" subtitle="Send messages and read reports from your own systems." icon={Key} />
        <CopyField value={key} />
        <p className="mt-2 text-xs text-ink-muted">Keep it secret. Anyone with this key can send messages from your number.</p>
        <Button
          className="mt-4"
          variant="secondary"
          icon={ArrowsClockwise}
          onClick={async () => {
            if (await confirm({ title: 'Regenerate API key?', message: 'The current key stops working immediately. Update your systems with the new one.', tone: 'danger', confirmLabel: 'Regenerate' })) {
              setKey(`uc_live_${Math.random().toString(16).slice(2, 22)}`);
              toast('New API key created');
            }
          }}
        >
          Regenerate
        </Button>
      </Card>

      <Card padded={false} className="overflow-hidden xl:col-span-2">
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <CardHeader className="mb-0" title="Webhooks" subtitle="We POST events to your URL as they happen." icon={WebhooksLogo} />
          <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)}>
            Add webhook
          </Button>
        </div>
        <DataTable
          rows={hooks}
          pageSize={0}
          columns={[
            { key: 'url', header: 'URL', render: (h) => <span className="font-mono text-xs text-ink">{h.url}</span> },
            {
              key: 'events',
              header: 'Events',
              hideBelow: 'md',
              render: (h) => (
                <span className="flex flex-wrap gap-1">
                  {h.events.map((e) => (
                    <Badge key={e} size="xs">
                      {e}
                    </Badge>
                  ))}
                </span>
              ),
            },
            { key: 'status', header: 'Status', render: (h) => <StatusBadge status={h.status === 'Failing' ? 'Failed' : h.status} /> },
            { key: 'lastDelivery', header: 'Last delivery', hideBelow: 'lg', render: (h) => <span className="text-xs text-ink-muted">{fmtRelative(h.lastDelivery)}</span> },
            {
              key: 'x',
              header: '',
              align: 'right',
              render: (h) => (
                <Button size="xs" variant="ghost" onClick={() => toast({ title: 'Test event sent', description: h.status === 'Failing' ? 'Your server returned 500.' : 'Your server returned 200 OK.', tone: h.status === 'Failing' ? 'error' : 'success' })}>
                  Send test
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        icon={WebhooksLogo}
        title="Add webhook"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={!/^https:\/\/.+\..+/.test(draft.url) || !draft.events.length}
              onClick={() => {
                setHooks((all) => [...all, { id: `wh_${Date.now()}`, ...draft, status: 'Healthy', lastDelivery: new Date() }]);
                toast('Webhook added');
                setAdding(false);
              }}
            >
              Add webhook
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Endpoint URL" hint="Must be HTTPS.">
            <Input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className="font-mono" />
          </Field>
          <Field label="Events">
            <div className="grid gap-2 sm:grid-cols-2">
              {['message.received', 'message.status', 'lead.captured', 'conversation.assigned', 'conversation.resolved', 'optin.changed'].map((e) => (
                <Checkbox key={e} checked={draft.events.includes(e)} onChange={(on) => setDraft({ ...draft, events: on ? [...draft.events, e] : draft.events.filter((x) => x !== e) })} label={<span className="font-mono text-xs">{e}</span>} />
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

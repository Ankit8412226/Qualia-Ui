import { useState } from 'react';
import { ArrowsClockwise, DotsThreeVertical, Megaphone, PencilSimple, Plus, Trash, UsersThree } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@/lib/hooks';
import { fmtNumber, fmtRelative } from '@/lib/format';
import { AvatarStack, Button, Card, CopyField, EmptyState, Field, IconTile, Input, Menu, Modal, Progress, SearchInput, Skeleton, Switch, TagInput, Textarea, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listGroups } from '@/services/ultrachat';

const BLANK = { name: '', description: '', admins: ['Riya Malhotra'], members: [], adminsOnly: true, approve: false };

export default function GroupsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, setData } = useQuery(() => listGroups(), []);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // group draft
  const rows = (data || []).filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()));

  const save = () => {
    if (editing.id) {
      setData((all) => all.map((g) => (g.id === editing.id ? { ...g, ...editing, members: g.members + editing.newMembers.length } : g)));
      toast(`${editing.name} updated`);
    } else {
      const id = `gr_${Date.now()}`;
      setData((all) => [{ ...editing, id, members: editing.newMembers.length + 1, capacity: 1024, createdAt: new Date(), lastActivity: new Date(), invite: `https://chat.whatsapp.com/Prk${id.slice(-6)}New` }, ...all]);
      toast({ title: 'Group created', description: 'Share the invite link to add people.' });
    }
    setEditing(null);
  };

  return (
    <Page>
      <PageHeader
        title="WhatsApp groups"
        description="Groups your business number manages. Use them for residents, channel partners or event attendees."
        actions={
          <Button variant="brand" icon={Plus} onClick={() => setEditing({ ...BLANK, newMembers: [] })}>
            Create group
          </Button>
        }
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search groups" className="mb-5 w-full sm:w-72" />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={UsersThree} title={search ? 'No groups match' : 'No groups yet'} description="Create a group and share its invite link. Members can be messaged together in campaigns." action={<Button variant="brand" icon={Plus} onClick={() => setEditing({ ...BLANK, newMembers: [] })}>Create group</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((g) => (
            <Card key={g.id} className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <IconTile icon={UsersThree} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-bold">{g.name}</h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{g.description}</p>
                </div>
                <Menu
                  trigger={({ toggle }) => (
                    <button onClick={toggle} aria-label="Group actions" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink">
                      <DotsThreeVertical size={18} weight="bold" />
                    </button>
                  )}
                  items={[
                    { label: 'Edit', icon: PencilSimple, onClick: () => setEditing({ ...g, newMembers: [] }) },
                    { label: 'Send a campaign', icon: Megaphone, onClick: () => navigate('/ultrachat/campaigns/new') },
                    {
                      label: 'Reset invite link',
                      icon: ArrowsClockwise,
                      onClick: async () => {
                        if (await confirm({ title: 'Reset invite link?', message: 'The old link stops working. People already in the group stay.', confirmLabel: 'Reset link' })) {
                          setData((all) => all.map((x) => (x.id === g.id ? { ...x, invite: `${x.invite.slice(0, -4)}${Math.random().toString(36).slice(2, 6)}` } : x)));
                          toast('New invite link created');
                        }
                      },
                    },
                    { divider: true },
                    {
                      label: 'Delete group',
                      icon: Trash,
                      tone: 'danger',
                      onClick: async () => {
                        if (await confirm({ title: `Delete ${g.name}?`, message: 'All members are removed and the chat history is lost for your number.', tone: 'danger', confirmLabel: 'Delete group' })) {
                          setData((all) => all.filter((x) => x.id !== g.id));
                          toast(`${g.name} deleted`);
                        }
                      },
                    },
                  ]}
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span>
                    <b className="font-display text-lg tabular text-ink">{fmtNumber(g.members)}</b> <span className="text-ink-muted">members</span>
                  </span>
                  <span className="text-ink-faint">limit {fmtNumber(g.capacity)}</span>
                </div>
                <Progress value={g.members} max={g.capacity} size="sm" tone={g.members / g.capacity > 0.9 ? 'warning' : 'brand'} />
              </div>
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="flex items-center gap-2">
                  <AvatarStack names={g.admins} size="sm" max={3} /> {g.admins.length} admin{g.admins.length > 1 ? 's' : ''}
                </span>
                <span>Active {fmtRelative(g.lastActivity)}</span>
              </div>
              <CopyField value={g.invite} className="mt-auto" />
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        icon={UsersThree}
        title={editing?.id ? `Edit ${editing.name}` : 'Create group'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="brand" disabled={!editing?.name?.trim()} onClick={save}>
              {editing?.id ? 'Save changes' : 'Create group'}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <Field label="Group name" required>
              <Input autoFocus value={editing.name} maxLength={100} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Site visit — this weekend" />
            </Field>
            <Field label="Description" optional>
              <Textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Add members" hint="Phone numbers, press Enter after each. Only opted-in contacts are added.">
              <TagInput value={editing.newMembers} onChange={(newMembers) => setEditing({ ...editing, newMembers })} placeholder="98201 44120" />
            </Field>
            <Field label="Admins">
              <TagInput value={editing.admins} onChange={(admins) => setEditing({ ...editing, admins })} />
            </Field>
            <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
              <Switch size="sm" checked={editing.adminsOnly} onChange={(adminsOnly) => setEditing({ ...editing, adminsOnly })} label="Only admins can send messages" description="Good for announcements." />
              <Switch size="sm" checked={editing.approve} onChange={(approve) => setEditing({ ...editing, approve })} label="Approve new members" description="People joining by link wait for an admin." />
            </div>
          </div>
        )}
      </Modal>
    </Page>
  );
}

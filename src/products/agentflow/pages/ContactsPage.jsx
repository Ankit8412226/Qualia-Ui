import { useMemo, useState } from 'react';
import { AddressBook, Phone, Plus, UploadSimple, UserCircle } from '@phosphor-icons/react';
import { fmtDate, fmtDateTime, fmtDuration, fmtNumber, fmtPhone, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  DescriptionList,
  Drawer,
  EmptyState,
  FilterBar,
  FilterSelect,
  SkeletonRows,
  StatusBadge,
  useToast,
} from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer } from '@/shared/patterns';
import { getContactTimeline, listContacts } from '@/services/agentflow';

const DISPO_TONE = { Interested: 'success', 'Site visit booked': 'success', 'Call back later': 'warning', 'Not interested': 'danger', 'DNC requested': 'danger', 'No answer': 'neutral', Busy: 'neutral' };

export function DispositionBadge({ value }) {
  if (!value) return <span className="text-ink-faint">—</span>;
  return <Badge tone={DISPO_TONE[value] || 'neutral'}>{value}</Badge>;
}

export default function ContactsPage() {
  const { data, loading, error, reload } = useQuery(() => listContacts(), []);
  const [search, setSearch] = useState('');
  const [tags, setTags] = useState([]);
  const [dispos, setDispos] = useState([]);
  const [cities, setCities] = useState([]);
  const [open, setOpen] = useState(null);
  const toast = useToast();

  const all = data || [];
  const opts = useMemo(
    () => ({
      tags: [...new Set(all.flatMap((c) => c.tags))].sort(),
      dispos: [...new Set(all.map((c) => c.lastDisposition).filter(Boolean))].sort(),
      cities: [...new Set(all.map((c) => c.city))].sort(),
    }),
    [all],
  );
  const q = search.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const rows = all.filter(
    (c) =>
      (!q || c.name.toLowerCase().includes(q) || c.email.includes(q) || (digits && c.phone.includes(digits))) &&
      (!tags.length || c.tags.some((t) => tags.includes(t))) &&
      (!dispos.length || dispos.includes(c.lastDisposition)) &&
      (!cities.length || cities.includes(c.city)),
  );
  const canReset = !!(search || tags.length || dispos.length || cities.length);
  const reset = () => {
    setSearch('');
    setTags([]);
    setDispos([]);
    setCities([]);
  };

  return (
    <Page>
      <PageHeader
        title="Contacts"
        description="Everyone your AI agent has called or will call, across all campaigns."
        actions={
          <>
            <Button icon={UploadSimple} onClick={() => toast('Upload a CSV from a campaign to add contacts in bulk.')}>
              Import CSV
            </Button>
            <Button variant="brand" icon={Plus} onClick={() => toast({ title: 'Contact added', tone: 'success' })}>
              Add contact
            </Button>
          </>
        }
        meta={!loading && <span className="text-xs text-ink-muted">{fmtNumber(all.length)} contacts · {fmtNumber(all.filter((c) => c.calls).length)} called at least once</span>}
      />

      <Card padded={false} className="overflow-hidden">
        <div className="border-b border-line p-4">
          <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search name, phone or email" onReset={reset} canReset={canReset}>
            <FilterSelect label="Tag" options={opts.tags} value={tags} onChange={setTags} />
            <FilterSelect label="Last disposition" options={opts.dispos} value={dispos} onChange={setDispos} />
            <FilterSelect label="City" options={opts.cities} value={cities} onChange={setCities} searchable />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          onRowClick={setOpen}
          pageSize={12}
          empty={
            <EmptyState
              icon={AddressBook}
              title={canReset ? 'No contacts match' : 'No contacts yet'}
              description={canReset ? 'Try a different search or remove a filter.' : 'Upload a CSV in a new campaign and contacts will appear here.'}
              action={canReset ? <Button onClick={reset}>Reset filters</Button> : null}
              compact
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Name',
              sortable: true,
              render: (c) => (
                <span className="flex items-center gap-3">
                  <Avatar name={c.name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{c.name}</span>
                    <span className="block text-xs text-ink-muted">{c.city}</span>
                  </span>
                </span>
              ),
            },
            { key: 'phone', header: 'Phone', render: (c) => <span className="whitespace-nowrap tabular">{fmtPhone(c.phone)}</span> },
            {
              key: 'tags',
              header: 'Tags',
              hideBelow: 'lg',
              render: (c) =>
                c.tags.length ? (
                  <span className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <Badge key={t} size="xs">
                        {t}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  <span className="text-ink-faint">—</span>
                ),
            },
            { key: 'lastCallAt', header: 'Last call', sortable: true, sortValue: (c) => (c.lastCallAt ? +new Date(c.lastCallAt) : 0), hideBelow: 'md', render: (c) => <span className="whitespace-nowrap text-xs">{c.lastCallAt ? fmtRelative(c.lastCallAt) : 'Never'}</span> },
            { key: 'lastDisposition', header: 'Last disposition', render: (c) => <DispositionBadge value={c.lastDisposition} /> },
            {
              key: 'campaigns',
              header: 'Campaigns',
              hideBelow: 'xl',
              render: (c) => (
                <span className="block max-w-[220px] truncate text-xs" title={c.campaigns.map((x) => x.name).join(', ')}>
                  {c.campaigns[0]?.name || '—'}
                  {c.campaigns.length > 1 && <span className="ml-1 text-ink-muted">+{c.campaigns.length - 1}</span>}
                </span>
              ),
            },
          ]}
        />
      </Card>

      <ContactDrawer contact={open} onClose={() => setOpen(null)} />
    </Page>
  );
}

function ContactDrawer({ contact, onClose }) {
  const [call, setCall] = useState(null);
  const toast = useToast();
  const { data: timeline, loading, error, reload } = useQuery(() => (contact ? getContactTimeline(contact) : Promise.resolve([])), [contact?.id]);
  if (!contact) return null;
  return (
    <>
      <Drawer
        open={!!contact}
        onClose={onClose}
        width={520}
        title={
          <div className="flex items-center gap-3">
            <Avatar name={contact.name} size="lg" />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold">{contact.name}</div>
              <div className="text-sm tabular text-ink-muted">{fmtPhone(contact.phone)}</div>
            </div>
          </div>
        }
        footer={
          <>
            <Button onClick={onClose}>Close</Button>
            <Button variant="brand" icon={Phone} onClick={() => toast({ title: 'Test call queued', description: `Calling ${contact.name} with your default AI voice.`, tone: 'success' })}>
              Call with AI
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-wrap gap-1.5">
            <DispositionBadge value={contact.lastDisposition} />
            {contact.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <DescriptionList
            items={[
              { label: 'Email', value: contact.email },
              { label: 'City', value: contact.city },
              { label: 'Source', value: contact.source },
              { label: 'Added', value: fmtDate(contact.addedAt) },
              { label: 'Total calls', value: fmtNumber(contact.calls) },
              { label: 'Last call', value: contact.lastCallAt ? fmtDateTime(contact.lastCallAt) : 'Never' },
            ]}
          />
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Campaigns</h4>
            <div className="flex flex-wrap gap-1.5">
              {contact.campaigns.length ? contact.campaigns.map((c) => <Badge key={c.id} tone="brand">{c.name}</Badge>) : <span className="text-sm text-ink-muted">Not in any campaign</span>}
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">Call timeline</h4>
            {loading ? (
              <SkeletonRows rows={3} className="p-0" />
            ) : timeline?.length ? (
              <ol className="relative flex flex-col gap-2">
                {timeline.map((t, i) => (
                  <li key={t.id} className="relative pl-6">
                    {i < timeline.length - 1 && <span className="absolute left-[7px] top-6 h-[calc(100%-4px)] w-px bg-line" />}
                    <span className={`absolute left-0 top-4 h-3.5 w-3.5 rounded-full ring-4 ring-surface ${t.status === 'Completed' ? 'bg-success' : 'bg-line-strong'}`} />
                    <button type="button" onClick={() => setCall(t)} className="w-full rounded-xl border border-line p-3 text-left transition hover:border-line-strong hover:bg-surface-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">{t.campaign}</span>
                        <span className="shrink-0 text-xs text-ink-faint">{fmtDateTime(t.startedAt)}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                        <StatusBadge status={t.status} />
                        {t.status === 'Completed' && <DispositionBadge value={t.disposition} />}
                        {t.duration > 0 && <span>{fmtDuration(t.duration)}</span>}
                        <span>· {t.agent.name}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={UserCircle} title="No calls yet" description="Add this contact to a campaign to call them." compact />
            )}
          </div>
        </div>
      </Drawer>
      <CallDetailDrawer call={call} open={!!call} onClose={() => setCall(null)} />
    </>
  );
}

import { useMemo, useState } from 'react';
import { ArrowsClockwise, DownloadSimple, PaperPlaneTilt, UploadSimple, UserCheck, UserMinus, Plugs } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtDate, fmtNumber, fmtPercent, fmtPhone, fmtRelative } from '@/lib/format';
import { Avatar, Badge, Button, Card, CardHeader, DataTable, DateRangeFilter, Field, FilterBar, FilterSelect, MetricStrip, Modal, Select, Skeleton, StatusBadge, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { getZohoSync, listOptIns, listTemplates } from '@/services/ultrachat';
import { TemplateMessage } from '../components/PhonePreview';

export default function OptInsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, setData, error, reload } = useQuery(() => listOptIns(), []);
  const zoho = useQuery(() => getZohoSync(), []);
  const templates = useQuery(() => listTemplates(), []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState([]);
  const [source, setSource] = useState([]);
  const [range, setRange] = useState({ preset: '30d' });
  const [selected, setSelected] = useState([]);
  const [requestFor, setRequestFor] = useState(null); // ids
  const [tpl, setTpl] = useState('tp_optin');
  const [syncing, setSyncing] = useState(false);

  const rows = data || [];
  const filtered = useMemo(() => rows.filter((r) => (!status.length || status.includes(r.status)) && (!source.length || source.includes(r.source)) && (!search || `${r.name} ${r.phone}`.toLowerCase().includes(search.toLowerCase()))), [rows, status, source, search]);
  const count = (s) => rows.filter((r) => r.status === s).length;
  const optTemplates = (templates.data || []).filter((t) => t.status === 'Approved' && t.buttons.some((b) => b.type === 'quick'));
  const chosen = optTemplates.find((t) => t.id === tpl);

  const optOut = async (ids) => {
    if (!(await confirm({ title: ids.length > 1 ? `Opt out ${ids.length} contacts?` : 'Opt out this contact?', message: 'They won’t receive campaigns or templates until they opt in again. They can still message you.', tone: 'danger', confirmLabel: 'Opt out' }))) return;
    setData((all) => all.map((r) => (ids.includes(r.id) ? { ...r, status: 'Opted out', at: new Date() } : r)));
    setSelected([]);
    toast(`${ids.length} contact${ids.length > 1 ? 's' : ''} opted out`);
  };

  return (
    <Page>
      <PageHeader
        title="Opt-ins"
        description="WhatsApp needs a person’s permission before you message them first. Keep this list clean to protect your quality rating."
        actions={
          <>
            <Button variant="secondary" icon={UploadSimple} onClick={() => toast({ title: 'Import ready', description: 'Upload a CSV with phone and opt-in date columns.', tone: 'info' })}>
              Import
            </Button>
            <Button variant="brand" icon={PaperPlaneTilt} onClick={() => setRequestFor(rows.filter((r) => r.status !== 'Opted in' && r.status !== 'Opted out').map((r) => r.id))}>
              Send opt-in request
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {loading ? (
            <Skeleton className="h-20 rounded-2xl" />
          ) : (
            <MetricStrip
              items={[
                { label: 'Opted in', value: fmtNumber(count('Opted in') * 241), sub: fmtPercent((count('Opted in') / rows.length) * 100) + ' of contacts' },
                { label: 'Opted out', value: fmtNumber(count('Opted out') * 241), sub: '+38 this week' },
                { label: 'Pending', value: fmtNumber(count('Pending') * 241), sub: 'request sent, no reply' },
                { label: 'Opt-in reply rate', value: '41.2%', sub: 'to optin_request' },
              ]}
            />
          )}
          <Card padded={false} className="overflow-hidden">
            <FilterBar
              className="border-b border-line p-4"
              search={search}
              onSearch={setSearch}
              searchPlaceholder="Name or number"
              canReset={!!(search || status.length || source.length)}
              onReset={() => {
                setSearch('');
                setStatus([]);
                setSource([]);
              }}
            >
              <FilterSelect label="Status" options={['Opted in', 'Opted out', 'Pending']} value={status} onChange={setStatus} />
              <FilterSelect label="Source" options={[...new Set(rows.map((r) => r.source))]} value={source} onChange={setSource} />
              <DateRangeFilter value={range} onChange={setRange} />
            </FilterBar>
            <DataTable
              loading={loading}
          error={error}
          onRetry={reload}
              rows={filtered}
              selectable
              selected={selected}
              onSelectedChange={setSelected}
              bulkActions={(ids) => (
                <>
                  <Button size="xs" variant="secondary" icon={PaperPlaneTilt} onClick={() => setRequestFor(ids)}>
                    Send opt-in request
                  </Button>
                  <Button size="xs" variant="danger-soft" icon={UserMinus} onClick={() => optOut(ids)}>
                    Opt out
                  </Button>
                </>
              )}
              columns={[
                {
                  key: 'name',
                  header: 'Contact',
                  sortable: true,
                  render: (r) => (
                    <span className="flex items-center gap-3">
                      <Avatar name={r.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{r.name}</span>
                        <span className="block whitespace-nowrap text-xs tabular text-ink-muted">{fmtPhone(r.phone)}</span>
                      </span>
                    </span>
                  ),
                },
                { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
                { key: 'source', header: 'Source', hideBelow: 'md', render: (r) => <span className="text-[13px]">{r.source}</span> },
                { key: 'city', header: 'City', hideBelow: 'lg' },
                { key: 'at', header: 'Date', sortable: true, sortValue: (r) => r.at.valueOf(), render: (r) => <span className="whitespace-nowrap text-xs text-ink-muted">{fmtDate(r.at)}</span> },
                {
                  key: 'act',
                  header: '',
                  align: 'right',
                  render: (r) =>
                    r.status === 'Opted in' ? (
                      <Button size="xs" variant="ghost" onClick={() => optOut([r.id])}>
                        Opt out
                      </Button>
                    ) : (
                      <Button size="xs" variant="ghost" onClick={() => setRequestFor([r.id])}>
                        Ask again
                      </Button>
                    ),
                },
              ]}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Zoho CRM sync"
              subtitle={zoho.data ? zoho.data.account : 'Loading…'}
              icon={Plugs}
              actions={
                <Badge tone="success" dot>
                  Connected
                </Badge>
              }
            />
            {zoho.loading ? (
              <Skeleton className="h-32" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-surface-2 p-3">
                    <div className="text-2xs text-ink-muted">Contacts synced</div>
                    <div className="font-display text-lg font-bold tabular">{fmtNumber(zoho.data.synced)}</div>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-3">
                    <div className="text-2xs text-ink-muted">Last sync</div>
                    <div className="font-display text-lg font-bold">{fmtRelative(zoho.data.lastSync)}</div>
                  </div>
                </div>
                <ul className="mt-4 flex flex-col gap-2 text-xs">
                  {zoho.data.mapping.map(([a, b]) => (
                    <li key={a} className="flex items-center justify-between gap-2 border-b border-line/70 pb-2 last:border-0">
                      <span className="text-ink-2">{a}</span>
                      <span className="font-mono text-ink-muted">{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink-muted">Opt-outs sync both ways within 5 minutes, so Zoho campaigns respect them too.</p>
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  icon={ArrowsClockwise}
                  loading={syncing}
                  onClick={() => {
                    setSyncing(true);
                    setTimeout(() => {
                      setSyncing(false);
                      toast({ title: 'Sync complete', description: '42 contacts updated from Zoho CRM.' });
                    }, 1200);
                  }}
                >
                  Sync now
                </Button>
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Ways people opt in" icon={UserCheck} />
            <ul className="flex flex-col gap-2 text-[13px] text-ink-2">
              <li>• Reply “Yes” to the opt-in template</li>
              <li>• Tick the WhatsApp box on your website form</li>
              <li>• Click a WhatsApp ad and message you</li>
              <li>• Scan the QR code at the site office</li>
            </ul>
            <Button className="mt-4 w-full" variant="ghost" icon={DownloadSimple} onClick={() => toast('QR code downloaded')}>
              Download opt-in QR code
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        open={!!requestFor}
        onClose={() => setRequestFor(null)}
        icon={PaperPlaneTilt}
        title="Send opt-in request"
        description={`${fmtNumber(requestFor?.length || 0)} contacts will get a template asking for permission.`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRequestFor(null)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={!chosen || !requestFor?.length}
              onClick={() => {
                setData((all) => all.map((r) => (requestFor.includes(r.id) && r.status !== 'Opted in' ? { ...r, status: 'Pending' } : r)));
                toast({ title: 'Opt-in request sent', description: `${requestFor.length} contacts · replies update this list automatically.` });
                setRequestFor(null);
                setSelected([]);
              }}
            >
              Send to {fmtNumber(requestFor?.length || 0)}
            </Button>
          </>
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Field label="Template" hint="Needs quick-reply buttons so people can answer in one tap.">
              <Select value={tpl} onChange={(e) => setTpl(e.target.value)} options={optTemplates.map((t) => ({ value: t.id, label: t.name }))} />
            </Field>
            <div className="rounded-xl bg-surface-2 p-3 text-xs text-ink-2">
              “Yes” marks the contact <b>Opted in</b>. “No” or STOP marks them <b>Opted out</b>. No reply stays <b>Pending</b>.
            </div>
            {requestFor?.length === 0 && <p className="text-xs text-warning">Select contacts in the table first, or filter to Pending.</p>}
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">{chosen ? <TemplateMessage template={chosen} /> : null}</div>
        </div>
      </Modal>
    </Page>
  );
}

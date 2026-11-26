import { useState } from 'react';
import { ArrowsClockwise, DotsThree, DownloadSimple, FileCsv, ListChecks, Trash, UploadSimple } from '@phosphor-icons/react';
import { fmtDate, fmtDateTime, fmtNumber } from '@/lib/format';
import { useFilteredRows, useQuery } from '@/lib/hooks';
import { Badge, Button, Callout, Card, Checkbox, DataTable, Drawer, EmptyState, Field, FileDrop, FilterBar, IconButton, Input, Menu, Modal, Progress, RankedBars, Select, Timeline, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { downloadCsv } from '../components/csv';

export default function ListsPage() {
  const { data, loading, setData } = useQuery(() => df.listLists(), []);
  const [search, setSearch] = useState('');
  const [upload, setUpload] = useState(false);
  const [churn, setChurn] = useState(null);
  const [open, setOpen] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();
  const rows = useFilteredRows(data, { search, fields: ['name', 'source'] });

  const exportList = (l) => {
    downloadCsv(l.name, [{ header: 'Disposition', key: 'name' }, { header: 'Records', key: 'value' }], l.breakdown);
    toast({ title: 'Export started', description: `${fmtNumber(l.records)} records from ${l.name}` });
  };

  const doChurn = (l, dispositions, records) => {
    setData((all) => all.map((x) => (x.id === l.id ? { ...x, dialable: x.dialable + records, churns: [{ id: Date.now(), at: new Date(), by: 'Riya Malhotra', dispositions, records }, ...x.churns] } : x)));
    toast({ title: `${fmtNumber(records)} leads back in the queue`, description: `${l.name} will be dialled again.` });
    setChurn(null);
  };

  return (
    <Page>
      <PageHeader
        title="Contact lists"
        description="Reusable lists of leads. Attach a list to any campaign, and dial it again by outcome."
        actions={
          <Button variant="brand" icon={UploadSimple} onClick={() => setUpload(true)}>
            Upload CSV
          </Button>
        }
      />
      <FilterBar className="mb-4" search={search} onSearch={setSearch} searchPlaceholder="Search lists" />
      <Card padded={false}>
        <DataTable
          loading={loading}
          rows={rows}
          onRowClick={setOpen}
          empty={<EmptyState icon={FileCsv} title="No lists yet" description="Upload a CSV with name and phone columns to get started." action={<Button variant="brand" icon={UploadSimple} onClick={() => setUpload(true)}>Upload CSV</Button>} />}
          columns={[
            { key: 'name', header: 'List', sortable: true, render: (l) => <div><div className="font-semibold text-ink">{l.name}</div><div className="text-xs text-ink-muted">{l.source}</div></div> },
            { key: 'records', header: 'Records', align: 'right', sortable: true, render: (l) => fmtNumber(l.records) },
            {
              key: 'dialable',
              header: 'Left to dial',
              render: (l) => (
                <div className="w-40">
                  <div className="mb-1 text-xs tabular text-ink">{fmtNumber(l.dialable)} left</div>
                  <Progress value={l.records - l.dialable} max={l.records} size="sm" />
                </div>
              ),
            },
            { key: 'campaigns', header: 'Used in', hideBelow: 'lg', render: (l) => (l.campaigns.length ? <span className="text-[13px] text-ink-2">{l.campaigns.join(', ')}</span> : <span className="text-xs text-ink-faint">Not used</span>) },
            { key: 'churns', header: 'Re-dials', align: 'right', hideBelow: 'md', render: (l) => l.churns.length || '—' },
            { key: 'uploadedAt', header: 'Uploaded', hideBelow: 'xl', render: (l) => <span className="text-xs">{fmtDate(l.uploadedAt)} · {l.uploadedBy}</span> },
            {
              key: 'x',
              header: '',
              align: 'right',
              render: (l) => (
                <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()} role="presentation">
                  <Button size="xs" variant="ghost" icon={ArrowsClockwise} onClick={() => setChurn(l)} disabled={l.records === l.dialable}>
                    Dial again
                  </Button>
                  <Menu
                    trigger={({ toggle }) => <IconButton icon={DotsThree} label="More" size="sm" onClick={toggle} />}
                    items={[
                      { label: 'Export CSV', icon: DownloadSimple, onClick: () => exportList(l) },
                      { divider: true },
                      {
                        label: 'Delete list',
                        icon: Trash,
                        tone: 'danger',
                        onClick: async () => {
                          if (await confirm({ title: `Delete ${l.name}?`, message: l.campaigns.length ? `It is used by ${l.campaigns.join(', ')}. Those campaigns will stop dialling it.` : 'This cannot be undone.', tone: 'danger', confirmLabel: 'Delete' })) {
                            setData((all) => all.filter((x) => x.id !== l.id));
                            toast('List deleted');
                          }
                        },
                      },
                    ]}
                  />
                </span>
              ),
            },
          ]}
        />
      </Card>

      <UploadModal
        open={upload}
        onClose={() => setUpload(false)}
        onDone={(l) => {
          setData((all) => [l, ...all]);
          setUpload(false);
          toast({ title: `${l.name} uploaded`, description: `${fmtNumber(l.records)} leads · 37 duplicates and 12 DNC numbers skipped` });
        }}
      />
      <ChurnModal list={churn} onClose={() => setChurn(null)} onConfirm={doChurn} />
      <ListDrawer list={open} onClose={() => setOpen(null)} onChurn={(l) => { setOpen(null); setChurn(l); }} onExport={exportList} />
    </Page>
  );
}

function UploadModal({ open, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const cols = ['Name', 'Mobile', 'City', 'Source', 'Budget'];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload a contact list"
      description="CSV with a header row. We clean numbers, drop duplicates and skip Do Not Call."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!file || !name} onClick={() => onDone({ id: `lst_${Date.now()}`, name, records: 1240, dialable: 1240, source: 'CSV upload', uploadedAt: new Date(), uploadedBy: 'Riya Malhotra', campaigns: [], breakdown: [], churns: [] })}>
            Upload 1,240 leads
          </Button>
        </>
      }
    >
      {!file ? (
        <FileDrop accept=".csv" title="Drop a CSV here or browse" hint="Up to 50,000 rows · phone column required" onFiles={(f) => { setFile(f[0]); setName(f[0]?.name.replace(/\.csv$/i, '') || ''); }} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
            <FileCsv size={28} weight="duotone" className="text-success" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{file.name}</div>
              <div className="text-xs text-ink-muted">1,289 rows found</div>
            </div>
            <Button size="xs" variant="ghost" onClick={() => setFile(null)}>
              Change
            </Button>
          </div>
          <Field label="List name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink-2">Match columns</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {cols.map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate font-mono text-xs text-ink-muted">{c}</span>
                  <Select size="sm" className="flex-1" defaultValue={c === 'Mobile' ? 'phone' : c.toLowerCase()} options={[{ value: 'name', label: 'Name' }, { value: 'phone', label: 'Phone' }, { value: 'city', label: 'City' }, { value: 'source', label: 'Source' }, { value: 'budget', label: 'Custom: Budget' }, { value: 'skip', label: 'Skip' }]} />
                </div>
              ))}
            </div>
          </div>
          <Callout tone="info">37 duplicates and 12 numbers on Do Not Call will be skipped.</Callout>
        </div>
      )}
    </Modal>
  );
}

function ChurnModal({ list, onClose, onConfirm }) {
  const [picked, setPicked] = useState(['No answer', 'Busy']);
  if (!list) return null;
  const total = list.breakdown.filter((b) => picked.includes(b.name)).reduce((a, b) => a + b.value, 0);
  return (
    <Modal
      open={!!list}
      onClose={onClose}
      title="Dial again"
      description={`Put leads from ${list.name} back in the queue, based on how their last call ended.`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!total} onClick={() => onConfirm(list, picked, total)}>
            Re-queue {fmtNumber(total)} leads
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {list.breakdown.map((b) => (
          <div key={b.name} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 hover:bg-surface-2">
            <Checkbox checked={picked.includes(b.name)} onChange={(on) => setPicked((p) => (on ? [...p, b.name] : p.filter((x) => x !== b.name)))} label={b.name} />
            <span className="text-sm tabular text-ink-muted">{fmtNumber(b.value)}</span>
          </div>
        ))}
      </div>
      {['Not interested', 'Wrong number'].some((x) => picked.includes(x)) && (
        <Callout tone="warning" className="mt-3">
          Calling people who said no again can lead to complaints. Use with care.
        </Callout>
      )}
    </Modal>
  );
}

function ListDrawer({ list, onClose, onChurn, onExport }) {
  if (!list) return null;
  return (
    <Drawer
      open={!!list}
      onClose={onClose}
      title={list.name}
      subtitle={`${list.source} · ${fmtNumber(list.records)} records`}
      footer={
        <>
          <Button icon={DownloadSimple} onClick={() => onExport(list)}>
            Export
          </Button>
          <Button variant="brand" icon={ArrowsClockwise} onClick={() => onChurn(list)}>
            Dial again
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 p-6">
        <div>
          <div className="mb-3 text-sm font-semibold">How calls ended</div>
          {list.breakdown.some((b) => b.value) ? <RankedBars items={list.breakdown.filter((b) => b.value).map((b) => ({ label: b.name, value: b.value, tone: b.name === 'Interested' ? 'success' : 'brand' }))} /> : <p className="text-sm text-ink-muted">Not dialled yet.</p>}
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Re-dial history</div>
          {list.churns.length ? (
            <Timeline items={list.churns.map((c) => ({ title: `${fmtNumber(c.records)} leads re-queued`, time: fmtDateTime(c.at), description: `${c.dispositions.join(', ')} · by ${c.by}`, tone: 'brand' }))} />
          ) : (
            <p className="text-sm text-ink-muted">This list has never been dialled again.</p>
          )}
        </div>
      </div>
    </Drawer>
  );
}

import { useMemo, useState } from 'react';
import { Plus, Prohibit, Trash, UploadSimple, MagnifyingGlass, CheckCircle, XCircle } from '@phosphor-icons/react';
import { fmtDate, fmtPhone } from '@/lib/format';
import { Badge, Button, Card, DataTable, EmptyState, Field, FileDrop, FilterBar, FilterSelect, Input, Modal, Select, Textarea, useConfirm, useToast } from '@/design-system';

/*
 * One Do-Not-Call screen for Agent Flow, DialFlow and the Admin Console.
 * scope: 'tenant' (this company's list) or 'global' (super admin, applies to every tenant).
 * rows = [{ id, phone, reason, scope, addedBy, addedAt, source }]
 */
export function DncManager({ rows: initial, scope = 'tenant' }) {
  const [rows, setRows] = useState(initial);
  const [search, setSearch] = useState('');
  const [reasons, setReasons] = useState([]);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [check, setCheck] = useState('');
  const confirm = useConfirm();
  const toast = useToast();

  const allReasons = useMemo(() => [...new Set(initial.map((r) => r.reason))], [initial]);
  const filtered = rows.filter((r) => (!search || r.phone.includes(search.replace(/\D/g, ''))) && (!reasons.length || reasons.includes(r.reason)));
  const checkDigits = check.replace(/\D/g, '').slice(-10);
  const checkHit = checkDigits.length === 10 ? rows.some((r) => r.phone.endsWith(checkDigits)) : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Check a number</div>
          <div className="text-xs text-ink-muted">See if a number is blocked before you call it.</div>
        </div>
        <Input icon={MagnifyingGlass} value={check} onChange={(e) => setCheck(e.target.value)} placeholder="98765 43210" className="sm:w-64" />
        {checkHit === true && <Badge tone="danger" icon={XCircle}>Blocked</Badge>}
        {checkHit === false && <Badge tone="success" icon={CheckCircle}>OK to call</Badge>}
      </Card>

      <Card padded={false}>
        <div className="p-4">
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search number"
            canReset={!!(search || reasons.length)}
            onReset={() => {
              setSearch('');
              setReasons([]);
            }}
            actions={
              <>
                <Button icon={UploadSimple} onClick={() => setUploading(true)}>
                  Upload CSV
                </Button>
                <Button variant="brand" icon={Plus} onClick={() => setAdding(true)}>
                  Add number
                </Button>
              </>
            }
          >
            <FilterSelect label="Reason" options={allReasons} value={reasons} onChange={setReasons} />
          </FilterBar>
        </div>
        <DataTable
          rows={filtered}
          selectable
          bulkActions={(ids) => (
            <Button
              size="sm"
              variant="danger-soft"
              icon={Trash}
              onClick={async () => {
                if (await confirm({ title: `Remove ${ids.length} numbers?`, message: 'They can be called again right away.', tone: 'danger', confirmLabel: 'Remove' })) {
                  setRows((r) => r.filter((x) => !ids.includes(x.id)));
                  toast(`${ids.length} numbers removed`);
                }
              }}
            >
              Remove
            </Button>
          )}
          empty={<EmptyState icon={Prohibit} title="No blocked numbers" description="Numbers you add here are never dialled." compact />}
          columns={[
            { key: 'phone', header: 'Number', render: (r) => <span className="font-medium tabular text-ink">{fmtPhone(r.phone)}</span> },
            { key: 'reason', header: 'Reason', render: (r) => <Badge>{r.reason}</Badge> },
            ...(scope === 'global' ? [{ key: 'scope', header: 'Applies to', render: (r) => r.scope || 'All products' }] : []),
            { key: 'source', header: 'Added from', hideBelow: 'md' },
            { key: 'addedBy', header: 'Added by', hideBelow: 'lg' },
            { key: 'addedAt', header: 'Date', sortable: true, sortValue: (r) => +new Date(r.addedAt), render: (r) => fmtDate(r.addedAt) },
          ]}
        />
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Block a number"
        description="It will be skipped by every campaign right away."
        icon={Prohibit}
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="brand"
              onClick={() => {
                setRows((r) => [{ id: Date.now(), phone: '9876543210', reason: 'Customer request', addedBy: 'You', addedAt: new Date(), source: 'Manual' }, ...r]);
                setAdding(false);
                toast('Number blocked');
              }}
            >
              Block number
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Phone number" required>
            <Input placeholder="+91 98765 43210" />
          </Field>
          <Field label="Reason">
            <Select options={['Customer request', 'Legal / TRAI complaint', 'Wrong number', 'Existing customer', 'Other']} />
          </Field>
          {scope === 'global' && (
            <Field label="Applies to">
              <Select options={['All products', 'Agent Flow only', 'DialFlow only']} />
            </Field>
          )}
          <Field label="Note" optional>
            <Textarea rows={2} placeholder="Anything the team should know" />
          </Field>
        </div>
      </Modal>

      <Modal open={uploading} onClose={() => setUploading(false)} title="Upload numbers" description="CSV with one number per row. Optional second column: reason." icon={UploadSimple}>
        <FileDrop
          accept=".csv"
          hint="Up to 50,000 rows"
          onFiles={(f) => {
            setUploading(false);
            toast({ title: `${f[0]?.name || 'File'} uploaded`, description: '312 numbers added, 4 duplicates skipped.' });
          }}
        />
      </Modal>
    </div>
  );
}

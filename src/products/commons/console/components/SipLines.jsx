import { useEffect, useState } from 'react';
import { DotsThree, PencilSimple, Phone, Plus, Trash, UploadSimple, DownloadSimple } from '@phosphor-icons/react';
import { Badge, Button, DataTable, EmptyState, Field, FileDrop, Input, Menu, Modal, SecretInput, Segmented, Select, StatusBadge, useConfirm, useToast } from '@/design-system';
import { fmtPhone } from '@/lib/format';
import { SIP_TYPES } from '@/mocks/commons';

const BLANK = { name: '', type: 'Tata Tele', host: '', port: 5060, domain: '', numberType: 'DID', did: '', authUser: '', password: '', prefix: '', channels: 10, status: 'Connected' };

/** Add / edit one SIP line. line = null for new. */
export function SipLineModal({ open, line, onClose, onSave }) {
  const [f, setF] = useState(BLANK);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setF(line ? { ...BLANK, ...line } : BLANK);
      setTouched(false);
    }
  }, [open, line]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const errors = {
    name: !f.name.trim() && 'Give the line a name',
    host: !f.host.trim() && 'Host is required',
    did: !String(f.did).trim() && (f.numberType === 'DID' ? 'DID number is required' : 'Extension is required'),
  };
  const valid = !Object.values(errors).some(Boolean);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={Phone}
      title={line ? `Edit ${line.name}` : 'Add SIP line'}
      description="Calls go out through this trunk. Test it after saving."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTouched(true);
              if (valid) onSave({ ...f, id: f.id || `sip_${Date.now()}`, port: Number(f.port) || 5060 });
            }}
          >
            {line ? 'Save line' : 'Add line'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Line name" required error={touched && errors.name}>
          <Input value={f.name} onChange={set('name')} placeholder="Pune AI line 1" autoFocus />
        </Field>
        <Field label="Type">
          <Select value={f.type} onChange={set('type')} options={SIP_TYPES} />
        </Field>
        <Field label="Host" required error={touched && errors.host} className="sm:col-span-1">
          <Input value={f.host} onChange={set('host')} placeholder="sip.tatatelebusiness.com" className="font-mono" />
        </Field>
        <div className="grid grid-cols-[1fr_1.4fr] gap-3">
          <Field label="Port">
            <Input type="number" value={f.port} onChange={set('port')} />
          </Field>
          <Field label="Domain" optional>
            <Input value={f.domain} onChange={set('domain')} placeholder="tatasip.in" />
          </Field>
        </div>
        <Field label="Number" required error={touched && errors.did} className="sm:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Segmented value={f.numberType} onChange={set('numberType')} options={['DID', 'Extension']} />
            <Input value={f.did} onChange={set('did')} placeholder={f.numberType === 'DID' ? '7965110243' : '1001'} className="flex-1" />
          </div>
        </Field>
        <Field label="Auth user">
          <Input value={f.authUser} onChange={set('authUser')} placeholder="rrparko_401" autoComplete="off" />
        </Field>
        <Field label="Password">
          <SecretInput value={f.password} onChange={set('password')} placeholder="••••••••" />
        </Field>
        <Field label="Dial prefix" optional hint="Added before every dialled number, e.g. 0 or +91.">
          <Input value={f.prefix} onChange={set('prefix')} placeholder="0" />
        </Field>
        <Field label="Channels" hint="Max parallel calls on this line.">
          <Input type="number" value={f.channels} onChange={set('channels')} />
        </Field>
      </div>
    </Modal>
  );
}

/** Upload SIP lines from an Excel/CSV sheet. */
export function SipUploadModal({ open, onClose, onUploaded }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={UploadSimple}
      title="Upload SIP lines"
      description="One row per line. Columns: name, type, host, port, domain, did_or_extension, auth_user, password, prefix."
      footer={
        <Button variant="ghost" icon={DownloadSimple} onClick={() => undefined}>
          Download template
        </Button>
      }
    >
      <FileDrop accept=".xlsx,.xls,.csv" hint="Excel or CSV, up to 500 rows" onFiles={(files) => onUploaded?.(files[0])} />
    </Modal>
  );
}

/**
 * SIP lines table with add / edit / remove / upload. Owns its rows; calls onChange(rows) after every edit.
 */
export function SipLinesEditor({ lines: initial = [], onChange, allowUpload, compact }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState(undefined); // undefined closed, null new, object edit
  const [uploading, setUploading] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  useEffect(() => setRows(initial), [initial]);
  const commit = (next) => {
    setRows(next);
    onChange?.(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] text-ink-muted">
          <b className="text-ink">{rows.length}</b> lines · <b className="text-ink">{rows.reduce((a, r) => a + Number(r.channels || 0), 0)}</b> channels
        </div>
        <div className="flex gap-2">
          {allowUpload && (
            <Button size="sm" icon={UploadSimple} onClick={() => setUploading(true)}>
              Upload Excel
            </Button>
          )}
          <Button size="sm" variant="primary" icon={Plus} onClick={() => setEditing(null)}>
            Add line
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line">
        <DataTable
          dense={compact}
          pageSize={0}
          rows={rows}
          empty={<EmptyState icon={Phone} title="No SIP lines yet" description="Add a line or upload an Excel sheet. Calls can't go out without one." compact />}
          columns={[
            {
              key: 'name',
              header: 'Line',
              render: (r) => (
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink">{r.name}</div>
                  <div className="truncate font-mono text-2xs text-ink-faint">
                    {r.host}:{r.port}
                  </div>
                </div>
              ),
            },
            { key: 'type', header: 'Type', render: (r) => <Badge>{r.type}</Badge>, hideBelow: 'md' },
            { key: 'did', header: 'DID / ext.', render: (r) => <span className="tabular">{r.numberType === 'Extension' ? `Ext ${r.did}` : fmtPhone(r.did)}</span> },
            { key: 'channels', header: 'Ch.', align: 'right', hideBelow: 'lg' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (r) => (
                <Menu
                  trigger={({ toggle }) => (
                    <button onClick={toggle} aria-label="Line actions" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink">
                      <DotsThree size={18} weight="bold" />
                    </button>
                  )}
                  items={[
                    { label: 'Edit', icon: PencilSimple, onClick: () => setEditing(r) },
                    { label: 'Test call', icon: Phone, onClick: () => toast({ title: 'Test call placed', description: `${r.name} rang in 1.2 s. Audio OK both ways.`, tone: 'success' }) },
                    { divider: true },
                    {
                      label: 'Remove',
                      icon: Trash,
                      tone: 'danger',
                      onClick: async () => {
                        if (await confirm({ title: `Remove ${r.name}?`, message: 'Live calls on this line will finish, then no new calls will use it.', tone: 'danger', confirmLabel: 'Remove line' })) {
                          commit(rows.filter((x) => x.id !== r.id));
                          toast('SIP line removed');
                        }
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </div>
      <SipLineModal
        open={editing !== undefined}
        line={editing}
        onClose={() => setEditing(undefined)}
        onSave={(line) => {
          commit(editing ? rows.map((x) => (x.id === line.id ? line : x)) : [...rows, line]);
          setEditing(undefined);
          toast(editing ? 'SIP line saved' : 'SIP line added');
        }}
      />
      <SipUploadModal
        open={uploading}
        onClose={() => setUploading(false)}
        onUploaded={(file) => {
          setUploading(false);
          toast({ title: `${file?.name || 'Sheet'} imported`, description: '6 lines added, 1 row skipped (missing host).', tone: 'success' });
        }}
      />
    </div>
  );
}

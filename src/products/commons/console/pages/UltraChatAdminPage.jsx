import { useEffect, useMemo, useState } from 'react';
import { ChatCircleDots, DownloadSimple, Plus, UploadSimple, Wallet } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtCompact, fmtNumber } from '@/lib/format';
import { Badge, Button, Callout, Card, DataTable, Drawer, EmptyState, Field, FileDrop, FilterBar, FilterSelect, Input, Modal, SecretInput, Select, StatCard, StatGrid, StatusBadge, Switch, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listChatTenants } from '@/services/commons';
import { ProductAdminTitle } from '../components/ProductAdminTitle';

const QUALITY_TONE = { High: 'success', Medium: 'warning', Low: 'danger' };

export default function UltraChatAdminPage() {
  const { data, loading, setData, error, reload } = useQuery(() => listChatTenants(), []);
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [importing, setImporting] = useState(false);
  const toast = useToast();

  const tenants = useMemo(() => data || [], [data]);
  const rows = tenants.filter((t) => (!search || t.name.toLowerCase().includes(search.toLowerCase())) && (!statuses.length || statuses.includes(t.status)) && (!plans.length || plans.includes(t.plan)));
  const open = tenants.find((t) => t.tenantId === openId);
  const patch = (id, p) => setData((d) => d.map((t) => (t.tenantId === id ? { ...t, ...p } : t)));

  return (
    <Page>
      <PageHeader
        title={<ProductAdminTitle id="ultrachat">UltraChat</ProductAdminTitle>}
        description="WhatsApp tenants: numbers, AI replies and prepaid wallets."
        actions={
          <Button variant="primary" icon={UploadSimple} onClick={() => setImporting(true)}>
            Import chats
          </Button>
        }
      />

      <StatGrid cols={4} className="mb-6">
        <StatCard loading={loading} label="WhatsApp tenants" value={fmtNumber(tenants.length)} hint={`${tenants.filter((t) => t.aiOn).length} with AI replies on`} icon={ChatCircleDots} tone="ultrachat" />
        <StatCard loading={loading} label="Messages this month" value={fmtCompact(tenants.reduce((a, t) => a + t.messagesMonth, 0))} delta={12.7} />
        <StatCard loading={loading} label="Wallet balance" value={`₹${fmtCompact(tenants.reduce((a, t) => a + t.wallet, 0))}`} hint="across all tenants" icon={Wallet} tone="neutral" />
        <StatCard loading={loading} label="Low or empty wallet" value={fmtNumber(tenants.filter((t) => t.wallet < 1000).length)} hint="messages pause at ₹0" />
      </StatGrid>

      <Card padded={false}>
        <div className="p-4">
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search tenant"
            canReset={!!(search || statuses.length || plans.length)}
            onReset={() => (setSearch(''), setStatuses([]), setPlans([]))}
          >
            <FilterSelect label="Status" options={['Active', 'Low balance', 'Suspended']} value={statuses} onChange={setStatuses} />
            <FilterSelect label="Plan" options={['Starter', 'Growth', 'Enterprise']} value={plans} onChange={setPlans} />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          rowKey="tenantId"
          onRowClick={(t) => setOpenId(t.tenantId)}
          empty={<EmptyState icon={ChatCircleDots} title="No tenants match" description="Change the filters." compact />}
          columns={[
            {
              key: 'name',
              header: 'Tenant',
              sortable: true,
              render: (t) => (
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{t.name}</div>
                  <div className="truncate text-xs tabular text-ink-muted">{t.waNumber}</div>
                </div>
              ),
            },
            { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
            { key: 'plan', header: 'Plan', render: (t) => <Badge>{t.plan}</Badge>, hideBelow: 'md' },
            {
              key: 'wallet',
              header: 'Wallet',
              align: 'right',
              sortable: true,
              render: (t) => <span className={cn('font-semibold tabular', t.wallet < 1000 ? 'text-danger' : 'text-ink')}>₹{fmtNumber(t.wallet)}</span>,
            },
            { key: 'messagesMonth', header: 'Messages (month)', align: 'right', sortable: true, render: (t) => fmtNumber(t.messagesMonth), hideBelow: 'lg' },
            { key: 'aiOn', header: 'AI replies', render: (t) => <Badge tone={t.aiOn ? 'success' : 'neutral'}>{t.aiOn ? 'On' : 'Off'}</Badge>, hideBelow: 'md' },
            { key: 'quality', header: 'Number quality', render: (t) => <Badge tone={QUALITY_TONE[t.quality]} dot>{t.quality}</Badge>, hideBelow: 'xl' },
          ]}
        />
      </Card>

      <EditDrawer tenant={open} onClose={() => setOpenId(null)} onSave={patch} />

      <Modal
        open={importing}
        onClose={() => setImporting(false)}
        icon={UploadSimple}
        title="Import chats from CSV"
        description="Move chat history from another provider into a tenant’s inbox."
        footer={
          <Button variant="ghost" icon={DownloadSimple}>
            Download template
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Tenant">
            <Select options={tenants.map((t) => ({ value: t.tenantId, label: t.name }))} />
          </Field>
          <FileDrop
            accept=".csv"
            hint="Columns: phone, name, direction, message, sent_at. Up to 200,000 rows."
            onFiles={(f) => {
              setImporting(false);
              toast({ title: `${f[0]?.name || 'File'} imported`, description: '18,420 messages in 2,106 chats. 12 rows skipped (bad phone).', tone: 'success' });
            }}
          />
        </div>
      </Modal>
    </Page>
  );
}

function EditDrawer({ tenant, onClose, onSave }) {
  const [f, setF] = useState(null);
  const [topUp, setTopUp] = useState('');
  const toast = useToast();
  useEffect(() => {
    if (tenant) {
      setF({ ...tenant });
      setTopUp('');
    }
  }, [tenant]);
  if (!tenant || !f) return null;
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));
  const add = Number(topUp) || 0;
  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title={f.name}
      subtitle={f.waNumber}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const wallet = f.wallet + add;
              onSave(f.tenantId, { ...f, wallet, status: !f.whatsappOn ? 'Suspended' : wallet < 1000 ? 'Low balance' : 'Active' });
              toast({ title: 'Tenant saved', description: add ? `₹${fmtNumber(add)} added to wallet` : f.name, tone: 'success' });
              onClose();
            }}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 p-6">
        <section className="flex flex-col divide-y divide-line rounded-2xl border border-line">
          <div className="px-4 py-3">
            <Switch checked={f.whatsappOn} onChange={set('whatsappOn')} label="WhatsApp" description="Turn off to stop all sending and receiving for this tenant." />
          </div>
          <div className="px-4 py-3">
            <Switch checked={f.aiOn} onChange={set('aiOn')} label="AI replies" description="Bot answers before an agent picks up." />
          </div>
        </section>
        {!f.whatsappOn && <Callout tone="warning">Customers’ messages will not reach this tenant while WhatsApp is off.</Callout>}

        <section>
          <h3 className="mb-3 text-sm font-bold">Wallet</h3>
          <div className="rounded-2xl border border-line p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-ink-muted">Current balance</span>
              <span className={cn('font-display text-2xl font-bold tabular', f.wallet < 1000 && 'text-danger')}>₹{fmtNumber(f.wallet)}</span>
            </div>
            <Field label="Add credits" className="mt-4" hint={add ? `New balance ₹${fmtNumber(f.wallet + add)}` : 'Logged in Credits with your name.'}>
              <Input type="number" value={topUp} onChange={(e) => setTopUp(e.target.value)} placeholder="10000" suffix="₹" />
              <div className="mt-1 flex gap-1.5">
                {[5000, 10000, 25000].map((q) => (
                  <button key={q} type="button" onClick={() => setTopUp(String(q))} className="rounded-lg border border-line px-2 py-1 text-xs font-medium text-ink-2 hover:bg-surface-2">
                    <Plus size={10} className="mr-0.5 inline" />₹{fmtNumber(q)}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-bold">WhatsApp credentials</h3>
          <p className="mb-3 text-xs text-ink-muted">From Meta Business Manager → WhatsApp → API setup.</p>
          <div className="flex flex-col gap-4">
            <Field label="WhatsApp Business account ID">
              <Input value={f.wabaId} onChange={set('wabaId')} className="font-mono" />
            </Field>
            <Field label="Phone number ID">
              <Input value={f.phoneNumberId} onChange={set('phoneNumberId')} className="font-mono" />
            </Field>
            <Field label="Permanent access token" hint={f.token ? 'Saved. Paste a new one to replace it.' : 'Not set. Messages can’t be sent without it.'}>
              <SecretInput value={f.token} onChange={set('token')} placeholder="EAAG…" />
            </Field>
          </div>
        </section>
      </div>
    </Drawer>
  );
}

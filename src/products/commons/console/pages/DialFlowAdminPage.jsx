import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowSquareOut, Headset, Minus, Phone, Plus, UploadSimple } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtNumber } from '@/lib/format';
import { Badge, Button, Card, DataTable, Drawer, EmptyState, Field, FilterBar, FilterSelect, Input, Progress, StatCard, StatGrid, StatusBadge, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listDialerClients } from '@/services/commons';
import { SipLinesEditor, SipUploadModal } from '../components/SipLines';
import { ProductAdminTitle } from '../components/ProductAdminTitle';

export default function DialFlowAdminPage() {
  const { data, loading, setData } = useQuery(() => listDialerClients(), []);
  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const clients = useMemo(() => data || [], [data]);
  const rows = clients.filter((c) => (!search || c.name.toLowerCase().includes(search.toLowerCase())) && (!plans.length || plans.includes(c.plan)));
  const open = clients.find((c) => c.tenantId === openId);
  const patch = (id, p) => setData((d) => d.map((c) => (c.tenantId === id ? { ...c, ...p } : c)));

  const seats = clients.reduce((a, c) => a + c.maxAgents, 0);
  const used = clients.reduce((a, c) => a + c.activeAgents, 0);
  const failing = clients.reduce((a, c) => a + c.sipLines.filter((l) => l.status === 'Failed').length, 0);

  return (
    <Page>
      <PageHeader
        title={<ProductAdminTitle id="dialflow">DialFlow</ProductAdminTitle>}
        description="Dialer clients: agent seats and the SIP trunks their calls go out on."
        actions={
          <Button variant="primary" icon={UploadSimple} onClick={() => setUploading(true)}>
            Upload SIP lines
          </Button>
        }
      />

      <StatGrid cols={4} className="mb-6">
        <StatCard loading={loading} label="Dialer clients" value={fmtNumber(clients.length)} hint={`${fmtNumber(clients.reduce((a, c) => a + c.callsToday, 0))} calls today`} icon={Headset} tone="dialflow" />
        <StatCard loading={loading} label="Agent seats in use" value={`${fmtNumber(used)} / ${fmtNumber(seats)}`} hint={`${seats ? Math.round((used / seats) * 100) : 0}% of sold seats`} />
        <StatCard loading={loading} label="Agents online now" value={fmtNumber(clients.reduce((a, c) => a + c.onlineNow, 0))} hint="across all clients" />
        <StatCard loading={loading} label="SIP lines" value={fmtNumber(clients.reduce((a, c) => a + c.sipLines.length, 0))} hint={`${failing} failing`} icon={Phone} tone={failing ? 'danger' : 'neutral'} />
      </StatGrid>

      <Card padded={false}>
        <div className="p-4">
          <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search client" canReset={!!(search || plans.length)} onReset={() => (setSearch(''), setPlans([]))}>
            <FilterSelect label="Plan" options={['Starter', 'Growth', 'Enterprise']} value={plans} onChange={setPlans} />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          rows={rows}
          rowKey="tenantId"
          onRowClick={(c) => setOpenId(c.tenantId)}
          empty={<EmptyState icon={Headset} title="No dialer clients match" description="Change the search or plan filter." compact />}
          columns={[
            {
              key: 'name',
              header: 'Client',
              sortable: true,
              render: (c) => (
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{c.name}</div>
                  <div className="text-xs text-ink-muted">{c.city}</div>
                </div>
              ),
            },
            { key: 'plan', header: 'Plan', render: (c) => <Badge>{c.plan}</Badge>, hideBelow: 'md' },
            {
              key: 'maxAgents',
              header: 'Seats used',
              sortable: true,
              render: (c) => (
                <div className="w-40">
                  <div className="mb-1 flex justify-between text-xs tabular">
                    <span className="font-semibold text-ink">
                      {c.activeAgents} / {c.maxAgents}
                    </span>
                    <span className="text-ink-faint">{c.onlineNow} online</span>
                  </div>
                  <Progress value={c.activeAgents} max={c.maxAgents} size="sm" tone={c.activeAgents / c.maxAgents > 0.9 ? 'warning' : 'brand'} />
                </div>
              ),
            },
            { key: 'callsToday', header: 'Calls today', align: 'right', sortable: true, render: (c) => fmtNumber(c.callsToday), hideBelow: 'lg' },
            {
              key: 'sip',
              header: 'SIP lines',
              render: (c) => {
                const f = c.sipLines.filter((l) => l.status === 'Failed').length;
                return (
                  <span className="inline-flex items-center gap-2 text-sm">
                    <span className="tabular">{c.sipLines.length}</span>
                    {f > 0 && (
                      <Badge tone="danger" size="xs">
                        {f} failing
                      </Badge>
                    )}
                  </span>
                );
              },
            },
            { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} />, hideBelow: 'md' },
          ]}
        />
      </Card>

      <ClientDrawer client={open} onClose={() => setOpenId(null)} onPatch={patch} toast={toast} />
      <SipUploadModal
        open={uploading}
        onClose={() => setUploading(false)}
        onUploaded={(f) => {
          setUploading(false);
          toast({ title: `${f?.name || 'Sheet'} imported`, description: 'Lines matched to clients by the tenant column. 12 added, 1 skipped.', tone: 'success' });
        }}
      />
    </Page>
  );
}

function ClientDrawer({ client, onClose, onPatch, toast }) {
  const [max, setMax] = useState(0);
  useEffect(() => {
    if (client) setMax(client.maxAgents);
  }, [client]);
  if (!client) return null;
  const tooLow = max < client.activeAgents;
  return (
    <Drawer
      open
      onClose={onClose}
      width={760}
      title={client.name}
      subtitle={`${client.city} · ${client.plan}`}
      actions={
        <Button as={Link} to={`/admin/tenants/${client.tenantId}`} size="sm" variant="ghost" icon={ArrowSquareOut}>
          Tenant
        </Button>
      }
    >
      <div className="flex flex-col gap-6 p-6">
        <section className="rounded-2xl border border-line p-4">
          <Field label="Max agents" hint={`${client.activeAgents} seats in use · ${client.onlineNow} online now`} error={tooLow && `${client.activeAgents} agents already use seats. Remove agents first.`}>
            <div className="flex flex-wrap items-center gap-2">
              <Button iconOnly icon={Minus} aria-label="Fewer seats" onClick={() => setMax((m) => Math.max(1, m - 1))} />
              <Input type="number" value={max} onChange={(e) => setMax(Number(e.target.value))} className="w-24 text-center" />
              <Button iconOnly icon={Plus} aria-label="More seats" onClick={() => setMax((m) => m + 1)} />
              <Button
                variant="primary"
                className="ml-auto"
                disabled={tooLow || max === client.maxAgents}
                onClick={() => {
                  onPatch(client.tenantId, { maxAgents: max });
                  toast({ title: 'Max agents updated', description: `${client.name}: ${client.maxAgents} → ${max}`, tone: 'success' });
                }}
              >
                Save
              </Button>
            </div>
          </Field>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-bold">SIP lines</h3>
          <SipLinesEditor lines={client.sipLines} allowUpload compact onChange={(sipLines) => onPatch(client.tenantId, { sipLines })} />
        </section>
      </div>
    </Drawer>
  );
}

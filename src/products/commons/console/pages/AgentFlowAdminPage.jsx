import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowSquareOut, Clock, Coins, Key, Phone, Plus, Timer, Users, Warning } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtDate, fmtNumber } from '@/lib/format';
import {
  Badge,
  Button,
  Callout,
  Card,
  ChartCard,
  DataTable,
  Drawer,
  EmptyState,
  Field,
  FilterBar,
  FilterSelect,
  SecretInput,
  StatCard,
  StatGrid,
  StatusBadge,
  Tabs,
  TrendChart,
  useToast,
} from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listVoiceClients } from '@/services/commons';
import { AddCreditsModal } from '../components/AddCreditsModal';
import { SipLinesEditor } from '../components/SipLines';
import { UsageMeter } from '../components/Bits';
import { ProductAdminTitle } from '../components/ProductAdminTitle';

const TX_TONE = { Added: 'success', 'Limit set': 'info', 'Usage reset': 'neutral' };
const dayLabel = (daysBack) => {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const leftPct = (c) => 1 - c.minutesUsed / c.minutesTotal;
const bucket = (c) => (leftPct(c) < 0.1 ? 'Under 10% left' : leftPct(c) < 0.2 ? 'Under 20% left' : 'Healthy');

export default function AgentFlowAdminPage() {
  const { data, loading, setData, error, reload } = useQuery(() => listVoiceClients(), []);
  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState([]);
  const [balance, setBalance] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(null); // null closed | 'pick' | tenantId
  const toast = useToast();

  const clients = useMemo(() => data || [], [data]);
  const rows = clients.filter(
    (c) => (!search || c.name.toLowerCase().includes(search.toLowerCase())) && (!plans.length || plans.includes(c.plan)) && (!balance.length || balance.includes(bucket(c))),
  );
  const open = clients.find((c) => c.tenantId === openId);

  const totals = useMemo(() => {
    const total = clients.reduce((a, c) => a + c.minutesTotal, 0);
    const used = clients.reduce((a, c) => a + c.minutesUsed, 0);
    return { total, used, today: clients.reduce((a, c) => a + c.minutesToday, 0), low: clients.filter((c) => leftPct(c) < 0.2).length, lines: clients.reduce((a, c) => a + c.sipLines.length, 0) };
  }, [clients]);

  const update = (tenantId, patch) => setData((list) => list.map((c) => (c.tenantId === tenantId ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)));

  const addMinutes = ({ tenantId, type, amount, reason }) => {
    const id = adding === 'pick' ? tenantId : adding;
    update(id, (c) => {
      const minutesTotal = type === 'Added' ? c.minutesTotal + amount : amount;
      return {
        minutesTotal,
        transactions: [{ id: `tx_${Date.now()}`, at: new Date(), type, amount, by: 'You', reason, balanceAfter: minutesTotal - c.minutesUsed }, ...c.transactions],
      };
    });
    const name = clients.find((c) => c.tenantId === id)?.name;
    toast({ title: type === 'Added' ? `${fmtNumber(amount)} minutes added` : `Limit set to ${fmtNumber(amount)} minutes`, description: name, tone: 'success' });
    setAdding(null);
  };

  return (
    <Page>
      <PageHeader
        title={<ProductAdminTitle id="agentflow">Agent Flow</ProductAdminTitle>}
        description="Voice clients, their telephony, Fish API keys and call minutes."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setAdding('pick')} disabled={!clients.length}>
            Add minutes
          </Button>
        }
      />

      <StatGrid cols={4} className="mb-6">
        <StatCard label="Voice clients" value={fmtNumber(clients.length)} loading={loading} icon={Users} tone="agentflow" hint={`${totals.lines} SIP lines in use`} />
        <StatCard label="Minutes used today" value={fmtNumber(totals.today)} loading={loading} icon={Timer} tone="agentflow" delta={8.2} deltaLabel="vs yesterday" />
        <StatCard label="Minutes left, all clients" value={fmtNumber(totals.total - totals.used)} loading={loading} icon={Coins} tone="agentflow" hint={`of ${fmtNumber(totals.total)} allotted`} />
        <StatCard
          label="Running low"
          value={fmtNumber(totals.low)}
          loading={loading}
          icon={Warning}
          tone={totals.low ? 'warning' : 'success'}
          hint="under 20% minutes · click to filter"
          onClick={() => setBalance(['Under 10% left', 'Under 20% left'])}
        />
      </StatGrid>

      <Card padded={false}>
        <div className="p-4">
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search client"
            canReset={!!(search || plans.length || balance.length)}
            onReset={() => {
              setSearch('');
              setPlans([]);
              setBalance([]);
            }}
          >
            <FilterSelect label="Plan" options={['Starter', 'Growth', 'Enterprise']} value={plans} onChange={setPlans} />
            <FilterSelect label="Minutes" options={['Under 10% left', 'Under 20% left', 'Healthy']} value={balance} onChange={setBalance} />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          rowKey="tenantId"
          onRowClick={(r) => setOpenId(r.tenantId)}
          initialSort={{ key: 'left', dir: 'asc' }}
          empty={<EmptyState icon={Users} title="No clients match" description="Clear the filters to see every voice client." compact />}
          columns={[
            {
              key: 'name',
              header: 'Client',
              sortable: true,
              render: (r) => (
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{r.name}</div>
                  <div className="truncate text-xs text-ink-muted">
                    {r.city} · {r.plan}
                  </div>
                </div>
              ),
            },
            { key: 'left', header: 'Minutes', sortable: true, sortValue: leftPct, width: 240, render: (r) => <UsageMeter used={r.minutesUsed} total={r.minutesTotal} unit="min" /> },
            { key: 'minutesToday', header: 'Today', align: 'right', sortable: true, hideBelow: 'md', render: (r) => fmtNumber(r.minutesToday) },
            { key: 'sip', header: 'SIP lines', hideBelow: 'lg', render: (r) => <SipSummary lines={r.sipLines} /> },
            { key: 'fish', header: 'Fish API', hideBelow: 'lg', render: (r) => (r.fishKey ? <Badge tone="info" icon={Key}>Own key</Badge> : <Badge>Platform key</Badge>) },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </Card>

      <ClientDrawer client={open} onClose={() => setOpenId(null)} onAdd={() => setAdding(open?.tenantId)} onUpdate={(patch) => update(open.tenantId, patch)} />

      <AddCreditsModal
        open={!!adding}
        onClose={() => setAdding(null)}
        products={['agentflow']}
        tenants={adding === 'pick' ? clients.map((c) => ({ id: c.tenantId, name: c.name })) : undefined}
        tenantName={adding && adding !== 'pick' ? clients.find((c) => c.tenantId === adding)?.name : undefined}
        onSubmit={addMinutes}
      />
    </Page>
  );
}

function SipSummary({ lines }) {
  const failed = lines.filter((l) => l.status === 'Failed').length;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      <Phone size={14} className="text-ink-faint" />
      <span className="tabular">{lines.length}</span>
      {failed > 0 && (
        <Badge tone="danger" size="xs">
          {failed} failing
        </Badge>
      )}
    </span>
  );
}

function ClientDrawer({ client, onClose, onAdd, onUpdate }) {
  const [tab, setTab] = useState('minutes');
  const [key, setKey] = useState('');
  const [lastId, setLastId] = useState(null);
  const toast = useToast();
  if (client && client.tenantId !== lastId) {
    setLastId(client.tenantId);
    setKey(client.fishKey || '');
    setTab('minutes');
  }
  if (!client) return null;
  const left = client.minutesTotal - client.minutesUsed;
  const usage = client.usage14.map((v, i) => ({ date: dayLabel(13 - i), minutes: v }));
  const avg = client.usage14.reduce((a, b) => a + b, 0) / client.usage14.length;
  const daysLeft = Math.floor(left / Math.max(avg, 1));

  return (
    <Drawer
      open={!!client}
      onClose={onClose}
      width={720}
      title={client.name}
      subtitle={`${client.city} · ${client.plan} · ${client.concurrency} parallel calls`}
      actions={
        <Button as={Link} to={`/admin/tenants/${client.tenantId}`} size="sm" variant="ghost" iconRight={ArrowSquareOut}>
          Tenant
        </Button>
      }
    >
      <div className="sticky top-0 z-10 bg-surface px-6 pt-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'minutes', label: 'Minutes', icon: Clock },
            { id: 'telephony', label: 'Telephony', icon: Phone, count: client.sipLines.length },
            { id: 'fish', label: 'Fish API key', icon: Key },
          ]}
        />
      </div>
      <div className="flex flex-col gap-5 p-6">
        {tab === 'minutes' && (
          <>
            <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-ink-muted">Minutes left</div>
                <div className="font-display text-3xl font-bold tabular">{fmtNumber(left)}</div>
                <div className="mt-1 text-xs text-ink-muted">About {fmtNumber(daysLeft)} days at the last 14 days’ pace</div>
                <UsageMeter used={client.minutesUsed} total={client.minutesTotal} unit="min" className="mt-3 max-w-sm" />
              </div>
              <Button variant="primary" icon={Plus} onClick={onAdd}>
                Add minutes
              </Button>
            </Card>
            {daysLeft < 7 && (
              <Callout tone="warning" title="Will run out within a week">
                Calls stop when minutes hit zero. Add minutes or tell the account owner.
              </Callout>
            )}
            <ChartCard title="Minutes per day" subtitle="Last 14 days" table={{ columns: [{ key: 'date', header: 'Day' }, { key: 'minutes', header: 'Minutes', format: fmtNumber }], rows: usage }}>
              <TrendChart data={usage} series={[{ key: 'minutes', label: 'Minutes', color: 'series-4' }]} height={180} />
            </ChartCard>
            <div>
              <h3 className="mb-2 text-sm font-bold">Minute history</h3>
              <div className="overflow-hidden rounded-xl border border-line">
                <DataTable
                  dense
                  pageSize={6}
                  rows={client.transactions}
                  columns={[
                    { key: 'at', header: 'Date', render: (r) => <span className="whitespace-nowrap">{fmtDate(r.at)}</span> },
                    { key: 'type', header: 'Type', render: (r) => <Badge tone={TX_TONE[r.type]}>{r.type}</Badge> },
                    {
                      key: 'amount',
                      header: 'Minutes',
                      align: 'right',
                      render: (r) => (r.type === 'Usage reset' ? '—' : <span className="font-semibold text-ink">{`${r.type === 'Added' ? '+' : ''}${fmtNumber(r.amount)}`}</span>),
                    },
                    { key: 'reason', header: 'Reason', render: (r) => <span className="line-clamp-1">{r.reason}</span> },
                    { key: 'by', header: 'By', hideBelow: 'md' },
                  ]}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'telephony' && (
          <>
            <p className="text-[13px] text-ink-muted">AI calls for {client.name} go out through these trunks, in order. A failing line is skipped automatically.</p>
            <SipLinesEditor lines={client.sipLines} onChange={(sipLines) => onUpdate({ sipLines })} />
          </>
        )}

        {tab === 'fish' && (
          <>
            <Callout tone="info" title="Blank = platform key">
              Leave this empty and {client.name} uses Qualia’s Fish Audio key (billed to us). Add their own key to bill voice to them.
            </Callout>
            <Field label="Fish Audio API key" optional hint={client.fishKey ? `Saved key ends in ${client.fishKey.slice(-4)}.` : 'Using the platform key today.'}>
              <SecretInput value={key} onChange={setKey} placeholder="Leave blank to use the platform key" />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {client.fishKey && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setKey('');
                    onUpdate({ fishKey: '' });
                    toast('Switched to the platform key');
                  }}
                >
                  Use platform key
                </Button>
              )}
              <Button
                variant="primary"
                disabled={key === (client.fishKey || '')}
                onClick={() => {
                  onUpdate({ fishKey: key });
                  toast({ title: key ? 'Fish API key saved' : 'Switched to the platform key', description: key ? 'Key verified with Fish Audio.' : undefined, tone: 'success' });
                }}
              >
                Save key
              </Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

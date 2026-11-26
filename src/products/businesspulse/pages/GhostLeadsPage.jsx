import { useMemo, useState } from 'react';
import { CaretDown, Check, Copy, CurrencyInr, Ghost, Lightning, Phone, Rows, SquaresFour, Target, Trophy, UserCircle, WarningCircle, WhatsappLogo, CircleHalf } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtCurrency, fmtNumber, fmtPhone, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, DataTable, EmptyState, FilterBar, FilterSelect, Menu, ProgressRing, Segmented, Skeleton, StatCard, StatGrid, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer } from '@/shared/patterns';
import { listGhostLeads } from '@/services/businesspulse';
import { ProcessChip, useProcess } from '../components/ProcessContext';
import { EnterpriseGate, Eyebrow } from '../components/common';

const STATUSES = ['New', 'Followed up', 'Won', 'Lost'];
const STATUS_TONE = { New: 'info', 'Followed up': 'warning', Won: 'success', Lost: 'neutral' };
const lakh = (v) => (v >= 10000000 ? `₹${(v / 10000000).toFixed(2)} Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(1)} L` : fmtCurrency(v));
const intentTone = (v) => (v >= 85 ? 'success' : v >= 75 ? 'brand' : 'warning');

export default function GhostLeadsPage() {
  return (
    <EnterpriseGate feature="ghost">
      <GhostLeads />
    </EnterpriseGate>
  );
}

function GhostLeads() {
  const { processId } = useProcess();
  const toast = useToast();
  const { data, loading, setData } = useQuery(() => listGhostLeads(processId), [processId]);
  const [view, setView] = useState('cards');
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState(['New']);
  const [agents, setAgents] = useState([]);
  const [call, setCall] = useState(null);

  const all = data || [];
  const rows = all.filter((g) => (!search || `${g.customer} ${g.want} ${g.blocker}`.toLowerCase().includes(search.toLowerCase())) && (!statuses.length || statuses.includes(g.status)) && (!agents.length || agents.includes(g.agentName)));
  const open = all.filter((g) => g.status === 'New' || g.status === 'Followed up');
  const won = all.filter((g) => g.status === 'Won');

  const setStatus = (id, status) => {
    setData((list) => list.map((g) => (g.id === id ? { ...g, status } : g)));
    toast({ title: `Marked as ${status.toLowerCase()}`, tone: status === 'Won' ? 'success' : 'info' });
  };
  const copy = (g) => {
    navigator.clipboard?.writeText(g.message);
    toast({ title: 'Message copied', description: 'Paste it in WhatsApp or SMS.' });
  };
  const send = (g) => {
    setData((list) => list.map((x) => (x.id === g.id ? { ...x, status: x.status === 'New' ? 'Followed up' : x.status } : x)));
    toast({ title: 'Queued in UltraChat', description: `${g.customer.split(' ')[0]} gets the message from your WhatsApp number in a minute.` });
  };

  const agentOpts = useMemo(() => [...new Set(all.map((g) => g.agentName))].sort(), [all]);

  return (
    <Page>
      <PageHeader title="Ghost leads" icon={Ghost} description="Customers who were ready to buy, but the call ended without a next step. Win them back today." meta={<ProcessChip />} />

      <StatGrid cols={4} className="mb-6">
        <StatCard loading={loading} label="Open ghost leads" value={fmtNumber(open.length)} icon={Ghost} tone="accent" hint="new + followed up" />
        <StatCard loading={loading} label="Revenue at risk" value={lakh(open.reduce((a, g) => a + g.value, 0))} icon={CurrencyInr} tone="danger" hint="estimated deal value" />
        <StatCard loading={loading} label="Avg intent" value={open.length ? Math.round(open.reduce((a, g) => a + g.intent, 0) / open.length) : '—'} unit="/100" icon={Target} hint="how ready they sounded" />
        <StatCard loading={loading} label="Won back" value={lakh(won.reduce((a, g) => a + g.value, 0))} icon={Trophy} tone="success" hint={`${won.length} leads this month`} />
      </StatGrid>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterBar
          className="flex-1"
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Customer, need or blocker"
          canReset={!!(search || agents.length || statuses.join() !== 'New')}
          onReset={() => {
            setSearch('');
            setAgents([]);
            setStatuses(['New']);
          }}
          actions={<Segmented size="sm" value={view} onChange={setView} options={[{ value: 'cards', label: 'Cards', icon: SquaresFour }, { value: 'table', label: 'Table', icon: Rows }]} />}
        >
          <FilterSelect label="Status" icon={CircleHalf} options={STATUSES} value={statuses} onChange={setStatuses} />
          <FilterSelect label="Agent" icon={UserCircle} options={agentOpts} value={agents} onChange={setAgents} searchable />
        </FilterBar>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : !rows.length ? (
        <Card>
          <EmptyState icon={Ghost} title={statuses.includes('New') && statuses.length === 1 ? 'No new ghost leads' : 'Nothing matches'} description="New ones appear as calls are scored. Clear filters to see followed-up, won and lost leads." />
        </Card>
      ) : view === 'cards' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((g) => (
            <GhostCard key={g.id} g={g} onStatus={setStatus} onCopy={copy} onSend={send} onOpen={() => setCall(g.call)} />
          ))}
        </div>
      ) : (
        <Card padded={false}>
          <DataTable
            rows={rows}
            onRowClick={(g) => setCall(g.call)}
            initialSort={{ key: 'intent', dir: 'desc' }}
            columns={[
              { key: 'intent', header: 'Intent', sortable: true, render: (g) => <ProgressRing value={g.intent} size={36} stroke={4} tone={intentTone(g.intent)} /> },
              {
                key: 'customer',
                header: 'Customer',
                render: (g) => (
                  <span className="block min-w-0">
                    <span className="block font-medium text-ink">{g.customer}</span>
                    <span className="block max-w-[280px] truncate text-xs text-ink-muted">{g.want}</span>
                  </span>
                ),
              },
              { key: 'blocker', header: 'Blocker', hideBelow: 'lg', render: (g) => <span className="line-clamp-2 max-w-[280px] text-xs">{g.blocker}</span> },
              { key: 'value', header: 'Value', align: 'right', sortable: true, render: (g) => <span className="font-semibold text-ink">{lakh(g.value)}</span> },
              { key: 'agentName', header: 'Agent', hideBelow: 'md' },
              { key: 'status', header: 'Status', render: (g) => <Badge tone={STATUS_TONE[g.status]} dot>{g.status}</Badge> },
              {
                key: 'act',
                header: '',
                align: 'right',
                render: (g) => (
                  <span className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="xs" variant="ghost" icon={Copy} onClick={() => copy(g)} iconOnly aria-label="Copy message" />
                    <Button size="xs" variant="soft" icon={WhatsappLogo} onClick={() => send(g)}>
                      Send
                    </Button>
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}

      <CallDetailDrawer call={call} open={!!call} onClose={() => setCall(null)} />
    </Page>
  );
}

function GhostCard({ g, onStatus, onCopy, onSend, onOpen }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card padded={false} className="group flex flex-col overflow-hidden transition hover:shadow-pop">
      <div className="flex items-start gap-4 p-5 pb-4">
        <ProgressRing value={g.intent} size={58} stroke={6} tone={intentTone(g.intent)} label={<span className="text-base">{g.intent}</span>} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold">{g.customer}</h3>
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Phone size={11} /> {fmtPhone(g.phone)} · {fmtRelative(g.detectedAt)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-xl font-bold tabular">{lakh(g.value)}</div>
              <div className="text-2xs text-ink-faint">potential value</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {g.signals.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-0.5 text-2xs text-ink-2">
                <Lightning size={10} weight="fill" className="text-brand" /> {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid border-y border-line sm:grid-cols-2">
        <div className="px-5 py-3">
          <Eyebrow>They wanted</Eyebrow>
          <p className="mt-1 text-[13px] leading-snug text-ink">{g.want}</p>
        </div>
        <div className="border-t border-line bg-danger/5 px-5 py-3 sm:border-l sm:border-t-0">
          <Eyebrow className="flex items-center gap-1 text-danger">
            <WarningCircle size={11} weight="bold" /> Why it slipped
          </Eyebrow>
          <p className="mt-1 text-[13px] leading-snug text-ink-2">{g.blocker}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <Eyebrow className="flex items-center gap-1">
            <WhatsappLogo size={12} weight="fill" className="text-success" /> Ready follow-up
          </Eyebrow>
          <button onClick={onOpen} className="text-xs font-medium text-brand hover:underline">
            Listen to call
          </button>
        </div>
        <div className="relative rounded-2xl rounded-tl-md bg-success/10 p-3 text-[13px] leading-relaxed text-ink">{g.message}</div>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <span className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-muted">
            <Avatar name={g.agentName} size="xs" /> <span className="truncate">{g.agentName}</span>
          </span>
          <Menu
            width={180}
            trigger={({ toggle }) => (
              <button onClick={toggle} className="inline-flex items-center gap-1">
                <Badge tone={STATUS_TONE[g.status]} dot>
                  {g.status}
                </Badge>
                <CaretDown size={10} className="text-ink-muted" />
              </button>
            )}
            items={STATUSES.map((s) => ({ label: s, active: s === g.status, onClick: () => onStatus(g.id, s) }))}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={copied ? Check : Copy}
            onClick={() => {
              onCopy(g);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="sm" variant="brand" icon={WhatsappLogo} onClick={() => onSend(g)} className={cn(g.status === 'Won' && 'hidden')}>
            Send on WhatsApp
          </Button>
        </div>
      </div>
    </Card>
  );
}

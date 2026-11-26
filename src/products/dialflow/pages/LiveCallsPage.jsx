import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Megaphone, PhoneCall } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDuration, fmtPhone } from '@/lib/format';
import { useQuery, useTick } from '@/lib/hooks';
import { Avatar, Badge, Card, DataTable, EmptyState, FilterBar, FilterSelect, LiveIndicator, MetricStrip, Waveform, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { MonitorButtons, SupervisionBar } from '../components/Supervision';
import { secondsSince } from '../components/agentState';

const SENT_TONE = { Positive: 'success', Neutral: 'neutral', Negative: 'danger' };

export default function LiveCallsPage() {
  const { data = [], loading } = useQuery(() => df.listLiveCalls(), []);
  const t = useTick(1000);
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [camps, setCamps] = useState([]);
  const [sent, setSent] = useState([]);
  const [search, setSearch] = useState('');
  const [updatedAt] = useState(() => new Date(Date.now() - 3000));

  const rows = data.filter((c) => (!camps.length || camps.includes(c.campaign)) && (!sent.length || sent.includes(c.sentiment)) && (!search || `${c.agent.name} ${c.contact.name}`.toLowerCase().includes(search.toLowerCase())));
  const durations = data.map((c) => secondsSince(c.startedAt, t));
  const longest = Math.max(0, ...durations);

  const pick = (call, mode) => {
    setSession((s) => ({ call, mode, since: s?.call.id === call.id ? s.since : Date.now() }));
    toast({ tone: 'info', title: mode === 'barge' ? `You joined ${call.agent.name}'s call` : mode === 'whisper' ? `Whispering to ${call.agent.name}` : `Listening to ${call.agent.name}`, description: mode === 'whisper' ? 'The customer cannot hear you.' : mode === 'listen' ? 'Nobody can hear you.' : 'Both sides can hear you.', duration: 2200 });
  };

  return (
    <Page>
      <PageHeader title="Live calls" description={`${data.length} calls in progress. Listen silently, whisper so only the agent hears you, or barge in to join the call.`} meta={<LiveIndicator updatedAt={updatedAt} />} />
      <MetricStrip
        className="mb-4"
        items={[
          { label: 'Calls in progress', value: data.length },
          { label: 'Avg duration so far', value: fmtDuration(durations.reduce((a, b) => a + b, 0) / Math.max(durations.length, 1)) },
          { label: 'Longest call', value: fmtClock(longest) },
          { label: 'Negative sentiment', value: data.filter((c) => c.sentiment === 'Negative').length, sub: 'worth a listen' },
        ]}
      />
      <FilterBar
        className="mb-4"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Agent or lead"
        canReset={!!(camps.length || sent.length || search)}
        onReset={() => {
          setCamps([]);
          setSent([]);
          setSearch('');
        }}
      >
        <FilterSelect label="Campaign" icon={Megaphone} options={[...new Set(data.map((c) => c.campaign))]} value={camps} onChange={setCamps} />
        <FilterSelect label="Sentiment" options={['Positive', 'Neutral', 'Negative']} value={sent} onChange={setSent} />
      </FilterBar>
      <Card padded={false}>
        <DataTable
          loading={loading}
          rows={rows}
          pageSize={0}
          rowClassName={(c) => (session?.call.id === c.id ? 'bg-brand/5' : '')}
          empty={<EmptyState icon={PhoneCall} title="No calls right now" description="When agents are on calls they appear here, live." compact />}
          columns={[
            {
              key: 'agent',
              header: 'Agent',
              render: (c) => (
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.agent.name} size="sm" status="busy" />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{c.agent.name}</div>
                    <div className="text-xs text-ink-muted">{c.agent.id}</div>
                  </div>
                </div>
              ),
            },
            {
              key: 'lead',
              header: 'Lead',
              render: (c) => (
                <div className="min-w-0">
                  <div className="truncate text-ink">{c.contact.name}</div>
                  <div className="flex items-center gap-1 text-xs text-ink-muted">
                    {c.direction === 'inbound' ? <ArrowDownLeft size={11} weight="bold" /> : <ArrowUpRight size={11} weight="bold" />}
                    {fmtPhone(c.contact.phone)}
                  </div>
                </div>
              ),
            },
            { key: 'campaign', header: 'Campaign', hideBelow: 'lg' },
            {
              key: 'duration',
              header: 'Duration',
              align: 'right',
              sortable: true,
              sortValue: (c) => -new Date(c.startedAt),
              render: (c) => {
                const s = secondsSince(c.startedAt, t);
                return (
                  <span className={cn('inline-flex items-center gap-2 font-mono font-semibold', s > 600 ? 'text-warning' : 'text-ink')}>
                    <Waveform bars={4} className="h-3 text-info" />
                    {fmtClock(s)}
                  </span>
                );
              },
            },
            { key: 'sentiment', header: 'Sentiment', hideBelow: 'md', render: (c) => (c.sentiment ? <Badge tone={SENT_TONE[c.sentiment]} dot>{c.sentiment}</Badge> : <span className="text-ink-faint">—</span>) },
            { key: 'actions', header: '', align: 'right', render: (c) => <MonitorButtons active={session?.call.id === c.id ? session.mode : null} onPick={(m) => pick(c, m)} /> },
          ]}
        />
      </Card>
      <SupervisionBar session={session} onMode={(mode) => pick(session.call, mode)} onStop={() => setSession(null)} />
      {session && <div className="h-24" />}
    </Page>
  );
}

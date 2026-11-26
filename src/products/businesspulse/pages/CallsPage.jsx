import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, DownloadSimple, MagnifyingGlass, Smiley, UserCircle, Megaphone, Tag, CircleHalf } from '@phosphor-icons/react';
import { fmtDateTime, fmtDuration, fmtNumber, fmtPercent, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, DataTable, DateRangeFilter, EmptyState, FilterBar, FilterSelect, MetricStrip, StatusBadge, Switch, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer } from '@/shared/patterns';
import { listCalls, rangeBounds, summarizeCalls, VIBES } from '@/services/businesspulse';
import { ProcessChip, useProcess, useViewer } from '../components/ProcessContext';
import { ScoreCell } from '../components/common';

const VIBE_TONE = { Happy: 'success', Neutral: 'neutral', Confused: 'warning', Frustrated: 'accent', Angry: 'danger' };

export default function CallsPage() {
  const { processId, process } = useProcess();
  const { isAgent, name } = useViewer();
  const [params] = useSearchParams();
  const toast = useToast();
  const initial = useMemo(() => ({ search: '', agents: [], campaigns: [], dispositions: [], statuses: [], vibes: [], fatalOnly: params.get('fatal') === '1', range: { preset: params.get('fatal') === '1' ? '30d' : '7d' } }), [params]);
  const [f, setF] = useState(initial);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const [open, setOpen] = useState(null);
  const { data, loading } = useQuery(() => listCalls(processId), [processId]);
  // ?call=<id> opens a call directly (shareable link from alerts and emails).
  useEffect(() => {
    const id = params.get('call');
    if (id && data) setOpen(data.find((c) => c.id === id) || null);
  }, [data, params]);

  const mine = useMemo(() => (data || []).filter((c) => !isAgent || c.agent.name === name), [data, isAgent, name]);
  const opts = useMemo(
    () => ({
      agents: [...new Set(mine.map((c) => c.agent.name))].sort(),
      campaigns: [...new Set(mine.map((c) => c.campaign))],
      dispositions: [...new Set(mine.map((c) => c.disposition))],
    }),
    [mine],
  );

  const rows = useMemo(() => {
    const { start, end } = rangeBounds(f.range);
    const q = f.search.trim().toLowerCase();
    return mine.filter(
      (c) =>
        c.startedAt >= start &&
        c.startedAt < end &&
        (!q || c.contact.name.toLowerCase().includes(q) || c.contact.phone.includes(q.replace(/\D/g, '') || '§') || c.agent.name.toLowerCase().includes(q) || c.id.includes(q)) &&
        (!f.agents.length || f.agents.includes(c.agent.name)) &&
        (!f.campaigns.length || f.campaigns.includes(c.campaign)) &&
        (!f.dispositions.length || f.dispositions.includes(c.disposition)) &&
        (!f.statuses.length || f.statuses.includes(c.status)) &&
        (!f.vibes.length || f.vibes.includes(c.vibe)) &&
        (!f.fatalOnly || c.fatal),
    );
  }, [mine, f]);

  const k = summarizeCalls(rows);
  const dirty = f.search || f.agents.length || f.campaigns.length || f.dispositions.length || f.statuses.length || f.vibes.length || f.fatalOnly || f.range.preset !== '7d';

  const columns = [
    {
      key: 'contact',
      header: 'Customer',
      render: (c) => (
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-muted">{c.direction === 'inbound' ? <ArrowDownLeft size={14} weight="bold" /> : <ArrowUpRight size={14} weight="bold" />}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{c.contact.name}</span>
            <span className="block text-xs text-ink-muted">{c.campaign}</span>
          </span>
        </span>
      ),
    },
    ...(isAgent
      ? []
      : [
          {
            key: 'agent',
            header: 'Agent',
            sortable: true,
            sortValue: (c) => c.agent.name,
            render: (c) => (
              <span className="flex items-center gap-2">
                <Avatar name={c.agent.name} size="xs" />
                <span className="truncate">{c.agent.name}</span>
              </span>
            ),
          },
        ]),
    { key: 'score', header: 'QA score', sortable: true, sortValue: (c) => c.score ?? -1, render: (c) => <ScoreCell value={c.score} fatal={c.fatal} /> },
    { key: 'status', header: 'Result', render: (c) => <StatusBadge status={c.status} /> },
    { key: 'disposition', header: 'Disposition', hideBelow: 'lg', render: (c) => <Badge>{c.disposition}</Badge> },
    { key: 'vibe', header: 'Vibe', hideBelow: 'xl', render: (c) => <Badge tone={VIBE_TONE[c.vibe]}>{c.vibe}</Badge> },
    { key: 'duration', header: 'Talk time', align: 'right', sortable: true, hideBelow: 'md', render: (c) => fmtDuration(c.duration) },
    { key: 'startedAt', header: 'When', align: 'right', sortable: true, sortValue: (c) => +c.startedAt, render: (c) => <span title={fmtDateTime(c.startedAt)}>{fmtRelative(c.startedAt)}</span> },
  ];

  return (
    <Page>
      <PageHeader
        title="Call history"
        description={isAgent ? 'Your scored calls. Open one to hear it and see where points were lost.' : `Every call scored in ${process?.short || 'this process'}.`}
        meta={<ProcessChip />}
        actions={
          <Button icon={DownloadSimple} onClick={() => toast({ title: `Exporting ${fmtNumber(rows.length)} calls`, description: 'Your filters are applied. The Excel file will download in a moment.', tone: 'info' })} disabled={!rows.length}>
            Export
          </Button>
        }
      />

      <MetricStrip
        className="mb-4"
        items={[
          { label: 'Calls', value: fmtNumber(rows.length), sub: `${fmtNumber(k.scored)} scored` },
          { label: 'Avg QA score', value: k.avgScore ?? '—' },
          { label: 'Pass rate', value: fmtPercent(k.passRate) },
          { label: 'Fatal errors', value: fmtNumber(k.fatal) },
          { label: 'Avg talk time', value: fmtDuration(k.avgTalk) },
        ]}
      />

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <FilterBar
            search={f.search}
            onSearch={set('search')}
            searchPlaceholder="Customer, phone or agent"
            canReset={!!dirty}
            onReset={() => setF({ ...initial, fatalOnly: false, range: { preset: '7d' } })}
            actions={<Switch size="sm" checked={f.fatalOnly} onChange={set('fatalOnly')} label="Fatal only" className="items-center gap-2" />}
          >
            <DateRangeFilter value={f.range} onChange={set('range')} />
            {!isAgent && <FilterSelect label="Agent" icon={UserCircle} options={opts.agents} value={f.agents} onChange={set('agents')} searchable />}
            <FilterSelect label="Campaign" icon={Megaphone} options={opts.campaigns} value={f.campaigns} onChange={set('campaigns')} />
            <FilterSelect label="Disposition" icon={Tag} options={opts.dispositions} value={f.dispositions} onChange={set('dispositions')} />
            <FilterSelect label="Result" icon={CircleHalf} options={['Passed', 'Failed', 'Processing']} value={f.statuses} onChange={set('statuses')} />
            <FilterSelect label="Vibe" icon={Smiley} options={VIBES} value={f.vibes} onChange={set('vibes')} />
          </FilterBar>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          onRowClick={setOpen}
          pageSize={12}
          initialSort={{ key: 'startedAt', dir: 'desc' }}
          rowClassName={(c) => (c.fatal ? 'bg-danger/[.03]' : '')}
          empty={<EmptyState compact icon={MagnifyingGlass} title="No calls match these filters" description="Widen the date range or clear a filter." />}
        />
      </Card>

      <CallDetailDrawer call={open} open={!!open} onClose={() => setOpen(null)} extraTabs={open?.fatal ? [{ id: 'fatal', label: 'Fatal error', render: (c) => <FatalTab call={c} /> }] : []} />
    </Page>
  );
}

function FatalTab({ call }) {
  const p = call.parameters.find((x) => x.fatal);
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-danger/25 bg-danger/5 p-4">
        <div className="text-xs font-semibold text-danger">{p.name}</div>
        <p className="mt-2 text-[15px] font-medium italic leading-relaxed text-ink">{call.fatalQuote}</p>
        <p className="mt-2 text-xs text-ink-muted">{p.note}</p>
      </div>
      <p className="text-xs text-ink-muted">A fatal error fails the call regardless of the total score. Alert emails went to the fatal-alert recipients of this process.</p>
    </div>
  );
}

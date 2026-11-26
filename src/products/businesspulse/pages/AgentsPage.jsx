import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleHalf, UsersThree, UsersFour, SortDescending } from '@phosphor-icons/react';
import { fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Card, DataTable, Delta, EmptyState, FilterBar, FilterSelect, Segmented, Sparkline } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listAgents } from '@/services/businesspulse';
import { ProcessChip, useProcess } from '../components/ProcessContext';
import { ScorePill } from '../components/common';

const STATUS_TONE = { Active: 'success', 'On leave': 'warning', Inactive: 'neutral' };

export default function AgentsPage() {
  const { processId } = useProcess();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useQuery(() => listAgents(processId), [processId]);
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState(['Active']);
  const [teams, setTeams] = useState([]);
  const [sort, setSort] = useState('high');

  const rows = (data || [])
    .filter((a) => (!search || `${a.name} ${a.empId}`.toLowerCase().includes(search.toLowerCase())) && (!statuses.length || statuses.includes(a.status)) && (!teams.length || teams.includes(a.team)))
    .sort((a, b) => (sort === 'high' ? (b.avgScore ?? -1) - (a.avgScore ?? -1) : sort === 'low' ? (a.avgScore ?? 999) - (b.avgScore ?? 999) : a.name.localeCompare(b.name)));

  return (
    <Page>
      <PageHeader title="Agents" icon={UsersThree} description="Everyone scored in this process over the last 30 days." meta={<ProcessChip />} />
      <Card padded={false}>
        <div className="border-b border-line p-4">
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Name or dialer ID"
            canReset={!!(search || teams.length || statuses.join() !== 'Active')}
            onReset={() => {
              setSearch('');
              setTeams([]);
              setStatuses(['Active']);
            }}
            actions={
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                <SortDescending size={14} />
                <Segmented size="sm" value={sort} onChange={setSort} options={[{ value: 'high', label: 'Top score' }, { value: 'low', label: 'Lowest' }, { value: 'name', label: 'A–Z' }]} />
              </span>
            }
          >
            <FilterSelect label="Status" icon={CircleHalf} options={['Active', 'On leave', 'Inactive']} value={statuses} onChange={setStatuses} />
            <FilterSelect label="Team" icon={UsersFour} options={[...new Set((data || []).map((a) => a.team))]} value={teams} onChange={setTeams} />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          onRowClick={(a) => navigate(`/businesspulse/agents/${a.id}`)}
          pageSize={15}
          empty={<EmptyState compact icon={UsersThree} title="No agents match" description="Change the status filter to see inactive agents." />}
          columns={[
            {
              key: 'name',
              header: 'Agent',
              render: (a) => (
                <span className="flex items-center gap-3">
                  <Avatar name={a.name} size="sm" />
                  <span>
                    <span className="block font-medium text-ink">{a.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {a.empId} · {a.team}
                    </span>
                  </span>
                </span>
              ),
            },
            { key: 'status', header: 'Status', hideBelow: 'md', render: (a) => <Badge tone={STATUS_TONE[a.status]} dot>{a.status}</Badge> },
            {
              key: 'avgScore',
              header: 'Avg score',
              render: (a) => (
                <span className="flex items-center gap-2">
                  <ScorePill value={a.avgScore} />
                  <Delta value={a.avgScore != null && a.prevScore != null ? a.avgScore - a.prevScore : null} suffix="" />
                </span>
              ),
            },
            { key: 'spark', header: 'Last 14 days', hideBelow: 'lg', render: (a) => <Sparkline data={a.spark} className="h-7 w-24" trend /> },
            { key: 'calls', header: 'Calls', align: 'right' },
            { key: 'passRate', header: 'Pass rate', align: 'right', hideBelow: 'md', render: (a) => (a.passRate == null ? '—' : `${Math.round(a.passRate)}%`) },
            { key: 'fatal', header: 'Fatal', align: 'right', render: (a) => (a.fatal ? <Badge tone="danger">{a.fatal}</Badge> : <span className="text-ink-faint">0</span>) },
            { key: 'lastCall', header: 'Last call', align: 'right', hideBelow: 'xl', render: (a) => fmtRelative(a.lastCall) },
          ]}
        />
      </Card>
    </Page>
  );
}

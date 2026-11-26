import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChalkboardTeacher, CircleHalf, ListChecks, Play, UserCircle, Hourglass } from '@phosphor-icons/react';
import { fmtDateTime, fmtDuration, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, DataTable, Drawer, EmptyState, FilterBar, FilterSelect, MetricStrip, StatusBadge } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listSessions } from '@/services/businesspulse';
import { ProcessChip, useProcess, useViewer } from '../components/ProcessContext';
import { ScorePill } from '../components/common';
import { SessionResult } from '../components/SessionResult';

const STATUSES = ['Completed', 'Grading', 'In progress', 'Not attempted', 'Plan ready', 'Unfinished'];

export default function CoachingHistoryPage() {
  const { processId } = useProcess();
  const { isAgent, name } = useViewer();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useQuery(() => listSessions(processId), [processId]);
  const [search, setSearch] = useState('');
  const [agents, setAgents] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [open, setOpen] = useState(null);

  const mine = useMemo(() => (data || []).filter((s) => !isAgent || s.agentName === name), [data, isAgent, name]);
  const rows = mine.filter((s) => (!search || s.agentName.toLowerCase().includes(search.toLowerCase())) && (!agents.length || agents.includes(s.agentName)) && (!statuses.length || statuses.includes(s.status)));
  const done = mine.filter((s) => s.status === 'Completed');
  const ready = done.filter((s) => s.verdict === 'Ready').length;

  return (
    <Page>
      <PageHeader
        title="Coaching history"
        icon={ListChecks}
        description="Every coaching plan and role-play session, with Diya’s verdict."
        meta={<ProcessChip />}
        actions={
          <Button variant="brand" icon={ChalkboardTeacher} as={Link} to="/businesspulse/coach">
            New session
          </Button>
        }
      />

      <MetricStrip
        className="mb-4"
        items={[
          { label: 'Sessions', value: mine.length },
          { label: 'Completed', value: done.length },
          { label: 'Marked ready', value: ready, sub: done.length ? `${Math.round((ready / done.length) * 100)}% of completed` : undefined },
          { label: 'Waiting on agent', value: mine.filter((s) => ['Plan ready', 'Not attempted', 'Unfinished'].includes(s.status)).length },
        ]}
      />

      <Card padded={false}>
        <div className="border-b border-line p-4">
          <FilterBar
            search={search}
            onSearch={isAgent ? undefined : setSearch}
            searchPlaceholder="Search agent"
            canReset={!!(search || agents.length || statuses.length)}
            onReset={() => {
              setSearch('');
              setAgents([]);
              setStatuses([]);
            }}
          >
            {!isAgent && <FilterSelect label="Agent" icon={UserCircle} options={[...new Set(mine.map((s) => s.agentName))].sort()} value={agents} onChange={setAgents} searchable />}
            <FilterSelect label="Status" icon={CircleHalf} options={STATUSES} value={statuses} onChange={setStatuses} />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          onRowClick={setOpen}
          pageSize={12}
          empty={<EmptyState compact icon={ChalkboardTeacher} title="No sessions match" description="Clear the filters or start a new coaching session." />}
          columns={[
            {
              key: 'agentName',
              header: 'Agent',
              sortable: true,
              render: (s) => (
                <span className="flex items-center gap-2.5">
                  <Avatar name={s.agentName} size="sm" />
                  <span className="font-medium text-ink">{s.agentName}</span>
                </span>
              ),
            },
            { key: 'focus', header: 'Focus', hideBelow: 'md', render: (s) => <span className="flex flex-wrap gap-1">{s.focus.map((f) => <Badge key={f} size="xs">{f}</Badge>)}</span> },
            { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            { key: 'verdict', header: 'Verdict', render: (s) => (s.verdict ? <StatusBadge status={s.verdict} /> : <span className="text-ink-faint">—</span>) },
            { key: 'overall', header: 'Score', align: 'right', sortable: true, sortValue: (s) => s.overall ?? -1, render: (s) => <ScorePill value={s.overall} /> },
            { key: 'duration', header: 'Length', align: 'right', hideBelow: 'lg', render: (s) => (s.duration ? fmtDuration(s.duration) : '—') },
            { key: 'createdAt', header: 'Created', align: 'right', sortable: true, sortValue: (s) => +s.createdAt, render: (s) => <span title={fmtDateTime(s.createdAt)}>{fmtRelative(s.createdAt)}</span> },
          ]}
        />
      </Card>

      <Drawer open={!!open} onClose={() => setOpen(null)} width={620} title={open ? `${open.agentName} · ${open.focus[0]}` : ''} subtitle={open && fmtDateTime(open.createdAt)}>
        {open && (
          <div className="p-6">
            {open.status === 'Completed' ? (
              <SessionResult
                compact
                agentName={open.agentName.split(' ')[0]}
                result={{
                  ...open,
                  practise: [`${open.focus[0]}: run the same scenario once more.`, `${open.focus[1]}: listen to 2 top-scored calls from the team.`],
                }}
              />
            ) : (
              <EmptyState
                icon={open.status === 'Grading' ? Hourglass : ChalkboardTeacher}
                title={open.status === 'Grading' ? 'Diya is grading this session' : open.status === 'In progress' ? 'Session in progress' : 'No result yet'}
                description={open.status === 'Plan ready' || open.status === 'Not attempted' ? 'The plan is ready. The agent has not started the role-play.' : open.status === 'Unfinished' ? 'The agent left before the scenario ended.' : 'Results show here in a minute or two.'}
                action={
                  ['Plan ready', 'Not attempted', 'Unfinished'].includes(open.status) && (
                    <Button variant="brand" icon={Play} onClick={() => navigate(`/businesspulse/coach?agent=${open.agentId}`)}>
                      Open plan
                    </Button>
                  )
                }
              />
            )}
          </div>
        )}
      </Drawer>
    </Page>
  );
}

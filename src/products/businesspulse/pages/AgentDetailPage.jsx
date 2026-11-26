import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChalkboardTeacher, ChartLineUp, ClockCounterClockwise, ListChecks, Target, UserCircle } from '@phosphor-icons/react';
import { fmtDate, fmtDuration, fmtNumber, fmtPercent, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, BarsChart, Button, Card, CardHeader, ChartCard, DataTable, EmptyState, MetricStrip, Skeleton, StatusBadge, TrendChart, scoreTone } from '@/design-system';
import { BackLink, Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer } from '@/shared/patterns';
import { getAgent } from '@/services/businesspulse';
import { useProcess } from '../components/ProcessContext';
import { ScoreCell, ScorePill } from '../components/common';

export default function AgentDetailPage() {
  const { id } = useParams();
  const { processId } = useProcess();
  const { data: a, loading } = useQuery(() => getAgent(processId, id), [processId, id]);
  const [open, setOpen] = useState(null);

  if (loading)
    return (
      <Page>
        <Skeleton className="mb-6 h-14 w-80" />
        <Skeleton className="h-80 rounded-2xl" />
      </Page>
    );
  if (!a)
    return (
      <Page>
        <BackLink to="/businesspulse/agents">Agents</BackLink>
        <EmptyState icon={UserCircle} title="Agent not in this process" description="Switch process in the sidebar or go back to the list." />
      </Page>
    );

  const params = a.params.map((p) => ({ name: p.short, you: p.pct, team: p.team }));

  return (
    <Page>
      <BackLink to="/businesspulse/agents">Agents</BackLink>
      <PageHeader
        className="mt-3"
        title={
          <span className="flex items-center gap-3">
            <Avatar name={a.name} size="lg" /> {a.name}
          </span>
        }
        meta={
          <>
            <Badge>{a.empId}</Badge>
            <Badge>{a.team}</Badge>
            <StatusBadge status={a.status} />
            <span className="text-xs text-ink-muted">Joined {fmtDate(a.joinedAt)}</span>
          </>
        }
        actions={
          <>
            <Button icon={ClockCounterClockwise} as={Link} to="/businesspulse/calls">
              All calls
            </Button>
            <Button variant="brand" icon={ChalkboardTeacher} as={Link} to={`/businesspulse/coach?agent=${a.id}`}>
              Coach {a.name.split(' ')[0]}
            </Button>
          </>
        }
      />

      <MetricStrip
        className="mb-4"
        items={[
          { label: 'Avg QA score (30 d)', value: a.kpis.avgScore ?? '—' },
          { label: 'Calls scored', value: fmtNumber(a.kpis.scored) },
          { label: 'Pass rate', value: fmtPercent(a.kpis.passRate) },
          { label: 'Fatal errors', value: fmtNumber(a.kpis.fatal) },
          { label: 'Avg talk time', value: fmtDuration(a.kpis.avgTalk) },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <ChartCard className="xl:col-span-3" title="Score trend" subtitle="Daily average vs team" icon={ChartLineUp} table={{ columns: [{ key: 'date', header: 'Day' }, { key: 'mine', header: a.name.split(' ')[0] }, { key: 'team', header: 'Team' }], rows: a.trend }}>
          <TrendChart data={a.trend} series={[{ key: 'mine', label: a.name.split(' ')[0], color: 'brand' }, { key: 'team', label: 'Team', color: 'faint' }]} yDomain={[40, 100]} height={260} />
        </ChartCard>
        <ChartCard className="xl:col-span-2" title="Parameter strengths" subtitle="Share of max score" icon={Target} table={{ columns: [{ key: 'name', header: 'Parameter' }, { key: 'you', header: 'Agent', format: fmtPercent }, { key: 'team', header: 'Team', format: fmtPercent }], rows: params }}>
          <BarsChart data={params} xKey="name" layout="vertical" series={[{ key: 'you', label: 'Agent' }]} colorBy={(d) => scoreTone(d.you)} valueFormatter={(v) => `${Math.round(v)}%`} height={260} />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Card padded={false} className="xl:col-span-3">
          <div className="px-5 pt-5">
            <CardHeader title="Recent calls" icon={ClockCounterClockwise} />
          </div>
          <DataTable
            rows={a.calls}
            pageSize={8}
            onRowClick={setOpen}
            dense
            columns={[
              { key: 'contact', header: 'Customer', render: (c) => <span className="font-medium text-ink">{c.contact.name}</span> },
              { key: 'score', header: 'Score', render: (c) => <ScoreCell value={c.score} fatal={c.fatal} /> },
              { key: 'disposition', header: 'Disposition', hideBelow: 'md', render: (c) => <Badge>{c.disposition}</Badge> },
              { key: 'startedAt', header: 'When', align: 'right', render: (c) => fmtRelative(c.startedAt) },
            ]}
          />
        </Card>
        <Card padded={false} className="xl:col-span-2">
          <div className="px-5 pt-5">
            <CardHeader title="Coaching sessions" icon={ListChecks} />
          </div>
          {a.sessions.length ? (
            <ul className="divide-y divide-line/70 px-5 pb-3">
              {a.sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{s.focus.join(' · ')}</span>
                    <span className="text-xs text-ink-muted">{fmtRelative(s.createdAt)}</span>
                  </span>
                  {s.verdict ? <StatusBadge status={s.verdict} /> : <StatusBadge status={s.status} />}
                  <ScorePill value={s.overall} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={ChalkboardTeacher} title="No coaching yet" action={<Button size="sm" variant="soft" as={Link} to={`/businesspulse/coach?agent=${a.id}`}>Build a plan</Button>} />
          )}
        </Card>
      </div>
      <CallDetailDrawer call={open} open={!!open} onClose={() => setOpen(null)} />
    </Page>
  );
}

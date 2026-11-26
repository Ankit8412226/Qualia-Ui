import { useState } from 'react';
import { ArrowDown, MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber, fmtPercent, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Badge, Button, Card, DataTable, Drawer, Sparkline, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';

const TONE = { Healthy: 'success', 'Likely spam': 'danger', 'Line down': 'danger' };
const labelCls = (l) => (l === 'Clean' ? 'text-success' : l === 'Not checked' ? 'text-ink-faint' : 'text-danger');

export default function NumberHealthPage() {
  const { data, loading, setData } = useQuery(() => df.getNumberHealth(), []);
  const [checking, setChecking] = useState([]);
  const [open, setOpen] = useState(null);
  const toast = useToast();
  const lines = data || [];
  const n = (v) => lines.filter((d) => d.verdict === v).length;
  const calls = lines.reduce((a, d) => a + d.callsToday, 0);

  const runCheck = (ids) => {
    setChecking((c) => [...c, ...ids]);
    setTimeout(() => {
      setData((all) => all.map((d) => (ids.includes(d.id) ? { ...d, lastCheck: new Date(), spamChecks: d.spamChecks.map((s) => ({ ...s, checkedAt: new Date() })) } : d)));
      setChecking((c) => c.filter((x) => !ids.includes(x)));
      toast({ title: ids.length > 1 ? `Checked ${ids.length} lines` : 'Spam check done', description: 'Labels from Jio, Airtel, Vi and BSNL are updated.' });
    }, 1600);
  };
  const current = open && lines.find((d) => d.id === open);

  return (
    <Page>
      <PageHeader
        title="Number health"
        description={
          loading ? 'Checking your lines…' : `${lines.length} lines · ${fmtNumber(calls)} calls today · ${n('Healthy')} healthy, ${n('Likely spam')} likely spam, ${n('Line down')} down. We compare each line's connect rate with its usual and check how operators label it.`
        }
        actions={
          <Button variant="brand" icon={MagnifyingGlass} loading={checking.length > 1} onClick={() => runCheck(lines.map((d) => d.id))}>
            Check all lines
          </Button>
        }
      />

      {n('Likely spam') + n('Line down') > 0 && (
        <p className="mb-3 text-sm text-ink-2">
          <span className="font-semibold text-danger">{n('Likely spam') + n('Line down')} lines need attention.</span> Rest spam-labelled numbers for 7–10 days and rotate in a fresh line from the same series.
        </p>
      )}

      <Card padded={false} className="overflow-hidden">
        <DataTable
          loading={loading}
          rows={[...lines].sort((a, b) => (a.verdict === 'Healthy') - (b.verdict === 'Healthy') || a.connectToday - a.baseline - (b.connectToday - b.baseline))}
          pageSize={0}
          onRowClick={(d) => setOpen(d.id)}
          rowClassName={(d) => (d.verdict !== 'Healthy' ? 'bg-danger/[.03]' : '')}
          columns={[
            { key: 'number', header: 'Line', render: (d) => <div><div className="font-mono text-[14px] font-semibold text-ink">{d.number}</div><div className="text-xs text-ink-muted">{d.group} · {d.type}</div></div> },
            { key: 'verdict', header: 'Status', render: (d) => <Badge tone={TONE[d.verdict]} dot>{d.verdict}</Badge> },
            {
              key: 'connectToday',
              header: 'Connect today',
              align: 'right',
              sortable: true,
              render: (d) => {
                const diff = d.connectToday - d.baseline;
                return (
                  <div>
                    <span className={cn('font-semibold', d.verdict !== 'Healthy' ? 'text-danger' : 'text-ink')}>{fmtPercent(d.connectToday, 0)}</span>
                    <div className="text-xs text-ink-muted">
                      usual {d.baseline}%
                      {diff < -3 && (
                        <span className="ml-1 inline-flex items-center font-semibold text-danger">
                          <ArrowDown size={10} weight="bold" />
                          {Math.abs(diff)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              },
            },
            { key: 'spark', header: 'Last 14 days', hideBelow: 'md', render: (d) => <Sparkline data={d.spark} className="h-8 w-28" trend /> },
            {
              key: 'ops',
              header: 'Operator labels',
              hideBelow: 'lg',
              render: (d) => {
                const flagged = d.spamChecks.filter((s) => s.label !== 'Clean' && s.label !== 'Not checked');
                if (d.verdict === 'Line down') return <span className="text-xs text-ink-faint">Not checked</span>;
                return flagged.length ? <span className="text-sm text-danger">{flagged.map((s) => s.operator).join(', ')} flag spam</span> : <span className="text-sm text-success">Clean on all 4</span>;
              },
            },
            { key: 'callsToday', header: 'Calls', align: 'right', hideBelow: 'md', sortable: true, render: (d) => fmtNumber(d.callsToday) },
            { key: 'lastCheck', header: 'Checked', hideBelow: 'xl', render: (d) => <span className="text-xs text-ink-muted">{fmtRelative(d.lastCheck)}</span> },
            {
              key: 'x',
              header: '',
              align: 'right',
              render: (d) => (
                <span onClick={(e) => e.stopPropagation()} role="presentation">
                  <Button size="xs" variant="ghost" loading={checking.includes(d.id)} onClick={() => runCheck([d.id])}>
                    Check now
                  </Button>
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        open={!!current}
        onClose={() => setOpen(null)}
        width={480}
        title={current ? <span className="font-mono text-lg font-bold">{current.number}</span> : ''}
        subtitle={current ? `${current.group} · ${current.type}` : ''}
        footer={
          current && (
            <Button variant="brand" icon={MagnifyingGlass} loading={checking.includes(current.id)} onClick={() => runCheck([current.id])}>
              Run spam check
            </Button>
          )
        }
      >
        {current && (
          <div className="flex flex-col gap-6 p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Badge tone={TONE[current.verdict]} dot>
                  {current.verdict}
                </Badge>
                <div className="mt-2 font-display text-3xl font-bold tabular">{fmtPercent(current.connectToday, 0)}</div>
                <div className="text-xs text-ink-muted">connect today · usual {current.baseline}% · {fmtNumber(current.callsToday)} calls</div>
              </div>
              <Sparkline data={current.spark} className="h-14 w-40" trend />
            </div>
            <p className="text-sm text-ink-2">{current.reason}</p>
            <div>
              <div className="mb-2 text-sm font-semibold">What operators show</div>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {current.spamChecks.map((s) => (
                  <li key={s.operator} className="flex items-center justify-between px-3 py-2.5 text-sm">
                    <span className="font-medium text-ink">{s.operator}</span>
                    <span className={cn('font-medium', labelCls(s.label))}>{s.label === 'Clean' || s.label === 'Not checked' ? s.label : `“${s.label}”`}</span>
                    <span className="w-24 text-right text-xs text-ink-faint">{fmtRelative(s.checkedAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Drawer>
    </Page>
  );
}

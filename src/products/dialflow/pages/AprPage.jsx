import { useMemo, useState } from 'react';
import { ArrowsClockwise, CaretDown, CaretUp, ChartBar, DownloadSimple, Megaphone } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtDuration, fmtNumber, fmtPercent } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Button, Callout, Card, DateRangeFilter, EmptyState, FilterSelect, MetricStrip, SkeletonRows } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { SplitLegend, TimeSplitBar } from '../components/TimeSplitBar';
import { downloadCsv } from '../components/csv';

const hm = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
};

const COLS = [
  { key: 'login', header: 'Login', fmt: hm },
  { key: 'available', header: 'Available', fmt: hm, dot: 'bg-success' },
  { key: 'talk', header: 'Talk', fmt: hm, dot: 'bg-brand' },
  { key: 'wrap', header: 'Wrap', fmt: hm, dot: 'bg-[rgb(var(--series-2))]' },
  { key: 'hold', header: 'Hold', fmt: hm, dot: 'bg-ink-faint' },
  { key: 'pauses', header: 'Breaks', fmt: hm, dot: 'bg-ink-muted' },
  { key: 'calls', header: 'Calls', fmt: fmtNumber },
  { key: 'aht', header: 'Avg handle', fmt: fmtDuration },
];

export default function AprPage() {
  const { data: camps = [] } = useQuery(() => df.listCampaigns(), []);
  const [campaign, setCampaign] = useState([]);
  const [range, setRange] = useState({ preset: 'today' });
  const [params, setParams] = useState({ campaign: 'all', range: 'today' });
  const { data, loading } = useQuery(() => df.getApr(params), [params]);
  const [sort, setSort] = useState({ key: 'login', dir: 'desc' });

  const draft = { campaign: campaign[0] || 'all', range: range.preset };
  const dirty = draft.campaign !== params.campaign || draft.range !== params.range;

  const rows = useMemo(() => [...(data || [])].sort((a, b) => (sort.key === 'name' ? a.name.localeCompare(b.name) : a[sort.key] - b[sort.key]) * (sort.dir === 'asc' ? 1 : -1)), [data, sort]);
  const totals = useMemo(() => {
    const t = { login: 0, available: 0, talk: 0, wrap: 0, hold: 0, pauses: 0, calls: 0 };
    (data || []).forEach((r) => Object.keys(t).forEach((k) => (t[k] += r[k])));
    t.aht = Math.round((t.talk + t.wrap + t.hold) / Math.max(t.calls, 1));
    return t;
  }, [data]);
  const maxLogin = Math.max(1, ...(data || []).map((r) => r.login));
  const occupancy = ((totals.talk + totals.wrap + totals.hold) / Math.max(totals.login - totals.pauses, 1)) * 100;
  const campLabel = camps.find((c) => c.id === params.campaign)?.name || 'All campaigns';

  const exportCsv = () =>
    downloadCsv(`apr-${params.campaign}-${params.range}`, [{ header: 'Agent', key: 'name' }, { header: 'Agent ID', key: 'id' }, ...COLS.map((c) => ({ header: c.key === 'pauses' ? 'Breaks (s)' : c.key === 'calls' ? 'Calls' : `${c.header} (s)`, key: c.key }))], [...rows, { name: 'Total', id: '', ...totals }]);

  const head = (key, label, align = 'right', extra) => (
    <th
      key={key}
      onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}
      className={cn('cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-ink-muted hover:text-ink', align === 'right' ? 'text-right' : 'text-left', extra)}
    >
      <span className={cn('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
        {label}
        {sort.key === key && (sort.dir === 'asc' ? <CaretUp size={11} weight="bold" /> : <CaretDown size={11} weight="bold" />)}
      </span>
    </th>
  );

  return (
    <Page>
      <PageHeader
        title="Agent performance"
        description="Where each agent's logged-in time went, and how many calls it produced."
        actions={
          <Button icon={DownloadSimple} onClick={exportCsv} disabled={!rows.length}>
            Download CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect label="Campaign" icon={Megaphone} single options={camps.map((c) => ({ value: c.id, label: c.name }))} value={campaign} onChange={setCampaign} />
        <DateRangeFilter value={range} onChange={setRange} />
        <Button variant={dirty ? 'brand' : 'secondary'} icon={ArrowsClockwise} onClick={() => setParams(draft)} disabled={!dirty}>
          Generate
        </Button>
        <span className="ml-auto text-xs text-ink-muted">
          Showing <span className="font-semibold text-ink-2">{campLabel}</span> · {params.range === 'today' ? 'Today' : params.range === 'yesterday' ? 'Yesterday' : `Last ${{ '7d': 7, '30d': 30 }[params.range] || 'few'} days`}
        </span>
      </div>

      <MetricStrip
        className="mb-4"
        items={[
          { label: 'Agents', value: rows.length },
          { label: 'Total login', value: hm(totals.login), sub: 'hours across all agents' },
          { label: 'Talk share', value: fmtPercent((totals.talk / Math.max(totals.login, 1)) * 100, 0), sub: 'of login time' },
          { label: 'Occupancy', value: fmtPercent(occupancy, 0), sub: 'busy ÷ (login − breaks)' },
          { label: 'Calls', value: fmtNumber(totals.calls) },
          { label: 'Avg handle time', value: fmtDuration(totals.aht) },
        ]}
      />

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <span className="text-xs text-ink-muted">
            <span className="font-semibold text-ink">Login = Available + Talk + Wrap + Hold + Breaks.</span> Available = ready and waiting for a call. Times in h:mm.
          </span>
          <SplitLegend />
        </div>
        {loading ? (
          <SkeletonRows rows={8} />
        ) : !rows.length ? (
          <EmptyState icon={ChartBar} title="No agents in this campaign" description="Pick another campaign or a wider date range." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  {head('name', 'Agent', 'left', 'pl-4')}
                  <th className="w-[26%] px-3 py-2.5 text-left text-xs font-semibold text-ink-muted">How login time split</th>
                  {COLS.map((c) => head(c.key, c.header))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line/70 transition-colors hover:bg-surface-2">
                    <td className="py-2.5 pl-4 pr-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.name} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">{r.name}</div>
                          <div className="text-2xs text-ink-muted">{r.group}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      <TimeSplitBar row={r} scale={r.login / maxLogin} />
                    </td>
                    {COLS.map((c) => (
                      <td key={c.key} className={cn('px-3 text-right tabular', c.key === 'login' ? 'font-semibold text-ink' : 'text-ink-2', c.key === 'pauses' && r.pauses / r.login > 0.18 && 'font-semibold text-danger')}>
                        {c.fmt(r[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line-strong bg-surface-2 font-semibold">
                  <td className="py-3 pl-4 pr-3 text-ink">Total · {rows.length} agents</td>
                  <td className="px-3">
                    <TimeSplitBar row={totals} />
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-3 text-right tabular text-ink">
                      {c.fmt(totals[c.key])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-2 text-xs text-ink-muted">Avg handle = (Talk + Wrap + Hold) ÷ Calls. Breaks above 18% of login are shown in red. Hover a bar for exact times.</p>
    </Page>
  );
}

import { useState } from 'react';
import { ArrowsLeftRight, ChartBar, ChartLine, Plus, SquaresFour, X, DownloadSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber, fmtPercent } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { BarsChart, Button, Card, ChartCard, DataTable, Field, Heatmap, Input, Popover, Skeleton, TrendChart, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { comparePeriods, PARAMS } from '@/services/businesspulse';
import { ProcessChip, useProcess } from '../components/ProcessContext';
import { EnterpriseGate, Eyebrow, ScorePill } from '../components/common';

const MAX = 10;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map((m, i) => ({ id: `m${i}`, label: `${m} 2026` }));
const WEEKS = ['Week 44', 'Week 45', 'Week 46', 'Week 47', 'Week 48'].map((w) => ({ id: w, label: `${w} 2026` }));
const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026'].map((q) => ({ id: q, label: q }));

export default function ComparePage() {
  return (
    <EnterpriseGate feature="compare">
      <Compare />
    </EnterpriseGate>
  );
}

function Compare() {
  const { processId } = useProcess();
  const toast = useToast();
  const [periods, setPeriods] = useState(MONTHS.slice(7));
  const { data, loading, error, reload } = useQuery(() => comparePeriods(processId, periods), [processId, periods.map((p) => p.id).join()]);
  const add = (p) => setPeriods((cur) => (cur.length >= MAX || cur.some((x) => x.id === p.id) ? cur : [...cur, p]));
  const remove = (id) => setPeriods((cur) => cur.filter((p) => p.id !== id));

  const trend = data?.map((d) => ({ date: d.label, ...Object.fromEntries(d.params.map((p) => [p.key, p.pct])) }));
  const best = data && [...data].sort((a, b) => b.avgScore - a.avgScore)[0];

  return (
    <Page>
      <PageHeader
        title="Compare periods"
        icon={ArrowsLeftRight}
        description="Put up to 10 periods side by side for monthly and quarterly reviews."
        meta={<ProcessChip />}
        actions={
          <Button icon={DownloadSimple} onClick={() => toast({ title: 'Exporting comparison', description: `${periods.length} periods, all parameters.`, tone: 'info' })}>
            Export
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {periods.map((p, i) => (
            <span key={p.id} className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface pl-3 pr-1.5 text-[13px] font-medium text-ink-2 shadow-card">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand/10 text-2xs font-bold text-brand">{i + 1}</span>
              {p.label}
              <button onClick={() => remove(p.id)} disabled={periods.length <= 2} aria-label={`Remove ${p.label}`} className="rounded-md p-1 text-ink-faint hover:bg-surface-3 hover:text-ink disabled:opacity-30">
                <X size={11} weight="bold" />
              </button>
            </span>
          ))}
          <AddPeriod onAdd={add} disabled={periods.length >= MAX} taken={periods.map((p) => p.id)} />
          <span className="text-xs text-ink-faint">
            {periods.length} of {MAX}
          </span>
        </div>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Score and pass rate"
          subtitle={best && `Best period: ${best.label} (${best.avgScore})`}
          icon={ChartBar}
          table={data && { columns: [{ key: 'label', header: 'Period' }, { key: 'avgScore', header: 'Avg score' }, { key: 'passRate', header: 'Pass rate', format: fmtPercent }, { key: 'calls', header: 'Calls', format: fmtNumber }], rows: data }}
        >
          {loading ? <Skeleton className="h-[280px] rounded-xl" /> : <BarsChart data={data} xKey="label" series={[{ key: 'avgScore', label: 'Avg QA score', color: 'brand' }, { key: 'passRate', label: 'Pass rate %', color: 'series-1' }]} height={280} />}
        </ChartCard>
        <ChartCard
          title="Parameters over time"
          subtitle="Share of max score per period"
          icon={ChartLine}
          table={trend && { columns: [{ key: 'date', header: 'Period' }, ...PARAMS.map((p) => ({ key: p.key, header: p.short }))], rows: trend }}
        >
          {loading ? <Skeleton className="h-[280px] rounded-xl" /> : <TrendChart data={trend} series={PARAMS.map((p) => ({ key: p.key, label: p.short }))} height={250} yDomain={[50, 100]} area={false} />}
        </ChartCard>
      </div>

      <ChartCard
        className="mt-4"
        title="Parameter × period"
        subtitle="Where each period was strong or weak"
        icon={SquaresFour}
        table={data && { columns: [{ key: 'short', header: 'Parameter' }, ...data.map((d, i) => ({ key: `p${i}`, header: d.label }))], rows: PARAMS.map((p) => ({ short: p.short, ...Object.fromEntries(data.map((d, i) => [`p${i}`, d.params.find((x) => x.key === p.key).pct])) })) }}
      >
        {loading ? <Skeleton className="h-[280px] rounded-xl" /> : <Heatmap rows={PARAMS.map((p) => ({ label: p.name, values: data.map((d) => d.params.find((x) => x.key === p.key).pct) }))} columns={data.map((d) => d.label)} scale="score" format={(v) => Math.round(v)} rowHeader="Parameter" />}
      </ChartCard>

      <Card padded={false} className="mt-4">
        <div className="px-5 pt-5">
          <Eyebrow className="mb-3">Summary</Eyebrow>
        </div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={data || []}
          pageSize={0}
          rowKey="id"
          columns={[
            { key: 'label', header: 'Period', render: (d) => <span className="font-medium text-ink">{d.label}</span> },
            { key: 'calls', header: 'Calls scored', align: 'right', render: (d) => fmtNumber(d.calls) },
            { key: 'avgScore', header: 'Avg score', align: 'right', render: (d) => <ScorePill value={d.avgScore} /> },
            { key: 'passRate', header: 'Pass rate', align: 'right', render: (d) => fmtPercent(d.passRate) },
            { key: 'fatal', header: 'Fatal', align: 'right', render: (d) => <span className={cn(d.fatal > 15 && 'font-semibold text-danger')}>{d.fatal}</span> },
          ]}
        />
      </Card>
    </Page>
  );
}

function AddPeriod({ onAdd, disabled, taken }) {
  const [custom, setCustom] = useState({ from: '', to: '' });
  const group = (title, list, close) => (
    <div>
      <div className="px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wider text-ink-faint">{title}</div>
      <div className="flex flex-wrap gap-1 px-1.5">
        {list.map((p) => (
          <button
            key={p.id}
            disabled={taken.includes(p.id)}
            onClick={() => {
              onAdd(p);
              close();
            }}
            className="rounded-lg px-2 py-1 text-xs text-ink-2 hover:bg-surface-3 disabled:opacity-35"
          >
            {p.label.replace(' 2026', '')}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <Popover
      width={300}
      trigger={({ toggle }) => (
        <Button variant="soft" size="sm" icon={Plus} onClick={toggle} disabled={disabled}>
          Add period
        </Button>
      )}
    >
      {({ close }) => (
        <div className="flex flex-col gap-1 pb-1">
          {group('Months', MONTHS, close)}
          {group('Weeks', WEEKS, close)}
          {group('Quarters', QUARTERS, close)}
          <div className="mt-1 border-t border-line p-2">
            <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">Custom range</div>
            <div className="grid grid-cols-2 gap-2">
              <Field>
                <Input type="date" size="sm" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
              </Field>
              <Field>
                <Input type="date" size="sm" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
              </Field>
            </div>
            <Button
              size="xs"
              variant="brand"
              className="mt-2 w-full"
              disabled={!custom.from || !custom.to}
              onClick={() => {
                onAdd({ id: `c${custom.from}${custom.to}`, label: `${custom.from.slice(5)} → ${custom.to.slice(5)}` });
                setCustom({ from: '', to: '' });
                close();
              }}
            >
              Add custom range
            </Button>
          </div>
        </div>
      )}
    </Popover>
  );
}

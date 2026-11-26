import { useState } from 'react';
import { ArrowsDownUp, ChartLine, Trophy, UsersThree } from '@phosphor-icons/react';
import { fmtPercent } from '@/lib/format';
import { BarsChart, ChartCard, DonutChart, Heatmap, Segmented, Skeleton, TrendChart } from '@/design-system';

const short = (s, n = 26) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const pct = (v) => fmtPercent(v, 0);

/** Charts above the metric cards: every metric for the selected process. */
export function MetricsOverviewCharts({ data, metrics, loading }) {
  const [view, setView] = useState('trend');
  if (loading || !data) {
    return (
      <div className="mb-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
    );
  }
  const series = metrics.map((m) => ({ key: m.id, label: short(m.name, 30) }));
  const ranking = metrics.map((m) => ({ name: short(m.name), pct: Math.round(m.pct * 10) / 10 })).sort((a, b) => b.pct - a.pct);
  const impact = data.perMetric.map((m) => ({ name: short(m.name, 22), with: m.convertedWith, without: m.convertedWithout }));

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="All metrics over time"
          subtitle="% of scored calls that matched each metric, per day · last 14 days"
          icon={ChartLine}
          actions={
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'trend', label: 'Trend' },
                { value: 'ranking', label: 'Ranking' },
              ]}
            />
          }
          table={{
            columns: [{ key: 'date', header: 'Date' }, ...metrics.map((m) => ({ key: m.id, header: short(m.name, 18), format: (v) => (v == null ? '—' : `${v}%`) }))],
            rows: data.trend,
          }}
        >
          {view === 'trend' ? (
            <TrendChart data={data.trend} series={series} height={280} area={false} valueFormatter={(v) => `${v}%`} />
          ) : (
            <BarsChart data={ranking} xKey="name" series={[{ key: 'pct', label: '% of calls' }]} layout="vertical" height={280} categoryWidth={190} valueFormatter={(v) => `${v}%`} />
          )}
        </ChartCard>

        <ChartCard
          title="Effect on conversion"
          subtitle="Conversion when the metric happened vs when it didn’t"
          icon={ArrowsDownUp}
          table={{
            columns: [
              { key: 'name', header: 'Metric' },
              { key: 'with', header: 'With', format: pct },
              { key: 'without', header: 'Without', format: pct },
            ],
            rows: impact,
          }}
        >
          <BarsChart
            data={impact}
            xKey="name"
            layout="vertical"
            height={280}
            categoryWidth={176}
            series={[
              { key: 'with', label: 'Metric happened', color: 'brand' },
              { key: 'without', label: 'Didn’t happen', color: 'neutral' },
            ]}
            valueFormatter={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Who triggers each metric"
        subtitle="% of each agent’s scored calls where the metric happened · darker = more often"
        icon={UsersThree}
        table={{
          columns: [{ key: 'label', header: 'Agent' }, ...metrics.map((m, i) => ({ key: `m${i}`, header: short(m.name, 18), format: (v) => (v == null ? '—' : `${v}%`) }))],
          rows: data.heatmap.map((r) => Object.fromEntries([['label', r.label], ...r.values.map((v, i) => [`m${i}`, v])])),
        }}
      >
        <Heatmap rowHeader="Agent" columns={metrics.map((m) => short(m.name, 22))} rows={data.heatmap} format={(v) => `${Math.round(v)}%`} />
      </ChartCard>
    </div>
  );
}

/** Charts inside a metric's drawer. */
export function MetricDetailCharts({ metric, analytics }) {
  const pm = analytics?.perMetric.find((x) => x.id === metric.id);
  if (!pm) return null;
  const trend = analytics.trend.map((r) => ({ date: r.date, v: r[metric.id] }));
  const lift = pm.convertedWith - pm.convertedWithout;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Conversion with', pct(pm.convertedWith)],
          ['Conversion without', pct(pm.convertedWithout)],
          ['Difference', `${lift > 0 ? '+' : ''}${lift.toFixed(1)} pts`],
        ].map(([l, v], i) => (
          <div key={l} className="rounded-2xl border border-line p-3">
            <div className="text-2xs text-ink-muted">{l}</div>
            <div className={`font-display text-lg font-bold tabular ${i === 2 ? (lift >= 0 ? 'text-success' : 'text-danger') : ''}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line p-4">
        <div className="mb-2 text-xs font-semibold text-ink-muted">% of calls per day</div>
        <TrendChart data={trend} series={[{ key: 'v', label: metric.name }]} height={170} valueFormatter={(v) => `${v}%`} />
      </div>

      <div className="rounded-2xl border border-line p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          <Trophy size={13} /> By agent (% of their calls)
        </div>
        <BarsChart data={pm.byAgent.slice(0, 8)} xKey="name" layout="vertical" categoryWidth={120} series={[{ key: 'pct', label: '% of calls' }]} height={Math.max(160, pm.byAgent.slice(0, 8).length * 30)} valueFormatter={(v) => `${v}%`} />
      </div>

      {pm.byDisposition.length > 0 && (
        <div className="rounded-2xl border border-line p-4">
          <div className="mb-3 text-xs font-semibold text-ink-muted">How these calls ended</div>
          <DonutChart data={pm.byDisposition} height={150} centerLabel="calls" />
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Scales, Target, TrendDown, TrendUp, UsersThree } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber, fmtPercent } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Card, CardHeader, ChartCard, EmptyState, Input, MetricStrip, RadarChart, Segmented, Skeleton } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { getQualityDelta } from '@/services/businesspulse';
import { ProcessChip, useProcess } from '../components/ProcessContext';
import { EnterpriseGate, Eyebrow } from '../components/common';
import { DumbbellChart } from '../components/DumbbellChart';

const iso = (d) => d.toISOString().slice(0, 10);
const TODAY = new Date('2026-11-26T12:00:00+05:30');
const back = (n) => iso(new Date(TODAY.getTime() - n * 86400000));
const PRESETS = {
  week: { before: { from: back(13), to: back(7) }, after: { from: back(6), to: back(0) }, label: 'Week on week' },
  month: { before: { from: back(59), to: back(30) }, after: { from: back(29), to: back(0) }, label: '30 days vs 30 before' },
  training: { before: { from: back(40), to: back(22) }, after: { from: back(14), to: back(0) }, label: 'Around training (12 Nov)' },
};

export default function QualityDeltaPage() {
  return (
    <EnterpriseGate feature="delta">
      <QualityDelta />
    </EnterpriseGate>
  );
}

function PeriodBox({ label, tone, value, onChange }) {
  return (
    <div className={cn('flex flex-1 flex-col gap-2 rounded-2xl border p-3', tone === 'after' ? 'border-brand/30 bg-brand/5' : 'border-line bg-surface')}>
      <Eyebrow className={tone === 'after' ? 'text-brand' : ''}>{label}</Eyebrow>
      <div className="flex items-center gap-2">
        <Input type="date" size="sm" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} aria-label={`${label} from`} />
        <span className="text-ink-faint">→</span>
        <Input type="date" size="sm" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} aria-label={`${label} to`} />
      </div>
    </div>
  );
}

function QualityDelta() {
  const { processId } = useProcess();
  const [preset, setPreset] = useState('month');
  const [before, setBefore] = useState(PRESETS.month.before);
  const [after, setAfter] = useState(PRESETS.month.after);
  const { data, loading } = useQuery(() => getQualityDelta(processId, { preset: 'custom', ...before }, { preset: 'custom', ...after }), [processId, before.from, before.to, after.from, after.to]);

  const choose = (p) => {
    setPreset(p);
    if (PRESETS[p]) {
      setBefore(PRESETS[p].before);
      setAfter(PRESETS[p].after);
    }
  };
  const diff = data && data.after.avgScore != null && data.before.avgScore != null ? data.after.avgScore - data.before.avgScore : null;
  const improved = data?.movers.filter((m) => m.change > 0).slice(0, 5) || [];
  const declined = data ? [...data.movers].reverse().filter((m) => m.change < 0).slice(0, 5) : [];

  return (
    <Page>
      <PageHeader title="Quality delta" icon={Scales} description="Did quality move between two periods? See it per parameter and per agent." meta={<ProcessChip />}>
        <Card className="flex flex-col gap-3 p-4">
          <Segmented value={preset} onChange={choose} options={[...Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })), { value: 'custom', label: 'Custom' }]} className="self-start" />
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <PeriodBox label="Before" value={before} onChange={(v) => (setBefore(v), setPreset('custom'))} />
            <ArrowRight size={18} className="hidden shrink-0 text-ink-faint md:block" />
            <PeriodBox label="After" tone="after" value={after} onChange={(v) => (setAfter(v), setPreset('custom'))} />
          </div>
        </Card>
      </PageHeader>

      {loading ? (
        <Skeleton className="mb-4 h-20 w-full rounded-2xl" />
      ) : (
        <div className="mb-4 grid gap-4 md:grid-cols-[1.1fr_2fr]">
          <Card className={cn('flex items-center gap-4', diff >= 0 ? 'ring-1 ring-success/30' : 'ring-1 ring-danger/30')}>
            <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', diff >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>{diff >= 0 ? <TrendUp size={24} weight="bold" /> : <TrendDown size={24} weight="bold" />}</span>
            <div>
              <div className="text-xs text-ink-muted">Avg QA score moved</div>
              <div className={cn('font-display text-3xl font-bold tabular', diff >= 0 ? 'text-success' : 'text-danger')}>
                {diff == null ? '—' : `${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)} pts`}
              </div>
              <div className="text-xs text-ink-muted">
                {data.before.avgScore ?? '—'} → <b className="text-ink">{data.after.avgScore ?? '—'}</b>
              </div>
            </div>
          </Card>
          <MetricStrip
            items={[
              { label: 'Calls scored', value: fmtNumber(data.after.scored), sub: `was ${fmtNumber(data.before.scored)}` },
              { label: 'Pass rate', value: fmtPercent(data.after.passRate), sub: `was ${fmtPercent(data.before.passRate)}` },
              { label: 'Fatal errors', value: fmtNumber(data.after.fatal), sub: `was ${fmtNumber(data.before.fatal)}` },
            ]}
          />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          title="Per parameter"
          subtitle="Share of max score, before → after"
          icon={Target}
          table={data && { columns: [{ key: 'name', header: 'Parameter' }, { key: 'before', header: 'Before', format: fmtPercent }, { key: 'after', header: 'After', format: fmtPercent }, { key: 'change', header: 'Change' }], rows: data.params }}
        >
          {loading ? <Skeleton className="h-[300px] rounded-xl" /> : <DumbbellChart rows={data.params.map((p) => ({ label: p.name, before: p.before, after: p.after, badge: p.fatal && <Badge tone="danger" size="xs">Fatal</Badge> }))} min={50} max={100} />}
        </ChartCard>
        <ChartCard
          className="xl:col-span-2"
          title="Checklist shape"
          subtitle="Before vs after"
          icon={Scales}
          table={data && { columns: [{ key: 'short', header: 'Parameter' }, { key: 'before', header: 'Before', format: fmtPercent }, { key: 'after', header: 'After', format: fmtPercent }], rows: data.params }}
        >
          {loading ? <Skeleton className="h-[300px] rounded-xl" /> : <RadarChart data={data.params.map((p) => ({ parameter: p.short, before: Math.round(p.before ?? 0), after: Math.round(p.after ?? 0) }))} series={[{ key: 'before', label: 'Before', color: 'faint' }, { key: 'after', label: 'After', color: 'brand' }]} height={300} />}
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader title="Top movers" subtitle="Agents whose average changed the most" icon={UsersThree} />
        {loading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : !data.movers.length ? (
          <EmptyState compact icon={UsersThree} title="Not enough calls in both periods" />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {[
              ['Improved most', improved, 'success'],
              ['Declined most', declined, 'danger'],
            ].map(([title, list, tone]) => (
              <div key={title}>
                <Eyebrow className={cn('mb-2', tone === 'success' ? 'text-success' : 'text-danger')}>{title}</Eyebrow>
                {list.length ? (
                  <ul className="divide-y divide-line/70">
                    {list.map((m) => (
                      <li key={m.id}>
                        <Link to={`/businesspulse/agents/${m.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                          <Avatar name={m.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-ink">{m.name}</span>
                            <span className="text-xs tabular text-ink-muted">
                              {m.before} → {m.after}
                            </span>
                          </span>
                          <span className={cn('rounded-lg px-2 py-0.5 text-[13px] font-bold tabular', tone === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
                            {m.change > 0 ? '+' : '−'}
                            {Math.abs(m.change).toFixed(1)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-4 text-xs text-ink-muted">Nobody in this group.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}

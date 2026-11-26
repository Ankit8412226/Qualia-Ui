import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChatsCircle, CheckCircle, Checks, Clock, Eye, PaperPlaneTilt, Plus, SealCheck, ShieldCheck, ArrowBendUpLeft, Funnel as FunnelIcon, ChartLineUp, Timer } from '@phosphor-icons/react';
import { Badge, Button, Card, CardHeader, ChartCard, DataTable, Funnel, LiveIndicator, Progress, RankedBars, Skeleton, StatCard, StatGrid, StatusBadge, TrendChart, DateRangeFilter } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CreditBanner } from '@/shared/patterns';
import { useQuery } from '@/lib/hooks';
import { fmtCompact, fmtDate, fmtDuration, fmtNumber, fmtPercent } from '@/lib/format';
import { getOverview } from '@/services/ultrachat';
import { CategoryBadge } from '../components/wa';

export default function OverviewPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState({ preset: '7d' });
  const { data, loading, error, reload } = useQuery(() => getOverview(range), [range.preset]);
  const k = data?.kpis;

  return (
    <Page>
      <PageHeader
        title="Overview"
        description="How your WhatsApp messages and conversations are doing."
        meta={<LiveIndicator updatedAt={new Date(Date.now() - 20000)} />}
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} />
            <Button variant="brand" icon={Plus} onClick={() => navigate('/ultrachat/campaigns/new')}>
              New campaign
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {data ? (
          <CreditBanner label="Wallet balance" unit="₹" used={data.wallet.monthSpend} total={data.wallet.balance + data.wallet.monthSpend} onTopUp={() => navigate('/ultrachat/wallet?topup=1')} />
        ) : (
          <Skeleton className="h-12 rounded-2xl" />
        )}

        <StatGrid cols={3}>
          <StatCard loading={loading} label="Messages sent" value={k && fmtCompact(k.sent.value)} delta={k?.sent.delta} spark={k?.sent.spark} icon={PaperPlaneTilt} />
          <StatCard loading={loading} label="Delivered" value={k && fmtPercent(k.delivered.value)} delta={k?.delivered.delta} spark={k?.delivered.spark} icon={Checks} />
          <StatCard loading={loading} label="Read" value={k && fmtPercent(k.read.value)} delta={k?.read.delta} spark={k?.read.spark} icon={Eye} tone="info" />
          <StatCard loading={loading} label="Reply rate" value={k && fmtPercent(k.replyRate.value)} delta={k?.replyRate.delta} spark={k?.replyRate.spark} icon={ArrowBendUpLeft} tone="violet" />
          <StatCard loading={loading} label="Open chats" value={k && fmtNumber(k.openChats.value)} delta={k?.openChats.delta} inverse spark={k?.openChats.spark} icon={ChatsCircle} tone="warning" onClick={() => navigate('/ultrachat/inbox')} />
          <StatCard loading={loading} label="Avg first response" value={k && fmtDuration(k.firstResponse.value)} delta={k?.firstResponse.delta} inverse spark={k?.firstResponse.spark} icon={Timer} tone="accent" />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          <ChartCard
            title="Delivery funnel"
            subtitle="Sent → delivered → read → replied"
            icon={FunnelIcon}
            table={data && { columns: [{ key: 'label', header: 'Step' }, { key: 'value', header: 'Messages', format: fmtNumber }], rows: data.funnel }}
          >
            {loading ? <Skeleton className="h-56" /> : <Funnel steps={data.funnel} />}
          </ChartCard>
          <ChartCard
            title="Messages by day"
            subtitle="Last 14 days. The spike is the Baner pre-launch campaign."
            icon={ChartLineUp}
            table={data && { columns: [{ key: 'date', header: 'Day' }, { key: 'sent', header: 'Sent', format: fmtNumber }, { key: 'delivered', header: 'Delivered', format: fmtNumber }, { key: 'read', header: 'Read', format: fmtNumber }, { key: 'replied', header: 'Replied', format: fmtNumber }], rows: data.trend }}
          >
            {loading ? (
              <Skeleton className="h-64" />
            ) : (
              <TrendChart
                data={data.trend}
                valueFormatter={fmtCompact}
                series={[
                  { key: 'sent', label: 'Sent', color: 'series-4' },
                  { key: 'delivered', label: 'Delivered', color: 'brand' },
                  { key: 'read', label: 'Read', color: 'series-2' },
                  { key: 'replied', label: 'Replied', color: 'series-3' },
                ]}
              />
            )}
          </ChartCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Card padded={false} className="overflow-hidden">
            <TableHead title="Template performance" subtitle="Your most-sent approved templates" to="/ultrachat/templates" cta="All templates" />
            <DataTable
              loading={loading}
          error={error}
          onRetry={reload}
              rows={data?.templates || []}
              pageSize={0}
              dense
              onRowClick={() => navigate('/ultrachat/templates')}
              columns={[
                { key: 'name', header: 'Template', render: (t) => <span className="font-mono text-[13px] font-medium text-ink">{t.name}</span> },
                { key: 'category', header: 'Category', render: (t) => <CategoryBadge category={t.category} />, hideBelow: 'md' },
                { key: 'sent', header: 'Sent', align: 'right', sortable: true, render: (t) => fmtNumber(t.sent) },
                { key: 'readRate', header: 'Read', sortable: true, width: 150, render: (t) => <Progress value={t.readRate} size="sm" showLabel tone={t.readRate > 80 ? 'success' : 'brand'} /> },
                { key: 'replyRate', header: 'Replied', align: 'right', sortable: true, render: (t) => fmtPercent(t.replyRate), hideBelow: 'lg' },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="Agent first response" subtitle="Average time to first reply, fastest first" icon={Clock} />
            {loading ? (
              <Skeleton className="h-48" />
            ) : (
              <RankedBars
                format={fmtDuration}
                items={[...data.agents].sort((a, b) => a.firstResponse - b.firstResponse).map((a) => ({ label: a.name, value: a.firstResponse, tone: a.firstResponse > 180 ? 'danger' : a.firstResponse > 120 ? 'warning' : 'success' }))}
              />
            )}
            <p className="mt-4 text-xs text-ink-muted">Target: under 2 minutes. Slow replies let the 24-hour window close, which forces paid templates.</p>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr]">
          <NumberHealth health={data?.numberHealth} loading={loading} />
          <Card padded={false} className="overflow-hidden">
            <TableHead title="Recent campaigns" subtitle="Latest sends and what is coming up" to="/ultrachat/campaigns" cta="All campaigns" />
            <DataTable
              loading={loading}
          error={error}
          onRetry={reload}
              rows={data?.campaigns || []}
              pageSize={0}
              dense
              onRowClick={(c) => navigate(`/ultrachat/campaigns/${c.id}`)}
              columns={[
                {
                  key: 'name',
                  header: 'Campaign',
                  render: (c) => (
                    <span className="block min-w-0">
                      <span className="block truncate font-medium text-ink">{c.name}</span>
                      <span className="block truncate font-mono text-2xs text-ink-muted">{c.template}</span>
                    </span>
                  ),
                },
                { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
                { key: 'audience', header: 'Audience', align: 'right', render: (c) => fmtNumber(c.audience), hideBelow: 'md' },
                { key: 'read', header: 'Read', align: 'right', render: (c) => (c.delivered ? fmtPercent((c.read / c.delivered) * 100) : '—') },
                { key: 'date', header: 'When', render: (c) => <span className="text-xs text-ink-muted">{fmtDate(c.startedAt || c.scheduledAt)}</span>, hideBelow: 'lg' },
              ]}
            />
          </Card>
        </div>
      </div>
    </Page>
  );
}

function TableHead({ title, subtitle, to, cta }) {
  return (
    <div className="flex items-center justify-between gap-3 p-5 pb-3">
      <div>
        <h3 className="text-[15px] font-bold">{title}</h3>
        <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
      </div>
      <Button as={Link} to={to} size="sm" variant="ghost" iconRight={ArrowRight}>
        {cta}
      </Button>
    </div>
  );
}

function NumberHealth({ health, loading }) {
  if (loading || !health)
    return (
      <Card>
        <Skeleton className="h-56" />
      </Card>
    );
  const used = (health.used24h / health.tierLimit) * 100;
  return (
    <Card>
      <CardHeader
        title="WhatsApp number health"
        subtitle={health.number}
        icon={ShieldCheck}
        actions={
          <Badge tone="success" icon={SealCheck}>
            Verified
          </Badge>
        }
      />
      <div className="grid grid-cols-3 gap-3">
        <HealthTile label="Quality rating" value={health.quality} tone="success" hint="Few blocks or reports" />
        <HealthTile label="Messaging limit" value={health.tier} tone="brand" hint={`${fmtCompact(health.tierLimit)} people / 24 h`} />
        <HealthTile label="Display name" value={health.displayName} tone="success" hint={health.displayNameStatus} />
      </div>
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between gap-2 text-xs">
          <span className="text-ink-muted">Unique people messaged, last 24 h</span>
          <span className="font-semibold tabular text-ink">
            {fmtNumber(health.used24h)} / {fmtCompact(health.tierLimit)}
          </span>
        </div>
        <Progress value={used} tone={used > 80 ? 'warning' : 'brand'} />
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-success/5 p-3 text-xs text-ink-2">
        <CheckCircle size={16} weight="fill" className="mt-px shrink-0 text-success" />
        Quality is high. Keep it there: send marketing only to opted-in contacts and honour STOP replies.
      </div>
    </Card>
  );
}

const DOT = { success: 'bg-success', brand: 'bg-brand', warning: 'bg-warning', danger: 'bg-danger' };

function HealthTile({ label, value, hint, tone }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-2 p-3">
      <div className="truncate text-2xs text-ink-muted">{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[tone]}`} />
        <span className="truncate font-display text-[15px] font-bold">{value}</span>
      </div>
      <div className="mt-0.5 truncate text-2xs text-ink-faint">{hint}</div>
    </div>
  );
}

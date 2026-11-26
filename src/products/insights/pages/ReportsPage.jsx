import { CalendarPlus, DownloadSimple, EnvelopeSimple, FileXls, Sparkle, WhatsappLogo } from '@phosphor-icons/react';
import { fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Badge, Button, Card, CardHeader, DataTable, Progress, StatusBadge, Switch, useToast } from '@/design-system';
import { Page, PageHeader, ProductMark, SectionTitle } from '@/shared/layout';
import { insightsService } from '@/services/insights';
import { useNavigate } from 'react-router-dom';

export default function ReportsPage() {
  const reports = useQuery(() => insightsService.listReports(), []);
  const digests = useQuery(() => insightsService.listDigests(), []);
  const toast = useToast();
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Reports"
        description="Excel files Insights built for you, and summaries it sends on a schedule."
        actions={
          <Button variant="brand" icon={Sparkle} onClick={() => navigate('/insights')}>
            Ask for a report
          </Button>
        }
      />
      <Card padded={false} className="mb-8">
        <DataTable
          loading={reports.loading}
          rows={reports.data || []}
          columns={[
            {
              key: 'name',
              header: 'Report',
              render: (r) => (
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                    <FileXls size={18} weight="duotone" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{r.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {r.sheets} sheets · {r.rows.toLocaleString('en-IN')} rows
                    </span>
                  </span>
                </span>
              ),
            },
            { key: 'product', header: 'Data from', hideBelow: 'md', render: (r) => (r.product === 'all' ? <Badge>All products</Badge> : <ProductMark id={r.product} size="xs" />) },
            { key: 'createdAt', header: 'Created', hideBelow: 'md', render: (r) => fmtRelative(r.createdAt) },
            { key: 'status', header: 'Status', render: (r) => (r.status === 'Processing' ? <Progress value={r.progress} size="sm" showLabel className="w-32" /> : <StatusBadge status={r.status} />) },
            {
              key: 'dl',
              header: '',
              align: 'right',
              render: (r) => (
                <Button size="sm" icon={DownloadSimple} disabled={r.status !== 'Ready'} onClick={() => toast(`Downloading ${r.name}`)}>
                  {r.size}
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <SectionTitle title="Scheduled summaries" description="Insights writes these from fresh data each time." actions={<Button size="sm" icon={CalendarPlus}>New schedule</Button>} />
      <div className="grid gap-4 md:grid-cols-3">
        {(digests.data || []).map((d) => (
          <Card key={d.id}>
            <CardHeader title={d.name} subtitle={d.when} icon={d.channel === 'WhatsApp' ? WhatsappLogo : EnvelopeSimple} actions={<Switch size="sm" checked={d.active} onChange={() => toast(d.active ? 'Paused' : 'Resumed')} />} />
            <p className="text-xs text-ink-muted">
              Sent by {d.channel} to <span className="font-medium text-ink-2">{d.to}</span>
            </p>
          </Card>
        ))}
      </div>
    </Page>
  );
}

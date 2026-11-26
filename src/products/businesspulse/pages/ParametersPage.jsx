import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileXls, Plus, SlidersHorizontal, UploadSimple, WarningOctagon, FileText } from '@phosphor-icons/react';
import { fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Badge, Button, Card, DataTable, EmptyState, FileDrop, Modal, StatusBadge, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listParameterSets } from '@/services/businesspulse';

export default function ParametersPage() {
  const { data, loading, error, reload } = useQuery(() => listParameterSets(), []);
  const navigate = useNavigate();
  const toast = useToast();
  const [importing, setImporting] = useState(false);

  return (
    <Page>
      <PageHeader
        title="QA parameters"
        icon={SlidersHorizontal}
        description="Your QA checklists. The AI reads each parameter’s description to score calls, so write it like you would brief a QA analyst."
        actions={
          <>
            <Button icon={UploadSimple} onClick={() => setImporting(true)}>
              Import CSV / Excel
            </Button>
            <Button variant="brand" icon={Plus} as={Link} to="/businesspulse/parameters/new">
              New parameter set
            </Button>
          </>
        }
      />

      <Card padded={false}>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={data || []}
          onRowClick={(s) => navigate(`/businesspulse/parameters/${s.id}`)}
          pageSize={0}
          empty={<EmptyState icon={SlidersHorizontal} title="No parameter sets yet" description="Create one or import your existing QA sheet." />}
          columns={[
            {
              key: 'name',
              header: 'Parameter set',
              render: (s) => (
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <SlidersHorizontal size={17} weight="duotone" />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{s.name}</span>
                    <span className="block text-xs text-ink-muted">{s.processName}</span>
                  </span>
                </span>
              ),
            },
            { key: 'sections', header: 'Sections', align: 'right', hideBelow: 'md', render: (s) => s.sections.length },
            { key: 'paramCount', header: 'Parameters', align: 'right' },
            { key: 'fatalCount', header: 'Fatal', align: 'right', render: (s) => (s.fatalCount ? <Badge tone="danger" icon={WarningOctagon}>{s.fatalCount}</Badge> : '—') },
            { key: 'documents', header: 'Context docs', align: 'right', hideBelow: 'lg', render: (s) => <span className="inline-flex items-center gap-1"><FileText size={13} /> {s.documents.length}</span> },
            { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            { key: 'updatedAt', header: 'Updated', align: 'right', hideBelow: 'md', render: (s) => <span title={s.updatedBy}>{fmtRelative(s.updatedAt)} · {s.updatedBy.split(' ')[0]}</span> },
          ]}
        />
      </Card>

      <Modal open={importing} onClose={() => setImporting(false)} icon={FileXls} title="Import a QA sheet" description="Columns: Section, Parameter, Description, Max score, Weight, Fatal (yes/no).">
        <FileDrop
          accept=".csv,.xlsx,.xls"
          hint="CSV or Excel, one parameter per row"
          onFiles={(f) => {
            setImporting(false);
            toast({ title: `${f[0]?.name || 'Sheet'} imported`, description: '14 parameters in 5 sections. Review them before activating.' });
            navigate('/businesspulse/parameters/new');
          }}
        />
        <Button variant="link" size="sm" className="mt-3" onClick={() => toast({ title: 'Template downloaded', tone: 'info' })}>
          Download template
        </Button>
      </Modal>
    </Page>
  );
}

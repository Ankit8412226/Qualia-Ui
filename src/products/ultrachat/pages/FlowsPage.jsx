import { useNavigate } from 'react-router-dom';
import { ArrowRight, Copy, DotsThreeVertical, FlowArrow, Headset, Pause, Play, Plus, Robot, Trash } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { fmtNumber, fmtRelative } from '@/lib/format';
import { Badge, Button, Card, DataTable, EmptyState, Menu, Progress, StatusBadge, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listFlows } from '@/services/ultrachat';

function ReplyOrder() {
  const steps = [
    { icon: FlowArrow, title: '1. Flow', text: 'Keyword matches a live flow' },
    { icon: Robot, title: '2. AI bot', text: 'Answers from your documents' },
    { icon: Headset, title: '3. Agent', text: 'Picks it up in the inbox' },
  ];
  return (
    <Card className="mb-6 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="text-[13px] xl:w-56 xl:shrink-0">
          <div className="font-semibold text-ink">Who answers an incoming message</div>
          <div className="text-xs text-ink-muted">Each step passes on what it can’t handle.</div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {steps.map((s, i) => (
            <div key={s.title} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-surface-2 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <s.icon size={18} weight="duotone" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{s.title}</span>
                  <span className="block truncate text-xs text-ink-muted">{s.text}</span>
                </span>
              </div>
              {i < steps.length - 1 && <ArrowRight size={16} className="hidden shrink-0 text-ink-faint sm:block" />}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function FlowsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, setData, error, reload } = useQuery(() => listFlows(), []);
  const patch = (id, p) => setData((all) => all.map((f) => (f.id === id ? { ...f, ...p } : f)));

  return (
    <Page>
      <PageHeader
        title="Flow builder"
        description="Automatic conversations that answer common questions, collect details and route chats."
        actions={
          <Button variant="brand" icon={Plus} onClick={() => navigate('/ultrachat/flows/new')}>
            New flow
          </Button>
        }
      />
      <ReplyOrder />
      <Card padded={false} className="overflow-hidden">
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={data || []}
          pageSize={0}
          onRowClick={(f) => navigate(`/ultrachat/flows/${f.id}`)}
          empty={<EmptyState icon={FlowArrow} title="No flows yet" description="Start with a welcome menu: greet, show options, and hand over to an agent." action={<Button variant="brand" icon={Plus} onClick={() => navigate('/ultrachat/flows/new')}>New flow</Button>} />}
          columns={[
            {
              key: 'name',
              header: 'Flow',
              render: (f) => (
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <FlowArrow size={18} weight="duotone" />
                  </span>
                  <span className="font-semibold text-ink">{f.name}</span>
                </span>
              ),
            },
            { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
            {
              key: 'trigger',
              header: 'Trigger',
              hideBelow: 'md',
              render: (f) => (
                <span className="flex flex-wrap gap-1">
                  {f.trigger.split(',').slice(0, 3).map((k) => (
                    <Badge key={k} size="xs">
                      {k.trim()}
                    </Badge>
                  ))}
                </span>
              ),
            },
            { key: 'runs', header: 'Runs (30 d)', align: 'right', sortable: true, render: (f) => fmtNumber(f.runs) },
            { key: 'completion', header: 'Completed', width: 150, hideBelow: 'lg', render: (f) => (f.runs ? <Progress value={f.completion} size="sm" showLabel /> : <span className="text-ink-faint">—</span>) },
            { key: 'updatedAt', header: 'Edited', hideBelow: 'lg', render: (f) => <span className="text-xs text-ink-muted">{fmtRelative(f.updatedAt)}</span> },
            {
              key: 'menu',
              header: '',
              width: 48,
              render: (f) => (
                <span onClick={(e) => e.stopPropagation()}>
                  <Menu
                    trigger={({ toggle }) => (
                      <button onClick={toggle} aria-label="Flow actions" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink">
                        <DotsThreeVertical size={18} weight="bold" />
                      </button>
                    )}
                    items={[
                      f.status === 'Live' ? { label: 'Pause', icon: Pause, onClick: () => (patch(f.id, { status: 'Paused' }), toast(`${f.name} paused`)) } : { label: 'Go live', icon: Play, onClick: () => (patch(f.id, { status: 'Live' }), toast(`${f.name} is live`)) },
                      { label: 'Duplicate', icon: Copy, onClick: () => (setData((all) => [...all, { ...f, id: `${f.id}_copy`, name: `${f.name} (copy)`, status: 'Draft', runs: 0 }]), toast('Flow duplicated')) },
                      { divider: true },
                      {
                        label: 'Delete',
                        icon: Trash,
                        tone: 'danger',
                        onClick: async () => {
                          if (await confirm({ title: `Delete “${f.name}”?`, message: 'Customers mid-way through this flow will be passed to the AI bot.', tone: 'danger', confirmLabel: 'Delete flow' })) {
                            setData((all) => all.filter((x) => x.id !== f.id));
                            toast(`${f.name} deleted`);
                          }
                        },
                      },
                    ]}
                  />
                </span>
              ),
            },
          ]}
        />
      </Card>
    </Page>
  );
}

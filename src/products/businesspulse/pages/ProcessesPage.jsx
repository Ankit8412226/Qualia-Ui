import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, LockSimple, Plus, TreeStructure, UsersThree, PhoneCall, SlidersHorizontal } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtDate, fmtNumber } from '@/lib/format';
import { Badge, Button, Card, Skeleton, StatusBadge } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { useProcess } from '../components/ProcessContext';

export default function ProcessesPage() {
  const { processes, process: current, setProcessId, loading } = useProcess();
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Processes"
        icon={TreeStructure}
        description="A process is one client project. Each has its own agents, QA checklist, dispositions and alerts."
        actions={
          <Button variant="brand" icon={Plus} as={Link} to="/businesspulse/processes/new">
            New process
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)
          : processes.map((p) => (
              <Card key={p.id} interactive onClick={() => navigate(`/businesspulse/processes/${p.id}`)} className={cn('flex flex-col gap-4', p.id === current?.id && 'ring-2 ring-brand/30')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[16px] font-bold">{p.name}</h3>
                    <p className="text-xs text-ink-muted">Since {fmtDate(p.createdAt)}</p>
                  </div>
                  <StatusBadge status={p.active ? 'Active' : 'Paused'} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    [UsersThree, 'Agents', p.agentCount],
                    [PhoneCall, 'Calls', fmtNumber(p.callCount)],
                    [SlidersHorizontal, 'Checklist', p.parameterSet.replace(' QA', '')],
                  ].map(([Icon, l, v]) => (
                    <div key={l} className="rounded-xl bg-surface-2 px-3 py-2">
                      <div className="flex items-center gap-1 text-2xs text-ink-muted">
                        <Icon size={11} /> {l}
                      </div>
                      <div className="truncate text-sm font-semibold tabular">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.enterprise ? <Badge tone="violet">Enterprise</Badge> : <Badge icon={LockSimple}>Core · revenue intelligence off</Badge>}
                  <Badge>{p.features.length} features</Badge>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                  {p.id === current?.id ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
                      <Check size={13} weight="bold" /> Current process
                    </span>
                  ) : (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProcessId(p.id);
                      }}
                    >
                      Switch to this
                    </Button>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
                    Edit <ArrowRight size={12} />
                  </span>
                </div>
              </Card>
            ))}
      </div>
    </Page>
  );
}

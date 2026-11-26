import { useEffect, useState } from 'react';
import { CheckCircle, Function as FunctionIcon, MinusCircle, Plus, Sparkle, Quotes, Trash } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber, fmtPercent, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, Delta, Drawer, EmptyState, Field, Input, Modal, SearchInput, Skeleton, Sparkline, Spinner, Textarea, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer } from '@/shared/patterns';
import { getMetricsAnalytics, listMetrics, testMetric } from '@/services/businesspulse';
import { MetricDetailCharts, MetricsOverviewCharts } from '../components/MetricCharts';
import { ProcessChip, useProcess } from '../components/ProcessContext';
import { EnterpriseGate, ScorePill } from '../components/common';

const IDEAS = ['Customer asked for a discount', 'Agent interrupted the customer', 'Customer asked to speak to a manager', 'Agent shared a WhatsApp follow-up'];

export default function MetricsPage() {
  return (
    <EnterpriseGate feature="metrics">
      <Metrics />
    </EnterpriseGate>
  );
}

function Metrics() {
  const { processId } = useProcess();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, setData } = useQuery(() => listMetrics(processId), [processId]);
  const analytics = useQuery(() => getMetricsAnalytics(processId), [processId]);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [call, setCall] = useState(null);
  // ?metric=<id> opens that metric's drawer (shareable link).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('metric');
    if (id && data && !open) setOpen(data.find((m) => m.id === id) || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const rows = (data || []).filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Page>
      <PageHeader
        title="Custom metrics"
        icon={FunctionIcon}
        description="Describe anything in plain English. AI checks every call for it."
        meta={<ProcessChip />}
        actions={
          <Button variant="brand" icon={Plus} onClick={() => setCreating(true)}>
            New metric
          </Button>
        }
      />

      <MetricsOverviewCharts data={analytics.data} metrics={(data || []).filter((m) => analytics.data?.perMetric.some((p) => p.id === m.id))} loading={loading || analytics.loading} />

      <div className="mb-4 flex items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search metrics" className="w-full sm:w-72" />
        {data && <span className="text-xs text-ink-muted">{data.length} metrics · last 60 days</span>}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : !rows.length ? (
        <Card>
          <EmptyState icon={FunctionIcon} title={q ? 'No metric matches' : 'No metrics yet'} description="Try “Customer asked for a discount”." action={<Button variant="brand" icon={Plus} onClick={() => setCreating(true)}>New metric</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((m) => (
            <Card key={m.id} interactive onClick={() => setOpen(m)} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold leading-snug">{m.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{m.description}</p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Sparkle size={15} weight="duotone" />
                </span>
              </div>
              <div className="mt-auto flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[28px] font-bold leading-none tabular">{fmtPercent(m.pct, 0)}</span>
                    <span className="text-xs text-ink-muted">of calls</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Delta value={m.delta} /> {fmtNumber(m.count)} calls
                  </div>
                </div>
                <Sparkline data={m.spark} className="h-10 w-28" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        width={600}
        title={open?.name}
        subtitle={open && `${fmtNumber(open.count)} matching calls · ${fmtPercent(open.pct)} of all scored calls`}
        footer={
          open && (
            <Button
              variant="danger-soft"
              icon={Trash}
              onClick={async () => {
                if (await confirm({ title: `Delete “${open.name}”?`, message: 'The metric stops tracking. Past matches are removed from reports.', tone: 'danger', confirmLabel: 'Delete' })) {
                  setData((all) => all.filter((x) => x.id !== open.id));
                  setOpen(null);
                  toast('Metric deleted');
                }
              }}
            >
              Delete metric
            </Button>
          )
        }
      >
        {open && (
          <div className="flex flex-col gap-4 p-6">
            <div className="rounded-2xl bg-surface-2 p-4 text-[13px] text-ink-2">
              <div className="mb-1 text-2xs font-semibold uppercase tracking-wider text-ink-faint">AI instruction</div>
              {open.description}
              <div className="mt-2 text-2xs text-ink-muted">
                Created by {open.createdBy} · {fmtRelative(open.createdAt)}
              </div>
            </div>
            <MetricDetailCharts metric={open} analytics={analytics.data} />
            <div className="pt-2 text-xs font-semibold text-ink-muted">Matching calls</div>
            <ul className="divide-y divide-line/70">
              {open.calls.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setCall(c)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-surface-2">
                    <Avatar name={c.agent.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{c.contact.name}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {c.agent.name} · {fmtRelative(c.startedAt)}
                      </span>
                    </span>
                    <ScorePill value={c.score} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Drawer>

      <CallDetailDrawer call={call} open={!!call} onClose={() => setCall(null)} />
      {creating && (
        <CreateMetric
          processId={processId}
          onClose={() => setCreating(false)}
          onSave={(m) => {
            setData((all) => [m, ...all]);
            setCreating(false);
            toast({ title: 'Metric created', description: 'AI is checking the last 60 days of calls. Counts fill in over a few minutes.' });
          }}
        />
      )}
    </Page>
  );
}

function CreateMetric({ processId, onClose, onSave }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [preview, setPreview] = useState(null);
  const [testing, setTesting] = useState(false);
  const text = desc || name;

  // Live preview: re-test 600 ms after typing stops.
  useEffect(() => {
    if (text.trim().length < 8) {
      setPreview(null);
      return undefined;
    }
    setTesting(true);
    let alive = true;
    const t = setTimeout(() => testMetric(processId, text).then((r) => alive && (setPreview(r), setTesting(false))), 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [text, processId]);

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      icon={FunctionIcon}
      title="New custom metric"
      description="Write it the way you would explain it to a new QA analyst."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="brand"
            disabled={!name.trim() || !preview}
            onClick={() => onSave({ id: `met_${Date.now()}`, name, description: desc || name, count: 0, pct: preview ? (preview.matched / 20) * 100 : 0, delta: 0, spark: [0, 0], calls: [], createdBy: 'You', createdAt: new Date() })}
          >
            Create metric
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer asked for a discount" autoFocus />
          </Field>
          <Field label="What counts as a match?" hint="Mention languages, edge cases and what should not count.">
            <Textarea rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="The customer asks for a lower price, an offer or a waiver, in Hindi or English. Asking about EMI alone does not count." />
          </Field>
          <div>
            <div className="mb-2 text-xs text-ink-muted">Ideas</div>
            <div className="flex flex-wrap gap-1.5">
              {IDEAS.map((i) => (
                <button key={i} onClick={() => setName(i)} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand">
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-[360px] flex-col rounded-2xl border border-line bg-surface-2">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[13px] font-semibold">Test on 20 calls</span>
            {testing ? <Spinner size={15} /> : preview && <Badge tone="brand">{preview.matched} of 20 match</Badge>}
          </div>
          {!preview && !testing ? (
            <EmptyState compact icon={Sparkle} title="Live preview" description="Start typing. We test your wording on 20 recent calls as you go." className="my-auto" />
          ) : (
            <ul className={cn('max-h-[380px] flex-1 divide-y divide-line/70 overflow-y-auto transition-opacity', testing && 'opacity-50')}>
              {(preview?.results || []).map((r) => (
                <li key={r.call.id} className="flex gap-2.5 px-4 py-2.5">
                  {r.hit ? <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-success" /> : <MinusCircle size={16} className="mt-0.5 shrink-0 text-ink-faint" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className={cn('truncate', r.hit ? 'font-medium text-ink' : 'text-ink-muted')}>{r.call.contact.name}</span>
                      <span className="shrink-0 text-2xs text-ink-faint">{r.confidence}% sure</span>
                    </div>
                    {r.hit && r.evidence && (
                      <p className="mt-0.5 flex gap-1 text-xs italic text-ink-muted">
                        <Quotes size={10} weight="fill" className="mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{r.evidence}</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

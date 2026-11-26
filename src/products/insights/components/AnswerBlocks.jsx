import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Code,
  Copy,
  DownloadSimple,
  FileXls,
  Funnel as FunnelIcon,
  Info,
  Lightning,
  PushPin,
  Quotes,
  SealCheck,
  Sparkle,
  ThumbsDown,
  ThumbsUp,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Badge, BarsChart, Button, Card, Delta, DonutChart, Modal, Progress, Spinner, TrendChart, Tooltip, useToast } from '@/design-system';
import { ProductMark } from '@/shared/layout';
import { productById } from '@/app/products';

/* Building blocks of an Insights answer. Each answer `kind` composes a few of them. */

/** Thinking steps shown while an answer streams in. */
export function ThinkingSteps({ steps, done }) {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (done) return undefined;
    const id = setInterval(() => setShown((n) => Math.min(n + 1, steps.length)), 450);
    return () => clearInterval(id);
  }, [done, steps.length]);
  return (
    <ol className="flex flex-col gap-1.5">
      {steps.slice(0, done ? steps.length : shown).map((s, i) => {
        const finished = done || i < shown - 1;
        return (
          <li key={s} className="flex animate-rise items-center gap-2 text-[13px] text-ink-muted">
            {finished ? <CheckCircle size={15} weight="fill" className="text-success" /> : <Spinner size={14} className="text-brand" />}
            {s}
          </li>
        );
      })}
    </ol>
  );
}

function ScopeChips({ product, filters }) {
  const p = productById(product);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {product === 'all' ? (
        <Badge tone="neutral">All products</Badge>
      ) : (
        p && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 py-0.5 pl-0.5 pr-2 text-xs font-medium text-ink-2">
            <ProductMark id={product} size="xs" className="h-5 w-5 rounded-full" />
            {p.name}
          </span>
        )
      )}
      {filters?.map((f) => (
        <span key={f} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">
          <FunnelIcon size={10} weight="fill" />
          {f}
        </span>
      ))}
    </div>
  );
}

function Coverage({ text }) {
  if (!text) return null;
  return (
    <p className="flex items-start gap-1.5 text-xs text-ink-muted">
      <Info size={13} className="mt-px shrink-0" />
      {text}
    </p>
  );
}

function Grounding({ kind }) {
  if (kind === 'decline' || kind === 'clarify') return null;
  return (
    <Tooltip content="Every number comes from a checked query over your records. Click View query to see it.">
      <Badge tone="success" icon={SealCheck}>
        Grounded
      </Badge>
    </Tooltip>
  );
}

function FollowUps({ items, onAsk }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((f) => (
        <button key={f} onClick={() => onAsk(f)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand">
          {f}
          <ArrowRight size={11} weight="bold" />
        </button>
      ))}
    </div>
  );
}

function AnswerToolbar({ answer, onPin }) {
  const toast = useToast();
  const [queryOpen, setQueryOpen] = useState(false);
  const [vote, setVote] = useState(null);
  const btn = 'inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ink-muted transition hover:bg-surface-3 hover:text-ink';
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <button className={btn} onClick={() => setQueryOpen(true)}>
        <Code size={14} /> View query
      </button>
      <button
        className={btn}
        onClick={() => {
          onPin?.(answer);
          toast({ title: 'Pinned to your answers', description: 'It refreshes on its own.' });
        }}
      >
        <PushPin size={14} /> Pin
      </button>
      <button
        className={btn}
        onClick={() => {
          navigator.clipboard?.writeText(answer.text);
          toast('Answer copied');
        }}
      >
        <Copy size={14} /> Copy
      </button>
      <span className="mx-1 h-4 w-px bg-line" />
      <button aria-label="Good answer" className={cn(btn, vote === 'up' && 'text-success')} onClick={() => setVote('up')}>
        <ThumbsUp size={14} weight={vote === 'up' ? 'fill' : 'regular'} />
      </button>
      <button aria-label="Bad answer" className={cn(btn, vote === 'down' && 'text-danger')} onClick={() => setVote('down')}>
        <ThumbsDown size={14} weight={vote === 'down' ? 'fill' : 'regular'} />
      </button>
      <Modal open={queryOpen} onClose={() => setQueryOpen(false)} title="How this was answered" description="The checked query plan that produced the numbers." icon={Code} size="lg">
        <ol className="flex flex-col gap-3 text-[13px]">
          {[
            ['Route', answer.product === 'all' ? 'agentflow, dialflow, ultrachat' : answer.product],
            ['Filters', (answer.filters || ['—']).join(' · ')],
            ['Measure', answer.kind === 'narrative' ? 'transcript check: mentions “parking” (verified quotes)' : 'count(disposition in [Interested, Site visit booked])'],
            ['Group by', answer.kind === 'compare' ? 'product' : 'date'],
          ].map(([k, v], i) => (
            <li key={k} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">{i + 1}</span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">{k}</span>
                <span className="font-mono text-[12.5px] text-ink-2">{v}</span>
              </span>
            </li>
          ))}
        </ol>
      </Modal>
    </div>
  );
}

/* ---------------- kinds ---------------- */

function MetricBody({ a }) {
  const isBars = a.chart?.type === 'bars';
  return (
    <div className="flex flex-col gap-4">
      {a.headline && (
        <div className="flex flex-wrap items-end gap-3">
          <span className="font-display text-[44px] font-extrabold leading-none tracking-tight tabular">{a.headline.value}</span>
          <span className="pb-1.5 text-sm text-ink-muted">{a.headline.label}</span>
          <span className="flex items-center gap-1.5 pb-1.5 text-xs text-ink-muted">
            <Delta value={a.headline.delta} inverse={a.headline.inverse} />
            {a.headline.deltaLabel}
          </span>
        </div>
      )}
      <p className="text-[14.5px] leading-relaxed text-ink-2">{a.text}</p>
      {a.chart && (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-line p-4">
            {isBars ? (
              <BarsChart data={a.chart.data} series={a.chart.series} layout="vertical" height={240} colorBy={(d) => (d.score < 55 ? 'danger' : 'warning')} />
            ) : (
              <TrendChart data={a.chart.data} series={a.chart.series} height={220} />
            )}
          </div>
          {a.breakdown && (
            <div className="rounded-2xl border border-line p-4">
              <div className="mb-3 text-xs font-semibold text-ink-muted">Where they came from</div>
              <DonutChart data={a.breakdown} height={140} centerLabel="converted" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NarrativeBody({ a, onOpenCall }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14.5px] leading-relaxed text-ink-2">{a.text}</p>
      {a.stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          {a.stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line p-3">
              <div className="text-xs text-ink-muted">{s.label}</div>
              <div className="font-display text-2xl font-bold tabular">{s.value}</div>
              <div className="text-xs text-ink-faint">{s.sub}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {a.quotes?.map((q) => (
          <figure key={q.text} className="group relative rounded-2xl border-l-4 border-brand bg-surface-2 py-3 pl-4 pr-3">
            <Quotes size={16} weight="fill" className="absolute right-3 top-3 text-ink-faint" />
            <blockquote className="pr-6 text-[14px] italic leading-relaxed text-ink">“{q.text}”</blockquote>
            <figcaption className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              {q.verified && (
                <Badge tone="success" size="xs" icon={SealCheck}>
                  Verified
                </Badge>
              )}
              {q.who}
              <button onClick={onOpenCall} className="font-medium text-brand hover:underline">
                Play from {q.time}
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function CompareBody({ a }) {
  const c = a.compare;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14.5px] leading-relaxed text-ink-2">{a.text}</p>
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-surface-2">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-muted">Metric</th>
              {c.columns.map((col) => (
                <th key={col.id} className="px-4 py-2.5 text-right">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-2">
                    <ProductMark id={col.id} size="xs" />
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r) => (
              <tr key={r.metric} className="border-t border-line/70">
                <td className="px-4 py-2.5 text-ink-2">{r.metric}</td>
                {r.values.map((v, i) => (
                  <td key={i} className={cn('px-4 py-2.5 text-right font-semibold tabular', r.better === i ? 'text-success' : 'text-ink')}>
                    {r.better === i && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />}
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border border-line p-4">
        <div className="mb-2 text-xs font-semibold text-ink-muted">Connect rate by day (%)</div>
        <TrendChart data={c.chart} series={[{ key: 'ai', label: 'Agent Flow (AI)', color: 'series-4' }, { key: 'human', label: 'DialFlow (human)', color: 'series-3' }]} height={200} valueFormatter={(v) => `${v}%`} />
      </div>
    </div>
  );
}

function ActionBody({ a }) {
  const [state, setState] = useState('pending'); // pending | running | done | cancelled
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14.5px] leading-relaxed text-ink-2">{a.text}</p>
      <div className={cn('overflow-hidden rounded-2xl border', state === 'done' ? 'border-success/40' : state === 'cancelled' ? 'border-line opacity-70' : 'border-warning/40')}>
        <div className={cn('flex items-center gap-2 px-4 py-2.5 text-xs font-semibold', state === 'done' ? 'bg-success/10 text-success' : state === 'cancelled' ? 'bg-surface-2 text-ink-muted' : 'bg-warning/10 text-warning')}>
          {state === 'done' ? <CheckCircle size={15} weight="fill" /> : state === 'cancelled' ? <XCircle size={15} weight="fill" /> : <Lightning size={15} weight="fill" />}
          {state === 'done' ? 'Done · logged in the audit trail' : state === 'cancelled' ? 'Cancelled · nothing changed' : 'Needs your confirmation'}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <ProductMark id={a.product} size="sm" />
            <div>
              <div className="text-xs text-ink-muted">{a.action.verb}</div>
              <div className="text-[15px] font-bold">{a.action.target}</div>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {a.action.details.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface-2 px-3 py-2">
                <dt className="text-2xs text-ink-muted">{k}</dt>
                <dd className="text-[13px] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {state === 'pending' || state === 'running' ? (
            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                loading={state === 'running'}
                onClick={() => {
                  setState('running');
                  setTimeout(() => setState('done'), 900);
                }}
              >
                {a.action.confirmLabel}
              </Button>
              <Button size="sm" onClick={() => setState('cancelled')} disabled={state === 'running'}>
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReportBody({ a }) {
  const [pct, setPct] = useState(8);
  useEffect(() => {
    if (pct >= 100) return undefined;
    const id = setTimeout(() => setPct((p) => Math.min(100, p + 9 + Math.random() * 14)), 420);
    return () => clearTimeout(id);
  }, [pct]);
  const ready = pct >= 100;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14.5px] leading-relaxed text-ink-2">{a.text}</p>
      <div className="flex items-center gap-4 rounded-2xl border border-line p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
          <FileXls size={26} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{a.report.name}</div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {a.report.sheets.length} sheets ({a.report.sheets.join(', ')}) · {a.report.rows.toLocaleString('en-IN')} rows
          </div>
          {!ready && <Progress value={pct} size="sm" className="mt-2" />}
        </div>
        <Button variant={ready ? 'brand' : 'secondary'} size="sm" icon={DownloadSimple} disabled={!ready}>
          {ready ? 'Download' : `${Math.round(pct)}%`}
        </Button>
      </div>
    </div>
  );
}

function DeclineBody({ a, onAsk }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
        <WarningCircle size={20} weight="duotone" className="mt-px shrink-0 text-warning" />
        <div className="text-[14px] text-ink-2">{a.text}</div>
      </div>
      {a.suggestions && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-ink-muted">Did you mean</span>
          {a.suggestions.map((s) => (
            <button key={s} onClick={() => onAsk(`How is ${s} doing this week?`)} className="rounded-full bg-brand/10 px-3 py-1 font-medium text-brand hover:bg-brand/15">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ClarifyBody({ a, onAsk }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14.5px] text-ink-2">{a.text}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {a.options.map((o) => (
          <button key={o.id} onClick={() => onAsk(a.question, o.id)} className="flex items-center gap-3 rounded-2xl border border-line p-3 text-left transition hover:border-brand/40 hover:bg-brand/5">
            {o.id === 'all' ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-ink-2">
                <Sparkle size={16} weight="fill" />
              </span>
            ) : (
              <ProductMark id={o.id} size="sm" />
            )}
            <span>
              <span className="block text-sm font-semibold">{o.label}</span>
              <span className="block text-xs text-ink-muted">{o.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** One full answer: thinking steps → body → sources, follow-ups and toolbar. */
export function Answer({ answer, pending, onAsk, onPin, onOpenCall }) {
  const a = answer;
  return (
    <div className="flex gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white grad-bg">
        <Sparkle size={16} weight="fill" />
      </span>
      <Card className="min-w-0 flex-1 rounded-3xl" padded={false}>
        <div className="flex flex-col gap-4 p-5">
          {pending ? (
            <ThinkingSteps steps={a?.steps || ['Understanding the question', 'Finding the right data', 'Writing the answer']} />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ScopeChips product={a.product} filters={a.filters} />
                <Grounding kind={a.kind} />
              </div>
              {a.kind === 'metric' && <MetricBody a={a} />}
              {a.kind === 'narrative' && <NarrativeBody a={a} onOpenCall={onOpenCall} />}
              {a.kind === 'compare' && <CompareBody a={a} />}
              {a.kind === 'action' && <ActionBody a={a} />}
              {a.kind === 'report' && <ReportBody a={a} />}
              {a.kind === 'decline' && <DeclineBody a={a} onAsk={onAsk} />}
              {a.kind === 'clarify' && <ClarifyBody a={a} onAsk={onAsk} />}
              <Coverage text={a.coverage} />
              {a.citations && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                  Sources:
                  {a.citations.map((c) => (
                    <button key={c} onClick={onOpenCall} className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-2xs text-ink-2 hover:bg-brand/10 hover:text-brand">
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {!pending && (a.followUps || ['metric', 'narrative', 'compare'].includes(a.kind)) && (
          <div className="flex flex-col gap-3 border-t border-line px-5 py-3">
            <FollowUps items={a.followUps} onAsk={onAsk} />
            {['metric', 'narrative', 'compare'].includes(a.kind) && <AnswerToolbar answer={a} onPin={onPin} />}
          </div>
        )}
      </Card>
    </div>
  );
}

export function Question({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-3xl rounded-br-lg bg-ink px-4 py-2.5 text-[14.5px] text-canvas">{text}</div>
    </div>
  );
}

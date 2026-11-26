import { Link } from 'react-router-dom';
import { ArrowsLeftRight, Ghost, Function as FunctionIcon, Scales, WarningOctagon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Badge, Button, ProgressRing, scoreTone } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { LockedFeature } from '@/shared/patterns';
import { useProcess, ProcessChip } from './ProcessContext';

const TONE_TEXT = { success: 'text-success', warning: 'text-warning', danger: 'text-danger' };
const TONE_BG = { success: 'bg-success/10 text-success', warning: 'bg-warning/15 text-warning', danger: 'bg-danger/10 text-danger' };

/** Score as a compact coloured number (tables, lists). */
export function ScorePill({ value, className, suffix = '' }) {
  if (value == null) return <span className="text-ink-faint">—</span>;
  return <span className={cn('inline-flex min-w-[42px] items-center justify-center rounded-lg px-1.5 py-0.5 text-[13px] font-bold tabular', TONE_BG[scoreTone(value)], className)}>{Math.round(value)}{suffix}</span>;
}

/** Score ring sized for table rows; shows a fatal marker when the call failed a fatal parameter. */
export function ScoreCell({ value, fatal }) {
  if (value == null) return <Badge tone="warning" dot pulse>Scoring</Badge>;
  return (
    <span className="inline-flex items-center gap-2">
      <ProgressRing value={value} size={36} stroke={4} tone={scoreTone(value)} />
      {fatal && (
        <Badge tone="danger" size="xs" icon={WarningOctagon}>
          Fatal
        </Badge>
      )}
    </span>
  );
}

export const scoreText = (v) => TONE_TEXT[scoreTone(v)];

/** Horizontal bar for a 0–100 value with an optional marker (previous period / team average). */
export function ScoreBar({ value, marker, markerLabel, className }) {
  const tone = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[scoreTone(value ?? 0)];
  return (
    <div className={cn('relative h-2 w-full rounded-full bg-surface-3', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-700', tone)} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
      {marker != null && <span title={markerLabel} className="absolute -top-1 h-4 w-0.5 rounded-full bg-ink/70" style={{ left: `calc(${Math.min(100, marker)}% - 1px)` }} />}
    </div>
  );
}

const GATE_COPY = {
  metrics: { icon: FunctionIcon, title: 'Custom metrics', features: ['Track anything in plain English', 'See counts and trends per metric', 'Test on 20 calls before saving', 'Drill into matching calls'] },
  delta: { icon: Scales, title: 'Quality delta', features: ['Before / after per parameter', 'Spot who improved after training', 'Radar view of the whole checklist', 'Share the result with the client'] },
  compare: { icon: ArrowsLeftRight, title: 'Compare periods', features: ['Up to 10 periods side by side', 'Heatmap of parameters by period', 'Trend lines per parameter', 'Export for monthly reviews'] },
  ghost: { icon: Ghost, title: 'Ghost leads', features: ['High-intent calls that did not convert', 'Why the deal slipped, in one line', 'Ready Hinglish follow-up messages', 'Send on WhatsApp via UltraChat'] },
};

/** Revenue-intelligence pages are enterprise-only per process. Shows LockedFeature when the process lacks it. */
export function EnterpriseGate({ feature, children }) {
  const { process, processes, setProcessId, hasFeature } = useProcess();
  if (!process) return children;
  if (hasFeature(feature)) return children;
  const copy = GATE_COPY[feature];
  const unlocked = processes.find((p) => p.features.includes(feature));
  return (
    <Page>
      <PageHeader title={copy.title} icon={copy.icon} meta={<ProcessChip />} />
      <LockedFeature
        title={`${copy.title} is not on for ${process.name}`}
        description="Revenue intelligence comes with the Enterprise plan. Turn it on for this process, or switch to one that has it."
        features={copy.features}
        action={
          <>
            {unlocked && (
              <Button variant="secondary" onClick={() => setProcessId(unlocked.id)}>
                Switch to {unlocked.short}
              </Button>
            )}
            <Button variant="primary" as={Link} to="/businesspulse/processes">
              Process settings
            </Button>
          </>
        }
      />
    </Page>
  );
}

/** Thin label used above lists inside cards. */
export function Eyebrow({ children, className }) {
  return <div className={cn('text-2xs font-semibold uppercase tracking-[.08em] text-ink-faint', className)}>{children}</div>;
}

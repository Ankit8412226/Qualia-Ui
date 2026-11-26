import { CheckCircle, Lightbulb, SealCheck, SealWarning, WarningOctagon, XCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Card, ProgressRing, scoreTone } from '@/design-system';
import { Eyebrow, ScoreBar } from './common';

const VERDICT = {
  Ready: { tone: 'success', icon: SealCheck, line: 'Can take live calls on this scenario.', cls: 'bg-success/10 text-success border-success/30' },
  'Needs retraining': { tone: 'warning', icon: SealWarning, line: 'Close. One more practice round on the focus skills.', cls: 'bg-warning/10 text-warning border-warning/30' },
  'Not ready': { tone: 'danger', icon: WarningOctagon, line: 'Keep off this campaign until the next session.', cls: 'bg-danger/10 text-danger border-danger/30' },
};

/** Progress over sessions as small labelled columns (no axis needed for ≤8 points). */
function SessionHistory({ values }) {
  return (
    <div className="flex h-28 items-end gap-2">
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className={cn('text-2xs font-semibold tabular', last ? 'text-brand' : 'text-ink-muted')}>{v}</span>
            <span className={cn('w-full max-w-[34px] rounded-t-md transition-all', last ? 'bg-brand' : 'bg-brand/25')} style={{ height: `${Math.max(8, v)}%` }} />
            <span className="text-2xs text-ink-faint">{last ? 'Now' : `#${i + 1}`}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Graded role-play result. result = {overall, verdict, skills:[{name,score}], practise:[], history:[], highlights:[]} */
export function SessionResult({ result, agentName, compact, actions }) {
  const v = VERDICT[result.verdict] || VERDICT['Needs retraining'];
  const Icon = v.icon;
  return (
    <div className="flex flex-col gap-4">
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
        <div className={cn('relative flex flex-col gap-5', !compact && 'sm:flex-row sm:items-center')}>
          <ProgressRing value={result.overall} size={compact ? 96 : 120} stroke={10} tone={scoreTone(result.overall)} label={<span className="text-3xl">{result.overall}</span>} />
          <div className="min-w-0 flex-1">
            <Eyebrow>Diya’s verdict{agentName ? ` for ${agentName}` : ''}</Eyebrow>
            <div className={cn('mt-2 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-lg font-extrabold', v.cls)}>
              <Icon size={22} weight="fill" /> {result.verdict}
            </div>
            <p className="mt-2 text-sm text-ink-muted">{v.line}</p>
          </div>
          {actions && <div className="relative flex flex-wrap gap-2">{actions}</div>}
        </div>
      </Card>

      <div className={cn('grid gap-4', !compact && 'lg:grid-cols-3')}>
        <Card>
          <Eyebrow className="mb-4">Skill scores</Eyebrow>
          <ul className="flex flex-col gap-3.5">
            {result.skills.map((s) => (
              <li key={s.name}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="font-medium text-ink-2">{s.name}</span>
                  <span className="font-bold tabular">{s.score}</span>
                </div>
                <ScoreBar value={s.score} className="h-1.5" />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <Eyebrow className="mb-4">Practise next</Eyebrow>
          <ol className="flex flex-col gap-3">
            {(result.practise || []).map((p, i) => (
              <li key={p} className="flex gap-3 text-[13px] leading-snug text-ink-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">{i + 1}</span>
                {p}
              </li>
            ))}
          </ol>
          {result.highlights?.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {result.highlights.map((h) => (
                <li key={h.text} className="flex gap-2 text-xs text-ink-muted">
                  {h.tone === 'success' ? <CheckCircle size={14} weight="fill" className="mt-px shrink-0 text-success" /> : <XCircle size={14} weight="fill" className="mt-px shrink-0 text-danger" />}
                  {h.text}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <Eyebrow className="mb-4 flex items-center gap-1.5">
            <Lightbulb size={12} weight="bold" /> Progress over sessions
          </Eyebrow>
          <SessionHistory values={result.history || [result.overall]} />
          {result.history?.length > 1 && (
            <p className="mt-3 text-xs text-ink-muted">
              {result.overall - result.history[0] >= 0 ? 'Up' : 'Down'} <b className="text-ink">{Math.abs(result.overall - result.history[0])} pts</b> since the first session.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

export { VERDICT };

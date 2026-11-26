import { Plus, Trash } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Button, IconButton, Input, SecretInput, Switch } from '@/design-system';

/*
 * Small form pieces Agent Flow needs that the design system does not have yet.
 * Candidates to promote: Slider, ChipToggleGroup, KeyValueEditor, CodeBlock, MethodBadge.
 */

/** Range slider with a value read-out. Uses the browser control tinted with the product colour. */
export function Slider({ value, onChange, min = 0, max = 100, step = 1, format = (v) => v, marks, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 flex-1 cursor-pointer accent-brand" />
        <span className="w-14 shrink-0 rounded-lg bg-surface-3 py-1 text-center text-xs font-semibold tabular text-ink">{format(value)}</span>
      </div>
      {marks && (
        <div className="flex justify-between pr-[68px] text-2xs text-ink-faint">
          {marks.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Multi-toggle chips (days of week, retry-on statuses). */
export function ChipToggleGroup({ options, value = [], onChange, single, size = 'md', className }) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const on = single ? value === opt.value : value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(single ? opt.value : on ? value.filter((v) => v !== opt.value) : [...value, opt.value])}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border font-medium transition',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3 text-[13px]',
              on ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface text-ink-2 hover:border-line-strong',
            )}
          >
            {opt.icon && <opt.icon size={14} weight="bold" />}
            {opt.label}
            {opt.count != null && <span className="text-2xs tabular opacity-70">{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Header / secret rows: key, value (masked when `secret`), remove. rows = [{id,key,value,secret}] */
export function KeyValueEditor({ rows, onChange, keyPlaceholder = 'Header', valuePlaceholder = 'Value', addLabel = 'Add header', allowSecret = true }) {
  const set = (id, patch) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-2 sm:grid-cols-[1fr_1.6fr_auto_auto]">
          <Input value={r.key} onChange={(e) => set(r.id, { key: e.target.value })} placeholder={keyPlaceholder} className="font-mono text-[13px]" />
          {r.secret ? <SecretInput value={r.value} onChange={(v) => set(r.id, { value: v })} placeholder={valuePlaceholder} /> : <Input value={r.value} onChange={(e) => set(r.id, { value: e.target.value })} placeholder={valuePlaceholder} className="font-mono text-[13px]" />}
          {allowSecret && (
            <label className="hidden items-center gap-1.5 text-xs text-ink-muted sm:flex">
              <Switch size="sm" checked={r.secret} onChange={(v) => set(r.id, { secret: v })} />
              Secret
            </label>
          )}
          <IconButton icon={Trash} label="Remove" size="sm" onClick={() => onChange(rows.filter((x) => x.id !== r.id))} />
        </div>
      ))}
      <Button variant="ghost" size="sm" icon={Plus} className="self-start" onClick={() => onChange([...rows, { id: `kv${Date.now()}`, key: '', value: '', secret: false }])}>
        {addLabel}
      </Button>
    </div>
  );
}

/** Read-only code / JSON block. */
export function CodeBlock({ value, className, label }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return (
    <div className={cn('overflow-hidden rounded-xl border border-line bg-surface-2', className)}>
      {label && <div className="border-b border-line px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">{label}</div>}
      <pre className="max-h-72 overflow-auto p-3 font-mono text-xs leading-relaxed text-ink-2">{text}</pre>
    </div>
  );
}

const METHOD_TONE = { GET: 'bg-success/10 text-success', POST: 'bg-info/10 text-info', PUT: 'bg-warning/15 text-warning', PATCH: 'bg-warning/15 text-warning', DELETE: 'bg-danger/10 text-danger' };
export function MethodBadge({ method, className }) {
  return <span className={cn('inline-flex h-5 shrink-0 items-center rounded-md px-1.5 font-mono text-2xs font-bold', METHOD_TONE[method] || 'bg-surface-3 text-ink-2', className)}>{method}</span>;
}

/** Time window "10:00 → 19:00". */
export function TimeRange({ from, to, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Input type="time" value={from} onChange={(e) => onChange({ from: e.target.value, to })} className="w-32" />
      <span className="text-ink-faint">→</span>
      <Input type="time" value={to} onChange={(e) => onChange({ from, to: e.target.value })} className="w-32" />
    </div>
  );
}

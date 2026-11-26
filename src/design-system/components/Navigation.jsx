import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarBlank, CaretDown, CaretRight, Check, FunnelSimple, X } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Popover } from './Overlay';
import { Button } from './Button';
import { SearchInput } from './Form';

/** Tabs. tabs = [{id, label, count, icon}]. variant 'line' (page sections) or 'pill' (inside cards). */
export function Tabs({ tabs, value, onChange, variant = 'line', className }) {
  return (
    <div role="tablist" className={cn('no-scrollbar flex items-center overflow-x-auto', variant === 'line' ? 'gap-6 border-b border-line' : 'gap-1 rounded-xl bg-surface-3 p-1', className)}>
      {tabs.map((t) => {
        const active = t.id === value;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-medium transition',
              variant === 'line'
                ? cn('-mb-px border-b-2 pb-3 pt-1 text-sm', active ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink')
                : cn('h-8 rounded-lg px-3 text-[13px]', active ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink'),
            )}
          >
            {Icon && <Icon size={16} weight={active ? 'fill' : 'regular'} />}
            {t.label}
            {t.count != null && <span className={cn('rounded-full px-1.5 py-px text-2xs font-semibold tabular', active ? 'bg-brand/10 text-brand' : 'bg-surface-3 text-ink-muted')}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Wizard progress. steps = [{id, label, description}], current = index. onStepClick lets users go back. */
export function Stepper({ steps, current, onStepClick, orientation = 'horizontal', className }) {
  if (orientation === 'vertical') {
    return (
      <ol className={cn('flex flex-col gap-1', className)}>
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={i > current}
                onClick={() => onStepClick?.(i)}
                className={cn('flex w-full items-start gap-3 rounded-xl p-3 text-left transition', active ? 'bg-brand/5' : 'hover:bg-surface-2 disabled:hover:bg-transparent')}
              >
                <StepDot index={i} done={done} active={active} />
                <span className="min-w-0">
                  <span className={cn('block text-sm font-semibold', active || done ? 'text-ink' : 'text-ink-muted')}>{s.label}</span>
                  {s.description && <span className="block text-xs text-ink-muted">{s.description}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    );
  }
  return (
    <ol className={cn('flex items-center gap-2', className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={s.id}>
            <li>
              <button type="button" disabled={i > current} onClick={() => onStepClick?.(i)} className="flex items-center gap-2.5">
                <StepDot index={i} done={done} active={active} />
                <span className={cn('hidden whitespace-nowrap text-sm font-medium sm:inline', active ? 'text-ink' : 'text-ink-muted')}>{s.label}</span>
              </button>
            </li>
            {i < steps.length - 1 && <li aria-hidden className={cn('h-px min-w-6 flex-1', done ? 'bg-brand' : 'bg-line')} />}
          </Fragment>
        );
      })}
    </ol>
  );
}

function StepDot({ index, done, active }) {
  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
        done ? 'bg-brand text-brand-ink' : active ? 'bg-brand/10 text-brand ring-2 ring-brand' : 'bg-surface-3 text-ink-muted',
      )}
    >
      {done ? <Check size={13} weight="bold" /> : index + 1}
    </span>
  );
}

export function Breadcrumbs({ items, className }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex min-w-0 items-center gap-1 text-[13px]', className)}>
      {items.map((it, i) => (
        <Fragment key={it.label}>
          {i > 0 && <CaretRight size={11} className="shrink-0 text-ink-faint" />}
          {it.to && i < items.length - 1 ? (
            <Link to={it.to} className="truncate text-ink-muted hover:text-ink">
              {it.label}
            </Link>
          ) : (
            <span className={cn('truncate', i === items.length - 1 ? 'font-medium text-ink' : 'text-ink-muted')}>{it.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

/* ---------------- Filters: one pattern everywhere (apply instantly, show chips, reset) ---------------- */

/**
 * Multi-select filter button. options = strings or [{value,label}]. value = array.
 * Shows "Status: Running +1" when something is picked.
 */
export function FilterSelect({ label, options, value = [], onChange, icon: Icon = FunnelSimple, searchable, single }) {
  const [q, setQ] = useState('');
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const shown = q ? opts.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : opts;
  const picked = opts.filter((o) => value.includes(o.value));
  const active = picked.length > 0;
  return (
    <Popover
      width={240}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-[13px] font-medium transition',
            active ? 'border-brand/40 bg-brand/5 text-brand' : 'border-line bg-surface text-ink-2 hover:border-line-strong',
            open && 'ring-4 ring-brand/10',
          )}
        >
          <Icon size={14} />
          {label}
          {active && (
            <span className="max-w-[120px] truncate font-semibold">
              : {picked[0].label}
              {picked.length > 1 && ` +${picked.length - 1}`}
            </span>
          )}
          <CaretDown size={11} weight="bold" className="opacity-60" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="flex flex-col">
          {(searchable || opts.length > 8) && <SearchInput size="sm" value={q} onChange={setQ} className="m-1 mb-1.5" autoFocus />}
          <div className="max-h-64 overflow-y-auto">
            {shown.map((o) => {
              const on = value.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    if (single) {
                      onChange(on ? [] : [o.value]);
                      close();
                    } else onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value]);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-3"
                >
                  <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong')}>{on && <Check size={10} weight="bold" />}</span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
          {active && (
            <button type="button" onClick={() => onChange([])} className="mt-1 border-t border-line px-2.5 pb-1 pt-2 text-left text-xs font-medium text-ink-muted hover:text-ink">
              Clear selection
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}

export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'mtd', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
];

/** Date range: presets + custom from/to. value = {preset, from, to} */
export function DateRangeFilter({ value = { preset: '7d' }, onChange, presets = DATE_PRESETS }) {
  const label = value.preset === 'custom' && value.from ? `${value.from} → ${value.to || '…'}` : presets.find((p) => p.value === value.preset)?.label || 'Any time';
  return (
    <Popover
      width={260}
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 hover:border-line-strong">
          <CalendarBlank size={14} />
          {label}
          <CaretDown size={11} weight="bold" className="opacity-60" />
        </button>
      )}
    >
      {({ close }) => (
        <div>
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                onChange({ ...value, preset: p.value });
                if (p.value !== 'custom') close();
              }}
              className={cn('flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[13px] hover:bg-surface-3', value.preset === p.value ? 'font-semibold text-ink' : 'text-ink-2')}
            >
              {p.label}
              {value.preset === p.value && <Check size={13} weight="bold" className="text-brand" />}
            </button>
          ))}
          {value.preset === 'custom' && (
            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-line p-2">
              <input type="date" value={value.from || ''} onChange={(e) => onChange({ ...value, from: e.target.value })} className="h-8 rounded-lg border border-line bg-surface px-2 text-xs" />
              <input type="date" value={value.to || ''} onChange={(e) => onChange({ ...value, to: e.target.value })} className="h-8 rounded-lg border border-line bg-surface px-2 text-xs" />
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}

/** Toolbar above a table: search on the left, filters, reset, and actions on the right. */
export function FilterBar({ search, onSearch, searchPlaceholder, children, onReset, canReset, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onSearch && <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} className="w-full sm:w-64" />}
      {children}
      {onReset && canReset && (
        <Button variant="ghost" size="sm" icon={X} onClick={onReset}>
          Reset
        </Button>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

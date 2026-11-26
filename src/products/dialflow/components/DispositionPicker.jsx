import { useMemo, useState } from 'react';
import { CalendarPlus, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Badge, Input } from '@/design-system';

export const CATEGORY_ORDER = ['Positive', 'Neutral', 'Negative', 'Not reached'];
const CAT_DOT = { Positive: 'bg-success', Neutral: 'bg-ink-faint', Negative: 'bg-danger', 'Not reached': 'bg-warning' };

const pad = (n) => String(n).padStart(2, '0');
const toLocal = (d) => ({ date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` });

/** Quick picks for callback time, relative to now. */
function quickSlots() {
  const n = new Date();
  const inHour = new Date(n.getTime() + 60 * 60000);
  const eve = new Date(n);
  eve.setHours(18, 30, 0, 0);
  const tmr = new Date(n);
  tmr.setDate(tmr.getDate() + 1);
  tmr.setHours(11, 0, 0, 0);
  const sat = new Date(n);
  sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7 || 7));
  sat.setHours(11, 0, 0, 0);
  return [
    { label: 'In 1 hour', at: inHour },
    eve > n ? { label: 'This evening 6:30', at: eve } : null,
    { label: 'Tomorrow 11 AM', at: tmr },
    { label: 'Saturday 11 AM', at: sat },
  ].filter(Boolean);
}

/**
 * Searchable disposition picker grouped by category, with sub-dispositions and a callback
 * scheduler when the chosen disposition needs one.
 * value = { id, sub, date, time }  items = [{id,name,category,callback,sub[]}]
 */
export function DispositionPicker({ items, value, onChange, disabled, compact }) {
  const [q, setQ] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const selected = items.find((d) => d.id === value?.id);
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      list: items.filter((d) => d.category === cat && (!s || d.name.toLowerCase().includes(s) || d.sub.some((x) => x.toLowerCase().includes(s)))),
    })).filter((g) => g.list.length);
  }, [items, q]);

  const pick = (d) => {
    if (disabled) return;
    const slot = d.callback ? toLocal(quickSlots()[0].at) : {};
    onChange({ id: d.id, sub: d.sub[0] && d.sub.length === 1 ? d.sub[0] : null, ...(d.callback ? slot : { date: null, time: null }) });
    setBrowsing(false);
    setQ('');
  };
  // compact (narrow column): once something is picked, fold the list away and show only the follow-up questions
  const folded = compact && selected && !browsing;

  return (
    <div className={cn('flex flex-col gap-3', disabled && 'pointer-events-none opacity-60')}>
      {folded ? (
        <div className="flex items-center gap-2 rounded-lg border border-brand bg-brand/5 px-2.5 py-2 text-[13px]">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', CAT_DOT[selected.category])} />
          <span className="min-w-0 flex-1 truncate font-semibold text-ink">{selected.name}</span>
          <button type="button" onClick={() => setBrowsing(true)} className="text-xs font-medium text-brand hover:underline">
            Change
          </button>
        </div>
      ) : (
        <>
      <Input icon={MagnifyingGlass} size="sm" className={cn(!compact && 'max-w-sm')} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dispositions" aria-label="Search dispositions" />
      <div className={cn('grid gap-x-4 gap-y-3', !compact && 'gap-x-5 gap-y-5 sm:grid-cols-2 2xl:grid-cols-4')}>
        {groups.map((g) => (
          <div key={g.cat} className="min-w-0">
            <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
              <span className={cn('h-1.5 w-1.5 rounded-full', CAT_DOT[g.cat])} />
              {g.cat}
            </div>
            <div className="flex flex-col gap-1">
              {g.list.map((d) => {
                const on = d.id === value?.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => pick(d)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-2.5 text-left text-[13px] transition', compact ? 'py-1.5' : 'py-2',
                      on ? 'border-brand bg-brand/5 font-semibold text-ink ring-2 ring-brand/10' : 'border-transparent text-ink-2 hover:border-line hover:bg-surface-2',
                    )}
                  >
                    <span className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border', on ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong')}>{on && <Check size={8} weight="bold" />}</span>
                    <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    {d.callback && <CalendarPlus size={13} className="shrink-0 text-ink-faint" aria-label="Needs a callback" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!groups.length && <p className="col-span-2 py-3 text-center text-xs text-ink-muted">No disposition matches “{q}”.</p>}
      </div>
        </>
      )}

      {selected?.sub.length > 0 && (
        <div className="animate-rise rounded-xl border border-line bg-surface-2 p-3">
          <div className="mb-2 text-xs font-medium text-ink-2">{selected.name}: pick a reason</div>
          <div className="flex flex-wrap gap-1.5">
            {selected.sub.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ ...value, sub: s })}
                className={cn('rounded-full border px-2.5 py-1 text-xs font-medium transition', value.sub === s ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected?.callback && (
        <div className="animate-rise rounded-xl border border-info/25 bg-info/5 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-info">
            <CalendarPlus size={14} weight="bold" />
            Schedule a callback
            <Badge tone="info" size="xs" className="ml-auto">
              Required
            </Badge>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {quickSlots().map((s) => {
              const l = toLocal(s.at);
              const on = value.date === l.date && value.time === l.time;
              return (
                <button key={s.label} type="button" onClick={() => onChange({ ...value, ...l })} className={cn('rounded-full border px-2.5 py-1 text-xs font-medium transition', on ? 'border-info bg-info text-surface' : 'border-line bg-surface text-ink-2 hover:border-line-strong')}>
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="grid max-w-md grid-cols-2 gap-2">
            <Input type="date" size="sm" value={value.date || ''} onChange={(e) => onChange({ ...value, date: e.target.value })} aria-label="Callback date" />
            <Input type="time" size="sm" value={value.time || ''} onChange={(e) => onChange({ ...value, time: e.target.value })} aria-label="Callback time" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Is the picked disposition complete enough to save? */
export function dispositionReady(items, value) {
  const d = items.find((x) => x.id === value?.id);
  if (!d) return false;
  if (d.sub.length > 1 && !value.sub) return false;
  if (d.callback && (!value.date || !value.time)) return false;
  return true;
}

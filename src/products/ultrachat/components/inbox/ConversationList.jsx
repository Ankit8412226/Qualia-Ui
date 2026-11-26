import { ChatsCircle, FlowArrow, Robot, Tag } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtRelative } from '@/lib/format';
import { Avatar, EmptyState, FilterSelect, SearchInput, Skeleton, Tabs, Tooltip } from '@/design-system';
import { Ticks } from '../wa';

export const LABEL_DOT = { danger: 'bg-danger', success: 'bg-success', warning: 'bg-warning', accent: 'bg-accent', info: 'bg-info', violet: 'bg-product-businesspulse', neutral: 'bg-line-strong' };

/** Waiting-time tone for SLA: >15 min warning, >60 min danger. */
export const slaTone = (min) => (min > 60 ? 'danger' : min > 15 ? 'warning' : null);

export function fmtWait(min) {
  if (min < 60) return `${Math.max(1, Math.round(min))}m`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;
  return `${Math.floor(min / 1440)}d`;
}

export function ConversationList({ loading, rows, counts, tab, onTab, statuses, onStatuses, labelFilter, onLabelFilter, labels, search, onSearch, selectedId, onSelect }) {
  const labelOpts = (labels || []).map((l) => ({ value: l.id, label: l.name }));
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-line px-4 pb-0 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold">Inbox</h1>
          <span className="text-xs text-ink-muted tabular">{counts.unread} unread</span>
        </div>
        <SearchInput size="sm" value={search} onChange={onSearch} placeholder="Search name, number, message" />
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="Status" options={['Open', 'Pending', 'Resolved']} value={statuses} onChange={onStatuses} />
          <FilterSelect label="Label" icon={Tag} options={labelOpts} value={labelFilter} onChange={onLabelFilter} />
        </div>
        <Tabs
          value={tab}
          onChange={onTab}
          className="gap-5"
          tabs={[
            { id: 'mine', label: 'Mine', count: counts.mine },
            { id: 'unassigned', label: 'Unassigned', count: counts.unassigned },
            { id: 'all', label: 'All', count: counts.all },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" role="listbox" aria-label="Conversations">
        {loading ? (
          <div className="flex flex-col gap-4 p-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState compact icon={ChatsCircle} title="No conversations here" description="Try another tab or clear the filters." />
        ) : (
          <ul className="flex flex-col p-2">
            {rows.map((c) => (
              <li key={c.id}>
                <ConversationRow c={c} labels={labels} active={c.id === selectedId} onClick={() => onSelect(c.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConversationRow({ c, labels, active, onClick }) {
  const tone = c.status !== 'Resolved' ? slaTone(c.waitingMin) : null;
  const BotIcon = c.handledBy === 'flow' ? FlowArrow : Robot;
  const rowLabels = (labels || []).filter((l) => c.labels.includes(l.id));
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition',
        active ? 'bg-brand/10' : 'hover:bg-surface-2',
      )}
    >
      {tone && <span className={cn('absolute inset-y-3 left-0 w-1 rounded-r-full', tone === 'danger' ? 'bg-danger' : 'bg-warning')} />}
      <Avatar name={c.contact.name} size="md" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cn('truncate text-sm', c.unread ? 'font-bold text-ink' : 'font-semibold text-ink-2')}>{c.contact.name}</span>
          {(c.handledBy === 'bot' || c.handledBy === 'flow') && (
            <Tooltip content={c.handledBy === 'flow' ? 'Handled by a flow' : 'Handled by AI bot'}>
              <BotIcon size={14} weight="duotone" className="shrink-0 text-brand" />
            </Tooltip>
          )}
          <span className="ml-auto shrink-0 text-2xs text-ink-faint tabular">{fmtRelative(c.last.at)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          {c.last.dir === 'out' && <Ticks status="read" className="shrink-0" />}
          <span className={cn('truncate text-[13px]', c.unread ? 'text-ink-2' : 'text-ink-muted')}>{c.last.text}</span>
          {c.unread > 0 && <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-2xs font-bold text-brand-ink tabular">{c.unread}</span>}
        </span>
        {(rowLabels.length > 0 || tone || c.status !== 'Open') && (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {tone && (
              <span className={cn('rounded-md px-1.5 py-px text-2xs font-semibold tabular', tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warning/15 text-warning')}>Waiting {fmtWait(c.waitingMin)}</span>
            )}
            {c.status !== 'Open' && <span className="rounded-md bg-surface-3 px-1.5 py-px text-2xs font-medium text-ink-muted">{c.status}</span>}
            {rowLabels.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-px text-2xs font-medium text-ink-2">
                <span className={cn('h-1.5 w-1.5 rounded-full', LABEL_DOT[l.tone])} />
                {l.name}
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

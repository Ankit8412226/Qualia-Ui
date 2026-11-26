import { useEffect, useMemo, useState } from 'react';
import { CaretDown, CaretLeft, CaretRight, CaretUp, Tray } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Checkbox } from './Form';
import { EmptyState, ErrorState, SkeletonRows } from './Feedback';

/**
 * The one table.
 * columns: [{ key, header, render(row), align: 'right'|'center', width, sortable, sortValue(row), className, hideBelow: 'md'|'lg' }]
 * - `selectable` + `selected`/`onSelectedChange` for bulk actions; `bulkActions` renders in a bar when rows are picked.
 * - `pageSize` paginates on the client (pass `pageSize={0}` to show all).
 * - `error` + `onRetry` (from useQuery) replace the rows with an error state and a Try again button.
 */
export function DataTable({
  columns,
  rows = [],
  rowKey = 'id',
  onRowClick,
  loading,
  error,
  onRetry,
  empty,
  selectable,
  selected,
  onSelectedChange,
  bulkActions,
  pageSize = 10,
  dense,
  stickyHeader,
  className,
  rowClassName,
  initialSort,
}) {
  const [sort, setSort] = useState(initialSort || null); // {key, dir}
  const [page, setPage] = useState(1);
  const [innerSel, setInnerSel] = useState([]);
  const sel = selected ?? innerSel;
  const setSel = onSelectedChange ?? setInnerSel;
  const keyOf = (r) => (typeof rowKey === 'function' ? rowKey(r) : r[rowKey]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sortValue || ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const pages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  useEffect(() => setPage(1), [rows.length, pageSize]);
  const visible = pageSize ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;
  const allOnPage = visible.length > 0 && visible.every((r) => sel.includes(keyOf(r)));
  const someOnPage = visible.some((r) => sel.includes(keyOf(r)));
  const hide = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' };
  const pad = dense ? 'px-4 py-2' : 'px-4 py-3';

  const toggleSort = (c) => {
    if (!c.sortable) return;
    setSort((s) => (s?.key !== c.key ? { key: c.key, dir: 'desc' } : s.dir === 'desc' ? { key: c.key, dir: 'asc' } : null));
  };

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      {selectable && sel.length > 0 && bulkActions && (
        <div className="flex animate-rise items-center gap-3 border-b border-line bg-brand/5 px-4 py-2.5 text-sm">
          <span className="font-semibold text-brand">{sel.length} selected</span>
          <button className="text-xs text-ink-muted hover:text-ink" onClick={() => setSel([])}>
            Clear
          </button>
          <div className="ml-auto flex items-center gap-2">{bulkActions(sel)}</div>
        </div>
      )}
      <div className={cn('min-w-0 overflow-x-auto', stickyHeader && 'max-h-[560px] overflow-y-auto')}>
        <table className="w-full border-collapse text-left text-sm">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="border-b border-line bg-surface-2">
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <Checkbox
                    aria-label="Select all rows on this page"
                    checked={allOnPage}
                    indeterminate={!allOnPage && someOnPage}
                    onChange={() => {
                      const ids = visible.map(keyOf);
                      setSel(allOnPage ? sel.filter((id) => !ids.includes(id)) : [...new Set([...sel, ...ids])]);
                    }}
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width }}
                  onClick={() => toggleSort(c)}
                  className={cn(
                    'whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-ink-muted',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                    c.sortable && 'cursor-pointer select-none hover:text-ink',
                    c.hideBelow && hide[c.hideBelow],
                  )}
                >
                  <span className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                    {c.header}
                    {c.sortable && sort?.key === c.key && (sort.dir === 'asc' ? <CaretUp size={11} weight="bold" /> : <CaretDown size={11} weight="bold" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {!loading && (
            <tbody>
              {visible.map((r, i) => {
                const k = keyOf(r);
                const isSel = sel.includes(k);
                return (
                  <tr
                    key={k ?? i}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={onRowClick ? (e) => e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(r)) : undefined}
                    className={cn(
                      'border-b border-line/70 transition-colors last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-surface-2',
                      isSel && 'bg-brand/5',
                      typeof rowClassName === 'function' ? rowClassName(r) : rowClassName,
                    )}
                  >
                    {selectable && (
                      <td className="px-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox aria-label="Select row" checked={isSel} onChange={() => setSel(isSel ? sel.filter((x) => x !== k) : [...sel, k])} />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(pad, 'align-middle text-ink-2', c.align === 'right' && 'text-right tabular', c.align === 'center' && 'text-center', c.hideBelow && hide[c.hideBelow], c.className)}
                      >
                        {c.render ? c.render(r) : r[c.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
        {loading && <SkeletonRows rows={Math.min(pageSize || 6, 6)} />}
        {!loading && error && <ErrorState compact error={error} onRetry={onRetry} />}
        {!loading && !error && rows.length === 0 && (empty || <EmptyState icon={Tray} title="Nothing here yet" description="Try changing the filters." compact />)}
      </div>
      {!loading && pageSize > 0 && rows.length > pageSize && <Pagination page={page} pages={pages} total={rows.length} pageSize={pageSize} onChange={setPage} />}
    </div>
  );
}

export function Pagination({ page, pages, total, pageSize, onChange, className }) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nums = [];
  for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
  return (
    <div className={cn('flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-ink-muted', className)}>
      <span className="tabular">
        {from}–{to} of {total.toLocaleString('en-IN')}
      </span>
      <div className="flex items-center gap-1">
        <PageBtn disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <CaretLeft size={12} weight="bold" />
        </PageBtn>
        {nums.map((p, i) => (
          <span key={p} className="flex items-center gap-1">
            {i > 0 && p - nums[i - 1] > 1 && <span className="px-1">…</span>}
            <PageBtn active={p === page} onClick={() => onChange(p)}>
              {p}
            </PageBtn>
          </span>
        ))}
        <PageBtn disabled={page === pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <CaretRight size={12} weight="bold" />
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({ active, className, ...rest }) {
  return (
    <button
      className={cn('inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 font-medium tabular transition disabled:opacity-40', active ? 'bg-ink text-canvas' : 'hover:bg-surface-3 hover:text-ink', className)}
      {...rest}
    />
  );
}

/** Label / value pairs. items = [{label, value}] */
export function DescriptionList({ items, cols = 2, className }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2', className)}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs text-ink-muted">{it.label}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium text-ink">{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Vertical event list. items = [{title, time, description, tone, icon}] */
export function Timeline({ items, className }) {
  const dot = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info', brand: 'bg-brand', neutral: 'bg-line-strong' };
  return (
    <ol className={cn('relative flex flex-col gap-4', className)}>
      {items.map((it, i) => (
        <li key={i} className="relative flex gap-3 pl-1">
          {i < items.length - 1 && <span className="absolute left-[8px] top-5 h-[calc(100%+4px)] w-px bg-line" />}
          <span className={cn('relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-surface', dot[it.tone || 'neutral'])} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-ink">{it.title}</span>
              {it.time && <span className="shrink-0 text-xs text-ink-faint">{it.time}</span>}
            </div>
            {it.description && <p className="mt-0.5 text-xs text-ink-muted">{it.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Simple list rows inside a card: [{id, title, subtitle, right, leading, onClick}] */
export function ListRows({ items, className, empty }) {
  if (!items.length) return empty || null;
  return (
    <ul className={cn('divide-y divide-line/70', className)}>
      {items.map((it) => {
        const Tag = it.onClick ? 'button' : 'div';
        return (
          <li key={it.id ?? it.title}>
            <Tag onClick={it.onClick} className={cn('flex w-full items-center gap-3 py-3 text-left', it.onClick && '-mx-2 rounded-xl px-2 hover:bg-surface-2')}>
              {it.leading}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{it.title}</span>
                {it.subtitle && <span className="block truncate text-xs text-ink-muted">{it.subtitle}</span>}
              </span>
              {it.right && <span className="shrink-0 text-right">{it.right}</span>}
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

'use client';

/**
 * The one table every screen reuses: search, filter chips with counts, sorting, paging, selection, custom column
 * header / cell / footer, row click, and empty, loading and error states.
 *
 * Use it uncontrolled (give `data`, `columns`, `rowId`) and it keeps its own state, or controlled (`state` +
 * `onStateChange`) to keep it elsewhere, for example in the URL. With `manual` the server does the searching,
 * sorting and paging and `data` is only the current page. Styles are in `v2.css` (`.dt`), so it renders inside `.v2`.
 *
 * Keep `columns` stable (module constant or `useMemo`): the table rebuilds its column model when it changes.
 */
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, X } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';

import { compareValues, matchesQuery } from './match';
import { DEFAULT_STATE, type DataColumn, type DataFilter, type DataTableProps, type DataTableState } from './types';

const hideClass = (c: { hideBelow?: 'sm' | 'md' }) => (c.hideBelow ? `dt-hide-${c.hideBelow}` : undefined);

export function DataTable<T>(props: DataTableProps<T>) {
  const { data, columns, rowId, label, search, filters = [], manual = false, loading = false, selectable = false } = props;
  const pageSizes = props.pageSizes ?? [10, 25, 50];
  const [local, setLocal] = useState<DataTableState>({ ...DEFAULT_STATE, pageSize: pageSizes[0] ?? 10, ...props.initialState });
  const st = props.state ?? local;

  const update = (patch: Partial<DataTableState>) => {
    // Anything that changes which rows match starts again from the first page.
    const next: DataTableState = { ...st, ...patch, page: 'page' in patch ? (patch.page as number) : patch.selected ? st.page : 0 };
    if (!props.state) setLocal(next);
    props.onStateChange?.(next);
    if (patch.selected) props.onSelectionChange?.(patch.selected);
  };

  const searchOk = (row: T) => !search || matchesQuery(search.text(row), st.search);
  const filterOk = (row: T, skip?: string) =>
    filters.every((f) => {
      const value = st.filters[f.id];
      if (!value || f.id === skip) return true;
      return f.options.find((o) => o.value === value)?.match(row) ?? true;
    });

  // What matches the search and every filter, across all pages. In manual mode the server already did this.
  const matching = manual ? data : data.filter((r) => searchOk(r) && filterOk(r));
  const total = manual ? (props.rowCount ?? data.length) : matching.length;
  const pageCount = Math.max(1, Math.ceil(total / st.pageSize));
  const page = Math.min(st.page, pageCount - 1);

  const defs = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((c) => ({
        id: c.id,
        accessorFn: (row: T) => (c.sortValue?.(row) ?? undefined) as string | number | undefined,
        header: () => c.header,
        cell: ({ row }) => c.cell(row.original),
        enableSorting: Boolean(c.sortValue),
        sortDescFirst: false,
        sortUndefined: 'last',
        sortingFn: (a, b, id) => compareValues(a.getValue<string | number>(id), b.getValue<string | number>(id)),
      })),
    [columns],
  );
  const byId = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);

  const table = useReactTable({
    data: matching,
    columns: defs,
    getRowId: rowId,
    state: { sorting: st.sort ? [{ id: st.sort.id, desc: st.sort.dir === 'desc' }] : [], pagination: { pageIndex: page, pageSize: st.pageSize } },
    manualSorting: manual,
    manualPagination: manual,
    rowCount: manual ? total : undefined,
    enableSortingRemoval: true,
    // The page lives in our state and goes back to the first one by itself when the search or a filter changes. The
    // library's own reset runs whenever `data` is a new array (it is, every render) and would loop.
    autoResetPageIndex: false,
    onSortingChange: (updater) => {
      const current = st.sort ? [{ id: st.sort.id, desc: st.sort.dir === 'desc' }] : [];
      const next = (typeof updater === 'function' ? updater(current) : updater)[0];
      update({ sort: next ? { id: next.id, dir: next.desc ? 'desc' : 'asc' } : null });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;
  const active = Boolean(st.search.trim()) || Object.values(st.filters).some(Boolean);
  const selected = new Set(st.selected);
  const pageIds = rows.map((r) => r.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const hasFooter = columns.some((c) => c.footer !== undefined);
  const span = columns.length + (selectable ? 1 : 0);

  const toggleRow = (id: string) => update({ selected: selected.has(id) ? st.selected.filter((x) => x !== id) : [...st.selected, id] });
  const togglePage = () => update({ selected: allOnPage ? st.selected.filter((id) => !pageIds.includes(id)) : [...new Set([...st.selected, ...pageIds])] });
  const clear = () => update({ search: '', filters: {} });

  const open = (row: T) => props.onRowClick?.(row);
  const onRowClick = (e: MouseEvent, row: T) => {
    // A link, button or tick inside the row does its own thing.
    if ((e.target as HTMLElement).closest('a, button, input, select, label')) return;
    open(row);
  };
  const onRowKey = (e: KeyboardEvent, row: T) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      open(row);
    }
  };

  const showToolbar = Boolean(search || filters.length || props.toolbar);

  return (
    <div className="dt">
      {showToolbar && (
        <div className="dt-bar">
          {search && (
            <div className="dt-search">
              <Search size={15} aria-hidden />
              <input className="input" type="search" aria-label={`Tìm trong ${label}`} placeholder={search.placeholder ?? 'Tìm kiếm'} value={st.search} onChange={(e) => update({ search: e.target.value })} />
              {st.search && (
                <button type="button" className="dt-x" aria-label="Xoá tìm kiếm" onClick={() => update({ search: '' })}>
                  <X size={14} aria-hidden />
                </button>
              )}
            </div>
          )}
          {filters.map((f) => (
            <FilterChips key={f.id} filter={f} value={st.filters[f.id] ?? ''} counts={manual ? null : countsFor(f, data, searchOk, filterOk)} onChange={(v) => update({ filters: { ...st.filters, [f.id]: v } })} />
          ))}
          {props.toolbar && <div className="dt-tools">{props.toolbar}</div>}
        </div>
      )}

      {selectable && st.selected.length > 0 && (
        <div className="dt-selected" role="status">
          Đã chọn {st.selected.length} dòng
          <button type="button" className="btn ghost sm" onClick={() => update({ selected: [] })}>
            Bỏ chọn
          </button>
        </div>
      )}

      {props.error ? (
        <div className="alert bad" role="alert">
          {props.error}
        </div>
      ) : (
        <div className="dt-scroll">
          <table className="tbl dt-table" aria-label={label} aria-busy={loading || undefined}>
            <thead>
              <tr>
                {selectable && (
                  <th className="dt-check">
                    <input type="checkbox" aria-label="Chọn cả trang" checked={allOnPage} onChange={togglePage} />
                  </th>
                )}
                {table.getHeaderGroups()[0]?.headers.map((h) => {
                  const col = byId.get(h.column.id) as DataColumn<T>;
                  const dir = h.column.getIsSorted();
                  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ChevronsUpDown;
                  return (
                    <th key={h.id} className={hideClass(col)} style={{ width: col.width, textAlign: col.align }} aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : col.sortValue ? 'none' : undefined}>
                      {col.sortValue ? (
                        <button type="button" className={`dt-sort${dir ? ' on' : ''}`} onClick={h.column.getToggleSortingHandler()}>
                          {col.header}
                          <Icon size={13} aria-hidden />
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} aria-hidden>
                    <td colSpan={span}>
                      <span className="dt-skel" />
                    </td>
                  </tr>
                ))
              ) : total === 0 ? (
                <tr>
                  <td colSpan={span} className="dt-empty">
                    {active ? (
                      <>
                        <p>Không có kết quả khớp.</p>
                        <button type="button" className="btn sm" onClick={clear}>
                          Xoá tìm kiếm và bộ lọc
                        </button>
                      </>
                    ) : (
                      (props.empty ?? <p className="muted">Chưa có dữ liệu.</p>)
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={props.onRowClick ? 'dt-click' : undefined}
                    tabIndex={props.onRowClick ? 0 : undefined}
                    aria-selected={selectable ? selected.has(row.id) : undefined}
                    onClick={props.onRowClick ? (e) => onRowClick(e, row.original) : undefined}
                    onKeyDown={props.onRowClick ? (e) => onRowKey(e, row.original) : undefined}
                  >
                    {selectable && (
                      <td className="dt-check">
                        <input type="checkbox" aria-label="Chọn dòng" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} />
                      </td>
                    )}
                    {row.getVisibleCells().map((cell) => {
                      const col = byId.get(cell.column.id) as DataColumn<T>;
                      return (
                        <td key={cell.id} className={[col.mono ? 'mono' : '', hideClass(col) ?? ''].filter(Boolean).join(' ') || undefined} style={{ textAlign: col.align }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            {hasFooter && !loading && total > 0 && (
              <tfoot>
                <tr>
                  {selectable && <td />}
                  {columns.map((c) => (
                    <td key={c.id} className={hideClass(c)} style={{ textAlign: c.align }}>
                      {typeof c.footer === 'function' ? c.footer(matching) : c.footer}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {!props.error && !loading && total > 0 && (
        <div className="dt-pager">
          <span className="cap">
            {page * st.pageSize + 1}–{Math.min(total, (page + 1) * st.pageSize)} / {total}
          </span>
          <div className="row" style={{ gap: 8 }}>
            {pageSizes.length > 1 && (
              <select className="select dt-size" aria-label="Số dòng mỗi trang" value={st.pageSize} onChange={(e) => update({ pageSize: Number(e.target.value) })}>
                {pageSizes.map((n) => (
                  <option key={n} value={n}>
                    {n} dòng
                  </option>
                ))}
              </select>
            )}
            {pageCount > 1 && (
              <>
                <button type="button" className="btn sm" disabled={page === 0} onClick={() => update({ page: page - 1 })}>
                  Trước
                </button>
                <span className="cap">
                  {page + 1}/{pageCount}
                </span>
                <button type="button" className="btn sm" disabled={page >= pageCount - 1} onClick={() => update({ page: page + 1 })}>
                  Sau
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {props.footer}
    </div>
  );
}

/** Rows each option would show if chosen now: filtered by the search and the other filters, not by this one. */
function countsFor<T>(filter: DataFilter<T>, data: T[], searchOk: (r: T) => boolean, filterOk: (r: T, skip?: string) => boolean) {
  const base = data.filter((r) => searchOk(r) && filterOk(r, filter.id));
  return { all: base.length, by: Object.fromEntries(filter.options.map((o) => [o.value, base.filter(o.match).length])) };
}

function FilterChips<T>({ filter, value, counts, onChange }: { filter: DataFilter<T>; value: string; counts: { all: number; by: Record<string, number> } | null; onChange: (v: string) => void }) {
  const chip = (v: string, text: string, n: number | undefined) => (
    <button key={v || 'all'} type="button" className={value === v ? 'on' : undefined} aria-pressed={value === v} onClick={() => onChange(v)}>
      {text}
      {n !== undefined && <small>{n}</small>}
    </button>
  );
  return (
    <div className="seg dt-filter" role="group" aria-label={filter.label}>
      {chip('', 'Tất cả', counts?.all)}
      {/* An option that would show nothing is left out, unless it is the one chosen. */}
      {filter.options.filter((o) => !counts || counts.by[o.value] !== 0 || o.value === value).map((o) => chip(o.value, o.label, counts?.by[o.value]))}
    </div>
  );
}

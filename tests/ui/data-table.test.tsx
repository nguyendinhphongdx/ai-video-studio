import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DataTable, fold, matchesQuery, type DataColumn, type DataFilter, type DataTableProps } from '@/components/data-table';

interface Row {
  id: string;
  n: number;
  title: string;
  status: 'draft' | 'done';
  cost: number | null;
}

const rows: Row[] = [
  { id: 'a', n: 1, title: 'Cậu bé sinh ra từ quả cầu sen', status: 'done', cost: 0.5 },
  { id: 'b', n: 6, title: 'Tái sinh từ hoa sen', status: 'draft', cost: null },
  { id: 'c', n: 5, title: 'Na Tra cứu dân Trần Đường Quan', status: 'draft', cost: 0.25 },
  { id: 'd', n: 4, title: 'Long Vương nổi giận', status: 'draft', cost: 2 },
  { id: 'e', n: 3, title: 'Na Tra náo biển Đông', status: 'done', cost: 1 },
];

const columns: DataColumn<Row>[] = [
  { id: 'n', header: 'Tập', cell: (r) => r.n, sortValue: (r) => r.n, mono: true, footer: (all) => `${all.length} tập` },
  { id: 'title', header: 'Tiêu đề', cell: (r) => <b>{r.title}</b>, sortValue: (r) => r.title },
  { id: 'cost', header: 'Chi phí', cell: (r) => (r.cost == null ? '-' : `$${r.cost}`), sortValue: (r) => r.cost, align: 'right', hideBelow: 'md' },
  { id: 'note', header: 'Ghi chú', cell: () => 'x' },
];

const status: DataFilter<Row> = {
  id: 'status',
  label: 'Trạng thái',
  options: [
    { value: 'draft', label: 'Nháp', match: (r) => r.status === 'draft' },
    { value: 'done', label: 'Xong', match: (r) => r.status === 'done' },
  ],
};

const html = (props: Partial<DataTableProps<Row>> = {}) =>
  renderToStaticMarkup(<DataTable data={rows} columns={columns} rowId={(r) => r.id} label="Các tập" search={{ text: (r) => r.title }} filters={[status]} {...props} />);

/** Titles in the order they appear in the body. */
const order = (markup: string) => [...markup.matchAll(/<b>([^<]+)<\/b>/g)].map((m) => m[1]);

describe('search text', () => {
  it('ignores case and Vietnamese marks, and needs every word', () => {
    expect(fold('Trần Đường Quan')).toBe('tran duong quan');
    expect(matchesQuery('Na Tra cứu dân', 'na tra cuu')).toBe(true);
    expect(matchesQuery('Na Tra cứu dân', 'dan tra')).toBe(true);
    expect(matchesQuery('Na Tra cứu dân', 'long')).toBe(false);
    expect(matchesQuery('anything', '   ')).toBe(true);
  });
});

describe('DataTable', () => {
  it('keeps the order of the data until a sort is chosen, and shows the custom cells and footer', () => {
    const out = html();
    expect(order(out)).toEqual(rows.map((r) => r.title));
    expect(out).toContain('<th');
    expect(out).toContain('5 tập');
    expect(out).toContain('aria-label="Các tập"');
  });

  it('sorts by a number, ascending then descending, with empty values last either way', () => {
    expect(order(html({ initialState: { sort: { id: 'n', dir: 'asc' } } })).slice(0, 3)).toEqual(['Cậu bé sinh ra từ quả cầu sen', 'Na Tra náo biển Đông', 'Long Vương nổi giận']);
    expect(order(html({ initialState: { sort: { id: 'n', dir: 'desc' } } }))[0]).toBe('Tái sinh từ hoa sen');
    expect(order(html({ initialState: { sort: { id: 'cost', dir: 'asc' } } })).at(-1)).toBe('Tái sinh từ hoa sen');
    expect(order(html({ initialState: { sort: { id: 'cost', dir: 'desc' } } })).at(-1)).toBe('Tái sinh từ hoa sen');
  });

  it('marks the sorted header and only offers sorting on columns that can sort', () => {
    const out = html({ initialState: { sort: { id: 'title', dir: 'asc' } } });
    expect(out).toContain('aria-sort="ascending"');
    expect(out).toContain('aria-sort="none"');
    expect(out.match(/class="dt-sort/g)).toHaveLength(3);
  });

  it('searches without marks, then filters with counts that follow the search', () => {
    expect(order(html({ initialState: { search: 'na tra' } }))).toEqual(['Na Tra cứu dân Trần Đường Quan', 'Na Tra náo biển Đông']);
    const filtered = html({ initialState: { filters: { status: 'done' } } });
    expect(order(filtered)).toEqual(['Cậu bé sinh ra từ quả cầu sen', 'Na Tra náo biển Đông']);
    // Counts: all five, three drafts, two done; with the search "na tra" only one of each remains.
    expect(html()).toMatch(/Tất cả<small>5<\/small>/);
    expect(html()).toMatch(/Nháp<small>3<\/small>/);
    expect(html({ initialState: { search: 'na tra' } })).toMatch(/Nháp<small>1<\/small>/);
  });

  it('leaves out a filter option that would show nothing, unless it is the chosen one', () => {
    const onlyDone = rows.filter((r) => r.status === 'done');
    expect(html({ data: onlyDone })).not.toContain('Nháp');
    expect(html({ data: onlyDone, initialState: { filters: { status: 'draft' } } })).toContain('Nháp');
  });

  it('pages, and clamps a page that no longer exists', () => {
    const first = html({ initialState: { pageSize: 2 }, pageSizes: [2, 5] });
    expect(order(first)).toHaveLength(2);
    expect(first).toContain('1–2 / 5');
    expect(first).toContain('1/3');
    expect(order(html({ initialState: { pageSize: 2, page: 2 }, pageSizes: [2, 5] }))).toEqual(['Na Tra náo biển Đông']);
    // Far beyond the last page: shows the last one.
    expect(html({ initialState: { pageSize: 2, page: 99 }, pageSizes: [2, 5] })).toContain('5–5 / 5');
  });

  it('explains an empty table and a table that filters hide', () => {
    expect(html({ data: [], empty: <p>Chưa có tập nào</p> })).toContain('Chưa có tập nào');
    const none = html({ initialState: { search: 'zzz' } });
    expect(none).toContain('Không có kết quả khớp');
    expect(none).toContain('Xoá tìm kiếm và bộ lọc');
  });

  it('shows loading rows and an error instead of the data', () => {
    const loading = html({ loading: true });
    expect(loading).toContain('dt-skel');
    expect(loading).not.toContain('Cậu bé');
    const error = html({ error: 'Không tải được' });
    expect(error).toContain('role="alert"');
    expect(error).not.toContain('<table');
  });

  it('ticks rows when selectable and makes rows reachable by keyboard when clickable', () => {
    const out = html({ selectable: true, initialState: { selected: ['a'] }, onRowClick: () => undefined });
    expect(out).toContain('aria-label="Chọn cả trang"');
    expect(out).toContain('Đã chọn 1 dòng');
    expect(out).toContain('aria-selected="true"');
    expect(out).toContain('tabindex="0"');
  });

  it('shows a server page as it is in manual mode', () => {
    const out = html({ manual: true, data: rows.slice(0, 2), rowCount: 40, initialState: { pageSize: 2, page: 3 }, pageSizes: [2] });
    expect(order(out)).toHaveLength(2);
    expect(out).toContain('7–8 / 40');
    expect(out).toContain('4/20');
    expect(out).not.toMatch(/<small>/);
  });

  it('hides a column on small screens with a class, not by dropping it', () => {
    expect(html()).toContain('dt-hide-md');
  });
});

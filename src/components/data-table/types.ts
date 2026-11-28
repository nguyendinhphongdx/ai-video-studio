import type { ReactNode } from 'react';

export type SortValue = string | number | null | undefined;

/** One column. Everything about how it looks is a render function, so a column can show anything. */
export interface DataColumn<T> {
  id: string;
  header: ReactNode;
  /** The cell of a row. */
  cell: (row: T) => ReactNode;
  /** What the column sorts by. Leave out and the column cannot be sorted. Empty values always sort last. */
  sortValue?: (row: T) => SortValue;
  /** Footer cell: a node, or a function of the rows currently matching the search and filters (all pages). */
  footer?: ReactNode | ((rows: T[]) => ReactNode);
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  /** Monospace digits, for numbers and ids. */
  mono?: boolean;
  /** Hide the column below this width in px (for phones). */
  hideBelow?: 'sm' | 'md';
}

/** A single-choice filter shown as chips with counts: "Tất cả" plus one chip per option. */
export interface DataFilter<T> {
  id: string;
  label: string;
  options: { value: string; label: string; match: (row: T) => boolean }[];
}

export interface DataTableState {
  search: string;
  /** Column id and direction; null keeps the order of `data`. */
  sort: { id: string; dir: 'asc' | 'desc' } | null;
  /** Filter id to the chosen option value; a missing id means "Tất cả". */
  filters: Record<string, string>;
  /** Zero-based. */
  page: number;
  pageSize: number;
  /** Row ids ticked (only with `selectable`). */
  selected: string[];
}

export const DEFAULT_STATE: DataTableState = { search: '', sort: null, filters: {}, page: 0, pageSize: 10, selected: [] };

export interface DataTableProps<T> {
  data: T[];
  columns: DataColumn<T>[];
  /** Stable id of a row (the database id), used for keys and selection. */
  rowId: (row: T) => string;
  /** Accessible name of the table. */
  label: string;

  /** Adds a search box; `text` is everything about the row a person might search for. */
  search?: { placeholder?: string; text: (row: T) => string };
  filters?: DataFilter<T>[];

  onRowClick?: (row: T) => void;
  /** Ticks in the first column; the ids come back through `onSelectionChange`. */
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;

  /** Buttons at the right of the toolbar (for example "Xuất file"). */
  toolbar?: ReactNode;
  /** Under the pager. */
  footer?: ReactNode;
  /** Shown when `data` is empty (not when filters hide everything). */
  empty?: ReactNode;
  loading?: boolean;
  error?: ReactNode;

  pageSizes?: number[];

  /** Uncontrolled: where to start. */
  initialState?: Partial<DataTableState>;
  /** Controlled: you own the state (for example to keep it in the URL). */
  state?: DataTableState;
  onStateChange?: (state: DataTableState) => void;
  /**
   * The server searches, filters, sorts and pages: `data` is the current page only and the table does none of it.
   * Needs `rowCount` (all matching rows) and a controlled `state`.
   */
  manual?: boolean;
  rowCount?: number;
}

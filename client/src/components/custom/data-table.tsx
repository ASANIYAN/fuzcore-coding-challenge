/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  functionalUpdate,
  type Table as TanstackTable,
  type Row,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomButton } from "@/components/custom/custom-button";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageSize?: number;
  className?: string;
  loading?: boolean;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (state: VisibilityState) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  toolbar?: (table: TanstackTable<TData>) => React.ReactNode;
  footer?: React.ReactNode;
  hidePagination?: boolean;
  onRowClick?: (row: Row<TData>) => void;
  highlightOnClick?: boolean;
};

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="size-3 text-app-text" />;
  if (sorted === "desc") return <ArrowDown className="size-3 text-app-text" />;
  return (
    <ArrowUpDown className="size-3 text-app-text-subtle opacity-0 transition-opacity group-hover/head:opacity-100" />
  );
}

function TableSkeleton({
  columns,
  rows = 5,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow
          key={rowIdx}
          className="border-b border-app-border hover:bg-transparent"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <TableCell key={colIdx} className="px-5 py-3.5">
              <div
                className="h-3.5 animate-pulse rounded-[--radius-xs] bg-app-surface"
                style={{ width: `${55 + Math.random() * 35}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function DataTablePagination<TData>({
  table,
}: {
  table: TanstackTable<TData>;
}) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="flex items-center justify-between border-t border-app-border px-5 py-3">
      <span className="select-none text-xii tabular-nums text-app-text-muted">
        {totalRows === 0 ? "0 results" : `${from}-${to} of ${totalRows}`}
      </span>

      <div className="flex items-center gap-1.5">
        <CustomButton
          variant="secondary"
          size="sm"
          className="size-7 p-0"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          aria-label="First page"
        >
          <ChevronsLeft className="size-3.5" />
        </CustomButton>

        <CustomButton
          variant="secondary"
          size="sm"
          className="size-7 p-0"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </CustomButton>

        <span className="min-w-16 select-none px-2 text-center text-xii tabular-nums text-app-text-muted">
          {table.getPageCount() === 0
            ? "-"
            : `${pageIndex + 1} / ${table.getPageCount()}`}
        </span>

        <CustomButton
          variant="secondary"
          size="sm"
          className="size-7 p-0"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Next page"
        >
          <ChevronRight className="size-3.5" />
        </CustomButton>

        <CustomButton
          variant="secondary"
          size="sm"
          className="size-7 p-0"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
          aria-label="Last page"
        >
          <ChevronsRight className="size-3.5" />
        </CustomButton>
      </div>
    </div>
  );
}

export function DataTable<TData, TValue>({
  data,
  columns,
  className,
  pageSize = 10,
  loading = false,
  columnVisibility: controlledColumnVisibility,
  onColumnVisibilityChange,
  emptyTitle = "No results",
  emptyDescription = "Nothing to show here yet.",
  emptyAction,
  toolbar,
  footer,
  hidePagination = false,
  onRowClick,
  highlightOnClick = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [activeRowId, setActiveRowId] = React.useState<string | null>(null);

  const resolvedColumnVisibility =
    controlledColumnVisibility ?? columnVisibility;

  React.useEffect(() => {
    if (controlledColumnVisibility) {
      setColumnVisibility(controlledColumnVisibility);
    }
  }, [controlledColumnVisibility]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: onColumnVisibilityChange
      ? (updaterOrValue) => {
          const newState = functionalUpdate(
            updaterOrValue,
            resolvedColumnVisibility,
          );
          onColumnVisibilityChange(newState);
        }
      : setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility: resolvedColumnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: { pageSize },
    },
  });

  React.useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  const hasRows = table.getRowModel().rows.length > 0;
  const isClickable = Boolean(onRowClick);

  return (
    <section
      data-slot="app-data-table"
      className={cn(
        "w-full overflow-auto rounded-[--radius-xl] border border-app-border bg-app-card",
        className,
      )}
    >
      {toolbar ? (
        <div className="border-b border-app-border px-5 py-3.5">
          {toolbar(table)}
        </div>
      ) : null}

      <div className="relative w-full overflow-x-auto">
        {loading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-[--radius-xl] bg-app-card/70 backdrop-blur-[1px]"
            aria-label="Loading"
          >
            <div className="flex flex-col items-center gap-2.5">
              <Loader2 className="size-5 animate-spin text-app-text" />
              <span className="text-xii text-app-text-muted">Loading...</span>
            </div>
          </div>
        ) : null}

        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-app-border hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "group/head whitespace-nowrap px-5 py-2.5 text-left text-xii font-medium uppercase tracking-[0.5px] text-app-text-muted select-none",
                        canSort
                          ? "cursor-pointer transition-colors hover:text-app-text"
                          : "",
                      )}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center gap-1.5">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort ? <SortIcon sorted={sorted} /> : null}
                        </span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableSkeleton
                columns={columns.length}
                rows={pageSize > 8 ? 8 : pageSize}
              />
            ) : hasRows ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  data-active={
                    highlightOnClick && activeRowId === row.id
                      ? "true"
                      : undefined
                  }
                  onClick={
                    isClickable
                      ? () => {
                          setActiveRowId(row.id);
                          onRowClick?.(row);
                        }
                      : undefined
                  }
                  className={cn(
                    "border-b border-app-border transition-colors last:border-0",
                    "hover:bg-app-hover",
                    isClickable ? "cursor-pointer" : "",
                    highlightOnClick && activeRowId === row.id
                      ? "bg-app-selected"
                      : "",
                    row.getIsSelected() ? "bg-app-selected" : "",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="whitespace-nowrap px-5 py-3.5 align-middle text-xiii text-app-text"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-52 p-0">
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                    <p className="text-xiv font-medium text-app-text">
                      {emptyTitle}
                    </p>
                    <p className="text-xii text-app-text-muted">
                      {emptyDescription}
                    </p>
                    {emptyAction}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!hidePagination && !loading ? (
        <DataTablePagination table={table} />
      ) : null}

      {footer ? (
        <div className="border-t border-app-border px-5 py-3.5">{footer}</div>
      ) : null}
    </section>
  );
}

export default DataTable;

export type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  Row,
};
export {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
};

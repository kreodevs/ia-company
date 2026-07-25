import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react";
import { forwardRef, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/atoms/Checkbox";
import { InputText } from "@/components/atoms/InputText";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Button } from "@/components/atoms/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/organisms/Table";
import { Dropdown } from "@/components/molecules/Dropdown";

export interface DataTableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "dropdown" | "date" | "number";
  filterOptions?: { label: string; value: unknown }[];
  width?: string;
  cellType?: "default" | "checkbox";
  checkboxDisabled?: boolean | ((row: any) => boolean);
  onCheckboxChange?: (row: any, checked: boolean, field: string) => void;
  body?: (rowData: any) => ReactNode;
}

export interface DataTableInputProps {
  columns: DataTableColumn[];
  data: any[];
  loading?: boolean;
  globalFilterEnabled?: boolean;
  globalFilterPlaceholder?: string;
  emptyMessage?: string;
  dense?: boolean;
  striped?: boolean;
  showGridlines?: boolean;
  paginator?: boolean;
  rows?: number;
  rowsPerPageOptions?: number[];
  selectionMode?: "single" | "multiple" | null;
  selection?: any[];
  onSelectionChange?: (e: { value: any[] }) => void;
  dataKey?: string;
  className?: string;
  header?: ReactNode;
}

function getNestedValue(row: Record<string, unknown>, field: string): unknown {
  return field.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, row);
}

function globalFilterFn(row: { original: any }, _columnId: string, filterValue: string) {
  if (!filterValue) return true;
  const search = filterValue.toLowerCase();
  return Object.values(row.original).some((val) =>
    String(val ?? "")
      .toLowerCase()
      .includes(search),
  );
}

export const DataTable = forwardRef<HTMLDivElement, DataTableInputProps>(
  (
    {
      columns,
      data,
      loading = false,
      globalFilterEnabled = true,
      globalFilterPlaceholder = "Buscar en todos los campos...",
      emptyMessage = "No se encontraron registros",
      dense = true,
      striped = false,
      showGridlines = false,
      paginator = true,
      rows = 10,
      rowsPerPageOptions = [5, 10, 25, 50],
      selectionMode,
      selection = [],
      onSelectionChange,
      dataKey = "id",
      className,
      header,
    },
    ref,
  ) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: rows });

    const rowSelection = useMemo<RowSelectionState>(() => {
      const map: RowSelectionState = {};
      selection.forEach((row) => {
        const key = String(row[dataKey] ?? "");
        if (key) map[key] = true;
      });
      return map;
    }, [selection, dataKey]);

    const tableColumns = useMemo<ColumnDef<any>[]>(() => {
      const defs: ColumnDef<any>[] = [];

      if (selectionMode === "multiple") {
        defs.push({
          id: "__select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onChange={(checked) => table.toggleAllPageRowsSelected(checked)}
              aria-label="Seleccionar todo"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onChange={(checked) => row.toggleSelected(checked)}
              aria-label="Seleccionar fila"
            />
          ),
          enableSorting: false,
          size: 40,
        });
      }

      columns.forEach((col) => {
        defs.push({
          id: col.field,
          accessorFn: (row) => getNestedValue(row, col.field),
          header: col.header,
          enableSorting: col.sortable ?? false,
          enableColumnFilter: col.filterable ?? false,
          size: col.width ? parseInt(col.width, 10) : undefined,
          cell: ({ row }) => {
            const rowData = row.original;
            if (col.cellType === "checkbox") {
              const checked = Boolean(getNestedValue(rowData, col.field));
              const isDisabled =
                typeof col.checkboxDisabled === "function"
                  ? col.checkboxDisabled(rowData)
                  : (col.checkboxDisabled ?? false);
              return (
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={checked}
                    disabled={isDisabled}
                    onChange={(nextChecked) => col.onCheckboxChange?.(rowData, nextChecked, col.field)}
                    aria-label={col.header}
                  />
                </div>
              );
            }
            if (col.body) return col.body(rowData);
            const val = getNestedValue(rowData, col.field);
            return val != null ? String(val) : "";
          },
        });
      });

      return defs;
    }, [columns, selectionMode]);

    const table = useReactTable<any>({
      data,
      columns: tableColumns,
      state: {
        sorting,
        columnFilters,
        globalFilter,
        pagination,
        rowSelection,
      },
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onGlobalFilterChange: setGlobalFilter,
      onPaginationChange: setPagination,
      onRowSelectionChange: (updater) => {
        const next = typeof updater === "function" ? updater(rowSelection) : updater;
        const selectedRows = data.filter((row) => next[String(row[dataKey] ?? "")]);
        onSelectionChange?.({ value: selectedRows });
      },
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: paginator ? getPaginationRowModel() : undefined,
      globalFilterFn,
      enableMultiSort: true,
      enableRowSelection: Boolean(selectionMode),
      getRowId: (row) => String(row[dataKey] ?? ""),
    });

    const cellPadding = dense ? "px-[var(--spacing-sm)] py-1.5 text-xs" : "px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm";
    const headPadding = dense
      ? "px-[var(--spacing-sm)] py-1.5 text-[10px] font-semibold uppercase tracking-wider"
      : "px-[var(--spacing-md)] py-2.5 text-xs font-semibold uppercase tracking-wider";

    const renderHeader = () => {
      if (header) return header;
      if (!globalFilterEnabled) return null;
      return (
        <div className="flex items-center justify-between gap-[var(--spacing-md)] px-[var(--spacing-md)] py-[var(--spacing-md)] bg-[var(--secondary)] border-b border-[var(--border)]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
            <InputText
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={globalFilterPlaceholder}
              className="w-full h-9 pl-9 pr-[var(--spacing-md)]"
            />
          </div>
          <div className="text-xs text-[var(--foreground-muted)]">{data.length} registros</div>
        </div>
      );
    };

    const pageCount = table.getPageCount();
    const pageIndex = table.getState().pagination.pageIndex;
    const pageSize = table.getState().pagination.pageSize;
    const filteredCount = table.getFilteredRowModel().rows.length;
    const from = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
    const to = Math.min((pageIndex + 1) * pageSize, filteredCount);

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] overflow-hidden",
          className,
        )}
      >
        {renderHeader()}

        <div className="relative overflow-auto">
          {loading && (
            <div className="absolute inset-0 bg-[var(--background)]/80 flex items-center justify-center z-[var(--z-sticky)]">
              <Skeleton width="2rem" height="2rem" variant="rounded" />
            </div>
          )}

          <Table>
            <TableHeader className="bg-[var(--secondary)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-[var(--border)] hover:bg-transparent">
                  {headerGroup.headers.map((headerCol) => {
                    const colDef = columns.find((c) => c.field === headerCol.id);
                    const sorted = headerCol.column.getIsSorted();
                    return (
                      <TableHead
                        key={headerCol.id}
                        className={cn(
                          headPadding,
                          "text-[var(--foreground-muted)] bg-[var(--secondary)]",
                          showGridlines && "border-r border-[var(--border)] last:border-r-0",
                          headerCol.column.getCanSort() && "cursor-pointer select-none hover:text-[var(--foreground)]",
                        )}
                        style={colDef?.width ? { width: colDef.width, minWidth: colDef.width } : undefined}
                        onClick={headerCol.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-[var(--spacing-xs)]">
                          {flexRender(headerCol.column.columnDef.header, headerCol.getContext())}
                          {headerCol.column.getCanSort() && (
                            <span className="text-[var(--foreground-muted)]">
                              {sorted === "asc" ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : sorted === "desc" ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                        {colDef?.filterable && (
                          <InputText
                            value={(headerCol.column.getFilterValue() as string) ?? ""}
                            onChange={(e) => headerCol.column.setFilterValue(e.target.value)}
                            placeholder={`Filtrar ${colDef.header.toLowerCase()}...`}
                            className="mt-[var(--spacing-xs)] h-7 text-xs w-full"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="divide-y divide-[var(--border)]">
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={tableColumns.length}
                    className="p-[var(--spacing-xl)] text-center text-[var(--foreground-muted)]"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row, rowIdx) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={cn(
                      "transition-colors hover:bg-[var(--secondary)]",
                      row.getIsSelected() && "bg-[var(--accent)]/10",
                      striped && rowIdx % 2 === 1 && "bg-[var(--secondary)]/50",
                    )}
                    onClick={() => {
                      if (selectionMode === "single") {
                        onSelectionChange?.({ value: [row.original] });
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const colDef = columns.find((c) => c.field === cell.column.id);
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cellPadding,
                            "text-[var(--foreground)] whitespace-nowrap",
                            showGridlines && "border-r border-[var(--border)] last:border-r-0",
                          )}
                          style={colDef?.width ? { width: colDef.width, minWidth: colDef.width } : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {paginator && filteredCount > 0 && (
          <div className="flex items-center justify-between px-[var(--spacing-md)] py-[var(--spacing-md)] bg-[var(--secondary)] border-t border-[var(--border)] gap-[var(--spacing-md)] flex-wrap">
            <span className="text-xs text-[var(--foreground-muted)]">
              Mostrando {from} a {to} de {filteredCount}
            </span>
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <Dropdown
                value={pageSize}
                onChange={(e) => table.setPageSize(Number(e.value))}
                options={rowsPerPageOptions.map((n) => ({ label: String(n), value: n }))}
                className="h-8 min-w-[4.5rem]"
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.setPageIndex(0)}
                aria-label="Primera página"
              >
                «
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                aria-label="Página anterior"
              >
                ‹
              </Button>
              <span className="text-sm text-[var(--foreground-muted)] min-w-[4rem] text-center">
                {pageIndex + 1} / {Math.max(pageCount, 1)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                aria-label="Página siguiente"
              >
                ›
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={!table.getCanNextPage()}
                onClick={() => table.setPageIndex(pageCount - 1)}
                aria-label="Última página"
              >
                »
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

DataTable.displayName = "DataTable";

/** @deprecated Use DataTableColumn instead — kept for backward compatibility */
export type Column = DataTableColumn;

export default DataTable;

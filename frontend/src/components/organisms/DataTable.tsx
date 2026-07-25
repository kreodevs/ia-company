import { DataTable as PrimeDataTable, type DataTableProps as PrimeDataTableProps } from "primereact/datatable";
import { Column, type ColumnProps } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Search } from "lucide-react";
import { forwardRef, useState } from "react";
import { Checkbox } from "../atoms/Checkbox";

export interface DataTableColumn extends Omit<ColumnProps, "pt"> {
  field: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "dropdown" | "date" | "number";
  filterOptions?: { label: string; value: unknown }[];
  width?: string;
  cellType?: "default" | "checkbox";
  checkboxDisabled?: boolean | ((row: Record<string, unknown>) => boolean);
  onCheckboxChange?: (row: Record<string, unknown>, checked: boolean, field: string) => void;
}

export interface DataTableInputProps extends Omit<PrimeDataTableProps<any>, "pt"> {
  columns: DataTableColumn[];
  data: any[];
  loading?: boolean;
  globalFilterEnabled?: boolean;
  globalFilterPlaceholder?: string;
  emptyMessage?: string;
  dense?: boolean;
  striped?: boolean;
  showGridlines?: boolean;
}

const ptStyles = {
  root: { className: "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] overflow-hidden" },
  header: { className: "px-[var(--spacing-md)] py-[var(--spacing-md)] bg-[var(--secondary)] border-b border-[var(--border)]" },
  wrapper: { className: "overflow-auto" },
  table: { className: "w-full border-collapse" },
  thead: { className: "bg-[var(--secondary)]" },
  headerRow: { className: "border-b border-[var(--border)]" },
  headerCell: {
    className:
      "px-[var(--spacing-md)] py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] bg-[var(--secondary)] border-b border-[var(--border)] transition-colors [&[data-p-sortable-column=true]]:cursor-pointer [&[data-p-sortable-column=true]:hover]:bg-[var(--muted)] [&[data-p-sortable-column=true]:hover]:text-[var(--foreground)]",
  },
  sortIcon: { className: "ml-[var(--spacing-xs)] inline-flex text-[var(--foreground-muted)]" },
  sortBadge: { className: "ml-[var(--spacing-xs)] text-[10px] text-[var(--accent)]" },
  tbody: { className: "divide-y divide-[var(--border)]" },
  bodyRow: {
    className:
      "transition-colors hover:bg-[var(--secondary)] [&[data-p-highlight=true]]:bg-[var(--accent)]/10 [&[data-p-selectable-row=true]]:cursor-pointer",
  },
  bodyCell: { className: "px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm text-[var(--foreground)] whitespace-nowrap" },
  footerRow: { className: "border-t border-[var(--border)] bg-[var(--secondary)]" },
  footerCell: { className: "px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm font-medium text-[var(--foreground)]" },
  footer: { className: "px-[var(--spacing-md)] py-[var(--spacing-md)] bg-[var(--secondary)] border-t border-[var(--border)]" },
  loadingOverlay: { className: "absolute inset-0 bg-[var(--background)]/80 flex items-center justify-center z-10" },
  loadingIcon: { className: "w-8 h-8 text-[var(--accent)] animate-spin" },
  emptyMessage: { className: "text-center py-[var(--spacing-xl)] text-[var(--foreground-muted)]" },
  emptyMessageCell: { className: "p-[var(--spacing-xl)] text-center text-[var(--foreground-muted)]" },
  paginator: {
    root: { className: "flex items-center justify-between px-[var(--spacing-md)] py-[var(--spacing-md)] bg-[var(--secondary)] border-t border-[var(--border)]" },
    first: { className: "p-1.5 rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" },
    prev: { className: "p-1.5 rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" },
    next: { className: "p-1.5 rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" },
    last: { className: "p-1.5 rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" },
    pages: { className: "flex items-center gap-[var(--spacing-xs)]" },
    page: {
      className:
        "min-w-[32px] h-8 px-[var(--spacing-sm)] text-sm font-medium rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] [&[data-p-highlight=true]]:bg-[var(--accent)] [&[data-p-highlight=true]]:text-[var(--accent-foreground)] transition-colors",
    },
    current: { className: "text-sm text-[var(--foreground-muted)]" },
    rowPerPageDropdown: {
      root: {
        className:
          "h-8 px-[var(--spacing-sm)] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]",
      },
    },
  },
  filterInput: {
    className:
      "w-full h-8 px-[var(--spacing-sm)] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]",
  },
  filterMenuButton: {
    className:
      "p-[var(--spacing-xs)] rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors",
  },
  filterOverlay: {
    className:
      "mt-[var(--spacing-xs)] p-[var(--spacing-md)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--popover)] shadow-lg z-[var(--z-dropdown)]",
  },
  filterConstraint: { className: "mb-[var(--spacing-sm)]" },
  filterButtonbar: {
    className: "flex justify-end gap-[var(--spacing-sm)] mt-[var(--spacing-md)] pt-[var(--spacing-md)] border-t border-[var(--border)]",
  },
  filterClearButton: {
    className:
      "px-[var(--spacing-md)] py-1.5 text-xs font-medium rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--foreground)] bg-transparent hover:bg-[var(--secondary)] transition-colors",
  },
  filterApplyButton: {
    className:
      "px-[var(--spacing-md)] py-1.5 text-xs font-medium rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors",
  },
};

const densePtStyles = {
  ...ptStyles,
  headerCell: {
    className:
      "px-[var(--spacing-sm)] py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)] bg-[var(--secondary)] border-b border-[var(--border)] transition-colors [&[data-p-sortable-column=true]]:cursor-pointer [&[data-p-sortable-column=true]:hover]:bg-[var(--muted)] [&[data-p-sortable-column=true]:hover]:text-[var(--foreground)]",
  },
  bodyCell: { className: "px-[var(--spacing-sm)] py-1.5 text-xs text-[var(--foreground)] whitespace-nowrap" },
};

function getNestedValue(row: Record<string, unknown>, field: string): unknown {
  return field.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, row);
}

function buildCheckboxBody(col: DataTableColumn) {
  return (rowData: Record<string, unknown>) => {
    const checked = Boolean(getNestedValue(rowData, col.field));
    const isDisabled =
      typeof col.checkboxDisabled === "function" ? col.checkboxDisabled(rowData) : (col.checkboxDisabled ?? false);

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
  };
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
      ...props
    },
    ref,
  ) => {
    const [globalFilter, setGlobalFilter] = useState("");
    const styles = dense ? densePtStyles : ptStyles;

    const renderHeader = () => {
      if (!globalFilterEnabled) return null;

      return (
        <div className="flex items-center justify-between gap-[var(--spacing-md)]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
            <InputText
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={globalFilterPlaceholder}
              className="w-full h-9 pl-9 pr-[var(--spacing-md)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div className="text-xs text-[var(--foreground-muted)]">{data.length} registros</div>
        </div>
      );
    };

    const stripedStyles = striped
      ? { bodyRow: { className: `${styles.bodyRow.className} odd:bg-[var(--background)] even:bg-[var(--secondary)]/50` } }
      : {};

    const gridlineStyles = showGridlines
      ? {
          bodyCell: { className: `${styles.bodyCell.className} border-r border-[var(--border)] last:border-r-0` },
          headerCell: { className: `${styles.headerCell.className} border-r border-[var(--border)] last:border-r-0` },
        }
      : {};

    return (
      <div ref={ref}>
        <PrimeDataTable
          {...(props as any)}
          value={data}
          loading={loading}
          globalFilter={globalFilter}
          header={renderHeader()}
          emptyMessage={emptyMessage}
          paginator={paginator}
          rows={rows}
          rowsPerPageOptions={rowsPerPageOptions}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords}"
          sortMode="multiple"
          removableSort
          pt={{
            ...styles,
            ...stripedStyles,
            ...gridlineStyles,
            paginator: {
              ...styles.paginator,
              firstPageIcon: { className: styles.paginator.first.className },
              prevPageIcon: { className: styles.paginator.prev.className },
              nextPageIcon: { className: styles.paginator.next.className },
              lastPageIcon: { className: styles.paginator.last.className },
              pageButton: { className: styles.paginator.page.className },
            },
          }}
          paginatorLeft={<span className="text-xs text-[var(--foreground-muted)]" />}
        >
          {columns.map((col) => {
            const isCheckbox = col.cellType === "checkbox";
            return (
              <Column
                key={col.field}
                field={col.field}
                header={col.header}
                body={isCheckbox ? buildCheckboxBody(col) : col.body}
                sortable={isCheckbox ? false : col.sortable}
                filter={isCheckbox ? false : col.filterable}
                filterPlaceholder={isCheckbox ? undefined : `Filtrar ${col.header.toLowerCase()}...`}
                style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                pt={{
                  headerCell: dense ? densePtStyles.headerCell : ptStyles.headerCell,
                  bodyCell: dense ? densePtStyles.bodyCell : ptStyles.bodyCell,
                  filterInput: { className: styles.filterInput.className },
                  filterMenuButton: { className: styles.filterMenuButton.className },
                  filterOverlay: { className: styles.filterOverlay.className },
                }}
              />
            );
          })}
        </PrimeDataTable>
      </div>
    );
  },
);

DataTable.displayName = "DataTable";

export { Column };
export default DataTable;

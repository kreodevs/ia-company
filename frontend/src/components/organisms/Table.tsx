import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/atoms/Skeleton"

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
    loading?: boolean
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
    ({ className, loading, children, ...props }, ref) => {
        const barWidths = ["60%", "80%", "40%", "100%"]

        return (
            <div className="relative w-full overflow-auto">
                <table
                    ref={ref}
                    className={cn("w-full caption-bottom text-sm", className)}
                    {...props}>
                    {loading ? (
                        <tbody>
                            {Array.from({ length: 6 }).map((_, rowIdx) => (
                                <tr
                                    key={rowIdx}
                                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    {barWidths.map((width, colIdx) => (
                                        <td
                                            key={colIdx}
                                            className="p-[var(--spacing-sm)] align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                                            <Skeleton width={width} height="1rem" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    ) : (
                        children
                    )}
                </table>
            </div>
        )
    }
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tbody
        ref={ref}
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tfoot
        ref={ref}
        className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
        {...props} />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
    HTMLTableRowElement,
    React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
    <tr
        ref={ref}
        className={cn(
            "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
            className
        )}
        {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
    HTMLTableCellElement,
    React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
    <th
        ref={ref}
        className={cn(
            "h-10 px-[var(--spacing-sm)] text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
            className
        )}
        {...props} />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
    HTMLTableCellElement,
    React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
    <td
        ref={ref}
        className={cn(
            "p-[var(--spacing-sm)] align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
            className
        )}
        {...props} />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
    HTMLTableCaptionElement,
    React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
    <caption
        ref={ref}
        className={cn("mt-[var(--spacing-md)] text-sm text-muted-foreground", className)}
        {...props} />
))
TableCaption.displayName = "TableCaption"

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
}

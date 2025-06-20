import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export interface ColumnDef<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  enableSorting?: boolean;
}

interface DynamicTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  onSort?: (columnId: string) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  emptyStateMessage?: string;
  noHeader?: boolean;
}

export function DynamicTable<T extends { id: string | number }>({
  columns,
  data,
  isLoading = false,
  onSort,
  sortBy,
  sortOrder,
  emptyStateMessage = "No data found",
  noHeader = false,
}: DynamicTableProps<T>) {
  const renderSortArrow = (columnId: string) => {
    if (sortBy === columnId) {
      return sortOrder === "asc" ? " ↑" : " ↓";
    }
    return null;
  };

  return (
    <div className="overflow-x-auto">
        <Table>
          {!noHeader && (
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={column.enableSorting && onSort ? "cursor-pointer" : ""}
                    onClick={column.enableSorting && onSort ? () => onSort(column.id) : undefined}
                  >
                    {column.header}
                    {column.enableSorting && renderSortArrow(column.id)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {isLoading ? (
               <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8">
                   Loading data...
                  </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  {emptyStateMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => (
                    <TableCell key={column.id}>{column.cell(row)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
    </div>
  );
} 
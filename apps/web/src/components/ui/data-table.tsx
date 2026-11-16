import React from 'react';
import { Card } from './card';

export interface ColumnDef<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyText?: string;
}

/**
 * Reusable responsive data table primitive.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyText = 'No data available'
}: DataTableProps<T>) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm divide-y divide-border">
        <thead className="bg-surface-elevated text-xs font-semibold text-text-secondary">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-3 px-4 ${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-text-secondary text-sm">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-surface-elevated/50 transition-colors"
              >
                {columns.map((col, idx) => (
                  <td
                    key={idx}
                    className={`py-3 px-4 ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }`}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}

"use client";

import React from 'react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalPages,
  hasNext,
  hasPrev,
  limit,
  onPageChange,
  onLimitChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4 w-full">
      <div className="flex gap-1 items-center">
        <button
          className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
          disabled={page === 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >«</button>
        <button
          className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
          disabled={!hasPrev}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >‹</button>
        <span className="mx-2 text-sm font-medium">Page {page} of {totalPages}</span>
        <button
          className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >›</button>
        <button
          className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
          disabled={page === totalPages || totalPages === 0}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
        >»</button>
      </div>
      <div className="flex gap-2 items-center justify-end">
        <span className="text-sm">Rows per page:</span>
        <select
          className="border px-2 py-1 rounded text-sm focus:ring-2 focus:ring-primary bg-white"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}; 
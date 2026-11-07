'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TableHeaderProps {
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  sortField: string;
  sortAsc: boolean;
  onSort: (field: string) => void;
  visibleColumns: {
    symbol: boolean;
    company: boolean;
    sector: boolean;
    subsector: boolean;
    tags: boolean;
    exchange: boolean;
  };
}

export function TableHeader({
  isAllSelected,
  onToggleSelectAll,
  sortField,
  sortAsc,
  onSort,
  visibleColumns,
}: TableHeaderProps) {
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-[#787b86]/50 group-hover:text-[#787b86]" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-[#2962ff]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#2962ff]" />
    );
  };

  return (
    <div className="sticky top-0 z-20 flex items-center px-4 py-2 bg-[#1e222d] border-b border-[#2a2e39] text-[11px] font-semibold text-[#787b86] uppercase tracking-wider select-none shadow-sm">
      {/* 1. Drag Spacer */}
      <div className="w-6 shrink-0" />

      {/* 2. Select All Checkbox */}
      <div className="w-8 flex items-center justify-center shrink-0">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={onToggleSelectAll}
          className="rounded accent-[#2962ff] cursor-pointer"
          title="Select / Deselect All"
        />
      </div>

      {/* 3. Symbol */}
      {visibleColumns.symbol && (
        <div
          onClick={() => onSort('symbol')}
          className="w-36 flex items-center gap-1.5 shrink-0 pr-2 cursor-pointer group hover:text-[#d1d4dc] transition"
        >
          <span>Symbol</span>
          {renderSortIcon('symbol')}
        </div>
      )}

      {/* 4. Company */}
      {visibleColumns.company && (
        <div
          onClick={() => onSort('company')}
          className="flex-1 min-w-[180px] pr-3 flex items-center gap-1.5 cursor-pointer group hover:text-[#d1d4dc] transition"
        >
          <span>Company Name</span>
          {renderSortIcon('company')}
        </div>
      )}

      {/* 5. Sector */}
      {visibleColumns.sector && (
        <div
          onClick={() => onSort('sector')}
          className="w-36 shrink-0 pr-2 flex items-center gap-1.5 cursor-pointer group hover:text-[#d1d4dc] transition"
        >
          <span>Sector</span>
          {renderSortIcon('sector')}
        </div>
      )}

      {/* 6. Subsector */}
      {visibleColumns.subsector && (
        <div
          onClick={() => onSort('subsector')}
          className="w-44 shrink-0 pr-2 flex items-center gap-1.5 cursor-pointer group hover:text-[#d1d4dc] transition"
        >
          <span>Subsector</span>
          {renderSortIcon('subsector')}
        </div>
      )}

      {/* 7. Tags */}
      {visibleColumns.tags && (
        <div className="w-48 shrink-0 pr-2">
          <span>Tags</span>
        </div>
      )}

      {/* 8. Exchange */}
      {visibleColumns.exchange && (
        <div
          onClick={() => onSort('exchange')}
          className="w-16 shrink-0 text-center pr-2 flex items-center justify-center gap-1 cursor-pointer group hover:text-[#d1d4dc] transition"
        >
          <span>Exch</span>
          {renderSortIcon('exchange')}
        </div>
      )}

      {/* 9. Actions */}
      <div className="w-14 shrink-0" />
    </div>
  );
}


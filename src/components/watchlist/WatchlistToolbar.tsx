'use client';

import React from 'react';
import {
  Search,
  Filter,
  Columns3,
  MoveRight,
  Copy,
  Trash2,
  X,
  Tag as TagIcon,
  RotateCcw,
} from 'lucide-react';
import type { Sector, Tag, Watchlist, Section } from '@/lib/types';

interface WatchlistToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedExchange: 'ALL' | 'NSE' | 'BSE';
  onExchangeChange: (ex: 'ALL' | 'NSE' | 'BSE') => void;
  selectedSector: string;
  onSectorChange: (s: string) => void;
  selectedSubsector: string;
  onSubsectorChange: (ss: string) => void;
  selectedTagId: number | null;
  onTagChange: (tagId: number | null) => void;
  sectors: Sector[];
  tags: Tag[];
  onResetFilters: () => void;
  hasActiveFilters: boolean;

  // Column Visibility
  visibleColumns: {
    symbol: boolean;
    company: boolean;
    sector: boolean;
    subsector: boolean;
    tags: boolean;
    exchange: boolean;
  };
  onToggleColumn: (col: keyof WatchlistToolbarProps['visibleColumns']) => void;

  // Bulk Actions
  selectedStockIds: number[];
  onClearSelection: () => void;
  onBulkMoveOpen: () => void;
  onBulkCopyOpen: () => void;
  onBulkDelete: () => void;
}

export function WatchlistToolbar({
  searchQuery,
  onSearchChange,
  selectedExchange,
  onExchangeChange,
  selectedSector,
  onSectorChange,
  selectedSubsector,
  onSubsectorChange,
  selectedTagId,
  onTagChange,
  sectors,
  tags,
  onResetFilters,
  hasActiveFilters,
  visibleColumns,
  onToggleColumn,
  selectedStockIds,
  onClearSelection,
  onBulkMoveOpen,
  onBulkCopyOpen,
  onBulkDelete,
}: WatchlistToolbarProps) {
  const [columnMenuOpen, setColumnMenuOpen] = React.useState(false);

  // Get subsectors of selected sector
  const currentSectorObj = sectors.find((s) => s.name === selectedSector);
  const availableSubsectors = currentSectorObj?.subsectors || [];

  return (
    <div className="px-6 py-2.5 bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* If stocks selected: show Bulk Action bar */}
      {selectedStockIds.length > 0 ? (
        <div className="flex-1 flex items-center justify-between bg-[#1e222d] px-4 py-2 rounded-lg border border-[#2962ff]/40 shadow-md animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white bg-[#2962ff] px-2.5 py-0.5 rounded-full text-xs">
              {selectedStockIds.length} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-[#787b86] hover:text-[#d1d4dc] flex items-center gap-1 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Deselect All</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBulkMoveOpen}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363a45] text-white font-medium rounded transition"
            >
              <MoveRight className="w-3.5 h-3.5 text-[#2962ff]" />
              <span>Move To...</span>
            </button>

            <button
              onClick={onBulkCopyOpen}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363a45] text-white font-medium rounded transition"
            >
              <Copy className="w-3.5 h-3.5 text-[#089981]" />
              <span>Copy To...</span>
            </button>

            <button
              onClick={onBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f23645]/20 hover:bg-[#f23645]/30 text-[#f23645] font-medium rounded transition border border-[#f23645]/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove from Watchlist</span>
            </button>
          </div>
        </div>
      ) : (
        /* Normal Toolbar Filters */
        <div className="flex-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#787b86]" />
              <input
                type="text"
                placeholder="Filter current stocks..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-48 bg-[#1e222d] text-[#d1d4dc] text-xs pl-8 pr-2.5 py-1.5 rounded border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-2 text-[#787b86] hover:text-[#d1d4dc]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Exchange Toggle */}
            <div className="flex items-center bg-[#1e222d] p-0.5 rounded border border-[#2a2e39]">
              {(['ALL', 'NSE', 'BSE'] as const).map((ex) => (
                <button
                  key={ex}
                  onClick={() => onExchangeChange(ex)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    selectedExchange === ex
                      ? 'bg-[#2962ff] text-white'
                      : 'text-[#787b86] hover:text-[#d1d4dc]'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* Sector Filter */}
            <select
              value={selectedSector}
              onChange={(e) => {
                onSectorChange(e.target.value);
                onSubsectorChange('');
              }}
              className="bg-[#1e222d] text-[#d1d4dc] px-2.5 py-1.5 rounded border border-[#2a2e39] focus:outline-none focus:border-[#2962ff] max-w-[150px] truncate"
            >
              <option value="">All Sectors</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Subsector Filter (if sector selected) */}
            {selectedSector && availableSubsectors.length > 0 && (
              <select
                value={selectedSubsector}
                onChange={(e) => onSubsectorChange(e.target.value)}
                className="bg-[#1e222d] text-[#d1d4dc] px-2.5 py-1.5 rounded border border-[#2a2e39] focus:outline-none focus:border-[#2962ff] max-w-[150px] truncate"
              >
                <option value="">All Subsectors</option>
                {availableSubsectors.map((ss) => (
                  <option key={ss.id} value={ss.name}>
                    {ss.name}
                  </option>
                ))}
              </select>
            )}

            {/* Tag Filter */}
            <select
              value={selectedTagId ?? ''}
              onChange={(e) => onTagChange(e.target.value ? Number(e.target.value) : null)}
              className="bg-[#1e222d] text-[#d1d4dc] px-2.5 py-1.5 rounded border border-[#2a2e39] focus:outline-none focus:border-[#2962ff] max-w-[130px] truncate"
            >
              <option value="">All Tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  🏷️ {t.name}
                </option>
              ))}
            </select>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                className="flex items-center gap-1 text-[11px] text-[#787b86] hover:text-[#f23645] transition ml-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right side: Column Visibility */}
          <div className="relative">
            <button
              onClick={() => setColumnMenuOpen(!columnMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] rounded border border-[#2a2e39] transition"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Columns</span>
            </button>

            {columnMenuOpen && (
              <div
                className="absolute right-0 top-8 z-50 w-44 bg-[#1e222d] border border-[#2a2e39] rounded-md shadow-xl p-2 space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-semibold text-[#787b86] uppercase tracking-wider px-2 py-1">
                  Toggle Columns
                </div>
                {[
                  { key: 'symbol', label: 'TradingView Symbol' },
                  { key: 'company', label: 'Company Name' },
                  { key: 'sector', label: 'Sector' },
                  { key: 'subsector', label: 'Subsector' },
                  { key: 'tags', label: 'Custom Tags' },
                  { key: 'exchange', label: 'Exchange' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#2a2e39] cursor-pointer text-xs text-[#d1d4dc]"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[key as keyof typeof visibleColumns]}
                      onChange={() => onToggleColumn(key as keyof typeof visibleColumns)}
                      className="rounded accent-[#2962ff]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


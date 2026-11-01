'use client';

import React from 'react';
import {
  Plus,
  FolderPlus,
  FileSpreadsheet,
  Download,
  Copy,
  Search,
  ClipboardPaste,
} from 'lucide-react';
import type { Watchlist } from '@/lib/types';

interface WatchlistHeaderProps {
  watchlist: Watchlist | null;
  stockCount: number;
  onOpenAddModal: (initialTab: 'search' | 'paste' | 'csv') => void;
  onOpenAddSectionModal: () => void;
  onDuplicateWatchlist: () => void;
  onExportWatchlist: () => void;
}

export function WatchlistHeader({
  watchlist,
  stockCount,
  onOpenAddModal,
  onOpenAddSectionModal,
  onDuplicateWatchlist,
  onExportWatchlist,
}: WatchlistHeaderProps) {
  if (!watchlist) return null;

  return (
    <div className="px-6 py-4 bg-[#1e222d] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-4">
      {/* Title & Info */}
      <div className="flex items-center gap-3">
        <span
          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: watchlist.color || '#3b82f6' }}
        />
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-white tracking-tight">{watchlist.name}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#131722] text-[#d1d4dc] font-mono border border-[#2a2e39]">
              {stockCount} {stockCount === 1 ? 'stock' : 'stocks'}
            </span>
          </div>
          <div className="text-[11px] text-[#787b86]">
            Sections: {watchlist.sections?.length || 0} • Real-time reordering & sync
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick Add Search */}
        <button
          onClick={() => onOpenAddModal('search')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2962ff] hover:bg-[#1e53e5] text-white rounded transition shadow-sm"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search & Add</span>
        </button>

        {/* Paste Symbols */}
        <button
          onClick={() => onOpenAddModal('paste')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#2a2e39] hover:bg-[#363a45] text-[#d1d4dc] rounded transition border border-[#363a45]"
        >
          <ClipboardPaste className="w-3.5 h-3.5 text-[#2962ff]" />
          <span>Paste Symbols</span>
        </button>

        {/* Bulk CSV */}
        <button
          onClick={() => onOpenAddModal('csv')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#2a2e39] hover:bg-[#363a45] text-[#d1d4dc] rounded transition border border-[#363a45]"
          title="Import CSV into Watchlist"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#089981]" />
          <span>Bulk CSV</span>
        </button>

        {/* Add Section */}
        <button
          onClick={onOpenAddSectionModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#2a2e39] hover:bg-[#363a45] text-[#d1d4dc] rounded transition border border-[#363a45]"
        >
          <FolderPlus className="w-3.5 h-3.5 text-[#ff9800]" />
          <span>Add Section</span>
        </button>

        {/* Duplicate */}
        <button
          onClick={onDuplicateWatchlist}
          title="Duplicate Watchlist"
          className="p-1.5 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded transition border border-transparent hover:border-[#363a45]"
        >
          <Copy className="w-4 h-4" />
        </button>

        {/* Export */}
        <button
          onClick={onExportWatchlist}
          title="Export Watchlist Data"
          className="p-1.5 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded transition border border-transparent hover:border-[#363a45]"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


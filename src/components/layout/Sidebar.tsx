'use client';

import React, { useState } from 'react';
import {
  ListFilter,
  Globe2,
  FolderTree,
  ArrowUpDown,
  Tags,
  Plus,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  GripVertical,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Search,
} from 'lucide-react';
import type { Watchlist } from '@/lib/types';

interface SidebarProps {
  watchlists: Watchlist[];
  activeWatchlistId: number | null;
  activeView: 'watchlist' | 'universe' | 'classification' | 'import-export' | 'tags';
  isDarkMode: boolean;
  onSelectWatchlist: (id: number) => void;
  onSelectView: (view: 'watchlist' | 'universe' | 'classification' | 'import-export' | 'tags') => void;
  onCreateWatchlist: () => void;
  onEditWatchlist: (wl: Watchlist) => void;
  onDuplicateWatchlist: (wl: Watchlist) => void;
  onDeleteWatchlist: (id: number) => void;
  onReorderWatchlists?: (orderedIds: number[]) => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  watchlists,
  activeWatchlistId,
  activeView,
  isDarkMode,
  onSelectWatchlist,
  onSelectView,
  onCreateWatchlist,
  onEditWatchlist,
  onDuplicateWatchlist,
  onDeleteWatchlist,
  onToggleTheme,
}: SidebarProps) {
  const [watchlistMenuOpen, setWatchlistMenuOpen] = useState<number | null>(null);
  const [watchlistSectionCollapsed, setWatchlistSectionCollapsed] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const filteredWatchlists = watchlists.filter((wl) =>
    wl.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <aside className="w-64 h-screen bg-[#1e222d] border-r border-[#2a2e39] flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#2a2e39] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#2962ff] flex items-center justify-center font-bold text-white text-base shadow-lg shadow-[#2962ff]/20">
            TV
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
              <span>Stock Watchlist</span>
            </div>
            <div className="text-[11px] text-[#787b86]">NSE • BSE Security Master</div>
          </div>
        </div>
      </div>

      {/* Main Navigation Views */}
      <div className="px-3 pt-3 pb-2 space-y-0.5 border-b border-[#2a2e39]">
        <button
          onClick={() => onSelectView('universe')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition ${
            activeView === 'universe'
              ? 'bg-[#2962ff] text-white'
              : 'text-[#d1d4dc] hover:bg-[#2a2e39]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Globe2 className="w-4 h-4" />
            <span>Stock Universe</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-[#787b86] group-hover:text-white">
            2.3k+
          </span>
        </button>

        <button
          onClick={() => onSelectView('classification')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition ${
            activeView === 'classification'
              ? 'bg-[#2962ff] text-white'
              : 'text-[#d1d4dc] hover:bg-[#2a2e39]'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Classification Manager</span>
        </button>

        <button
          onClick={() => onSelectView('import-export')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition ${
            activeView === 'import-export'
              ? 'bg-[#2962ff] text-white'
              : 'text-[#d1d4dc] hover:bg-[#2a2e39]'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>Import & Export CSV</span>
        </button>

        <button
          onClick={() => onSelectView('tags')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition ${
            activeView === 'tags'
              ? 'bg-[#2962ff] text-white'
              : 'text-[#d1d4dc] hover:bg-[#2a2e39]'
          }`}
        >
          <Tags className="w-4 h-4" />
          <span>Custom Tags</span>
        </button>
      </div>

      {/* Watchlist Section Header */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#787b86] uppercase tracking-wider mb-2">
          <button
            onClick={() => setWatchlistSectionCollapsed(!watchlistSectionCollapsed)}
            className="flex items-center gap-1.5 hover:text-[#d1d4dc] transition"
          >
            {watchlistSectionCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            <span>Watchlists ({watchlists.length})</span>
          </button>
          <button
            onClick={onCreateWatchlist}
            title="Create Watchlist"
            className="p-1 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#2962ff] transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Watchlist Search */}
        {!watchlistSectionCollapsed && watchlists.length > 5 && (
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#787b86]" />
            <input
              type="text"
              placeholder="Search watchlists..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#131722] text-[#d1d4dc] text-xs pl-8 pr-2.5 py-1.5 rounded border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
            />
          </div>
        )}
      </div>

      {/* Watchlists List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {!watchlistSectionCollapsed &&
          filteredWatchlists.map((wl) => {
            const isActive = activeView === 'watchlist' && activeWatchlistId === wl.id;
            return (
              <div
                key={wl.id}
                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium cursor-pointer transition ${
                  isActive
                    ? 'bg-[#2a2e39] text-white border-l-2 border-[#2962ff]'
                    : 'text-[#d1d4dc] hover:bg-[#2a2e39]/60'
                }`}
                onClick={() => {
                  onSelectWatchlist(wl.id);
                  onSelectView('watchlist');
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: wl.color || '#3b82f6' }}
                  />
                  <span className="truncate">{wl.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] text-[#787b86] font-mono px-1.5 py-0.5 rounded bg-[#131722]">
                    {wl.stockCount ?? 0}
                  </span>

                  {/* 3-dot menu trigger */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setWatchlistMenuOpen(watchlistMenuOpen === wl.id ? null : wl.id);
                      }}
                      className="p-1 text-[#787b86] hover:text-[#d1d4dc] rounded hover:bg-[#1e222d] opacity-0 group-hover:opacity-100 transition"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Dropdown Menu */}
                    {watchlistMenuOpen === wl.id && (
                      <div
                        className="absolute right-0 top-6 z-50 w-36 bg-[#1e222d] border border-[#2a2e39] rounded-md shadow-xl py-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setWatchlistMenuOpen(null);
                            onEditWatchlist(wl);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#d1d4dc] hover:bg-[#2a2e39]"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#787b86]" />
                          <span>Rename / Color</span>
                        </button>
                        <button
                          onClick={() => {
                            setWatchlistMenuOpen(null);
                            onDuplicateWatchlist(wl);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#d1d4dc] hover:bg-[#2a2e39]"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#787b86]" />
                          <span>Duplicate</span>
                        </button>
                        <div className="my-1 border-t border-[#2a2e39]" />
                        <button
                          onClick={() => {
                            setWatchlistMenuOpen(null);
                            if (confirm(`Delete watchlist "${wl.name}"? Stocks won't be deleted from the database.`)) {
                              onDeleteWatchlist(wl.id);
                            }
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#f23645] hover:bg-[#2a2e39]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Footer / Theme Toggle */}
      <div className="p-3 border-t border-[#2a2e39] flex items-center justify-between text-xs text-[#787b86]">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-[#089981]" />
          <span>Active Session</span>
        </div>

        <button
          onClick={onToggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] transition"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}


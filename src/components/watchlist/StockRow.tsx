'use client';

import React, { useState } from 'react';
import {
  GripVertical,
  ExternalLink,
  MoreVertical,
  MoveRight,
  Copy,
  Trash2,
  FolderInput,
  Info,
  Tag as TagIcon,
} from 'lucide-react';
import type { StockRowItem } from '@/lib/types';

interface StockRowProps {
  stock: StockRowItem;
  isSelected: boolean;
  onToggleSelect: (stockId: number) => void;
  onSelectStockForDetails: (stock: StockRowItem) => void;
  onMoveOpen: (stock: StockRowItem) => void;
  onCopyOpen: (stock: StockRowItem) => void;
  onMoveToSection: (stockId: number, sectionId: number | null) => void;
  onDeleteStock: (stock: StockRowItem) => void;
  visibleColumns: {
    symbol: boolean;
    company: boolean;
    sector: boolean;
    subsector: boolean;
    tags: boolean;
    exchange: boolean;
  };
  dragHandleProps?: Record<string, unknown>;
}

export function StockRow({
  stock,
  isSelected,
  onToggleSelect,
  onSelectStockForDetails,
  onMoveOpen,
  onCopyOpen,
  onMoveToSection,
  onDeleteStock,
  visibleColumns,
  dragHandleProps,
}: StockRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Construct TradingView URL with proper encoding
  // Example: https://www.tradingview.com/chart/?symbol=NSE%3ARELIANCE
  const tvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
    stock.tradingview_symbol
  )}`;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onClick={() => onSelectStockForDetails(stock)}
      className={`group flex items-center px-4 py-2 border-b border-[#2a2e39] text-xs cursor-pointer transition select-none ${
        isSelected
          ? 'bg-[#2962ff]/10 hover:bg-[#2962ff]/15'
          : 'hover:bg-[#1e222d]'
      }`}
    >
      {/* 1. Drag Handle */}
      <div
        {...dragHandleProps}
        onClick={(e) => e.stopPropagation()}
        className="w-6 flex items-center justify-center text-[#787b86] group-hover:text-[#d1d4dc] cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* 2. Selection Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(stock.id);
        }}
        className="w-8 flex items-center justify-center shrink-0"
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}} // handled by parent onClick
          className="rounded accent-[#2962ff] cursor-pointer"
        />
      </div>

      {/* 3. TradingView Symbol */}
      {visibleColumns.symbol && (
        <div className="w-36 flex items-center gap-1.5 shrink-0 pr-2">
          <span className="font-semibold text-white font-mono tracking-tight hover:underline">
            {stock.tradingview_symbol}
          </span>
          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open in TradingView Chart"
            className="text-[#787b86] hover:text-[#2962ff] opacity-0 group-hover:opacity-100 transition p-0.5"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* 4. Company Name */}
      {visibleColumns.company && (
        <div className="flex-1 min-w-[180px] pr-3 flex items-center gap-2 truncate">
          <span className="text-[#d1d4dc] truncate">{stock.company_name}</span>
          {stock.isin && (
            <span className="text-[10px] text-[#787b86] font-mono px-1 py-0.2 rounded bg-[#131722] border border-[#2a2e39] shrink-0 hidden md:inline">
              {stock.isin}
            </span>
          )}
        </div>
      )}

      {/* 5. Sector Label */}
      {visibleColumns.sector && (
        <div className="w-36 shrink-0 pr-2">
          {stock.sector_name ? (
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#2962ff]/15 text-[#60a5fa] border border-[#2962ff]/30 truncate max-w-full">
              {stock.sector_name}
            </span>
          ) : (
            <span className="text-[11px] text-[#787b86] italic">Unclassified</span>
          )}
        </div>
      )}

      {/* 6. Subsector Label */}
      {visibleColumns.subsector && (
        <div className="w-44 shrink-0 pr-2">
          {stock.subsector_name ? (
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#8b5cf6]/15 text-[#c084fc] border border-[#8b5cf6]/30 truncate max-w-full">
              {stock.subsector_name}
            </span>
          ) : (
            <span className="text-[11px] text-[#787b86] italic">—</span>
          )}
        </div>
      )}

      {/* 7. Custom Tags */}
      {visibleColumns.tags && (
        <div className="w-48 shrink-0 pr-2 flex items-center gap-1 overflow-x-hidden">
          {stock.tags && stock.tags.length > 0 ? (
            stock.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white shrink-0 truncate max-w-[80px]"
                style={{ backgroundColor: tag.color || '#6b7280' }}
              >
                {tag.name}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-[#787b86]/60 italic">—</span>
          )}
          {stock.tags && stock.tags.length > 3 && (
            <span className="text-[10px] text-[#787b86] font-mono">
              +{stock.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 8. Exchange */}
      {visibleColumns.exchange && (
        <div className="w-16 shrink-0 text-center pr-2">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
              stock.exchange === 'NSE'
                ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/30'
                : 'bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/30'
            }`}
          >
            {stock.exchange}
          </span>
        </div>
      )}

      {/* 9. Direct Delete & Action Menu */}
      <div className="w-14 shrink-0 relative flex items-center justify-end">
        {/* Direct 1-Click Delete Button (visible on row hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteStock(stock);
          }}
          title="Remove from watchlist"
          className="p-1 text-[#787b86] hover:text-[#f23645] hover:bg-[#f23645]/15 rounded opacity-0 group-hover:opacity-100 transition mr-0.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1 text-[#787b86] hover:text-[#d1d4dc] rounded hover:bg-[#2a2e39] transition"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown / Context Menu */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
            />
            <div
              className={`${
                contextMenuPos ? 'fixed' : 'absolute right-0 top-8'
              } z-50 w-52 bg-[#1e222d] border border-[#2a2e39] rounded-md shadow-2xl py-1 text-xs`}
              style={
                contextMenuPos
                  ? { left: contextMenuPos.x, top: contextMenuPos.y }
                  : undefined
              }
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  window.open(tvUrl, '_blank');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#d1d4dc] hover:bg-[#2a2e39]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#2962ff]" />
                <span>Open TradingView Chart</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onSelectStockForDetails(stock);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#d1d4dc] hover:bg-[#2a2e39]"
              >
                <Info className="w-3.5 h-3.5 text-[#089981]" />
                <span>View Stock Details</span>
              </button>

              <div className="my-1 border-t border-[#2a2e39]" />

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onMoveOpen(stock);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#d1d4dc] hover:bg-[#2a2e39]"
              >
                <MoveRight className="w-3.5 h-3.5 text-[#2962ff]" />
                <span>Move to Watchlist...</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onCopyOpen(stock);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#d1d4dc] hover:bg-[#2a2e39]"
              >
                <Copy className="w-3.5 h-3.5 text-[#089981]" />
                <span>Copy to Watchlist...</span>
              </button>

              <div className="my-1 border-t border-[#2a2e39]" />

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteStock(stock);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#f23645] hover:bg-[#2a2e39]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove from Watchlist</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


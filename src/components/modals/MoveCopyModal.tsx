'use client';

import React, { useState, useEffect } from 'react';
import { X, MoveRight, Copy, Loader2 } from 'lucide-react';
import type { Watchlist, Section, StockRowItem } from '@/lib/types';

interface MoveCopyModalProps {
  isOpen: boolean;
  action: 'move' | 'copy';
  sourceWatchlistId: number;
  stockIds: number[]; // watchlist_stocks IDs (for single or bulk)
  exchangeListingIds?: number[]; // for copy
  stockLabels?: string[]; // for previewing names
  watchlists: Watchlist[];
  onClose: () => void;
  onSuccess: () => void;
}

export function MoveCopyModal({
  isOpen,
  action,
  sourceWatchlistId,
  stockIds,
  exchangeListingIds = [],
  stockLabels = [],
  watchlists,
  onClose,
  onSuccess,
}: MoveCopyModalProps) {
  const [targetWatchlistId, setTargetWatchlistId] = useState<number>(
    watchlists[0]?.id ?? sourceWatchlistId
  );
  const [targetSectionId, setTargetSectionId] = useState<number | null>(null);
  const [availableSections, setAvailableSections] = useState<Section[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update target sections when target watchlist changes
  useEffect(() => {
    const targetWl = watchlists.find((w) => w.id === targetWatchlistId);
    setAvailableSections(targetWl?.sections || []);
    setTargetSectionId(null);
  }, [targetWatchlistId, watchlists]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (action === 'move') {
        if (stockIds.length === 1) {
          // Single stock move
          await fetch('/api/stocks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'move',
              stockId: stockIds[0],
              targetWatchlistId,
              targetSectionId,
              sortOrder: 0,
            }),
          });
        } else {
          // Bulk move
          await fetch('/api/stocks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'bulk_move',
              stockIds,
              targetWatchlistId,
              targetSectionId,
            }),
          });
        }
      } else {
        // Copy action
        if (exchangeListingIds.length > 0) {
          await fetch('/api/stocks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'bulk_copy',
              exchangeListingIds,
              targetWatchlistId,
              targetSectionId,
            }),
          });
        }
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Move/Copy error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMove = action === 'move';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2e39] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMove ? (
              <MoveRight className="w-4 h-4 text-[#2962ff]" />
            ) : (
              <Copy className="w-4 h-4 text-[#089981]" />
            )}
            <h2 className="text-sm font-bold text-white">
              {isMove ? 'Move Stocks' : 'Copy Stocks'} ({stockIds.length} items)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#787b86] hover:text-[#d1d4dc] rounded hover:bg-[#2a2e39]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-[#787b86]">
            {isMove
              ? 'Stocks will be removed from current watchlist and added to destination.'
              : 'Stocks will be duplicated into destination while remaining in current watchlist.'}
          </div>

          {/* Target Watchlist */}
          <div>
            <label className="block text-xs font-semibold text-[#d1d4dc] mb-1.5">
              Destination Watchlist
            </label>
            <select
              value={targetWatchlistId}
              onChange={(e) => setTargetWatchlistId(Number(e.target.value))}
              className="w-full bg-[#131722] text-[#d1d4dc] text-xs px-3 py-2 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
            >
              {watchlists.map((wl) => (
                <option key={wl.id} value={wl.id}>
                  {wl.name} ({wl.stockCount ?? 0} stocks)
                </option>
              ))}
            </select>
          </div>

          {/* Target Section */}
          <div>
            <label className="block text-xs font-semibold text-[#d1d4dc] mb-1.5">
              Destination Section (Optional)
            </label>
            <select
              value={targetSectionId ?? ''}
              onChange={(e) => setTargetSectionId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-[#131722] text-[#d1d4dc] text-xs px-3 py-2 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
            >
              <option value="">Uncategorized</option>
              {availableSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2a2e39]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#787b86] hover:text-[#d1d4dc] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-md ${
                isMove ? 'bg-[#2962ff] hover:bg-[#1e53e5]' : 'bg-[#089981] hover:bg-[#077d69]'
              }`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isMove ? 'Confirm Move' : 'Confirm Copy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


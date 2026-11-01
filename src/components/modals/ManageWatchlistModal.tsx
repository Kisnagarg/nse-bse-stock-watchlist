'use client';

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { Watchlist } from '@/lib/types';

interface ManageWatchlistModalProps {
  isOpen: boolean;
  watchlist?: Watchlist | null; // if null, creating new
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}

const PRESET_COLORS = [
  '#2962ff', // TradingView Blue
  '#089981', // Green
  '#f23645', // Red
  '#ff9800', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export function ManageWatchlistModal({
  isOpen,
  watchlist,
  onClose,
  onSave,
}: ManageWatchlistModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2962ff');

  useEffect(() => {
    if (watchlist) {
      setName(watchlist.name);
      setColor(watchlist.color || '#2962ff');
    } else {
      setName('');
      setColor('#2962ff');
    }
  }, [watchlist, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2e39] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            {watchlist ? 'Edit Watchlist' : 'Create New Watchlist'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#787b86] hover:text-[#d1d4dc] rounded hover:bg-[#2a2e39]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#d1d4dc] mb-1.5">
              Watchlist Name
            </label>
            <input
              type="text"
              placeholder="e.g. Leading, Breakout Candidates, Swing Trades"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-[#131722] text-[#d1d4dc] text-xs px-3 py-2.5 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#d1d4dc] mb-2">
              Color Identifier
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

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
              disabled={!name.trim()}
              className="px-4 py-2 text-xs font-semibold bg-[#2962ff] hover:bg-[#1e53e5] disabled:opacity-50 text-white rounded-lg transition shadow-md"
            >
              {watchlist ? 'Save Changes' : 'Create Watchlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


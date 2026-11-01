'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SectionModalProps {
  isOpen: boolean;
  watchlistId: number;
  sectionId?: number | null; // if provided, renaming
  initialName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SectionModal({
  isOpen,
  watchlistId,
  sectionId,
  initialName = '',
  onClose,
  onSuccess,
}: SectionModalProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(initialName);
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  const isEdit = sectionId !== null && sectionId !== undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await fetch(`/api/sections/${sectionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });
      } else {
        await fetch('/api/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            watchlistId,
            name: name.trim(),
          }),
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Section save error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2e39] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            {isEdit ? 'Rename Section' : 'Create Custom Section'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#787b86] hover:text-[#d1d4dc] rounded hover:bg-[#2a2e39]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#d1d4dc] mb-1.5">
              Section Name
            </label>
            <input
              type="text"
              placeholder="e.g. Near Breakout, Pullback Candidates, Extended"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-[#131722] text-[#d1d4dc] text-xs px-3 py-2.5 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
            />
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
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-xs font-semibold bg-[#2962ff] hover:bg-[#1e53e5] disabled:opacity-50 text-white rounded-lg transition shadow-md"
            >
              {isEdit ? 'Rename' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


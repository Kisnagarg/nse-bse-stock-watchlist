'use client';

import React, { useState } from 'react';
import { Tags, Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';
import type { Tag } from '@/lib/types';

interface TagManagerViewProps {
  tags: Tag[];
  onRefreshTags: () => void;
}

const PRESET_TAG_COLORS = [
  '#8b5cf6', // Purple (VCP)
  '#22c55e', // Green (Breakout)
  '#f59e0b', // Amber (Pullback)
  '#3b82f6', // Blue (Momentum)
  '#6b7280', // Gray (Consolidation)
  '#ec4899', // Pink (Earnings)
  '#ef4444', // Red (Reversal)
  '#06b6d4', // Cyan
];

export function TagManagerView({ tags, onRefreshTags }: TagManagerViewProps) {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#8b5cf6');
  const [isCreating, setIsCreating] = useState(false);

  // Edit tag state
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      if (res.ok) {
        setNewTagName('');
        onRefreshTags();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create tag');
      }
    } catch (err) {
      console.error('Create tag error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateTag = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      if (res.ok) {
        setEditingTagId(null);
        onRefreshTags();
      }
    } catch (err) {
      console.error('Update tag error:', err);
    }
  };

  const handleDeleteTag = async (id: number, name: string) => {
    if (!confirm(`Delete tag "${name}"? It will be removed from all companies.`)) return;
    try {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefreshTags();
      }
    } catch (err) {
      console.error('Delete tag error:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#131722] text-[#d1d4dc] select-none">
      {/* Header */}
      <div className="px-6 py-4 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#ec4899]/10 text-[#ec4899]">
            <Tags className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Custom Tags Manager</h1>
            <div className="text-[11px] text-[#787b86]">
              Create and manage reusable tags across all Indian equities (VCP, Breakout, Momentum, etc.)
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Create Tag Box */}
        <div className="bg-[#1e222d] p-6 rounded-xl border border-[#2a2e39] shadow-sm">
          <h2 className="text-sm font-bold text-white mb-3">Create New Custom Tag</h2>
          <form onSubmit={handleCreateTag} className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="e.g. VCP, Bullish Flag, High RS, Stage 2"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-1 min-w-[200px] bg-[#131722] text-[#d1d4dc] text-xs px-3 py-2 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#ec4899]"
            />

            {/* Color preset buttons */}
            <div className="flex items-center gap-1.5 bg-[#131722] p-1 rounded-lg border border-[#2a2e39]">
              {PRESET_TAG_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  className="w-5 h-5 rounded-full transition transform hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: c }}
                >
                  {newTagColor === c && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isCreating || !newTagName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#ec4899] hover:bg-[#db2777] disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition shadow-md"
            >
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Create Tag</span>
            </button>
          </form>
        </div>

        {/* Existing Tags Grid */}
        <div className="bg-[#1e222d] rounded-xl border border-[#2a2e39] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[#2a2e39] font-bold text-white text-sm">
            Active Tags ({tags.length})
          </div>

          <div className="divide-y divide-[#2a2e39]">
            {tags.map((tag) => {
              const isEditing = editingTagId === tag.id;

              return (
                <div
                  key={tag.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 text-xs hover:bg-[#2a2e39]/30 transition"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-[#131722] text-[#d1d4dc] px-3 py-1.5 rounded border border-[#2a2e39] text-xs focus:outline-none"
                      />
                      <div className="flex items-center gap-1">
                        {PRESET_TAG_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => handleUpdateTag(tag.id)}
                        className="p-1.5 bg-[#089981] text-white rounded hover:bg-[#077d69]"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingTagId(null)}
                        className="p-1.5 text-[#787b86] hover:text-[#d1d4dc]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-xs"
                        style={{ backgroundColor: tag.color || '#6b7280' }}
                      >
                        {tag.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        onClick={() => {
                          setEditingTagId(tag.id);
                          setEditName(tag.name);
                          setEditColor(tag.color || '#6b7280');
                        }}
                        className="p-1.5 text-[#787b86] hover:text-[#d1d4dc] rounded hover:bg-[#2a2e39]"
                        title="Edit Tag"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteTag(tag.id, tag.name)}
                      className="p-1.5 text-[#787b86] hover:text-[#f23645] rounded hover:bg-[#2a2e39]"
                      title="Delete Tag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


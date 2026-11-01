'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Edit2,
  Trash2,
  Plus,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Section, StockRowItem } from '@/lib/types';
import { StockRow } from './StockRow';

interface SectionContainerProps {
  section: Section | null; // null for Uncategorized
  stocks: StockRowItem[];
  selectedStockIds: number[];
  onToggleSelect: (stockId: number) => void;
  onSelectStockForDetails: (stock: StockRowItem) => void;
  onMoveOpen: (stock: StockRowItem) => void;
  onCopyOpen: (stock: StockRowItem) => void;
  onMoveToSection: (stockId: number, sectionId: number | null) => void;
  onDeleteStock: (stock: StockRowItem) => void;
  onRenameSection?: (sectionId: number, currentName: string) => void;
  onDeleteSection?: (sectionId: number) => void;
  onOpenAddModal?: () => void;
  visibleColumns: {
    symbol: boolean;
    company: boolean;
    sector: boolean;
    subsector: boolean;
    tags: boolean;
    exchange: boolean;
  };
  isSortableSection?: boolean;
}

// Wrapper for Sortable Stock Row
function SortableStockItem({
  stock,
  ...props
}: {
  stock: StockRowItem;
  [key: string]: unknown;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `stock-${stock.id}`,
    data: {
      type: 'stock',
      stock,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StockRow
        stock={stock}
        dragHandleProps={{ ...attributes, ...listeners }}
        {...(props as any)}
      />
    </div>
  );
}

export function SectionContainer({
  section,
  stocks,
  selectedStockIds,
  onToggleSelect,
  onSelectStockForDetails,
  onMoveOpen,
  onCopyOpen,
  onMoveToSection,
  onDeleteStock,
  onRenameSection,
  onDeleteSection,
  onOpenAddModal,
  visibleColumns,
  isSortableSection = true,
}: SectionContainerProps) {
  const [isCollapsed, setIsCollapsed] = useState(section?.isCollapsed ?? false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isUncategorized = section === null;
  const sectionId = section?.id ?? 'uncategorized';
  const sectionName = section?.name ?? 'Uncategorized';

  return (
    <div className="mb-4 bg-[#131722] rounded-lg border border-[#2a2e39] overflow-hidden shadow-sm">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e222d] border-b border-[#2a2e39] select-none">
        <div className="flex items-center gap-2">
          {/* Collapse/Expand button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-[#787b86] hover:text-[#d1d4dc] transition p-0.5 rounded hover:bg-[#2a2e39]"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <span className="text-xs font-bold text-white tracking-wide uppercase">
            {sectionName}
          </span>

          <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-[#131722] text-[#787b86] border border-[#2a2e39]">
            {stocks.length}
          </span>
        </div>

        {/* Section Actions */}
        <div className="flex items-center gap-1">
          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              title="Add stock to this section"
              className="p-1 text-[#787b86] hover:text-[#2962ff] rounded hover:bg-[#2a2e39] transition text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Add</span>
            </button>
          )}

          {!isUncategorized && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 text-[#787b86] hover:text-[#d1d4dc] rounded hover:bg-[#2a2e39] transition"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-6 z-40 w-36 bg-[#1e222d] border border-[#2a2e39] rounded-md shadow-xl py-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  {onRenameSection && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onRenameSection(section.id, section.name);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#d1d4dc] hover:bg-[#2a2e39]"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#787b86]" />
                      <span>Rename Section</span>
                    </button>
                  )}

                  {onDeleteSection && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        if (
                          confirm(
                            `Delete section "${section.name}"? Stocks will be moved to Uncategorized.`
                          )
                        ) {
                          onDeleteSection(section.id);
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#f23645] hover:bg-[#2a2e39]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Section</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stock Table Content (if not collapsed) */}
      {!isCollapsed && (
        <div>
          {stocks.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#787b86]">
              No stocks in this section.{' '}
              {onOpenAddModal && (
                <button
                  onClick={onOpenAddModal}
                  className="text-[#2962ff] hover:underline font-medium"
                >
                  Add a stock
                </button>
              )}
            </div>
          ) : (
            <SortableContext
              items={stocks.map((s) => `stock-${s.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-[#2a2e39]">
                {stocks.map((stock) => (
                  <SortableStockItem
                    key={stock.id}
                    stock={stock}
                    isSelected={selectedStockIds.includes(stock.id)}
                    onToggleSelect={onToggleSelect}
                    onSelectStockForDetails={onSelectStockForDetails}
                    onMoveOpen={onMoveOpen}
                    onCopyOpen={onCopyOpen}
                    onMoveToSection={onMoveToSection}
                    onDeleteStock={onDeleteStock}
                    visibleColumns={visibleColumns}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}


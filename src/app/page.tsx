'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import type {
  Watchlist,
  Section,
  StockRowItem,
  Sector,
  Tag,
} from '@/lib/types';

import { Sidebar } from '@/components/layout/Sidebar';
import { WatchlistHeader } from '@/components/watchlist/WatchlistHeader';
import { WatchlistToolbar } from '@/components/watchlist/WatchlistToolbar';
import { TableHeader } from '@/components/watchlist/TableHeader';
import { SectionContainer } from '@/components/watchlist/SectionContainer';
import { StockDetailsPanel } from '@/components/panels/StockDetailsPanel';
import { AddStocksModal } from '@/components/modals/AddStocksModal';
import { ManageWatchlistModal } from '@/components/modals/ManageWatchlistModal';
import { MoveCopyModal } from '@/components/modals/MoveCopyModal';
import { SectionModal } from '@/components/modals/SectionModal';
import { StockUniverseView } from '@/components/views/StockUniverseView';
import { ClassificationManagerView } from '@/components/views/ClassificationManagerView';
import { ImportExportView } from '@/components/views/ImportExportView';
import { TagManagerView } from '@/components/views/TagManagerView';
import { ToastContainer, ToastMessage } from '@/components/common/Toast';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Active view state
  const [activeView, setActiveView] = useState<
    'watchlist' | 'universe' | 'classification' | 'import-export' | 'tags'
  >('watchlist');

  // Core Data
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const [stocks, setStocks] = useState<StockRowItem[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);

  // Multi-selection & active details panel
  const [selectedStockIds, setSelectedStockIds] = useState<number[]>([]);
  const [activeStockForDetails, setActiveStockForDetails] = useState<StockRowItem | null>(null);

  // In-watchlist toolbar filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<'ALL' | 'NSE' | 'BSE'>('ALL');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedSubsector, setSelectedSubsector] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<string>('manual');
  const [sortAsc, setSortAsc] = useState(true);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    symbol: true,
    company: true,
    sector: true,
    subsector: true,
    tags: true,
    exchange: true,
  });

  // Toasts & Undo
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'search' | 'paste' | 'csv'>('search');

  const [manageWatchlistModalOpen, setManageWatchlistModalOpen] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<Watchlist | null>(null);

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  const [moveCopyModalOpen, setMoveCopyModalOpen] = useState(false);
  const [moveCopyAction, setMoveCopyAction] = useState<'move' | 'copy'>('move');
  const [targetStockIds, setTargetStockIds] = useState<number[]>([]);
  const [targetListingIds, setTargetListingIds] = useState<number[]>([]);

  // Dragging state
  const [activeDragItem, setActiveDragItem] = useState<StockRowItem | null>(null);

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add toast helper
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch initial system data
  const refreshWatchlists = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlists');
      if (res.ok) {
        const data: Watchlist[] = await res.json();
        setWatchlists(data);
        if (data.length > 0 && activeWatchlistId === null) {
          setActiveWatchlistId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching watchlists:', err);
    }
  }, [activeWatchlistId]);

  const refreshSectors = useCallback(async () => {
    try {
      const res = await fetch('/api/sectors');
      if (res.ok) {
        setSectors(await res.json());
      }
    } catch (err) {
      console.error('Error fetching sectors:', err);
    }
  }, []);

  const refreshTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        setTags(await res.json());
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  }, []);

  // Fetch active watchlist stocks
  const refreshStocks = useCallback(async () => {
    if (!activeWatchlistId) return;
    setLoadingStocks(true);
    try {
      const res = await fetch(`/api/watchlists/${activeWatchlistId}`);
      if (res.ok) {
        const data: StockRowItem[] = await res.json();
        setStocks(data);
      }
    } catch (err) {
      console.error('Error fetching stocks:', err);
    } finally {
      setLoadingStocks(false);
    }
  }, [activeWatchlistId]);

  useEffect(() => {
    refreshWatchlists();
    refreshSectors();
    refreshTags();
  }, [refreshWatchlists, refreshSectors, refreshTags]);

  useEffect(() => {
    if (activeWatchlistId) {
      refreshStocks();
      setSelectedStockIds([]);
    }
  }, [activeWatchlistId, refreshStocks]);

  // Current active watchlist object
  const activeWatchlist = useMemo(() => {
    return watchlists.find((w) => w.id === activeWatchlistId) || null;
  }, [watchlists, activeWatchlistId]);

  // Filter & Sort stocks
  const filteredAndSortedStocks = useMemo(() => {
    let result = [...stocks];

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.trading_symbol.toLowerCase().includes(q) ||
          s.tradingview_symbol.toLowerCase().includes(q) ||
          s.company_name.toLowerCase().includes(q) ||
          (s.isin && s.isin.toLowerCase().includes(q)) ||
          (s.security_code && s.security_code.toLowerCase().includes(q)) ||
          (s.sector_name && s.sector_name.toLowerCase().includes(q)) ||
          (s.subsector_name && s.subsector_name.toLowerCase().includes(q)) ||
          (s.tags && s.tags.some((t) => t.name.toLowerCase().includes(q)))
      );
    }

    // Filter by Exchange
    if (selectedExchange !== 'ALL') {
      result = result.filter((s) => s.exchange === selectedExchange);
    }

    // Filter by Sector
    if (selectedSector) {
      result = result.filter((s) => s.sector_name === selectedSector);
    }

    // Filter by Subsector
    if (selectedSubsector) {
      result = result.filter((s) => s.subsector_name === selectedSubsector);
    }

    // Filter by Tag
    if (selectedTagId !== null) {
      result = result.filter((s) => s.tags?.some((t) => t.id === selectedTagId));
    }

    // Sort
    if (sortField !== 'manual') {
      result.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortField === 'symbol') {
          valA = a.trading_symbol;
          valB = b.trading_symbol;
        } else if (sortField === 'company') {
          valA = a.company_name;
          valB = b.company_name;
        } else if (sortField === 'sector') {
          valA = a.sector_name || '';
          valB = b.sector_name || '';
        } else if (sortField === 'subsector') {
          valA = a.subsector_name || '';
          valB = b.subsector_name || '';
        } else if (sortField === 'exchange') {
          valA = a.exchange;
          valB = b.exchange;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    stocks,
    searchQuery,
    selectedExchange,
    selectedSector,
    selectedSubsector,
    selectedTagId,
    sortField,
    sortAsc,
  ]);

  // Group filtered stocks by section
  const { categorizedSections, uncategorizedStocks } = useMemo(() => {
    const sectionsList = activeWatchlist?.sections || [];
    const sectionMap = new Map<number, StockRowItem[]>();

    for (const sec of sectionsList) {
      sectionMap.set(sec.id, []);
    }

    const uncat: StockRowItem[] = [];

    for (const stock of filteredAndSortedStocks) {
      if (stock.section_id && sectionMap.has(stock.section_id)) {
        sectionMap.get(stock.section_id)!.push(stock);
      } else {
        uncat.push(stock);
      }
    }

    const categorized = sectionsList.map((sec) => ({
      section: sec,
      stocks: sectionMap.get(sec.id) || [],
    }));

    return { categorizedSections: categorized, uncategorizedStocks: uncat };
  }, [activeWatchlist, filteredAndSortedStocks]);

  // Handle Sort Toggle
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortField('manual');
        setSortAsc(true);
      }
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Toggle single stock selection
  const handleToggleSelect = (stockId: number) => {
    setSelectedStockIds((prev) =>
      prev.includes(stockId) ? prev.filter((id) => id !== stockId) : [...prev, stockId]
    );
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    if (selectedStockIds.length === filteredAndSortedStocks.length) {
      setSelectedStockIds([]);
    } else {
      setSelectedStockIds(filteredAndSortedStocks.map((s) => s.id));
    }
  };

  // Clear filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedExchange('ALL');
    setSelectedSector('');
    setSelectedSubsector('');
    setSelectedTagId(null);
  };

  // ─── Drag & Drop Handlers ─────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = String(active.id);
    if (activeIdStr.startsWith('stock-')) {
      const stockId = Number(activeIdStr.replace('stock-', ''));
      const stock = stocks.find((s) => s.id === stockId);
      if (stock) {
        setActiveDragItem(stock);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over || active.id === over.id) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Stock reordering
    if (activeIdStr.startsWith('stock-') && overIdStr.startsWith('stock-')) {
      const activeStockId = Number(activeIdStr.replace('stock-', ''));
      const overStockId = Number(overIdStr.replace('stock-', ''));

      const activeIndex = stocks.findIndex((s) => s.id === activeStockId);
      const overIndex = stocks.findIndex((s) => s.id === overStockId);

      if (activeIndex !== -1 && overIndex !== -1) {
        const movedStock = stocks[activeIndex];
        const targetStock = stocks[overIndex];

        // Capture previous state for Undo
        const prevStocks = [...stocks];

        // Optimistically update local array
        const newStocks = arrayMove(stocks, activeIndex, overIndex);
        const targetSectionId = targetStock.section_id;
        newStocks[overIndex] = { ...newStocks[overIndex], section_id: targetSectionId };

        setStocks(newStocks);

        // Persist to database
        const reorderItems = newStocks.map((s, idx) => ({
          id: s.id,
          sortOrder: idx,
          sectionId: s.section_id,
        }));

        try {
          await fetch('/api/stocks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reorder', items: reorderItems }),
          });

          addToast({
            type: 'info',
            message: `Moved ${movedStock.tradingview_symbol}`,
            onUndo: async () => {
              setStocks(prevStocks);
              const restoreItems = prevStocks.map((s, idx) => ({
                id: s.id,
                sortOrder: idx,
                sectionId: s.section_id,
              }));
              await fetch('/api/stocks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reorder', items: restoreItems }),
              });
            },
          });
        } catch (err) {
          console.error('Reorder error:', err);
          setStocks(prevStocks);
        }
      }
    }
  };

  // ─── Stock Operations ──────────────────────────────────────────────────

  const handleDeleteStock = async (stock: StockRowItem) => {
    if (!activeWatchlistId) return;

    const prevStock = stock;
    setStocks((prev) => prev.filter((s) => s.id !== stock.id));

    try {
      await fetch('/api/stocks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlistId: activeWatchlistId,
          exchangeListingId: stock.exchange_listing_id,
        }),
      });

      refreshWatchlists();

      addToast({
        type: 'info',
        message: `Removed ${stock.tradingview_symbol} from watchlist`,
        onUndo: async () => {
          await fetch('/api/stocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              watchlistId: activeWatchlistId,
              exchangeListingId: prevStock.exchange_listing_id,
              sectionId: prevStock.section_id,
            }),
          });
          refreshStocks();
          refreshWatchlists();
        },
      });
    } catch (err) {
      console.error('Delete error:', err);
      refreshStocks();
    }
  };

  const handleBulkDelete = async () => {
    if (!activeWatchlistId || selectedStockIds.length === 0) return;
    if (
      !confirm(
        `Remove ${selectedStockIds.length} selected stocks from "${activeWatchlist?.name}"?`
      )
    ) {
      return;
    }

    const stocksToRemove = stocks.filter((s) => selectedStockIds.includes(s.id));
    setStocks((prev) => prev.filter((s) => !selectedStockIds.includes(s.id)));
    setSelectedStockIds([]);

    for (const s of stocksToRemove) {
      await fetch('/api/stocks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlistId: activeWatchlistId,
          exchangeListingId: s.exchange_listing_id,
        }),
      });
    }

    refreshWatchlists();
    addToast({
      type: 'info',
      message: `Removed ${stocksToRemove.length} stocks from watchlist`,
    });
  };

  const handleOpenMoveSingle = (stock: StockRowItem) => {
    setTargetStockIds([stock.id]);
    setTargetListingIds([stock.exchange_listing_id]);
    setMoveCopyAction('move');
    setMoveCopyModalOpen(true);
  };

  const handleOpenCopySingle = (stock: StockRowItem) => {
    setTargetStockIds([stock.id]);
    setTargetListingIds([stock.exchange_listing_id]);
    setMoveCopyAction('copy');
    setMoveCopyModalOpen(true);
  };

  const handleOpenBulkMove = () => {
    const selected = stocks.filter((s) => selectedStockIds.includes(s.id));
    setTargetStockIds(selected.map((s) => s.id));
    setTargetListingIds(selected.map((s) => s.exchange_listing_id));
    setMoveCopyAction('move');
    setMoveCopyModalOpen(true);
  };

  const handleOpenBulkCopy = () => {
    const selected = stocks.filter((s) => selectedStockIds.includes(s.id));
    setTargetStockIds(selected.map((s) => s.id));
    setTargetListingIds(selected.map((s) => s.exchange_listing_id));
    setMoveCopyAction('copy');
    setMoveCopyModalOpen(true);
  };

  const handleSaveWatchlist = async (name: string, color: string) => {
    if (editingWatchlist) {
      await fetch(`/api/watchlists/${editingWatchlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });
    } else {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });
      if (res.ok) {
        const newWl = await res.json();
        setActiveWatchlistId(newWl.id);
        setActiveView('watchlist');
      }
    }
    refreshWatchlists();
  };

  const handleDuplicateWatchlist = async (wl: Watchlist) => {
    const newName = `${wl.name} (Copy)`;
    const res = await fetch(`/api/watchlists/${wl.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      const duplicated = await res.json();
      refreshWatchlists();
      setActiveWatchlistId(duplicated.id);
      addToast({ type: 'success', message: `Duplicated watchlist to "${newName}"` });
    }
  };

  const handleDeleteWatchlist = async (id: number) => {
    await fetch(`/api/watchlists/${id}`, { method: 'DELETE' });
    refreshWatchlists();
    if (activeWatchlistId === id) {
      const remaining = watchlists.filter((w) => w.id !== id);
      setActiveWatchlistId(remaining.length > 0 ? remaining[0].id : null);
    }
    addToast({ type: 'info', message: 'Watchlist deleted' });
  };

  const handleDeleteSection = async (sectionId: number) => {
    await fetch(`/api/sections/${sectionId}`, { method: 'DELETE' });
    refreshStocks();
    refreshWatchlists();
    addToast({ type: 'info', message: 'Section removed. Stocks moved to Uncategorized.' });
  };

  const handleToggleColumn = (col: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  return (
    <div className={`${isDarkMode ? 'dark' : 'light'} flex h-screen w-screen overflow-hidden bg-[#131722]`}>
      {/* 1. Left Sidebar */}
      <Sidebar
        watchlists={watchlists}
        activeWatchlistId={activeWatchlistId}
        activeView={activeView}
        isDarkMode={isDarkMode}
        onSelectWatchlist={(id) => {
          setActiveWatchlistId(id);
          setActiveView('watchlist');
        }}
        onSelectView={(view) => setActiveView(view)}
        onCreateWatchlist={() => {
          setEditingWatchlist(null);
          setManageWatchlistModalOpen(true);
        }}
        onEditWatchlist={(wl) => {
          setEditingWatchlist(wl);
          setManageWatchlistModalOpen(true);
        }}
        onDuplicateWatchlist={handleDuplicateWatchlist}
        onDeleteWatchlist={handleDeleteWatchlist}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {/* 2. Main Content Center */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#131722] min-w-0">
        {/* VIEW 1: Watchlist View */}
        {activeView === 'watchlist' && (
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <WatchlistHeader
              watchlist={activeWatchlist}
              stockCount={stocks.length}
              onOpenAddModal={(tab) => {
                setAddModalTab(tab);
                setAddModalOpen(true);
              }}
              onOpenAddSectionModal={() => {
                setEditingSectionId(null);
                setEditingSectionName('');
                setSectionModalOpen(true);
              }}
              onDuplicateWatchlist={() => {
                if (activeWatchlist) handleDuplicateWatchlist(activeWatchlist);
              }}
              onExportWatchlist={() => {
                if (activeWatchlist) {
                  const blob = new Blob(
                    [
                      JSON.stringify(
                        { watchlist: activeWatchlist, stocks },
                        null,
                        2
                      ),
                    ],
                    { type: 'application/json' }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${activeWatchlist.name}_watchlist.json`;
                  a.click();
                }
              }}
            />

            {/* Toolbar */}
            <WatchlistToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedExchange={selectedExchange}
              onExchangeChange={setSelectedExchange}
              selectedSector={selectedSector}
              onSectorChange={setSelectedSector}
              selectedSubsector={selectedSubsector}
              onSubsectorChange={setSelectedSubsector}
              selectedTagId={selectedTagId}
              onTagChange={setSelectedTagId}
              sectors={sectors}
              tags={tags}
              onResetFilters={handleResetFilters}
              hasActiveFilters={
                Boolean(searchQuery || selectedExchange !== 'ALL' || selectedSector || selectedSubsector || selectedTagId)
              }
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
              selectedStockIds={selectedStockIds}
              onClearSelection={() => setSelectedStockIds([])}
              onBulkMoveOpen={handleOpenBulkMove}
              onBulkCopyOpen={handleOpenBulkCopy}
              onBulkDelete={handleBulkDelete}
            />

            {/* Table Column Headers */}
            <TableHeader
              isAllSelected={
                filteredAndSortedStocks.length > 0 &&
                selectedStockIds.length === filteredAndSortedStocks.length
              }
              onToggleSelectAll={handleToggleSelectAll}
              sortField={sortField}
              sortAsc={sortAsc}
              onSort={handleSort}
              visibleColumns={visibleColumns}
            />

            {/* Watchlist Body / Sections Container */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingStocks ? (
                <div className="py-24 text-center text-xs text-[#787b86]">
                  Loading watchlist stocks...
                </div>
              ) : stocks.length === 0 ? (
                <div className="py-24 text-center text-xs text-[#787b86]">
                  Watchlist is empty.{' '}
                  <button
                    onClick={() => {
                      setAddModalTab('search');
                      setAddModalOpen(true);
                    }}
                    className="text-[#2962ff] hover:underline font-semibold"
                  >
                    Add some stocks
                  </button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  {/* Categorized Custom Sections */}
                  {categorizedSections.map(({ section, stocks: secStocks }) => (
                    <SectionContainer
                      key={section.id}
                      section={section}
                      stocks={secStocks}
                      selectedStockIds={selectedStockIds}
                      onToggleSelect={handleToggleSelect}
                      onSelectStockForDetails={setActiveStockForDetails}
                      onMoveOpen={handleOpenMoveSingle}
                      onCopyOpen={handleOpenCopySingle}
                      onMoveToSection={(stockId, secId) => {}}
                      onDeleteStock={handleDeleteStock}
                      onRenameSection={(id, name) => {
                        setEditingSectionId(id);
                        setEditingSectionName(name);
                        setSectionModalOpen(true);
                      }}
                      onDeleteSection={handleDeleteSection}
                      onOpenAddModal={() => {
                        setAddModalTab('search');
                        setAddModalOpen(true);
                      }}
                      visibleColumns={visibleColumns}
                    />
                  ))}

                  {/* Uncategorized Section */}
                  {uncategorizedStocks.length > 0 && (
                    <SectionContainer
                      section={null}
                      stocks={uncategorizedStocks}
                      selectedStockIds={selectedStockIds}
                      onToggleSelect={handleToggleSelect}
                      onSelectStockForDetails={setActiveStockForDetails}
                      onMoveOpen={handleOpenMoveSingle}
                      onCopyOpen={handleOpenCopySingle}
                      onMoveToSection={(stockId, secId) => {}}
                      onDeleteStock={handleDeleteStock}
                      visibleColumns={visibleColumns}
                    />
                  )}

                  {/* Drag Overlay Ghost */}
                  <DragOverlay>
                    {activeDragItem ? (
                      <div className="bg-[#1e222d] border border-[#2962ff] rounded shadow-2xl opacity-90 p-2 text-xs font-mono font-bold text-white flex items-center gap-2">
                        <span>{activeDragItem.tradingview_symbol}</span>
                        <span className="text-[#787b86] text-[11px] font-sans">
                          {activeDragItem.company_name}
                        </span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: Stock Universe */}
        {activeView === 'universe' && (
          <StockUniverseView
            sectors={sectors}
            watchlists={watchlists}
            onOpenStockDetails={setActiveStockForDetails}
            onStockAddedToWatchlist={() => {
              refreshWatchlists();
              refreshStocks();
            }}
          />
        )}

        {/* VIEW 3: Classification Manager */}
        {activeView === 'classification' && (
          <ClassificationManagerView
            sectors={sectors}
            onOpenStockDetails={setActiveStockForDetails}
            onRefreshData={() => {
              refreshSectors();
              refreshStocks();
            }}
          />
        )}

        {/* VIEW 4: Import / Export Hub */}
        {activeView === 'import-export' && (
          <ImportExportView
            watchlists={watchlists}
            onDataChanged={() => {
              refreshWatchlists();
              refreshStocks();
              refreshSectors();
            }}
          />
        )}

        {/* VIEW 5: Custom Tags Manager */}
        {activeView === 'tags' && (
          <TagManagerView
            tags={tags}
            onRefreshTags={() => {
              refreshTags();
              refreshStocks();
            }}
          />
        )}
      </main>

      {/* 3. Right Slide-out Details Panel */}
      {activeStockForDetails && (
        <StockDetailsPanel
          stock={activeStockForDetails}
          sectors={sectors}
          allTags={tags}
          onClose={() => setActiveStockForDetails(null)}
          onStockUpdated={() => {
            refreshStocks();
            refreshTags();
          }}
        />
      )}

      {/* 4. Modals */}
      {/* Add Stocks Modal */}
      {activeWatchlistId && (
        <AddStocksModal
          isOpen={addModalOpen}
          initialTab={addModalTab}
          watchlistId={activeWatchlistId}
          sections={activeWatchlist?.sections || []}
          onClose={() => setAddModalOpen(false)}
          onAddSuccess={() => {
            refreshStocks();
            refreshWatchlists();
            addToast({ type: 'success', message: 'Stocks added successfully' });
          }}
        />
      )}

      {/* Manage Watchlist Modal */}
      <ManageWatchlistModal
        isOpen={manageWatchlistModalOpen}
        watchlist={editingWatchlist}
        onClose={() => setManageWatchlistModalOpen(false)}
        onSave={handleSaveWatchlist}
      />

      {/* Move / Copy Modal */}
      {activeWatchlistId && (
        <MoveCopyModal
          isOpen={moveCopyModalOpen}
          action={moveCopyAction}
          sourceWatchlistId={activeWatchlistId}
          stockIds={targetStockIds}
          exchangeListingIds={targetListingIds}
          watchlists={watchlists}
          onClose={() => setMoveCopyModalOpen(false)}
          onSuccess={() => {
            refreshStocks();
            refreshWatchlists();
            setSelectedStockIds([]);
            addToast({
              type: 'success',
              message: `Successfully ${moveCopyAction === 'move' ? 'moved' : 'copied'} stocks`,
            });
          }}
        />
      )}

      {/* Section Modal */}
      {activeWatchlistId && (
        <SectionModal
          isOpen={sectionModalOpen}
          watchlistId={activeWatchlistId}
          sectionId={editingSectionId}
          initialName={editingSectionName}
          onClose={() => setSectionModalOpen(false)}
          onSuccess={() => {
            refreshWatchlists();
            refreshStocks();
            addToast({
              type: 'success',
              message: `Section ${editingSectionId ? 'renamed' : 'created'} successfully`,
            });
          }}
        />
      )}

      {/* 5. Toast / Undo Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

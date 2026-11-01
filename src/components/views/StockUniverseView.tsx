'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe2,
  Search,
  Filter,
  Plus,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  RotateCcw,
} from 'lucide-react';
import type { Sector, Watchlist, StockRowItem } from '@/lib/types';

interface StockUniverseViewProps {
  sectors: Sector[];
  watchlists: Watchlist[];
  onOpenStockDetails: (stock: StockRowItem) => void;
  onStockAddedToWatchlist: () => void;
}

export function StockUniverseView({
  sectors,
  watchlists,
  onOpenStockDetails,
  onStockAddedToWatchlist,
}: StockUniverseViewProps) {
  const [query, setQuery] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<'ALL' | 'NSE' | 'BSE'>('ALL');
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [selectedSubsectorId, setSelectedSubsectorId] = useState<number | null>(null);
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | 'CLASSIFIED' | 'UNCLASSIFIED'>('ALL');

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [results, setResults] = useState<Array<any>>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState<{
    totalCompanies: number;
    nseListings: number;
    bseListings: number;
    classified: number;
    unclassified: number;
    sectors: number;
  } | null>(null);

  // Quick Add popup state
  const [addingListingId, setAddingListingId] = useState<number | null>(null);
  const [targetWatchlistId, setTargetWatchlistId] = useState<number>(watchlists[0]?.id ?? 0);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  // Fetch universe stats
  useEffect(() => {
    fetch('/api/universe')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error('Stats error:', err));
  }, []);

  // Fetch stocks based on filters and pagination
  useEffect(() => {
    const fetchStocks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set('query', query);
        if (selectedExchange !== 'ALL') params.set('exchange', selectedExchange);
        if (selectedSectorId) params.set('sectorId', selectedSectorId.toString());
        if (selectedSubsectorId) params.set('subsectorId', selectedSubsectorId.toString());
        if (classificationFilter === 'CLASSIFIED') params.set('classified', 'true');
        if (classificationFilter === 'UNCLASSIFIED') params.set('classified', 'false');
        params.set('page', page.toString());
        params.set('limit', limit.toString());

        const res = await fetch(`/api/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error('Fetch stocks error:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchStocks, 200);
    return () => clearTimeout(timer);
  }, [query, selectedExchange, selectedSectorId, selectedSubsectorId, classificationFilter, page, limit]);

  // Handle Quick Add to Watchlist
  const handleQuickAdd = async (listingId: number) => {
    if (!targetWatchlistId) return;
    try {
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlistId: targetWatchlistId,
          exchangeListingId: listingId,
        }),
      });
      if (res.ok) {
        setAddedMessage(`Added to ${watchlists.find((w) => w.id === targetWatchlistId)?.name}`);
        setTimeout(() => setAddedMessage(null), 2500);
        setAddingListingId(null);
        onStockAddedToWatchlist();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add stock');
      }
    } catch (err) {
      console.error('Add error:', err);
    }
  };

  const activeSector = sectors.find((s) => s.id === selectedSectorId);
  const availableSubsectors = activeSector?.subsectors || [];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#131722] text-[#d1d4dc] select-none">
      {/* Header */}
      <div className="px-6 py-4 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#2962ff]/10 text-[#2962ff]">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Master Stock Universe</h1>
            <div className="text-[11px] text-[#787b86]">
              Complete NSE & BSE Equities Master Database with ISIN & Classification Tracking
            </div>
          </div>
        </div>

        {/* Quick Stats Badges */}
        {stats && (
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39]">
              <span className="text-[#787b86]">Total Companies: </span>
              <span className="font-bold text-white font-mono">{stats.totalCompanies}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39]">
              <span className="text-[#089981] font-semibold">NSE: </span>
              <span className="font-bold text-white font-mono">{stats.nseListings}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39]">
              <span className="text-[#ff9800] font-semibold">BSE: </span>
              <span className="font-bold text-white font-mono">{stats.bseListings}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39]">
              <span className="text-[#2962ff] font-semibold">Classified: </span>
              <span className="font-bold text-white font-mono">{stats.classified}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="px-6 py-3 bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#787b86]" />
            <input
              type="text"
              placeholder="Search symbol, code, company, or ISIN..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#1e222d] text-[#d1d4dc] text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
            />
          </div>

          {/* Exchange Filter */}
          <div className="flex items-center bg-[#1e222d] p-0.5 rounded border border-[#2a2e39]">
            {(['ALL', 'NSE', 'BSE'] as const).map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setSelectedExchange(ex);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
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
            value={selectedSectorId ?? ''}
            onChange={(e) => {
              setSelectedSectorId(e.target.value ? Number(e.target.value) : null);
              setSelectedSubsectorId(null);
              setPage(1);
            }}
            className="bg-[#1e222d] text-[#d1d4dc] px-2.5 py-1.5 rounded border border-[#2a2e39] focus:outline-none focus:border-[#2962ff] max-w-[160px] truncate"
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Subsector Filter */}
          {selectedSectorId && availableSubsectors.length > 0 && (
            <select
              value={selectedSubsectorId ?? ''}
              onChange={(e) => {
                setSelectedSubsectorId(e.target.value ? Number(e.target.value) : null);
                setPage(1);
              }}
              className="bg-[#1e222d] text-[#d1d4dc] px-2.5 py-1.5 rounded border border-[#2a2e39] focus:outline-none focus:border-[#2962ff] max-w-[160px] truncate"
            >
              <option value="">All Subsectors</option>
              {availableSubsectors.map((ss) => (
                <option key={ss.id} value={ss.id}>
                  {ss.name}
                </option>
              ))}
            </select>
          )}

          {/* Classification Status Filter */}
          <select
            value={classificationFilter}
            onChange={(e) => {
              setClassificationFilter(e.target.value as any);
              setPage(1);
            }}
            className="bg-[#1e222d] text-[#d1d4dc] px-2.5 py-1.5 rounded border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
          >
            <option value="ALL">All Classifications</option>
            <option value="CLASSIFIED">Classified Only</option>
            <option value="UNCLASSIFIED">Unclassified Only</option>
          </select>

          {(query || selectedExchange !== 'ALL' || selectedSectorId || classificationFilter !== 'ALL') && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedExchange('ALL');
                setSelectedSectorId(null);
                setSelectedSubsectorId(null);
                setClassificationFilter('ALL');
                setPage(1);
              }}
              className="flex items-center gap-1 text-[11px] text-[#787b86] hover:text-[#f23645] transition ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Count Indicator */}
        <div className="text-xs text-[#787b86]">
          Showing {results.length} of <span className="text-white font-mono">{total}</span> listings
        </div>
      </div>

      {/* Stock Universe Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#787b86]">
            <Loader2 className="w-6 h-6 animate-spin text-[#2962ff]" />
            <span>Loading stocks...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="py-24 text-center text-xs text-[#787b86]">
            No stocks found matching the criteria.
          </div>
        ) : (
          <div className="bg-[#1e222d] rounded-xl border border-[#2a2e39] overflow-hidden shadow-sm">
            <div className="divide-y divide-[#2a2e39]">
              {results.map((item) => {
                const tvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
                  item.tradingview_symbol
                )}`;
                const isBse = item.exchange === 'BSE';

                return (
                  <div
                    key={item.listing_id}
                    onClick={() =>
                      onOpenStockDetails({
                        id: 0,
                        watchlist_id: 0,
                        section_id: null,
                        exchange_listing_id: item.listing_id,
                        sort_order: 0,
                        added_at: '',
                        exchange: item.exchange,
                        trading_symbol: item.trading_symbol,
                        security_code: item.security_code,
                        tradingview_symbol: item.tradingview_symbol,
                        listing_status: item.listing_status,
                        company_id: item.company_id,
                        company_name: item.company_name,
                        isin: item.isin,
                        sector_name: item.sector_name,
                        subsector_name: item.subsector_name,
                      })
                    }
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#2a2e39]/60 cursor-pointer transition text-xs select-none group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Exchange Badge */}
                      <span
                        className={`w-12 text-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${
                          item.exchange === 'NSE'
                            ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/30'
                            : 'bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/30'
                        }`}
                      >
                        {item.exchange}
                      </span>

                      {/* Symbol & External TV Link */}
                      <div className="w-36 shrink-0 flex items-center gap-1.5">
                        <span className="font-bold text-white font-mono hover:underline">
                          {item.tradingview_symbol}
                        </span>
                        <a
                          href={tvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Open Chart in TradingView"
                          className="text-[#787b86] hover:text-[#2962ff] opacity-0 group-hover:opacity-100 transition p-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Company Name & ISIN */}
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-[#d1d4dc] font-medium truncate max-w-sm">
                          {item.company_name}
                        </span>
                        {item.isin && (
                          <span className="text-[10px] text-[#787b86] font-mono px-1.5 py-0.2 rounded bg-[#131722] border border-[#2a2e39] shrink-0 hidden md:inline">
                            {item.isin}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Sector & Subsector */}
                      {item.sector_name ? (
                        <div className="flex items-center gap-1.5 hidden sm:flex">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#2962ff]/15 text-[#60a5fa] border border-[#2962ff]/30">
                            {item.sector_name}
                          </span>
                          {item.subsector_name && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#8b5cf6]/15 text-[#c084fc] border border-[#8b5cf6]/30">
                              {item.subsector_name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#787b86] italic hidden sm:inline">
                          Unclassified
                        </span>
                      )}

                      {/* Quick Add To Watchlist Button */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        {addingListingId === item.listing_id ? (
                          <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-[#2962ff] shadow-lg animate-in fade-in">
                            <select
                              value={targetWatchlistId}
                              onChange={(e) => setTargetWatchlistId(Number(e.target.value))}
                              className="bg-[#1e222d] text-[#d1d4dc] text-xs px-2 py-1 rounded border border-[#2a2e39] focus:outline-none"
                            >
                              {watchlists.map((wl) => (
                                <option key={wl.id} value={wl.id}>
                                  {wl.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleQuickAdd(item.listing_id)}
                              className="px-2 py-1 bg-[#2962ff] hover:bg-[#1e53e5] text-white font-semibold text-xs rounded transition"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setAddingListingId(null)}
                              className="p-1 text-[#787b86] hover:text-[#d1d4dc]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddingListingId(item.listing_id);
                              if (watchlists.length > 0 && !targetWatchlistId) {
                                setTargetWatchlistId(watchlists[0].id);
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded font-medium text-xs bg-[#2a2e39] hover:bg-[#363a45] text-[#d1d4dc] hover:text-white transition border border-[#363a45]"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#2962ff]" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-6 py-3 bg-[#1e222d] border-t border-[#2a2e39] flex items-center justify-between text-xs text-[#787b86]">
          <div>
            Page <span className="font-bold text-white">{page}</span> of{' '}
            <span className="font-bold text-white">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-[#131722] rounded border border-[#2a2e39] font-mono text-white">
              {page}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


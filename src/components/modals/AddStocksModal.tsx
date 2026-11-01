'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  ClipboardPaste,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import type { Section } from '@/lib/types';
import Papa from 'papaparse';

interface AddStocksModalProps {
  isOpen: boolean;
  initialTab?: 'search' | 'paste' | 'csv';
  watchlistId: number;
  sections: Section[];
  onClose: () => void;
  onAddSuccess: () => void;
}

export function AddStocksModal({
  isOpen,
  initialTab = 'search',
  watchlistId,
  sections,
  onClose,
  onAddSuccess,
}: AddStocksModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'paste' | 'csv'>(initialTab);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);

  // Tab 1: Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedListingIds, setAddedListingIds] = useState<Set<number>>(new Set());

  // Tab 2: Paste state
  const [pasteInput, setPasteInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validatedSymbols, setValidatedSymbols] = useState<
    Array<{
      exchange: string;
      symbol: string;
      tradingviewSymbol?: string;
      listingId: number | null;
      companyName: string | null;
      sectorName?: string;
      subsectorName?: string;
      error?: string;
    }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab 3: CSV state
  const [csvContent, setCsvContent] = useState('');
  const [csvParsedSymbols, setCsvParsedSymbols] = useState<string[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Debounced search for Tab 1
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Validate pasted symbols
  const handleValidatePaste = async () => {
    if (!pasteInput.trim()) return;
    setIsValidating(true);
    try {
      const res = await fetch('/api/symbols/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: pasteInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setValidatedSymbols(data);
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  // Add a single stock from Search tab
  const handleAddSingleStock = async (listingId: number) => {
    try {
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlistId,
          exchangeListingId: listingId,
          sectionId: selectedSectionId,
        }),
      });
      if (res.ok) {
        setAddedListingIds((prev) => new Set(prev).add(listingId));
        onAddSuccess();
      }
    } catch (err) {
      console.error('Add stock error:', err);
    }
  };

  // Add all valid stocks from Paste tab
  const handleAddAllValidated = async () => {
    const validListings = validatedSymbols.filter((s) => s.listingId !== null);
    if (validListings.length === 0) return;

    setIsSubmitting(true);
    try {
      for (const item of validListings) {
        if (item.listingId) {
          await fetch('/api/stocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              watchlistId,
              exchangeListingId: item.listingId,
              sectionId: selectedSectionId,
            }),
          });
        }
      }
      onAddSuccess();
      onClose();
    } catch (err) {
      console.error('Add all error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle CSV file upload
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);

      // Parse CSV to extract symbols
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const symbols: string[] = [];
      for (const row of parsed.data as Array<Record<string, string>>) {
        const symKey = Object.keys(row).find((k) =>
          k.toLowerCase().includes('symbol') || k.toLowerCase().includes('ticker')
        ) || Object.keys(row)[0];
        if (symKey && row[symKey]) {
          symbols.push(row[symKey].trim());
        }
      }
      setCsvParsedSymbols(symbols);
      setPasteInput(symbols.join('\n'));
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2a2e39] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white">Add Stocks to Watchlist</h2>
            {/* Target Section Selector */}
            <select
              value={selectedSectionId ?? ''}
              onChange={(e) => setSelectedSectionId(e.target.value ? Number(e.target.value) : null)}
              className="bg-[#131722] text-[#d1d4dc] text-xs px-2.5 py-1 rounded border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
            >
              <option value="">Uncategorized Section</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Section: {sec.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[#787b86] hover:text-[#d1d4dc] rounded hover:bg-[#2a2e39] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center px-6 border-b border-[#2a2e39] bg-[#131722]">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'search'
                ? 'border-[#2962ff] text-white'
                : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search & Add</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'paste'
                ? 'border-[#2962ff] text-white'
                : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste Symbols</span>
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'csv'
                ? 'border-[#2962ff] text-white'
                : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Bulk CSV Import</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: Search & Add */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#787b86]" />
                <input
                  type="text"
                  placeholder="Search by NSE symbol, BSE code, company name, or ISIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-[#131722] text-[#d1d4dc] text-sm pl-9 pr-3 py-2 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
                />
                {isSearching && (
                  <Loader2 className="w-4 h-4 absolute right-3 top-3 animate-spin text-[#2962ff]" />
                )}
              </div>

              {/* Search Results */}
              <div className="space-y-1">
                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <div className="py-8 text-center text-xs text-[#787b86]">
                    No matching stocks found for "{searchQuery}".
                  </div>
                )}

                {searchResults.map((item) => {
                  const isAdded = addedListingIds.has(item.listing_id);
                  return (
                    <div
                      key={item.listing_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#131722] border border-[#2a2e39] hover:border-[#363a45] transition text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            item.exchange === 'NSE'
                              ? 'bg-[#089981]/20 text-[#089981]'
                              : 'bg-[#ff9800]/20 text-[#ff9800]'
                          }`}
                        >
                          {item.exchange}
                        </span>
                        <div>
                          <div className="font-bold text-white font-mono flex items-center gap-2">
                            <span>{item.tradingview_symbol}</span>
                            {item.security_code && item.exchange === 'BSE' && (
                              <span className="text-[10px] text-[#787b86]">
                                Scrip: {item.security_code}
                              </span>
                            )}
                          </div>
                          <div className="text-[#787b86] truncate max-w-sm">
                            {item.company_name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {item.sector_name && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#2962ff]/10 text-[#60a5fa] border border-[#2962ff]/30 hidden sm:inline">
                            {item.sector_name}
                          </span>
                        )}

                        <button
                          disabled={isAdded}
                          onClick={() => handleAddSingleStock(item.listing_id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded font-semibold text-xs transition ${
                            isAdded
                              ? 'bg-[#089981]/20 text-[#089981] cursor-default'
                              : 'bg-[#2962ff] hover:bg-[#1e53e5] text-white shadow-sm'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Paste Symbols */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#d1d4dc] mb-1.5">
                  Paste TradingView Symbols or Comma-separated list
                </label>
                <textarea
                  rows={5}
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder={`Example formats:\nNSE:RELIANCE\nBSE:500325\nNSE:HAL\nNSE:BEL,NSE:TRENT\n532540`}
                  className="w-full bg-[#131722] text-[#d1d4dc] text-xs font-mono p-3 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  disabled={isValidating || !pasteInput.trim()}
                  onClick={handleValidatePaste}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-semibold rounded-lg transition"
                >
                  {isValidating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Validate & Preview Symbols</span>
                </button>

                {validatedSymbols.length > 0 && (
                  <button
                    disabled={isSubmitting || validatedSymbols.filter((s) => s.listingId).length === 0}
                    onClick={handleAddAllValidated}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-semibold rounded-lg transition shadow-md"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      Add {validatedSymbols.filter((s) => s.listingId).length} Valid Stocks
                    </span>
                  </button>
                )}
              </div>

              {/* Preview table of validated symbols */}
              {validatedSymbols.length > 0 && (
                <div className="mt-4 border border-[#2a2e39] rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-[#131722] border-b border-[#2a2e39] text-[11px] font-semibold text-[#787b86] uppercase">
                    Validation Results ({validatedSymbols.length} items)
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-[#2a2e39]">
                    {validatedSymbols.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-4 py-2 text-xs bg-[#1e222d]"
                      >
                        <div className="flex items-center gap-2.5">
                          {item.listingId ? (
                            <CheckCircle2 className="w-4 h-4 text-[#089981] shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-[#f23645] shrink-0" />
                          )}
                          <span className="font-mono font-bold text-white">
                            {item.tradingviewSymbol || `${item.exchange}:${item.symbol}`}
                          </span>
                          {item.companyName && (
                            <span className="text-[#787b86] truncate max-w-xs">
                              {item.companyName}
                            </span>
                          )}
                        </div>

                        <div>
                          {item.error ? (
                            <span className="text-[11px] text-[#f23645]">{item.error}</span>
                          ) : (
                            <span className="text-[11px] text-[#089981]">Ready to add</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Bulk CSV */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="p-6 border-2 border-dashed border-[#2a2e39] rounded-xl text-center bg-[#131722]">
                <FileSpreadsheet className="w-8 h-8 text-[#2962ff] mx-auto mb-2" />
                <div className="text-xs font-semibold text-white mb-1">
                  Upload CSV with Stock Symbols
                </div>
                <div className="text-[11px] text-[#787b86] mb-3">
                  Upload any CSV file containing a column of symbols (e.g. Symbol or Ticker)
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileUpload}
                  className="text-xs text-[#787b86] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2962ff] file:text-white hover:file:bg-[#1e53e5] cursor-pointer"
                />
              </div>

              {csvParsedSymbols.length > 0 && (
                <div className="p-4 bg-[#131722] rounded-lg border border-[#2a2e39] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white">
                      Extracted {csvParsedSymbols.length} symbols from CSV
                    </span>
                    <div className="text-[11px] text-[#787b86]">
                      Click below to validate against the stock database.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('paste');
                      handleValidatePaste();
                    }}
                    className="px-3 py-1.5 bg-[#2962ff] hover:bg-[#1e53e5] text-white font-semibold rounded transition"
                  >
                    Validate Symbols
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


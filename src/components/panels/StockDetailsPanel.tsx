'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Tag as TagIcon,
  Building2,
  FolderTree,
  ListFilter,
  Check,
  Plus,
  Loader2,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import type { Company, Sector, Tag, StockRowItem } from '@/lib/types';

interface StockDetailsPanelProps {
  stock: StockRowItem | null;
  sectors: Sector[];
  allTags: Tag[];
  onClose: () => void;
  onStockUpdated: () => void;
}

export function StockDetailsPanel({
  stock,
  sectors,
  allTags,
  onClose,
  onStockUpdated,
}: StockDetailsPanelProps) {
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingClassification, setSavingClassification] = useState(false);

  // Editable sector/subsector state
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [selectedSubsectorId, setSelectedSubsectorId] = useState<number | null>(null);
  const [customSectorName, setCustomSectorName] = useState('');
  const [customSubsectorName, setCustomSubsectorName] = useState('');

  // Tag creation/assignment
  const [newTagInput, setNewTagInput] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  // Fetch full company details when selected stock changes
  useEffect(() => {
    if (!stock) {
      setCompanyDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/companies/${stock.company_id}`);
        if (res.ok) {
          const data: Company = await res.json();
          setCompanyDetails(data);
          setSelectedSectorId(data.sectorId);
          setSelectedSubsectorId(data.subsectorId);
        }
      } catch (err) {
        console.error('Fetch company details error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [stock]);

  if (!stock) return null;

  // Selected sector's available subsectors
  const activeSector = sectors.find((s) => s.id === selectedSectorId);
  const availableSubsectors = activeSector?.subsectors || [];

  // Save updated classification
  const handleSaveClassification = async () => {
    if (!companyDetails) return;
    setSavingClassification(true);
    try {
      await fetch(`/api/companies/${companyDetails.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'classify',
          sectorId: selectedSectorId,
          subsectorId: selectedSubsectorId,
        }),
      });
      onStockUpdated();
    } catch (err) {
      console.error('Save classification error:', err);
    } finally {
      setSavingClassification(false);
    }
  };

  // Add tag to company
  const handleAddTag = async (tagId: number) => {
    if (!companyDetails) return;
    try {
      await fetch(`/api/companies/${companyDetails.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addTag',
          tagId,
        }),
      });
      // Refresh details
      const res = await fetch(`/api/companies/${companyDetails.id}`);
      if (res.ok) {
        setCompanyDetails(await res.json());
      }
      onStockUpdated();
    } catch (err) {
      console.error('Add tag error:', err);
    }
  };

  // Remove tag from company
  const handleRemoveTag = async (tagId: number) => {
    if (!companyDetails) return;
    try {
      await fetch(`/api/companies/${companyDetails.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeTag',
          tagId,
        }),
      });
      // Refresh details
      const res = await fetch(`/api/companies/${companyDetails.id}`);
      if (res.ok) {
        setCompanyDetails(await res.json());
      }
      onStockUpdated();
    } catch (err) {
      console.error('Remove tag error:', err);
    }
  };

  // Create new tag and assign
  const handleCreateAndAssignTag = async () => {
    if (!newTagInput.trim() || !companyDetails) return;
    try {
      const createRes = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagInput.trim(), color: '#8b5cf6' }),
      });
      if (createRes.ok) {
        const newTag = await createRes.json();
        await handleAddTag(newTag.id);
        setNewTagInput('');
        setTagDropdownOpen(false);
      }
    } catch (err) {
      console.error('Create tag error:', err);
    }
  };

  // URLs for TradingView
  const currentTvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
    stock.tradingview_symbol
  )}`;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#1e222d] border-l border-[#2a2e39] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2e39] flex items-center justify-between bg-[#131722]">
        <div className="flex items-center gap-2.5 min-w-0">
          <Building2 className="w-5 h-5 text-[#2962ff] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">
              {companyDetails?.companyName || stock.company_name}
            </h2>
            <div className="text-[11px] text-[#787b86] flex items-center gap-2">
              <span>Internal ID: #{stock.company_id}</span>
              {stock.isin && <span>• ISIN: {stock.isin}</span>}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-[#787b86] hover:text-[#d1d4dc] rounded hover:bg-[#2a2e39] transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#787b86]">
            <Loader2 className="w-6 h-6 animate-spin text-[#2962ff]" />
            <span>Loading company details...</span>
          </div>
        ) : (
          <>
            {/* Primary Action: Open TradingView Chart */}
            <div className="bg-[#131722] p-4 rounded-xl border border-[#2a2e39] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">TradingView Integration</span>
                <span className="text-[10px] text-[#089981] font-mono bg-[#089981]/10 px-2 py-0.5 rounded border border-[#089981]/20">
                  Direct Live Link
                </span>
              </div>

              <a
                href={currentTvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2962ff] hover:bg-[#1e53e5] text-white font-bold rounded-lg transition shadow-lg shadow-[#2962ff]/20 text-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open {stock.tradingview_symbol} Chart on TradingView</span>
              </a>

              {/* Other Listings for this company */}
              {companyDetails?.listings && companyDetails.listings.length > 1 && (
                <div className="pt-2 border-t border-[#2a2e39]/60">
                  <div className="text-[11px] text-[#787b86] mb-1.5 font-medium">
                    All Exchange Listings for this Company:
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {companyDetails.listings.map((listing) => (
                      <a
                        key={listing.id}
                        href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
                          listing.tradingviewSymbol
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold transition border ${
                          listing.tradingviewSymbol === stock.tradingview_symbol
                            ? 'bg-[#2962ff]/20 border-[#2962ff] text-[#60a5fa]'
                            : 'bg-[#1e222d] border-[#2a2e39] text-[#d1d4dc] hover:border-[#363a45]'
                        }`}
                      >
                        <span>{listing.tradingviewSymbol}</span>
                        <ExternalLink className="w-3 h-3 text-[#787b86]" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Classification Section (Editable) */}
            <div className="bg-[#131722] p-4 rounded-xl border border-[#2a2e39] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <FolderTree className="w-4 h-4 text-[#8b5cf6]" />
                  <span>Sector & Subsector</span>
                </div>
                {companyDetails?.classificationManuallyEdited && (
                  <span className="text-[10px] text-[#ff9800] bg-[#ff9800]/10 px-2 py-0.5 rounded border border-[#ff9800]/20">
                    Manually Edited
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-[#787b86] mb-1">Sector</label>
                  <select
                    value={selectedSectorId ?? ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      setSelectedSectorId(id);
                      setSelectedSubsectorId(null);
                    }}
                    className="w-full bg-[#1e222d] text-[#d1d4dc] text-xs px-3 py-2 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
                  >
                    <option value="">Unclassified</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#787b86] mb-1">Subsector</label>
                  <select
                    value={selectedSubsectorId ?? ''}
                    onChange={(e) =>
                      setSelectedSubsectorId(e.target.value ? Number(e.target.value) : null)
                    }
                    disabled={!selectedSectorId || availableSubsectors.length === 0}
                    className="w-full bg-[#1e222d] text-[#d1d4dc] text-xs px-3 py-2 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#2962ff] disabled:opacity-50"
                  >
                    <option value="">None / Unassigned</option>
                    {availableSubsectors.map((ss) => (
                      <option key={ss.id} value={ss.id}>
                        {ss.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveClassification}
                    disabled={savingClassification}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2962ff] hover:bg-[#1e53e5] text-white font-semibold rounded text-xs transition"
                  >
                    {savingClassification && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Update Classification</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Tags Section */}
            <div className="bg-[#131722] p-4 rounded-xl border border-[#2a2e39] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <TagIcon className="w-4 h-4 text-[#ec4899]" />
                  <span>Custom Tags</span>
                </div>
                <span className="text-[10px] text-[#787b86]">Shared across exchange listings</span>
              </div>

              {/* Tag Badges */}
              <div className="flex flex-wrap gap-1.5">
                {companyDetails?.tags && companyDetails.tags.length > 0 ? (
                  companyDetails.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-xs"
                      style={{ backgroundColor: tag.color || '#6b7280' }}
                    >
                      <span>{tag.name}</span>
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="hover:opacity-75 transition p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#787b86] italic">No tags assigned yet</span>
                )}
              </div>

              {/* Add / Create Tag */}
              <div className="pt-2 border-t border-[#2a2e39] flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Create or search tag..."
                    value={newTagInput}
                    onChange={(e) => {
                      setNewTagInput(e.target.value);
                      setTagDropdownOpen(true);
                    }}
                    onFocus={() => setTagDropdownOpen(true)}
                    className="w-full bg-[#1e222d] text-[#d1d4dc] text-xs px-3 py-1.5 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
                  />

                  {/* Dropdown of existing tags to add */}
                  {tagDropdownOpen && (
                    <div
                      className="absolute left-0 right-0 top-9 z-50 bg-[#1e222d] border border-[#2a2e39] rounded-md shadow-xl max-h-40 overflow-y-auto p-1 text-xs"
                      onMouseLeave={() => setTagDropdownOpen(false)}
                    >
                      {allTags
                        .filter(
                          (t) =>
                            !companyDetails?.tags.some((ct) => ct.id === t.id) &&
                            t.name.toLowerCase().includes(newTagInput.toLowerCase())
                        )
                        .map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => {
                              handleAddTag(tag.id);
                              setNewTagInput('');
                              setTagDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#2a2e39] text-[#d1d4dc] text-left"
                          >
                            <span>{tag.name}</span>
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                          </button>
                        ))}

                      {newTagInput.trim() &&
                        !allTags.some(
                          (t) => t.name.toLowerCase() === newTagInput.trim().toLowerCase()
                        ) && (
                          <button
                            onClick={handleCreateAndAssignTag}
                            className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-[#2962ff] hover:bg-[#2a2e39] font-semibold border-t border-[#2a2e39]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create tag "{newTagInput.trim()}"</span>
                          </button>
                        )}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateAndAssignTag}
                  disabled={!newTagInput.trim()}
                  className="px-3 py-1.5 bg-[#2962ff] hover:bg-[#1e53e5] disabled:opacity-50 text-white font-semibold rounded text-xs transition"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Watchlist Memberships */}
            <div className="bg-[#131722] p-4 rounded-xl border border-[#2a2e39] space-y-2.5">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <ListFilter className="w-4 h-4 text-[#089981]" />
                <span>Watchlist Memberships</span>
              </div>

              {companyDetails?.watchlistMemberships &&
              companyDetails.watchlistMemberships.length > 0 ? (
                <div className="space-y-1.5">
                  {companyDetails.watchlistMemberships.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-xs"
                    >
                      <span className="font-semibold text-white">{m.watchlistName}</span>
                      <span className="text-[#787b86]">
                        {m.sectionName ? `Section: ${m.sectionName}` : 'Uncategorized'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#787b86] italic">
                  Not currently in any watchlists
                </div>
              )}
            </div>

            {/* Security Master Details */}
            <div className="bg-[#131722] p-4 rounded-xl border border-[#2a2e39] space-y-2 text-xs text-[#787b86]">
              <div className="flex items-center justify-between py-1 border-b border-[#2a2e39]">
                <span>Listing Status</span>
                <span className="font-semibold text-[#089981] capitalize">
                  {stock.listing_status}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#2a2e39]">
                <span>Exchange</span>
                <span className="font-semibold text-white font-mono">{stock.exchange}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#2a2e39]">
                <span>Trading Symbol</span>
                <span className="font-semibold text-white font-mono">{stock.trading_symbol}</span>
              </div>
              {stock.security_code && (
                <div className="flex items-center justify-between py-1 border-b border-[#2a2e39]">
                  <span>BSE Scrip Code</span>
                  <span className="font-semibold text-white font-mono">
                    {stock.security_code}
                  </span>
                </div>
              )}
              {stock.isin && (
                <div className="flex items-center justify-between py-1">
                  <span>ISIN</span>
                  <span className="font-semibold text-white font-mono">{stock.isin}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


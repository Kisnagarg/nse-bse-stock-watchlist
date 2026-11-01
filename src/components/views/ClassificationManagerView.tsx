'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Check,
  X,
  Filter,
  Loader2,
  Building2,
  Plus,
} from 'lucide-react';
import type { Sector, StockRowItem } from '@/lib/types';

interface ClassificationManagerViewProps {
  sectors: Sector[];
  onOpenStockDetails: (stock: StockRowItem) => void;
  onRefreshData: () => void;
}

export function ClassificationManagerView({
  sectors,
  onOpenStockDetails,
  onRefreshData,
}: ClassificationManagerViewProps) {
  const [filterMode, setFilterMode] = useState<'UNCLASSIFIED' | 'ALL' | 'MANUAL'>('UNCLASSIFIED');
  const [query, setQuery] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Array<any>>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Quick inline edit state
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [editSectorId, setEditSectorId] = useState<number | null>(null);
  const [editSubsectorId, setEditSubsectorId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch companies based on filter
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set('query', query);
        if (filterMode === 'UNCLASSIFIED') params.set('classified', 'false');
        if (filterMode === 'ALL' && selectedSectorId) params.set('sectorId', selectedSectorId.toString());
        params.set('page', page.toString());
        params.set('limit', '50');

        const res = await fetch(`/api/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          // Group by company_id so we show unique companies
          const uniqueMap = new Map();
          for (const item of data.results || []) {
            if (!uniqueMap.has(item.company_id)) {
              uniqueMap.set(item.company_id, item);
            }
          }
          setCompanies(Array.from(uniqueMap.values()));
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error('Fetch companies error:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchCompanies, 200);
    return () => clearTimeout(timer);
  }, [filterMode, query, selectedSectorId, page]);

  // Save inline classification
  const handleSaveInline = async (companyId: number) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'classify',
          sectorId: editSectorId,
          subsectorId: editSubsectorId,
        }),
      });
      if (res.ok) {
        setEditingCompanyId(null);
        // Refresh local list
        setCompanies((prev) =>
          prev.map((c) =>
            c.company_id === companyId
              ? {
                  ...c,
                  sector_id: editSectorId,
                  subsector_id: editSubsectorId,
                  sector_name: sectors.find((s) => s.id === editSectorId)?.name,
                  subsector_name: sectors
                    .find((s) => s.id === editSectorId)
                    ?.subsectors?.find((ss) => ss.id === editSubsectorId)?.name,
                  classification_manually_edited: 1,
                }
              : c
          )
        );
        onRefreshData();
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeSector = sectors.find((s) => s.id === editSectorId);
  const availableSubsectors = activeSector?.subsectors || [];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#131722] text-[#d1d4dc] select-none">
      {/* Header */}
      <div className="px-6 py-4 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#8b5cf6]/10 text-[#8b5cf6]">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Classification Manager</h1>
            <div className="text-[11px] text-[#787b86]">
              Audit, map, and organize Indian equities into sectors and subsectors
            </div>
          </div>
        </div>

        {/* View Mode Filters */}
        <div className="flex items-center bg-[#131722] p-1 rounded-lg border border-[#2a2e39] text-xs">
          <button
            onClick={() => {
              setFilterMode('UNCLASSIFIED');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              filterMode === 'UNCLASSIFIED'
                ? 'bg-[#8b5cf6] text-white shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            Unclassified Stocks
          </button>
          <button
            onClick={() => {
              setFilterMode('ALL');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              filterMode === 'ALL'
                ? 'bg-[#8b5cf6] text-white shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            All Companies
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#787b86]" />
            <input
              type="text"
              placeholder="Search by company name, symbol, or ISIN..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#1e222d] text-[#d1d4dc] text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#8b5cf6]"
            />
          </div>

          {filterMode === 'ALL' && (
            <select
              value={selectedSectorId ?? ''}
              onChange={(e) => {
                setSelectedSectorId(e.target.value ? Number(e.target.value) : null);
                setPage(1);
              }}
              className="bg-[#1e222d] text-[#d1d4dc] px-3 py-1.5 rounded-lg border border-[#2a2e39] focus:outline-none focus:border-[#8b5cf6]"
            >
              <option value="">Filter by Sector (All)</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="text-xs text-[#787b86]">
          Total Companies: <span className="font-bold text-white font-mono">{total}</span>
        </div>
      </div>

      {/* Main Companies List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#787b86]">
            <Loader2 className="w-6 h-6 animate-spin text-[#8b5cf6]" />
            <span>Loading classification list...</span>
          </div>
        ) : companies.length === 0 ? (
          <div className="py-24 text-center text-xs text-[#787b86]">
            {filterMode === 'UNCLASSIFIED'
              ? '🎉 All stocks have been classified! No unclassified stocks found.'
              : 'No companies match the search criteria.'}
          </div>
        ) : (
          <div className="bg-[#1e222d] rounded-xl border border-[#2a2e39] overflow-hidden shadow-sm">
            <div className="divide-y divide-[#2a2e39]">
              {companies.map((company) => {
                const isEditing = editingCompanyId === company.company_id;

                return (
                  <div
                    key={company.company_id}
                    className="p-4 hover:bg-[#2a2e39]/50 transition text-xs select-none"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Left: Company & Identifier info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 className="w-4 h-4 text-[#787b86] shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {company.company_name}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#131722] text-[#2962ff] border border-[#2a2e39]">
                              {company.tradingview_symbol}
                            </span>
                            {company.isin && (
                              <span className="text-[10px] font-mono text-[#787b86] px-1.5 py-0.2 rounded bg-[#131722] border border-[#2a2e39]">
                                {company.isin}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#787b86]">
                            Exchange: {company.exchange} • ID: #{company.company_id}
                            {company.classification_manually_edited ? (
                              <span className="ml-2 text-[#ff9800]">• Manually Classified</span>
                            ) : company.sector_name ? (
                              <span className="ml-2 text-[#089981]">• CSV Classified</span>
                            ) : (
                              <span className="ml-2 text-[#f23645]">• Unclassified</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Classification or Edit Dropdowns */}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          /* Inline Edit Mode */
                          <div className="flex items-center gap-2 bg-[#131722] p-1.5 rounded-lg border border-[#8b5cf6] shadow-lg animate-in fade-in">
                            {/* Sector Select */}
                            <select
                              value={editSectorId ?? ''}
                              onChange={(e) => {
                                const id = e.target.value ? Number(e.target.value) : null;
                                setEditSectorId(id);
                                setEditSubsectorId(null);
                              }}
                              className="bg-[#1e222d] text-[#d1d4dc] text-xs px-2.5 py-1 rounded border border-[#2a2e39] focus:outline-none"
                            >
                              <option value="">Select Sector</option>
                              {sectors.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>

                            {/* Subsector Select */}
                            <select
                              value={editSubsectorId ?? ''}
                              onChange={(e) =>
                                setEditSubsectorId(
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              disabled={!editSectorId || availableSubsectors.length === 0}
                              className="bg-[#1e222d] text-[#d1d4dc] text-xs px-2.5 py-1 rounded border border-[#2a2e39] focus:outline-none disabled:opacity-50"
                            >
                              <option value="">Select Subsector</option>
                              {availableSubsectors.map((ss) => (
                                <option key={ss.id} value={ss.id}>
                                  {ss.name}
                                </option>
                              ))}
                            </select>

                            <button
                              disabled={isSaving}
                              onClick={() => handleSaveInline(company.company_id)}
                              className="p-1.5 bg-[#089981] hover:bg-[#077d69] text-white rounded transition"
                              title="Save Classification"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setEditingCompanyId(null)}
                              className="p-1.5 text-[#787b86] hover:text-[#d1d4dc] rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* Read Mode */
                          <div className="flex items-center gap-2">
                            {company.sector_name ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#2962ff]/15 text-[#60a5fa] border border-[#2962ff]/30">
                                  {company.sector_name}
                                </span>
                                {company.subsector_name && (
                                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#8b5cf6]/15 text-[#c084fc] border border-[#8b5cf6]/30">
                                    {company.subsector_name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#f23645]/15 text-[#f23645] border border-[#f23645]/30">
                                Unclassified
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setEditingCompanyId(company.company_id);
                                setEditSectorId(company.sector_id);
                                setEditSubsectorId(company.subsector_id);
                              }}
                              className="flex items-center gap-1 px-3 py-1 bg-[#2a2e39] hover:bg-[#363a45] text-[#d1d4dc] rounded font-medium transition"
                            >
                              <Edit2 className="w-3 h-3 text-[#8b5cf6]" />
                              <span>{company.sector_name ? 'Change' : 'Assign'}</span>
                            </button>
                          </div>
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
    </div>
  );
}


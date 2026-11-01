'use client';

import React, { useState } from 'react';
import {
  ArrowUpDown,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  FileJson,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import type { Watchlist, ClassificationPreview } from '@/lib/types';

interface ImportExportViewProps {
  watchlists: Watchlist[];
  onDataChanged: () => void;
}

export function ImportExportView({ watchlists, onDataChanged }: ImportExportViewProps) {
  const [activeTab, setActiveTab] = useState<'classification' | 'universe' | 'export'>('classification');

  // Classification CSV Import state
  const [csvText, setCsvText] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<ClassificationPreview | null>(null);
  const [overwriteManual, setOverwriteManual] = useState(false);
  const [applySummary, setApplySummary] = useState<{ applied: number; skippedManual: number } | null>(null);

  // Universe Master Import state
  const [universeCsvText, setUniverseCsvText] = useState('');
  const [universeLoading, setUniverseLoading] = useState(false);
  const [universeResult, setUniverseResult] = useState<{ created: number; skipped: number; total: number } | null>(null);

  // Handle Classification CSV file drop / selection
  const handleClassificationFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      setPreviewResult(null);
      setApplySummary(null);
    };
    reader.readAsText(file);
  };

  // Preview Classification CSV changes
  const handlePreviewClassification = async () => {
    if (!csvText.trim()) return;
    setPreviewLoading(true);
    setApplySummary(null);
    try {
      const res = await fetch('/api/classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          csvContent: csvText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewResult(data);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to preview CSV');
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Apply Classification CSV
  const handleApplyClassification = async () => {
    if (!csvText.trim()) return;
    if (
      !confirm(
        `Are you sure you want to apply classifications? ${
          overwriteManual
            ? 'Manually edited classifications WILL be overwritten.'
            : 'Manually edited classifications will be preserved.'
        }`
      )
    ) {
      return;
    }

    setApplyLoading(true);
    try {
      const res = await fetch('/api/classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          csvContent: csvText,
          overwriteManual,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setApplySummary(result);
        onDataChanged();
      }
    } catch (err) {
      console.error('Apply error:', err);
    } finally {
      setApplyLoading(false);
    }
  };

  // Stock Universe import
  const handleUniverseImport = async () => {
    if (!universeCsvText.trim()) return;
    setUniverseLoading(true);
    try {
      const res = await fetch('/api/universe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: universeCsvText }),
      });
      if (res.ok) {
        const data = await res.json();
        setUniverseResult(data);
        onDataChanged();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to import security master');
      }
    } catch (err) {
      console.error('Universe import error:', err);
    } finally {
      setUniverseLoading(false);
    }
  };

  // Export Watchlist (CSV or JSON)
  const handleExportWatchlist = async (watchlistId: number, format: 'json' | 'csv') => {
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/export`);
      if (res.ok) {
        const data = await res.json();
        if (format === 'json') {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          downloadBlob(blob, `${data.watchlist.name}_watchlist.json`);
        } else {
          // Format as CSV
          const rows = [
            ['Symbol', 'TradingView_Symbol', 'Company_Name', 'Exchange', 'Sector', 'Subsector'],
            ...data.stocks.map((s: any) => [
              s.trading_symbol,
              s.tradingview_symbol,
              `"${s.company_name}"`,
              s.exchange,
              `"${s.sector_name || ''}"`,
              `"${s.subsector_name || ''}"`,
            ]),
          ];
          const csvString = rows.map((r) => r.join(',')).join('\n');
          const blob = new Blob([csvString], { type: 'text/csv' });
          downloadBlob(blob, `${data.watchlist.name}_watchlist.csv`);
        }
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  // Export Full System Backup (All watchlists + arrangements)
  const handleExportFullBackup = async () => {
    try {
      const res = await fetch('/api/export');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `NSE_BSE_Watchlist_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      }
    } catch (err) {
      console.error('Full export error:', err);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#131722] text-[#d1d4dc] select-none">
      {/* Header */}
      <div className="px-6 py-4 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#2962ff]/10 text-[#2962ff]">
            <ArrowUpDown className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Import & Export Hub</h1>
            <div className="text-[11px] text-[#787b86]">
              CSV Classification Mapping • Security Master Sync • Watchlist Backups
            </div>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex items-center bg-[#131722] p-1 rounded-lg border border-[#2a2e39] text-xs">
          <button
            onClick={() => setActiveTab('classification')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === 'classification'
                ? 'bg-[#2962ff] text-white shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            Classification CSV
          </button>
          <button
            onClick={() => setActiveTab('universe')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === 'universe'
                ? 'bg-[#2962ff] text-white shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            Security Master Sync
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === 'export'
                ? 'bg-[#2962ff] text-white shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            Export & Backup
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: Classification CSV Import */}
        {activeTab === 'classification' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#1e222d] p-6 rounded-xl border border-[#2a2e39] space-y-4 shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-white mb-1">
                  Sector & Subsector Classification CSV Import
                </h2>
                <div className="text-xs text-[#787b86]">
                  Upload or paste your classification CSV (e.g. Symbol, NSE:Symbol, Subsector, Sector).
                  The system validates and matches existing stocks, shows a detailed preview of
                  changes, detects conflicts, and lets you apply updates safely.
                </div>
              </div>

              {/* Upload or Paste */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 border-2 border-dashed border-[#2a2e39] rounded-xl text-center bg-[#131722] flex flex-col items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 text-[#2962ff] mb-2" />
                  <span className="text-xs font-semibold text-white mb-1">
                    Upload Classification CSV
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleClassificationFile}
                    className="text-xs text-[#787b86] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2962ff] file:text-white cursor-pointer mt-2"
                  />
                </div>

                <div>
                  <textarea
                    rows={6}
                    placeholder="Or paste CSV content directly here..."
                    value={csvText}
                    onChange={(e) => {
                      setCsvText(e.target.value);
                      setPreviewResult(null);
                      setApplySummary(null);
                    }}
                    className="w-full bg-[#131722] text-[#d1d4dc] text-xs font-mono p-3 rounded-xl border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
                  />
                </div>
              </div>

              {/* Action Buttons & Options */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#2a2e39]">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#d1d4dc]">
                  <input
                    type="checkbox"
                    checked={overwriteManual}
                    onChange={(e) => setOverwriteManual(e.target.checked)}
                    className="rounded accent-[#2962ff]"
                  />
                  <span>Overwrite manually edited classifications</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    disabled={previewLoading || !csvText.trim()}
                    onClick={handlePreviewClassification}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-semibold rounded-lg transition"
                  >
                    {previewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Preview Changes</span>
                  </button>

                  {previewResult && (
                    <button
                      disabled={applyLoading || previewResult.matched.length === 0}
                      onClick={handleApplyClassification}
                      className="flex items-center gap-2 px-4 py-2 bg-[#089981] hover:bg-[#077d69] text-white text-xs font-bold rounded-lg transition shadow-md"
                    >
                      {applyLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Apply Classifications ({previewResult.matched.length} stocks)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Apply Success Banner */}
            {applySummary && (
              <div className="p-4 bg-[#089981]/10 border border-[#089981]/30 rounded-xl text-xs flex items-center gap-3 text-[#d1d4dc] animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-[#089981] shrink-0" />
                <div>
                  <span className="font-bold text-white">Classification Applied Successfully!</span>
                  <div>
                    Updated {applySummary.applied} companies.{' '}
                    {applySummary.skippedManual > 0 &&
                      `Skipped ${applySummary.skippedManual} manually edited companies.`}
                  </div>
                </div>
              </div>
            )}

            {/* Preview Results Breakdown */}
            {previewResult && (
              <div className="bg-[#1e222d] rounded-xl border border-[#2a2e39] overflow-hidden space-y-4 shadow-sm">
                <div className="px-6 py-4 border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3">
                  <div className="font-bold text-white text-sm">Classification Preview Analysis</div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2.5 py-1 rounded bg-[#089981]/15 text-[#089981] font-semibold">
                      Matched: {previewResult.matched.length}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#2962ff]/15 text-[#60a5fa] font-semibold">
                      New: {previewResult.newClassifications}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#ff9800]/15 text-[#ff9800] font-semibold">
                      Conflicts: {previewResult.conflicts}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#f23645]/15 text-[#f23645] font-semibold">
                      Unmatched: {previewResult.unmatched.length}
                    </span>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="max-h-80 overflow-y-auto px-6 pb-6">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#2a2e39] text-[#787b86] uppercase text-[10px]">
                        <th className="py-2">Symbol</th>
                        <th className="py-2">Company</th>
                        <th className="py-2">Sector (CSV)</th>
                        <th className="py-2">Subsector (CSV)</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39]">
                      {previewResult.matched.slice(0, 100).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#2a2e39]/30">
                          <td className="py-2 font-mono font-bold text-white">{row.symbol}</td>
                          <td className="py-2 text-[#d1d4dc]">{row.companyName}</td>
                          <td className="py-2 text-[#60a5fa]">{row.sector}</td>
                          <td className="py-2 text-[#c084fc]">{row.subsector}</td>
                          <td className="py-2">
                            {row.hasConflict ? (
                              <span className="text-[#ff9800] font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Conflict with existing
                              </span>
                            ) : !row.existingSector ? (
                              <span className="text-[#089981] font-medium">New classification</span>
                            ) : (
                              <span className="text-[#787b86]">Matches existing</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewResult.matched.length > 100 && (
                    <div className="text-center py-2 text-xs text-[#787b86]">
                      Showing first 100 of {previewResult.matched.length} matched records.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Security Master Sync */}
        {activeTab === 'universe' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#1e222d] p-6 rounded-xl border border-[#2a2e39] space-y-4 shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-white mb-1">
                  Exchange Security Master Import & Synchronization
                </h2>
                <div className="text-xs text-[#787b86]">
                  Import official NSE / BSE security master files to keep the master stock universe
                  updated. Automatically matches company identity across exchanges using ISIN,
                  avoiding duplicate entries.
                </div>
              </div>

              <div className="p-4 bg-[#131722] rounded-xl border border-[#2a2e39] space-y-3">
                <div className="text-xs font-semibold text-white">Supported CSV Formats:</div>
                <ul className="text-xs text-[#787b86] space-y-1 list-disc list-inside">
                  <li>Official NSE Equities master (EQUITY_L.csv) with Symbol, Company Name, ISIN</li>
                  <li>Official BSE Scrip master with Scrip Code, Scrip Name, ISIN</li>
                  <li>Standard CSV with headers: Exchange, Symbol, Company, ISIN, SecurityCode</li>
                </ul>
              </div>

              <textarea
                rows={6}
                placeholder={`Example CSV input:\nExchange,Symbol,Company,ISIN,SecurityCode\nNSE,TATAMOTORS,"Tata Motors Ltd.",INE155A01022,500570\nBSE,500570,"Tata Motors Ltd.",INE155A01022,500570`}
                value={universeCsvText}
                onChange={(e) => setUniverseCsvText(e.target.value)}
                className="w-full bg-[#131722] text-[#d1d4dc] text-xs font-mono p-3 rounded-xl border border-[#2a2e39] focus:outline-none focus:border-[#2962ff]"
              />

              <div className="flex items-center justify-end">
                <button
                  disabled={universeLoading || !universeCsvText.trim()}
                  onClick={handleUniverseImport}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-semibold rounded-lg transition shadow-md"
                >
                  {universeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sync Security Master</span>
                </button>
              </div>

              {universeResult && (
                <div className="p-4 bg-[#089981]/10 border border-[#089981]/30 rounded-xl text-xs text-[#d1d4dc] flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#089981] shrink-0" />
                  <div>
                    <span className="font-bold text-white">Security Master Synced!</span>
                    <div>
                      Processed {universeResult.total} entries. Created {universeResult.created} new
                      listings. Skipped {universeResult.skipped} existing listings.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Export & Backup */}
        {activeTab === 'export' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Full System Backup */}
            <div className="bg-[#1e222d] p-6 rounded-xl border border-[#2a2e39] flex items-center justify-between gap-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2 font-bold text-white text-sm mb-1">
                  <FileJson className="w-5 h-5 text-[#2962ff]" />
                  <span>Full Platform Backup (JSON)</span>
                </div>
                <div className="text-xs text-[#787b86]">
                  Exports all watchlists, custom sections, stock arrangements, and sort order into a
                  single portable JSON file.
                </div>
              </div>

              <button
                onClick={handleExportFullBackup}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-semibold rounded-lg transition shadow-md shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Full Backup</span>
              </button>
            </div>

            {/* Individual Watchlist Exports */}
            <div className="bg-[#1e222d] p-6 rounded-xl border border-[#2a2e39] space-y-4 shadow-sm">
              <h2 className="text-sm font-bold text-white">Export Individual Watchlists</h2>
              <div className="divide-y divide-[#2a2e39]">
                {watchlists.map((wl) => (
                  <div
                    key={wl.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: wl.color || '#3b82f6' }}
                      />
                      <span className="font-semibold text-white">{wl.name}</span>
                      <span className="text-[#787b86]">({wl.stockCount ?? 0} stocks)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportWatchlist(wl.id, 'csv')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363a45] text-[#d1d4dc] rounded font-medium transition"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#089981]" />
                        <span>CSV</span>
                      </button>

                      <button
                        onClick={() => handleExportWatchlist(wl.id, 'json')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363a45] text-[#d1d4dc] rounded font-medium transition"
                      >
                        <FileJson className="w-3.5 h-3.5 text-[#2962ff]" />
                        <span>JSON</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


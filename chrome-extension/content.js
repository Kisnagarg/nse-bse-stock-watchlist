// Stock Organizer - TradingView In-Page Floating Widget & Content Script
// Manifest V3

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__STOCK_ORGANIZER_INJECTED__) return;
  window.__STOCK_ORGANIZER_INJECTED__ = true;

  const DEFAULT_API_URL = 'https://watchlist-app-sable.vercel.app';
  let apiBaseUrl = DEFAULT_API_URL;

  let currentStock = null;
  let currentWatchlists = [];
  let lastDetectedSymbol = null;
  let searchTimeout = null;

  // Widget State: 'expanded' | 'minimized' | 'hidden'
  let widgetState = 'expanded';
  let widgetPos = { top: 75, left: null, right: 20 }; // default top-right

  /**
   * Parse symbol string into standardized exchange & symbol
   */
  function normalizeSymbol(raw) {
    if (!raw) return null;
    let clean = raw.trim().toUpperCase().replace(/[\s\r\n\t]+/g, ' ');

    // Match EXCHANGE:SYMBOL (e.g., NSE:RELIANCE, BSE:500325)
    const colonMatch = clean.match(/^(NSE|BSE)\s*:\s*([A-Z0-9_\-&]+)/i);
    if (colonMatch) {
      return {
        exchange: colonMatch[1].toUpperCase(),
        symbol: colonMatch[2].toUpperCase(),
        tvSymbol: `${colonMatch[1].toUpperCase()}:${colonMatch[2].toUpperCase()}`
      };
    }

    // Match exchange-dash-symbol (e.g. from URL /symbols/NSE-RELIANCE/)
    const dashMatch = clean.match(/^(NSE|BSE)-([A-Z0-9_\-&]+)/i);
    if (dashMatch) {
      return {
        exchange: dashMatch[1].toUpperCase(),
        symbol: dashMatch[2].toUpperCase(),
        tvSymbol: `${dashMatch[1].toUpperCase()}:${dashMatch[2].toUpperCase()}`
      };
    }

    // Match purely digits -> BSE security code (e.g. 500325)
    if (/^\d{5,6}$/.test(clean)) {
      return {
        exchange: 'BSE',
        symbol: clean,
        tvSymbol: `BSE:${clean}`
      };
    }

    // Single ticker symbol without exchange prefix (e.g. RELIANCE, TCS)
    if (/^[A-Z0-9_\-&]{2,20}$/.test(clean)) {
      return {
        exchange: 'NSE',
        symbol: clean,
        tvSymbol: `NSE:${clean}`
      };
    }

    return null;
  }

  /**
   * Attempt to extract the symbol from various TradingView sources
   */
  function detectSymbol() {
    const url = window.location.href;

    // 1. Try URL Query Parameter (?symbol=NSE%3ARELIANCE)
    try {
      const urlObj = new URL(url);
      const symbolParam = urlObj.searchParams.get('symbol');
      if (symbolParam) {
        const parsed = normalizeSymbol(decodeURIComponent(symbolParam));
        if (parsed) return parsed;
      }
    } catch (e) {}

    // 2. Try URL Pathname (e.g., /symbols/NSE-RELIANCE/ or /symbols/BSE-500325/)
    const pathMatch = window.location.pathname.match(/\/symbols\/([^\/]+)/i);
    if (pathMatch && pathMatch[1]) {
      const parsed = normalizeSymbol(decodeURIComponent(pathMatch[1]));
      if (parsed) return parsed;
    }

    // 3. Try TradingView Symbol Search Toolbar Button / Legend Series Item
    const symbolBtn = document.querySelector(
      '#header-toolbar-symbol-search, [data-name="legend-series-item"], button[id*="symbol-search"], div[class*="symbolTitle"], [data-role="symbol-name"]'
    );
    if (symbolBtn) {
      const text = symbolBtn.innerText || symbolBtn.textContent;
      if (text) {
        const parsed = normalizeSymbol(text);
        if (parsed) return parsed;
      }
    }

    // 4. Try Page Title (e.g., "RELIANCE Stock Chart — TradingView")
    const title = document.title || '';
    const titleParts = title.split(/[—\-\|·•]/);
    if (titleParts.length > 0) {
      const firstChunk = titleParts[0].trim();
      const parsed = normalizeSymbol(firstChunk);
      if (parsed) return parsed;
    }

    // 5. Try Meta tags
    const metaOg = document.querySelector('meta[property="og:title"]');
    if (metaOg && metaOg.content) {
      const parsed = normalizeSymbol(metaOg.content.split(/[—\-\|]/)[0].trim());
      if (parsed) return parsed;
    }

    return null;
  }

  // --- FLOATING WIDGET INJECTION & SHADOW DOM ---

  let hostEl = null;
  let shadowRoot = null;

  function initFloatingWidget() {
    if (document.getElementById('stock-organizer-floating-host')) return;

    hostEl = document.createElement('div');
    hostEl.id = 'stock-organizer-floating-host';
    hostEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      z-index: 2147483640;
      pointer-events: none;
    `;

    shadowRoot = hostEl.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>${getWidgetStyles()}</style>
      <div id="so-container" class="so-container">
        <!-- Expanded Window -->
        <div id="so-window" class="so-window">
          <!-- Draggable Header -->
          <div id="so-drag-header" class="so-header">
            <div class="so-header-left">
              <span class="so-drag-grip" title="Drag widget">⋮⋮</span>
              <div class="so-logo">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                  <polyline points="16 7 22 7 22 13"></polyline>
                </svg>
              </div>
              <span class="so-title">Stock Organizer</span>
              <span id="so-status-dot" class="so-status-dot online" title="Backend connected"></span>
            </div>
            <div class="so-header-actions">
              <button class="so-icon-btn" id="so-btn-refresh" title="Refresh active stock">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
              <button class="so-icon-btn" id="so-btn-search" title="Search stocks manually">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
              <button class="so-icon-btn" id="so-btn-settings" title="API Settings">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
              <button class="so-icon-btn" id="so-btn-minimize" title="Minimize to floating pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <button class="so-icon-btn" id="so-btn-close" title="Hide widget (dock to edge)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- Settings Drawer -->
          <div id="so-settings" class="so-settings-drawer so-hidden">
            <div class="so-settings-head">
              <span>Backend Connection</span>
              <button class="so-close-inline" id="so-btn-close-settings">&times;</button>
            </div>
            <div class="so-settings-body">
              <label>API Base URL</label>
              <input type="text" id="so-input-api" spellcheck="false" placeholder="https://watchlist-app-sable.vercel.app">
              <div class="so-presets">
                <button class="so-preset-btn" data-url="https://watchlist-app-sable.vercel.app">Vercel (Prod)</button>
                <button class="so-preset-btn" data-url="http://localhost:3000">Local (3000)</button>
              </div>
              <div class="so-settings-actions">
                <button class="so-sec-btn" id="so-btn-test-api">Test Ping</button>
                <button class="so-pri-btn" id="so-btn-save-api">Save</button>
              </div>
              <div id="so-settings-msg" class="so-settings-msg"></div>
            </div>
          </div>

          <!-- Search Dropdown Box -->
          <div id="so-search-wrap" class="so-search-wrap so-hidden">
            <div class="so-search-bar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" id="so-input-search" placeholder="Search 2,000+ Indian stocks..." autocomplete="off" spellcheck="false">
              <button class="so-clear-btn so-hidden" id="so-btn-clear-search">&times;</button>
            </div>
            <div id="so-search-results" class="so-search-results so-hidden"></div>
          </div>

          <!-- Active Stock Card -->
          <div class="so-stock-card" id="so-stock-card">
            <div class="so-stock-row1">
              <div class="so-stock-sym-group">
                <span class="so-exchange-badge nse" id="so-badge-exchange">NSE</span>
                <span class="so-stock-symbol" id="so-text-symbol">DETECTING...</span>
              </div>
              <span class="so-isin-tag" id="so-text-isin"></span>
            </div>
            <div class="so-stock-name" id="so-text-name">Analyzing TradingView chart...</div>
            <div class="so-stock-meta">
              <span class="so-meta-pill" id="so-pill-sector">Sector: —</span>
              <span class="so-meta-pill" id="so-pill-subsector">Subsector: —</span>
            </div>
          </div>

          <!-- Watchlists Section -->
          <div class="so-watchlists-header">
            <span class="so-wl-heading">WATCHLISTS</span>
            <span class="so-wl-count-pill" id="so-wl-summary">0 / 0</span>
          </div>

          <div class="so-watchlists-body" id="so-watchlists-body">
            <div class="so-loading">
              <div class="so-spinner"></div>
              <span>Loading watchlists...</span>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="so-footer">
            <button class="so-btn-danger" id="so-btn-remove-all" title="Remove this stock from all watchlists">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Remove All</span>
            </button>
            <button class="so-btn-link" id="so-btn-open-web" title="Open full web app in new tab">
              <span>Web App ↗</span>
            </button>
          </div>
        </div>

        <!-- Minimized Floating Pill -->
        <div id="so-pill" class="so-pill so-hidden" title="Click to expand Stock Organizer">
          <div class="so-pill-drag" title="Drag pill">⋮⋮</div>
          <div class="so-pill-logo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
              <polyline points="16 7 22 7 22 13"></polyline>
            </svg>
          </div>
          <span class="so-pill-symbol" id="so-pill-symbol">NSE:—</span>
          <span class="so-pill-badge" id="so-pill-status">Checking</span>
          <button class="so-pill-expand" id="so-btn-pill-expand" title="Expand">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
        </div>

        <!-- Docked Edge Tab (when hidden) -->
        <div id="so-dock-tab" class="so-dock-tab so-hidden" title="Open Stock Organizer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
          <span>Watchlist</span>
        </div>

        <!-- Toast Message -->
        <div id="so-toast" class="so-toast so-hidden"></div>
      </div>
    `;

    document.body.appendChild(hostEl);

    // Load saved settings & position
    loadStoredSettingsAndPosition();
    setupWidgetEvents();
  }

  // --- WIDGET STYLES (Encapsulated in Shadow DOM) ---

  function getWidgetStyles() {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        user-select: none;
        -webkit-font-smoothing: antialiased;
      }

      .so-container {
        font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
        font-size: 12px;
        color: #d1d4dc;
        pointer-events: auto;
      }

      /* Custom scrollbars */
      ::-webkit-scrollbar {
        width: 5px;
        height: 5px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: #2a2e39;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #363a45;
      }

      /* Expanded Floating Window */
      .so-window {
        position: fixed;
        width: 350px;
        max-height: 540px;
        background: #131722;
        border: 1px solid #2a2e39;
        border-radius: 10px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 2147483645;
        transition: opacity 0.15s ease, transform 0.15s ease;
      }

      .so-window.so-hidden {
        display: none !important;
      }

      /* Header */
      .so-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 12px;
        background: #1e222d;
        border-bottom: 1px solid #2a2e39;
        cursor: grab;
        flex-shrink: 0;
      }
      .so-header:active {
        cursor: grabbing;
      }

      .so-header-left {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .so-drag-grip {
        color: #50535e;
        font-size: 14px;
        line-height: 1;
        cursor: grab;
        letter-spacing: -2px;
        margin-right: 2px;
      }

      .so-logo {
        color: #2962ff;
        display: flex;
        align-items: center;
      }

      .so-title {
        font-weight: 700;
        font-size: 12.5px;
        color: #ffffff;
        letter-spacing: -0.2px;
      }

      .so-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        margin-left: 2px;
      }
      .so-status-dot.online {
        background: #089981;
        box-shadow: 0 0 6px rgba(8, 153, 129, 0.7);
      }
      .so-status-dot.offline {
        background: #f23645;
        box-shadow: 0 0 6px rgba(242, 54, 69, 0.7);
      }

      .so-header-actions {
        display: flex;
        align-items: center;
        gap: 2px;
      }

      .so-icon-btn {
        background: transparent;
        border: none;
        color: #787b86;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s;
      }
      .so-icon-btn:hover {
        background: #2a2e39;
        color: #ffffff;
      }
      .so-icon-btn.spinning svg {
        animation: so-spin 0.8s linear infinite;
      }

      @keyframes so-spin {
        100% { transform: rotate(360deg); }
      }

      /* Settings Drawer */
      .so-settings-drawer {
        background: #1e222d;
        border-bottom: 1px solid #2a2e39;
        padding: 10px 12px;
      }
      .so-settings-drawer.so-hidden {
        display: none;
      }

      .so-settings-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        font-size: 11px;
        color: #fff;
        text-transform: uppercase;
        margin-bottom: 6px;
      }

      .so-close-inline {
        background: none;
        border: none;
        color: #787b86;
        font-size: 14px;
        cursor: pointer;
      }

      .so-settings-body label {
        display: block;
        font-size: 10.5px;
        color: #787b86;
        margin-bottom: 4px;
      }

      .so-settings-body input {
        width: 100%;
        background: #131722;
        border: 1px solid #2a2e39;
        border-radius: 4px;
        padding: 5px 8px;
        color: #fff;
        font-size: 11.5px;
        outline: none;
      }
      .so-settings-body input:focus {
        border-color: #2962ff;
      }

      .so-presets {
        display: flex;
        gap: 6px;
        margin: 6px 0;
      }

      .so-preset-btn {
        background: #2a2e39;
        border: none;
        color: #787b86;
        font-size: 10px;
        padding: 3px 8px;
        border-radius: 12px;
        cursor: pointer;
      }
      .so-preset-btn:hover {
        background: #363a45;
        color: #fff;
      }

      .so-settings-actions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        margin-top: 6px;
      }

      .so-pri-btn {
        background: #2962ff;
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }
      .so-pri-btn:hover {
        background: #1e53e5;
      }

      .so-sec-btn {
        background: #2a2e39;
        color: #d1d4dc;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
      }
      .so-sec-btn:hover {
        background: #363a45;
      }

      .so-settings-msg {
        font-size: 10px;
        margin-top: 4px;
      }
      .so-settings-msg.success { color: #089981; }
      .so-settings-msg.error { color: #f23645; }

      /* Search Box */
      .so-search-wrap {
        position: relative;
        background: #1e222d;
        border-bottom: 1px solid #2a2e39;
        padding: 8px 12px;
      }
      .so-search-wrap.so-hidden {
        display: none;
      }

      .so-search-bar {
        display: flex;
        align-items: center;
        background: #131722;
        border: 1px solid #2a2e39;
        border-radius: 4px;
        padding: 0 8px;
      }
      .so-search-bar:focus-within {
        border-color: #2962ff;
      }

      .so-search-bar input {
        width: 100%;
        background: transparent;
        border: none;
        outline: none;
        color: #fff;
        padding: 5px 6px;
        font-size: 11.5px;
      }

      .so-clear-btn {
        background: none;
        border: none;
        color: #787b86;
        cursor: pointer;
        font-size: 13px;
      }
      .so-clear-btn.so-hidden {
        display: none;
      }

      .so-search-results {
        position: absolute;
        top: 100%;
        left: 12px;
        right: 12px;
        max-height: 200px;
        overflow-y: auto;
        background: #1e222d;
        border: 1px solid #2a2e39;
        border-radius: 4px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
        z-index: 50;
      }
      .so-search-results.so-hidden {
        display: none;
      }

      .so-search-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 9px;
        cursor: pointer;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      }
      .so-search-item:hover {
        background: #2a2e39;
      }
      .so-search-sym {
        font-weight: 600;
        color: #fff;
        font-size: 11.5px;
      }
      .so-search-name {
        color: #787b86;
        font-size: 10px;
      }

      /* Active Stock Card */
      .so-stock-card {
        padding: 10px 14px;
        background: #181c27;
        border-bottom: 1px solid #2a2e39;
        flex-shrink: 0;
      }

      .so-stock-row1 {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 3px;
      }

      .so-stock-sym-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .so-exchange-badge {
        font-size: 9.5px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 3px;
      }
      .so-exchange-badge.nse {
        background: #2962ff;
        color: #fff;
      }
      .so-exchange-badge.bse {
        background: #f59e0b;
        color: #000;
      }

      .so-stock-symbol {
        font-weight: 700;
        font-size: 14px;
        color: #ffffff;
      }

      .so-isin-tag {
        font-family: monospace;
        font-size: 9.5px;
        color: #50535e;
      }

      .so-stock-name {
        font-size: 11.5px;
        color: #787b86;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 6px;
      }

      .so-stock-meta {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .so-meta-pill {
        background: #131722;
        border: 1px solid #2a2e39;
        border-radius: 3px;
        padding: 2px 6px;
        font-size: 9.5px;
        color: #787b86;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
      }

      /* Watchlists Section */
      .so-watchlists-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 14px;
        background: #131722;
        border-bottom: 1px solid #2a2e39;
        flex-shrink: 0;
      }

      .so-wl-heading {
        font-size: 10.5px;
        font-weight: 700;
        color: #787b86;
        letter-spacing: 0.5px;
      }

      .so-wl-count-pill {
        font-size: 10px;
        font-weight: 600;
        color: #2962ff;
        background: rgba(41, 98, 255, 0.12);
        padding: 2px 6px;
        border-radius: 10px;
      }

      .so-watchlists-body {
        flex: 1;
        overflow-y: auto;
        max-height: 290px;
      }

      .so-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 30px 10px;
        color: #787b86;
        gap: 8px;
      }

      .so-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #2a2e39;
        border-top-color: #2962ff;
        border-radius: 50%;
        animation: so-spin 0.7s linear infinite;
      }

      /* Watchlist Item */
      .so-wl-card {
        border-bottom: 1px solid #1e222d;
      }

      .so-wl-main-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .so-wl-main-row:hover {
        background: #181c27;
      }

      .so-wl-left {
        display: flex;
        align-items: center;
        gap: 7px;
        overflow: hidden;
      }

      .so-wl-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .so-wl-details {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .so-wl-name-row {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .so-wl-name {
        font-weight: 600;
        font-size: 11.5px;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .so-sec-pill {
        font-size: 9px;
        color: #089981;
        background: rgba(8, 153, 129, 0.14);
        padding: 1px 5px;
        border-radius: 3px;
        white-space: nowrap;
      }

      .so-wl-count {
        font-size: 9.5px;
        color: #50535e;
      }

      .so-wl-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .so-badge-present {
        font-size: 10px;
        font-weight: 600;
        color: #089981;
        display: flex;
        align-items: center;
        gap: 3px;
      }

      .so-btn-quick-add {
        background: #2a2e39;
        border: 1px solid #363a45;
        color: #d1d4dc;
        font-size: 10.5px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .so-btn-quick-add:hover {
        background: #2962ff;
        border-color: #2962ff;
        color: #fff;
      }

      .so-chevron {
        color: #787b86;
        transition: transform 0.2s;
        display: flex;
        align-items: center;
      }
      .so-wl-card.expanded .so-chevron {
        transform: rotate(180deg);
      }

      /* Sections Accordion */
      .so-sections-drawer {
        display: none;
        background: #181c27;
        border-top: 1px solid #2a2e39;
        padding: 8px 14px 10px 14px;
      }
      .so-wl-card.expanded .so-sections-drawer {
        display: block;
      }

      .so-sections-tip {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9.5px;
        color: #787b86;
        margin-bottom: 6px;
      }
      .so-rule-italic {
        font-size: 8.5px;
        color: #50535e;
        font-style: italic;
      }

      .so-sections-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 7px;
      }

      .so-sec-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 7px;
        border-radius: 4px;
        background: #131722;
        border: 1px solid #2a2e39;
        cursor: pointer;
        transition: all 0.15s;
      }
      .so-sec-item:hover {
        border-color: #2962ff;
      }
      .so-sec-item.active {
        background: rgba(8, 153, 129, 0.1);
        border-color: #089981;
      }

      .so-sec-item-left {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .so-radio-circle {
        width: 11px;
        height: 11px;
        border-radius: 50%;
        border: 1.5px solid #787b86;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .so-sec-item.active .so-radio-circle {
        border-color: #089981;
        background: #089981;
      }
      .so-radio-dot {
        width: 3.5px;
        height: 3.5px;
        border-radius: 50%;
        background: #fff;
        display: none;
      }
      .so-sec-item.active .so-radio-dot {
        display: block;
      }

      .so-sec-item-name {
        font-size: 10.5px;
        color: #d1d4dc;
      }
      .so-sec-item.active .so-sec-item-name {
        color: #fff;
        font-weight: 600;
      }

      .so-sec-item-tag {
        font-size: 9px;
        font-weight: 600;
        color: #2962ff;
      }
      .so-sec-item.active .so-sec-item-tag {
        color: #089981;
      }

      /* Inline create section */
      .so-add-sec-row {
        display: flex;
        gap: 5px;
        padding-top: 6px;
        border-top: 1px dashed #2a2e39;
      }
      .so-add-sec-row input {
        flex: 1;
        background: #131722;
        border: 1px solid #2a2e39;
        border-radius: 3px;
        color: #fff;
        font-size: 10.5px;
        padding: 3px 6px;
        outline: none;
      }
      .so-add-sec-row input:focus {
        border-color: #2962ff;
      }
      .so-add-sec-row button {
        background: #2a2e39;
        border: none;
        color: #d1d4dc;
        border-radius: 3px;
        font-size: 9.5px;
        font-weight: 600;
        padding: 0 8px;
        cursor: pointer;
      }
      .so-add-sec-row button:hover {
        background: #2962ff;
        color: #fff;
      }

      .so-remove-wl-btn {
        background: none;
        border: none;
        color: #f23645;
        font-size: 9.5px;
        cursor: pointer;
        margin-top: 6px;
        display: block;
        margin-left: auto;
      }
      .so-remove-wl-btn:hover {
        text-decoration: underline;
      }

      /* Footer */
      .so-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 12px;
        background: #131722;
        border-top: 1px solid #2a2e39;
        flex-shrink: 0;
      }

      .so-btn-danger {
        display: flex;
        align-items: center;
        gap: 4px;
        background: transparent;
        border: 1px solid rgba(242, 54, 69, 0.3);
        color: #f23645;
        border-radius: 4px;
        padding: 3px 8px;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .so-btn-danger:hover {
        background: rgba(242, 54, 69, 0.12);
        border-color: #f23645;
      }

      .so-btn-link {
        background: transparent;
        border: none;
        color: #2962ff;
        font-size: 10.5px;
        font-weight: 600;
        cursor: pointer;
      }
      .so-btn-link:hover {
        text-decoration: underline;
      }

      /* Minimized Floating Pill */
      .so-pill {
        position: fixed;
        height: 32px;
        background: #1e222d;
        border: 1px solid #2a2e39;
        border-radius: 16px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 0 10px 0 6px;
        cursor: pointer;
        z-index: 2147483645;
        transition: transform 0.15s, background 0.15s, border-color 0.15s;
      }
      .so-pill:hover {
        background: #262b38;
        border-color: #2962ff;
      }
      .so-pill.so-hidden {
        display: none !important;
      }

      .so-pill-drag {
        color: #50535e;
        font-size: 13px;
        cursor: grab;
        letter-spacing: -2px;
      }

      .so-pill-logo {
        color: #2962ff;
        display: flex;
        align-items: center;
      }

      .so-pill-symbol {
        font-weight: 700;
        font-size: 11.5px;
        color: #ffffff;
      }

      .so-pill-badge {
        font-size: 9.5px;
        font-weight: 600;
        background: rgba(41, 98, 255, 0.12);
        color: #2962ff;
        padding: 1px 6px;
        border-radius: 8px;
        white-space: nowrap;
      }

      .so-pill-badge.present {
        background: rgba(8, 153, 129, 0.14);
        color: #089981;
      }

      .so-pill-expand {
        background: none;
        border: none;
        color: #787b86;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 2px;
      }
      .so-pill-expand:hover {
        color: #fff;
      }

      /* Docked Edge Tab */
      .so-dock-tab {
        position: fixed;
        right: 0;
        top: 140px;
        background: #1e222d;
        border: 1px solid #2a2e39;
        border-right: none;
        border-radius: 6px 0 0 6px;
        box-shadow: -4px 4px 12px rgba(0, 0, 0, 0.4);
        padding: 8px 10px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        z-index: 2147483645;
        color: #2962ff;
        font-size: 11px;
        font-weight: 600;
        transition: transform 0.15s, background 0.15s;
      }
      .so-dock-tab:hover {
        transform: translateX(-4px);
        background: #2a2e39;
        color: #fff;
      }
      .so-dock-tab.so-hidden {
        display: none !important;
      }

      /* Toast Notification */
      .so-toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #2a2e39;
        color: #fff;
        border: 1px solid #363a45;
        border-radius: 6px;
        padding: 6px 14px;
        font-size: 11px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        z-index: 2147483647;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      .so-toast.so-hidden {
        display: none;
      }
    `;
  }

  // --- WIDGET POSITION & SETTINGS PERSISTENCE ---

  async function loadStoredSettingsAndPosition() {
    try {
      if (chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['apiBaseUrl', 'widgetPos', 'widgetState']);
        if (stored.apiBaseUrl) {
          apiBaseUrl = stored.apiBaseUrl;
          const input = shadowRoot.getElementById('so-input-api');
          if (input) input.value = apiBaseUrl;
        }
        if (stored.widgetState) {
          widgetState = stored.widgetState;
        }
        if (stored.widgetPos) {
          widgetPos = stored.widgetPos;
        }
      }
    } catch (e) {
      console.warn('Storage read failed:', e);
    }

    applyPosition();
    applyWidgetState();
    triggerStockDetection();
  }

  function applyPosition() {
    const win = shadowRoot.getElementById('so-window');
    const pill = shadowRoot.getElementById('so-pill');

    const top = widgetPos.top !== null ? `${widgetPos.top}px` : '75px';
    const left = widgetPos.left !== null ? `${widgetPos.left}px` : '';
    const right = widgetPos.left === null && widgetPos.right !== null ? `${widgetPos.right}px` : '';

    if (win) {
      win.style.top = top;
      if (left) {
        win.style.left = left;
        win.style.right = 'auto';
      } else {
        win.style.right = right || '20px';
        win.style.left = 'auto';
      }
    }

    if (pill) {
      pill.style.top = top;
      if (left) {
        pill.style.left = left;
        pill.style.right = 'auto';
      } else {
        pill.style.right = right || '20px';
        pill.style.left = 'auto';
      }
    }
  }

  function savePosition(top, left) {
    widgetPos = { top, left, right: null };
    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ widgetPos });
      }
    } catch (e) {}
  }

  function applyWidgetState() {
    const win = shadowRoot.getElementById('so-window');
    const pill = shadowRoot.getElementById('so-pill');
    const dock = shadowRoot.getElementById('so-dock-tab');

    if (!win || !pill || !dock) return;

    if (widgetState === 'expanded') {
      win.classList.remove('so-hidden');
      pill.classList.add('so-hidden');
      dock.classList.add('so-hidden');
    } else if (widgetState === 'minimized') {
      win.classList.add('so-hidden');
      pill.classList.remove('so-hidden');
      dock.classList.add('so-hidden');
    } else if (widgetState === 'hidden') {
      win.classList.add('so-hidden');
      pill.classList.add('so-hidden');
      dock.classList.remove('so-hidden');
    }

    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ widgetState });
      }
    } catch (e) {}
  }

  function showToast(msg) {
    const toast = shadowRoot.getElementById('so-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('so-hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.add('so-hidden');
    }, 2200);
  }

  function setConnectionStatus(online) {
    const dot = shadowRoot.getElementById('so-status-dot');
    if (!dot) return;
    dot.className = `so-status-dot ${online ? 'online' : 'offline'}`;
    dot.title = online ? 'Connected to backend' : 'Backend offline or unreachable';
  }

  // --- EVENT LISTENERS & DRAG HANDLING ---

  function setupWidgetEvents() {
    // 1. Draggable Window
    const win = shadowRoot.getElementById('so-window');
    const header = shadowRoot.getElementById('so-drag-header');
    initDraggable(header, win);

    // 2. Draggable Pill
    const pill = shadowRoot.getElementById('so-pill');
    initDraggable(pill, pill);

    // 3. Minimize button
    const btnMin = shadowRoot.getElementById('so-btn-minimize');
    btnMin.addEventListener('click', (e) => {
      e.stopPropagation();
      widgetState = 'minimized';
      applyWidgetState();
    });

    // 4. Pill click -> Expand
    pill.addEventListener('click', () => {
      widgetState = 'expanded';
      applyWidgetState();
    });

    // 5. Close button -> Dock to edge
    const btnClose = shadowRoot.getElementById('so-btn-close');
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      widgetState = 'hidden';
      applyWidgetState();
    });

    // 6. Dock Tab click -> Expand
    const dockTab = shadowRoot.getElementById('so-dock-tab');
    dockTab.addEventListener('click', () => {
      widgetState = 'expanded';
      applyWidgetState();
    });

    // 7. Refresh button
    const btnRefresh = shadowRoot.getElementById('so-btn-refresh');
    btnRefresh.addEventListener('click', () => {
      btnRefresh.classList.add('spinning');
      triggerStockDetection().finally(() => {
        setTimeout(() => btnRefresh.classList.remove('spinning'), 500);
      });
    });

    // 8. Search toggle button
    const btnSearch = shadowRoot.getElementById('so-btn-search');
    const searchWrap = shadowRoot.getElementById('so-search-wrap');
    const searchInput = shadowRoot.getElementById('so-input-search');
    btnSearch.addEventListener('click', () => {
      searchWrap.classList.toggle('so-hidden');
      if (!searchWrap.classList.contains('so-hidden')) {
        searchInput.focus();
      }
    });

    // 9. Clear search button
    const btnClearSearch = shadowRoot.getElementById('so-btn-clear-search');
    const searchResults = shadowRoot.getElementById('so-search-results');
    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      btnClearSearch.classList.add('so-hidden');
      searchResults.classList.add('so-hidden');
      searchResults.innerHTML = '';
    });

    // 10. Search input debounce
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      btnClearSearch.classList.toggle('so-hidden', q.length === 0);
      clearTimeout(searchTimeout);
      if (q.length < 1) {
        searchResults.classList.add('so-hidden');
        searchResults.innerHTML = '';
        return;
      }
      searchTimeout = setTimeout(() => {
        performManualSearch(q);
      }, 220);
    });

    // 11. Settings Drawer
    const btnSettings = shadowRoot.getElementById('so-btn-settings');
    const settingsDrawer = shadowRoot.getElementById('so-settings');
    const btnCloseSettings = shadowRoot.getElementById('so-btn-close-settings');
    const apiInput = shadowRoot.getElementById('so-input-api');
    const btnTestApi = shadowRoot.getElementById('so-btn-test-api');
    const btnSaveApi = shadowRoot.getElementById('so-btn-save-api');
    const settingsMsg = shadowRoot.getElementById('so-settings-msg');

    btnSettings.addEventListener('click', () => {
      settingsDrawer.classList.toggle('so-hidden');
      if (!settingsDrawer.classList.contains('so-hidden')) {
        apiInput.value = apiBaseUrl;
      }
    });

    btnCloseSettings.addEventListener('click', () => {
      settingsDrawer.classList.add('so-hidden');
    });

    shadowRoot.querySelectorAll('.so-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        apiInput.value = btn.getAttribute('data-url');
      });
    });

    btnTestApi.addEventListener('click', async () => {
      settingsMsg.className = 'so-settings-msg';
      settingsMsg.textContent = 'Testing connection...';
      const testUrl = apiInput.value.trim().replace(/\/+$/, '');
      try {
        const res = await fetch(`${testUrl}/api/watchlists`);
        if (res.ok) {
          settingsMsg.className = 'so-settings-msg success';
          settingsMsg.textContent = '✓ Connected successfully!';
          setConnectionStatus(true);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        settingsMsg.className = 'so-settings-msg error';
        settingsMsg.textContent = `✗ Failed: ${err.message}`;
        setConnectionStatus(false);
      }
    });

    btnSaveApi.addEventListener('click', async () => {
      const newUrl = apiInput.value.trim().replace(/\/+$/, '');
      if (newUrl) {
        apiBaseUrl = newUrl;
        try {
          if (chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({ apiBaseUrl });
          }
        } catch (e) {}
        settingsDrawer.classList.add('so-hidden');
        showToast('API URL saved');
        triggerStockDetection();
      }
    });

    // 12. Remove from All Watchlists
    const btnRemoveAll = shadowRoot.getElementById('so-btn-remove-all');
    btnRemoveAll.addEventListener('click', async () => {
      if (!currentStock || !currentStock.id) {
        showToast('No stock selected');
        return;
      }
      const hasMember = currentWatchlists.some(w => w.isMember);
      if (!hasMember) {
        showToast('Stock is not in any watchlist');
        return;
      }
      if (!confirm(`Remove ${currentStock.tvSymbol} from ALL watchlists?`)) return;

      try {
        const res = await fetch(`${apiBaseUrl}/api/extension`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'remove_all_watchlists',
            listingId: currentStock.id,
            stock_id: currentStock.id
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
        showToast(`Removed ${currentStock.tvSymbol} from all watchlists`);
        loadStockStatus(currentStock.tvSymbol);
      } catch (e) {
        showToast(`Error: ${e.message}`);
      }
    });

    // 13. Open Web App
    const btnOpenWeb = shadowRoot.getElementById('so-btn-open-web');
    btnOpenWeb.addEventListener('click', () => {
      window.open(apiBaseUrl, '_blank');
    });
  }

  // --- DRAGGABLE HELPER ---

  function initDraggable(handleEl, targetEl) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    handleEl.addEventListener('mousedown', (e) => {
      // Don't drag if clicking buttons or inputs inside header
      if (['BUTTON', 'INPUT', 'SVG', 'PATH', 'LINE', 'POLYLINE', 'CIRCLE'].includes(e.target.tagName)) {
        if (!e.target.classList.contains('so-drag-grip') && !e.target.classList.contains('so-pill-drag')) {
          return;
        }
      }

      isDragging = true;
      const rect = targetEl.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        // Viewport bounds clamping
        const maxLeft = window.innerWidth - targetEl.offsetWidth - 10;
        const maxTop = window.innerHeight - targetEl.offsetHeight - 10;

        newLeft = Math.max(10, Math.min(newLeft, maxLeft));
        newTop = Math.max(10, Math.min(newTop, maxTop));

        targetEl.style.left = `${newLeft}px`;
        targetEl.style.top = `${newTop}px`;
        targetEl.style.right = 'auto';
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          const finalRect = targetEl.getBoundingClientRect();
          savePosition(Math.round(finalRect.top), Math.round(finalRect.left));
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  // --- REAL-TIME DETECTION PIPELINE ---

  async function triggerStockDetection() {
    const detected = detectSymbol();
    if (detected && detected.tvSymbol) {
      if (detected.tvSymbol !== lastDetectedSymbol) {
        lastDetectedSymbol = detected.tvSymbol;
        await loadStockStatus(detected.tvSymbol);
      }
    } else {
      if (!currentStock) {
        loadEmptyWatchlists();
      }
    }
  }

  // --- FETCH STOCK STATUS & WATCHLISTS ---

  async function loadStockStatus(symbolQuery) {
    const bodyEl = shadowRoot.getElementById('so-watchlists-body');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
      <div class="so-loading">
        <div class="so-spinner"></div>
        <span>Syncing ${symbolQuery}...</span>
      </div>
    `;

    try {
      const res = await fetch(`${apiBaseUrl}/api/extension?symbol=${encodeURIComponent(symbolQuery)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setConnectionStatus(true);
          renderUnlistedStock(symbolQuery);
          loadEmptyWatchlists();
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setConnectionStatus(true);

      const rawStock = data.stock;
      currentStock = {
        id: rawStock.listingId || rawStock.id,
        symbol: rawStock.tradingSymbol || rawStock.symbol,
        tvSymbol: rawStock.tradingviewSymbol || rawStock.tvSymbol || rawStock.tradingSymbol || rawStock.symbol,
        name: rawStock.companyName || rawStock.name || rawStock.tradingSymbol,
        exchange: rawStock.exchange || 'NSE',
        sector: rawStock.sectorName || rawStock.sector || 'Unclassified',
        subsector: rawStock.subsectorName || rawStock.subsector || '—',
        isin: rawStock.isin || ''
      };

      currentWatchlists = (data.watchlists || []).map(w => ({
        ...w,
        totalStocks: w.stockCount !== undefined ? w.stockCount : (w.totalStocks || 0),
        currentSection: w.currentSection || (w.currentSectionId ? { id: w.currentSectionId, name: w.currentSectionName } : null),
        sections: (w.sections || []).map(sec => ({
          ...sec,
          stockCount: sec.stockCount !== undefined ? sec.stockCount : 0
        }))
      }));

      // Update Stock Card
      renderStockCard();
      // Update Watchlists list
      renderWatchlists();
      // Update Pill status
      updatePillContent();
    } catch (err) {
      console.error('[Stock Organizer] Load error:', err);
      setConnectionStatus(false);
      bodyEl.innerHTML = `
        <div class="so-loading">
          <span style="color: #f23645;">Connection failed</span>
          <button class="so-sec-btn" id="so-btn-retry">Retry</button>
        </div>
      `;
      const btnRetry = shadowRoot.getElementById('so-btn-retry');
      if (btnRetry) btnRetry.addEventListener('click', () => loadStockStatus(symbolQuery));
    }
  }

  function renderStockCard() {
    if (!currentStock) return;
    const badgeEx = shadowRoot.getElementById('so-badge-exchange');
    const txtSym = shadowRoot.getElementById('so-text-symbol');
    const txtIsin = shadowRoot.getElementById('so-text-isin');
    const txtName = shadowRoot.getElementById('so-text-name');
    const pillSec = shadowRoot.getElementById('so-pill-sector');
    const pillSub = shadowRoot.getElementById('so-pill-subsector');

    if (badgeEx) {
      badgeEx.textContent = currentStock.exchange;
      badgeEx.className = `so-exchange-badge ${currentStock.exchange.toLowerCase()}`;
    }
    if (txtSym) txtSym.textContent = currentStock.tvSymbol;
    if (txtIsin) txtIsin.textContent = currentStock.isin;
    if (txtName) txtName.textContent = currentStock.name;
    if (pillSec) pillSec.textContent = `Sector: ${currentStock.sector}`;
    if (pillSub) pillSub.textContent = `Subsector: ${currentStock.subsector}`;

    const memberCount = currentWatchlists.filter(w => w.isMember).length;
    const countPill = shadowRoot.getElementById('so-wl-summary');
    if (countPill) countPill.textContent = `${memberCount} / ${currentWatchlists.length}`;
  }

  function renderUnlistedStock(symbolQuery) {
    const badgeEx = shadowRoot.getElementById('so-badge-exchange');
    const txtSym = shadowRoot.getElementById('so-text-symbol');
    const txtIsin = shadowRoot.getElementById('so-text-isin');
    const txtName = shadowRoot.getElementById('so-text-name');
    const pillSec = shadowRoot.getElementById('so-pill-sector');
    const pillSub = shadowRoot.getElementById('so-pill-subsector');

    if (badgeEx) badgeEx.textContent = 'UNLISTED';
    if (txtSym) txtSym.textContent = symbolQuery.toUpperCase();
    if (txtIsin) txtIsin.textContent = '';
    if (txtName) txtName.textContent = 'Not listed in master database';
    if (pillSec) pillSec.textContent = 'Sector: —';
    if (pillSub) pillSub.textContent = 'Subsector: —';

    currentStock = null;
    updatePillContent();
  }

  function updatePillContent() {
    const pillSym = shadowRoot.getElementById('so-pill-symbol');
    const pillStatus = shadowRoot.getElementById('so-pill-status');
    if (!pillSym || !pillStatus) return;

    if (currentStock) {
      pillSym.textContent = currentStock.tvSymbol;
      const memberList = currentWatchlists.filter(w => w.isMember);
      if (memberList.length > 0) {
        const first = memberList[0];
        const secText = first.currentSection ? ` · ${first.currentSection.name}` : '';
        pillStatus.textContent = `✓ ${first.name}${secText}`;
        pillStatus.className = 'so-pill-badge present';
      } else {
        pillStatus.textContent = '+ Not added';
        pillStatus.className = 'so-pill-badge';
      }
    } else {
      pillSym.textContent = 'Stock Organizer';
      pillStatus.textContent = 'No stock';
      pillStatus.className = 'so-pill-badge';
    }
  }

  async function loadEmptyWatchlists() {
    try {
      const res = await fetch(`${apiBaseUrl}/api/watchlists`);
      if (res.ok) {
        const data = await res.json();
        currentWatchlists = (data.watchlists || []).map(w => ({
          ...w,
          isMember: false,
          currentSection: null,
          sections: []
        }));
        const countPill = shadowRoot.getElementById('so-wl-summary');
        if (countPill) countPill.textContent = `0 / ${currentWatchlists.length}`;
        renderWatchlists();
      }
    } catch (e) {}
  }

  // --- RENDER WATCHLISTS LIST ---

  function renderWatchlists() {
    const bodyEl = shadowRoot.getElementById('so-watchlists-body');
    if (!bodyEl) return;

    if (!currentWatchlists || currentWatchlists.length === 0) {
      bodyEl.innerHTML = '<div class="so-loading"><span>No watchlists found</span></div>';
      return;
    }

    bodyEl.innerHTML = '';

    currentWatchlists.forEach(wl => {
      const card = document.createElement('div');
      card.className = 'so-wl-card';
      card.setAttribute('data-id', wl.id);

      const isMember = !!wl.isMember;
      const secName = wl.currentSection ? wl.currentSection.name : null;

      card.innerHTML = `
        <div class="so-wl-main-row">
          <div class="so-wl-left">
            <span class="so-wl-dot" style="background-color: ${wl.color || '#2962ff'}"></span>
            <div class="so-wl-details">
              <div class="so-wl-name-row">
                <span class="so-wl-name" title="${wl.name}">${wl.name}</span>
                ${isMember && secName ? `<span class="so-sec-pill">${secName}</span>` : ''}
              </div>
              <span class="so-wl-count">${wl.totalStocks || 0} stocks</span>
            </div>
          </div>
          <div class="so-wl-right">
            ${isMember ? `
              <span class="so-badge-present">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Added</span>
              </span>
              <span class="so-chevron">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            ` : `
              <button class="so-btn-quick-add" data-action="quick-add">+ Add</button>
            `}
          </div>
        </div>

        <!-- Section Selection Drawer -->
        <div class="so-sections-drawer">
          <div class="so-sections-tip">
            <span>Assign Section</span>
            <span class="so-rule-italic">1 section per watchlist</span>
          </div>

          <div class="so-sections-list">
            <!-- Uncategorized option -->
            <div class="so-sec-item ${isMember && !wl.currentSection ? 'active' : ''}" data-sec-id="null">
              <div class="so-sec-item-left">
                <span class="so-radio-circle"><span class="so-radio-dot"></span></span>
                <span class="so-sec-item-name">Uncategorized (No section)</span>
              </div>
              <span class="so-sec-item-tag">${isMember && !wl.currentSection ? 'Current' : 'Select'}</span>
            </div>

            <!-- Custom sections -->
            ${(wl.sections || []).map(sec => {
              const isActive = isMember && wl.currentSection && wl.currentSection.id === sec.id;
              return `
                <div class="so-sec-item ${isActive ? 'active' : ''}" data-sec-id="${sec.id}">
                  <div class="so-sec-item-left">
                    <span class="so-radio-circle"><span class="so-radio-dot"></span></span>
                    <span class="so-sec-item-name">${sec.name}</span>
                  </div>
                  <span class="so-sec-item-tag">${isActive ? 'Current' : 'Select'}</span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Inline Create Section -->
          <div class="so-add-sec-row">
            <input type="text" placeholder="+ New section..." id="so-new-sec-${wl.id}">
            <button data-action="create-sec" data-wl-id="${wl.id}">Add</button>
          </div>

          ${isMember ? `
            <button class="so-remove-wl-btn" data-action="remove-wl" data-wl-id="${wl.id}">
              Remove from ${wl.name}
            </button>
          ` : ''}
        </div>
      `;

      // Quick Add Click
      const quickAdd = card.querySelector('.so-btn-quick-add');
      if (quickAdd) {
        quickAdd.addEventListener('click', (e) => {
          e.stopPropagation();
          assignStockSection(wl.id, null);
        });
      }

      // Main Row Click -> Accordion toggle
      const mainRow = card.querySelector('.so-wl-main-row');
      mainRow.addEventListener('click', () => {
        const isExp = card.classList.contains('expanded');
        shadowRoot.querySelectorAll('.so-wl-card.expanded').forEach(c => {
          if (c !== card) c.classList.remove('expanded');
        });
        card.classList.toggle('expanded', !isExp);
      });

      // Section Select Click
      card.querySelectorAll('.so-sec-item').forEach(secItem => {
        secItem.addEventListener('click', () => {
          const sId = secItem.getAttribute('data-sec-id');
          assignStockSection(wl.id, sId === 'null' ? null : sId);
        });
      });

      // Create Section Button
      const btnCreate = card.querySelector('button[data-action="create-sec"]');
      if (btnCreate) {
        btnCreate.addEventListener('click', () => {
          const inp = shadowRoot.getElementById(`so-new-sec-${wl.id}`);
          const name = inp ? inp.value.trim() : '';
          if (name) createSectionAndAssign(wl.id, name);
        });
      }

      // Remove from Watchlist Button
      const btnRemoveWl = card.querySelector('.so-remove-wl-btn');
      if (btnRemoveWl) {
        btnRemoveWl.addEventListener('click', () => {
          removeFromWatchlist(wl.id);
        });
      }

      bodyEl.appendChild(card);
    });
  }

  // --- ACTIONS (Assign, Remove, Create) ---

  async function assignStockSection(watchlistId, sectionId) {
    if (!currentStock || !currentStock.id) {
      showToast('No active stock selected');
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_section',
          watchlistId: watchlistId,
          watchlist_id: watchlistId,
          listingId: currentStock.id,
          stock_id: currentStock.id,
          sectionId: sectionId,
          section_id: sectionId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

      showToast(sectionId ? 'Assigned to section' : 'Added to watchlist');
      loadStockStatus(currentStock.tvSymbol);
    } catch (e) {
      showToast(`Error: ${e.message}`);
    }
  }

  async function createSectionAndAssign(watchlistId, sectionName) {
    if (!currentStock || !currentStock.id) return;

    try {
      const resSec = await fetch(`${apiBaseUrl}/api/extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_section',
          watchlistId: watchlistId,
          watchlist_id: watchlistId,
          name: sectionName,
          sectionName: sectionName
        })
      });

      const dataSec = await resSec.json();
      if (!resSec.ok || !dataSec.success) throw new Error(dataSec.error || 'Failed');

      const newSecId = dataSec.section.id;
      await assignStockSection(watchlistId, newSecId);
      showToast(`Created "${sectionName}" & assigned`);
    } catch (e) {
      showToast(`Error: ${e.message}`);
    }
  }

  async function removeFromWatchlist(watchlistId) {
    if (!currentStock || !currentStock.id) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_watchlist',
          watchlistId: watchlistId,
          watchlist_id: watchlistId,
          listingId: currentStock.id,
          stock_id: currentStock.id
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

      showToast('Removed from watchlist');
      loadStockStatus(currentStock.tvSymbol);
    } catch (e) {
      showToast(`Error: ${e.message}`);
    }
  }

  // --- MANUAL SEARCH ---

  async function performManualSearch(query) {
    const resultsEl = shadowRoot.getElementById('so-search-results');
    if (!resultsEl) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;

      const results = await res.json();
      if (!Array.isArray(results) || results.length === 0) {
        resultsEl.innerHTML = '<div style="padding: 8px; color: #787b86; text-align: center;">No matches found</div>';
        resultsEl.classList.remove('so-hidden');
        return;
      }

      resultsEl.innerHTML = '';
      results.slice(0, 8).forEach(item => {
        const row = document.createElement('div');
        row.className = 'so-search-item';
        row.innerHTML = `
          <div>
            <div class="so-search-sym">${item.tradingview_symbol || item.symbol}</div>
            <div class="so-search-name">${item.company_name}</div>
          </div>
          <span class="so-exchange-badge ${item.exchange ? item.exchange.toLowerCase() : 'nse'}">${item.exchange || 'NSE'}</span>
        `;

        row.addEventListener('click', () => {
          resultsEl.classList.add('so-hidden');
          shadowRoot.getElementById('so-search-wrap').classList.add('so-hidden');
          shadowRoot.getElementById('so-input-search').value = '';
          loadStockStatus(item.tradingview_symbol || item.symbol);
        });

        resultsEl.appendChild(row);
      });

      resultsEl.classList.remove('so-hidden');
    } catch (e) {
      console.warn('Search lookup failed:', e);
    }
  }

  // --- OBSERVE TRADINGVIEW SPA NAVIGATION ---

  function startTradingViewObserver() {
    // Check periodically for chart symbol changes
    setInterval(triggerStockDetection, 1500);

    // Watch document.title for ticker changes
    const titleEl = document.querySelector('title');
    if (titleEl) {
      const observer = new MutationObserver(() => triggerStockDetection());
      observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }

    window.addEventListener('popstate', triggerStockDetection);
    window.addEventListener('hashchange', triggerStockDetection);
  }

  // --- MESSAGE LISTENER FROM EXTENSION POPUP / BACKGROUND ---

  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'GET_TRADINGVIEW_SYMBOL') {
        const detected = detectSymbol();
        sendResponse({
          success: !!detected,
          data: detected ? {
            ...detected,
            url: window.location.href,
            title: document.title
          } : null
        });
        return true;
      }

      if (request.action === 'TOGGLE_FLOATING_WIDGET') {
        if (widgetState === 'expanded') {
          widgetState = 'minimized';
        } else {
          widgetState = 'expanded';
        }
        applyWidgetState();
        sendResponse({ success: true, state: widgetState });
        return true;
      }

      if (request.action === 'SHOW_FLOATING_WIDGET') {
        widgetState = 'expanded';
        applyWidgetState();
        sendResponse({ success: true, state: widgetState });
        return true;
      }
    });
  }

  // --- BOOTSTRAP ---

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initFloatingWidget();
      startTradingViewObserver();
    });
  } else {
    initFloatingWidget();
    startTradingViewObserver();
  }

})();

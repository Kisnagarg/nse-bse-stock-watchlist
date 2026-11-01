// Stock Organizer - TradingView Content Script
// Detects active stock symbol on TradingView charts & pages

(function () {
  'use strict';

  let lastDetectedSymbol = null;

  /**
   * Parse symbol string into standardized exchange & symbol
   * e.g., "NSE:RELIANCE" -> { exchange: "NSE", symbol: "RELIANCE", tvSymbol: "NSE:RELIANCE" }
   * e.g., "BSE:500325" -> { exchange: "BSE", symbol: "500325", tvSymbol: "BSE:500325" }
   */
  function normalizeSymbol(raw) {
    if (!raw) return null;
    let clean = raw.trim().toUpperCase();

    // Remove any trailing noise like "D", "1D", "IN", etc.
    clean = clean.replace(/[\s\r\n\t]+/g, ' ');

    // Match EXCHANGE:SYMBOL (e.g., NSE:RELIANCE, BSE:500325)
    const colonMatch = clean.match(/^(NSE|BSE)\s*:\s*([A-Z0-9_\-&]+)/i);
    if (colonMatch) {
      const exchange = colonMatch[1].toUpperCase();
      const symbol = colonMatch[2].toUpperCase();
      return {
        exchange,
        symbol,
        tvSymbol: `${exchange}:${symbol}`
      };
    }

    // Match exchange-dash-symbol (e.g., from URL path /symbols/NSE-RELIANCE/)
    const dashMatch = clean.match(/^(NSE|BSE)-([A-Z0-9_\-&]+)/i);
    if (dashMatch) {
      const exchange = dashMatch[1].toUpperCase();
      const symbol = dashMatch[2].toUpperCase();
      return {
        exchange,
        symbol,
        tvSymbol: `${exchange}:${symbol}`
      };
    }

    // Match purely digits -> typically BSE security code (e.g., 500325)
    if (/^\d{5,6}$/.test(clean)) {
      return {
        exchange: 'BSE',
        symbol: clean,
        tvSymbol: `BSE:${clean}`
      };
    }

    // Single ticker symbol without exchange prefix (e.g., RELIANCE, TCS)
    if (/^[A-Z0-9_\-&]{2,20}$/.test(clean)) {
      return {
        exchange: 'NSE', // Default to NSE for Indian equity tickers
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
    } catch (e) {
      // Ignore URL parse error
    }

    // 2. Try URL Pathname (e.g., /symbols/NSE-RELIANCE/ or /symbols/BSE-500325/)
    const pathMatch = window.location.pathname.match(/\/symbols\/([^\/]+)/i);
    if (pathMatch && pathMatch[1]) {
      const parsed = normalizeSymbol(decodeURIComponent(pathMatch[1]));
      if (parsed) return parsed;
    }

    // 3. Try TradingView Symbol Search Toolbar Button / Input
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

    // 4. Try Page Title (e.g., "RELIANCE Stock Chart — TradingView" or "NSE:RELIANCE Chart")
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

  /**
   * Broadcast detected symbol to storage so popup opens with instant data
   */
  function syncDetectedSymbol() {
    const detected = detectSymbol();
    if (detected) {
      const key = detected.tvSymbol;
      if (key !== lastDetectedSymbol) {
        lastDetectedSymbol = key;
        const payload = {
          ...detected,
          url: window.location.href,
          title: document.title,
          updatedAt: Date.now()
        };
        try {
          if (chrome.runtime && chrome.runtime.id) {
            chrome.storage.local.set({ lastDetectedSymbol: payload });
          }
        } catch (err) {
          // Extension context might be invalidated during reload
        }
      }
    }
  }

  // Initial detection
  syncDetectedSymbol();

  // Listen for DOM changes in title / header
  const observer = new MutationObserver(() => {
    syncDetectedSymbol();
  });

  const titleNode = document.querySelector('title');
  if (titleNode) {
    observer.observe(titleNode, { childList: true, characterData: true, subtree: true });
  }

  // Periodic poll to capture SPA route changes smoothly
  setInterval(syncDetectedSymbol, 1500);

  // Window events for SPA navigation
  window.addEventListener('popstate', syncDetectedSymbol);
  window.addEventListener('hashchange', syncDetectedSymbol);

  // Message listener for popup requests
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'GET_TRADINGVIEW_SYMBOL') {
        const result = detectSymbol();
        sendResponse({
          success: !!result,
          data: result ? {
            ...result,
            url: window.location.href,
            title: document.title
          } : null
        });
        return true;
      }
    });
  }
})();

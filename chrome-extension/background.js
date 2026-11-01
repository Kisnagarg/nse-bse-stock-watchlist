// Stock Organizer - Service Worker (Background)

const DEFAULT_API_URL = 'https://watchlist-app-sable.vercel.app';

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Stock Organizer] Extension installed or updated', details.reason);
  // Set default settings if not already present
  const stored = await chrome.storage.local.get(['apiBaseUrl']);
  if (!stored.apiBaseUrl) {
    await chrome.storage.local.set({
      apiBaseUrl: DEFAULT_API_URL
    });
  }
});

// Relay helper: query active tab's TradingView symbol
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DETECT_ACTIVE_TAB_SYMBOL') {
    (async () => {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.id) {
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }

        if (!activeTab.url || !activeTab.url.includes('tradingview.com')) {
          sendResponse({ success: false, isTradingView: false, error: 'Active tab is not TradingView' });
          return;
        }

        // Try asking content script on active tab
        try {
          const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'GET_TRADINGVIEW_SYMBOL' });
          sendResponse({ success: true, isTradingView: true, ...response });
        } catch (msgErr) {
          // If content script hasn't loaded yet, try fallback extraction via scripting API or URL parsing
          const url = new URL(activeTab.url);
          const symbolParam = url.searchParams.get('symbol');
          if (symbolParam) {
            sendResponse({
              success: true,
              isTradingView: true,
              data: {
                tvSymbol: decodeURIComponent(symbolParam),
                url: activeTab.url,
                title: activeTab.title
              }
            });
            return;
          }
          sendResponse({ success: false, isTradingView: true, error: 'Content script not responding' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});

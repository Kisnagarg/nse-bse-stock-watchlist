// Stock Organizer - TradingView Extension Popup Logic

const DEFAULT_API_URL = 'https://watchlist-app-sable.vercel.app';

let apiBaseUrl = DEFAULT_API_URL;
let currentStock = null;
let currentWatchlists = [];
let searchTimeout = null;

// DOM Elements
const connectionDot = document.getElementById('connectionDot');
const btnRefresh = document.getElementById('btnRefresh');
const btnToggleSearch = document.getElementById('btnToggleSearch');
const btnSettings = document.getElementById('btnSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const settingsDrawer = document.getElementById('settingsDrawer');
const apiUrlInput = document.getElementById('apiUrlInput');
const btnTestConn = document.getElementById('btnTestConn');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const connStatusMsg = document.getElementById('connStatusMsg');

const searchBoxWrap = document.getElementById('searchBoxWrap');
const stockSearchInput = document.getElementById('stockSearchInput');
const btnClearSearch = document.getElementById('btnClearSearch');
const searchDropdown = document.getElementById('searchDropdown');

const activeStockSection = document.getElementById('activeStockSection');
const stockExchange = document.getElementById('stockExchange');
const stockSymbol = document.getElementById('stockSymbol');
const stockIsin = document.getElementById('stockIsin');
const stockName = document.getElementById('stockName');
const stockSector = document.getElementById('stockSector');
const stockSubsector = document.getElementById('stockSubsector');

const statusBanner = document.getElementById('statusBanner');
const statusBannerText = document.getElementById('statusBannerText');

const watchlistsSummary = document.getElementById('watchlistsSummary');
const watchlistsList = document.getElementById('watchlistsList');

const btnRemoveAll = document.getElementById('btnRemoveAll');
const btnOpenWeb = document.getElementById('btnOpenWeb');

const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();

  // Load configured API URL
  try {
    const stored = await chrome.storage.local.get(['apiBaseUrl']);
    if (stored.apiBaseUrl) {
      apiBaseUrl = stored.apiBaseUrl;
    }
    apiUrlInput.value = apiBaseUrl;
  } catch (err) {
    console.error('Error loading stored settings:', err);
  }

  // Start initialization
  initDetection();
});

function setupEventListeners() {
  const btnFocusFloating = document.getElementById('btnFocusFloating');
  if (btnFocusFloating) {
    btnFocusFloating.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          await chrome.tabs.sendMessage(tab.id, { action: 'SHOW_FLOATING_WIDGET' });
          showToast('Floating widget active on chart');
          setTimeout(() => window.close(), 500);
        }
      } catch (e) {
        showToast('Open TradingView to use floating widget');
      }
    });
  }

  btnRefresh.addEventListener('click', () => {
    btnRefresh.classList.add('spinning');
    initDetection().finally(() => {
      setTimeout(() => btnRefresh.classList.remove('spinning'), 500);
    });
  });

  btnToggleSearch.addEventListener('click', () => {
    searchBoxWrap.classList.toggle('hidden');
    if (!searchBoxWrap.classList.contains('hidden')) {
      stockSearchInput.focus();
    }
  });

  btnSettings.addEventListener('click', () => {
    settingsDrawer.classList.toggle('hidden');
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsDrawer.classList.add('hidden');
  });

  // URL presets
  document.querySelectorAll('.preset-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      apiUrlInput.value = pill.getAttribute('data-url');
    });
  });

  btnTestConn.addEventListener('click', async () => {
    connStatusMsg.className = 'connection-status-msg';
    connStatusMsg.textContent = 'Testing connection...';
    const testUrl = apiUrlInput.value.trim().replace(/\/+$/, '');
    try {
      const res = await fetch(`${testUrl}/api/watchlists`, { method: 'GET' });
      if (res.ok) {
        connStatusMsg.className = 'connection-status-msg success';
        connStatusMsg.textContent = '✓ Connected successfully!';
        setConnectionStatus(true);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      connStatusMsg.className = 'connection-status-msg error';
      connStatusMsg.textContent = `✗ Failed: ${e.message}`;
      setConnectionStatus(false);
    }
  });

  btnSaveSettings.addEventListener('click', async () => {
    const newUrl = apiUrlInput.value.trim().replace(/\/+$/, '');
    if (newUrl) {
      apiBaseUrl = newUrl;
      await chrome.storage.local.set({ apiBaseUrl });
      settingsDrawer.classList.add('hidden');
      showToast('Settings saved');
      initDetection();
    }
  });

  // Search input with debounce
  stockSearchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    btnClearSearch.classList.toggle('hidden', val.length === 0);

    clearTimeout(searchTimeout);
    if (val.length < 1) {
      searchDropdown.classList.add('hidden');
      searchDropdown.innerHTML = '';
      return;
    }

    searchTimeout = setTimeout(() => {
      performStockSearch(val);
    }, 220);
  });

  btnClearSearch.addEventListener('click', () => {
    stockSearchInput.value = '';
    btnClearSearch.classList.add('hidden');
    searchDropdown.classList.add('hidden');
    searchDropdown.innerHTML = '';
  });

  // Remove from All Watchlists
  btnRemoveAll.addEventListener('click', async () => {
    if (!currentStock || !currentStock.id) {
      showToast('No active stock selected');
      return;
    }

    const hasMemberships = currentWatchlists.some(w => w.isMember);
    if (!hasMemberships) {
      showToast('Stock is not in any watchlist');
      return;
    }

    if (!confirm(`Remove ${currentStock.tvSymbol} from ALL watchlists?`)) {
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_all_watchlists',
          stock_id: currentStock.id
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove');
      }

      showToast(`Removed ${currentStock.tvSymbol} from all watchlists`);
      // Reload current stock data
      fetchStockStatus(currentStock.tvSymbol);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  });

  // Open Web App in new tab
  btnOpenWeb.addEventListener('click', () => {
    chrome.tabs.create({ url: apiBaseUrl });
  });
}

function setConnectionStatus(online) {
  connectionDot.className = `status-indicator ${online ? 'online' : 'offline'}`;
  connectionDot.title = online ? 'Connected to backend' : 'Backend offline or unreachable';
}

function showToast(msg) {
  toastMessage.textContent = msg;
  toastNotification.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toastNotification.classList.add('hidden');
  }, 2400);
}

// --- Stock Detection Pipeline ---

async function initDetection() {
  setConnectionStatus(true);
  statusBanner.classList.add('hidden');

  let detectedSymbol = null;

  try {
    // 1. Query active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('tradingview.com')) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_TRADINGVIEW_SYMBOL' });
        if (response && response.success && response.data) {
          detectedSymbol = response.data.tvSymbol || response.data.symbol;
        }
      } catch (err) {
        // Tab might be restricted or content script didn't inject yet
        console.warn('Direct tab message failed, checking fallback URL...');
        try {
          const url = new URL(tab.url);
          const symbolParam = url.searchParams.get('symbol');
          if (symbolParam) detectedSymbol = decodeURIComponent(symbolParam);
        } catch (e) {}
      }
    }

    // 2. Fallback to cached storage if active tab didn't reply
    if (!detectedSymbol) {
      const stored = await chrome.storage.local.get(['lastDetectedSymbol']);
      if (stored.lastDetectedSymbol && stored.lastDetectedSymbol.tvSymbol) {
        // Use if reasonably fresh (under 1 hour)
        if (Date.now() - (stored.lastDetectedSymbol.updatedAt || 0) < 3600000) {
          detectedSymbol = stored.lastDetectedSymbol.tvSymbol;
        }
      }
    }

    if (detectedSymbol) {
      await fetchStockStatus(detectedSymbol);
    } else {
      // Not on TradingView or no symbol detected
      statusBanner.classList.remove('hidden');
      statusBannerText.textContent = 'No TradingView chart detected in active tab. Search any stock manually below.';
      searchBoxWrap.classList.remove('hidden');
      stockSymbol.textContent = 'NO STOCK DETECTED';
      stockName.textContent = 'Use search to look up any Indian security';
      stockSector.textContent = 'Sector: —';
      stockSubsector.textContent = 'Subsector: —';
      stockIsin.textContent = '';
      loadEmptyWatchlistsList();
    }
  } catch (err) {
    console.error('Detection error:', err);
    setConnectionStatus(false);
    showToast(`Error: ${err.message}`);
    loadEmptyWatchlistsList();
  }
}

// --- Fetch Stock Status & Watchlists from Backend ---

async function fetchStockStatus(symbolQuery) {
  watchlistsList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>Loading watchlists...</span>
    </div>
  `;

  try {
    const res = await fetch(`${apiBaseUrl}/api/extension?symbol=${encodeURIComponent(symbolQuery)}`);
    if (!res.ok) {
      if (res.status === 404) {
        setConnectionStatus(true);
        statusBanner.classList.remove('hidden');
        statusBannerText.textContent = `Stock "${symbolQuery}" is not listed in master database.`;
        searchBoxWrap.classList.remove('hidden');
        stockSymbol.textContent = symbolQuery.toUpperCase();
        stockName.textContent = 'Unlisted / Unclassified';
        stockSector.textContent = 'Sector: —';
        stockSubsector.textContent = 'Subsector: —';
        stockIsin.textContent = '';
        currentStock = null;
        loadEmptyWatchlistsList();
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

    let rawWl = Array.isArray(data.watchlists) ? data.watchlists : [];
    if (rawWl.length === 0) {
      try {
        const wlRes = await fetch(`${apiBaseUrl}/api/watchlists`);
        if (wlRes.ok) {
          const wlData = await wlRes.json();
          const fetched = Array.isArray(wlData) ? wlData : (wlData.watchlists || []);
          rawWl = fetched.map(w => ({
            ...w,
            isMember: false,
            currentSection: null
          }));
        }
      } catch (e) {}
    }

    currentWatchlists = rawWl.map(w => ({
      ...w,
      totalStocks: w.stockCount !== undefined ? w.stockCount : (w.totalStocks || 0),
      currentSection: w.currentSection || (w.currentSectionId ? { id: w.currentSectionId, name: w.currentSectionName } : null),
      sections: (w.sections || []).map(sec => ({
        ...sec,
        stockCount: sec.stockCount !== undefined ? sec.stockCount : 0
      }))
    }));

    // Render Stock Details Card
    stockExchange.textContent = currentStock.exchange;
    stockExchange.className = `exchange-badge ${currentStock.exchange.toLowerCase()}`;
    stockSymbol.textContent = currentStock.tvSymbol || currentStock.symbol;
    stockIsin.textContent = currentStock.isin || '';
    stockName.textContent = currentStock.name || currentStock.symbol;
    stockSector.textContent = `Sector: ${currentStock.sector}`;
    stockSubsector.textContent = `Subsector: ${currentStock.subsector}`;

    // Summary badge
    const memberCount = currentWatchlists.filter(w => w.isMember).length;
    watchlistsSummary.textContent = `${memberCount} / ${currentWatchlists.length}`;

    // Render Watchlists
    renderWatchlistsList();
  } catch (err) {
    console.error('Fetch stock error:', err);
    setConnectionStatus(false);
    watchlistsList.innerHTML = `
      <div class="loading-state">
        <span style="color: var(--color-red)">Failed to load data</span>
        <button class="secondary-btn" id="btnRetryFetch">Retry</button>
      </div>
    `;
    const btnRetry = document.getElementById('btnRetryFetch');
    if (btnRetry) btnRetry.addEventListener('click', () => fetchStockStatus(symbolQuery));
  }
}

// Fallback watchlists view when no stock is selected
async function loadEmptyWatchlistsList() {
  try {
    const res = await fetch(`${apiBaseUrl}/api/watchlists`);
    if (res.ok) {
      const data = await res.json();
      if (currentStock && currentWatchlists.length > 0) return;
      const rawList = Array.isArray(data) ? data : (data.watchlists || []);
      currentWatchlists = rawList.map(w => ({
        ...w,
        totalStocks: w.stockCount !== undefined ? w.stockCount : (w.totalStocks || 0),
        isMember: false,
        currentSection: null,
        sections: w.sections || []
      }));
      watchlistsSummary.textContent = `0 / ${currentWatchlists.length}`;
      renderWatchlistsList();
    }
  } catch (e) {
    watchlistsList.innerHTML = '<div class="loading-state"><span>No watchlists loaded</span></div>';
  }
}

// --- Render Watchlists & Section Drawer ---

function renderWatchlistsList() {
  if (!currentWatchlists || currentWatchlists.length === 0) {
    watchlistsList.innerHTML = '<div class="loading-state"><span>No watchlists found</span></div>';
    return;
  }

  watchlistsList.innerHTML = '';

  currentWatchlists.forEach(wl => {
    const card = document.createElement('div');
    card.className = 'watchlist-card';
    card.setAttribute('data-id', wl.id);

    const isMember = !!wl.isMember;
    const currentSectionName = wl.currentSection ? wl.currentSection.name : null;

    card.innerHTML = `
      <div class="watchlist-main-row" data-action="toggle-expand">
        <div class="wl-left">
          <span class="wl-dot" style="background-color: ${wl.color || '#2962ff'}"></span>
          <div class="wl-info">
            <div class="wl-name-row">
              <span class="wl-name" title="${wl.name}">${wl.name}</span>
              ${isMember && currentSectionName ? `<span class="wl-section-pill">${currentSectionName}</span>` : ''}
            </div>
            <span class="wl-stocks-count">${wl.totalStocks || 0} stocks</span>
          </div>
        </div>
        <div class="wl-right">
          ${isMember ? `
            <span class="status-badge present">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Added</span>
            </span>
            <span class="expand-chevron">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          ` : `
            <button class="add-btn" data-action="quick-add">+ Add</button>
          `}
        </div>
      </div>
      
      <!-- Section Selection Drawer -->
      <div class="sections-drawer">
        <div class="sections-hint">
          <span>Assign Section</span>
          <span class="rule-note">1 section per watchlist</span>
        </div>
        <div class="sections-list" id="sections-${wl.id}">
          <!-- "No Section" / Default option -->
          <div class="section-item ${isMember && !wl.currentSection ? 'active' : ''}" data-action="select-section" data-sec-id="null">
            <div class="sec-left">
              <span class="sec-radio"><span class="sec-radio-dot"></span></span>
              <span class="sec-name">Uncategorized (No section)</span>
            </div>
            <div class="sec-right">
              <span class="sec-action-label">${isMember && !wl.currentSection ? 'Current' : 'Select'}</span>
            </div>
          </div>
          <!-- Custom sections -->
          ${(wl.sections || []).map(sec => {
            const isSecActive = isMember && wl.currentSection && wl.currentSection.id === sec.id;
            return `
              <div class="section-item ${isSecActive ? 'active' : ''}" data-action="select-section" data-sec-id="${sec.id}">
                <div class="sec-left">
                  <span class="sec-radio"><span class="sec-radio-dot"></span></span>
                  <span class="sec-name">${sec.name}</span>
                </div>
                <div class="sec-right">
                  <span class="sec-count">${sec.stockCount || 0}</span>
                  <span class="sec-action-label">${isSecActive ? 'Current' : 'Select'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Inline Create Section -->
        <div class="create-section-row">
          <input type="text" placeholder="+ New section name..." id="newSecInput-${wl.id}">
          <button data-action="create-section" data-wl-id="${wl.id}">Add</button>
        </div>

        ${isMember ? `
          <div class="drawer-footer-actions">
            <button class="remove-from-wl-btn" data-action="remove-wl" data-wl-id="${wl.id}">
              Remove from ${wl.name}
            </button>
          </div>
        ` : ''}
      </div>
    `;

    // Row click handlers
    const mainRow = card.querySelector('.watchlist-main-row');
    const quickAddBtn = card.querySelector('.add-btn');

    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAddStockToWatchlist(wl.id, null);
      });
    }

    mainRow.addEventListener('click', () => {
      // Toggle expanded class
      const isExpanded = card.classList.contains('expanded');
      document.querySelectorAll('.watchlist-card.expanded').forEach(c => {
        if (c !== card) c.classList.remove('expanded');
      });
      card.classList.toggle('expanded', !isExpanded);
    });

    // Section item clicks
    card.querySelectorAll('.section-item').forEach(item => {
      item.addEventListener('click', () => {
        const secId = item.getAttribute('data-sec-id');
        handleAssignSection(wl.id, secId === 'null' ? null : secId);
      });
    });

    // Create section button
    const btnCreateSec = card.querySelector('button[data-action="create-section"]');
    if (btnCreateSec) {
      btnCreateSec.addEventListener('click', () => {
        const input = document.getElementById(`newSecInput-${wl.id}`);
        const name = input ? input.value.trim() : '';
        if (name) {
          handleCreateSectionAndAssign(wl.id, name);
        }
      });
    }

    // Remove from watchlist button
    const btnRemoveWl = card.querySelector('.remove-from-wl-btn');
    if (btnRemoveWl) {
      btnRemoveWl.addEventListener('click', () => {
        handleRemoveFromWatchlist(wl.id);
      });
    }

    watchlistsList.appendChild(card);
  });
}

// --- Action Handlers ---

async function handleAddStockToWatchlist(watchlistId, sectionId) {
  if (!currentStock || !currentStock.id) {
    showToast('Select a stock first');
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
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to add');
    }

    showToast('Added to watchlist');
    fetchStockStatus(currentStock.tvSymbol || currentStock.symbol);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function handleAssignSection(watchlistId, sectionId) {
  if (!currentStock || !currentStock.id) {
    showToast('Select a stock first');
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
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to assign section');
    }

    showToast(sectionId ? 'Assigned to section' : 'Moved to Uncategorized');
    fetchStockStatus(currentStock.tvSymbol || currentStock.symbol);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function handleCreateSectionAndAssign(watchlistId, sectionName) {
  if (!currentStock || !currentStock.id) {
    showToast('Select a stock first');
    return;
  }

  try {
    // 1. Create section
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
    if (!resSec.ok || !dataSec.success) {
      throw new Error(dataSec.error || 'Failed to create section');
    }

    const newSectionId = dataSec.section.id;

    // 2. Assign stock to new section
    await handleAssignSection(watchlistId, newSectionId);
    showToast(`Created "${sectionName}" & assigned`);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function handleRemoveFromWatchlist(watchlistId) {
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
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to remove');
    }

    showToast('Removed from watchlist');
    fetchStockStatus(currentStock.tvSymbol || currentStock.symbol);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

// --- Manual Search Functionality ---

async function performStockSearch(query) {
  try {
    const res = await fetch(`${apiBaseUrl}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return;

    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
      searchDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-secondary); text-align: center;">No matching stocks found</div>';
      searchDropdown.classList.remove('hidden');
      return;
    }

    searchDropdown.innerHTML = '';
    results.slice(0, 10).forEach(stock => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `
        <div class="search-item-left">
          <span class="search-item-symbol">${stock.tradingview_symbol || stock.symbol}</span>
          <span class="search-item-name">${stock.company_name}</span>
        </div>
        <span class="search-badge ${stock.exchange ? stock.exchange.toLowerCase() : 'nse'}">${stock.exchange || 'NSE'}</span>
      `;

      item.addEventListener('click', () => {
        searchDropdown.classList.add('hidden');
        searchBoxWrap.classList.add('hidden');
        stockSearchInput.value = '';
        fetchStockStatus(stock.tradingview_symbol || stock.symbol);
      });

      searchDropdown.appendChild(item);
    });

    searchDropdown.classList.remove('hidden');
  } catch (err) {
    console.error('Search error:', err);
  }
}

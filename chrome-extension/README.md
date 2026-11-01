# Stock Organizer - TradingView In-Page Floating Widget & Extension (Manifest V3)

A high-performance Chrome extension for Indian stock market traders and investors. Seamlessly detect active **NSE** and **BSE** stocks directly on TradingView charts and organize them across your custom watchlists and sections in real-time.

Now includes an **In-Page Floating Widget** that lives directly on your TradingView chart screen!

---

## 🚀 Key Features

### 1. In-Page Floating Widget on TradingView
- **Overlay directly on Charts**: Injected onto `tradingview.com/chart/` via Shadow DOM (zero styling conflicts with TradingView).
- **Draggable Anywhere**: Drag by the header bar and drop anywhere on your screen. Remembers your preferred position across page reloads.
- **3 Dynamic States**:
  - **Expanded Window**: Full watchlist and section organizer with stock details, search, and section managers.
  - **Minimized Floating Pill**: Ultra-compact badge (`[ 📈 NSE:RELIANCE · In Leading ▾ ]`) taking up minimal chart real estate.
  - **Docked Edge Tab**: Subtle edge tab on the right side if closed, ready to slide back in on click.
- **Instant Hotkey**: Press **`Alt + Shift + S`** anytime inside TradingView to toggle the floating widget!

### 2. Automatic Real-Time Stock Detection
- **Auto-Syncs with Chart Changes**: When you click stocks in your TradingView list or type a new ticker, the floating widget automatically detects the change and updates stock details and watchlist memberships instantly.
- **NSE & BSE Dual Support**: Recognizes NSE symbols (`NSE:RELIANCE`, `NSE:TCS`, `NSE:HAL`) and BSE codes (`BSE:500325`, `BSE:532540`).

### 3. Watchlist & Section Management
- **Strict Single-Section Rule**: Enforces that **a stock belongs to at most one section per watchlist** (or Uncategorized).
- **One-Click Actions**:
  - `+ Add` button to add immediately to a watchlist.
  - Expand any watchlist card to view sections (*Strong Momentum*, *Near Breakout*, etc.).
  - Radio indicators showing the currently assigned section.
  - *Remove from Section* (moves back to Uncategorized).
  - *Remove from Watchlist*.
  - Inline **+ New Section** input to create custom sections right on the chart.
- **Bulk Action**: *Remove from All Watchlists* button with confirmation protection.
- **Manual Stock Search**: Debounced search dropdown across all 2,012 stocks in your master database.

---

## 📦 How to Install in Google Chrome

1. Open **Google Chrome**.
2. Navigate to `chrome://extensions/` in your address bar.
3. Toggle on **Developer mode** in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. In the file picker, select this extension folder:
   ```
   /Users/kisna/Desktop/projects/watchlist manage/chrome-extension
   ```
6. The extension **Stock Organizer** will now appear in your Chrome toolbar!
7. *(Recommended)* Click Chrome's **Extensions puzzle piece icon** in the toolbar and pin **Stock Organizer**.

---

## ⚙️ Configuration & Backend Setup

The extension connects to the **Stock Organizer** web API.

1. Click the extension icon or the gear icon on the floating widget.
2. Choose your backend:
   - **Vercel (Production)**: `https://watchlist-app-sable.vercel.app` (Default)
   - **Localhost (Dev)**: `http://localhost:3000`
3. Click **Test Ping** to verify connectivity (shows green check).
4. Click **Save**.

---

## 🎯 How to Use on TradingView

1. Go to [TradingView Chart](https://in.tradingview.com/chart/) or [tradingview.com/chart](https://www.tradingview.com/chart/).
2. Notice the **Stock Organizer Floating Widget** right on your chart screen!
3. Click any stock or type any symbol (`RELIANCE`, `TCS`, `500325`).
4. The floating widget instantly identifies the stock and displays its verified details and current watchlist assignments.
5. Click `—` to collapse into a compact floating pill, or drag it to any corner of your monitor.
6. Press **`Alt + Shift + S`** anytime to quickly toggle the widget!

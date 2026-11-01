# Stock Organizer - TradingView Chrome Extension (Manifest V3)

A high-performance Chrome extension for Indian stock market traders and investors. Seamlessly detect active **NSE** and **BSE** stocks directly on TradingView charts and organize them across your custom watchlists and sections in real-time.

---

## 🚀 Key Features

- **Automatic TradingView Stock Detection**:
  - Automatically identifies the active symbol from TradingView chart URLs (`?symbol=NSE:RELIANCE`), symbol pages, and DOM elements.
  - Full support for both **NSE** (`NSE:RELIANCE`, `NSE:TCS`, `NSE:HAL`) and **BSE** (`BSE:500325`, `BSE:532540`) tickers.
  - Monitors TradingView's Single-Page Application (SPA) navigation without requiring page reloads.
- **Master Stock Details**:
  - Displays verified company name, ISIN, exchange badge, sector, and subsector classifications.
- **Fast Watchlist & Section Management**:
  - Displays all user watchlists and current membership status.
  - **Strict Section Rule**: A stock belongs to at most **one section** per watchlist (or Uncategorized).
  - One-click assign, move between sections, or remove from sections.
  - Inline **+ New Section** creation directly from the extension popup.
- **Manual Stock Search**:
  - Live debounced lookup across the complete 2,000+ Indian stock master database.
  - Quick fallback when viewing non-TradingView tabs.
- **TradingView Dark Theme**:
  - Compact, information-dense 375px popup layout matching TradingView's visual aesthetics.
- **Dual API Support**:
  - Connects to your live cloud deployment on Vercel or your local development server (`http://localhost:3000`).

---

## 📦 How to Install in Google Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in your address bar.
3. Toggle on **Developer mode** in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. In the file picker, select this extension folder:
   ```
   /Users/kisna/Desktop/projects/watchlist manage/chrome-extension
   ```
6. The extension **Stock Organizer** will now appear in your Chrome toolbar!
7. *(Recommended)* Click Chrome's **Extensions puzzle piece icon** in the toolbar and pin **Stock Organizer** for easy 1-click access.

---

## ⚙️ Configuration & Backend Setup

The extension connects to the **Stock Organizer** web API.

1. Click the extension icon in Chrome.
2. Click the **Settings (gear icon)** in the top right of the popup.
3. Choose your backend:
   - **Vercel (Production)**: `https://watchlist-app-sable.vercel.app` (Default)
   - **Localhost (Dev)**: `http://localhost:3000`
4. Click **Test Ping** to verify connectivity (shows green check).
5. Click **Save**.

---

## 🎯 How to Use on TradingView

1. Go to [TradingView](https://in.tradingview.com/chart/) or [tradingview.com/chart](https://www.tradingview.com/chart/).
2. Open any Indian stock chart (e.g., `NSE:RELIANCE`, `NSE:TCS`, `BSE:500325`).
3. Click the **Stock Organizer** extension icon in your Chrome toolbar.
4. The extension instantly detects the active stock and displays its verified details and current watchlist assignments.
5. Click **+ Add** next to any watchlist to add the stock, or expand the watchlist card to assign it to a specific section (e.g., *Leading*, *Breakout*, *Laggards*).
6. Changes sync immediately to your master database!

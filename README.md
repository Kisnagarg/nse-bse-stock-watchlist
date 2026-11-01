# NSE + BSE Stock Watchlist Management Platform

A high-performance, TradingView-inspired web application for organizing, classifying, and managing thousands of Indian stock market securities (NSE & BSE equities).

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Drizzle ORM**, **SQLite (WAL mode)**, **@dnd-kit**, and **Papa Parse**.

---

## Quick Start & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup & Seed
```bash
npx tsx src/lib/db/seed.ts
npx tsx src/lib/db/enrich-stocks.ts
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

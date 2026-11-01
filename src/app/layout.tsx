import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradingView Watchlist | NSE & BSE Market Hub",
  description: "Production-ready NSE + BSE stock watchlist management and classification platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

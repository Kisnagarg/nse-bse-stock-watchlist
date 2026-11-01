import Papa from 'papaparse';

export interface ClassificationRecord {
  symbol: string;        // Raw symbol (e.g., "RELIANCE")
  nseSymbol: string;     // e.g., "NSE:RELIANCE"
  subsector: string;
  sector: string;
}

export interface ParseResult {
  records: ClassificationRecord[];
  errors: string[];
  totalRows: number;
}

export function parseClassificationCSV(csvContent: string): ParseResult {
  const records: ClassificationRecord[] = [];
  const errors: string[] = [];
  
  // Normalize Windows line endings
  const normalized = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const result = Papa.parse(normalized, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().replace(/"/g, ''),
  });
  
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i] as Record<string, string>;
    
    // Find the symbol column - could be 'Symbol' or first column
    const symbolKey = Object.keys(row).find(k => 
      k.toLowerCase().includes('symbol') && !k.includes(':')
    ) || Object.keys(row)[0];
    
    // Find the NSE:Symbol column
    const nseKey = Object.keys(row).find(k => 
      k.includes('NSE:') || k.includes('nse:')
    );
    
    // Find sector/subsector
    const subsectorKey = Object.keys(row).find(k => 
      k.toLowerCase().includes('subsector')
    );
    const sectorKey = Object.keys(row).find(k => 
      k.toLowerCase() === 'sector' || (k.toLowerCase().includes('sector') && !k.toLowerCase().includes('sub'))
    );
    
    const rawSymbol = row[symbolKey!]?.trim();
    if (!rawSymbol) {
      errors.push(`Row ${i + 2}: Missing symbol`);
      continue;
    }
    
    // Clean the NSE symbol - remove trailing commas
    let nseSymbol = '';
    if (nseKey && row[nseKey]) {
      nseSymbol = row[nseKey].trim().replace(/,+$/, '').trim();
    } else {
      nseSymbol = `NSE:${rawSymbol}`;
    }
    
    const subsector = row[subsectorKey!]?.trim() || '';
    const sector = row[sectorKey!]?.trim() || '';
    
    if (!sector && !subsector) {
      errors.push(`Row ${i + 2}: Missing sector and subsector for ${rawSymbol}`);
      continue;
    }
    
    records.push({
      symbol: rawSymbol.replace(/^(NSE:|BSE:)/i, ''),
      nseSymbol: nseSymbol.startsWith('NSE:') ? nseSymbol : `NSE:${nseSymbol}`,
      subsector,
      sector,
    });
  }
  
  return {
    records,
    errors,
    totalRows: result.data.length,
  };
}

export interface StockImportRecord {
  exchange: 'NSE' | 'BSE';
  tradingSymbol: string;
  companyName: string;
  isin?: string;
  securityCode?: string;
}

export function parseStockUniverseCSV(csvContent: string): { records: StockImportRecord[]; errors: string[] } {
  const records: StockImportRecord[] = [];
  const errors: string[] = [];
  
  const normalized = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const result = Papa.parse(normalized, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });
  
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i] as Record<string, string>;
    const headers = Object.keys(row).map(h => h.toLowerCase());
    
    // Try to detect exchange
    const symbolCol = Object.keys(row).find(k => k.toLowerCase().includes('symbol') || k.toLowerCase().includes('ticker'));
    const nameCol = Object.keys(row).find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('company'));
    const isinCol = Object.keys(row).find(k => k.toLowerCase().includes('isin'));
    const codeCol = Object.keys(row).find(k => k.toLowerCase().includes('code') || k.toLowerCase().includes('scrip'));
    
    const rawSymbol = symbolCol ? row[symbolCol]?.trim() : '';
    if (!rawSymbol) continue;
    
    let exchange: 'NSE' | 'BSE' = 'NSE';
    let tradingSymbol = rawSymbol;
    
    if (rawSymbol.startsWith('NSE:')) {
      exchange = 'NSE';
      tradingSymbol = rawSymbol.replace('NSE:', '');
    } else if (rawSymbol.startsWith('BSE:')) {
      exchange = 'BSE';
      tradingSymbol = rawSymbol.replace('BSE:', '');
    } else if (/^\d+$/.test(rawSymbol)) {
      exchange = 'BSE';
    }
    
    records.push({
      exchange,
      tradingSymbol: tradingSymbol.replace(/,+$/, '').trim(),
      companyName: nameCol ? (row[nameCol]?.trim() || tradingSymbol) : tradingSymbol,
      isin: isinCol ? row[isinCol]?.trim() : undefined,
      securityCode: codeCol ? row[codeCol]?.trim() : undefined,
    });
  }
  
  return { records, errors };
}

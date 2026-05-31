import logger from "../utils/logger.js";

// In-memory cache to avoid hammering Yahoo Finance
const cache = new Map();
const CACHE_TTL = 5000; // 5 seconds

const getCached = (key) => {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, ts: Date.now() });
};

// Add market suffix for Indian stocks
export const formatSymbol = (symbol, market) => {
  const s = symbol.toUpperCase().trim();
  if (market === "INDIA") {
    if (!s.endsWith(".NS") && !s.endsWith(".BO")) return s + ".NS";
  }
  return s;
};

// Search stocks by query
export const searchStocks = async (query, market = "USA") => {
  const cacheKey = `search:${query}:${market}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Bias Yahoo toward the right region/lang and request more results so that
    // post-filtering by market still yields plenty of equities.
    const region = market === "INDIA" ? "IN" : "US";
    const lang = market === "INDIA" ? "en-IN" : "en-US";
    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=50&newsCount=0&region=${region}&lang=${lang}`
    );
    if (!res.ok) throw new Error("Search fetch failed");
    const result = await res.json();

    let quotes = (result.quotes || [])
      .filter((q) => q.quoteType === "EQUITY" && q.symbol)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange || "",
        market: q.symbol.endsWith(".NS") || q.symbol.endsWith(".BO") ? "INDIA" : "USA",
      }));

    // Filter by market
    if (market === "INDIA") {
      quotes = quotes.filter(
        (q) => q.symbol.endsWith(".NS") || q.symbol.endsWith(".BO")
      );
    } else if (market === "USA") {
      quotes = quotes.filter(
        (q) => !q.symbol.endsWith(".NS") && !q.symbol.endsWith(".BO") && !q.symbol.includes(".")
      );
    }
    // BOTH = no filter

    // Prefer .NS over .BO duplicates (same company on two exchanges).
    if (market === "INDIA" || market === "BOTH") {
      const seen = new Set();
      const deduped = [];
      for (const q of quotes) {
        const base = q.symbol.replace(/\.(NS|BO)$/, "");
        if (q.symbol.endsWith(".BO") && seen.has(base + ".NS")) continue;
        seen.add(q.symbol);
        deduped.push(q);
      }
      quotes = deduped;
    }

    const limited = quotes.slice(0, 25);
    setCache(cacheKey, limited);
    return limited;
  } catch (err) {
    logger.error("Stock search error:", err.message);
    return [];
  }
};

// Get real-time quote
export const getQuote = async (symbol) => {
  const cacheKey = `quote:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Try Finnhub if key exists (skip indices like ^GSPC and non-US symbols)
    if (
      process.env.FINNHUB_API_KEY &&
      !symbol.startsWith("^") &&
      !symbol.includes(".")
    ) {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
        if (res.ok) {
          const f = await res.json();
          // Finnhub returns { c: current, d: change, dp: percent change, h: high, l: low, o: open, pc: previous close }
          if (f.c && f.c > 0) {
            const data = {
              symbol,
              name: symbol,
              price: f.c,
              change: f.d || (f.c - f.pc),
              changePct: f.dp || ((f.c - f.pc) / f.pc * 100),
              high: f.h || 0,
              low: f.l || 0,
              open: f.o || 0,
              prevClose: f.pc || 0,
              volume: 0,
              marketCap: 0,
              currency: "USD",
              exchange: "",
            };
            setCache(cacheKey, data);
            return data;
          }
        }
      } catch (e) {
        logger.warn("Finnhub API failed, falling back to Yahoo", e.message);
      }
    }

    // Fallback to Yahoo Chart endpoint
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
    if (!res.ok) throw new Error("Quote fetch failed");
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || price;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    
    const indicators = result.indicators?.quote?.[0] || {};
    const dayHigh = meta.regularMarketDayHigh || (indicators.high ? indicators.high[0] : price);
    const dayLow = meta.regularMarketDayLow || (indicators.low ? indicators.low[0] : price);
    const dayOpen = indicators.open ? indicators.open[0] : price;

    const quoteData = {
      symbol: meta.symbol,
      name: meta.longName || meta.shortName || meta.symbol,
      price: price,
      change: change,
      changePct: changePct,
      high: dayHigh || 0,
      low: dayLow || 0,
      open: dayOpen || 0,
      prevClose: prevClose,
      volume: meta.regularMarketVolume || 0,
      marketCap: 0,
      currency: meta.currency || "USD",
      exchange: meta.exchangeName || "",
    };
    
    setCache(cacheKey, quoteData);
    return quoteData;
  } catch (err) {
    logger.error("Quote error for", symbol, ":", err.message);
    return null;
  }
};

// Get multiple quotes at once
export const getMultipleQuotes = async (symbols) => {
  const results = {};
  const promises = symbols.map(async (s) => {
    const data = await getQuote(s);
    if (data) results[s] = data;
  });
  await Promise.allSettled(promises);
  return results;
};

// Get historical chart data for charts
export const getChartData = async (symbol, interval = "1d", range = "1mo") => {
  const cacheKey = `chart:${symbol}:${interval}:${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);
    if (!response.ok) throw new Error("Failed to fetch chart data");
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result || !result.timestamp) return [];

    const quotes = result.timestamp.map((t, i) => {
      return {
        time: new Date(t * 1000).toISOString(),
        open: result.indicators.quote[0].open[i],
        high: result.indicators.quote[0].high[i],
        low: result.indicators.quote[0].low[i],
        close: result.indicators.quote[0].close[i],
        volume: result.indicators.quote[0].volume[i]
      };
    }).filter(q => q.close !== null); // Filter out nulls

    setCache(cacheKey, quotes);
    return quotes;
  } catch (err) {
    logger.error("Chart data error for", symbol, ":", err.message);
    return [];
  }
};

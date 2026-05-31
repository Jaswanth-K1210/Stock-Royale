// English-only business news YouTube channels with regular live broadcasts.
// The backend's /api/news/live endpoint resolves each channel's current live
// video ID (the legacy embed/live_stream?channel=… URL no longer reliably plays).
export const BROADCAST_CHANNELS = [
  // ── Global / USA ─────────────────────────────────────────────
  // liveVideoId, when set, embeds that exact stream and skips the auto-resolver.
  // Use it to pin a channel to a specific known-good live URL. When that stream
  // ends, clear liveVideoId and the resolver will take over again.
  {
    key: "bloomberg",
    name: "Bloomberg Television",
    market: "USA",
    channelId: "UCIALMKvObZNtJ6AmdCLP7Lg",
    liveVideoId: "iEpJwprxDdk",
    accent: "#FE8C00",
  },
  {
    key: "cnbc_us",
    name: "CNBC Television",
    market: "USA",
    channelId: "UCrp_UI8XtuYfpiqluWLD7Lw",
    accent: "#005EB8",
  },
  {
    key: "yahoo_finance",
    name: "Yahoo Finance",
    market: "USA",
    channelId: "UCEAZeUIeJs0IjQiqTCdVSIg",
    liveVideoId: "KQp-e_XQnDE",
    accent: "#7B61FF",
  },
  {
    key: "reuters",
    name: "Reuters",
    market: "USA",
    channelId: "UChqUTb7kYRX8-EiaN3XFrSQ",
    accent: "#FF8000",
  },
  {
    key: "fox_business",
    name: "Fox Business",
    market: "USA",
    channelId: "UCCXoCcu9Rp7NPbTzIvogpZg",
    accent: "#0066CC",
  },
  {
    key: "al_jazeera",
    name: "Al Jazeera English",
    market: "USA",
    channelId: "UCNye-wNBqNL5ZzHSJj3l8Bg",
    liveVideoId: "gCNeDWCI0vo",
    accent: "#FA9000",
  },
  // ── India (English) ─────────────────────────────────────────
  {
    key: "ndtv_profit",
    name: "NDTV Profit",
    market: "INDIA",
    channelId: "UC3uJIdRFTGgLWrUziaHbzrg",
    liveVideoId: "02I30AzaljY",
    accent: "#E20613",
  },
  {
    key: "cnbc_tv18",
    name: "CNBC-TV18",
    market: "INDIA",
    channelId: "UCmRbHAgG2k2vDUvb3xsEunQ",
    liveVideoId: "P857H4ej-MQ",
    accent: "#FFB400",
  },
  {
    key: "et_now",
    name: "ET Now",
    market: "INDIA",
    channelId: "UCWmUOYVa7ETRkJ63YaZRhhA",
    accent: "#E10A6A",
  },
  {
    key: "business_today",
    name: "Business Today TV",
    market: "INDIA",
    channelId: "UCxTtau4q4SXhWXj28Sm12ag",
    accent: "#C72031",
  },
];

export const ARTICLE_PROVIDERS = [
  { key: "rss", name: "RSS Feeds (Yahoo, MarketWatch, CNBC…)" },
  { key: "yahoo", name: "Yahoo Finance" },
  { key: "alphavantage", name: "Alpha Vantage" },
  { key: "finnhub", name: "Finnhub" },
  { key: "stocknews", name: "StockNewsAPI" },
  { key: "marketaux", name: "Marketaux" },
  { key: "fmp", name: "FMP" },
  { key: "newsdata", name: "NewsData" },
  // Indian-news scrapers (only active when market=INDIA / BOTH)
  { key: "googlenews_in", name: "Google News (India)", market: "INDIA" },
  { key: "moneycontrol_in", name: "Moneycontrol (India)", market: "INDIA" },
  { key: "economictimes_in", name: "Economic Times (India)", market: "INDIA" },
  { key: "livemint_in", name: "LiveMint (India)", market: "INDIA" },
];

export const DEFAULT_INTEL_SETTINGS = {
  version: 5,
  sources: {
    rss: true,
    yahoo: true,
    alphavantage: true,
    finnhub: true,
    stocknews: true,
    marketaux: false,
    fmp: false,
    newsdata: false,
    googlenews_in: true,
    moneycontrol_in: true,
    economictimes_in: true,
    livemint_in: true,
  },
  channels: {
    bloomberg: true,
    cnbc_us: true,
    yahoo_finance: true,
    reuters: true,
    fox_business: true,
    al_jazeera: true,
    cnbc_tv18: true,
    et_now: true,
    ndtv_profit: true,
    business_today: true,
  },
  maxAgeHours: 12,
  refreshIntervalSec: 60,
  defaultTab: "WIRE",
};

const STORAGE_KEY = "stockroyale.intel.settings.v1";

export const loadIntelSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INTEL_SETTINGS };
    const parsed = JSON.parse(raw);
    // On version bump, reset sources to defaults (so disabled-by-default
    // providers like marketaux/fmp don't stay on for upgrading users).
    if ((parsed.version || 1) < DEFAULT_INTEL_SETTINGS.version) {
      return {
        ...DEFAULT_INTEL_SETTINGS,
        channels: { ...DEFAULT_INTEL_SETTINGS.channels, ...(parsed.channels || {}) },
      };
    }
    return {
      ...DEFAULT_INTEL_SETTINGS,
      ...parsed,
      sources: { ...DEFAULT_INTEL_SETTINGS.sources, ...(parsed.sources || {}) },
      channels: { ...DEFAULT_INTEL_SETTINGS.channels, ...(parsed.channels || {}) },
    };
  } catch {
    return { ...DEFAULT_INTEL_SETTINGS };
  }
};

export const saveIntelSettings = (s) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
};

/* ── News market preference (USA / INDIA / BOTH) ──────────────*/
const MARKET_PREF_KEY = "stockroyale.news.market.v1";

export const loadNewsMarket = () => {
  try {
    const v = localStorage.getItem(MARKET_PREF_KEY);
    if (v === "USA" || v === "INDIA" || v === "BOTH") return v;
  } catch {
    /* ignore */
  }
  return "USA";
};

export const saveNewsMarket = (m) => {
  try {
    localStorage.setItem(MARKET_PREF_KEY, m);
  } catch {
    /* ignore */
  }
};

import * as cheerio from "cheerio";
import logger from "../utils/logger.js";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept-Language": "en-IN,en;q=0.9",
};

/* ── Per-provider fetchers ──────────────────────────────────────
 * Each returns Promise<NewsItem[]> where NewsItem =
 *   { title, source, url, publishedAt, provider }
 * They never throw — failure is logged and resolves to [].
 * ───────────────────────────────────────────────────────────────*/

/* ── Provider cooldown: skip providers that recently failed ────
 * After N consecutive failures, skip the provider for COOLDOWN_MS.
 * Prevents hammering rate-limited / expired-key providers every minute.
 * ───────────────────────────────────────────────────────────────*/
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 10 * 60 * 1000;
const providerHealth = new Map(); // label -> { failures, cooldownUntil }

const isOnCooldown = (label) => {
  const h = providerHealth.get(label);
  return h?.cooldownUntil && Date.now() < h.cooldownUntil;
};

const recordSuccess = (label) => {
  providerHealth.delete(label);
};

const recordFailure = (label) => {
  const h = providerHealth.get(label) || { failures: 0, cooldownUntil: 0 };
  h.failures += 1;
  if (h.failures >= FAILURE_THRESHOLD) {
    h.cooldownUntil = Date.now() + COOLDOWN_MS;
    logger.warn(`${label} hit ${h.failures} failures — cooling down for ${COOLDOWN_MS / 60000}m`);
    h.failures = 0;
  }
  providerHealth.set(label, h);
};

const safeFetch = async (label, url, opts) => {
  if (isOnCooldown(label)) return null;
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    recordSuccess(label);
    return json;
  } catch (e) {
    logger.warn(`${label} failed: ${e.message}`);
    recordFailure(label);
    return null;
  }
};

const safeFetchText = async (label, url, opts) => {
  if (isOnCooldown(label)) return null;
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    recordSuccess(label);
    return text;
  } catch (e) {
    logger.warn(`${label} failed: ${e.message}`);
    recordFailure(label);
    return null;
  }
};

export const fetchMarketaux = async ({ symbol, mxCountry }) => {
  if (!process.env.MARKETAUX_API_KEY) return [];
  const symbolQuery = symbol === "%5EGSPC" ? "SPY" : symbol;
  const url = `https://api.marketaux.com/v1/news/all?symbols=${symbolQuery}&countries=${mxCountry}&filter_entities=true&limit=20&api_token=${process.env.MARKETAUX_API_KEY}`;
  const data = await safeFetch("Marketaux", url);
  if (!data?.data) return [];
  return data.data.map((n) => ({
    title: n.title,
    source: n.source,
    url: n.url,
    publishedAt: n.published_at,
    provider: "marketaux",
  }));
};

export const fetchAlphaVantage = async ({ symbol }) => {
  if (!process.env.ALPHAVANTAGE_API_KEY) return [];
  const symbolQuery = symbol === "%5EGSPC" ? "SPY" : symbol;
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbolQuery}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`;
  const data = await safeFetch("Alpha Vantage", url);
  if (!data?.feed) return [];
  return data.feed.slice(0, 20).map((n) => ({
    title: n.title,
    source: n.source,
    url: n.url,
    publishedAt: n.time_published.replace(
      /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
      "$1-$2-$3T$4:$5:$6Z"
    ),
    provider: "alphavantage",
  }));
};

export const fetchFinnhub = async ({ symbol }) => {
  if (!process.env.FINNHUB_API_KEY) return [];
  const symbolQuery = symbol === "%5EGSPC" ? "SPY" : symbol;
  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const url = `https://finnhub.io/api/v1/company-news?symbol=${symbolQuery}&from=${fromDate}&to=${toDate}&token=${process.env.FINNHUB_API_KEY}`;
  const data = await safeFetch("Finnhub", url);
  if (!Array.isArray(data)) return [];
  return data.slice(0, 20).map((n) => ({
    title: n.headline,
    source: n.source,
    url: n.url,
    publishedAt: new Date(n.datetime * 1000).toISOString(),
    provider: "finnhub",
  }));
};

export const fetchFMP = async ({ symbol }) => {
  if (!process.env.FMP_API_KEY) return [];
  const symbolQuery = symbol === "%5EGSPC" ? "SPY" : symbol;
  const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbolQuery}&limit=20&apikey=${process.env.FMP_API_KEY}`;
  const data = await safeFetch("FMP", url);
  if (!Array.isArray(data)) return [];
  return data.map((n) => ({
    title: n.title,
    source: n.site,
    url: n.url,
    publishedAt: n.publishedDate,
    provider: "fmp",
  }));
};

export const fetchStockNewsAPI = async ({ symbol }) => {
  if (!process.env.STOCKNEWS_API_KEY) return [];
  const symbolQuery = symbol === "%5EGSPC" ? "SPY" : symbol;
  const url = `https://stocknewsapi.com/api/v1?tickers=${symbolQuery}&items=20&token=${process.env.STOCKNEWS_API_KEY}`;
  const data = await safeFetch("StockNewsAPI", url);
  if (!data?.data) return [];
  return data.data.map((n) => ({
    title: n.title,
    source: n.source_name,
    url: n.news_url,
    publishedAt: new Date(n.date).toISOString(),
    provider: "stocknews",
  }));
};

export const fetchNewsData = async ({ symbol, mxCountry }) => {
  if (!process.env.NEWSDATA_API_KEY) return [];
  const q = symbol.replace(".NS", "").replace(".BO", "").replace("%5EGSPC", "market");
  const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&country=${mxCountry}&category=business&q=${q}`;
  const data = await safeFetch("NewsData", url);
  if (!data?.results) return [];
  return data.results.map((n) => ({
    title: n.title,
    source: n.source_id || "NewsData",
    url: n.link,
    publishedAt: new Date(n.pubDate).toISOString(),
    provider: "newsdata",
  }));
};

export const fetchYahoo = async ({ symbol, yhLang, yhRegion }) => {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=20&lang=${yhLang}&region=${yhRegion}`;
  const data = await safeFetch("Yahoo", url);
  if (!data?.news) return [];
  return data.news.map((n) => ({
    title: n.title,
    source: n.publisher,
    url: n.link,
    publishedAt: new Date(n.providerPublishTime * 1000).toISOString(),
    provider: "yahoo",
  }));
};

/* ── RSS providers (no API key, free) ──────────────────────────*/
const parseRssItems = (xml) => {
  if (!xml) return [];
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  const stripCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
  const tag = (block, name) => {
    const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    return m ? stripCdata(m[1]) : "";
  };
  for (const b of blocks) {
    const title = tag(b, "title");
    const link = tag(b, "link");
    const pubDate = tag(b, "pubDate") || tag(b, "dc:date");
    if (!title || !link) continue;
    items.push({ title, link, pubDate });
  }
  return items;
};

const RSS_FEEDS = {
  USA: [
    { label: "Yahoo Finance", source: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex" },
    { label: "MarketWatch", source: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
    { label: "CNBC Top News", source: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
    { label: "CNBC Markets", source: "CNBC", url: "https://www.cnbc.com/id/15839069/device/rss/rss.html" },
    { label: "Investing.com", source: "Investing.com", url: "https://www.investing.com/rss/news.rss" },
  ],
  INDIA: [
    { label: "Moneycontrol", source: "Moneycontrol", url: "https://www.moneycontrol.com/rss/MCtopnews.xml" },
    { label: "Economic Times Markets", source: "Economic Times", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
    { label: "Business Standard", source: "Business Standard", url: "https://www.business-standard.com/rss/markets-106.rss" },
    { label: "LiveMint Markets", source: "LiveMint", url: "https://www.livemint.com/rss/markets" },
  ],
};

const safeIso = (raw) => {
  const t = new Date(raw || Date.now()).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
};

export const fetchRSS = async ({ market = "USA" } = {}) => {
  const feeds = RSS_FEEDS[market] || RSS_FEEDS.USA;
  const tasks = feeds.map(async (f) => {
    const xml = await safeFetchText(`RSS:${f.label}`, f.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
    });
    if (!xml) return [];
    return parseRssItems(xml).slice(0, 15).map((n) => ({
      title: n.title,
      source: f.source,
      url: n.link,
      publishedAt: safeIso(n.pubDate),
      provider: "rss",
    }));
  });
  const results = await Promise.allSettled(tasks);
  const out = [];
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
};

/* ── YouTube live resolver ──────────────────────────────────────
 * The `youtube.com/embed/live_stream?channel=ID` URL no longer
 * reliably resolves to a playable stream. Instead we fetch the
 * channel's /live page and extract the current live video id, which
 * embeds reliably via youtube.com/embed/<videoId>.
 * Resolves to { videoId, isLive } | null. Cached briefly.
 * ───────────────────────────────────────────────────────────────*/
const liveCache = new Map(); // channelId -> { value, expiresAt }
// Cache a found stream for 5 min (cheap re-use) but cache a "no stream" answer
// for only 60s so a channel going live is picked up quickly.
const LIVE_CACHE_TTL_HIT_MS = 5 * 60 * 1000;
const LIVE_CACHE_TTL_MISS_MS = 60 * 1000;

// Pull the live video id out of a channel's /live page. When a channel is
// offline, YouTube redirects /live to the channel home page (whose canonical
// points at /channel/… not /watch?v=…), so we only trust a videoId that sits
// inside the `videoDetails` block AND is flagged live. Falls back to the
// canonical <link> only when it is also marked live. Mirrors the extraction
// used by worldmonitor's youtube/live edge function.
const extractLiveVideo = (html) => {
  if (!html) return null;

  // 1) ytInitialPlayerResponse.videoDetails — the authoritative source.
  const detailsIdx = html.indexOf('"videoDetails"');
  if (detailsIdx !== -1) {
    const block = html.slice(detailsIdx, detailsIdx + 5000);
    const vid = block.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const live = /"isLiveContent":true/.test(block) || /"isLive":true/.test(block);
    if (vid && live) {
      const hls = html.match(/"hlsManifestUrl":"([^"]+)"/);
      return {
        videoId: vid[1],
        isLive: true,
        hlsUrl: hls ? hls[1].replace(/\\u0026/g, "&") : null,
      };
    }
  }

  // 2) Canonical watch link, but only if the page also reports a live stream.
  const canonical = html.match(
    /<link\s+rel="canonical"\s+href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/i
  );
  if (canonical && /"isLiveNow":true|"isLive":true/.test(html)) {
    return { videoId: canonical[1], isLive: true, hlsUrl: null };
  }

  return null;
};

export const resolveLiveVideo = async (channelOrHandle) => {
  if (!channelOrHandle) return null;
  const cached = liveCache.get(channelOrHandle);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  // Accept either a UC… channel id or an @handle. Handles resolve more
  // reliably than channel ids on YouTube's /live route.
  const path = channelOrHandle.startsWith("@")
    ? channelOrHandle
    : `channel/${channelOrHandle}`;
  const url = `https://www.youtube.com/${path}/live`;
  const html = await safeFetchText(`YT:${channelOrHandle}`, url, { headers: BROWSER_HEADERS });

  const value = extractLiveVideo(html);

  const ttl = value ? LIVE_CACHE_TTL_HIT_MS : LIVE_CACHE_TTL_MISS_MS;
  liveCache.set(channelOrHandle, { value, expiresAt: Date.now() + ttl });
  return value;
};

/* ── Indian-news web-scraping providers ────────────────────────
 * Each is a thin wrapper around either an RSS endpoint or a small
 * cheerio scraper. They run only for INDIA market; all errors are
 * swallowed by safeFetch* and resolve to [].
 *
 * `q` is the optional human-readable query (company name). When
 * absent the providers fall back to "latest news" pages.
 * ───────────────────────────────────────────────────────────────*/

const symbolToQuery = (symbol) => {
  if (!symbol || symbol === "%5EGSPC") return "";
  return symbol.replace(/\.(NS|BO)$/i, "");
};

/* Tier 1 — Google News RSS (curated, stable, no scraping) */
export const fetchGoogleNewsIN = async ({ market, symbol, q } = {}) => {
  if (market !== "INDIA") return [];
  const query = (q && q.trim()) || symbolToQuery(symbol) || "Indian stock market";
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    `${query} stock`
  )}&hl=en-IN&gl=IN&ceid=IN:en`;
  const xml = await safeFetchText("Google News IN", url, { headers: BROWSER_HEADERS });
  if (!xml) return [];

  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  const stripCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
  for (const b of blocks) {
    const t = b.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const l = b.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const p = b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    const s = b.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    if (!t || !l) continue;
    let title = stripCdata(t[1]);
    const publisher = s ? stripCdata(s[1]) : null;
    // Google News titles end with " - Publisher"; strip it once we know it.
    if (publisher && title.endsWith(` - ${publisher}`)) {
      title = title.slice(0, -(publisher.length + 3));
    }
    items.push({
      title,
      source: publisher || "Google News",
      url: stripCdata(l[1]),
      publishedAt: safeIso(p ? stripCdata(p[1]) : null),
      provider: "googlenews_in",
    });
  }
  return items.slice(0, 25);
};

/* Tier 2 — direct cheerio scrapers (one per publisher) */

const scrapeCheerio = async (label, url, parse) => {
  const html = await safeFetchText(label, url, { headers: BROWSER_HEADERS });
  if (!html) return [];
  try {
    const $ = cheerio.load(html);
    const items = parse($);
    return items.filter((n) => n.title && n.url);
  } catch (e) {
    logger.warn(`${label} parse failed: ${e.message}`);
    return [];
  }
};

export const fetchMoneycontrolIN = async ({ market, symbol, q } = {}) => {
  if (market !== "INDIA") return [];
  const query = (q && q.trim()) || symbolToQuery(symbol);
  const url = query
    ? `https://www.moneycontrol.com/news/?s=${encodeURIComponent(query)}`
    : "https://www.moneycontrol.com/news/business/markets/";
  return scrapeCheerio("Moneycontrol", url, ($) => {
    const out = [];
    const seen = new Set();
    // MC article listings are <a href="…moneycontrol.com/news/..."> wrapping
    // headlines (the headline is on the `title` attribute of the anchor).
    $('a[href*="moneycontrol.com/news/"]').each((_, el) => {
      const href = $(el).attr("href");
      const title = ($(el).attr("title") || $(el).text() || "").trim();
      if (!href || !title || title.length < 12) return;
      // Skip section/landing pages — only keep article URLs (numeric trailing id .html)
      if (!/-\d{6,}\.html(?:$|[?#])/.test(href)) return;
      if (seen.has(href)) return;
      seen.add(href);
      const dateText = $(el)
        .closest("li, article, div")
        .find(".article-schedule, span.article-schedule, .date, time")
        .first()
        .text()
        .trim();
      out.push({
        title,
        source: "Moneycontrol",
        url: href,
        publishedAt: safeIso(dateText),
        provider: "moneycontrol_in",
      });
    });
    return out.slice(0, 20);
  });
};

export const fetchEconomicTimesIN = async ({ market, symbol, q } = {}) => {
  if (market !== "INDIA") return [];
  const query = (q && q.trim()) || symbolToQuery(symbol);
  const url = query
    ? `https://economictimes.indiatimes.com/topic/${encodeURIComponent(
        query.toLowerCase().replace(/\s+/g, "-")
      )}`
    : "https://economictimes.indiatimes.com/markets";
  return scrapeCheerio("Economic Times", url, ($) => {
    const out = [];
    const seen = new Set();
    // Real ET stories have URLs containing "articleshow"; widget cards don't.
    $('a[href*="articleshow"]').each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim().replace(/\s+/g, " ");
      if (!href || !title || title.length < 12) return;
      const absUrl = href.startsWith("http")
        ? href
        : `https://economictimes.indiatimes.com${href}`;
      if (seen.has(absUrl)) return;
      seen.add(absUrl);
      const dateText = $(el)
        .closest("article, div, li")
        .find("time, .date-format, .publish_on")
        .first()
        .text()
        .trim();
      out.push({
        title,
        source: "Economic Times",
        url: absUrl,
        publishedAt: safeIso(dateText),
        provider: "economictimes_in",
      });
    });
    return out.slice(0, 20);
  });
};

export const fetchLiveMintIN = async ({ market, symbol, q } = {}) => {
  if (market !== "INDIA") return [];
  const query = (q && q.trim()) || symbolToQuery(symbol);
  // LiveMint's /search and /searchlisting endpoints return 410.
  // The reliable per-company endpoint is /topic/<slug>.
  const slug = query.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  const url = slug
    ? `https://www.livemint.com/topic/${encodeURIComponent(slug)}`
    : "https://www.livemint.com/market";
  return scrapeCheerio("LiveMint", url, ($) => {
    const out = [];
    const seen = new Set();
    // Topic / listing pages emit bare <a href=".html"> per story (one image
    // anchor and one text anchor sharing the same href). Pick the text one.
    $('a[href*="livemint.com"], a[href^="/"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      const absUrl = href.startsWith("http")
        ? href
        : `https://www.livemint.com${href}`;
      if (!/\d{6,}\.html(?:$|[?#])/.test(absUrl)) return;
      const title = $(el).text().trim().replace(/\s+/g, " ");
      if (!title || title.length < 12) return;
      if (seen.has(absUrl)) return;
      seen.add(absUrl);
      out.push({
        title,
        source: "LiveMint",
        url: absUrl,
        publishedAt: safeIso(null),
        provider: "livemint_in",
      });
    });
    return out.slice(0, 20);
  });
};

/* ── Provider registry ─────────────────────────────────────────*/
export const PROVIDERS = {
  rss: fetchRSS,
  marketaux: fetchMarketaux,
  alphavantage: fetchAlphaVantage,
  finnhub: fetchFinnhub,
  fmp: fetchFMP,
  stocknews: fetchStockNewsAPI,
  newsdata: fetchNewsData,
  yahoo: fetchYahoo,
  googlenews_in: fetchGoogleNewsIN,
  moneycontrol_in: fetchMoneycontrolIN,
  economictimes_in: fetchEconomicTimesIN,
  livemint_in: fetchLiveMintIN,
};

/* ── Backward-compat single-symbol cascade ─────────────────────
 * Old callers still expect `getStockNews(symbol, market)` to
 * return ~10 items. Internally re-implemented as a thin wrapper
 * over the new aggregator (imported lazily to avoid cycles).
 * ───────────────────────────────────────────────────────────────*/
export const getStockNews = async (symbol, market = "USA") => {
  const { aggregateNews } = await import("./newsAggregator.js");
  return aggregateNews({ symbols: [symbol], market, sinceMs: 7 * 24 * 60 * 60 * 1000, limit: 10 });
};

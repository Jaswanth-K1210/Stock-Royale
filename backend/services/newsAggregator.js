import crypto from "crypto";
import { PROVIDERS } from "./newsService.js";
import logger from "../utils/logger.js";

/* ── In-memory TTL cache ───────────────────────────────────────*/
const cache = new Map(); // key -> { items, expiresAt }
const CACHE_TTL_MS = 60 * 1000;

const cacheGet = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.items;
};

const cacheSet = (key, items) => {
  cache.set(key, { items, expiresAt: Date.now() + CACHE_TTL_MS });
};

/* ── Helpers ───────────────────────────────────────────────────*/
const normalizeTitle = (t) =>
  (t || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const hashId = (title, source) =>
  crypto.createHash("sha1").update(`${normalizeTitle(title)}|${source || ""}`).digest("hex").slice(0, 12);

const marketParams = (market) => ({
  mxCountry: market === "INDIA" ? "in" : "us",
  yhRegion: market === "INDIA" ? "IN" : "US",
  yhLang: market === "INDIA" ? "en-IN" : "en-US",
});

/* ── Main aggregator ───────────────────────────────────────────
 * params:
 *   market   : "USA" | "INDIA" | "BOTH"
 *   symbols  : string[]      (empty => general market query)
 *   sinceMs  : number        (max age in ms; default 12h)
 *   limit    : number        (default 50, capped at 100)
 * returns Promise<NewsItem[]>
 * ───────────────────────────────────────────────────────────────*/
// IST = UTC+5:30 (no DST). Returns the UTC ms timestamp of "today at 00:00 IST".
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const startOfTodayIST = () => {
  const istNow = Date.now() + IST_OFFSET_MS;
  const istMidnight = Math.floor(istNow / 86_400_000) * 86_400_000;
  return istMidnight - IST_OFFSET_MS;
};

export const aggregateNews = async ({
  market = "USA",
  symbols = [],
  q = "",
  sinceMs = 12 * 60 * 60 * 1000,
  limit = 50,
  todayIST = false,
} = {}) => {
  limit = Math.min(Math.max(1, limit), 100);

  // For BOTH, run aggregator for both markets and merge.
  if (market === "BOTH") {
    const [usa, india] = await Promise.all([
      aggregateNews({ market: "USA", symbols, q, sinceMs, limit, todayIST }),
      aggregateNews({ market: "INDIA", symbols, q, sinceMs, limit, todayIST }),
    ]);
    const cutoffMs = todayIST ? Date.now() - startOfTodayIST() : sinceMs;
    return dedupeAndSort([...usa, ...india], cutoffMs, limit);
  }

  const symbolList = symbols.length > 0 ? symbols : ["%5EGSPC"];
  const cacheKey = `${market}::${symbolList.sort().join(",")}::${q}::${
    todayIST ? "today" : sinceMs
  }::${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const { mxCountry, yhRegion, yhLang } = marketParams(market);

  // Fan out: every provider × every symbol, in parallel
  const tasks = [];
  for (const symbol of symbolList) {
    for (const fn of Object.values(PROVIDERS)) {
      tasks.push(fn({ symbol, market, q, mxCountry, yhRegion, yhLang }));
    }
  }

  const results = await Promise.allSettled(tasks);
  const merged = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      merged.push(...r.value);
    } else if (r.status === "rejected") {
      logger.warn(`provider task rejected: ${r.reason?.message || r.reason}`);
    }
  }

  const cutoffMs = todayIST ? Date.now() - startOfTodayIST() : sinceMs;
  const final = dedupeAndSort(merged, cutoffMs, limit);
  cacheSet(cacheKey, final);
  return final;
};

/* ── De-dupe + filter + sort + truncate ────────────────────────*/
const dedupeAndSort = (items, sinceMs, limit) => {
  const cutoff = Date.now() - sinceMs;
  const seenUrl = new Set();
  const seenTitleHash = new Set();
  const out = [];

  // Sort first by recency so earliest-fetched copy is also the freshest
  const dated = items
    .map((n) => ({ ...n, _ts: new Date(n.publishedAt).getTime() }))
    .filter((n) => Number.isFinite(n._ts) && n._ts >= cutoff)
    .sort((a, b) => b._ts - a._ts);

  for (const n of dated) {
    if (n.url && seenUrl.has(n.url)) continue;
    const th = normalizeTitle(n.title);
    if (!th) continue;
    if (seenTitleHash.has(th)) continue;
    seenUrl.add(n.url);
    seenTitleHash.add(th);
    out.push({
      id: hashId(n.title, n.source),
      title: n.title,
      source: n.source,
      url: n.url,
      publishedAt: n.publishedAt,
      provider: n.provider,
    });
    if (out.length >= limit) break;
  }
  return out;
};

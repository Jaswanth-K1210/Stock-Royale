# Live Intelligence Feed — Design Spec

**Date:** 2026-05-26
**Scope:** Replace the sparse, single-source news panel in the game room and dashboard with a dense, multi-source, real-time intelligence terminal that includes 24/7 financial broadcast video.

> This spec covers the **Intelligence subsystem only**. The broader war-room layout overhaul (ticker tape, heatmap, sparklines, P&L hero, dense panel grid) is a separate sub-project deferred to a follow-up spec.

## Goals

1. **Density over sparseness.** The feed should never feel empty. Up to 50 articles available, scrolling; never the "Wire is silent" state when providers are configured.
2. **Recency-first.** Newest item on top. Items older than the user's max-age window are filtered out, not shown.
3. **Multi-source aggregation, not fallback.** Currently providers cascade — first hit wins, the rest are silent. Switch to a parallel fan-out that merges, de-dupes, and sorts across all configured providers.
4. **Broadcast video.** Embed 24/7 YouTube livestreams from major financial networks (Bloomberg, CNBC, Yahoo Finance, ET Now, Moneycontrol, Zee Business, CNBC-TV18).
5. **User control.** Every source (article provider + video channel) is individually toggleable; max-age and refresh interval are user-settable. Settings persist in localStorage.
6. **Terminal feel, not game feel.** Tight monospace typography, source tags, relative timestamps, pulse on new arrivals, no game-y embellishments inside the panel.

## Non-goals

- No user-curated RSS feeds or arbitrary channel input. Curated list only.
- No sentiment analysis, AI summarization, or translation. Raw headlines.
- No sync of preferences across devices. localStorage only — DB persistence is a follow-up.
- No paid YouTube API. Channel-page embed only (option 3 from brainstorming).
- No changes to TAPE (trades) tab beyond co-existing in the new tab strip.

## Architecture

### Backend

**New endpoint:** `GET /api/news/feed`

Query params:
- `market` — `USA` | `INDIA` | `BOTH` (default: `USA`)
- `symbols` — comma-separated tickers, optional. Empty = general market news.
- `since` — ISO duration, default `12h`. Items older than `now - since` are dropped.
- `limit` — default `50`, max `100`.

Behavior:
1. Run all configured providers (those with API keys in `process.env`) in parallel via `Promise.allSettled`. Yahoo always runs as a free baseline.
2. Each provider returns its normalized shape: `{ title, source, url, publishedAt, symbols? }`.
3. Merge all results, attach a stable `id` (sha1 of normalized title + source).
4. De-dupe: drop items with identical URL OR identical normalized title (lowercase, strip punctuation, collapse whitespace).
5. Filter: drop items where `publishedAt < now - since`.
6. Sort: `publishedAt` desc.
7. Truncate to `limit`.
8. Cache the (market, symbols, since) tuple for 60s in an in-memory LRU. Cache key = `market:symbols:since`.

**Implementation note:** Keep [newsService.js](backend/services/newsService.js)'s existing per-provider fetchers; refactor each into a named exported function (`fetchMarketaux`, `fetchAlphaVantage`, …) so the new aggregator can call them in parallel. The old `getStockNews(symbol, market)` cascade stays callable for backward compatibility — internally it becomes a thin wrapper over the new aggregator with `limit=10`.

**New file:** [backend/services/newsAggregator.js](backend/services/newsAggregator.js)
- `aggregateNews({ market, symbols, sinceMs, limit })` → `Promise<NewsItem[]>`
- Internal LRU cache with TTL (`node-cache` is already a transitive dep; if not, a tiny `Map` + timestamp suffices — keep it simple)

**New route:** `routes/newsRoutes.js`, mounted at `/api/news`. Old `/api/stocks/news/:symbol` stays but is internally re-implemented via the aggregator.

### Frontend

**New file:** `frontend/src/components/IntelligencePanel.jsx` — the panel itself. Replaces the inline "Live Intelligence" block in [Game.jsx:507-576](frontend/src/pages/Game.jsx#L507-L576) and is added to [Dashboard.jsx](frontend/src/pages/Dashboard.jsx).

Props:
- `market` (USA/INDIA/BOTH)
- `symbols` (optional array — selected stock + favourites)
- `showTape` (bool — only true in game room; dashboard hides the TAPE tab)
- `trades` (optional — pass-through for TAPE)

Internal state:
- `activeTab` — `WIRE` | `BROADCAST` | `TAPE` (TAPE hidden on dashboard)
- `settings` (from localStorage, see below)
- `items` (news list), `loading`, `lastRefreshedAt`

Behavior:
- On mount and every `settings.refreshIntervalSec` (default 60s), `GET /api/news/feed?market=…&symbols=…&since=…`
- New items (id not seen before) flash a 1.5s background pulse to draw the eye
- Each item shows: source chip · relative time ("2m") · headline (clickable, opens in new tab)
- Source filter chips above the list: any combination toggleable. Hidden sources are filtered client-side from the cached response so toggling is instant.
- Empty state only if every source is toggled off OR every provider returned zero — copy: "All sources muted." / "No wire activity in the last 12h."

**New file:** `frontend/src/components/BroadcastTab.jsx`
- Renders one YouTube embed iframe per enabled channel: `https://www.youtube.com/embed/live_stream?channel=<UC...>&autoplay=0&mute=1`
- Layout: a 2-column grid (1-col on mobile). Each tile has the channel name overlaid + a "LIVE" pill.
- One tile is "focused" (full size); clicking another tile swaps focus. Focused video unmutes on user interaction; others stay muted.
- Picture-in-picture toggle (browser-native `requestPictureInPicture()` on the focused video element where available).
- Toggling channels off in settings removes their tile entirely; toggling all off shows "No channels enabled."

**New file:** `frontend/src/components/IntelligenceSettings.jsx` — gear-icon modal
- Section: **Article sources** — toggle list of providers (Marketaux, Alpha Vantage, Finnhub, FMP, StockNewsAPI, NewsData, Yahoo)
- Section: **Broadcast channels** — toggle list, grouped by market (USA / INDIA)
- Section: **Behavior** — max-age slider (1h / 6h / 12h / 24h), refresh interval (30s / 60s / 2m / 5m), default tab
- Save → writes to localStorage key `stockroyale.intel.settings.v1`
- Reset to defaults button

**Curated broadcast channel list** (hardcoded in `frontend/src/config/broadcastChannels.js`):

| Channel | Market | YouTube channel ID |
|---|---|---|
| Bloomberg Television | USA | `UCIALMKvObZNtJ6AmdCLP7Lg` |
| Yahoo Finance | USA | `UCEAZeUIeJs0IjQiqTCdVSIg` |
| Schwab Network | USA | `UC8jchcfwDDtRmEzjAtfm-Rg` |
| CNBC Television | USA | `UCrp_UI8XtuYfpiqluWLD7Lw` |
| CNBC-TV18 | INDIA | `UCDb6ZTxNDPI_BkvhWxFRGfA` |
| ET Now | INDIA | `UC-f7r46JhYv78q5pGrO6ivA` |
| Zee Business | INDIA | `UC678gpwfABDfdj9wkAokt4w` |
| Moneycontrol | INDIA | `UCFCxbHa4PWnGYMrkTfvR_Tw` |

These are stable, long-running channel IDs whose `embed/live_stream?channel=…` URL resolves to whichever video is currently live on that channel.

### Settings shape

```js
// localStorage["stockroyale.intel.settings.v1"]
{
  version: 1,
  sources: {
    marketaux: true,
    alphavantage: true,
    finnhub: true,
    fmp: true,
    stocknews: true,
    newsdata: true,
    yahoo: true,
  },
  channels: {
    bloomberg: true,
    yahoo_finance: true,
    schwab: true,
    cnbc_us: true,
    cnbc_tv18: true,
    et_now: true,
    zee_business: false,
    moneycontrol: false,
  },
  maxAgeHours: 12,
  refreshIntervalSec: 60,
  defaultTab: "WIRE",
}
```

A missing field at read time falls back to the default — additive settings changes don't break older stored state.

**Note:** the `sources` toggles filter client-side. The server still queries every configured provider (it doesn't know per-user preferences). This is fine: providers run in parallel so disabling one client-side doesn't save backend work, but it does keep the UI instantly responsive when toggling.

## Data flow

```
User opens Game / Dashboard
  └─► IntelligencePanel mounts
       ├─► Read settings from localStorage (or defaults)
       ├─► GET /api/news/feed?market=…&since=12h&limit=50
       │     └─► newsAggregator.aggregateNews()
       │          ├─► fetchMarketaux  ┐
       │          ├─► fetchAlphaVan…  │  Promise.allSettled
       │          ├─► fetchFinnhub    │
       │          ├─► fetchFMP        │
       │          ├─► fetchStockNews  │
       │          ├─► fetchNewsData   │
       │          └─► fetchYahoo      ┘
       │          → merge, de-dupe, filter by sinceMs, sort desc, truncate
       │          → return + cache 60s
       └─► Render filtered list (client-side source toggle filter)

Every refreshIntervalSec:
  └─► re-fetch; new ids flash pulse animation

User clicks BROADCAST tab:
  └─► BroadcastTab renders iframes for each enabled channel
       (channel-page embed auto-resolves to current live video)

User clicks gear icon:
  └─► IntelligenceSettings modal opens
       └─► Save → write to localStorage → panel re-reads → re-renders
```

## Error handling

- Any provider that throws or returns non-OK is logged via `logger.warn` and its result is treated as `[]`. Aggregation continues.
- If **every** provider fails (network outage), endpoint returns `200 { items: [], error: "all_providers_failed" }`. Panel shows "Wire offline — retry in 60s."
- YouTube iframe load failure (channel offline, no current livestream) shows an in-tile fallback: "Channel currently offline." Other tiles continue.
- Aggressive de-dupe: if title-hash collides across providers, the earliest-fetched copy wins (avoids near-duplicate Reuters/AP wire stories).

## Testing

- **Backend unit test:** `newsAggregator.test.js` with mocked provider responses → asserts merge, de-dupe by URL, de-dupe by title-hash, sort order, since-filter, limit truncation.
- **Backend integration test:** hit `/api/news/feed` with no API keys set → returns Yahoo-only results.
- **Frontend manual test plan:**
  1. Toggle each source off, watch the list shrink in real time
  2. Toggle all sources off → "All sources muted" state appears
  3. Switch market USA ↔ INDIA → headline mix changes appropriately
  4. Set refresh to 30s, leave panel open, confirm pulse animation fires on new items
  5. Switch to BROADCAST tab, confirm at least one US + one India channel plays live audio when unmuted
  6. Refresh page, confirm settings persist
  7. Click gear, change max-age to 1h, save, confirm older items disappear

## Out of scope / follow-ups

- **War-room layout overhaul** (ticker tape, sector heatmap, sparklines in watchlist, big P&L hero) — separate spec, depends on whether backend can serve intraday OHLC.
- **Sync settings to user account** — DB migration + endpoint; do later if multi-device is requested.
- **Push notifications** for breaking news — not asked for.
- **Per-symbol filter on broadcast** — videos are general market, no good way to filter by ticker.
- **News sentiment / AI summarization** — explicitly excluded.

## Open decisions to confirm with the user before implementation

1. **Article max-age default** — proposed `12h`. Could go shorter (`2h`) for stricter "latest only" feel. Recommend `12h` as default + slider to `1h` so users who want stricter can opt in.
2. **Refresh interval default** — proposed `60s`. Anything more aggressive risks hitting provider rate limits.
3. **PiP for BROADCAST** — proposed yes (browser-native). Adds ~20 LOC; pretty cheap.
4. **Dashboard placement** — replace the current "Live Market Intelligence" center column in [Dashboard.jsx](frontend/src/pages/Dashboard.jsx) with this panel.

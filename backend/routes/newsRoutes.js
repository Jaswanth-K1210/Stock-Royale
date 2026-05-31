import { Router } from "express";
import { aggregateNews } from "../services/newsAggregator.js";
import { resolveLiveVideo } from "../services/newsService.js";
import logger from "../utils/logger.js";

const router = Router();

const parseSince = (s) => {
  if (!s) return 12 * 60 * 60 * 1000;
  const m = String(s).match(/^(\d+)\s*(m|h|d)?$/i);
  if (!m) return 12 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const unit = (m[2] || "h").toLowerCase();
  const mult = unit === "m" ? 60_000 : unit === "d" ? 86_400_000 : 3_600_000;
  return n * mult;
};

// GET /api/news/feed?market=USA&symbols=AAPL,TSLA&q=Reliance&since=12h&dateOnly=today&limit=50
router.get("/feed", async (req, res) => {
  try {
    const market = (req.query.market || "USA").toUpperCase();
    const symbols = req.query.symbols
      ? String(req.query.symbols).split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const q = req.query.q ? String(req.query.q).trim() : "";
    const sinceMs = parseSince(req.query.since);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const todayIST = String(req.query.dateOnly || "").toLowerCase() === "today";

    const items = await aggregateNews({ market, symbols, q, sinceMs, limit, todayIST });
    res.json({ items, count: items.length, fetchedAt: new Date().toISOString() });
  } catch (err) {
    logger.error("news/feed error: " + err.message);
    res.status(500).json({ items: [], error: err.message });
  }
});

// GET /api/news/live?channel=<channelId>
// Resolves a YouTube channel's current live videoId (the legacy
// embed/live_stream?channel= URL no longer reliably resolves to a stream).
router.get("/live", async (req, res) => {
  try {
    const channelId = String(req.query.channel || "").trim();
    if (!/^UC[\w-]{20,}$/.test(channelId)) {
      return res.status(400).json({ error: "invalid channel id" });
    }
    const result = await resolveLiveVideo(channelId);
    if (!result?.videoId) {
      return res.json({ channelId, videoId: null, isLive: false });
    }
    res.json({ channelId, ...result });
  } catch (err) {
    logger.error("news/live error: " + err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

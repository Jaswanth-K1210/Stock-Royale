import { Router } from "express";
import logger from "../utils/logger.js";
import { aggregateNews } from "../services/newsAggregator.js";

const router = Router();

// Fast, low-latency default. Override via OPENROUTER_MODEL env if desired.
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-8b-instruct:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT_BASE = `You are an elite, sharp, and confident Wall Street analyst assisting a user in the StockRoyale trading app.
Your communication style is punchy, direct, and highly analytical. 

CRITICAL RULES:
1. NEVER use generic disclaimers like "I'm not a licensed financial advisor", "It's essential to consider...", or "I cannot provide a buy/sell opinion." Skip the fluff.
2. NEVER refuse to answer a question. If asked a direct "should I buy" or "can I buy" question, do NOT evade it or complain about lacking price data. Instead, immediately provide the strongest bullish case and bearish case based on the news, and conclude with what a sharp trader would watch for.
3. Explicitly reference the actual news provided in your context.
4. If asked about macroeconomic events, global news, or complex mechanics, provide a DETAILED, highly impressive, and structured analysis. Break down the impact by sectors and list specific tickers to watch.
5. If you have no news data for the specific stock, say so directly, then provide a confident fundamental overview based on your general knowledge. 
6. Keep simple questions concise, but expand into deep analysis for complex questions. End with a sharp insight or a key level/trend to watch.`;

// Helper to make the API call to a specific provider
async function fetchFromProvider(url, apiKey, model, systemPrompt, trimmedMessages) {
  const body = {
    model: model,
    messages: [{ role: "system", content: systemPrompt }, ...trimmedMessages],
    temperature: 0.4,
    max_tokens: 800,
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (url === OPENROUTER_URL) {
    headers["HTTP-Referer"] = process.env.APP_URL || "http://localhost:5173";
    headers["X-Title"] = "StockRoyale";
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Provider error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim() || "";
  return { reply, model: data?.model || model };
}

// POST /api/ai/chat
router.post("/chat", async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY) {
      return res.status(503).json({
        error: "AI assistant is not configured. Set OPENROUTER_API_KEY or GROQ_API_KEY in backend .env to enable it.",
      });
    }

    const { messages, context } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Cap conversation length to keep latency low and cost predictable.
    const trimmed = messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 4000),
    }));

    let system = SYSTEM_PROMPT_BASE;
    if (context && (context.company || context.symbol)) {
      const ctxParts = [];
      if (context.company) ctxParts.push(`Company: ${context.company}`);
      if (context.symbol) ctxParts.push(`Symbol: ${context.symbol}`);
      if (context.market) ctxParts.push(`Market: ${context.market}`);
      system += `\n\nCurrent context — ${ctxParts.join(", ")}.`;

      try {
        // Fetch recent news (last 24 hours) for this context to give the AI real-time awareness
        const newsItems = await aggregateNews({
          market: context.market || "USA",
          symbols: context.symbol ? [context.symbol] : [],
          q: context.company || "",
          sinceMs: 24 * 60 * 60 * 1000, 
          limit: 5
        });

        if (newsItems.length > 0) {
          system += `\n\nLatest News Headlines (use these to answer current events/financial questions):\n`;
          newsItems.forEach(n => {
            system += `- ${n.title} (${n.source})\n`;
          });
        }
      } catch (err) {
        logger.warn(`Failed to fetch news context for AI: ${err.message}`);
      }
    }

    let lastError = null;

    // Try OpenRouter first
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const result = await fetchFromProvider(OPENROUTER_URL, process.env.OPENROUTER_API_KEY, DEFAULT_MODEL, system, trimmed);
        return res.json(result);
      } catch (err) {
        logger.warn(`OpenRouter failed, falling back if available: ${err.message}`);
        lastError = err;
      }
    }

    // Fallback to Groq
    if (process.env.GROQ_API_KEY) {
      try {
        const result = await fetchFromProvider(GROQ_URL, process.env.GROQ_API_KEY, GROQ_MODEL, system, trimmed);
        return res.json(result);
      } catch (err) {
        logger.warn(`Groq failed: ${err.message}`);
        lastError = err;
      }
    }

    // If both failed or weren't configured
    logger.error("All AI providers failed.");
    res.status(502).json({ error: "AI provider error: " + (lastError?.message || "Configuration missing") });

  } catch (err) {
    logger.error("ai/chat error: " + err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

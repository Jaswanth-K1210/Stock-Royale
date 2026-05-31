import { searchStocks, getQuote, getChartData } from "../services/priceService.js";
import { getStockNews } from "../services/newsService.js";
import User from "../models/User.js";

// GET /api/stocks/search?q=AAPL&market=USA
export const search = async (req, res) => {
  try {
    const { q, market } = req.query;
    if (!q || q.length < 1) {
      return res.json([]);
    }
    const results = await searchStocks(q, market || "USA");
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stocks/quote/:symbol
export const quote = async (req, res) => {
  try {
    const data = await getQuote(req.params.symbol);
    if (!data) return res.status(404).json({ message: "Stock not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stocks/chart/:symbol
export const chart = async (req, res) => {
  try {
    const { interval, range } = req.query;
    const data = await getChartData(req.params.symbol, interval, range);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stocks/news/:symbol
export const news = async (req, res) => {
  try {
    const articles = await getStockNews(req.params.symbol, req.query.market);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stocks/favorites  { symbol, name, market }
export const addFavorite = async (req, res) => {
  try {
    const { symbol, name, market } = req.body;
    const user = await User.findById(req.user._id);

    const exists = user.favorites.some((f) => f.symbol === symbol);
    if (exists) return res.json({ message: "Already in favorites", favorites: user.favorites });

    user.favorites.push({ symbol, name: name || symbol, market: market || "USA" });
    await user.save();

    res.json({ favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/stocks/favorites/:symbol
export const removeFavorite = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.favorites = user.favorites.filter(
      (f) => f.symbol !== req.params.symbol
    );
    await user.save();
    res.json({ favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stocks/favorites
export const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.favorites || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

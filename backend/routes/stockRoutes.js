import { Router } from "express";
import {
  search,
  quote,
  chart,
  news,
  addFavorite,
  removeFavorite,
  getFavorites,
} from "../controllers/stockController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/search", protect, search);
router.get("/quote/:symbol", protect, quote);
router.get("/chart/:symbol", protect, chart);
router.get("/news/:symbol", protect, news);
router.get("/favorites", protect, getFavorites);
router.post("/favorites", protect, addFavorite);
router.delete("/favorites/:symbol", protect, removeFavorite);

export default router;

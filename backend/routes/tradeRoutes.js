import { Router } from "express";
import { executeTrade, getRoomTrades } from "../controllers/tradeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, executeTrade);
router.get("/:roomCode", protect, getRoomTrades);

export default router;

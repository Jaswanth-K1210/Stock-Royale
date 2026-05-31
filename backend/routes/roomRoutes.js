import { Router } from "express";
import {
  createRoom,
  listRooms,
  listMyRooms,
  getRoom,
  joinRoom,
  startRoom,
} from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, createRoom);
router.get("/", protect, listRooms);
// "mine" must be registered before ":code" so it doesn't get matched as a code
router.get("/mine", protect, listMyRooms);
router.get("/:code", protect, getRoom);
router.post("/:code/join", protect, joinRoom);
router.post("/:code/start", protect, startRoom);

export default router;

import { Router } from "express";
import {
  register,
  login,
  getMe,
  logout,
  sendOtp,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/send-otp", sendOtp);
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/logout", logout);

export default router;

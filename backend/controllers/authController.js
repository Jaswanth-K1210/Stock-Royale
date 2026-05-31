import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import OTP from "../models/OTP.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const setCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// POST /api/auth/send-otp
export const sendOtp = async (req, res) => {
  try {
    let { email } = req.body;
    email = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in DB, overwriting previous if any
    await OTP.findOneAndDelete({ email });
    await OTP.create({ email, otp });

    // Send email using Nodemailer
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"Stock Royale" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Stock Royale Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #0b0c10; color: #fff; padding: 40px; text-align: center; border-radius: 10px;">
            <h1 style="color: #00FF06; margin-bottom: 20px;">STOCK ROYALE</h1>
            <p style="font-size: 16px; color: #c5c6c7;">Welcome to the arena. Here is your verification code:</p>
            <div style="font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 5px; background: rgba(0, 255, 6, 0.1); border: 1px solid rgba(0, 255, 6, 0.3); color: #00FF06; display: inline-block; padding: 15px 30px; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #c5c6c7; opacity: 0.7;">This code will expire in 5 minutes.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } else {
      // Fallback if env vars aren't set yet
      console.log(`\n==============================================`);
      console.log(`[MOCK EMAIL] OTP for ${email}: \x1b[32m${otp}\x1b[0m`);
      console.log(`==============================================\n`);
    }

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    let { username, email, password, otp } = req.body;

    username = typeof username === "string" ? username.trim() : "";
    email = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!username || !email || !password || !otp) {
      return res.status(400).json({ message: "All fields and OTP are required" });
    }

    if (username.length < 3) {
      return res
        .status(400)
        .json({ message: "Trader alias must be at least 3 characters" });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters and include a lowercase, uppercase, number, and symbol" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Verify OTP
    const dbOtp = await OTP.findOne({ email });
    if (!dbOtp || dbOtp.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // OTP is valid, clear it
    await OTP.findOneAndDelete({ email });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ username, email, passwordHash });
    const token = generateToken(user._id);
    setCookie(res, token);

    res.status(201).json({
      user: user.toJSON(),
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    setCookie(res, token);

    res.json({
      user: user.toJSON(),
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// POST /api/auth/logout
export const logout = (req, res) => {
  res.cookie("token", "", { maxAge: 0 });
  res.json({ message: "Logged out" });
};

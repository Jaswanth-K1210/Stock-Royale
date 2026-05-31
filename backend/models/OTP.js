import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // Automatically deletes document after 5 minutes (300 seconds)
  },
});

const OTP = mongoose.model("OTP", otpSchema);
export default OTP;

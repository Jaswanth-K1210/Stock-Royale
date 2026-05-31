import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: { type: String, required: true },
    ticker: { type: String, required: true, uppercase: true },
    tickerName: { type: String, default: "" },
    side: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    executedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Trade = mongoose.model("Trade", tradeSchema);
export default Trade;

import mongoose from "mongoose";

const positionSchema = new mongoose.Schema(
  {
    ticker: { type: String, required: true, uppercase: true },
    qty: { type: Number, required: true, min: 0 },
    avgPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const playerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  cash: { type: Number, required: true },
  portfolioValue: { type: Number, default: 0 },
  positions: { type: [positionSchema], default: [] },
  joinedAt: { type: Date, default: Date.now },
});

const roomSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      maxlength: 6,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["LOBBY", "ACTIVE", "FINISHED"],
      default: "LOBBY",
    },
    market: {
      type: String,
      enum: ["INDIA", "USA", "BOTH"],
      default: "USA",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    startingCash: {
      type: Number,
      default: 100000,
      min: 1000,
    },
    durationMs: {
      type: Number,
      default: 15 * 60 * 1000, // 15 minutes
    },
    maxPlayers: {
      type: Number,
      default: 10,
      min: 2,
      max: 20,
    },
    players: [playerSchema],
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true }
);

// Virtual for player count
roomSchema.virtual("playerCount").get(function () {
  return this.players.length;
});

roomSchema.set("toJSON", { virtuals: true });

const Room = mongoose.model("Room", roomSchema);
export default Room;

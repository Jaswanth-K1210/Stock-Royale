# Stock Royale

A real-time multiplayer stock trading game where players compete to build the biggest portfolio before the timer runs out.

## What it is

Players join or create a room, get a starting cash balance, and trade real stocks (live prices from Yahoo Finance / Finnhub) against each other. The player with the highest total portfolio value when time expires wins.

## Features

- OTP-based email registration (Gmail / Nodemailer)
- JWT auth with HttpOnly cookies + localStorage token fallback
- Create public/private rooms with configurable cash, duration, and player limits
- Live stock prices via Finnhub (USA) and Yahoo Finance (India + USA)
- Real-time trade feed and leaderboard via Socket.io
- Buy/sell Indian (NSE/BSE) and US stocks
- AI trading assistant powered by OpenRouter or Groq (with live news context)
- Financial news aggregator with multiple providers, fallback, and cooldown
- Watchlist / favorites per user
- Interactive stock charts

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, Zustand, Socket.io-client, Axios, Recharts |
| Backend | Node.js, Express, Socket.io, Mongoose (MongoDB), JWT, Nodemailer |
| Prices | Finnhub API, Yahoo Finance (unofficial) |
| AI | OpenRouter + Groq (automatic fallback) |
| News | Newsdata.io, MarketAux, Alpha Vantage, web scraping aggregator |
| Deploy | Render (backend), Vercel (frontend), MongoDB Atlas |

## Project structure

```
backend/
  controllers/      authController, roomController, tradeController, stockController
  models/           User, Room, Trade, OTP
  routes/           auth, rooms, trades, stocks, news, ai
  services/         priceService, newsService, newsAggregator
  socket/           gameSocket (Socket.io auth + room events)
  middleware/       authMiddleware (JWT protect)
  utils/            logger
frontend/
  src/
    pages/          Landing, Login, Register, Dashboard, Lobby, Game, Results, etc.
    components/     game/, layout/, news/, ai/
    store/          authStore, gameStore (Zustand)
    services/       api.js (Axios + interceptors)
```

## Local setup

### Prerequisites
- Node.js 18+
- MongoDB running locally or a MongoDB Atlas URI

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/stockroyale
JWT_SECRET=your_secret_here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Email (Gmail App Password — requires 2FA on your Google account)
EMAIL_USER=you@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx

# Stock data (optional — falls back to Yahoo Finance without these)
FINNHUB_API_KEY=
ALPHAVANTAGE_API_KEY=

# News (optional)
NEWSDATA_API_KEY=
MARKETAUX_API_KEY=

# AI assistant (at least one required for AI chat)
OPENROUTER_API_KEY=
GROQ_API_KEY=
```

```bash
npm run dev    # starts on port 5001
```

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5001
```

```bash
npm run dev    # starts on port 5173
```

## Deployment (Render + Vercel)

### Backend on Render

1. Create a **Web Service** → connect this repo → set root directory to `backend/`
2. Build command: `npm install`
3. Start command: `node server.js`
4. Add all env vars in the Render dashboard **Environment** tab. Critical ones:
   - `NODE_ENV=production`
   - `MONGO_URI` → MongoDB Atlas connection string (not localhost)
   - `FRONTEND_URL` → your Vercel URL (e.g. `https://stock-royale.vercel.app`)

### Frontend on Vercel

1. Import this repo → set root directory to `frontend/`
2. Framework preset: **Vite**
3. Add environment variable:
   - `VITE_API_URL` → your Render backend URL (e.g. `https://stock-royale-api.onrender.com`)

## API reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/send-otp` | — | Send OTP to email |
| POST | `/api/auth/register` | — | Register with OTP verification |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | ✓ | Get current user |
| GET | `/api/rooms` | ✓ | List public rooms |
| POST | `/api/rooms` | ✓ | Create a room |
| POST | `/api/rooms/:code/join` | ✓ | Join a room |
| POST | `/api/rooms/:code/start` | ✓ | Start the game (host only) |
| POST | `/api/trades` | ✓ | Execute a trade |
| GET | `/api/trades/:roomCode` | ✓ members only | Room trade history |
| GET | `/api/stocks/quote/:symbol` | ✓ | Live stock quote |
| GET | `/api/stocks/search?q=&market=` | ✓ | Search stocks |
| GET | `/api/stocks/chart/:symbol` | ✓ | Historical chart data |
| POST | `/api/ai/chat` | — | AI assistant |
| GET | `/api/news/feed` | — | News aggregator feed |

## Socket.io events

| Event | Direction | Description |
|---|---|---|
| `join_room` | client → server | Subscribe to a room channel |
| `leave_room` | client → server | Unsubscribe from a room channel |
| `trade_executed` | server → client | A trade was made (all players) |
| `player_joined` | server → client | New player joined |
| `game_started` | server → client | Game timer started with start/end times |
| `game_over` | server → client | Game finished with final room state |

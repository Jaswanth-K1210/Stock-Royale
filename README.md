# StockBattle

Real-time multiplayer stock trading competition platform.

## Quick start

```bash
# 1. Start mongo + redis
docker compose up -d

# 2. Install deps (once)
npm install

# 3. Copy env
cp .env.example apps/server/.env

# 4. Run server + web in parallel
npm run dev
```

- Server: http://localhost:4000
- Web: http://localhost:5173
- Mongo: localhost:27017
- Redis: localhost:6380

## Stack

- **Server**: Node + Express + Socket.io + Mongoose + BullMQ + Redis + JWT
- **Web**: React + Vite + Tailwind + Zustand + React Query + Socket.io client
- **Infra**: Turborepo monorepo, Docker for local Mongo + Redis

## Layout

```
apps/
  server/       Express + Socket.io API
  web/          React frontend
packages/
  types/        Shared TypeScript types
  utils/        Shared helpers
docs/
  superpowers/
    specs/      Design docs
    plans/      Implementation plans
```

## Sprint 1 (Core Playable) — what's working

- ✅ Auth: register / login / refresh with JWT pair
- ✅ Rooms: create / join / list / start
- ✅ Live price polling (Yahoo Finance, 5s) → Redis hash + Socket.io broadcast
- ✅ Market buy/sell with atomic cash + position updates (Redis WATCH/MULTI)
- ✅ Leaderboard snapshots (Redis sorted set, every 60s)
- ✅ Room timer worker → state transitions LOBBY → ACTIVE → FINISHED
- ✅ Socket.io reconnect via Redis Stream event replay (`lastEventId`)
- ✅ Web: landing, login, register, dashboard, room create, room browser, lobby, game, results

Subsequent sprints (points system, multi-day rooms, social, gamification, advanced trading, news+AI, polish) are detailed in [docs/superpowers/plans/2026-05-24-stockbattle-implementation-plan.md](docs/superpowers/plans/2026-05-24-stockbattle-implementation-plan.md).

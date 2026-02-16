# Companion API

Backend API for the Prolific Companion mobile app. Handles push notification scheduling, daily cycle jobs, and AI integration.

## Setup

```bash
npm install
cp .env.example .env
# Fill in your environment variables
npm run dev
```

## Scripts

- `npm run dev` — Start dev server with hot reload (tsx watch)
- `npm run build` — Compile TypeScript to dist/
- `npm start` — Run compiled production build

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check with service status |
| POST | `/push-token` | Yes | Register push notification token |
| GET | `/daily` | Yes | Get today's task for the user |

## Deployment

Deployed to Railway via Docker. Redis is auto-linked as a Railway service.

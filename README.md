<p align="center">
  <img src="frontend/public/001.svg" width="180" height="246" alt="TikTok Tower Defense logo" />
</p>

<h1 align="center">TikTok Tower Defense</h1>

<p align="center">
  A 2D tower-defense game where <b>live TikTok gifts become in-game events</b>. Viewers cheer — towers fire, enemies spawn, chaos ensues.
</p>

<p align="center">
  <img alt="Frontend: React 19 + Pixi.js 8 + Vite + TypeScript" src="https://img.shields.io/badge/frontend-React_19_·_Pixi.js_8_·_Vite-blue?logo=react&logoColor=white" />
  <img alt="Backend: TypeScript + WebSocket" src="https://img.shields.io/badge/backend-TypeScript_·_WebSocket-6f42c1?logo=typescript&logoColor=white" />
</p>

---

## About

The game listens to a TikTok live stream. Every gift, follow, or shoutout from the chat is turned
into an in-game action by the backend and pushed over WebSocket to the browser. The viewer chat
doesn't just watch — they play with you.

- **Gift → action** — backend gift handler normalizes TikTok events into game actions
- **WebSocket bridge** — real-time events streamed from backend to the running game
- **Pixi.js rendering** — silky 60 FPS sprites, animations, and effects in a 2D world
- **React dashboard** — build, sell, upgrade, and micromanage your defense while watching

## Tech Stack

| Layer    | Tech                                                                 |
| -------- | -------------------------------------------------------------------- |
| Frontend | React 19, Pixi.js 8, TypeScript (strict), Vite                       |
| Backend  | TypeScript, WebSocket (`ws`), `tiktok-live-connector`                |

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_WS_URL` (default `ws://<host>:3000`) if the WebSocket server runs elsewhere.

## Scripts

| Command             | Description                     |
| ------------------- | ------------------------------- |
| `npm run dev`       | Run the dev server              |
| `npm run build`     | Lint + type-check + build       |
| `npm run lint`      | Run ESLint                      |

## Repository Layout

```text
frontend/   Browser game — Pixi.js engine, React dashboard, assets
backend/    Gift-processing server — TikTok events → WebSocket
shared/     Shared types used by both sides
trash/      Unused/legacy assets
```

## Contact

- Email: [guschamp47@gmail.com](mailto:guschamp47@gmail.com)
- Telegram: [@tochd410](https://t.me/tochd410)

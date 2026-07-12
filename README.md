# Job Tracker (PA for NB)

Voice-powered job hunt assistant: pipeline tracking, company browser, labels, and Google Calendar sync with an intelligence layer for interview updates.

Life design (Health · Work · Play · Love / Compass) now lives in a separate repo: [observe-life](https://github.com/nikitabansal01/observe-life).

## Features

- **Voice dump**: speak or type updates about interviews and applications
- **Pipeline + Browse**: status track, labels, company filters
- **Google Calendar sync**: targeted read-only search + LLM/heuristic intelligence
- **Optional Clerk sign-in**: browser-local by default; account save when signed in

## Quick start

```bash
npm run install-all
cp .env.example .env
cp client/.env.example client/.env.local
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5001

## Env

See `.env.example` for:

- `OPENAI_API_KEY` — smarter voice + calendar intelligence
- `CLERK_SECRET_KEY` / client publishable key — sign-in
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` / `CLIENT_URL` — calendar
- `DATABASE_URL` — Neon on Vercel

## Deploy

Configured for Vercel (`api/index.js` + Vite static build). Add the same env vars in the Vercel project.

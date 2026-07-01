# PA for NB — Personal Assistant

Life design app inspired by Stanford's *Designing Your Life*. Build your structure slowly: start with where you are, set your compass, then grow tools area by area.

## Architecture (Designing Your Life mapping)

```
PA for NB
├── Overview          → HWPL dashboard (Health · Work · Play · Love gauges)
├── Compass           → Workview + Lifeview (philosophy layer)
├── Work              → Career execution
│   ├── Workview      → career philosophy (same data as Compass, Work-only view)
│   └── Job search    → voice dump, pipeline, company browser (V0 MVP)
├── Health            → coming soon
├── Play              → coming soon
└── Love              → coming soon
```

| DYL concept | In this app |
|-------------|-------------|
| HWPL Dashboard | **Overview** — rate each area 0–100%, add notes |
| Workview | **Compass** + **Work → Workview** |
| Lifeview | **Compass** (whole-life meaning, not per-area) |
| Wayfinding / Odyssey / Prototype | Planned for later phases |

**Key design choice:** Career philosophy lives in **Workview**. Everything operational (job pipeline, voice dumps, interviews) lives under the **Work** area — not a separate top-level "Career" tab.

## V0 — Job search (under Work)

- **Voice dump**: speak naturally about interviews, status changes, next steps
- **Smart parsing**: extracts company, role, industry, funding stage, interview dates, follow-ups, prep needs
- **Live dashboard**: color-coded cards with status pipeline, action flags, and next steps
- **Optional sign-in**: data stays in your browser by default; create an account to save to the server
- **Example data**: fictional demo companies on first load — clearly labeled, not your real applications

## Quick start

```bash
npm run install-all
cp .env.example .env   # optional: OpenAI key + JWT secret
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5001

## Data & privacy

| Mode | Where your data lives |
|------|----------------------|
| **Not signed in** | Browser `localStorage` on your machine only |
| **Signed in** | Server `data/accounts/<your-id>/` (gitignored, never in the repo) |
| **First visit** | Fictional **example** companies from `server/example-data.json` |

Your real job applications are **never committed to GitHub**. The repo only ships dummy example data.

## Optional authentication

Sign in or create an account from the header. When you do:

1. Any local (non-example) data in your browser is migrated to your account
2. Future changes sync to your account on the server
3. Sign out returns you to local-only mode

No account required — the app works fully offline-first in your browser.

## AI parsing (recommended)

Add your OpenAI API key in `.env` for smarter voice dump parsing:

```bash
OPENAI_API_KEY=sk-...
```

Without a key, the app uses a basic heuristic parser (still works, just less accurate).

## Example voice dumps

> "I had my recruiter screen at Acme Corp yesterday for a Senior PM role. They're Series D, fintech. Next step is a technical interview next Tuesday — I need to prep system design."

> "Heard back from Notion — moving to onsite! Need to follow up with recruiter to confirm travel."

## Tech stack

- **Frontend**: React + Vite + localStorage
- **Backend**: Express + per-user JSON storage (when signed in)
- **Auth**: JWT + bcrypt (optional)
- **Voice**: Web Speech API (Chrome/Safari)
- **Parsing**: OpenAI GPT-4o-mini (optional) with heuristic fallback

## Project structure

```
pa-for-nb/
├── server/
│   ├── example-data.json   # Fictional demo data (committed)
│   ├── auth.js             # Optional sign-in
│   └── userDb.js           # Per-account storage
├── client/                 # React dashboard
├── data/                   # User accounts (gitignored, local only)
└── .env                    # API keys (gitignored)
```

## Future areas (post-MVP)

Following the DYL sequence, planned additions:

1. **Wayfinding** — Good Time Journal (engagement + energy tracking)
2. **Getting Unstuck** — mind maps, anchor problem reframes
3. **Odyssey Plans** — three 5-year life sketches
4. **Prototyping** — life design interviews, small experiments
5. **Health / Play / Love** — area-specific tools beyond dashboard gauges

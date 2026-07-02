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

## Deploy on Vercel

The app is configured for Vercel: the Vite client builds to static files, and the Express API runs as a serverless function at `/api/*`.

### Cursor / agent plugin

In Cursor, install the Vercel agent plugin with **`/add-plugin vercel`** (or use the plugin marketplace). The CLI command `npx plugins add vercel/vercel-plugin` is for Claude Code / Codex environments.

### This app does **not** use Clerk

Sign-in is **custom JWT + bcrypt** (`server/auth.js`), not [Clerk](https://clerk.com). Do **not** add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, or `VITE_CLERK_*` — the code never reads them.

If Vercel shows a red error **"No environment variables were created"**, you are usually:

- Pasting Clerk’s env block (wrong product — nothing will wire up), or
- Using **bulk import** with an empty field, comments-only text, or duplicate keys that already exist, or
- Importing branch-scoped vars on a project **not linked to Git**

**Fix:** add the variables below **one at a time** in the dashboard (see manual steps).

### Deploy steps

1. Push the repo to GitHub (if not already).
2. Import the project in [Vercel](https://vercel.com/new) — root directory stays `.` (Vercel reads `vercel.json`).
3. Add environment variables manually (see next section).
4. Deploy. Preview URLs get a fresh deployment on each push.

### Manual env vars in Vercel (exact steps)

1. Open your project on [vercel.com](https://vercel.com) → **Settings** → **Environment Variables**.
2. Click **Add** (not bulk import).
3. Add each row separately:

| Key | Example value | Environments |
|-----|---------------|--------------|
| `OPENAI_API_KEY` | `sk-...` from OpenAI | Production, Preview (optional) |
| `JWT_SECRET` | 32+ char random string | Production only (optional; sign-in has storage limits on Vercel) |

4. Leave **Key** exactly as shown (case-sensitive). No `VITE_` prefix needed — the client never reads these; only the Express API does.
5. Click **Save**, then **Redeploy** the latest deployment (env changes do not apply to old builds).

Reference file: [`.env.vercel.example`](.env.vercel.example) (copy values, not Clerk keys).

### Troubleshooting "No environment variables were created"

| Cause | What to do |
|-------|------------|
| Pasted Clerk keys from Clerk Dashboard | Ignore Clerk; use `OPENAI_API_KEY` / `JWT_SECRET` only |
| Bulk import textarea empty or comments only | Add variables **one by one** with Add |
| Duplicate key already exists | Edit the existing variable instead of re-importing |
| `KEY=` with no value | Vercel rejects empty values |
| Branch-scoped var, project not on Git | Link GitHub repo first, or remove branch scope |

### What works on Vercel

| Feature | On Vercel |
|---------|-----------|
| Dashboard, HWPL, compass | Yes (static SPA) |
| Voice dump (not signed in) | Yes — data stays in browser `localStorage` |
| Voice dump parsing | Yes — needs `OPENAI_API_KEY` for AI mode |
| Example companies | Yes — served from bundled JSON |
| Sign-in / cloud save | **Limited** — see below |

### Storage caveat

Vercel serverless functions use an **ephemeral filesystem**. User accounts and saved applications written to `data/` **do not persist** across deployments or function cold starts. For production cloud save, use external storage (e.g. Vercel Postgres, KV, or Blob) — not included in V0.

**Recommended for Vercel:** use the app without signing in; your job data lives in the browser. Sign-in is best kept for local/self-hosted runs.

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

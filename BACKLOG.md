# Product backlog

Ideas and follow-ups we are intentionally **not** building yet.  
Add new entries at the top. Keep each item short so it stays scannable.

## Entry format

| Field | What to write |
|--------|----------------|
| **Date** | YYYY-MM-DD |
| **Developer** | Full name |
| **Idea** | One-line title + a short paragraph |
| **Context** | Optional: where it showed up, why we parked it |
| **Status** | `parked` (default) · `ready` · `done` · `dropped` |

---

## Entries

### Server-side speech-to-text (Whisper) instead of browser Web Speech API

| | |
|--------|----------------|
| **Date** | 2026-07-12 |
| **Developer** | Prerit Saxena |
| **Status** | parked |

**Idea:** MediaRecorder + Whisper for mic input. Tried in mock interview; produced consistent `0 bytes` / empty captures on localhost for this project. Reverted mock + Voice Dump to the original browser Web Speech API (live transcript), which is the proven path in Voice Dump.

**Context:** Keep `POST /api/speech-to-text` for a future retry. Do not switch the product mic UX back to Whisper until we have a working capture path on target browsers.

---

### Mock interview topics chosen by LLM (not a hard-coded list)

| | |
|--------|----------------|
| **Date** | 2026-07-12 |
| **Developer** | Prerit Saxena |
| **Status** | parked |

**Idea:** As more roles are added beyond PM / Software Engineer / Data Scientist, mock-interview **topic** options (e.g. Product sense vs System design) should be decided by an LLM from the role + JD + career context, instead of a hard-coded allowlist per track.

**Context:** v1 filters topics by track in [`client/src/utils/mockInterview.js`](client/src/utils/mockInterview.js) (`MOCK_TOPICS` + `getMockTopicsForTrack`). That is fine for three tracks; an LLM catalog will scale better when role coverage grows. Do not implement until we feel the hard-coded list is becoming a maintenance burden.

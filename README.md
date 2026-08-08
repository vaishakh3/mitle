# MeetCute

One match a day. No photos, no chat, no swiping — the app pairs you with
someone nearby, and if you both say yes it picks a cafe and a one-hour window
for you to meet. When the window closes, the match vanishes from the app
forever. The only way the story continues is if you actually meet.

## How the loop works

```
daily cron ──▶ match created (pending, anonymous)
                 ├─ either declines / deadline passes ──▶ dissolved, back in pool tomorrow
                 └─ both accept ──▶ committed:
                       venue (cafe near your midpoint) + time window + spot hints revealed
                       window ends ──▶ match deleted from the app
```

- Users never see each other's name or photo — only a self-written
  "how to spot me" hint, revealed after both commit.
- Matching is random but filtered by mutual preferences (gender, age,
  distance) and nudged by interest overlap. A pair is never matched twice.
- Deleted matches are archived server-side (pair + outcome only) for
  re-match prevention and trust & safety.

## Stack

- **Mobile:** Expo SDK 57 (React Native + TypeScript, expo-router) — `apps/mobile`
- **Backend:** Supabase — Postgres + RLS, email-OTP auth, Deno edge functions
- **Venues:** Google Places API (New), with a mock fallback for local dev
- **Matching/window logic:** pure TS in `supabase/functions/_shared`, unit-tested with vitest

## Local development

Prereqs: Node 20+, Docker (Colima works: `colima start`).

```sh
npm install                 # root dev deps (vitest, supabase-js for scripts)
npm run db:start            # local Supabase stack (applies migrations)
npm run seed                # 7 fake users around Bangalore
npm run functions:serve     # edge functions (keep running)

npm run trigger:match       # manually run the daily matcher
npm run trigger:expire      # manually run the expiry sweeper

cd apps/mobile
npm install --legacy-peer-deps
npx expo start              # scan QR with Expo Go
```

`apps/mobile/.env` is pre-filled with the local stack's URL + anon key.
Seed users sign in with password `meetcute-test-123` (or email OTP via
Mailpit at http://127.0.0.1:54324).

### Secrets (edge functions)

`supabase/functions/.env` (copy from `.env.example`):

| Var | Purpose |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` | Real cafe picking; empty = mock venue |
| `MEETCUTE_TZ` | IANA timezone for meet windows (single-region MVP) |
| `CRON_SECRET` | Required header for cron functions in prod; empty locally |

## Testing

```sh
npm test                    # unit tests for the matching engine + time windows
npm run verify:e2e          # full loop against the local stack (needs seed + functions:serve + trigger:match)
npm run typecheck           # root shared code + mobile app
```

## Production notes

- Push the schema with `npx supabase db push` to a hosted project, deploy
  functions with `npx supabase functions deploy`.
- Schedule crons by running `supabase/prod-cron.sql` (fill in project ref +
  vault secret) — locally we trigger manually instead.
- Set function secrets: `npx supabase secrets set GOOGLE_PLACES_API_KEY=... MEETCUTE_TZ=... CRON_SECRET=...`
- Remote push notifications require an EAS development build
  (`extra.eas.projectId`); they no-op silently in Expo Go.

## Anonymity model (the important bit)

Clients have **no read access** to the `matches` table or other users'
`profiles` rows (RLS deny-all). Everything a client learns about a match
comes from the `get_current_match()` security-definer RPC, which returns
only: status, deadline, and — after both accept — venue, window, and the
other person's spot hint. Identity leaks are structurally impossible, not a
client-side courtesy.

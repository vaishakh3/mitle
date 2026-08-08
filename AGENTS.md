# MeetCute — agent notes

Blind meet-cute dating app: one anonymous match/day, both must accept, app
picks a cafe + 1-hour window, match self-destructs when the window ends.

## Layout

- `apps/mobile` — Expo SDK 57 app (expo-router). Read
  `apps/mobile/AGENTS.md`: SDK 57 docs at https://docs.expo.dev/versions/v57.0.0/
  before writing Expo code. Install deps with `npm install --legacy-peer-deps`.
- `supabase/migrations` — schema + RLS. New Supabase does NOT auto-grant
  table access to API roles; every new table needs explicit `grant` statements.
- `supabase/functions/_shared` — pure TS logic (matching, time, venues, push).
  Keep it free of Deno/Node APIs so vitest can import it (`db.ts` is the only
  Deno-specific file and is excluded in root tsconfig).
- `supabase/functions/{daily-match,respond-match,expire-matches}` — Deno edge
  functions. `daily-match`/`expire-matches` are cron-invoked (verify_jwt=false,
  guarded by `x-cron-secret` when CRON_SECRET is set).
- `scripts/` — seed, manual cron triggers, e2e verification (all run against
  the LOCAL stack via `supabase status` credentials).

## Invariants (do not break)

- Clients must never be able to read the other user's identity: `matches`,
  `match_history`, and `meet_feedback` have deny-all RLS; all match reads go
  through SECURITY DEFINER RPCs (`get_current_match`, `get_pending_feedback`,
  `submit_meet_feedback`) which redact identity.
- One non-terminal match per user (partial unique indexes on `matches`).
- Pairs are never re-matched (checked against `match_history` in the matcher).
- Terminal matches are deleted from `matches` and archived to `match_history`
  (pair + outcome only). `get_current_match` also hides committed matches the
  moment `window_end` passes, before the cron sweeps them.
- `respond-match` uses guarded status-transition updates (`.eq('status', ...)
  .select()`) so racing accepts commit exactly once — keep that pattern.
- Use `lib/dialog.ts` instead of React Native `Alert` (Alert is a no-op on
  react-native-web).

## Verification

- `npm test` — matching engine unit tests (vitest)
- `npm run typecheck` — root shared code + mobile tsc
- `npm run verify:e2e` — full loop e2e; needs `db:start`, `seed`,
  `functions:serve` running, and one `trigger:match`
- Local stack needs Docker (`colima start` on this machine)

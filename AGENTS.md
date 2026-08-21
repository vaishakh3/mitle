# Milte — agent notes

Private real-world dating app: one anonymous match/day, both must accept, app
selects a named public place + 1-hour window, match self-destructs when the window ends.

## Layout

- `apps/mobile` — Expo SDK 57 app (expo-router). Read
  `apps/mobile/AGENTS.md`: SDK 57 docs at https://docs.expo.dev/versions/v57.0.0/
  before writing Expo code. Install deps with `npm install --legacy-peer-deps`.
- `infra/aws/template.yaml` — production AWS SAM stack in `ap-south-1`.
- `infra/aws/app` — Node 22 Lambda router plus pure matching/time domain code.
- `supabase/` — retained legacy prototype and reference tests; it is not the
  production runtime and should not be wired back into the client.
- `scripts/` — legacy seed/e2e utilities and screenshot generation.

## Invariants (do not break)

- Clients never receive another user's ID, name, age, birthday, gender, or
  profile record. All DynamoDB access is private to the Lambda execution role.
- One non-terminal match per user is enforced with conditional DynamoDB
  transactions on each user's `ACTIVE` pointer.
- Pair-history records prevent re-matching; terminal matches are removed and
  archived as pair + outcome only.
- Match acceptance uses conditional writes so racing accepts commit once.
- Venue, spot hint, and window reveal only after two yeses; the recognition
  phrase remains time-gated until 30 minutes before the meet.
- Use `lib/dialog.ts` instead of React Native `Alert` (Alert is a no-op on
  react-native-web).

## Verification

- `npm test` — matching engine unit tests (vitest)
- `npm run typecheck` — root shared code + mobile tsc
- `npm run aws:test` — production Lambda typecheck + domain unit tests
- `npm run web:export` — Expo production web export using `apps/mobile/.env`
- `sam validate --lint` and `sam build` from `infra/aws` before deployment

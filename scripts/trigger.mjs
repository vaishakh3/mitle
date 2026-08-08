// Manually invokes a cron edge function on the LOCAL stack:
//   node scripts/trigger.mjs daily-match
//   node scripts/trigger.mjs expire-matches
// Requires `npm run functions:serve` to be running.
import { localSupabaseEnv } from './local-env.mjs';

const fn = process.argv[2];
if (!['daily-match', 'expire-matches'].includes(fn)) {
  console.error('usage: node scripts/trigger.mjs <daily-match|expire-matches>');
  process.exit(1);
}

const { url, anonKey } = localSupabaseEnv();
const res = await fetch(`${url}/functions/v1/${fn}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${anonKey}` },
});
console.log(res.status, await res.text());

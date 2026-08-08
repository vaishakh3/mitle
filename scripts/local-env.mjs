// Reads local Supabase credentials from `supabase status`.
import { execSync } from 'node:child_process';

export function localSupabaseEnv() {
  const out = execSync('npx supabase status --output json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const json = JSON.parse(out.slice(out.indexOf('{')));
  const url = json.API_URL ?? json.api_url;
  const serviceKey = json.SERVICE_ROLE_KEY ?? json.service_role_key;
  const anonKey = json.ANON_KEY ?? json.anon_key;
  if (!url || !serviceKey) {
    throw new Error('Could not read local Supabase status. Is `npm run db:start` running?');
  }
  return { url, serviceKey, anonKey };
}

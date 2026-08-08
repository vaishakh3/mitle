import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Service-role client: bypasses RLS. Server-side only. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

/** Resolves the calling user from the request's Authorization header. */
export async function userFromRequest(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id };
}

/** Guard for cron-invoked functions. */
export function checkCronSecret(req: Request): boolean {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret) return true; // local dev: no secret configured
  return req.headers.get('x-cron-secret') === secret;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const AUTH_REQUEST_WINDOW_MS = 60 * 60 * 1000;
export const AUTH_REQUESTS_PER_WINDOW = 4;
export const AUTH_REQUEST_MIN_INTERVAL_MS = 60 * 1000;
export const AUTH_PROVIDER_BACKOFF_MS = 60 * 60 * 1000;
export const AUTH_TRANSIENT_BACKOFF_MS = 60 * 1000;

export interface AuthRequestHistory {
  requestTimes?: number[];
  retryAt?: number;
}

export function normalizeAuthEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function recentAuthRequests(history: AuthRequestHistory | null | undefined, now: number): number[] {
  return (history?.requestTimes ?? [])
    .filter((time) => Number.isFinite(time) && time > now - AUTH_REQUEST_WINDOW_MS && time <= now)
    .sort((a, b) => a - b)
    .slice(-AUTH_REQUESTS_PER_WINDOW);
}

export function nextAuthRequestAt(history: AuthRequestHistory | null | undefined, now: number): number {
  const recent = recentAuthRequests(history, now);
  let next = Math.max(now, history?.retryAt ?? 0);

  const last = recent.at(-1);
  if (last != null) next = Math.max(next, last + AUTH_REQUEST_MIN_INTERVAL_MS);
  if (recent.length >= AUTH_REQUESTS_PER_WINDOW) {
    next = Math.max(next, recent[0] + AUTH_REQUEST_WINDOW_MS);
  }
  return next;
}

export function authRetryAfterSeconds(history: AuthRequestHistory | null | undefined, now: number): number {
  return Math.max(0, Math.ceil((nextAuthRequestAt(history, now) - now) / 1000));
}

export function recordAuthRequest(history: AuthRequestHistory | null | undefined, now: number): AuthRequestHistory {
  return {
    requestTimes: [...recentAuthRequests(history, now), now].slice(-AUTH_REQUESTS_PER_WINDOW),
    retryAt: undefined,
  };
}

export function providerBackoff(errorCode: string | undefined, now: number): number | undefined {
  if (errorCode === 'LimitExceededException') return now + AUTH_PROVIDER_BACKOFF_MS;
  if (errorCode === 'TooManyRequestsException') return now + AUTH_TRANSIENT_BACKOFF_MS;
  return undefined;
}

export function formatRetryDuration(seconds: number): string {
  if (seconds <= 0) return 'now';
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

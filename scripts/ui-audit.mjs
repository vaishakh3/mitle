import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const webRoot = join(projectRoot, 'apps/mobile/dist');
const outputRoot = join(projectRoot, 'release/ui-evidence');
const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json'],
  ['.png', 'image/png'],
  ['.ttf', 'font/ttf'],
]);

await mkdir(outputRoot, { recursive: true });

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const requested = normalize(join(webRoot, pathname));
    let file = requested.startsWith(webRoot) ? requested : join(webRoot, 'index.html');
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    if (!(await stat(file).catch(() => null))?.isFile()) file = join(webRoot, 'index.html');
    response.writeHead(200, { 'cache-control': 'no-store', 'content-type': types.get(extname(file)) ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain' });
    response.end(error instanceof Error ? error.message : 'server error');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Could not start UI audit server.');
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

const now = new Date();
const tomorrow = new Date(Date.now() + 24 * 3600_000);
tomorrow.setHours(18, 30, 0, 0);
const windowEnd = new Date(tomorrow.getTime() + 3600_000);
const deadline = new Date(Date.now() + 3 * 3600_000).toISOString();
const consentAt = '2026-08-29T09:00:00.000Z';
const profile = {
  user_id: 'ui-audit-user', display_name: 'Asha', birthdate: '1998-04-12', gender: 'woman',
  username: 'quiet-lantern-4821', avatar_id: '04',
  spot_hint: 'Ochre shirt and a paperback', lat: 9.931, lng: 76.267,
  location_updated_at: now.toISOString(), expo_push_token: null, is_paused: false,
  is_suspended: false, onboarding_complete: true, rules_acknowledged_at: consentAt,
  terms_accepted_at: consentAt, terms_version: '2026-08-21', privacy_accepted_at: consentAt,
  privacy_version: '2026-08-21', community_accepted_at: consentAt,
  community_version: '2026-08-21', safety_acknowledged_at: consentAt,
};
const preferences = {
  user_id: 'ui-audit-user', interested_genders: ['man'], age_min: 24, age_max: 36,
  radius_km: 10, available_days: [0, 1, 2, 3, 4, 5, 6], preferred_hour: 19,
  relationship_intent: 'long_term', social_energy: 'balanced', date_style: 'coffee', budget_level: 2,
};
const interests = [
  { id: 1, slug: 'books', label: 'Books', emoji: '📚' },
  { id: 2, slug: 'films', label: 'Films', emoji: '🎞️' },
  { id: 3, slug: 'food', label: 'Food walks', emoji: '🥘' },
  { id: 4, slug: 'music', label: 'Live music', emoji: '🎵' },
  { id: 5, slug: 'art', label: 'Art & design', emoji: '🎨' },
];
const matches = {
  empty: null,
  pending: {
    match_id: 'ui-pending', status: 'pending', you_accepted: false, they_accepted: false,
    accept_deadline: deadline, venue: null, window_start: null, window_end: null,
    their_spot_hint: null, your_signal: null, their_signal: null, you_confirmed: false,
    they_confirmed: false, confirmation_opens_at: null, meeting_phrase: null,
    cancelled: false, cancelled_by_you: false,
  },
  committed: {
    match_id: 'ui-committed', status: 'committed', you_accepted: true, they_accepted: true,
    accept_deadline: deadline,
    venue: { name: 'French Toast, Kacheripady', address: 'Kacheripady, Kochi, Kerala', lat: 9.987, lng: 76.285, maps_url: 'https://maps.google.com/' },
    window_start: tomorrow.toISOString(), window_end: windowEnd.toISOString(),
    their_spot_hint: 'Blue kurta, carrying a yellow book', your_signal: null, their_signal: null,
    you_confirmed: false, they_confirmed: true, confirmation_opens_at: new Date(Date.now() - 60_000).toISOString(),
    meeting_phrase: 'Monsoon postcards', cancelled: false, cancelled_by_you: false,
  },
};
const session = {
  accessToken: 'ui-audit-access', idToken: 'ui-audit-id', refreshToken: 'ui-audit-refresh',
  expiresAt: Date.now() + 3600_000, user: { id: 'ui-audit-user', email: 'asha@example.com' },
};

async function makeContext(authenticated = false, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  if (authenticated) {
    await context.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
      'milte.aws.session.v1', JSON.stringify(session),
    ]);
  }
  return context;
}

async function mockApi(page, state, onboardingComplete = true) {
  await page.route('https://5t32c9fq3l.execute-api.ap-south-1.amazonaws.com/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body;
    if (path === '/me/profile') body = { ...profile, onboarding_complete: onboardingComplete };
    else if (path === '/me/preferences') body = preferences;
    else if (path === '/interests') body = interests;
    else if (path === '/me/interests') body = [1, 2, 4];
    else if (path === '/match/current') body = matches[state];
    else if (path === '/feedback/pending' || path === '/second-chapter') body = null;
    else body = {};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function assertViewport(page, label) {
  const metrics = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    height: document.documentElement.scrollHeight,
    viewport: window.innerWidth,
    width: document.documentElement.scrollWidth,
  }));
  assert.ok(metrics.width <= metrics.viewport, `${label} has horizontal overflow: ${metrics.width} > ${metrics.viewport}`);
  assert.notEqual(metrics.background, 'rgb(11, 10, 13)', `${label} still uses the retired dark canvas`);
  assert.ok(metrics.height > 0, `${label} rendered no page height`);
}

async function assertSelectedBadgeOverlays(page, label, avatarLabel) {
  const selected = await page.getByRole('radio', { name: `${avatarLabel} token` }).boundingBox();
  const badge = await page.getByText('✓', { exact: true }).locator('..').boundingBox();
  assert.ok(selected && badge, `${label} selected avatar and badge must be measurable`);
  assert.ok(badge.x + badge.width > selected.x + selected.width, `${label} badge must extend past the avatar's right edge`);
  assert.ok(badge.y < selected.y, `${label} badge must extend above the avatar's top edge`);
}

async function capture(name, path, { state = 'empty', authenticated = false, onboardingComplete = true, fullPage = false, after, viewport } = {}) {
  const context = await makeContext(authenticated, viewport);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  if (authenticated) await mockApi(page, state, onboardingComplete);
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  if (after) await after(page);
  await page.waitForTimeout(400);
  await assertViewport(page, name);
  await page.screenshot({ path: join(outputRoot, `${name}.png`), fullPage });
  assert.deepEqual(errors.filter((message) => !/Download the React DevTools/i.test(message)), [], `${name} browser errors`);
  await context.close();
}

try {
  await capture('01-sign-in-phone', '/sign-in');
  await capture('02-sign-in-desktop', '/sign-in', { viewport: { width: 1280, height: 900 } });
  await capture('03-onboarding', '/', { authenticated: true, onboardingComplete: false, after: async (page) => {
    const birthdate = page.getByLabel('Date of birth');
    await birthdate.waitFor();
    assert.equal(await birthdate.getAttribute('type'), 'date', 'web birthdate must use a real calendar input');
  } });
  await capture('04-onboarding-token', '/', { authenticated: true, onboardingComplete: false, after: async (page) => {
    await page.getByLabel('First name').fill('Asha');
    await page.getByLabel('Date of birth').fill('1998-04-12');
    await page.getByRole('button', { name: 'Woman' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Choose how Milte feels like yours.').waitFor();
    await assertSelectedBadgeOverlays(page, 'Onboarding', 'Avatar 1');
  } });
  await capture('04-today-empty', '/today', { authenticated: true, state: 'empty', after: async (page) => {
    const brand = await page.getByLabel('Milte? Meet for real.').boundingBox();
    const avatar = await page.getByLabel('Your corner').boundingBox();
    assert.ok(brand && avatar, 'Today header outer controls must be measurable');
    const leftInset = brand.x;
    const rightInset = (await page.evaluate(() => window.innerWidth)) - (avatar.x + avatar.width);
    assert.ok(Math.abs(leftInset - rightInset) <= 1, `Today header edges are asymmetric: ${leftInset}px left vs ${rightInset}px right`);
  } });
  await capture('05-today-invitation', '/today', { authenticated: true, state: 'pending', after: async (page) => {
    await page.getByRole('button', { name: 'Open today’s private possibility' }).click();
    await page.getByRole('button', { name: 'I’m open to meeting' }).waitFor();
  } });
  await capture('06-meeting-ticket', '/today', { authenticated: true, state: 'committed', fullPage: true, after: async (page) => {
    const time = await page.getByText('6:30 PM – 7:30 PM', { exact: true }).boundingBox();
    assert.ok(time && time.height < 28, 'Meeting window must stay on one line');
  } });
  await capture('07-safety', '/safety', { authenticated: true, state: 'committed', fullPage: true });
  await capture('08-settings', '/settings', { authenticated: true, state: 'empty', fullPage: true, after: async (page) => {
    await assertSelectedBadgeOverlays(page, 'Your corner', 'Avatar 4');
  } });
  await capture('09-onboarding-token-compact', '/', { authenticated: true, onboardingComplete: false, fullPage: true, viewport: { width: 320, height: 568 }, after: async (page) => {
    await page.getByLabel('First name').fill('Asha');
    await page.getByLabel('Date of birth').fill('1998-04-12');
    await page.getByRole('button', { name: 'Woman' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Choose how Milte feels like yours.').waitFor();
    const title = await page.getByText('Choose how Milte feels like yours.').boundingBox();
    assert.ok(title && title.y < 240, 'Compact onboarding must reset to the top when the step changes');
    await assertSelectedBadgeOverlays(page, 'Compact onboarding', 'Avatar 1');
  } });
  await capture('10-today-invitation-compact', '/today', { authenticated: true, state: 'pending', fullPage: true, viewport: { width: 320, height: 568 }, after: async (page) => {
    await page.getByRole('button', { name: 'Open today’s private possibility' }).click();
    await page.getByRole('button', { name: 'I’m open to meeting' }).waitFor();
  } });
  await capture('11-settings-compact', '/settings', { authenticated: true, state: 'empty', fullPage: true, viewport: { width: 320, height: 568 }, after: async (page) => {
    await assertSelectedBadgeOverlays(page, 'Compact Your corner', 'Avatar 4');
  } });
  await capture('12-meeting-ticket-compact', '/today', { authenticated: true, state: 'committed', fullPage: true, viewport: { width: 320, height: 568 }, after: async (page) => {
    const time = await page.getByText('6:30 PM – 7:30 PM', { exact: true }).boundingBox();
    assert.ok(time && time.height < 28, 'Compact meeting window must stay on one line');
  } });
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log(`UI audit passed: 13 responsive states → ${outputRoot}`);

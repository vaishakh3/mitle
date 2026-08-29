import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const webRoot = join(projectRoot, 'apps/mobile/dist');
const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2'],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const requested = normalize(join(webRoot, pathname));
    let file = requested.startsWith(webRoot) ? requested : join(webRoot, 'index.html');
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    if (!(await stat(file).catch(() => null))?.isFile()) file = join(webRoot, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': types.get(extname(file)) ?? 'application/octet-stream',
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'server error');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Could not start the browser test server.');
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

async function withPage(run, { allowedConsoleErrors = [], viewport = { width: 390, height: 844 } } = {}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  try {
    await run(page);
    const actionableErrors = consoleErrors.filter((message) => (
      !/Download the React DevTools/i.test(message)
      && !allowedConsoleErrors.some((allowed) => allowed.test(message))
    ));
    assert.deepEqual(actionableErrors, [], `browser errors: ${actionableErrors.join('\n')}`);
  } finally {
    await context.close();
  }
}

async function openSignIn(page) {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').waitFor({ state: 'visible' });
}

async function mockCognito(page, respond) {
  await page.route('https://cognito-idp.ap-south-1.amazonaws.com/**', async (route) => {
    const request = route.request();
    const target = request.headers()['x-amz-target']?.split('.').at(-1) ?? '';
    const body = request.postDataJSON();
    const result = await respond({ target, body });
    await route.fulfill({
      status: result.status ?? 200,
      contentType: 'application/x-amz-json-1.1',
      body: JSON.stringify(result.body ?? {}),
    });
  });
}

const checks = [];
async function check(name, run) {
  try {
    await run();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

try {
  await check('one physical action produces one Cognito email request', () => withPage(async (page) => {
    let signupRequests = 0;
    await mockCognito(page, async ({ target }) => {
      assert.equal(target, 'SignUp');
      signupRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 120));
      return { body: { UserConfirmed: false, UserSub: 'test-user' } };
    });
    await openSignIn(page);
    const email = 'new-tester@example.com';
    await page.getByLabel('Email address').fill(email);
    await page.getByRole('button', { name: 'Continue with email' }).dblclick({ delay: 10 });
    await page.getByText(`We sent a 6- or 8-digit code to ${email}.`).waitFor();
    assert.equal(signupRequests, 1);

    await page.getByRole('button', { name: 'Use another email' }).click();
    await page.getByRole('button', { name: 'Continue with email' }).click();
    await page.getByText(`We sent a 6- or 8-digit code to ${email}.`).waitFor();
    assert.equal(signupRequests, 1, 'returning to the same address must reuse the live code');
  }));

  await check('existing-user Cognito flow accepts and submits an eight-digit email OTP', () => withPage(async (page) => {
    const email = 'existing-tester@example.com';
    let submittedCode;
    await mockCognito(page, ({ target, body }) => {
      if (target === 'SignUp') {
        return { status: 400, body: { __type: 'UsernameExistsException', message: 'User already exists' } };
      }
      if (target === 'InitiateAuth') {
        return { body: { ChallengeName: 'EMAIL_OTP', Session: 'existing-user-session' } };
      }
      if (target === 'RespondToAuthChallenge') {
        submittedCode = body.ChallengeResponses.EMAIL_OTP_CODE;
        const payload = Buffer.from(JSON.stringify({ sub: 'existing-user', email })).toString('base64url');
        return {
          body: {
            AuthenticationResult: {
              AccessToken: 'access-token',
              IdToken: `header.${payload}.signature`,
              RefreshToken: 'refresh-token',
              ExpiresIn: 3600,
            },
          },
        };
      }
      throw new Error(`Unexpected Cognito request: ${target}`);
    });
    await page.route('https://5t32c9fq3l.execute-api.ap-south-1.amazonaws.com/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ onboarding_complete: false }),
    }));
    await openSignIn(page);
    await page.getByLabel('Email address').fill(email);
    await page.getByRole('button', { name: 'Continue with email' }).click();
    const code = page.getByLabel('Email verification code');
    await code.fill('87654321');
    assert.equal(await code.inputValue(), '87654321');
    assert.equal(await page.getByRole('button', { name: 'Enter Milte' }).isDisabled(), false);
    await page.getByRole('button', { name: 'Enter Milte' }).click();
    await page.waitForURL(/\/onboarding$/);
    assert.equal(submittedCode, '87654321');
  }, { allowedConsoleErrors: [/status of 400 \(Bad Request\)/] }));

  await check('code actions stay inside a narrow viewport', () => withPage(async (page) => {
    await mockCognito(page, ({ target }) => {
      assert.equal(target, 'SignUp');
      return { body: { UserConfirmed: false, UserSub: 'narrow-user' } };
    });
    await openSignIn(page);
    await page.getByLabel('Email address').fill('narrow-tester@example.com');
    await page.getByRole('button', { name: 'Continue with email' }).click();
    const actions = [
      page.getByRole('button', { name: /Resend in/ }),
      page.getByRole('button', { name: 'Use another email' }),
    ];
    for (const action of actions) {
      const box = await action.boundingBox();
      assert.ok(box, 'action must be visible');
      assert.ok(box.x >= 0, 'action must not overflow the left edge');
      assert.ok(box.x + box.width <= 320, 'action must not overflow the right edge');
    }
  }, { viewport: { width: 320, height: 568 } }));

  await check('provider limits are honest, recoverable, and locally suppressed', () => withPage(async (page) => {
    let requests = 0;
    await mockCognito(page, ({ target }) => {
      assert.equal(target, 'SignUp');
      requests += 1;
      return {
        status: 400,
        body: { __type: 'LimitExceededException', message: 'Attempt limit exceeded' },
      };
    });
    await openSignIn(page);
    await page.getByLabel('Email address').fill('limited-tester@example.com');
    await page.getByRole('button', { name: 'Continue with email' }).click();
    await page.getByText(/Your address is fine/).waitFor();
    await page.getByRole('button', { name: 'Got it' }).click();
    const retry = page.getByRole('button', { name: /Try again in 1 hour/ });
    await retry.waitFor();
    assert.equal(await retry.isDisabled(), true);
    assert.equal(requests, 1);
  }, { allowedConsoleErrors: [/status of 400 \(Bad Request\)/] }));

  await check('new-account confirmation explains the second Cognito code', () => withPage(async (page) => {
    const targets = [];
    await mockCognito(page, ({ target, body }) => {
      targets.push(target);
      if (target === 'SignUp') return { body: { UserConfirmed: false, UserSub: 'two-code-user' } };
      if (target === 'ConfirmSignUp') return { body: { Session: 'confirmed-session' } };
      if (target === 'InitiateAuth' && body.Session === 'confirmed-session') {
        return { body: { ChallengeName: 'EMAIL_OTP', Session: 'signin-session' } };
      }
      throw new Error(`Unexpected Cognito request: ${target}`);
    });
    await openSignIn(page);
    await page.getByLabel('Email address').fill('confirmation-tester@example.com');
    await page.getByRole('button', { name: 'Continue with email' }).click();
    const code = page.getByLabel('Email verification code');
    await code.fill('123456');
    await page.getByRole('button', { name: 'Enter Milte' }).click();
    await page.getByText('One more code is on its way').waitFor();
    await page.getByText('Your account is confirmed. Enter the new sign-in code we just sent.').waitFor();
    assert.equal(await code.inputValue(), '');
    assert.deepEqual(targets, ['SignUp', 'ConfirmSignUp', 'InitiateAuth']);
  }));

  await check('public safety and account routes render from a cold navigation', () => withPage(async (page) => {
    for (const path of ['/terms', '/privacy', '/support', '/child-safety', '/delete-account']) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
      assert.ok((await page.locator('body').innerText()).trim().length > 100, `${path} rendered too little content`);
    }
  }));
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.table(checks);
console.log(`Browser verification passed: ${checks.length} checks.`);

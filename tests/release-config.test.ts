import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(import.meta.dirname, '..');

describe('production web security policy', () => {
  it('allows only the first-party API and regional Cognito endpoint for network requests', () => {
    const template = fs.readFileSync(path.join(repositoryRoot, 'infra/aws/template.yaml'), 'utf8');
    const cspLine = template.split('\n').find((line) => line.includes('ContentSecurityPolicy: !Sub'));

    expect(cspLine).toContain('connect-src \'self\'');
    expect(cspLine).toContain('https://${HttpApi}.execute-api.${AWS::Region}.${AWS::URLSuffix}');
    expect(cspLine).toContain('https://cognito-idp.${AWS::Region}.${AWS::URLSuffix}');
    expect(cspLine).not.toContain('connect-src *');
  });
});

describe('Play review release configuration', () => {
  it('increments the immutable Play version and exposes only the reviewer address', () => {
    const appConfig = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'apps/mobile/app.json'), 'utf8'));
    const authSource = fs.readFileSync(path.join(repositoryRoot, 'apps/mobile/lib/auth.tsx'), 'utf8');

    expect(appConfig.expo.android.versionCode).toBe(3);
    expect(appConfig.expo.extra.playReviewEmail).toBe('play-review@milte.app');
    expect(JSON.stringify(appConfig)).not.toMatch(/reviewPassword|playReviewPassword/i);
    expect(authSource).toContain("PREFERRED_CHALLENGE: 'PASSWORD'");
  });
});

describe('location privacy', () => {
  it('quantizes coordinates before they are sent to the production API', async () => {
    const { roundLocationPoint } = await import('../apps/mobile/lib/location-privacy.ts');

    expect(roundLocationPoint(9.9312328, 76.2673041)).toEqual({
      lat: 9.931,
      lng: 76.267,
    });
  });
});

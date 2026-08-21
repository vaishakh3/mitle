<p align="center">
  <img src="docs/banner.svg" alt="Milte — meet for real" width="100%" />
</p>

<p align="center">
  <strong>One person. One public place. One hour.</strong><br/>
  No feed, profiles, chat, follower counts, or swipe deck.
</p>

## What Milte does

Milte creates one private chance to meet someone in real life and then gets out of the way.

On a day you have marked available, the matching engine may pair you with one nearby stranger whose hard boundaries are mutually compatible. Both people decide independently. Only after two private yeses does Milte reveal a named public place from current map data, a one-hour window, and each person’s self-written recognition clue. No café partnership or third-party approval is required.

Twenty-four hours before the meet, both people privately reconfirm. Three hours before it, status-only controls—heading there, arrived, running late, or unable to come—remove uncertainty without rebuilding chat. A shared recognition phrase appears shortly before the hour. When the hour ends, the live match disappears.

If both people later say they met and independently leave a Second Chapter note, those two notes are revealed once. There is no inbox, profile archive, re-match, or audience.

## Product principles

- One active possibility at a time; scarcity is the feature.
- Hard mutual boundaries before scoring.
- Another member never receives names, birthdays, gender, exact profile data, or unrounded location. Foreground coordinates are rounded on-device before Milte's API receives them.
- Saying no is private and never hurts a ranking.
- Venues are named public places selected from current Amazon Location data; lookup failure stops the commitment.
- Meet-day signals solve reliability, not conversation.
- Confidential reports end the active plan and permanently prevent re-matching.
- Account deletion removes the Cognito identity and user-owned records while retaining only the documented minimal safety trail.

See [`docs/PRODUCT_PRINCIPLES.md`](docs/PRODUCT_PRINCIPLES.md), [`docs/BRAND.md`](docs/BRAND.md), [`docs/DOMAIN.md`](docs/DOMAIN.md), and [`docs/TRUST_SAFETY_RUNBOOK.md`](docs/TRUST_SAFETY_RUNBOOK.md).

## Stack

```text
apps/mobile              Expo SDK 57 · React Native · TypeScript · expo-router
                         Cognito passwordless auth · React Query · Reanimated
infra/aws/template.yaml  AWS SAM · API Gateway · Lambda · Cognito · DynamoDB
                         EventBridge Scheduler · Amazon Location · S3 · CloudFront
supabase/                legacy prototype/reference only; not production runtime
```

The production AWS region is Mumbai (`ap-south-1`). Infrastructure is serverless, encrypted, observable, and designed for controlled-beta cost levels.

## Run locally

```sh
git clone https://github.com/vaishakh3/meetcute.git
cd meetcute
npm install
cd apps/mobile
npm install --legacy-peer-deps
cp .env.example .env
npx expo start
```

## Verify

```sh
npm run release:verify
```

That gate runs the root and Lambda suites, strict TypeScript, Expo dependency checks, Expo Doctor, the production web export, SAM lint/build, and whitespace validation. Android release construction and artifact inspection are documented in [`docs/ANDROID_RELEASE.md`](docs/ANDROID_RELEASE.md).

## Release status

The current machine and human gates are tracked in [`docs/RELEASE_READINESS.md`](docs/RELEASE_READINESS.md). The repository can produce a locally signed APK and Play AAB without depending on EAS cloud build. Public release still correctly requires the owner’s Google Play account, legal review, named safety operator, physical-device checks, and controlled pilot.

<p align="center"><em>meet for real.</em></p>

# Milte asset manifest

> Retired identity archive. None of the assets listed here are current
> production artwork. See `../milte-question.svg` and the generated files
> in `apps/mobile/assets/` for the shipping identity.

## Current production artwork

| Asset | Source / export | Intended use |
|---|---|---|
| `../milte-question.svg` | Deterministic SVG | Master `milte?` / `m?` identity construction |
| `apps/mobile/assets/icon.png` | `scripts/generate-brand-assets.mjs` | Android and store icon |
| `apps/mobile/assets/favicon.png` | `scripts/generate-brand-assets.mjs` | Web favicon |
| `apps/mobile/assets/milte-cafe-table.png` | Built-in ImageGen | Invitation hero |
| `apps/mobile/assets/milte-crossed-paths.png` | Built-in ImageGen | Empty/location state |
| `apps/mobile/assets/avatar-{01..08}.png` | ImageGen + deterministic split/export | Abstract member avatars |

The avatar export recipe is `scripts/generate-avatar-assets.mjs`; generation
sources and exact prompts are recorded in `PROMPTS.md`.

## Archived artwork

| Asset | Format | Intended use |
|---|---|---|
| `vector/milte-symbol.svg` | SVG | Primary symbol on light backgrounds |
| `vector/milte-symbol-reversed.svg` | SVG | Symbol on dark backgrounds |
| `vector/milte-lockup.svg` | SVG | Horizontal logo and tagline; DM Sans must be available before outlining for print |
| `vector/milte-lockup-on-paper.svg` | SVG | Horizontal logo on a fixed warm-paper field |
| `vector/milte-lockup-reversed.svg` | SVG | Reversed horizontal logo on a fixed midnight field |
| `vector/milte-icon.svg` | SVG | Primary full-bleed app icon source |
| `vector/milte-icon-light.svg` | SVG | Light alternate icon source |
| `vector/milte-icon-accent.svg` | SVG | Campaign/accent icon source |
| `vector/milte-icon-background.svg` | SVG | Android adaptive background source |
| `vector/milte-adaptive-foreground.svg` | SVG | Android adaptive foreground; transparent canvas |
| `vector/milte-monochrome.svg` | SVG | Android themed icon and one-color print |
| `vector/milte-pattern.svg` | SVG | Repeatable campaign pattern source |
| `exports/milte-icon-1024.png` | PNG | Primary store/app icon export |
| `exports/milte-icon-light-1024.png` | PNG | Alternate icon export |
| `exports/milte-icon-accent-1024.png` | PNG | Campaign icon export |
| `exports/milte-adaptive-foreground-1024.png` | PNG | Android adaptive foreground export |
| `exports/milte-monochrome-512.png` | PNG | Themed icon test export |
| `exports/milte-lockup-1440.png` | PNG | Transparent horizontal logo and tagline export |
| `exports/milte-lockup-on-paper-1440.png` | PNG | Horizontal logo on Warm Paper export |
| `exports/milte-lockup-reversed-1440.png` | PNG | Reversed horizontal logo on Midnight Ink export |

## Accepted direction boards

| Asset | Status |
|---|---|
| `generated/01-core-symbol-concept.png` | Selected symbol concept |
| `generated/02-logo-lockups.png` | Selected lockup direction |
| `generated/03-app-icon-suite.png` | Selected icon colorways |
| `generated/04-visual-language-board.png` | Selected palette, pattern, icon, and campaign direction |

## Mockups

| Asset | Status |
|---|---|
| `mockups/01-mobile-product-direction.png` | UI target for implementation |
| `mockups/02-play-feature-graphic-concept.png` | Direction only; rebuild without generated signage |
| `mockups/03-outdoor-campaign.png` | Approved campaign mockup |
| `mockups/04-social-launch-grid.png` | Approved social campaign direction |
| `mockups/05-product-still-life.png` | Approved launch still-life mockup |

## Individual social exports

The nine tiles from the approved launch grid are available as separate 394 × 394 PNG files in `social/`, numbered `01` through `09`. They are concept-resolution exports; rebuild from the vector system at each platform's final delivery size before a paid campaign.

## Rejected explorations

| Asset | Reason |
|---|---|
| `working/01-paths-exploration.png` | Too soft, glowy, and moustache-like |
| `working/02-threshold-exploration.png` | Read as two people/wellness branding and used unwanted glow |

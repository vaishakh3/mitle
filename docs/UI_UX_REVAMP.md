# Milte UI/UX revamp — The invitation

## Goal

Make Milte feel like the most hopeful, intentional way to begin a real date:
light enough to feel welcoming, restrained enough to feel private, and clear
enough that a first-time member always knows what happens next. The interface
must remain recognisably Milte rather than becoming another photo-card dating
app.

## Research synthesis

The redesign reviewed current onboarding, discovery, daily-match, safety, and
empty-state flows from Hinge, Bumble, Tinder, Badoo, Coffee Meets Bagel, happn,
and Plenty of Fish in Mobbin, then checked current first-party product and
safety guidance.

The connected paid Mobbin account was re-audited on 2026-08-29. The cited
Hinge profile flow remains accessible as a 22-screen iOS sequence, and the
research account can access the saved app-flow library rather than relying on
search-result thumbnails or remembered patterns.

The recurring useful patterns were:

- one meaningful question per onboarding screen;
- a bright canvas, generous space, and a single obvious next action;
- a predictable daily cadence that does not reward constant checking;
- state copy that explains what is happening and what the person should do;
- safety actions grouped by the moment they are needed;
- private declines, easy pauses, and direct recovery from errors.

Milte deliberately does not adopt photo stacks, swipe gestures, popularity
signals, five-tab navigation, chat, or engagement loops. Those patterns fight
the product's promise rather than improving it.

The open-invitation state uses a deliberate editorial sequence rather than a
large generic card: status, a two-line headline with one blue line, the café
screen print, a high-contrast live deadline, and the private decision. This
gives the highest-emotion state visual character while keeping the choice and
its consequences unambiguous.

## Experience model

Milte is a daily ritual, not a dashboard:

1. **Set the shape of a good date.** Private eligibility, an immutable random
   username, an abstract character avatar, boundaries, availability, intent,
   interests, a recognition hint, and explicit consent.
2. **Return to Today.** One calm status explains whether Milte is arranging a
   possibility, needs location, is paused, or has an invitation.
3. **Make one private choice.** The invitation hides identity but never hides
   consequences, timing, or safety.
4. **Use the meeting ticket.** A named public venue, a one-hour window, a
   private clue, a time-gated phrase, readiness, Maps, calendar, plan sharing,
   and day-of signals.
5. **Close cleanly.** The live match disappears. Private feedback and a mutual
   Second Chapter are the only optional continuation.

## Visual identity

**The invitation** replaces the dark shell, the generic editorial-light first
pass, its unreadable bracket mark, and the over-literal chair logo. The final
direction was explicitly checked against Impeccable's AI-slop catalog and at
actual 16 px favicon size after visual review.

- Cool city paper is the primary canvas; white is reserved for functional surfaces.
- Ultramarine carries primary actions and hopeful emphasis; ink keeps hierarchy mature.
- The literal `milte?` wordmark is primary; its red question mark makes the
  Hinglish name an invitation instead of an unexplained symbol.
- The compact `m?` tile is reserved for app-icon and favicon contexts. Its
  generous optical safe area prevents cropping under Android masks.
- Leaf and rain blue remain semantic readiness and safety colours.
- Archivo carries direct roman display moments; DM Sans carries every decision,
  instruction, risk, and operational detail. Italic serif heroes are prohibited.
- Original screen-print illustrations extend the premise through mismatched
  empty chairs, chai, public-city paths, and a waiting table without showing
  synthetic couples. These illustrations never substitute for the logo.
- Eight member-selected soft geometric avatars bring character to navigation
  without photos or a beauty standard. The server assigns and atomically reserves
  a unique `adjective-noun-0000` username; it cannot be edited. Both persist
  across devices and remain absent from the match response.
- The mutual-reveal ticket is the visual crescendo: warm paper, a crisp
  ultramarine place panel, a three-colour registration edge, meeting-point
  geometry, and direct venue typography. No blurred or low-opacity raster sits
  behind operational text.
- Flat fields, dividers, and varied spatial rhythm do most of the work. Ordinary
  cards have neither shadows nor keyline-plus-shadow combinations. Modal layers
  may lift; the date ticket gets one defined physical edge.
- `DESIGN.md` is the enforceable source of truth for palette, type, radii,
  component character, and anti-references.

## Quality rules

- The primary action must fit a 320 px-wide viewport without horizontal
  scrolling.
- Every control has at least a 48 px touch target and an accessibility role or
  label where its visible text is insufficient.
- Normal text and essential state colours meet WCAG AA contrast.
- The interface follows system reduced-motion settings.
- Loading, empty, error, paused, location-off, pending, accepted, committed,
  cancelled, feedback, and suspended states all remain usable without colour
  alone.
- Auth copy describes the provider's real six- and eight-digit formats; the
  client accepts exactly those formats.
- Safety language is literal. Poetic language never obscures emergency,
  report, cancellation, privacy, or consent consequences.

## Reference flows

- Hinge profile setup: https://mobbin.com/flows/3ff91748-6aae-40a0-ac38-90ec4d81a050
- Hinge account setup: https://mobbin.com/flows/2bccb87a-efc7-43a8-b3e7-825aad209912
- Bumble matching: https://mobbin.com/flows/e693028d-bda9-45a7-8276-2c1c0fb08e33
- Tinder Safety Center: https://mobbin.com/flows/0f4b194d-821e-48a1-b737-b0a1f0733eb0
- Badoo safety: https://mobbin.com/flows/aabb55ee-83f9-49c2-8114-1634ddb24f19
- Coffee Meets Bagel Suggested: https://mobbin.com/flows/a04f173e-f0d3-44d6-bb22-9392bd909a84
- happn Likes: https://mobbin.com/flows/1fdac421-8c87-4e11-b082-41245083e0ff
- Plenty of Fish Meet me: https://mobbin.com/flows/a3fc8aff-56b4-450c-af68-dd15114eafa4

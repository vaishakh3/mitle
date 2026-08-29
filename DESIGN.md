# Milte design system

## Product mode

Milte is an **operate-first dating product**. It helps one person understand one
private possibility, make one decision, and get off the phone. It is not a
profile feed, lifestyle publication, wellness brand, or romance mood board.

The interface should feel direct, hopeful, adult, and quietly Indian without
ornamental stereotypes. Safety is calm and unambiguous. Copy never pressures a
yes or treats a match as a reward.

## Identity: the invitation

The primary identity is the spoken invitation **milte?**—not a pictogram that a
new person must decode. The wordmark is lowercase Archivo 700 in ink, with the
question mark in signal red. The punctuation turns the name into an active,
human invitation: shall we meet? The compact **m?** mark is reserved for app
icons, favicons, and other spaces too small for the full name. It sits on an
ultramarine field with a white `m` and marigold question mark.

Mismatched chairs, chai, and crossed city paths remain part of Milte's tactile
screen-print illustration language. They create anticipation without stock
couples, faces, hearts, or dating-app clichés, but they are never used as the
logo or favicon.

Every member receives a server-generated anonymous username in the form
`adjective-noun-0000`. It is unique, permanently reserved to the account, and
not editable, preventing a handle from quietly becoming a real name. Members
also choose one of eight soft geometric character avatars. Their abstraction is
deliberate: they add personality without publishing a photo or creating a beauty
standard. The avatar appears in the owner's header, onboarding, and settings;
neither username nor avatar is returned in a match response.

- Primary canvas: `#F6F7F8`
- Deep canvas: `#ECEFF1`
- Surface: `#FFFFFF`
- Ink: `#161719`
- Secondary ink: `#373B40`
- Muted text: `#5A626A`
- Border: `#C9CED3`
- Soft border: `#E1E4E7`
- Signal red: `#C73A2C`
- Signal-red text: `#B53627`
- Ultramarine: `#2347D8`
- Marigold: `#F0B83E`
- Success: `#25734B`
- Warning: `#835400`
- Danger: `#B42318`

Ultramarine carries primary actions and the compact app mark. Signal red makes
the wordmark an invitation; marigold marks the shared place or time. Never wash a
whole screen in all three colours. Do not introduce gradients, candy pink, or
decorative colour fields.

## Type

- Display: Archivo 700, 42/45, tracking -1.7
- Title: Archivo 700, 28/33, tracking -0.8
- Subtitle: Archivo 600, 19/25
- Body: DM Sans 400, 16/24
- Supporting: DM Sans 400, 14/20
- Labels/actions: DM Sans 700, 12–15

Archivo is always roman. Do not use italic serif display headlines. Do not place
an uppercase eyebrow, badge, or numbered micro-label above a hero. Field and
section labels are sentence case. Body copy stays within a comfortable measure.

## Shape and depth

- Small radius: 6px
- Group radius: 8–10px
- Maximum ordinary radius: 12px
- Full pill: status and switch controls only
- Input and button height: 54–56px

Ordinary cards are flat: choose a surface or a defined edge, never a hairline
plus a diffuse shadow. Shadow is reserved for modal layers. The meeting ticket
may use warm paper and a defined edge because it represents a real plan. Avoid
cards inside cards; use dividers and spacing within a group.

## Layout and rhythm

Use a 600px reading column and a 1040px wide sign-in canvas. Mobile gutters are
24px. Related items use 5–16px gaps; sections use 24–52px. Spacing must create
hierarchy rather than repeat one value everywhere.

Each onboarding screen asks one coherent question. Today leads with state,
meaning, and next action in that order. Public/legal pages favour plain sections
and readable text over decorative containers.

The mutual reveal is the one celebratory product moment. Its warm-paper ticket
uses a crisp ultramarine place panel, a narrow three-colour registration edge,
meeting-point geometry, and physical perforation. Never place raster art behind
the venue details. The venue, date, time, clue, and safety controls must remain
more prominent than decoration.

## Interaction

- Primary actions: solid ultramarine, white label
- Secondary actions: white/transparent with an ink edge
- Destructive actions: defined red edge and red label
- Selected options: ink fill and white text
- Focus: 2px signal-red edge
- Motion: short opacity or directional transitions only when state changes

No bounce, elastic easing, floating badges, scale-on-hover imagery, gratuitous
entrance choreography, or animated gradients. Reduced-motion settings are
respected.

## Anti-references

Reject these patterns even if an individual instance looks polished:

- beige/cream as the universal app canvas;
- italic serif hero copy;
- tiny uppercase eyebrow above an oversized title;
- numbered editorial labels that add no navigation value;
- rounded feature cards, icon tiles, or nested card grids;
- border plus wide shadow on the same object;
- pills used as generic containers;
- repeated helper copy that restates the label;
- hearts, swipe cards, stock couples, chat bubbles, and popularity metrics;
- generic startup vectors, blobs, glow, glass, or decorative gradients;
- illustration used as filler rather than to explain anticipation, place, or a shared hour.

When uncertain, remove the container, shorten the copy, and let hierarchy do the
work.

// Milte design system — "the red thread".
//
// Milte is a calm utility for getting off a dating app, not a lifestyle feed.
// The interface uses cool paper, direct typography, compact geometry, and one
// vivid meeting-point colour system. The red question mark turns the name into
// an invitation; blue carries action and marigold marks a shared moment. Cards are reserved for real objects or grouped
// controls, and elevation is reserved for modal layers.

export const colors = {
  // Cool, neutral canvas. Avoid the reflex cream/beige "tasteful" palette.
  bg: '#F6F7F8',
  bgDeep: '#ECEFF1',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceWarm: '#FFF0ED',
  border: '#C9CED3',
  borderSoft: '#E1E4E7',

  // Ink.
  text: '#161719',
  textDim: '#373B40',
  muted: '#5A626A',
  faint: '#6B747D',

  // The red thread and restrained semantic colours.
  rose: '#C73A2C',
  roseDeep: '#9B2E22',
  accentText: '#B53627',
  blush: '#D84432',
  blue: '#2347D8',
  blueDeep: '#1937A9',
  blueWash: '#EEF1FF',
  amber: '#835400',
  sage: '#25734B',
  sky: '#225E7A',
  danger: '#B42318',

  // State fields, never decorative gradients.
  roseWash: '#FFF0ED',
  amberWash: '#FFF5D8',
  sageWash: '#E9F5EE',
  skyWash: '#EAF3F7',
  peach: '#F0B29E',
  marigold: '#F0B83E',

  // A meeting ticket is the only intentionally warm paper object.
  paper: '#F7F1E7',
  paperShade: '#D7CFC2',
  ink: '#161719',
  inkSoft: '#4F555B',
  onAccent: '#FFFFFF',
};

export const fonts = {
  // Archivo gives Milte a blunt, confident display voice. DM Sans remains the
  // quiet operational face for forms and long reading.
  serif: 'Archivo_600SemiBold',
  serifBold: 'Archivo_700Bold',
  serifItalic: 'DMSans_500Medium',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansBold: 'DMSans_700Bold',
};

export const type = {
  display: { fontFamily: fonts.serifBold, fontSize: 42, lineHeight: 45, letterSpacing: -1.7 },
  title: { fontFamily: fonts.serifBold, fontSize: 28, lineHeight: 33, letterSpacing: -0.8 },
  subtitle: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, letterSpacing: -0.25 },
  poetic: { fontFamily: fonts.sansMedium, fontSize: 17, lineHeight: 25 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.sansBold, fontSize: 12, lineHeight: 17, letterSpacing: 0.35 },
};

// Related elements sit close; sections get visibly more air.
export const spacing = { xxs: 2, xs: 5, sm: 9, md: 16, lg: 24, xl: 36, xxl: 52, xxxl: 72 };

// Full pills are reserved for genuine tags/status controls.
export const radii = { sm: 6, md: 8, lg: 10, xl: 12, pill: 999 };

// Only modal/physical-object layers may use these. Ordinary cards stay flat.
export const shadows = {
  soft: {
    shadowColor: '#111315',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  lifted: {
    shadowColor: '#111315',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 6,
  },
};

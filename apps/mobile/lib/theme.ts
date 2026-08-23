// Milte design system — two private yesses around one shared meeting point.
// The interface is editorial, flat, high-contrast, and deliberately avoids the
// glossy gradients and floating-card language common to swipe-first products.

export const colors = {
  // night
  bg: '#0B0A0D',
  bgDeep: '#0B0A0D',
  surface: '#151217',
  surfaceRaised: '#211B20',
  surfaceWarm: '#25171C',
  border: '#4A4148',
  borderSoft: '#302A2F',

  // ink on night
  text: '#F4EDE3',
  textDim: '#D9D0C7',
  muted: '#AAA19A',
  faint: '#8B8380',

  // brand and state accents
  rose: '#A73550',
  roseDeep: '#84243D',
  accentText: '#D7A2AD',
  blush: '#D7A2AD',
  amber: '#E7A45A',
  sage: '#7E9471',
  sky: '#55758C',
  danger: '#E06C68',

  // paper (the ticket)
  paper: '#F4EDE3',
  paperShade: '#DED2C5',
  ink: '#0B0A0D',
  inkSoft: '#5D5559',
};

export const fonts = {
  serif: 'Fraunces_600SemiBold',
  serifBold: 'Fraunces_700Bold',
  serifItalic: 'Fraunces_500Medium_Italic',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansBold: 'DMSans_700Bold',
};

export const type = {
  display: { fontFamily: fonts.serif, fontSize: 42, lineHeight: 47 },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 34 },
  subtitle: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 27 },
  poetic: { fontFamily: fonts.serifItalic, fontSize: 19, lineHeight: 28 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 16, letterSpacing: 2.2 },
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 };

export const radii = { sm: 4, md: 8, lg: 14, xl: 18, pill: 999 };

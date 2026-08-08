// MeetCute design system — "midnight editorial".
// Editorial serif (Fraunces) for romance, utilitarian sans (DM Sans) for UI,
// candlelit palette on deep ink. The committed match inverts to cream paper.

export const colors = {
  // night
  bg: '#141020',
  bgDeep: '#0D0A16',
  surface: '#1D1729',
  surfaceRaised: '#241C33',
  border: '#332A47',
  borderSoft: '#2A2240',

  // ink on night
  text: '#F4EDE3',
  textDim: '#C9BFD6',
  muted: '#978CAB',
  faint: '#6E6383',

  // candlelight
  rose: '#E85D75',
  roseDeep: '#C74560',
  blush: '#F2B8C6',
  amber: '#E3A857',
  sage: '#A9C09A',
  danger: '#E85D5D',

  // paper (the ticket)
  paper: '#F4EDE3',
  paperShade: '#E9DFD0',
  ink: '#241C33',
  inkSoft: '#5A4F6E',
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
  display: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 44 },
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 32 },
  poetic: { fontFamily: fonts.serifItalic, fontSize: 19, lineHeight: 28 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 16, letterSpacing: 2.2 },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radii = { sm: 10, md: 16, lg: 24, pill: 999 };

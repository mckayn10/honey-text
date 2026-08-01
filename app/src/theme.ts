/** Shared colors and style values */
export const theme = {
  primary: '#EF8128',
  primaryHover: '#D96F1A',
  primaryShadow: 'rgba(239, 129, 40, 0.25)',
  primaryFocus: 'rgba(239, 129, 40, 0.12)',
  /** Soft tint used behind active nav pills, avatar circles, question bubbles */
  primaryBg: '#FFF1E2',
  border: '#F2E9DC',
  borderLight: '#F5EEE1',
  danger: '#B42318',
  dangerBg: '#FFF5F5',
  dangerBorder: '#F4C6C6',
  errorBg: '#fee',
  errorText: '#c33',
  successBg: '#EAF7EE',
  successText: '#1F9254',
  text: '#2A2621',
  textMuted: '#736C63',
  textLight: '#A39A8E',
  bg: '#FFFBF5',
  bgSubtle: '#FFF6E8',
  shadow: '0 2px 8px rgba(61, 58, 53, 0.08)',
  shadowHover: '0 4px 12px rgba(61, 58, 53, 0.12)',
  shadowCard: '0 8px 24px rgba(61, 58, 53, 0.06)',
  headerBorder: 'rgba(239, 129, 40, 0.1)',
  gradientTop: '#FFD76B',
  gradientBottom: '#F7A626',
} as const;

export const containerWidths = {
  wide: 1200,
  default: 960,
  form: 720,
  narrow: 600,
  auth: 400,
  invite: 500,
} as const;

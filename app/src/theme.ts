/** Shared colors and style values */
export const theme = {
  primary: '#EF8128',
  primaryShadow: 'rgba(239, 129, 40, 0.25)',
  primaryFocus: 'rgba(239, 129, 40, 0.15)',
  border: '#eee',
  borderLight: '#ddd',
  danger: '#b42318',
  dangerBg: '#fff5f5',
  dangerBorder: '#f4c6c6',
  errorBg: '#fee',
  errorText: '#c33',
  successBg: '#ecfdf3',
  successText: '#027a48',
  text: '#333',
  textMuted: '#666',
  bg: '#fff',
  bgSubtle: '#fafafa',
  shadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  shadowHover: '0 4px 8px rgba(0, 0, 0, 0.15)',
  shadowCard: '0 8px 20px rgba(0, 0, 0, 0.04)',
  headerBorder: 'rgba(239, 129, 40, 0.1)',
} as const;

export const containerWidths = {
  wide: 1200,
  default: 960,
  form: 720,
  narrow: 600,
  auth: 400,
  invite: 500,
} as const;

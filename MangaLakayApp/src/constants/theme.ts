// src/constants/theme.ts
export const colors = {
  // Backgrounds
  bgBase: '#0A0E1A',
  bgCard: '#111827',
  bgElevated: '#1F2937',
  // Accent principal
  orange: '#FF6B35',
  orangeDark: '#E55A24',
  orangeDeep: '#FF8C00',
  // Accent secondaire
  teal: '#00D4AA',
  tealBlue: '#0EA5E9',
  // Accent tertiaire
  mango: '#FFD166',
  // Texte
  text100: '#F9FAFB',
  text60: '#9CA3AF',
  text30: '#4B5563',
  // États
  success: '#10B981',
  error: '#EF4444',
  border: '#1E293B',
} as const;

export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 28,
  s8: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
} as const;

export const fonts = {
  display: 'Nunito-ExtraBold',
  displayBold: 'Nunito-Black',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  mono: 'JetBrainsMono-Regular',
} as const;

export const tabBarHeight = 64;
export const headerHeight = 56;
export const minTapTarget = 48;

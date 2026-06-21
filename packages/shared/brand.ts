/**
 * "next" — Brand design system (single source of truth)
 * Used by all apps (customer, merchant, rider, admin) so the look is identical.
 */

export const colors = {
  // Primary brand — Indigo (trust, speed, technology)
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryLight: '#EEF2FF',

  // Accent — Lime (fresh, energetic; used for main action buttons)
  accent: '#A3E635',
  accentDark: '#65A30D',

  // Ink / text
  ink: '#0F172A',
  inkMuted: '#475569',
  inkFaint: '#94A3B8',

  // Surfaces
  bg: '#FFFFFF',
  bgSoft: '#F8FAFC',
  border: '#E2E8F0',

  // Status
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#EF4444',

  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  // Use these sizes consistently
  h1: { fontSize: 26, fontWeight: '800' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  h3: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 13, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const },
};

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};

export const brandName = 'next';

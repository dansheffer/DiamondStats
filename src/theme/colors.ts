/* ── Diamond Stats — Liquid Glass Design System ──────────────────── */

// Brand Colors
export const NAVY = '#0A2A66';
export const ORANGE = '#FF6A13';
export const WHITE = '#FFFFFF';

// Legacy aliases (keep imports working)
export const METS_BLUE = NAVY;
export const METS_ORANGE = ORANGE;

// Application theme — Liquid Glass
export const theme = {
  // Backgrounds — cool-tinted base that shows through glass
  background: '#E8ECF4',
  surface: 'rgba(255, 255, 255, 0.52)',
  surfaceElevated: 'rgba(255, 255, 255, 0.70)',
  surfaceSolid: '#FFFFFF',

  // Text
  text: '#0F1729',
  textSecondary: '#3D4A5C',
  mutedText: '#7C8698',

  // Cards — glass
  card: 'rgba(255, 255, 255, 0.52)',
  cardBorder: 'rgba(255, 255, 255, 0.60)',
  border: 'rgba(10, 42, 102, 0.07)',
  borderSubtle: 'rgba(10, 42, 102, 0.04)',

  // Brand
  primary: NAVY,
  accent: ORANGE,

  // Semantic
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',

  // Glass tokens
  glass: 'rgba(255, 255, 255, 0.42)',
  glassMedium: 'rgba(255, 255, 255, 0.55)',
  glassHeavy: 'rgba(255, 255, 255, 0.70)',
  glassBorder: 'rgba(255, 255, 255, 0.65)',
  glassBorderLight: 'rgba(255, 255, 255, 0.30)',
  glassText: 'rgba(15, 23, 41, 0.85)',

  // Navy glass for headers
  navyGlass: 'rgba(10, 42, 102, 0.82)',
  navyGlassBorder: 'rgba(255, 255, 255, 0.12)',

  // Shadows
  shadowLight: 'rgba(10, 42, 102, 0.05)',
  shadowMedium: 'rgba(10, 42, 102, 0.10)',
};

// Spacing (8pt grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radii — rounder for glass
export const radii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
  full: 9999,
};

// Card shadow presets — softer, more diffuse for glass
export const shadows = {
  sm: {
    shadowColor: '#0A2A66',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#0A2A66',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0A2A66',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 6,
  },
  glass: {
    shadowColor: '#0A2A66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 3,
  },
} as const;

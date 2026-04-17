import { ViewStyle, TextStyle } from 'react-native';

// Available highlight colors
export const HIGHLIGHT_COLORS = ['#FFE066', '#A8F0C0', '#A8C8F8', '#F8A8C8'] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];
export const HIGHLIGHT_COLOR_DEFAULT: HighlightColor = '#FFE066';
export const HIGHLIGHT_COLOR_KEY = 'highlight_color';

export const FONT_FAMILIES = ['serif', 'sans-serif'] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];
export const FONT_FAMILY_DEFAULT: FontFamily = 'serif';
export const FONT_FAMILY_KEY = 'reader_font_family';

export const THEMES = ['system', 'light', 'dark', 'sepia', 'high-contrast'] as const;
export type ThemeMode = (typeof THEMES)[number];
export const THEME_KEY = 'app_theme';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 20,
  pill: 32,
} as const;

export const typography = {
  weights: {
    regular: '400',
    secondary: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    display: '900',
  },
  lineHeights: {
    tight: 1.3,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: -0.5,
    relaxed: 0.5,
  },
} as const;

export const colors = {
  primary: '#534AB7',
  primaryDark: '#3f369f',
  success: '#1D9E75',
  error: '#e53e3e',
  white: '#fff',
  black: '#000',
  border: '#eee',
  borderLight: '#f0f0f0',
  borderMid: '#ddd',
  bgPage: '#f8f8f8',
  bgMuted: '#f0f0f0',
  textPrimary: '#111',
  textSecondary: '#555',
  textMuted: '#888',
  textFaint: '#aaa',
  placeholder: '#bbb',
} as const;

export const darkColors = {
  primary: '#7E74F1', // Slightly more vibrant for dark backgrounds
  primaryDark: '#534AB7',
  success: '#27C08F',
  error: '#f56565',
  white: '#1a1a1a', // Main background
  black: '#ffffff', // Primary text
  border: '#333',
  borderLight: '#222',
  borderMid: '#444',
  bgPage: '#121212',
  bgMuted: '#1e1e1e',
  textPrimary: '#f0f0f0',
  textSecondary: '#ccc',
  textMuted: '#888',
  textFaint: '#666',
  placeholder: '#444',
} as const;

export const sepiaColors = {
  primary: '#534AB7',
  primaryDark: '#3f369f',
  success: '#1D9E75',
  error: '#e53e3e',
  white: '#f4ecd8', // Primary surface
  black: '#000',
  border: '#e4dcc8',
  borderLight: '#ede6d0',
  borderMid: '#d4ccb8',
  bgPage: '#f4ecd8',
  bgMuted: '#e9e0c8',
  textPrimary: '#5b4636',
  textSecondary: '#6b5646',
  textMuted: '#8b7666',
  textFaint: '#ab9686',
  placeholder: '#bbb',
} as const;

export const highContrastColors = {
  primary: '#0000FF', // Bright blue
  primaryDark: '#0000CC',
  success: '#008000', // Green
  error: '#FF0000', // Red
  white: '#FFFFFF', // Pure white background
  black: '#000000', // Pure black text
  border: '#000000',
  borderLight: '#333333',
  borderMid: '#666666',
  bgPage: '#FFFFFF',
  bgMuted: '#EEEEEE',
  textPrimary: '#000000',
  textSecondary: '#333333',
  textMuted: '#666666',
  textFaint: '#999999',
  placeholder: '#555555',
} as const;

export type ThemeColors = { [K in keyof typeof colors]: string };

export type SharedStyles = {
  container: ViewStyle;
  header: ViewStyle;
  headerTitle: TextStyle;
  rowSpaceBetween: ViewStyle;
  metaText: TextStyle;
  floating: ViewStyle;
};

export const sharedStyles = (themeColors: ThemeColors): SharedStyles => ({
  container: {
    flex: 1,
    backgroundColor: themeColors.bgPage,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: themeColors.white,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: themeColors.textPrimary,
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontWeight: typography.weights.secondary,
    color: themeColors.textFaint,
  },
  floating: {
    elevation: 6,
    shadowColor: themeColors.black,
    shadowOpacity: 0.12,
    shadowRadius: borderRadius.lg,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 1,
    borderColor: themeColors.border,
  },
});
// Available highlight colors — used in ReaderView toolbar and settings color picker
export const HIGHLIGHT_COLORS = ['#FFE066', '#A8F0C0', '#A8C8F8', '#F8A8C8'] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];
export const HIGHLIGHT_COLOR_DEFAULT: HighlightColor = '#FFE066';
export const HIGHLIGHT_COLOR_KEY = 'highlight_color';

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

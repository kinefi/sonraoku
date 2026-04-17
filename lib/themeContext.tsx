import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  colors, 
  darkColors, 
  sepiaColors,
  highContrastColors,
  ThemeMode, 
  THEME_KEY, 
  HighlightColor, 
  HIGHLIGHT_COLOR_KEY, 
  HIGHLIGHT_COLOR_DEFAULT,
  HIGHLIGHT_COLORS,
  FontFamily,
  FONT_FAMILY_KEY,
  FONT_FAMILY_DEFAULT
} from './theme';

export const FONT_SIZE_KEY = 'reader_font_size';
export const FONT_SIZE_DEFAULT = 16;
export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 36;

type ThemeContextType = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  highlightColor: HighlightColor;
  setHighlightColor: (color: HighlightColor) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  resetToDefaults: () => void;
  colors: typeof colors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [highlightColor, setHighlightColorState] = useState<HighlightColor>(HIGHLIGHT_COLOR_DEFAULT);
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(FONT_FAMILY_DEFAULT);
  const [fontSize, setFontSizeState] = useState<number>(FONT_SIZE_DEFAULT);

  useEffect(() => {
    const loadSettings = async () => {
      const [savedTheme, savedColor, savedFont, savedSize] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(HIGHLIGHT_COLOR_KEY),
        AsyncStorage.getItem(FONT_FAMILY_KEY),
        AsyncStorage.getItem(FONT_SIZE_KEY),
      ]);

      if (savedTheme) setThemeModeState(savedTheme as ThemeMode);
      if (savedColor && (HIGHLIGHT_COLORS as readonly string[]).includes(savedColor)) {
        setHighlightColorState(savedColor as HighlightColor);
      }
      if (savedFont) setFontFamilyState(savedFont as FontFamily);
      if (savedSize) {
        const size = parseInt(savedSize, 10);
        if (!isNaN(size)) {
          setFontSizeState(Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size)));
        }
      }
    };
    loadSettings();
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode);
  };

  const setHighlightColor = (color: HighlightColor) => {
    setHighlightColorState(color);
    AsyncStorage.setItem(HIGHLIGHT_COLOR_KEY, color);
  };

  const setFontFamily = (font: FontFamily) => {
    setFontFamilyState(font);
    AsyncStorage.setItem(FONT_FAMILY_KEY, font);
  };

  const setFontSize = (size: number) => {
    const next = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size));
    setFontSizeState(next);
    AsyncStorage.setItem(FONT_SIZE_KEY, String(next)).catch((e) => console.error(e));
  };

  const resetToDefaults = () => {
    setThemeMode('system');
    setHighlightColor(HIGHLIGHT_COLOR_DEFAULT);
    setFontFamily(FONT_FAMILY_DEFAULT);
    setFontSize(FONT_SIZE_DEFAULT);
  };

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  const activeColors = useMemo(() => {
    if (themeMode === 'sepia') return sepiaColors;
    if (themeMode === 'dark') return darkColors;
    if (themeMode === 'high-contrast') return highContrastColors;
    if (themeMode === 'light') return colors;
    return systemColorScheme === 'dark' ? darkColors : colors;
  }, [themeMode, systemColorScheme]);

  const value = useMemo(() => ({
    themeMode,
    setThemeMode,
    highlightColor,
    setHighlightColor,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    resetToDefaults,
    colors: activeColors,
    isDark,
  }), [themeMode, highlightColor, fontFamily, fontSize, activeColors, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  AccessibilityInfo,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sharedStyles, HIGHLIGHT_COLORS, spacing, borderRadius, typography } from '../../lib/theme';
import { useLanguage } from '../../lib/languageContext';
import { useTheme } from '../../lib/themeContext';
import { LANGUAGES, Lang } from '../../lib/translations';
import { formatBytes } from '../../lib/utils';
import { APP_VERSION, APP_README, GITHUB_URL } from '../../lib/constants';
import { useSettings } from '../../lib/hooks';
import SegmentedControl from '../../components/SegmentedControl';
import IconButton from '../../components/IconButton';

export default function SettingsScreen() {
  const { t, lang, setLang } = useLanguage();
  const { themeMode, setThemeMode, fontFamily, setFontFamily, colors, isDark, resetToDefaults } = useTheme();
  
  const { 
    fontSize, 
    highlightColor, 
    cacheSize, 
    changeFontSize, 
    changeHighlightColor, 
    handleClearCache,
    FONT_SIZE_MIN,
    FONT_SIZE_MAX 
  } = useSettings();

  // Local state for real-time font size testing in the preview block
  const [previewFontSize, setPreviewFontSize] = useState(fontSize);

  useEffect(() => {
    setPreviewFontSize(fontSize);
  }, [fontSize]);

  // Animation for background color transition
  const bgColorAnim = useRef(new Animated.Value(0)).current;
  const [prevColor, setPrevColor] = useState(colors.bgPage);
  const [currColor, setCurrColor] = useState(colors.bgPage);

  useEffect(() => {
    if (colors.bgPage !== currColor) {
      setPrevColor(currColor);
      setCurrColor(colors.bgPage);
      bgColorAnim.setValue(0);
      Animated.timing(bgColorAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [colors.bgPage]);

  const animatedBgColor = bgColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [prevColor, currColor],
  });

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    section: {
      backgroundColor: colors.white,
      marginTop: spacing.xl,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: typography.weights.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: typography.letterSpacing.relaxed,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm - 2,
    },
    fontSizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    fontBtn: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      backgroundColor: colors.bgMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fontBtnDisabled: {
      backgroundColor: colors.bgPage,
    },
    fontBtnText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: typography.weights.medium,
    },
    fontBtnTextDisabled: {
      color: colors.textFaint,
    },
    fontBtnTextLarge: {
      fontSize: 16,
    },
    fontSizeValue: {
      color: colors.textPrimary,
      fontWeight: typography.weights.medium,
    },
    colorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md + 2,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg - 2,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    colorSwatch: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.pill,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorSwatchSelected: {
      borderColor: colors.textPrimary,
    },
    storageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg - 2,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    usageText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    previewContainer: {
      backgroundColor: colors.white,
      marginTop: spacing.xl,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      minHeight: 120,
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewText: {
      color: colors.textPrimary,
      fontSize: previewFontSize,
      fontFamily: fontFamily === 'serif' ? 'serif' : 'sans-serif',
      textAlign: 'center',
    },
    aboutContent: {
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    aboutText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    aboutRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    aboutLabel: { fontSize: 13, color: colors.textMuted },
    aboutValue: { fontSize: 13, color: colors.textPrimary, fontWeight: typography.weights.medium },
    resetBtn: {
      marginTop: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      height: 48,
    },
    linkText: {
      color: colors.primary,
      fontWeight: typography.weights.medium,
    },
  }), [colors, previewFontSize, fontFamily]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedBgColor }]}>
      <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPage} translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.settings}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.language}</Text>
        <SegmentedControl
          options={LANGUAGES.map(l => ({ 
            key: l.key, 
            label: l.label, 
            icon: 'language-outline' as const 
          }))}
          value={lang}
          onChange={(newLang: Lang) => {
            setLang(newLang);
            const langLabel = LANGUAGES.find(l => l.key === newLang)?.label || newLang;
            AccessibilityInfo.announceForAccessibility(`${t.language}: ${langLabel}`);
          }}
        />
      </View>

      {/* Theme */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.theme}</Text>
        <SegmentedControl
          options={[
            { key: 'system', icon: 'settings-outline' },
            { key: 'light', icon: 'sunny-outline' },
            { key: 'dark', icon: 'moon-outline' },
            { key: 'sepia', icon: 'color-filter-outline' },
            { key: 'high-contrast', icon: 'contrast-outline' },
          ]}
          value={themeMode}
          onChange={setThemeMode}
          accessibilityLabel={t.theme}
        />
      </View>

      {/* Preview Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.preview}</Text>
        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>
            The quick brown fox jumps over the lazy dog.
          </Text>
        </View>
      </View>

      {/* Font Family */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.fontFamily}</Text>
        <SegmentedControl
          options={['serif', 'sans-serif'] as const}
          value={fontFamily}
          onChange={setFontFamily}
          getLabel={(val) => val === 'serif' ? t.serif : t.sansSerif}
          accessibilityLabel={t.fontFamily}
        />
      </View>

      {/* Font size */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.defaultFontSize}</Text>
        <View style={styles.fontSizeRow}>
          <IconButton
            label="A−"
            style={[styles.fontBtn, previewFontSize <= FONT_SIZE_MIN && styles.fontBtnDisabled]}
            onPress={() => {
              setPreviewFontSize(prev => Math.max(FONT_SIZE_MIN, prev - 2));
              changeFontSize(-2);
            }}
            disabled={previewFontSize <= FONT_SIZE_MIN}
            accessibilityLabel={t.minFontSizeReached}
          />
          <Text style={[styles.fontSizeValue, { fontSize: previewFontSize }]}>Aa</Text>
          <IconButton
            label="A+"
            style={[styles.fontBtn, previewFontSize >= FONT_SIZE_MAX && styles.fontBtnDisabled]}
            onPress={() => {
              setPreviewFontSize(prev => Math.min(FONT_SIZE_MAX, prev + 2));
              changeFontSize(2);
            }}
            disabled={previewFontSize >= FONT_SIZE_MAX}
            accessibilityLabel={t.maxFontSizeReached}
          />
        </View>
      </View>

      {/* Highlight color */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.defaultHighlightColor}</Text>
        <View style={styles.colorRow}>
          {HIGHLIGHT_COLORS.map((color) => (
            <IconButton
              key={color}
              onPress={() => changeHighlightColor(color)}
              accessibilityLabel={`${t.defaultHighlightColor} ${color}`}
              style={[
                styles.colorSwatch,
                highlightColor === color && styles.colorSwatchSelected,
                { padding: 0 }
              ]}
            >
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color }} />
            </IconButton>
          ))}
        </View>
      </View>

      {/* Storage Usage */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.storageUsage}</Text>
        <View style={styles.storageRow}>
          <Text style={styles.usageText}>{formatBytes(cacheSize)}</Text>
          <IconButton 
            label={t.clearCache} 
            onPress={handleClearCache} 
            color={colors.error} 
            accessibilityRole="button" 
            accessibilityLabel={t.clearCache} 
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.about}</Text>
        <View style={styles.aboutContent}>
          <Text style={styles.aboutText}>{t.appDescription}</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t.version}</Text>
            <Text style={styles.aboutValue}>{APP_VERSION}</Text>
          </View>
          <TouchableOpacity 
            style={styles.aboutRow} 
            onPress={() => Linking.openURL(APP_README)}
            accessibilityRole="link"
            accessibilityLabel={t.readme}
          >
            <Text style={[styles.aboutLabel, styles.linkText]}>{t.readme}</Text>
            <IconButton name="document-text-outline" size={16} color={colors.primary} passive />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.aboutRow, { marginTop: 8 }]} 
            onPress={() => Linking.openURL(GITHUB_URL)}
            accessibilityRole="link"
            accessibilityLabel={t.github}
          >
            <Text style={[styles.aboutLabel, styles.linkText]}>{t.github}</Text>
            <IconButton name="logo-github" size={16} color={colors.primary} passive />
          </TouchableOpacity>
        </View>
      </View>

      {/* Last Synced (Phase 3 Placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.lastSynced}</Text>
        <TouchableOpacity 
          style={[styles.storageRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}
          onPress={() => AccessibilityInfo.announceForAccessibility(t.notAvailablePhase3)}
          accessibilityRole="button"
        >
          <Text style={styles.usageText}>{t.notAvailablePhase3}</Text>
        </TouchableOpacity>
      </View>

      {/* Reset Section */}
      <IconButton
        label={t.resetToDefaults}
        variant="outlined"
        color={colors.error}
        style={styles.resetBtn}
        onPress={() => {
          Alert.alert(t.resetToDefaults, t.confirmDelete, [
            { text: t.cancel, style: 'cancel' },
            { 
              text: t.resetToDefaults,
              style: 'destructive', 
              onPress: resetToDefaults 
            }
          ]);
        }}
      />

      <View style={{ height: 40 }} />
      </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

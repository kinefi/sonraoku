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
import { sharedStyles, HIGHLIGHT_COLORS, spacing, borderRadius, typography, useTheme } from '@/lib/theme';
import { useLanguage, LANGUAGES, Lang } from '@/lib/language';
import { formatBytes } from '@/lib/utils';
import { APP_VERSION, APP_README, GITHUB_URL, TIMEOUTS } from '@/lib/constants';
import { useSettings } from '@/lib/hooks';
import { IconButton, SegmentedControl } from '@/components';

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
        duration: TIMEOUTS.THEME_TRANSITION,
        useNativeDriver: false,
      }).start();
    }
  }, [colors.bgPage, bgColorAnim, currColor]);

  const animatedBgColor = bgColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [prevColor, currColor],
  });

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    section: {
      backgroundColor: 'transparent',
      marginTop: spacing.lg,
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
      paddingHorizontal: spacing.md + 2,
      paddingTop: spacing.sm + 2,
      paddingBottom: spacing.xs,
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
      backgroundColor: 'transparent',
      marginTop: spacing.md,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      minHeight: 64,
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
          <Text style={styles.headerTitle}>{t.nav.settings}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Language */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.settings.language}</Text>
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
                AccessibilityInfo.announceForAccessibility(`${t.settings.language}: ${langLabel}`);
              }}
            />
          </View>

          {/* Theme */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.settings.theme}</Text>
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
              accessibilityLabel={t.settings.theme}
            />
          </View>

          {/* Typography & Preview Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.settings.typography}</Text>
            
            <SegmentedControl
              options={['serif', 'sans-serif'] as const}
              value={fontFamily}
              onChange={setFontFamily}
              getLabel={(val) => val === 'serif' ? t.settings.serif : t.settings.sansSerif}
              accessibilityLabel={t.settings.fontFamily}
              size="small"
            />

            <View style={styles.previewContainer}>
              <Text style={styles.previewText}>
                {t.settings.typographyPreview}
              </Text>
            </View>

            <View style={styles.fontSizeRow}>
              <IconButton
                label="A−"
                style={[styles.fontBtn, previewFontSize <= FONT_SIZE_MIN && styles.fontBtnDisabled]}
                onPress={() => {
                  setPreviewFontSize(prev => Math.max(FONT_SIZE_MIN, prev - 2));
                  changeFontSize(-2);
                }}
                disabled={previewFontSize <= FONT_SIZE_MIN}
                accessibilityLabel={t.reader.minFontSizeReached}
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
                accessibilityLabel={t.reader.maxFontSizeReached}
              />
            </View>
          </View>

          {/* Highlight color */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.settings.defaultHighlightColor}</Text>
            <View style={styles.colorRow}>
              {HIGHLIGHT_COLORS.map((color) => (
                <IconButton
                  key={color}
                  onPress={() => changeHighlightColor(color)}
                  accessibilityLabel={`${t.settings.defaultHighlightColor} ${color}`}
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
            <Text style={styles.sectionLabel}>{t.settings.storageUsage}</Text>
            <View style={styles.storageRow}>
              <Text style={styles.usageText}>{formatBytes(cacheSize)}</Text>
              <IconButton
                label={t.settings.clearCache}
                onPress={handleClearCache}
                color={colors.error}
                accessibilityRole="button"
                accessibilityLabel={t.settings.clearCache}
              />
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.settings.about}</Text>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutText}>{t.settings.appDescription}</Text>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>{t.settings.version}</Text>
                <Text style={styles.aboutValue}>{APP_VERSION}</Text>
              </View>
              <TouchableOpacity
                style={styles.aboutRow}
                onPress={() => Linking.openURL(APP_README)}
                accessibilityRole="link"
                accessibilityLabel={t.settings.readme}
              >
                <Text style={[styles.aboutLabel, styles.linkText]}>{t.settings.readme}</Text>
                <IconButton name="document-text-outline" size={16} color={colors.primary} passive />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aboutRow, { marginTop: 8 }]}
                onPress={() => Linking.openURL(GITHUB_URL)}
                accessibilityRole="link"
                accessibilityLabel={t.settings.github}
              >
                <Text style={[styles.aboutLabel, styles.linkText]}>{t.settings.github}</Text>
                <IconButton name="logo-github" size={16} color={colors.primary} passive />
              </TouchableOpacity>
            </View>
          </View>

          {/* Last Synced (Phase 3 Placeholder) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.articles.lastSynced}</Text>
            <TouchableOpacity
              style={[styles.storageRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}
              onPress={() => AccessibilityInfo.announceForAccessibility(t.common.notAvailablePhase3)}
              accessibilityRole="button"
            >
              <Text style={styles.usageText}>{t.common.notAvailablePhase3}</Text>
            </TouchableOpacity>
          </View>

          {/* Reset Section */}
          <IconButton
            label={t.settings.resetToDefaults}
            variant="outlined"
            color={colors.error}
            style={styles.resetBtn}
            onPress={() => {
              Alert.alert(t.settings.resetToDefaults, t.common.confirmDelete, [
                { text: t.common.cancel, style: 'cancel' },
                {
                  text: t.settings.resetToDefaults,
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

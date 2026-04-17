import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { sharedStyles, spacing, borderRadius } from '../lib/theme';
import { useTheme, FONT_SIZE_MIN, FONT_SIZE_MAX } from '../lib/themeContext';
import IconButton from './IconButton';
import SegmentedControl from './SegmentedControl';
import { useLanguage } from '../lib/languageContext';

type Props = {
  onBack: () => void;
  fontSize: number;
  onFontSizeChange: (delta: number) => void;
  onToggleHighlights: () => void;
  onToggleTags: () => void;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
  onShare: () => void;
  isFetching?: boolean;
  onRefresh?: () => void;
  hasContent: boolean;
};

export default function ReaderFabPill({
  onBack,
  fontSize,
  onFontSizeChange,
  onToggleHighlights,
  onToggleTags,
  isSpeaking,
  onToggleSpeech,
  onShare,
  isFetching,
  onRefresh,
  hasContent,
}: Props) {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { t } = useLanguage();

  const styles = useMemo(() => {
    const baseStyles = sharedStyles(colors);
    return StyleSheet.create({
      fabActionRow: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: spacing.xxl,
        alignItems: 'center',
      },
      fabPill: {
        flexDirection: 'row',
        gap: spacing.xs,
        borderRadius: borderRadius.pill,
        paddingHorizontal: spacing.md - 2,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        backgroundColor: colors.bgMuted,
        ...baseStyles.floating,
      },
      fabActionBtn: {
        width: 44,
        height: 40,
        borderRadius: borderRadius.xxl,
        alignItems: 'center',
        justifyContent: 'center',
      },
    });
  }, [colors]);

  return (
    <View style={styles.fabActionRow}>
      <View style={styles.fabPill}>
        <IconButton
          name="arrow-back"
          onPress={onBack}
          style={styles.fabActionBtn}
        />

        <SegmentedControl
          size="small"
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

        {hasContent && (
          <>
            <IconButton
              label="A−"
              onPress={() => {
                Haptics.selectionAsync();
                onFontSizeChange(-2);
              }}
              disabled={fontSize <= FONT_SIZE_MIN}
              style={styles.fabActionBtn}
            />
            <IconButton
              label="A+"
              onPress={() => {
                Haptics.selectionAsync();
                onFontSizeChange(2);
              }}
              disabled={fontSize >= FONT_SIZE_MAX}
              style={styles.fabActionBtn}
            />
            <IconButton
              name="bookmarks-outline"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleHighlights();
              }}
              style={styles.fabActionBtn}
            />
            <IconButton
              name="pricetag-outline"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleTags();
              }}
              style={styles.fabActionBtn}
            />
            <IconButton
              name="refresh-outline"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRefresh?.();
              }}
              loading={isFetching}
              style={styles.fabActionBtn}
            />
            <IconButton
              name={isSpeaking ? 'stop-circle' : 'volume-high-outline'}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onToggleSpeech();
              }}
              color={isSpeaking ? colors.white : colors.primary}
              style={[
                styles.fabActionBtn,
                isSpeaking && { backgroundColor: colors.primary }
              ]}
            />
            <IconButton
              name="share-social-outline"
              onPress={onShare}
              style={styles.fabActionBtn}
            />
          </>
        )}
      </View>
    </View>
  );
}
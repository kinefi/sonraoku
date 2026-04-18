import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { sharedStyles, spacing, borderRadius, typography } from '../lib/theme';
import { useTheme, FONT_SIZE_MIN, FONT_SIZE_MAX } from '../lib/themeContext';
import IconButton from './IconButton';
import { useLanguage } from '../lib/languageContext';

type Props = {
  onBack: () => void;
  onToggleHighlights: () => void;
  onToggleTags: () => void;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
  onShare: () => void;
  isFetching?: boolean;
  onRefresh?: () => void;
  hasContent: boolean;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
};

const VerticalDivider = ({ color }: { color: string }) => (
  <View
    style={{
      width: 1,
      height: 24,
      backgroundColor: color,
      marginHorizontal: 0,
      opacity: 0.3,
      alignSelf: 'center'
    }}
  />
);

export default function ReaderFabPill({
  onBack,
  onToggleHighlights,
  onToggleTags,
  isSpeaking,
  onToggleSpeech,
  onShare,
  isFetching,
  onRefresh,
  hasContent,
  isFavorite,
  onFavoriteToggle,
}: Props) {
  const { colors } = useTheme();
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
        alignItems: 'center',
        borderRadius: borderRadius.pill,
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        backgroundColor: colors.bgMuted,
        maxWidth: '94%',
        overflow: 'hidden',
        ...baseStyles.floating,
      },
      scrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        gap: spacing.xs,
      },
      fabActionBtn: {
        width: 44,
        height: 40,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
      },
    });
  }, [colors]);

  return (
    <View style={styles.fabActionRow}>
      <View style={styles.fabPill}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <IconButton
            name="arrow-back"
            onPress={onBack}
            style={styles.fabActionBtn}
          />

          <VerticalDivider color={colors.border} />

          <IconButton
            name="refresh-outline"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onRefresh?.();
            }}
            loading={isFetching}
            style={styles.fabActionBtn}
          />

          {hasContent && (
            <>
              <VerticalDivider color={colors.border} />

              <IconButton
                name={isFavorite ? 'heart' : 'heart-outline'}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onFavoriteToggle?.();
                }}
                color={isFavorite ? colors.primary : colors.textSecondary}
                style={styles.fabActionBtn}
                accessibilityLabel={isFavorite ? t.unfavorited : t.favorited}
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

              <VerticalDivider color={colors.border} />

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
        </ScrollView>
      </View>
    </View>
  );
}
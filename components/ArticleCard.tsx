import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Article } from '../lib/db';
import { useTheme } from '../lib/themeContext';
import { sharedStyles, spacing, borderRadius, typography } from '../lib/theme';
import { getDomain, getReadTime } from '../lib/utils';
import { interpolate } from '../lib/translations';
import { useLanguage } from '../lib/languageContext';
import IconButton from './IconButton';

type Props = {
  article: Article;
  onPress: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
};

export default function ArticleCard({ article, onPress, onLongPress, isSelected, selectionMode }: Props) {
  const { t } = useLanguage();
  const { colors, isDark, themeMode } = useTheme();
  const isOffline = article.html_content !== null;
  const isRead = !!article.is_read;

  function getRelativeTime(ts: number): string {
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return interpolate(t.minutesAgo, { m: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return interpolate(t.hoursAgo, { m: hrs });
    return interpolate(t.daysAgo, { m: Math.floor(hrs / 24) });
  }

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    card: {
      marginHorizontal: spacing.lg,
      marginVertical: spacing.xs + 2,
      padding: spacing.md + 2,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      backgroundColor: colors.white,
      borderColor: colors.border,
    },
    cardSelected: {
      borderColor: colors.primary,
      backgroundColor: themeMode === 'high-contrast' ? colors.white : (isDark ? '#2a246b' : '#f0effc'),
      borderWidth: themeMode === 'high-contrast' ? 3 : 1,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectionIndicator: {
      marginRight: spacing.md,
    },
    cardRead: {
      opacity: 0.65,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    domain: {
      fontSize: 12,
      textTransform: 'lowercase',
      color: colors.textMuted,
    },
    leftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
    },
    offlineDot: {
      width: spacing.sm,
      height: spacing.sm,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.success,
    },
    unreadBadge: {
      width: spacing.sm,
      height: spacing.sm,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary,
    },
    title: {
      fontSize: 16,
      fontWeight: typography.weights.bold,
      letterSpacing: typography.letterSpacing.tight,
      marginBottom: spacing.xs,
      color: colors.textPrimary,
    },
    excerpt: {
      fontSize: 14,
      fontWeight: typography.weights.secondary,
      lineHeight: 20,
      marginBottom: spacing.sm,
      color: colors.textSecondary,
    },
    meta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  }), [colors, isDark, themeMode]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        isRead && !selectionMode && styles.cardRead,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${article.title}. ${getDomain(article.url)}. ${isRead ? t.markAsRead : t.markAsUnread}`}
      accessibilityHint={!selectionMode ? t.swipeHint : undefined}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.5}
    >
      <View style={styles.cardContent}>
        {selectionMode && (
          <View style={styles.selectionIndicator}>
            <IconButton
              name={isSelected ? "checkbox" : "square-outline"}
              size={24}
              color={isSelected ? colors.primary : (themeMode === 'high-contrast' ? colors.black : colors.textMuted)}
              pointerEvents="none"
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <View style={styles.leftGroup}>
              {!isRead && <View style={styles.unreadBadge} />}
              <Text style={styles.domain}>{getDomain(article.url)}</Text>
            </View>
            {isOffline && <View style={styles.offlineDot} />}
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {article.title ?? t.loading}
          </Text>

          {!!article.excerpt && (
            <Text style={styles.excerpt} numberOfLines={2}>
              {article.excerpt}
            </Text>
          )}

          <View style={styles.meta}>
            <Text style={styles.metaText}>{getRelativeTime(article.saved_at)}</Text>
            {isOffline && <Text style={styles.metaText}>{interpolate(t.readTime, { m: getReadTime(article.html_content) })}</Text>}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

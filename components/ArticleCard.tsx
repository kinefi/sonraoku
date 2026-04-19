import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Article } from '@/lib/db';
import { sharedStyles, spacing, borderRadius, typography, useTheme } from '@/lib/theme';
import { getDomain, getReadTime } from '@/lib/utils';
import { useLanguage } from '@/lib/language';
import IconButton from './IconButton';

type Props = {
  article: Article;
  onPress: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
};

export default function ArticleCard({ article, onPress, onLongPress, isSelected, selectionMode }: Props) {
  const { t, translate } = useLanguage();
  const { colors, isDark, themeMode } = useTheme();
  const isOffline = article.html_content !== null;
  const isRead = !!article.is_read;

  function getRelativeTime(ts: number): string {
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return translate('articles.minutesAgo', { m: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return translate('articles.hoursAgo', { m: hrs });
    return translate('articles.daysAgo', { m: Math.floor(hrs / 24) });
  }

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    card: {
      marginHorizontal: spacing.lg,
      marginVertical: spacing.xs + 2,
      padding: spacing.md + 2,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      backgroundColor: 'transparent',
      borderColor: colors.border,
    },
    cardSelected: {
      borderColor: colors.primary,
      backgroundColor: themeMode === 'high-contrast' ? colors.white : colors.bgMuted,
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
    rightGroup: {
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
    favoriteDot: {
      width: spacing.sm,
      height: spacing.sm,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.error,
    },
    inactiveDot: {
      backgroundColor: colors.border,
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

  // Construct a comprehensive accessibility label for the card
  const cardAccessibilityLabel = [
    article.title ?? t.common.loading,
    getDomain(article.url),
    isRead ? t.articles.markAsRead : t.articles.unread,
    article.is_favorite === 1 ? t.articles.favorites : null,
    isOffline ? t.articles.offlineLabel : null,
  ].filter(Boolean).join('. ');

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        isRead && !selectionMode && styles.cardRead,
      ]}
      accessibilityRole="button"
      accessibilityLabel={cardAccessibilityLabel}
      accessibilityHint={!selectionMode ? t.articles.swipeHint : undefined}
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
            <Text style={styles.domain}>{getDomain(article.url)}</Text>
            <View style={styles.rightGroup}>
              <View 
                style={[styles.unreadBadge, isRead && styles.inactiveDot]} 
                accessible={true} 
                accessibilityLabel={isRead ? t.articles.markAsRead : t.articles.unread} 
              />
              <View 
                style={[styles.favoriteDot, article.is_favorite !== 1 && styles.inactiveDot]} 
                accessible={true} 
                accessibilityLabel={article.is_favorite === 1 ? t.articles.favorites : t.articles.unfavorited} 
              />
              <View 
                style={[styles.offlineDot, !isOffline && styles.inactiveDot]} 
                accessible={true} 
                accessibilityLabel={isOffline ? t.articles.offlineLabel : t.articles.offline} 
              />
            </View>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {article.title ?? t.common.loading}
          </Text>

          {!!article.excerpt && (
            <Text style={styles.excerpt} numberOfLines={2}>
              {article.excerpt}
            </Text>
          )}

          <View style={styles.meta}>
            <Text style={styles.metaText}>{getRelativeTime(article.saved_at)}</Text>
            {isOffline && <Text style={styles.metaText}>{translate('articles.readTime', { m: getReadTime(article.html_content) })}</Text>}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

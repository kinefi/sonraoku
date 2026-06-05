import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sharedStyles, spacing, borderRadius, typography, useTheme } from '@/lib/theme';
import { getDomain, getReadTime } from '@/lib/utils';
import { useLanguage } from '@/lib/language';
import IconButton from '@/components/common/IconButton';

import { ArticleWithTags } from '@/lib/db/types'; // Import ArticleWithTags

type Props = {
  article: ArticleWithTags; // Use ArticleWithTags
  onPress: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
  onAddTagPress?: () => void;
  onTagPress?: (tag: string) => void;
};

export default function ArticleCard({ article, onPress, onLongPress, isSelected, selectionMode, onAddTagPress, onTagPress }: Props) {
  const { t, translate } = useLanguage();
  const { colors, themeMode } = useTheme();
  const isOffline = article.html_content !== null;
  const isRead = !!article.is_read;

  function getRelativeTime(ts: number): string {
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return translate('articles.minutesAgo', { m: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return translate('articles.hoursAgo', { h: hrs });
    const days = Math.floor(hrs / 24);
    if (days < 7) return translate('articles.daysAgo', { d: days });
    
    const locale = t.common.appName === 'Sonra Oku' ? 'tr-TR' : 'en-US';
    return new Date(ts).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
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
      gap: spacing.sm,
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
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    tagChip: {
      backgroundColor: colors.bgMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tagText: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: typography.weights.medium,
    },
    addTagChip: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
  }), [colors, themeMode]);

  // Construct a comprehensive accessibility label for the card
  const cardAccessibilityLabel = [
    article.title ?? t.common.loading,
    getDomain(article.url),
    isRead ? t.articles.markAsRead : t.articles.unread,
    article.is_favorite === 1 ? t.articles.favorites : null,
    isOffline ? t.articles.offlineLabel : null,
    article.tags && article.tags.length > 0 ? `Tags: ${article.tags.join(', ')}` : null,
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
              <Ionicons
                name={isRead ? "mail-open-outline" : "mail-outline"}
                size={18}
                color={isRead ? colors.textMuted : colors.primary}
                style={{ opacity: isRead ? 0.4 : 1 }}
              />
              <Ionicons
                name={article.is_favorite ? "heart" : "heart-outline"}
                size={18}
                color={article.is_favorite ? colors.error : colors.textMuted}
                style={{ opacity: article.is_favorite ? 1 : 0.3 }}
              />
              <Ionicons
                name={isOffline ? "cloud-done" : "cloud-download-outline"}
                size={18}
                color={isOffline ? colors.success : colors.textMuted}
                style={{ opacity: isOffline ? 1 : 0.3 }}
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

          {/* Tags Row */}
          {( (article.tags && article.tags.length > 0) || onAddTagPress) && (
            <View style={styles.tagRow}>
              {article.tags?.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tagChip}
                  onPress={() => onTagPress?.(tag)}
                  disabled={selectionMode}
                >
                  <Text style={styles.tagText}>#{tag}</Text>
                </TouchableOpacity>
              ))}
              {onAddTagPress && (
                <TouchableOpacity 
                  style={styles.addTagChip} 
                  onPress={onAddTagPress}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="add" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
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

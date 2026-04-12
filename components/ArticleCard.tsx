import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Article } from '../lib/db';
import { colors } from '../lib/theme';
import { getDomain, getReadTime } from '../lib/utils';
import { useLanguage } from '../lib/languageContext';

type Props = {
  article: Article;
  onPress: () => void;
};

export default function ArticleCard({ article, onPress }: Props) {
  const { t } = useLanguage();
  const isOffline = article.html_content !== null;
  const isRead = !!article.is_read;

  function getRelativeTime(ts: number): string {
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return t.minutesAgo(mins);
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t.hoursAgo(hrs);
    return t.daysAgo(Math.floor(hrs / 24));
  }

  return (
    <TouchableOpacity
      style={[styles.card, isRead && styles.cardRead]}
      onPress={onPress}
      activeOpacity={0.5}
    >
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
        {isOffline && <Text style={styles.metaText}>{t.readTime(getReadTime(article.html_content))}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRead: {
    opacity: 0.65,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  domain: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'lowercase',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  excerpt: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    color: colors.textFaint,
  },
});

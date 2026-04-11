import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Article } from '../lib/db';

type Props = {
  article: Article;
  onPress: () => void;
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getReadTime(html: string | null): string {
  if (!html) return '';
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min`;
}

function getRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ArticleCard({ article, onPress }: Props) {
  const isOffline = article.html_content !== null;
  const isRead = !!article.is_read;

  return (
    <TouchableOpacity
      style={[styles.card, isRead && styles.cardRead]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          {!isRead && <View style={styles.unreadBadge} />}
          <Text style={styles.domain}>{getDomain(article.url)}</Text>
        </View>
        {isOffline && <View style={styles.offlineDot} />}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {article.title ?? 'Loading…'}
      </Text>

      {!!article.excerpt && (
        <Text style={styles.excerpt} numberOfLines={2}>
          {article.excerpt}
        </Text>
      )}

      <View style={styles.meta}>
        <Text style={styles.metaText}>{getRelativeTime(article.saved_at)}</Text>
        {isOffline && <Text style={styles.metaText}>{getReadTime(article.html_content)}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
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
    color: '#888',
    textTransform: 'lowercase',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    backgroundColor: '#1D9E75',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#534AB7',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  excerpt: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    color: '#aaa',
  },
});

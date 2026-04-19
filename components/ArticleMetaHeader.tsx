import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Article } from '@/lib/db';
import { useTheme, sharedStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { getDomain, getReadTime } from '@/lib/utils';
import { useLanguage, LANGUAGES } from '@/lib/language';
import IconButton from './IconButton';

type Props = {
  article: Article;
};

export default function ArticleMetaHeader({ article }: Props) {
  const { t, translate } = useLanguage();
  const { colors } = useTheme();
  
  const langLabel = article.lang
    ? LANGUAGES.find((l) => article.lang?.toLowerCase().startsWith(l.key))?.label ||
      article.lang.toUpperCase()
    : null;

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    metaCenter: { flex: 1, alignItems: 'center' },
    metaRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
    domain: { 
      flex: 1, 
      fontSize: 12,
      fontWeight: typography.weights.secondary,
      color: colors.textMuted,
    },
    offlineIndicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    offlineDot: {
      width: spacing.sm,
      height: spacing.sm,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.success,
    },
    offlineText: {
      fontSize: 11,
      color: colors.success,
    },
  }), [colors]);

  return (
    <View style={styles.metaRow}>
      <Text style={styles.domain} numberOfLines={1}>{getDomain(article.url)}</Text>
      <View style={styles.metaCenter}>
        {article.html_content && (
          <Text style={styles.metaText}>
            {langLabel && `${langLabel} • `}
            {translate('articles.readTime', { m: getReadTime(article.html_content) })}
          </Text>
        )}
      </View>
      <View style={styles.metaRight}>
        {article.html_content && (
          <View style={styles.offlineIndicator}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>{t.articles.offlineLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
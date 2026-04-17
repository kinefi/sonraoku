import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { Article } from '../lib/db';
import { useTheme } from '../lib/themeContext';
import { sharedStyles, spacing, borderRadius, typography } from '../lib/theme';
import { getDomain, getReadTime } from '../lib/utils';
import { interpolate, LANGUAGES } from '../lib/translations';
import { useLanguage } from '../lib/languageContext';
import IconButton from './IconButton';

type Props = {
  article: Article;
};

export default function ArticleMetaHeader({ article }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  
  const langLabel = article.lang
    ? LANGUAGES.find((l) => article.lang?.toLowerCase().startsWith(l.key))?.label ||
      article.lang.toUpperCase()
    : null;

  const handleShare = async () => {
    try {
      await Share.share({
        title: article.title || t.appName,
        message: article.url,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
            {interpolate(t.readTime, { m: getReadTime(article.html_content) })}
          </Text>
        )}
      </View>
      <View style={styles.metaRight}>
        <IconButton
          name="share-outline"
          size={20}
          onPress={handleShare}
          accessibilityLabel={t.share}
        />
        {article.html_content && (
          <View style={styles.offlineIndicator}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>{t.offlineLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
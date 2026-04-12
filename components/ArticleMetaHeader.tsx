import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Article } from '../lib/db';
import { colors } from '../lib/theme';
import { getDomain, getReadTime } from '../lib/utils';
import { useLanguage, LANGUAGES } from '../lib/languageContext';

type Props = {
  article: Article;
};

export default function ArticleMetaHeader({ article }: Props) {
  const { t } = useLanguage();
  
  const langLabel = article.lang
    ? LANGUAGES.find((l) => article.lang?.toLowerCase().startsWith(l.key))?.label ||
      article.lang.toUpperCase()
    : null;

  return (
    <View style={styles.metaRow}>
      <Text style={styles.domain} numberOfLines={1}>{getDomain(article.url)}</Text>
      <View style={styles.metaCenter}>
        {article.html_content && (
          <Text style={styles.readTime}>
            {langLabel && `${langLabel} • `}
            {t.readTime(getReadTime(article.html_content))}
          </Text>
        )}
      </View>
      <View style={styles.metaRight}>
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

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  metaCenter: { flex: 1, alignItems: 'center' },
  metaRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  domain: { flex: 1, fontSize: 12, color: colors.textMuted },
  offlineIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  offlineText: {
    fontSize: 11,
    color: colors.success,
  },
  readTime: {
    fontSize: 12,
    color: colors.textFaint,
  },
});
import React, { useMemo } from 'react';
import { View, Text, Linking, StyleSheet } from 'react-native';
import { sharedStyles, spacing, borderRadius, useTheme } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import IconButton from '@/components/common/IconButton';

type Props = {
  title: string | null;
  url: string;
  isFetching: boolean;
  fetchStatus: 'idle' | 'fetching' | 'success' | 'error';
  onFetchAgain: () => void;
};

export default function ArticleFallback({ title, url, isFetching, fetchStatus, onFetchAgain }: Props) {
  const { t, translate } = useLanguage();
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    fallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxxl,
      gap: spacing.lg,
      backgroundColor: colors.bgPage,
    },
    fallbackText: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
    },
    openBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
    },
    fetchBtn: {
      backgroundColor: colors.bgMuted,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fetchBtnDisabled: { opacity: 0.6 },
  }), [colors]);

  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>
        {title ? translate('articles.couldNotLoad', { title }) : t.articles.noContent}
      </Text>
      <IconButton
        label={t.articles.openInBrowser}
        variant="filled"
        onPress={() => Linking.openURL(url)}
        style={styles.openBtn}
      />
      <IconButton
        label={fetchStatus === 'success' ? t.articles.downloadSuccess : fetchStatus === 'error' ? t.articles.downloadError : t.articles.downloadOffline}
        variant="outlined"
        color={fetchStatus === 'success' ? colors.success : fetchStatus === 'error' ? colors.error : colors.primary}
        onPress={onFetchAgain}
        loading={isFetching}
        disabled={isFetching}
        style={styles.fetchBtn}
      />
    </View>
  );
}